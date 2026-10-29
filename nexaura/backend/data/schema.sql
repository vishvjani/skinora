-- ============================================================
-- NEXAURA — Supabase PostgreSQL Schema
-- Run this FIRST in Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for text search

-- ── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(300) UNIQUE NOT NULL,
  description      TEXT,
  category_id      INT REFERENCES categories(id) ON DELETE SET NULL,
  subcategory      VARCHAR(100),
  brand            VARCHAR(100),
  mrp              NUMERIC(10,2) NOT NULL DEFAULT 0,
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_percent INT DEFAULT 0,
  stock            INT DEFAULT 0,
  rating           NUMERIC(3,1) DEFAULT 0,
  review_count     INT DEFAULT 0,
  image_url        TEXT,
  tags             TEXT[],
  ingredients      TEXT,
  form             VARCHAR(100),
  color            VARCHAR(100),
  size             VARCHAR(50),
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_slug     ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_rating   ON products(rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_price    ON products(price);
-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_fts ON products
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(brand,'') || ' ' || COALESCE(subcategory,'')));

-- ── Users (mirrors Clerk user data) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(255) PRIMARY KEY,   -- Clerk user_id
  email         VARCHAR(255) UNIQUE,
  full_name     VARCHAR(255),
  avatar_url    TEXT,
  phone         VARCHAR(20),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Addresses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  label       VARCHAR(50) DEFAULT 'Home',
  line1       TEXT NOT NULL,
  line2       TEXT,
  city        VARCHAR(100) NOT NULL,
  state       VARCHAR(100) NOT NULL,
  pincode     VARCHAR(10) NOT NULL,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Cart ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  product_id  INT REFERENCES products(id) ON DELETE CASCADE,
  quantity    INT NOT NULL DEFAULT 1,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id);

-- ── Wishlist ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  product_id  INT REFERENCES products(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);

-- ── Orders ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         VARCHAR(255) REFERENCES users(id),
  status          VARCHAR(50) DEFAULT 'pending',   -- pending|confirmed|shipped|delivered|cancelled
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  final_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code     VARCHAR(50),
  address_id      UUID REFERENCES addresses(id),
  payment_method  VARCHAR(50),
  payment_status  VARCHAR(50) DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ── Order Items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INT REFERENCES products(id),
  quantity    INT NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ── Coupons ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(50) UNIQUE NOT NULL,
  discount_type   VARCHAR(20) NOT NULL DEFAULT 'percent',  -- percent|flat
  discount_value  NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_uses        INT DEFAULT 1000,
  used_count      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  expires_at      DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Competitor Prices ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitor_prices (
  id                SERIAL PRIMARY KEY,
  product_id        INT REFERENCES products(id) ON DELETE CASCADE,
  competitor        VARCHAR(100) NOT NULL,
  competitor_price  NUMERIC(10,2) NOT NULL,
  recorded_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_product ON competitor_prices(product_id);

-- ── User Events ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_events (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     VARCHAR(255),               -- nullable for anonymous
  product_id  INT REFERENCES products(id) ON DELETE SET NULL,
  event_type  VARCHAR(50) NOT NULL,       -- view|click|add_to_cart|wishlist|purchase|search
  session_id  VARCHAR(100),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user    ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_product ON user_events(product_id);
CREATE INDEX IF NOT EXISTS idx_events_type    ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_time    ON user_events(created_at DESC);

-- ── A/B Tests ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ab_tests (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  variant_a   VARCHAR(100) NOT NULL,
  variant_b   VARCHAR(100) NOT NULL,
  start_date  TIMESTAMPTZ DEFAULT NOW(),
  end_date    TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_assignments (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         VARCHAR(255) NOT NULL,
  experiment_id   INT REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant         VARCHAR(100) NOT NULL,
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, experiment_id)
);

CREATE TABLE IF NOT EXISTS ab_conversions (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id   UUID REFERENCES ab_assignments(id) ON DELETE CASCADE,
  conversion_type VARCHAR(50) NOT NULL,   -- purchase|add_to_cart|click
  metadata        JSONB DEFAULT '{}',
  converted_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Product Reviews ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id  INT REFERENCES products(id) ON DELETE CASCADE,
  user_id     VARCHAR(255) REFERENCES users(id),
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(200),
  body        TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- ── Trigger: auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews        ENABLE ROW LEVEL SECURITY;

-- Public read-only for products, categories, coupons (anon can browse)
CREATE POLICY "Public read products"   ON products   FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "Public read coupons"    ON coupons    FOR SELECT USING (is_active = TRUE);

-- Users only see their own data
CREATE POLICY "Own cart"      ON cart      FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Own wishlist"  ON wishlist  FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Own orders"    ON orders    FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Own addresses" ON addresses FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Own user row"  ON users     FOR ALL USING (auth.uid()::text = id);
