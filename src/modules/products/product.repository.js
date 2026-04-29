const { pool, query } = require("../../config/db");

const productColumns = `
  p.id,
  p.category_id,
  p.name,
  p.slug,
  p.description,
  p.base_price,
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
    is_active: variant.is_active,
    created_at: variant.created_at,
    updated_at: variant.updated_at,
  }));

const mapProducts = async (products) => {
  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  const [variantsResult, imagesResult, attributesResult] = await Promise.all([
    query(
      `SELECT id, product_id, sku, color, size, material, price, compare_at_price,
              inventory_quantity, is_active, created_at, updated_at
       FROM product_variants WHERE product_id = ANY($1::int[]) ORDER BY id ASC`,
      [productIds],
    ),
    query(
      `SELECT id, product_id, variant_id, image_url, alt_text, sort_order, created_at
       FROM product_images WHERE product_id = ANY($1::int[]) ORDER BY sort_order ASC, id ASC`,
      [productIds],
    ),
    query(
      `SELECT id, product_id, name, value, created_at
       FROM product_attributes WHERE product_id = ANY($1::int[]) ORDER BY id ASC`,
      [productIds],
    ),
  ]);

  return products.map((product) => ({
    id: product.id,
    category_id: product.category_id,
    category_name: product.category_name,
    category_slug: product.category_slug,
    name: product.name,
    slug: product.slug,
    description: product.description,
    base_price: Number(product.base_price),
    is_active: product.is_active,
    created_at: product.created_at,
    updated_at: product.updated_at,
    variants: mapVariants(variantsResult.rows.filter((v) => v.product_id === product.id)),
    images: imagesResult.rows.filter((i) => i.product_id === product.id),
    attributes: attributesResult.rows.filter((a) => a.product_id === product.id),
  }));
};

const listProducts = async ({ page = 1, limit = 20, onlyActive = true } = {}) => {
  const offset = (page - 1) * limit;
  const activeClause = onlyActive ? "WHERE p.is_active = true" : "";

  const [countResult, rowsResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM products p JOIN categories c ON c.id = p.category_id ${activeClause}`),
    query(
      `SELECT ${productColumns}
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${activeClause}
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
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
    `SELECT ${productColumns} FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [productId],
  );
  if (!rows[0]) return null;
  const [product] = await mapProducts(rows);
  return product;
};

const findProductBySlug = async (slug) => {
  const { rows } = await query(
    `SELECT ${productColumns} FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1`,
    [slug],
  );
  if (!rows[0]) return null;
  const [product] = await mapProducts(rows);
  return product;
};

const createProduct = async ({ categoryId, name, slug, description, basePrice, isActive, variants, images, attributes }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: [{ id: productId }] } = await client.query(
      `INSERT INTO products (category_id, name, slug, description, base_price, is_active)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [categoryId, name, slug, description, basePrice, isActive],
    );

    for (const variant of variants) {
      await client.query(
        `INSERT INTO product_variants (product_id, sku, color, size, material, price, compare_at_price, inventory_quantity, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [productId, variant.sku, variant.color, variant.size, variant.material, variant.price, variant.compareAtPrice, variant.inventoryQuantity, variant.isActive],
      );
    }

    for (const image of images) {
      await client.query(
        `INSERT INTO product_images (product_id, variant_id, image_url, alt_text, sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [productId, null, image.imageUrl, image.altText, image.sortOrder],
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

const updateProduct = async (productId, { categoryId, name, slug, description, basePrice, isActive, variants, images, attributes }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE products SET category_id=$2, name=$3, slug=$4, description=$5, base_price=$6, is_active=$7
       WHERE id=$1 RETURNING id`,
      [productId, categoryId, name, slug, description, basePrice, isActive],
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
    for (const variant of variants) {
      await client.query(
        `INSERT INTO product_variants (product_id, sku, color, size, material, price, compare_at_price, inventory_quantity, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (sku) DO UPDATE SET
           color = EXCLUDED.color,
           size = EXCLUDED.size,
           material = EXCLUDED.material,
           price = EXCLUDED.price,
           compare_at_price = EXCLUDED.compare_at_price,
           inventory_quantity = EXCLUDED.inventory_quantity,
           is_active = EXCLUDED.is_active`,
        [productId, variant.sku, variant.color, variant.size, variant.material, variant.price, variant.compareAtPrice, variant.inventoryQuantity, variant.isActive],
      );
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
        `INSERT INTO product_images (product_id, variant_id, image_url, alt_text, sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [productId, null, image.imageUrl, image.altText, image.sortOrder],
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

module.exports = {
  listProducts,
  findProductById,
  findProductBySlug,
  createProduct,
  updateProduct,
};
