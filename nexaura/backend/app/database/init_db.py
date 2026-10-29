"""
Neon PostgreSQL Database Initializer & Table Seeder.
Creates all schema tables and seeds Skinora products, categories, demo users, and container recycling data.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor

NEON_DB_URL = "postgresql://neondb_owner:npg_RI0HrCYUl1wz@ep-soft-hall-b3yi1rws-pooler.c-4.ap-southeast-1.aws.neon.tech/upsteky?sslmode=require"

PRODUCTS_DATA = [
  (101, 'Magic De-Tan Soap with Saffron & Goat Milk', 'magic-detan-soap-saffron-goat-milk', 'Our signature 100% natural handmade soap enriched with pure Kashmiri Saffron, Sandalwood, and fresh Goat Milk. Deeply exfoliates, removes stubborn sun tan, and reveals radiant, even-toned skin.', 'soaps', 'detan', 'Skinora Organics', 399.0, 299.0, 25, 145, 4.9, 1420, '/images/detan-soap.jpg', 'Bar Soap', '125g', 'Soap Box / Tin', 30),
  (102, 'Rosemary & Neem Anti-Acne Clarifying Soap', 'rosemary-neem-anti-acne-soap', 'Therapeutic herbal soap blended with Cold-Pressed Neem Oil, Tea Tree Oil, and Rosemary extracts. Controls excess sebum, calms active breakouts, and prevents body acne.', 'soaps', 'acne-care', 'Skinora Botanicals', 349.0, 249.0, 29, 110, 4.8, 490, '/images/neem-soap.jpg', 'Bar Soap', '125g', 'Soap Box / Tin', 30),
  (103, 'Organic Charcoal & Bamboo Detox Soap', 'organic-charcoal-bamboo-detox-soap', 'Activated Bamboo Charcoal soap that draws out deep-seated dirt, pollutants, and excess oil. Leaves skin feeling refreshed, sanitized, and velvety smooth.', 'soaps', 'detox', 'Skinora Organics', 329.0, 239.0, 27, 120, 4.6, 310, '/images/charcoal-soap.jpg', 'Bar Soap', '125g', 'Soap Box / Tin', 30),
  (104, 'Damask Rose & French Pink Clay Pamper Soap', 'damask-rose-french-pink-clay-soap', 'Ultra-gentle moisturizing bar crafted with pure Damask Rose oil and detoxifying French Pink Clay. Hydrates dry skin, shrinks pores, and leaves a subtle floral aroma.', 'soaps', 'moisturizer', 'Skinora Glow', 350.0, 259.0, 26, 95, 4.7, 340, '/images/rose-clay-soap.jpg', 'Bar Soap', '125g', 'Soap Box / Tin', 30),
  (201, 'Pure Saffron & Kumkumadi Radiance Face Serum', 'pure-saffron-kumkumadi-radiance-serum', 'An Ayurvedic liquid gold elixir crafted with 26 natural herbs, Saffron threads, and Niacinamide. Fades dark spots, pigmentation, and gives a glowing, glass-skin complexion overnight.', 'serums', 'brightening', 'Skinora Botanicals', 899.0, 649.0, 28, 98, 4.9, 940, '/images/saffron-serum.jpg', 'Dropper Liquid', '30ml', 'Glass Dropper Bottle', 50),
  (202, '15% Vitamin C & Ferulic Acid Glow Booster Serum', '15-percent-vitamin-c-glow-booster-serum', 'Potent antioxidant serum with 15% Ethyl Ascorbic Acid, 1% Ferulic Acid, and Hyaluronic Acid. Brightens dull complexion, neutralizes sun damage, and boosts collagen production.', 'serums', 'brightening', 'Skinora Pure', 799.0, 549.0, 31, 115, 4.8, 760, '/images/vitamin-c-serum.jpg', 'Dropper Liquid', '30ml', 'Glass Dropper Bottle', 50),
  (203, '2% Hyaluronic Acid & Polyglutamic Plumping Serum', '2-percent-hyaluronic-acid-plumping-serum', 'Ultra-hydrating multi-molecular Hyaluronic Acid serum that quenches thirsty skin, smoothes fine lines, and restores bouncy, plump elasticity.', 'serums', 'hydration', 'Skinora Pure', 699.0, 499.0, 29, 135, 4.7, 520, '/images/hyaluronic-serum.jpg', 'Dropper Liquid', '30ml', 'Glass Dropper Bottle', 50),
  (204, '10% Niacinamide & 1% Zinc Blemish Refining Serum', '10-percent-niacinamide-zinc-serum', 'Oil-balancing clarifying serum with pure Niacinamide (Vitamin B3) and Zinc PCA. Reduces enlarged pores, controls shine, and fades stubborn acne marks.', 'serums', 'acne-care', 'Skinora Pure', 749.0, 529.0, 29, 160, 4.8, 830, '/images/niacinamide-serum.jpg', 'Dropper Liquid', '30ml', 'Glass Dropper Bottle', 50),
  (301, 'Vitamin C Radiance Foaming Face Wash with Brush', 'vitamin-c-radiance-foaming-face-wash', 'Deep cleansing foaming wash equipped with built-in silicone bristle brush. Infused with Kakadu Plum, Orange Peel Oil, and Lemon extract to brighten skin instantly.', 'facewash', 'brightening', 'Skinora Pure', 499.0, 349.0, 30, 150, 4.8, 1120, '/images/face-wash.jpg', 'Foam Pump Bottle', '150ml', 'Plastic Pump Bottle', 40),
  (305, 'Skinora Ultra Hydrating Gel Moisturizer with Hyaluronic Acid', 'ultra-hydrating-gel-moisturizer-hyaluronic-acid', 'Lightweight, oil-free water-gel moisturizer with 72-hour moisture lock technology. Absorbs in seconds without sticky residue, leaving skin dewy, fresh, and hydrated.', 'lotion', 'moisturizer', 'Skinora Glow', 699.0, 499.0, 29, 165, 4.9, 1380, '/images/moisturizer.jpg', 'Gel Cream', '50g', 'Glass Jar with Cap', 45),
  (309, 'SPF 50 PA++++ Ultra Light Matte Sunscreen Fluid', 'spf-50-pa-plus-plus-plus-plus-ultra-light-sunscreen', 'Zero white-cast hybrid sunscreen with SPF 50+ broad-spectrum protection against UVA, UVB, and Blue Light. Extremely lightweight, non-greasy, and water-resistant.', 'sunscreen', 'sun-protection', 'Skinora Pure', 649.0, 449.0, 31, 200, 4.9, 1850, '/images/sunscreen.jpg', 'Fluid Lotion', '80ml', 'Plastic Bottle with Pump', 40),
  (401, 'French Damask Rose Shower Gel Body Wash', 'french-damask-rose-shower-gel-body-wash', 'Luxurious aromatic body wash infused with real Damask Rose petals and Aloe Vera. Rich lather gently cleanses and leaves skin soft and delicately perfumed.', 'bodywash', 'shower-gel', 'Skinora Glow', 549.0, 379.0, 31, 170, 4.9, 1100, '/images/body-wash.jpg', 'Liquid Gel', '300ml', 'Plastic Pump Bottle', 50),
  (405, 'Shea Butter & Vitamin E Deep Moisture Body Lotion', 'shea-butter-vitamin-e-deep-moisture-body-lotion', 'Deeply hydrating non-greasy body lotion with pure African Shea Butter, Vitamin E, and Almond Oil. Keeps body skin smooth and moisturized for 48 hours.', 'lotion', 'body-lotion', 'Skinora Botanicals', 599.0, 419.0, 30, 160, 4.8, 1240, '/images/body-lotion.jpg', 'Lotion', '400ml', 'Plastic Pump Bottle', 50),
  (501, 'Walnut & Apricot Gentle Exfoliating Face Scrub', 'walnut-apricot-gentle-exfoliating-face-scrub', 'Micro-milled Walnut shell and Apricot oil scrub. Buffs off dead dull skin cells, cleans blackheads, and unveils silky smooth soft skin instantly.', 'masks', 'scrub', 'Skinora Botanicals', 449.0, 319.0, 29, 135, 4.8, 870, '/images/face-scrub.jpg', 'Scrub Paste', '100g', 'Plastic Jar / Tube', 40),
  (502, 'Multani Mitti & Sandalwood Tan Clear Ubtan Pack', 'multani-mitti-sandalwood-tan-clear-ubtan-pack', "Traditional royal Ayurvedic ubtan mask with Fuller's Earth (Multani Mitti), Kashmiri Saffron, Sandalwood oil, and Rosewater. Absorbs excess sebum and brightens skin.", 'masks', 'clay-mask', 'Skinora Organics', 499.0, 349.0, 30, 110, 4.9, 960, '/images/ubtan-face-pack.jpg', 'Clay Paste', '100g', 'Glass Jar with Cap', 45),
  (601, 'Red Onion & Black Seed Hair Fall Control Shampoo', 'red-onion-black-seed-hair-fall-control-shampoo', 'Sulphate-free therapeutic shampoo with Red Onion extract, Kalonji (Black Seed) oil, and Plant Keratin. Reduces hair fall, strengthens roots, and adds shine.', 'shampoo', 'hair-fall', 'Skinora Botanicals', 599.0, 419.0, 30, 180, 4.8, 1650, '/images/shampoo.jpg', 'Shampoo Liquid', '300ml', 'Plastic Pump Bottle', 50),
  (603, 'Rosemary & Biotin Hair Growth Nourishing Oil', 'rosemary-biotin-hair-growth-nourishing-oil', 'Concentrated herbal oil with Rosemary Leaf Oil, Biotin, Coconut, and Argan Oil. Stimulates scalp circulation, strengthens roots, and boosts new hair growth.', 'shampoo', 'hair-oil', 'Skinora Botanicals', 799.0, 579.0, 28, 110, 4.9, 840, '/images/hair-growth-oil.jpg', 'Ayurvedic Oil', '200ml', 'Glass Pump Bottle', 50),
  (701, 'Kashmiri Saffron Royal Golden Glow 4-Piece Box', 'kashmiri-saffron-royal-golden-glow-combo-box', 'Ultimate Ayurvedic beauty box containing Magic De-Tan Soap, Saffron Kumkumadi Serum, Ubtan Face Pack, and Glass Skin Day Cream in a luxury velvet pouch.', 'combos', 'gift-set', 'Skinora Organics', 2199.0, 1499.0, 32, 85, 4.9, 2100, '/images/combo-set.jpg', '4-Piece Set', 'Full Set', 'Luxury Velvet Gift Box', 100),
  (801, 'Natural Rose & Sandalwood Lip Scrub & Balm Duo', 'natural-rose-sandalwood-lip-duo', 'Gentle sugar lip scrub with Damask Rose oil paired with a tinted beetroot lip butter. Lightens lip pigmentation and keeps lips soft & plump.', 'lotion', 'lipcare', 'Skinora Glow', 399.0, 279.0, 30, 140, 4.7, 420, '/images/lip-balm.jpg', 'Pot Duo', '15g + 15g', 'Glass Lip Butter Pots', 35),
]

def init_neon_database():
    print("Initializing Neon PostgreSQL Database tables & schema...")
    conn = psycopg2.connect(NEON_DB_URL)
    cur = conn.cursor()

    # Enable UUID extension
    cur.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

    # 1. Categories Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Products Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(300) UNIQUE NOT NULL,
        description TEXT,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        brand VARCHAR(100),
        mrp NUMERIC(10, 2) NOT NULL DEFAULT 0,
        price NUMERIC(10, 2) NOT NULL DEFAULT 0,
        discount_percent INT DEFAULT 0,
        stock INT DEFAULT 0,
        rating NUMERIC(3, 1) DEFAULT 0,
        review_count INT DEFAULT 0,
        image_url TEXT,
        form VARCHAR(100),
        size VARCHAR(50),
        container_type VARCHAR(100) DEFAULT 'Glass Bottle',
        recycle_points INT DEFAULT 50,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Users Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        full_name VARCHAR(255),
        avatar_url TEXT,
        phone VARCHAR(20),
        eco_points INT DEFAULT 150,
        containers_recycled INT DEFAULT 0,
        co2_saved_kg FLOAT DEFAULT 0.0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 4. Container Return Requests Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS container_returns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE SET NULL,
        order_id UUID,
        container_type VARCHAR(100) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        pickup_address TEXT NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        status VARCHAR(50) DEFAULT 'Scheduled for Pickup',
        points_awarded INT NOT NULL DEFAULT 50,
        co2_saved_kg FLOAT DEFAULT 0.25,
        tracking_code VARCHAR(100),
        coupon_code VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)
    # Add missing columns to existing container_returns table (idempotent)
    for col_def in [
        "ADD COLUMN IF NOT EXISTS order_id UUID",
        "ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS order_item_id UUID",
    ]:
        try:
            cur.execute(f"ALTER TABLE container_returns {col_def};")
        except Exception:
            conn.rollback()
            cur = conn.cursor()

    # 5. Orders Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'confirmed',
        total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        discount_amount NUMERIC(10, 2) DEFAULT 0,
        eco_points_redeemed INT DEFAULT 0,
        eco_discount_amount NUMERIC(10, 2) DEFAULT 0,
        final_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        coupon_code VARCHAR(50),
        payment_method VARCHAR(50) DEFAULT 'cod',
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_id VARCHAR(100),
        razorpay_order_id VARCHAR(100),
        eco_points_earned INT DEFAULT 0,
        shipping_address TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)
    # Add missing columns to existing orders table (idempotent)
    for col_def in [
        "ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100)",
        "ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100)",
        "ADD COLUMN IF NOT EXISTS eco_points_earned INT DEFAULT 0",
        "ADD COLUMN IF NOT EXISTS eco_points_redeemed INT DEFAULT 0",
        "ADD COLUMN IF NOT EXISTS eco_discount_amount NUMERIC(10,2) DEFAULT 0",
    ]:
        try:
            cur.execute(f"ALTER TABLE orders {col_def};")
        except Exception:
            conn.rollback()
            cur = conn.cursor()

    # 6. Order Items Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id),
        quantity INT NOT NULL DEFAULT 1,
        unit_price NUMERIC(10, 2) NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed Default Demo User
    cur.execute("""
    INSERT INTO users (id, email, full_name, eco_points, containers_recycled, co2_saved_kg)
    VALUES ('demo_user_101', 'priya.sharma@example.com', 'Priya Sharma', 150, 3, 0.75)
    ON CONFLICT (id) DO UPDATE SET eco_points = 150;
    """)

    # Seed Skinora Products
    cur.execute("TRUNCATE TABLE products CASCADE;")
    for p in PRODUCTS_DATA:
        cur.execute("""
        INSERT INTO products (id, name, slug, description, category, subcategory, brand, mrp, price, discount_percent, stock, rating, review_count, image_url, form, size, container_type, recycle_points)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, p)

    # Seed Initial Demo Container Return Request
    cur.execute("""
    INSERT INTO container_returns (user_id, product_id, container_type, quantity, pickup_address, pincode, status, points_awarded, co2_saved_kg, tracking_code)
    SELECT 'demo_user_101', 102, 'Glass Dropper Bottle', 2, 'Flat 402, Rosewood Apartments, Bandra West, Mumbai', '400050', 'Points Credited', 100, 0.50, 'ECO-RECYCLE-9821'
    WHERE NOT EXISTS (SELECT 1 FROM container_returns WHERE user_id = 'demo_user_101');
    """)

    conn.commit()
    cur.close()
    conn.close()
    print("Neon PostgreSQL Database initialized and seeded successfully!")

if __name__ == "__main__":
    init_neon_database()
