"""
/api/pricing — dynamic price recommendation via ML engine
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import TTL_PRICING, cache_get, cache_set, key_pricing
from app.database import get_db
from app.models import CompetitorPrice, Product, UserEvent
from app.schemas import PricingRequest, PricingResponse

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pricing", tags=["pricing"])


async def _get_demand_score(product_id: int, db: AsyncSession) -> float:
    """
    Demand score = weighted event count over last 7 days, normalised to [0, 1].
    Weights: purchase=5, add_to_cart=3, wishlist=2, click=1, view=0.5
    """
    weights = {
        "purchase": 5, "add_to_cart": 3,
        "wishlist": 2, "click": 1, "view": 0.5,
    }
    stmt = (
        select(UserEvent.event_type, func.count(UserEvent.id).label("cnt"))
        .where(
            UserEvent.product_id == product_id,
            UserEvent.created_at > func.now() - text("interval '7 days'"),
        )
        .group_by(UserEvent.event_type)
    )
    try:
        rows = (await db.execute(stmt)).fetchall()
    except Exception:
        return 0.5   # fallback

    raw_score = sum(weights.get(r.event_type, 0) * r.cnt for r in rows)
    # normalise: cap at 100 weighted interactions → score 1.0
    return min(1.0, raw_score / 100)


async def _get_competitor_avg(product_id: int, db: AsyncSession) -> float | None:
    stmt = (
        select(func.avg(CompetitorPrice.competitor_price))
        .where(CompetitorPrice.product_id == product_id)
    )
    result = (await db.execute(stmt)).scalar_one_or_none()
    return float(result) if result else None


@router.get("/{product_id}", response_model=PricingResponse)
async def get_price_recommendation(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    cached = await cache_get(key_pricing(product_id))
    if cached:
        return cached

    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    base_price = float(product.price)
    demand = await _get_demand_score(product_id, db)
    comp_avg = await _get_competitor_avg(product_id, db)

    # Try ML engine first
    recommended = base_price
    reason = "base_price"

    try:
        from app.ml.pricing import get_pricing_engine
        engine = get_pricing_engine()
        if engine:
            rec = engine.predict(
                base_price=base_price,
                demand_score=demand,
                stock=product.stock or 0,
                competitor_avg=comp_avg,
                category=(product.category or "skincare").lower(),
                subcategory=product.subcategory or "general",
                mrp=float(product.mrp or base_price),
                discount_pct=float(product.discount_percent or 0),
                rating=float(product.rating or 3.5),
                review_count=int(product.review_count or 0),
            )
            recommended = rec["price"]
            reason = rec["reason"]
    except Exception as exc:
        log.warning("ML pricing failed (%s), using rule-based fallback", exc)
        recommended, reason = _rule_based(base_price, demand, product.stock or 0, comp_avg)

    # Safety guard: never go below 80% or above 130% of base
    recommended = max(base_price * 0.80, min(base_price * 1.30, recommended))
    recommended = round(recommended, -1)   # round to nearest 10

    result = {
        "product_id": product_id,
        "base_price": base_price,
        "recommended_price": recommended,
        "demand_score": round(demand, 3),
        "competitor_avg": comp_avg,
        "adjustment_reason": reason,
    }
    await cache_set(key_pricing(product_id), result, ttl=TTL_PRICING)
    return result


def _rule_based(
    base: float, demand: float, stock: int, comp_avg: float | None
) -> tuple[float, str]:
    price = base
    parts = []

    # demand adjustment: up to +15%
    if demand > 0.7:
        price *= 1.15
        parts.append("high_demand+15%")
    elif demand > 0.4:
        price *= 1.05
        parts.append("moderate_demand+5%")
    elif demand < 0.2:
        price *= 0.95
        parts.append("low_demand-5%")

    # stock scarcity
    if stock < 10:
        price *= 1.10
        parts.append("low_stock+10%")
    elif stock > 100:
        price *= 0.97
        parts.append("high_stock-3%")

    # competitor comparison
    if comp_avg:
        ratio = price / comp_avg
        if ratio > 1.1:
            price = comp_avg * 1.05
            parts.append("comp_align")
        elif ratio < 0.9:
            price = comp_avg * 0.98
            parts.append("comp_undercut")

    reason = "|".join(parts) if parts else "base_price"
    return round(price, 2), reason


@router.post("/predict", response_model=PricingResponse)
async def predict_price(
    body: PricingRequest,
    db: AsyncSession = Depends(get_db),
):
    """Predict dynamic price with optional override demand/competitor metrics via ML engine."""
    product = await db.get(Product, body.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    base_price = float(product.price)
    demand = body.demand_score if body.demand_score is not None else await _get_demand_score(body.product_id, db)
    comp_avg = body.competitor_avg if body.competitor_avg is not None else await _get_competitor_avg(body.product_id, db)

    recommended = base_price
    reason = "base_price"

    try:
        from app.ml.pricing import get_pricing_engine
        engine = get_pricing_engine()
        if engine:
            rec = engine.predict(
                base_price=base_price,
                demand_score=demand,
                stock=product.stock or 0,
                competitor_avg=comp_avg,
                category=(product.category or "skincare").lower(),
                subcategory=product.subcategory or "general",
                mrp=float(product.mrp or base_price),
                discount_pct=float(product.discount_percent or 0),
                rating=float(product.rating or 3.5),
                review_count=int(product.review_count or 0),
            )
            recommended = rec["price"]
            reason = rec["reason"]
    except Exception as exc:
        log.warning("ML pricing failed (%s), using rule-based fallback", exc)
        recommended, reason = _rule_based(base_price, demand, product.stock or 0, comp_avg)

    recommended = max(base_price * 0.80, min(base_price * 1.30, recommended))
    recommended = round(recommended, -1)

    return {
        "product_id": body.product_id,
        "base_price": base_price,
        "recommended_price": recommended,
        "demand_score": round(demand, 3),
        "competitor_avg": comp_avg,
        "adjustment_reason": reason,
    }


@router.post("/bulk", response_model=list[PricingResponse])
async def bulk_price_recommendations(
    body: PricingRequest,
    db: AsyncSession = Depends(get_db),
):
    """Single product pricing via POST body (for internal ML pipeline use)."""
    return [await get_price_recommendation(body.product_id, db)]

