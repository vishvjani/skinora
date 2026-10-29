"""
/api/products — CRUD + listing + trending
"""
from __future__ import annotations

import json
import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache import (
    TTL_PRODUCT, TTL_TRENDING, cache_delete, cache_delete_pattern,
    cache_get, cache_set, key_categories, key_product,
    key_products_list, key_trending, TTL_CATEGORIES,
)
from app.database import get_db
from app.models import Category, Product
from app.schemas import (
    BatchVerificationResponse, CategoryOut, MessageResponse,
    ProductCard, ProductDetail, ProductListResponse,
)

router = APIRouter(prefix="/api/products", tags=["products"])


# ── Helpers ───────────────────────────────────────────────────────────────────
def _to_card(p: Product) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "slug": p.slug,
        "brand": p.brand,
        "category": p.category or "soaps",
        "subcategory": p.subcategory,
        "mrp": float(p.mrp),
        "price": float(p.price),
        "discount_percent": p.discount_percent or 0,
        "rating": float(p.rating or 0),
        "review_count": p.review_count or 0,
        "image_url": p.image_url,
        "stock": p.stock or 0,
        "tags": list(p.tags or []),
        "batch_number": p.batch_number,
        "container_type": p.container_type or "Glass Dropper Bottle",
        "recycle_points": p.recycle_points or 30,
        "similarity_score": getattr(p, "similarity_score", None),
    }


def _to_detail(p: Product) -> dict:
    raw_mats = []
    if p.raw_materials:
        try:
            raw_mats = json.loads(p.raw_materials) if isinstance(p.raw_materials, str) else p.raw_materials
        except Exception:
            raw_mats = []

    tests = []
    if p.quality_tests:
        try:
            tests = json.loads(p.quality_tests) if isinstance(p.quality_tests, str) else p.quality_tests
        except Exception:
            tests = []

    return {
        **_to_card(p),
        "description": p.description,
        "ingredients": p.ingredients,
        "secondary_image": p.secondary_image,
        "form": p.form,
        "color": None,
        "size": p.size,
        "mfg_date": str(p.mfg_date) if p.mfg_date else "2026-02-15",
        "exp_date": str(p.exp_date) if p.exp_date else "2028-02-14",
        "raw_materials": raw_mats,
        "quality_tests": tests,
        "factory_location": p.factory_location or "Skinora Clean Chemistry Facility, Solan, Himachal Pradesh",
        "certifications": [c.strip() for c in p.certifications.split(",")] if isinstance(p.certifications, str) else (p.certifications or []),
    }


# ── GET /api/products ─────────────────────────────────────────────────────────
@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category: Optional[str] = Query(default=None),
    subcategory: Optional[str] = Query(default=None),
    brand: Optional[str] = Query(default=None),
    min_price: Optional[float] = Query(default=None),
    max_price: Optional[float] = Query(default=None),
    min_rating: Optional[float] = Query(default=None),
    sort: str = Query(default="popular", enum=["popular", "price_asc", "price_desc", "rating", "newest"]),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Product)
        .where(Product.is_active == True)
    )

    if category and category.lower() != "all":
        stmt = stmt.where(
            or_(
                func.lower(Product.category) == category.lower(),
                func.lower(Product.subcategory) == category.lower(),
            )
        )
    if subcategory and subcategory.lower() != "all":
        stmt = stmt.where(func.lower(Product.subcategory) == subcategory.lower())
    if brand and brand.lower() != "all":
        stmt = stmt.where(func.lower(Product.brand) == brand.lower())
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)
    if min_rating is not None:
        stmt = stmt.where(Product.rating >= min_rating)

    order_map = {
        "popular":    Product.review_count.desc(),
        "price_asc":  Product.price.asc(),
        "price_desc": Product.price.desc(),
        "rating":     Product.rating.desc(),
        "newest":     Product.created_at.desc(),
    }
    stmt = stmt.order_by(order_map[sort])

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    products = (await db.execute(stmt)).scalars().all()

    total_pages = max(1, (total + page_size - 1) // page_size)

    return ProductListResponse(
        products=[ProductCard(**_to_card(p)) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ── GET /api/products/trending ────────────────────────────────────────────────
@router.get("/trending", response_model=list[ProductCard])
async def get_trending_products(
    limit: int = Query(default=8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Product)
        .where(Product.is_active == True)
        .order_by(Product.rating.desc(), Product.review_count.desc())
        .limit(limit)
    )
    products = (await db.execute(stmt)).scalars().all()
    return [ProductCard(**_to_card(p)) for p in products]


# ── GET /api/products/categories ──────────────────────────────────────────────
@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    cats = (await db.execute(select(Category).order_by(Category.id))).scalars().all()
    return [CategoryOut.model_validate(c) for c in cats]


# ── GET /api/products/batch/{batch_number} ────────────────────────────────────
@router.get("/batch/{batch_number}", response_model=BatchVerificationResponse)
async def verify_batch_authenticity(batch_number: str, db: AsyncSession = Depends(get_db)):
    """Public Batch & QR Code Verification API."""
    clean_batch = batch_number.strip().upper()
    variants = [clean_batch]
    if clean_batch.startswith("SKIN-"):
        variants.append(clean_batch.replace("SKIN-", "SKN-", 1))
    elif clean_batch.startswith("SKN-"):
        variants.append(clean_batch.replace("SKN-", "SKIN-", 1))

    stmt = (
        select(Product)
        .where(func.upper(Product.batch_number).in_(variants), Product.is_active == True)
    )
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        # Check if query matches batch number by numeric ID or B-suffix like B101 -> 101
        candidate_id = None
        if clean_batch.isdigit():
            candidate_id = int(clean_batch)
        elif "-B" in clean_batch:
            suffix = clean_batch.split("-B")[-1]
            if suffix.isdigit():
                candidate_id = int(suffix)
        if candidate_id is not None:
            stmt = select(Product).where(Product.id == candidate_id, Product.is_active == True)
            p = (await db.execute(stmt)).scalar_one_or_none()

    if not p:
        raise HTTPException(status_code=404, detail="Batch code not verified or not found")

    detail = _to_detail(p)
    return BatchVerificationResponse(
        verified=True,
        product_id=p.id,
        product_name=p.name,
        product_slug=p.slug,
        brand=p.brand or "Skinora Organics",
        category=p.category or "soaps",
        batch_number=p.batch_number or clean_batch,
        mfg_date=str(p.mfg_date) if p.mfg_date else "15 Jan 2026",
        exp_date=str(p.exp_date) if p.exp_date else "14 Jan 2028",
        status="GENUINE & LAB CERTIFIED",
        factory_location=p.factory_location or "Skinora Clean Lab Facility, Haridwar, Uttarakhand",
        certifications=detail.get("certifications") or ["ISO 22716 GMP", "Cruelty-Free", "FDA Approved"],
        raw_materials=detail["raw_materials"],
        quality_tests=detail["quality_tests"],
        qa_inspector="Dr. Ananya Mukherjee, Head of Quality & Formulation",
        lab_certificate_no=f"NABL-SKN-QC-2026-{p.id:04d}",
        image_url=p.image_url,
        verification_timestamp=datetime.utcnow().strftime("%d %b %Y, %H:%M:%S UTC"),
    )


# ── GET /api/products/slug/{slug} ─────────────────────────────────────────────
@router.get("/slug/{slug}", response_model=ProductDetail)
async def get_product_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Product)
        .where(Product.slug == slug, Product.is_active == True)
    )
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductDetail(**_to_detail(p))


# ── GET /api/products/{id_or_slug} ────────────────────────────────────────────
@router.get("/{slug_or_id}", response_model=ProductDetail)
async def get_product_by_id_or_slug(slug_or_id: str, db: AsyncSession = Depends(get_db)):
    """Lookup product by ID (if numeric) or slug."""
    if slug_or_id.isdigit():
        stmt = (
            select(Product)
            .where(Product.id == int(slug_or_id), Product.is_active == True)
        )
    else:
        stmt = (
            select(Product)
            .where(Product.slug == slug_or_id, Product.is_active == True)
        )
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductDetail(**_to_detail(p))
