"""
NEXAURA — Dataset Processing Script
Reads the raw cosmetic CSV, selects ~350 products across all 6 categories,
generates synthetic pricing / stock / discount data, and writes:
  1. nexaura_products.json   — used by seed_db.py & ML pipeline
  2. seed.sql                — Supabase-ready INSERT statements
  3. seed_events.sql         — synthetic user-event rows
  4. seed_competitors.sql    — synthetic competitor prices
  5. seed_coupons.sql        — coupon codes
"""

import csv
import json
import math
import os
import random
import re
import uuid
from datetime import datetime, timedelta

SEED = 42
random.seed(SEED)

# ── paths ────────────────────────────────────────────────────────────────────
HERE   = os.path.dirname(os.path.abspath(__file__))
ROOT   = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CSV_PATH = os.path.join(ROOT, "E-commerce  cosmetic dataset.csv")
OUT_DIR  = os.path.join(HERE, "..", "data")
os.makedirs(OUT_DIR, exist_ok=True)

# ── how many products per category ───────────────────────────────────────────
TARGET_PER_CATEGORY = {
    "skincare":  65,
    "face":      65,
    "body":      55,
    "hair":      55,
    "eyes":      55,
    "lips":      55,
}
TOTAL_TARGET = sum(TARGET_PER_CATEGORY.values())   # 350

# ── helpers ───────────────────────────────────────────────────────────────────
def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:80]

def clean_price(raw: str) -> float:
    """Convert raw price string → INR float (prices already in INR-ish range)."""
    try:
        val = float(re.sub(r"[^\d.]", "", raw))
        # Dataset has a mix of INR and USD-converted values;
        # cap to sane INR range [99, 9999]
        if val < 50:
            val = round(val * 83, -1)   # rough USD→INR
        return max(99.0, min(9999.0, round(val, -1)))
    except Exception:
        return round(random.uniform(299, 2499), -1)

def generate_price_inr(category: str, brand: str) -> dict:
    """Return base_price, mrp, discount_percent, final_price."""
    # Premium brands get higher base
    premium_brands = {"Ahava", "MAC", "Dior", "NARS", "Urban Decay", "Charlotte Tilbury",
                      "Estee Lauder", "Clinique", "Armani", "Lancome", "YSL"}
    is_premium = brand in premium_brands

    ranges = {
        "skincare": (499, 3999) if is_premium else (199, 1499),
        "face":     (399, 4999) if is_premium else (199, 1999),
        "body":     (299, 2499) if is_premium else (149, 999),
        "hair":     (249, 1999) if is_premium else (149, 799),
        "eyes":     (299, 3999) if is_premium else (199, 1499),
        "lips":     (199, 2999) if is_premium else (99, 799),
    }
    lo, hi = ranges.get(category, (199, 1499))
    base = round(random.uniform(lo, hi), -1)
    discount = random.choice([0, 5, 10, 15, 20, 25, 30])
    mrp = round(base / (1 - discount / 100), -1) if discount else base
    final = base
    return {
        "mrp": mrp,
        "price": final,
        "discount_percent": discount,
    }

def generate_stock(subcategory: str) -> int:
    mapping = {
        "perfume": (30, 150), "lipstick": (50, 300), "foundation": (40, 200),
        "mascara": (60, 250), "serum": (20, 100), "moisturizer": (30, 150),
        "shampoo": (40, 200), "bodywash": (50, 250), "eyeshadow": (30, 180),
        "eyeliner": (50, 250), "blush": (30, 120), "concealer": (40, 180),
    }
    lo, hi = mapping.get(subcategory, (20, 200))
    return random.randint(lo, hi)

def clean_rating(r: str) -> float:
    try:
        v = float(r)
        return round(max(1.0, min(5.0, v)), 1)
    except Exception:
        return round(random.uniform(3.5, 4.8), 1)

def clean_reviews(n: str) -> int:
    try:
        return int(re.sub(r"[^\d]", "", n))
    except Exception:
        return random.randint(10, 5000)

def build_description(row: dict) -> str:
    parts = []
    if row.get("type"):
        parts.append(row["type"].strip())
    if row.get("form"):
        parts.append(f"Form: {row['form'].strip()}")
    if row.get("color") and row["color"].lower() not in ("no color", "", "nan"):
        parts.append(f"Shade/Color: {row['color'].strip()}")
    if row.get("size") and str(row["size"]).strip() not in ("", "nan"):
        parts.append(f"Size: {row['size'].strip()} ml/g")
    ingr = (row.get("ingredients") or "").strip()
    if ingr and len(ingr) > 10:
        short = ingr[:200] + ("..." if len(ingr) > 200 else "")
        parts.append(f"Key ingredients: {short}")
    return " | ".join(parts) if parts else row.get("product_name", "")

PLACEHOLDER_IMAGES = {
    "skincare": [
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400",
        "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400",
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400",
    ],
    "face": [
        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400",
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400",
        "https://images.unsplash.com/photo-1631214240010-a6cc490c1131?w=400",
    ],
    "body": [
        "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400",
        "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400",
        "https://images.unsplash.com/photo-1571782742343-03f979d96c4e?w=400",
    ],
    "hair": [
        "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400",
        "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=400",
        "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400",
    ],
    "eyes": [
        "https://images.unsplash.com/photo-1586495777744-4e6232bf4ffc?w=400",
        "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400",
        "https://images.unsplash.com/photo-1629397685944-54d55b7cff2f?w=400",
    ],
    "lips": [
        "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400",
        "https://images.unsplash.com/photo-1560343776-97e7d202ff0e?w=400",
        "https://images.unsplash.com/photo-1583241800698-e8ab01830a24?w=400",
    ],
}

# ── load CSV ──────────────────────────────────────────────────────────────────
print(f"Reading CSV from: {CSV_PATH}")
with open(CSV_PATH, encoding="utf-8", errors="replace") as f:
    reader = csv.DictReader(f)
    raw_rows = list(reader)

print(f"Total CSV rows: {len(raw_rows)}")

# ── stratified sampling ───────────────────────────────────────────────────────
by_category: dict[str, list] = {}
for row in raw_rows:
    cat = (row.get("category") or "").strip().lower()
    if cat in TARGET_PER_CATEGORY:
        by_category.setdefault(cat, []).append(row)

products = []
product_id_counter = 1

for cat, target in TARGET_PER_CATEGORY.items():
    pool = by_category.get(cat, [])
    random.shuffle(pool)
    # deduplicate by product_name prefix to avoid near-duplicates
    seen_prefixes: set = set()
    chosen = []
    for row in pool:
        name = (row.get("product_name") or "").strip()
        prefix = name[:40].lower()
        if prefix in seen_prefixes:
            continue
        seen_prefixes.add(prefix)
        chosen.append(row)
        if len(chosen) >= target:
            break

    print(f"  {cat}: selected {len(chosen)} / {target}")

    for row in chosen:
        name     = (row.get("product_name") or "").strip()[:255]
        brand    = (row.get("brand") or "Unknown").strip()[:100]
        subcat   = (row.get("subcategory") or "general").strip().lower()
        pricing  = generate_price_inr(cat, brand)
        stock    = generate_stock(subcat)
        rating   = clean_rating(row.get("rating", ""))
        reviews  = clean_reviews(row.get("noofratings", ""))
        desc     = build_description(row)
        images   = PLACEHOLDER_IMAGES.get(cat, PLACEHOLDER_IMAGES["face"])
        image    = random.choice(images)
        tags     = [cat, subcat, brand.lower(), row.get("form", "").strip(),
                    row.get("type", "").strip()]
        tags     = [t for t in tags if t and t not in ("", "nan")]

        prod = {
            "id": product_id_counter,
            "name": name,
            "slug": slugify(name) + f"-{product_id_counter}",
            "description": desc,
            "category": cat,
            "subcategory": subcat,
            "brand": brand,
            "mrp": pricing["mrp"],
            "price": pricing["price"],
            "discount_percent": pricing["discount_percent"],
            "stock": stock,
            "rating": rating,
            "review_count": reviews,
            "image_url": image,
            "tags": tags,
            "ingredients": (row.get("ingredients") or "")[:1000],
            "form": (row.get("form") or "").strip(),
            "color": (row.get("color") or "").strip(),
            "size": str(row.get("size") or "").strip(),
            "website": (row.get("website") or "").strip(),
            "is_active": True,
            "created_at": (datetime.utcnow() - timedelta(days=random.randint(0, 365))).isoformat(),
        }
        products.append(prod)
        product_id_counter += 1

print(f"\nTotal products selected: {len(products)}")

# ── write JSON ────────────────────────────────────────────────────────────────
json_path = os.path.join(OUT_DIR, "nexaura_products.json")
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(products, f, ensure_ascii=False, indent=2)
print(f"Written: {json_path}")

# ── write seed.sql ────────────────────────────────────────────────────────────
def esc(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

lines = ["""-- ============================================================
-- NEXAURA — Supabase seed SQL
-- Run this in Supabase SQL editor AFTER creating tables via schema.sql
-- ============================================================

-- Categories
INSERT INTO categories (id, name, slug, description) VALUES
  (1, 'Skincare',  'skincare', 'Face serums, moisturizers, cleansers & more'),
  (2, 'Face',      'face',     'Foundation, blush, primer, concealer & more'),
  (3, 'Body',      'body',     'Body wash, perfumes, scrubs & more'),
  (4, 'Hair',      'hair',     'Shampoo, conditioner, hair masks & more'),
  (5, 'Eyes',      'eyes',     'Mascara, eyeliner, eyeshadow & more'),
  (6, 'Lips',      'lips',     'Lipstick, lipgloss, lip balm & more')
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (id, name, slug, description, category_id, subcategory, brand,
  mrp, price, discount_percent, stock, rating, review_count,
  image_url, tags, ingredients, form, color, size, is_active, created_at)
VALUES"""]

cat_map = {"skincare": 1, "face": 2, "body": 3, "hair": 4, "eyes": 5, "lips": 6}

rows_sql = []
for p in products:
    cat_id = cat_map.get(p["category"], 1)
    tags_pg = "{" + ",".join(p["tags"]) + "}"
    rows_sql.append(
        f"  ({p['id']}, {esc(p['name'])}, {esc(p['slug'])}, {esc(p['description'])}, "
        f"{cat_id}, {esc(p['subcategory'])}, {esc(p['brand'])}, "
        f"{p['mrp']}, {p['price']}, {p['discount_percent']}, {p['stock']}, "
        f"{p['rating']}, {p['review_count']}, "
        f"{esc(p['image_url'])}, {esc(tags_pg)}, "
        f"{esc(p['ingredients'][:500])}, {esc(p['form'])}, {esc(p['color'])}, {esc(p['size'])}, "
        f"true, {esc(p['created_at'])})"
    )

lines.append(",\n".join(rows_sql) + ";")
lines.append("")

sql_path = os.path.join(OUT_DIR, "seed.sql")
with open(sql_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print(f"Written: {sql_path}")

# ── synthetic coupons ─────────────────────────────────────────────────────────
coupon_lines = ["-- Coupons",
"INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_uses, is_active, expires_at) VALUES"]
coupons = [
    ("NEXAURA10", "percent", 10, 499,  1000, True, "2027-12-31"),
    ("NEXAURA20", "percent", 20, 999,  500,  True, "2027-06-30"),
    ("FLAT100",   "flat",    100, 799,  200,  True, "2026-12-31"),
    ("FLAT200",   "flat",    200, 1499, 100,  True, "2026-12-31"),
    ("WELCOME15", "percent", 15, 299,  5000, True, "2027-12-31"),
    ("BEAUTY30",  "percent", 30, 1999, 250,  True, "2027-03-31"),
    ("SKINLOVE",  "percent", 25, 799,  300,  True, "2027-06-30"),
    ("LIPS50",    "flat",    50,  199,  999,  True, "2026-12-31"),
]
c_rows = []
for c in coupons:
    code, dtype, dval, minord, maxuse, active, exp = c
    c_rows.append(
        f"  ({esc(code)}, {esc(dtype)}, {dval}, {minord}, {maxuse}, {'true' if active else 'false'}, {esc(exp)})"
    )
coupon_lines.append(",\n".join(c_rows) + ";")
coupon_path = os.path.join(OUT_DIR, "seed_coupons.sql")
with open(coupon_path, "w", encoding="utf-8") as f:
    f.write("\n".join(coupon_lines))
print(f"Written: {coupon_path}")

# ── synthetic competitor prices ───────────────────────────────────────────────
comp_lines = ["-- Competitor prices",
"INSERT INTO competitor_prices (product_id, competitor, competitor_price, recorded_at) VALUES"]
competitors = ["Nykaa", "Purplle", "Amazon", "Meesho", "Myntra"]
comp_rows = []
for p in products:
    for comp in random.sample(competitors, k=random.randint(1, 3)):
        delta = random.uniform(-0.15, 0.25)
        comp_price = round(p["price"] * (1 + delta), -1)
        comp_rows.append(
            f"  ({p['id']}, {esc(comp)}, {comp_price}, NOW())"
        )
comp_lines.append(",\n".join(comp_rows) + ";")
comp_path = os.path.join(OUT_DIR, "seed_competitors.sql")
with open(comp_path, "w", encoding="utf-8") as f:
    f.write("\n".join(comp_lines))
print(f"Written: {comp_path}")

# ── synthetic user events (for ML warm start) ─────────────────────────────────
event_types = ["view", "click", "add_to_cart", "wishlist", "purchase", "remove_from_cart"]
event_weights = [40, 20, 15, 10, 10, 5]
n_users  = 50
n_events = 3000

event_lines = ["-- Synthetic user events (warm-start for ML)",
"INSERT INTO user_events (user_id, product_id, event_type, session_id, metadata, created_at) VALUES"]
ev_rows = []
base_time = datetime.utcnow() - timedelta(days=90)

for _ in range(n_events):
    uid = f"user_{random.randint(1, n_users):03d}"
    pid = random.choice(products)["id"]
    ev  = random.choices(event_types, weights=event_weights, k=1)[0]
    sid = str(uuid.uuid4())[:8]
    ts  = base_time + timedelta(
        days=random.randint(0, 89),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59)
    )
    ev_rows.append(
        f"  ({esc(uid)}, {pid}, {esc(ev)}, {esc(sid)}, '{{}}', {esc(ts.isoformat())})"
    )

event_lines.append(",\n".join(ev_rows) + ";")
events_path = os.path.join(OUT_DIR, "seed_events.sql")
with open(events_path, "w", encoding="utf-8") as f:
    f.write("\n".join(event_lines))
print(f"Written: {events_path}")

# ── A/B test seed ─────────────────────────────────────────────────────────────
ab_path = os.path.join(OUT_DIR, "seed_ab.sql")
with open(ab_path, "w", encoding="utf-8") as f:
    f.write("""-- A/B Tests
INSERT INTO ab_tests (id, name, description, variant_a, variant_b, start_date, end_date, is_active) VALUES
  (1, 'pricing_experiment_1', 'Test +10% price lift on skincare serums',
   'control', 'price_plus_10', NOW(), NOW() + INTERVAL '30 days', true),
  (2, 'checkout_flow_test', 'Single page vs multi-step checkout',
   'multi_step', 'single_page', NOW(), NOW() + INTERVAL '14 days', true),
  (3, 'recommendation_algo', 'Content-based vs trending recommendations on homepage',
   'content_based', 'trending', NOW(), NOW() + INTERVAL '21 days', true)
ON CONFLICT (id) DO NOTHING;
""")
print(f"Written: {ab_path}")

print(f"\n✅ Dataset processing complete. {len(products)} products ready.")
print(f"   Output directory: {OUT_DIR}")
