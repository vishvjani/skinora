"""
NEXAURA — Database Seeder
==========================
Reads nexaura_products.json and inserts all products + categories
into PostgreSQL via SQLAlchemy (async).

Usage:
    cd nexaura/backend
    python scripts/seed_db.py

Requires DATABASE_URL in .env (or environment).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, BACKEND_ROOT)

# Load .env if dotenv available
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BACKEND_ROOT, ".env"))
except ImportError:
    pass

PRODUCTS_JSON = os.path.join(BACKEND_ROOT, "data", "nexaura_products.json")

CATEGORY_MAP = {
    "skincare": (1, "Skincare"),
    "face":     (2, "Face"),
    "body":     (3, "Body"),
    "hair":     (4, "Hair"),
    "eyes":     (5, "Eyes"),
    "lips":     (6, "Lips"),
}


async def seed():
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import text

    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        log.error("DATABASE_URL not set in environment / .env")
        sys.exit(1)

    log.info("Connecting to: %s", db_url[:50] + "…")
    engine = create_async_engine(db_url, echo=False)

    AsyncSession = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSession() as session:
        # Insert categories
        log.info("Seeding categories…")
        for slug, (cat_id, name) in CATEGORY_MAP.items():
            await session.execute(
                text("""
                    INSERT INTO categories (id, name, slug, description)
                    VALUES (:id, :name, :slug, :desc)
                    ON CONFLICT (id) DO NOTHING
                """),
                {"id": cat_id, "name": name, "slug": slug,
                 "desc": f"{name} products"},
            )
        await session.commit()
        log.info("  Categories done")

        # Load products
        with open(PRODUCTS_JSON, encoding="utf-8") as f:
            products = json.load(f)
        log.info("Loaded %d products from JSON", len(products))

        inserted = 0
        skipped  = 0
        for p in products:
            cat_id = CATEGORY_MAP.get(p["category"], (None, None))[0]
            tags_pg = "{" + ",".join(
                str(t).replace(",", "") for t in (p.get("tags") or [])
            ) + "}"
            try:
                await session.execute(
                    text("""
                        INSERT INTO products (
                            id, name, slug, description, category_id, subcategory,
                            brand, mrp, price, discount_percent, stock, rating,
                            review_count, image_url, tags, ingredients, form,
                            color, size, is_active, created_at
                        ) VALUES (
                            :id, :name, :slug, :description, :category_id, :subcategory,
                            :brand, :mrp, :price, :discount_percent, :stock, :rating,
                            :review_count, :image_url, :tags::text[], :ingredients, :form,
                            :color, :size, :is_active, :created_at
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            price = EXCLUDED.price,
                            stock = EXCLUDED.stock
                    """),
                    {
                        "id":               p["id"],
                        "name":             p["name"][:255],
                        "slug":             p["slug"][:300],
                        "description":      (p.get("description") or "")[:2000],
                        "category_id":      cat_id,
                        "subcategory":      p.get("subcategory", ""),
                        "brand":            p.get("brand", "")[:100],
                        "mrp":              p["mrp"],
                        "price":            p["price"],
                        "discount_percent": p.get("discount_percent", 0),
                        "stock":            p.get("stock", 0),
                        "rating":           p.get("rating", 0),
                        "review_count":     p.get("review_count", 0),
                        "image_url":        p.get("image_url"),
                        "tags":             tags_pg,
                        "ingredients":      (p.get("ingredients") or "")[:1000],
                        "form":             p.get("form", ""),
                        "color":            p.get("color", ""),
                        "size":             str(p.get("size", "")),
                        "is_active":        True,
                        "created_at":       p.get("created_at", datetime.utcnow().isoformat()),
                    },
                )
                inserted += 1
            except Exception as exc:
                log.warning("  Skipping product %d: %s", p["id"], exc)
                skipped += 1

            if inserted % 50 == 0:
                await session.commit()
                log.info("  Committed %d / %d", inserted, len(products))

        await session.commit()
        log.info("✅ Seeded %d products (%d skipped)", inserted, skipped)

    await engine.dispose()
    log.info("Database seeding complete.")


if __name__ == "__main__":
    asyncio.run(seed())
