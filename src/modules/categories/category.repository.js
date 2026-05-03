const { query } = require("../../config/db");

const categoryColumns = `
  id,
  name,
  slug,
  description,
  parent_id,
  image_url,
  is_active,
  created_at,
  updated_at
`;

const listCategories = async () => {
  const { rows } = await query(
    `
      SELECT
        ${categoryColumns}
      FROM categories
      ORDER BY name ASC;
    `,
  );

  return rows;
};

const findCategoryById = async (categoryId) => {
  const { rows } = await query(
    `
      SELECT
        ${categoryColumns}
      FROM categories
      WHERE id = $1;
    `,
    [categoryId],
  );

  return rows[0] || null;
};

const findCategoryBySlug = async (slug) => {
  const { rows } = await query(
    `
      SELECT
        ${categoryColumns}
      FROM categories
      WHERE slug = $1;
    `,
    [slug],
  );

  return rows[0] || null;
};

const listCategoryTreeIds = async (categoryId) => {
  const { rows } = await query(
    `
      WITH RECURSIVE category_tree AS (
        SELECT id
        FROM categories
        WHERE id = $1
        UNION ALL
        SELECT c.id
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT id
      FROM category_tree;
    `,
    [categoryId],
  );

  return rows.map((row) => row.id);
};

const createCategory = async ({ name, slug, description, parentId, imageUrl, isActive }) => {
  const { rows } = await query(
    `
      INSERT INTO categories (
        name,
        slug,
        description,
        parent_id,
        image_url,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        ${categoryColumns};
    `,
    [name, slug, description, parentId, imageUrl, isActive],
  );

  return rows[0];
};

const updateCategory = async (categoryId, { name, slug, description, parentId, imageUrl, isActive }) => {
  const { rows } = await query(
    `
      UPDATE categories
      SET
        name = $2,
        slug = $3,
        description = $4,
        parent_id = $5,
        image_url = $6,
        is_active = $7
      WHERE id = $1
      RETURNING
        ${categoryColumns};
    `,
    [categoryId, name, slug, description, parentId, imageUrl, isActive],
  );

  return rows[0] || null;
};

module.exports = {
  listCategories,
  findCategoryById,
  findCategoryBySlug,
  listCategoryTreeIds,
  createCategory,
  updateCategory,
};
