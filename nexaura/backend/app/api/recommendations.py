"""
/api/recommendations — content-based + trending fallback
"""
from __future__ import annotations

import logging
import random
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_optional_user, user_id_from_claims
from app.cache import TTL_RECS, TTL_SIMILAR, cache_get, cache_set, key_recs, key_similar
from app.database import get_db
from app.models import Product, UserEvent
from app.schemas import RecommendationResponse

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


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


async def _similar_via_ml(product_id: int, limit: int, db: AsyncSession) -> list[dict]:
    """Vector similarity via ChromaDB embedding service."""
    try:
        from app.ml.embeddings import get_embedding_service
        svc = await get_embedding_service()
        if svc and svc.is_ready():
            scored_items = await svc.similar_with_scores(product_id, n_results=limit + 1)
            scored_items = [item for item in scored_items if item["product_id"] != product_id][:limit]
            if scored_items:
                id_to_score = {item["product_id"]: item["similarity_score"] for item in scored_items}
                similar_ids = list(id_to_score.keys())
                stmt = (
                    select(Product)
                    .where(Product.id.in_(similar_ids), Product.is_active == True)
                )
                prods = (await db.execute(stmt)).scalars().all()
                order = {pid: i for i, pid in enumerate(similar_ids)}
                prods = sorted(prods, key=lambda p: order.get(p.id, 999))
                
                cards = []
                for p in prods:
                    card = _to_card(p)
                    card["similarity_score"] = id_to_score.get(p.id, 88.5)
                    cards.append(card)
                return cards
    except Exception as exc:
        log.warning("Vector similarity failed: %s", exc)
    return []


async def _similar_fallback(product: Product, limit: int, db: AsyncSession) -> list[dict]:
    """Same subcategory/brand fallback when ML unavailable."""
    stmt = (
        select(Product)
        .where(
            Product.is_active == True,
            Product.id != product.id,
            Product.subcategory == product.subcategory,
        )
        .order_by(Product.rating.desc())
        .limit(limit)
    )
    prods = (await db.execute(stmt)).scalars().all()
    return [_to_card(p) for p in prods]


# ── GET /api/recommendations/similar/{product_id} ─────────────────────────────
@router.get("/similar/{product_id}", response_model=RecommendationResponse)
async def similar_products(
    product_id: int,
    limit: int = Query(default=8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    cache_key = key_similar(product_id)
    cached = await cache_get(cache_key)
    if cached:
        return cached

    # load base product
    stmt = (
        select(Product)
        .where(Product.id == product_id, Product.is_active == True)
    )
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        return RecommendationResponse(products=[], strategy="none")

    products = await _similar_via_ml(product_id, limit, db)
    strategy = "vector_similarity"

    if not products:
        products = await _similar_fallback(product, limit, db)
        strategy = "subcategory_fallback"

    result = {"products": products, "strategy": strategy}
    await cache_set(cache_key, result, ttl=TTL_SIMILAR)
    return result


# ── GET /api/recommendations/for-you ─────────────────────────────────────────
@router.get("/for-you", response_model=RecommendationResponse)
async def personalized(
    limit: int = Query(default=12, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    claims: Optional[dict] = Depends(get_optional_user),
):
    if not claims:
        # anonymous — return top-rated products
        stmt = (
            select(Product)
                .where(Product.is_active == True)
            .order_by(Product.rating.desc(), Product.review_count.desc())
            .limit(limit)
        )
        prods = (await db.execute(stmt)).scalars().all()
        return {"products": [_to_card(p) for p in prods], "strategy": "top_rated_anonymous"}

    user_id = user_id_from_claims(claims)
    cache_key = key_recs(user_id)
    cached = await cache_get(cache_key)
    if cached:
        return cached

    # Get user's interacted product ids
    ev_stmt = (
        select(UserEvent.product_id)
        .where(
            UserEvent.user_id == user_id,
            UserEvent.event_type.in_(["view", "add_to_cart", "wishlist", "purchase"]),
            UserEvent.product_id.isnot(None),
        )
        .order_by(UserEvent.created_at.desc())
        .limit(20)
    )
    interacted_ids = list({r for (r,) in await db.execute(ev_stmt)})

    if not interacted_ids:
        # cold start — popular
        stmt = (
            select(Product)
                .where(Product.is_active == True)
            .order_by(Product.review_count.desc())
            .limit(limit)
        )
        prods = (await db.execute(stmt)).scalars().all()
        result = {"products": [_to_card(p) for p in prods], "strategy": "popular_cold_start"}
        await cache_set(cache_key, result, ttl=TTL_RECS)
        return result

    # content-based: find similar to recently interacted
    try:
        from app.ml.embeddings import get_embedding_service
        svc = await get_embedding_service()
        if svc and svc.is_ready():
            seen = set(interacted_ids)
            recs: list[int] = []
            for pid in interacted_ids[:5]:
                similar = await svc.similar(pid, n_results=10)
                recs.extend([s for s in similar if s not in seen])
                seen.update(similar)
                if len(recs) >= limit:
                    break

            recs = list(dict.fromkeys(recs))[:limit]   # dedupe, preserve order
            if recs:
                stmt = (
                    select(Product)
                    .where(Product.id.in_(recs), Product.is_active == True)
                )
                prods = (await db.execute(stmt)).scalars().all()
                order = {pid: i for i, pid in enumerate(recs)}
                prods = sorted(prods, key=lambda p: order.get(p.id, 999))
                result = {"products": [_to_card(p) for p in prods], "strategy": "content_based"}
                await cache_set(cache_key, result, ttl=TTL_RECS)
                return result
    except Exception as exc:
        log.warning("Personalised recs ML error: %s", exc)

    # fallback: same categories as interacted
    stmt = (
        select(Product)
        .where(
            Product.is_active == True,
            Product.id.notin_(interacted_ids),
        )
        .order_by(Product.rating.desc())
        .limit(limit)
    )
    prods = (await db.execute(stmt)).scalars().all()
    result = {"products": [_to_card(p) for p in prods], "strategy": "rating_fallback"}
    await cache_set(cache_key, result, ttl=TTL_RECS)
    return result
