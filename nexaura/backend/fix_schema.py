"""Run once to apply missing DB columns."""
import psycopg2

DB_URL = "postgresql://neondb_owner:npg_RI0HrCYUl1wz@ep-soft-hall-b3yi1rws-pooler.c-4.ap-southeast-1.aws.neon.tech/upsteky?sslmode=require"

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

alterations = [
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS eco_points_earned INT DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS eco_points_redeemed INT DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS eco_discount_amount NUMERIC(10,2) DEFAULT 0",
    "ALTER TABLE container_returns ADD COLUMN IF NOT EXISTS order_id UUID",
    "ALTER TABLE container_returns ADD COLUMN IF NOT EXISTS order_item_id UUID",
    "ALTER TABLE container_returns ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50)",
    # Ensure coupons table has user_id column for account-locking
    "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)",
    # Ensure users table has co2_saved_kg and containers_recycled
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS containers_recycled INT DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS co2_saved_kg FLOAT DEFAULT 0.0",
]

for stmt in alterations:
    try:
        cur.execute(stmt)
        print(f"OK: {stmt[:60]}")
    except Exception as e:
        conn.rollback()
        print(f"SKIP ({e}): {stmt[:60]}")
        cur = conn.cursor()

conn.commit()
conn.close()
print("\nAll schema alterations complete.")
