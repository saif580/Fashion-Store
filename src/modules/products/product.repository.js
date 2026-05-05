const { pool, query } = require("../../config/db");
const { getRatingStatsBatch } = require("../reviews/review.repository");

const productColumns = `
  p.id,
  p.category_id,
  p.name,
  p.slug,
  p.description,
  p.base_price,
  p.popularity_score,
  p.is_active,
  p.created_at,
  p.updated_at,
  c.name AS category_name,
  c.slug AS category_slug
`;

const mapVariants = (variants) =>
  variants.map((variant) => ({
    id: variant.id,
    product_id: variant.product_id,
    sku: variant.sku,
    color: variant.color,
    size: variant.size,
    material: variant.material,
    price: Number(variant.price),
    compare_at_price: variant.compare_at_price === null ? null : Number(variant.compare_at_price),
    inventory_quantity: variant.inventory_quantity,
    low_stock_threshold: variant.low_stock_threshold,
    is_active: variant.is_active,
    created_at: variant.created_at,
    updated_at: variant.updated_at,
  }));

const mapProducts = async (products) => {
  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  const [variantsResult, imagesResult, attributesResult, ratingsMap] = await Promise.all([
    query(
      `SELECT id, product_id, sku, color, size, material, price, compare_at_price,
              inventory_quantity, low_stock_threshold, is_active, created_at, updated_at
       FROM product_variants WHERE product_id = ANY($1::int[]) ORDER BY id ASC`,
      [productIds],
    ),
    query(
      `SELECT id, product_id, variant_id, image_url, cloudinary_public_id, width, height, alt_text, sort_order, created_at
       FROM product_images WHERE product_id = ANY($1::int[]) ORDER BY sort_order ASC, id ASC`,
      [productIds],
    ),
    query(
      `SELECT id, product_id, name, value, created_at
       FROM product_attributes WHERE product_id = ANY($1::int[]) ORDER BY id ASC`,
      [productIds],
    ),
    getRatingStatsBatch(productIds),
  ]);

  return products.map((product) => {
    const ratingStats = ratingsMap.get(product.id);
    return {
      id: product.id,
      category_id: product.category_id,
      category_name: product.category_name,
      category_slug: product.category_slug,
      name: product.name,
      slug: product.slug,
      description: product.description,
      base_price: Number(product.base_price),
      popularity_score: product.popularity_score,
      min_price: product.min_price === undefined ? Number(product.base_price) : Number(product.min_price),
      max_price: product.max_price === undefined ? Number(product.base_price) : Number(product.max_price),
      total_inventory: product.total_inventory === undefined ? 0 : Number(product.total_inventory),
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      rating: {
        average: ratingStats ? ratingStats.average : null,
        count: ratingStats ? ratingStats.count : 0,
      },
      variants: mapVariants(variantsResult.rows.filter((v) => v.product_id === product.id)),
      images: imagesResult.rows.filter((i) => i.product_id === product.id),
      attributes: attributesResult.rows.filter((a) => a.product_id === product.id),
    };
  });
};

const buildProductWhereClause = ({
  onlyActive,
  search,
  categoryIds,
  minPrice,
  maxPrice,
  sizes,
  colors,
}) => {
  const clauses = [];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (onlyActive) {
    clauses.push("p.is_active = true");
  }

  if (categoryIds?.length) {
    clauses.push(`p.category_id = ANY(${addParam(categoryIds)}::int[])`);
  }

  if (search) {
    const queryToken = addParam(search);
    const likeToken = addParam(`%${search}%`);
    clauses.push(`(
      to_tsvector('simple', COALESCE(p.name, '') || ' ' || COALESCE(p.description, ''))
        @@ websearch_to_tsquery('simple', ${queryToken})
      OR p.name ILIKE ${likeToken}
      OR p.slug ILIKE ${likeToken}
      OR c.name ILIKE ${likeToken}
      OR EXISTS (
        SELECT 1
        FROM product_variants pv_search
        WHERE pv_search.product_id = p.id
          AND (
            pv_search.sku ILIKE ${likeToken}
            OR pv_search.color ILIKE ${likeToken}
            OR pv_search.size ILIKE ${likeToken}
            OR COALESCE(pv_search.material, '') ILIKE ${likeToken}
          )
      )
      OR EXISTS (
        SELECT 1
        FROM product_attributes pa_search
        WHERE pa_search.product_id = p.id
          AND (pa_search.name ILIKE ${likeToken} OR pa_search.value ILIKE ${likeToken})
      )
    )`);
  }

  if (minPrice !== null || maxPrice !== null) {
    const minToken = minPrice === null ? null : addParam(minPrice);
    const maxToken = maxPrice === null ? null : addParam(maxPrice);
    const priceChecks = ["pv_filter.product_id = p.id", "pv_filter.is_active = true"];
    if (minToken) {
      priceChecks.push(`pv_filter.price >= ${minToken}`);
    }
    if (maxToken) {
      priceChecks.push(`pv_filter.price <= ${maxToken}`);
    }
    clauses.push(`EXISTS (
      SELECT 1
      FROM product_variants pv_filter
      WHERE ${priceChecks.join(" AND ")}
    )`);
  }

  if (sizes?.length) {
    const sizesToken = addParam(sizes);
    clauses.push(`EXISTS (
      SELECT 1
      FROM product_variants pv_size
      WHERE pv_size.product_id = p.id
        AND pv_size.is_active = true
        AND LOWER(pv_size.size) = ANY(${sizesToken}::text[])
    )`);
  }

  if (colors?.length) {
    const colorsToken = addParam(colors);
    clauses.push(`EXISTS (
      SELECT 1
      FROM product_variants pv_color
      WHERE pv_color.product_id = p.id
        AND pv_color.is_active = true
        AND LOWER(pv_color.color) = ANY(${colorsToken}::text[])
    )`);
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
};

const getProductSortClause = (sortBy) => {
  switch (sortBy) {
    case "price_asc":
      return "ORDER BY min_price ASC, p.created_at DESC";
    case "price_desc":
      return "ORDER BY max_price DESC, p.created_at DESC";
    case "popularity":
      return "ORDER BY p.popularity_score DESC, p.created_at DESC";
    case "newest":
    default:
      return "ORDER BY p.created_at DESC";
  }
};

const listProducts = async ({
  page = 1,
  limit = 20,
  onlyActive = true,
  search = null,
  categoryIds = [],
  minPrice = null,
  maxPrice = null,
  sizes = [],
  colors = [],
  sortBy = "newest",
} = {}) => {
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildProductWhereClause({
    onlyActive,
    search,
    categoryIds,
    minPrice,
    maxPrice,
    sizes,
    colors,
  });
  const sortClause = getProductSortClause(sortBy);
  const countParams = [...params];
  const listParams = [...params];
  listParams.push(limit, offset);

  const [countResult, rowsResult] = await Promise.all([
    query(
      `SELECT COUNT(*)
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${whereClause}`,
      countParams,
    ),
    query(
      `SELECT
         ${productColumns},
         COALESCE(MIN(pv.price) FILTER (WHERE pv.is_active = true), p.base_price) AS min_price,
         COALESCE(MAX(pv.price) FILTER (WHERE pv.is_active = true), p.base_price) AS max_price,
         COALESCE(SUM(pv.inventory_quantity) FILTER (WHERE pv.is_active = true), 0) AS total_inventory
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_variants pv ON pv.product_id = p.id
       ${whereClause}
       GROUP BY
         p.id,
         p.category_id,
         p.name,
         p.slug,
         p.description,
         p.base_price,
         p.popularity_score,
         p.is_active,
         p.created_at,
         p.updated_at,
         c.name,
         c.slug
       ${sortClause}
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    ),
  ]);

  const total = Number(countResult.rows[0].count);
  const products = await mapProducts(rowsResult.rows);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const findProductById = async (productId) => {
  const { rows } = await query(
    `SELECT
       ${productColumns},
       COALESCE(MIN(pv.price) FILTER (WHERE pv.is_active = true), p.base_price) AS min_price,
       COALESCE(MAX(pv.price) FILTER (WHERE pv.is_active = true), p.base_price) AS max_price,
       COALESCE(SUM(pv.inventory_quantity) FILTER (WHERE pv.is_active = true), 0) AS total_inventory
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_variants pv ON pv.product_id = p.id
     WHERE p.id = $1
     GROUP BY
       p.id,
       p.category_id,
       p.name,
       p.slug,
       p.description,
       p.base_price,
       p.popularity_score,
       p.is_active,
       p.created_at,
       p.updated_at,
       c.name,
       c.slug`,
    [productId],
  );
  if (!rows[0]) return null;
  const [product] = await mapProducts(rows);
  return product;
};

const findProductBySlug = async (slug) => {
  const { rows } = await query(
    `SELECT
       ${productColumns},
       COALESCE(MIN(pv.price) FILTER (WHERE pv.is_active = true), p.base_price) AS min_price,
       COALESCE(MAX(pv.price) FILTER (WHERE pv.is_active = true), p.base_price) AS max_price,
       COALESCE(SUM(pv.inventory_quantity) FILTER (WHERE pv.is_active = true), 0) AS total_inventory
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_variants pv ON pv.product_id = p.id
     WHERE p.slug = $1
     GROUP BY
       p.id,
       p.category_id,
       p.name,
       p.slug,
       p.description,
       p.base_price,
       p.popularity_score,
       p.is_active,
       p.created_at,
       p.updated_at,
       c.name,
       c.slug`,
    [slug],
  );
  if (!rows[0]) return null;
  const [product] = await mapProducts(rows);
  return product;
};

const createProduct = async ({ categoryId, name, slug, description, basePrice, popularityScore, isActive, variants, images, attributes }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: [{ id: productId }] } = await client.query(
      `INSERT INTO products (category_id, name, slug, description, base_price, popularity_score, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [categoryId, name, slug, description, basePrice, popularityScore, isActive],
    );

    const variantIdsBySku = new Map();
    for (const variant of variants) {
      const { rows: [createdVariant] } = await client.query(
        `INSERT INTO product_variants (product_id, sku, color, size, material, price, compare_at_price, inventory_quantity, low_stock_threshold, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, sku`,
        [productId, variant.sku, variant.color, variant.size, variant.material, variant.price, variant.compareAtPrice, variant.inventoryQuantity, variant.lowStockThreshold, variant.isActive],
      );
      variantIdsBySku.set(createdVariant.sku, createdVariant.id);
    }

    for (const image of images) {
      await client.query(
        `INSERT INTO product_images (product_id, variant_id, image_url, cloudinary_public_id, width, height, alt_text, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          productId,
          image.variantSku ? variantIdsBySku.get(image.variantSku) || null : null,
          image.imageUrl,
          image.publicId,
          image.width,
          image.height,
          image.altText,
          image.sortOrder,
        ],
      );
    }

    for (const attribute of attributes) {
      await client.query(
        `INSERT INTO product_attributes (product_id, name, value) VALUES ($1,$2,$3)`,
        [productId, attribute.name, attribute.value],
      );
    }

    await client.query("COMMIT");
    return findProductById(productId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateProduct = async (productId, { categoryId, name, slug, description, basePrice, popularityScore, isActive, variants, images, attributes }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE products SET category_id=$2, name=$3, slug=$4, description=$5, base_price=$6, popularity_score=$7, is_active=$8
       WHERE id=$1 RETURNING id`,
      [productId, categoryId, name, slug, description, basePrice, popularityScore, isActive],
    );

    if (!rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    // Reject any SKU that already belongs to a different product
    const newSkus = variants.map((v) => v.sku);
    const { rows: conflictRows } = await client.query(
      `SELECT sku FROM product_variants WHERE sku = ANY($1::text[]) AND product_id != $2`,
      [newSkus, productId],
    );
    if (conflictRows.length > 0) {
      const conflicting = conflictRows.map((r) => r.sku).join(", ");
      const err = new Error(`SKU(s) already belong to another product: ${conflicting}`);
      err.status = 409;
      throw err;
    }

    // Upsert variants by SKU — preserves existing IDs so cart/order references stay valid
    const variantIdsBySku = new Map();
    for (const variant of variants) {
      const { rows: [upsertedVariant] } = await client.query(
        `INSERT INTO product_variants (product_id, sku, color, size, material, price, compare_at_price, inventory_quantity, low_stock_threshold, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (sku) DO UPDATE SET
           color = EXCLUDED.color,
           size = EXCLUDED.size,
           material = EXCLUDED.material,
           price = EXCLUDED.price,
           compare_at_price = EXCLUDED.compare_at_price,
           inventory_quantity = EXCLUDED.inventory_quantity,
           low_stock_threshold = EXCLUDED.low_stock_threshold,
           is_active = EXCLUDED.is_active
         RETURNING id, sku`,
        [productId, variant.sku, variant.color, variant.size, variant.material, variant.price, variant.compareAtPrice, variant.inventoryQuantity, variant.lowStockThreshold, variant.isActive],
      );
      variantIdsBySku.set(upsertedVariant.sku, upsertedVariant.id);
    }

    // Remove variants whose SKUs are no longer in the payload
    await client.query(
      `DELETE FROM product_variants WHERE product_id = $1 AND sku != ALL($2::text[])`,
      [productId, newSkus],
    );

    // Images and attributes are safe to replace (not referenced by cart/orders)
    await client.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);
    for (const image of images) {
      await client.query(
        `INSERT INTO product_images (product_id, variant_id, image_url, cloudinary_public_id, width, height, alt_text, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          productId,
          image.variantSku ? variantIdsBySku.get(image.variantSku) || null : null,
          image.imageUrl,
          image.publicId,
          image.width,
          image.height,
          image.altText,
          image.sortOrder,
        ],
      );
    }

    await client.query(`DELETE FROM product_attributes WHERE product_id = $1`, [productId]);
    for (const attribute of attributes) {
      await client.query(
        `INSERT INTO product_attributes (product_id, name, value) VALUES ($1,$2,$3)`,
        [productId, attribute.name, attribute.value],
      );
    }

    await client.query("COMMIT");
    return findProductById(productId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deleteProduct = async (productId) => {
  const { rows: images } = await query(
    `SELECT cloudinary_public_id FROM product_images WHERE product_id = $1 AND cloudinary_public_id IS NOT NULL`,
    [productId],
  );
  const { rows } = await query(
    `DELETE FROM products WHERE id = $1 RETURNING id`,
    [productId],
  );
  if (!rows[0]) return null;
  return { id: rows[0].id, publicIds: images.map((i) => i.cloudinary_public_id) };
};

const bulkUpdateProductStatus = async (productIds, isActive) => {
  const { rows } = await query(
    `UPDATE products SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[]) RETURNING id`,
    [isActive, productIds],
  );
  return rows.map((r) => r.id);
};

const bulkDeleteProducts = async (productIds) => {
  const { rows: images } = await query(
    `SELECT cloudinary_public_id FROM product_images WHERE product_id = ANY($1::int[]) AND cloudinary_public_id IS NOT NULL`,
    [productIds],
  );
  const { rows } = await query(
    `DELETE FROM products WHERE id = ANY($1::int[]) RETURNING id`,
    [productIds],
  );
  return {
    deletedIds: rows.map((r) => r.id),
    publicIds: images.map((i) => i.cloudinary_public_id),
  };
};

module.exports = {
  listProducts,
  findProductById,
  findProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProductStatus,
  bulkDeleteProducts,
};
