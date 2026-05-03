const { Pool } = require("pg");
const { databaseUrl, dbHost, dbPort, dbName, dbUser, dbPassword } = require("./env");

const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
  : new Pool({ host: dbHost, port: dbPort, database: dbName, user: dbUser, password: dbPassword || undefined });

const query = (text, params) => pool.query(text, params);

const initializeDatabase = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      first_name VARCHAR(60),
      last_name VARCHAR(60),
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(30),
      password_hash TEXT NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'customer',
      is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      is_marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
      ) THEN
        CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT email_verifications_user_id_key UNIQUE (user_id)
    );
  `);

  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'email_verifications_user_id_key'
      ) THEN
        ALTER TABLE email_verifications
        ADD CONSTRAINT email_verifications_user_id_key UNIQUE (user_id);
      END IF;
    END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_addresses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label VARCHAR(50) NOT NULL DEFAULT 'home',
      full_name VARCHAR(120) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      address_line_1 VARCHAR(255) NOT NULL,
      address_line_2 VARCHAR(255),
      city VARCHAR(120) NOT NULL,
      state VARCHAR(120) NOT NULL,
      postal_code VARCHAR(30) NOT NULL,
      country VARCHAR(120) NOT NULL,
      is_default_shipping BOOLEAN NOT NULL DEFAULT FALSE,
      is_default_billing BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_addresses_updated_at'
      ) THEN
        CREATE TRIGGER trg_user_addresses_updated_at
        BEFORE UPDATE ON user_addresses
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(140) UNIQUE NOT NULL,
      description TEXT,
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      image_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_categories_updated_at'
      ) THEN
        CREATE TRIGGER trg_categories_updated_at
        BEFORE UPDATE ON categories
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      name VARCHAR(180) NOT NULL,
      slug VARCHAR(200) UNIQUE NOT NULL,
      description TEXT,
      base_price NUMERIC(12,2) NOT NULL,
      popularity_score INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS popularity_score INTEGER NOT NULL DEFAULT 0;
  `);

  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_updated_at'
      ) THEN
        CREATE TRIGGER trg_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sku VARCHAR(120) UNIQUE NOT NULL,
      color VARCHAR(80) NOT NULL,
      size VARCHAR(80) NOT NULL,
      material VARCHAR(120),
      price NUMERIC(12,2) NOT NULL,
      compare_at_price NUMERIC(12,2),
      inventory_quantity INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_product_variants_updated_at'
      ) THEN
        CREATE TRIGGER trg_product_variants_updated_at
        BEFORE UPDATE ON product_variants
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
      image_url TEXT NOT NULL,
      cloudinary_public_id TEXT,
      width INTEGER,
      height INTEGER,
      alt_text VARCHAR(255),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    ALTER TABLE product_images
    ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
  `);

  await query(`
    ALTER TABLE product_images
    ADD COLUMN IF NOT EXISTS width INTEGER;
  `);

  await query(`
    ALTER TABLE product_images
    ADD COLUMN IF NOT EXISTS height INTEGER;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS product_attributes (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      value VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_products_category_id
    ON products (category_id);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_products_popularity_score
    ON products (popularity_score DESC, created_at DESC);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_products_search_document
    ON products
    USING GIN (to_tsvector('simple', COALESCE(name, '') || ' ' || COALESCE(description, '')));
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_product_variants_product_price
    ON product_variants (product_id, is_active, price);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_product_variants_color_lower
    ON product_variants (LOWER(color));
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_product_variants_size_lower
    ON product_variants (LOWER(size));
  `);
};

module.exports = {
  pool,
  query,
  initializeDatabase,
};
