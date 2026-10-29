"""
Skinora — Comprehensive Database Seeder & Schema Migration
Seeds 65 authentic, luxury beauty & skincare products with real raw material origins,
lab test screenings, batch numbers, and quality certifications.
Also creates coupons, demo user, and delivered orders for the fraud-proof recycling workflow.
"""
import json
import os
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import psycopg2
from psycopg2.extras import RealDictCursor

NEON_DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_RI0HrCYUl1wz@ep-soft-hall-b3yi1rws-pooler.c-4.ap-southeast-1.aws.neon.tech/upsteky?sslmode=require"
)

# Standardize URL for psycopg2
if "ssl=require" in NEON_DB_URL:
    NEON_DB_URL = NEON_DB_URL.replace("ssl=require", "sslmode=require")
if NEON_DB_URL.startswith("postgresql+asyncpg://"):
    NEON_DB_URL = NEON_DB_URL.replace("postgresql+asyncpg://", "postgresql://")

print(f"Connecting to Neon DB: {NEON_DB_URL[:45]}...")
conn = psycopg2.connect(NEON_DB_URL)
cur = conn.cursor()

# 1. Enable UUID extension
cur.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

# 2. Schema Migrations / Alterations
cur.execute("""
ALTER TABLE products ADD COLUMN IF NOT EXISTS secondary_image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS mfg_date VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS exp_date VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS raw_materials TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quality_tests TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS factory_location VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS certifications TEXT;

CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percent',
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_value NUMERIC(10, 2) DEFAULT 0,
    user_id VARCHAR(255),
    max_uses INT DEFAULT 1000,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eco_points_earned INT DEFAULT 0;

ALTER TABLE container_returns ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE container_returns ADD COLUMN IF NOT EXISTS order_item_id UUID;
ALTER TABLE container_returns ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
""")
conn.commit()
print("✅ Schema migrations applied successfully.")

# Import full product dataset definition
from products_dataset import PRODUCTS_CATALOGUE, CATEGORIES_LIST

# 3. Seed Categories
print(f"Seeding {len(CATEGORIES_LIST)} categories...")
for cat in CATEGORIES_LIST:
    cur.execute("""
        INSERT INTO categories (id, name, slug, description, image_url)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            image_url = EXCLUDED.image_url;
    """, (cat["id"], cat["name"], cat["slug"], cat["description"], cat["image_url"]))
conn.commit()

# 4. Clean old products to ensure clean seed
print("Refreshing products table...")
cur.execute("""
    DELETE FROM order_items;
    DELETE FROM container_returns;
    DELETE FROM orders;
    DELETE FROM products;
""")
conn.commit()

print(f"Seeding {len(PRODUCTS_CATALOGUE)} rich products...")
for p in PRODUCTS_CATALOGUE:
    cur.execute("""
        INSERT INTO products (
            id, name, slug, description, category, subcategory, brand,
            mrp, price, discount_percent, stock, rating, review_count,
            image_url, secondary_image, form, size, container_type, recycle_points,
            ingredients, tags, batch_number, mfg_date, exp_date,
            raw_materials, quality_tests, factory_location, certifications,
            is_active
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            TRUE
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            subcategory = EXCLUDED.subcategory,
            brand = EXCLUDED.brand,
            mrp = EXCLUDED.mrp,
            price = EXCLUDED.price,
            discount_percent = EXCLUDED.discount_percent,
            stock = EXCLUDED.stock,
            rating = EXCLUDED.rating,
            review_count = EXCLUDED.review_count,
            image_url = EXCLUDED.image_url,
            secondary_image = EXCLUDED.secondary_image,
            form = EXCLUDED.form,
            size = EXCLUDED.size,
            container_type = EXCLUDED.container_type,
            recycle_points = EXCLUDED.recycle_points,
            ingredients = EXCLUDED.ingredients,
            tags = EXCLUDED.tags,
            batch_number = EXCLUDED.batch_number,
            mfg_date = EXCLUDED.mfg_date,
            exp_date = EXCLUDED.exp_date,
            raw_materials = EXCLUDED.raw_materials,
            quality_tests = EXCLUDED.quality_tests,
            factory_location = EXCLUDED.factory_location,
            certifications = EXCLUDED.certifications,
            is_active = TRUE;
    """, (
        p["id"], p["name"], p["slug"], p["description"], p["category"], p["subcategory"], p["brand"],
        p["mrp"], p["price"], p["discount_percent"], p["stock"], p["rating"], p["review_count"],
        p["image_url"], p.get("secondary_image", ""), p["form"], p["size"], p["container_type"], p["recycle_points"],
        p["ingredients"], p["tags"], p["batch_number"], p["mfg_date"], p["exp_date"],
        json.dumps(p["raw_materials"]) if isinstance(p["raw_materials"], (list, dict)) else p["raw_materials"],
        json.dumps(p["quality_tests"]) if isinstance(p["quality_tests"], (list, dict)) else p["quality_tests"],
        p["factory_location"], p["certifications"]
    ))
conn.commit()
print(f"✅ All {len(PRODUCTS_CATALOGUE)} products seeded into Neon PostgreSQL!")

# 5. Seed Demo User
cur.execute("""
    INSERT INTO users (id, email, full_name, avatar_url, phone, eco_points, containers_recycled, co2_saved_kg)
    VALUES ('demo_user_101', 'priya.sharma@example.com', 'Priya Sharma', '/images/avatar.jpg', '9876543210', 250, 4, 1.20)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone;
""")
conn.commit()

# 6. Seed Public Promo Coupons
promo_coupons = [
    ('WELCOME10', 'percent', 10, 499, None, 1000, 42),
    ('GLOW15', 'percent', 15, 799, None, 500, 18),
    ('ECOWARRIOR', 'flat', 100, 599, None, 200, 9),
    ('SKINORA20', 'percent', 20, 1299, None, 300, 31),
    # Also a demo account-locked recycle coupon for Priya Sharma
    ('ECO-PRIYA-7F8D', 'flat', 150, 499, 'demo_user_101', 1, 0),
]
for code, dtype, dval, min_ord, uid, max_u, used in promo_coupons:
    cur.execute("""
        INSERT INTO coupons (code, discount_type, discount_value, min_order_value, user_id, max_uses, used_count, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
        ON CONFLICT (code) DO UPDATE SET
            discount_type = EXCLUDED.discount_type,
            discount_value = EXCLUDED.discount_value,
            min_order_value = EXCLUDED.min_order_value,
            user_id = EXCLUDED.user_id,
            is_active = TRUE;
    """, (code, dtype, dval, min_ord, uid, max_u, used))
conn.commit()
print("✅ Promo coupons seeded!")

# 7. Seed Demo Delivered Orders for Priya Sharma (for the Delivered-Order Recycling Workflow)
cur.execute("SELECT id FROM orders WHERE user_id = 'demo_user_101' LIMIT 1;")
existing_order = cur.fetchone()

if not existing_order:
    print("Seeding delivered demo orders for demo_user_101...")
    # Order 1: Delivered recently
    order_id_1 = "a1111111-1111-1111-1111-111111111111"
    cur.execute("""
        INSERT INTO orders (
            id, user_id, status, total_amount, discount_amount, eco_points_redeemed,
            eco_discount_amount, final_amount, coupon_code, payment_method, payment_status,
            shipping_address, notes, created_at
        ) VALUES (
            %s, 'demo_user_101', 'Delivered', 948.0, 100.0, 0, 0, 848.0,
            'WELCOME10', 'upi', 'paid',
            'Flat 402, Rosewood Heights, Bandra West, Mumbai, Maharashtra 400050',
            'Delivered on 16 Sep 2026 via BlueDart Express', NOW() - INTERVAL '4 days'
        );
    """, (order_id_1,))

    # Order 1 Items: Product 101 (Magic De-Tan Soap) & 201 (Pure Saffron Kumkumadi Serum)
    cur.execute("""
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price)
        VALUES 
            (uuid_generate_v4(), %s, 101, 1, 299.0, 299.0),
            (uuid_generate_v4(), %s, 201, 1, 649.0, 649.0);
    """, (order_id_1, order_id_1))

    # Order 2: Delivered last month
    order_id_2 = "b2222222-2222-2222-2222-222222222222"
    cur.execute("""
        INSERT INTO orders (
            id, user_id, status, total_amount, discount_amount, eco_points_redeemed,
            eco_discount_amount, final_amount, coupon_code, payment_method, payment_status,
            shipping_address, notes, created_at
        ) VALUES (
            %s, 'demo_user_101', 'Delivered', 1297.0, 150.0, 50, 50.0, 1097.0,
            'GLOW15', 'card', 'paid',
            'Flat 402, Rosewood Heights, Bandra West, Mumbai, Maharashtra 400050',
            'Delivered on 28 Aug 2026 via Delhivery', NOW() - INTERVAL '23 days'
        );
    """, (order_id_2,))

    # Order 2 Items: Product 202 (15% Vitamin C Serum) & 305 (Ultra Hydrating Gel Moisturizer) & 401 (Rose Shower Gel)
    cur.execute("""
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price)
        VALUES 
            (uuid_generate_v4(), %s, 202, 1, 549.0, 549.0),
            (uuid_generate_v4(), %s, 305, 1, 499.0, 499.0),
            (uuid_generate_v4(), %s, 401, 1, 379.0, 379.0);
    """, (order_id_2, order_id_2, order_id_2))

    # Let's also record 1 existing claim for Product 101 so the UI can demonstrate already-recycled state!
    cur.execute("""
        INSERT INTO container_returns (
            id, user_id, product_id, container_type, quantity, pickup_address,
            pincode, status, points_awarded, co2_saved_kg, tracking_code, notes,
            order_id, coupon_code
        ) VALUES (
            uuid_generate_v4(), 'demo_user_101', 101, 'Soap Box / Tin', 1,
            'Flat 402, Rosewood Heights, Bandra West, Mumbai', '400050',
            'Processed & Coupon Issued', 30, 0.15, 'ECO-SKN-CLAIM-8921',
            'Recycled from Order #a1111111', %s, 'ECO-PRIYA-7F8D'
        );
    """, (order_id_1,))

    conn.commit()
    print("✅ Delivered demo orders & sample recycle claim seeded!")
else:
    print("Demo orders already exist, skipping order insertion.")

conn.close()

# 8. Export to JSON file for ChromaDB & XGBoost training scripts
json_path = os.path.join(os.path.dirname(__file__), "..", "data", "nexaura_products.json")
os.makedirs(os.path.dirname(json_path), exist_ok=True)
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(PRODUCTS_CATALOGUE, f, indent=2, ensure_ascii=False)

print(f"✅ Exported {len(PRODUCTS_CATALOGUE)} products to: {json_path}")
print("🎉 Seeding & DB Preparation Complete!")
