const { query } = require("../../config/db");

const wishlistItemSelect = `
  wi.id AS wishlist_item_id,
  wi.user_id,
  wi.product_id,
  wi.created_at AS wishlist_item_created_at,
  p.name AS product_name,
  p.slug AS product_slug,
  p.base_price,
  p.is_active AS product_is_active,
  img.image_url,
  img.alt_text
`;

const mapWishlistItem = (row) => ({
  id: row.wishlist_item_id,
  user_id: row.user_id,
  product_id: row.product_id,
  product: {
    id: row.product_id,
    name: row.product_name,
    slug: row.product_slug,
    base_price: Number(row.base_price),
    is_active: row.product_is_active,
  },
  image: row.image_url
    ? { image_url: row.image_url, alt_text: row.alt_text }
    : null,
  created_at: row.wishlist_item_created_at,
});

const getWishlistByUserId = async (userId) => {
  const { rows } = await query(
    `
      SELECT
        ${wishlistItemSelect}
      FROM wishlist_items wi
      INNER JOIN products p ON p.id = wi.product_id
      LEFT JOIN LATERAL (
        SELECT image_url, alt_text
        FROM product_images
        WHERE product_id = wi.product_id
          AND variant_id IS NULL
        ORDER BY sort_order ASC, id ASC
        LIMIT 1
      ) img ON TRUE
      WHERE wi.user_id = $1
      ORDER BY wi.created_at DESC;
    `,
    [userId],
  );

  return rows.map(mapWishlistItem);
};

const findWishlistItem = async (userId, productId) => {
  const { rows } = await query(
    `
      SELECT id, user_id, product_id, created_at
      FROM wishlist_items
      WHERE user_id = $1 AND product_id = $2;
    `,
    [userId, productId],
  );

  return rows[0] || null;
};

const findWishlistItemById = async (userId, wishlistItemId) => {
  const { rows } = await query(
    `
      SELECT id, user_id, product_id, created_at
      FROM wishlist_items
      WHERE user_id = $1 AND id = $2;
    `,
    [userId, wishlistItemId],
  );

  return rows[0] || null;
};

const addToWishlist = async (userId, productId) => {
  const { rows } = await query(
    `
      INSERT INTO wishlist_items (user_id, product_id)
      VALUES ($1, $2)
      RETURNING id, user_id, product_id, created_at;
    `,
    [userId, productId],
  );

  return rows[0];
};

const removeFromWishlist = async (userId, wishlistItemId) => {
  const { rows } = await query(
    `
      DELETE FROM wishlist_items
      WHERE user_id = $1 AND id = $2
      RETURNING id;
    `,
    [userId, wishlistItemId],
  );

  return rows[0] || null;
};

module.exports = {
  getWishlistByUserId,
  findWishlistItem,
  findWishlistItemById,
  addToWishlist,
  removeFromWishlist,
};