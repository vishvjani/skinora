"""
NEXAURA — Recommendation Engine
================================
Strategies (applied in priority order):
  1. vector_similarity   — ChromaDB cosine similarity on product embeddings
  2. collab_proxy        — "users who viewed X also viewed Y" (from user_events)
  3. subcategory_popular — same subcategory, sorted by rating
  4. top_rated           — site-wide fallback

All strategies are exposed as async functions and composed by the
recommendations API router.
"""
from __future__ import annotations

import logging
from typing import Optional

log = logging.getLogger(__name__)


# ── Strategy 1: Vector Similarity ─────────────────────────────────────────────
async def vector_similar(
    product_id: int,
    n: int = 10,
) -> tuple[list[int], str]:
    """Return similar product IDs via ChromaDB embeddings."""
    try:
        from app.ml.embeddings import get_embedding_service
        svc = await get_embedding_service()
        if svc and svc.is_ready():
            ids = await svc.similar(product_id, n_results=n)
            if ids:
                return ids, "vector_similarity"
    except Exception as exc:
        log.warning("vector_similar error: %s", exc)
    return [], "vector_similarity_unavailable"


# ── Strategy 2: Collaborative Proxy ───────────────────────────────────────────
async def collab_proxy(
    product_id: int,
    n: int = 10,
    db=None,
) -> tuple[list[int], str]:
    """
    Simple co-view proxy:
      Find users who interacted with product_id,
      then rank other products those users interacted with.
    """
    if db is None:
        return [], "collab_unavailable"

    try:
        from sqlalchemy import func, select
        from app.models import UserEvent

        # Users who touched this product
        subq = (
            select(UserEvent.user_id)
            .where(
                UserEvent.product_id == product_id,
                UserEvent.user_id.isnot(None),
            )
            .distinct()
            .subquery()
        )

        # Other products those users touched, ranked by frequency
        rows = await db.execute(
            select(
                UserEvent.product_id,
                func.count(UserEvent.id).label("co_count"),
            )
            .where(
                UserEvent.user_id.in_(select(subq)),
                UserEvent.product_id != product_id,
                UserEvent.product_id.isnot(None),
            )
            .group_by(UserEvent.product_id)
            .order_by(func.count(UserEvent.id).desc())
            .limit(n)
        )
        ids = [r.product_id for r in rows.fetchall()]
        if ids:
            return ids, "collaborative_proxy"
    except Exception as exc:
        log.warning("collab_proxy error: %s", exc)

    return [], "collab_unavailable"


# ── Strategy 3: Subcategory Popular ──────────────────────────────────────────
async def subcategory_popular(
    product_id: int,
    subcategory: str,
    n: int = 10,
    db=None,
) -> tuple[list[int], str]:
    if db is None:
        return [], "subcategory_unavailable"
    try:
        from sqlalchemy import select
        from app.models import Product

        rows = await db.execute(
            select(Product.id)
            .where(
                Product.subcategory == subcategory,
                Product.id != product_id,
                Product.is_active == True,
            )
            .order_by(Product.rating.desc(), Product.review_count.desc())
            .limit(n)
        )
        ids = [r.id for r in rows.fetchall()]
        return ids, "subcategory_popular"
    except Exception as exc:
        log.warning("subcategory_popular error: %s", exc)
        return [], "subcategory_unavailable"


# ── Strategy 4: Top Rated Fallback ────────────────────────────────────────────
async def top_rated_fallback(
    exclude_ids: list[int] | None = None,
    n: int = 10,
    db=None,
) -> tuple[list[int], str]:
    if db is None:
        return [], "top_rated_unavailable"
    try:
        from sqlalchemy import select
        from app.models import Product

        stmt = (
            select(Product.id)
            .where(Product.is_active == True)
            .order_by(Product.rating.desc(), Product.review_count.desc())
            .limit(n + len(exclude_ids or []))
        )
        rows = await db.execute(stmt)
        ids = [r.id for r in rows.fetchall()]
        if exclude_ids:
            ids = [i for i in ids if i not in exclude_ids]
        return ids[:n], "top_rated_fallback"
    except Exception as exc:
        log.warning("top_rated_fallback error: %s", exc)
        return [], "fallback_unavailable"


# ── Composed: Get Recommendations for a Product ───────────────────────────────
async def get_recommendations_for_product(
    product_id: int,
    subcategory: Optional[str] = None,
    n: int = 8,
    db=None,
) -> tuple[list[int], str]:
    """
    Try strategies in order, return first non-empty result.
    """
    # 1. Vector similarity
    ids, strategy = await vector_similar(product_id, n)
    if ids:
        return ids, strategy

    # 2. Collaborative proxy
    ids, strategy = await collab_proxy(product_id, n, db)
    if ids:
        return ids, strategy

    # 3. Subcategory
    if subcategory:
        ids, strategy = await subcategory_popular(product_id, subcategory, n, db)
        if ids:
            return ids, strategy

    # 4. Top rated
    return await top_rated_fallback(exclude_ids=[product_id], n=n, db=db)


# ── Composed: Personalised For-You Feed ──────────────────────────────────────
async def get_personalised_feed(
    user_id: str,
    n: int = 12,
    db=None,
) -> tuple[list[int], str]:
    """
    Build a personalised feed by:
      1. Fetching user's recent interactions
      2. Gathering vector-similar products for each seed
      3. Deduplicating + ranking by diversity
    """
    if db is None:
        return [], "no_db"

    try:
        from sqlalchemy import select
        from app.models import UserEvent

        # Recent seed products
        rows = await db.execute(
            select(UserEvent.product_id)
            .where(
                UserEvent.user_id == user_id,
                UserEvent.event_type.in_(["view", "add_to_cart", "wishlist", "purchase"]),
                UserEvent.product_id.isnot(None),
            )
            .order_by(UserEvent.created_at.desc())
            .limit(10)
        )
        seed_ids = list({r.product_id for r in rows.fetchall()})

        if not seed_ids:
            return await top_rated_fallback(n=n, db=db)

        # Gather similar for top 5 seeds
        seen: set[int] = set(seed_ids)
        recs: list[int] = []

        for seed in seed_ids[:5]:
            similar, _ = await vector_similar(seed, n=n)
            for sid in similar:
                if sid not in seen:
                    recs.append(sid)
                    seen.add(sid)
            if len(recs) >= n:
                break

        recs = recs[:n]
        if recs:
            return recs, "content_based_personalised"

        # Fallback
        return await top_rated_fallback(exclude_ids=seed_ids, n=n, db=db)

    except Exception as exc:
        log.warning("personalised_feed error: %s", exc)
        return await top_rated_fallback(n=n, db=db)
