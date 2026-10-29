"""
/api/search — semantic search via ChromaDB + sentence-transformers
Falls back to PostgreSQL full-text search when ChromaDB is unavailable.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache import TTL_SEARCH, cache_get, cache_set, key_search
from app.database import get_db
from app.models import Category, Product
from app.schemas import ProductCard, SearchResponse

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/search", tags=["search"])


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
    }


async def _semantic_search(query: str, limit: int, db: AsyncSession) -> tuple[list[dict], str]:
    """Try ChromaDB semantic search; fall back to PG FTS."""
    try:
        from app.ml.embeddings import get_embedding_service
        svc = await get_embedding_service()
        if svc and svc.is_ready():
            product_ids = await svc.search(query, n_results=limit * 2)
            if product_ids:
                stmt = (
                    select(Product)
                    .where(Product.id.in_(product_ids), Product.is_active == True)
                    .limit(limit)
                )
                products = (await db.execute(stmt)).scalars().all()
                # preserve ranking order from ChromaDB
                id_order = {pid: i for i, pid in enumerate(product_ids)}
                products = sorted(products, key=lambda p: id_order.get(p.id, 999))
                return [_to_card(p) for p in products], "semantic"
    except Exception as exc:
        log.warning("Semantic search failed (%s), falling back to FTS", exc)

    return await _fts_search(query, limit, db)


async def _fts_search(query: str, limit: int, db: AsyncSession) -> tuple[list[dict], str]:
    """PostgreSQL full-text + ILIKE fallback."""
    terms = query.strip()
    stmt = (
        select(Product)
        .where(
            Product.is_active == True,
            or_(
                Product.name.ilike(f"%{terms}%"),
                Product.brand.ilike(f"%{terms}%"),
                Product.subcategory.ilike(f"%{terms}%"),
                Product.description.ilike(f"%{terms}%"),
            ),
        )
        .order_by(Product.review_count.desc())
        .limit(limit)
    )
    products = (await db.execute(stmt)).scalars().all()
    return [_to_card(p) for p in products], "keyword"


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=20, ge=1, le=50),
    category: Optional[str] = Query(default=None),
    min_price: Optional[float] = Query(default=None),
    max_price: Optional[float] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    cache_key = key_search(f"{q}:{category}:{min_price}:{max_price}:{limit}")
    cached = await cache_get(cache_key)
    if cached:
        return cached

    products, search_type = await _semantic_search(q, limit * 2, db)

    # Post-filter by optional params
    if category:
        products = [p for p in products if (p.get("category") or "").lower() == category.lower()]
    if min_price is not None:
        products = [p for p in products if p["price"] >= min_price]
    if max_price is not None:
        products = [p for p in products if p["price"] <= max_price]

    products = products[:limit]

    result = {
        "products": products,
        "total": len(products),
        "query": q,
        "search_type": search_type,
    }
    await cache_set(cache_key, result, ttl=TTL_SEARCH)
    return result
