"""
/api/analytics — dashboard stats (admin/internal)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Category, Order, OrderItem, Product, UserEvent
from app.schemas import AnalyticsSummary

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(db: AsyncSession = Depends(get_db)):
    total_products = (await db.execute(
        select(func.count(Product.id)).where(Product.is_active == True)
    )).scalar_one()

    total_orders = (await db.execute(
        select(func.count(Order.id))
    )).scalar_one()

    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.final_amount), 0))
        .where(Order.status.in_(["confirmed", "shipped", "delivered"]))
    )).scalar_one()

    # Top categories by order count
    cat_rows = (await db.execute(
        select(Product.category, func.count(OrderItem.id).label("cnt"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.category)
        .order_by(func.count(OrderItem.id).desc())
        .limit(6)
    )).fetchall()
    top_categories = [{"name": (r[0] or "Beauty").capitalize(), "count": r.cnt} for r in cat_rows]

    # Top brands by revenue
    brand_rows = (await db.execute(
        select(Product.brand, func.sum(OrderItem.total_price).label("rev"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.brand)
        .order_by(func.sum(OrderItem.total_price).desc())
        .limit(10)
    )).fetchall()
    top_brands = [{"brand": r.brand, "revenue": float(r.rev)} for r in brand_rows]

    # Recent events
    event_rows = (await db.execute(
        select(UserEvent.event_type, func.count(UserEvent.id).label("cnt"))
        .group_by(UserEvent.event_type)
        .order_by(func.count(UserEvent.id).desc())
    )).fetchall()
    recent_events = [{"event": r.event_type, "count": r.cnt} for r in event_rows]

    return AnalyticsSummary(
        total_products=total_products,
        total_orders=total_orders,
        total_revenue=float(total_revenue),
        top_categories=top_categories,
        top_brands=top_brands,
        recent_events=recent_events,
    )


@router.get("/trending-products")
async def trending_by_events(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """Products ranked by event engagement score (last 7 days)."""
    rows = (await db.execute(
        select(
            UserEvent.product_id,
            func.count(UserEvent.id).label("events"),
        )
        .where(
            UserEvent.product_id.isnot(None),
            UserEvent.created_at > func.now() - text("interval '7 days'"),
        )
        .group_by(UserEvent.product_id)
        .order_by(func.count(UserEvent.id).desc())
        .limit(limit)
    )).fetchall()

    pids = [r.product_id for r in rows]
    event_count = {r.product_id: r.events for r in rows}

    if not pids:
        return []

    products = (await db.execute(
        select(Product).where(Product.id.in_(pids))
    )).scalars().all()

    result = []
    for p in sorted(products, key=lambda x: event_count.get(x.id, 0), reverse=True):
        result.append({
            "id": p.id,
            "name": p.name,
            "brand": p.brand,
            "price": float(p.price),
            "rating": float(p.rating or 0),
            "image_url": p.image_url,
            "event_count": event_count.get(p.id, 0),
        })
    return result


@router.get("/wishlist")
async def get_analytics(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(
            UserEvent.product_id,
            func.count(UserEvent.id).label("wishlist_count"),
        )
        .where(
            UserEvent.event_type == "wishlist",
            UserEvent.product_id.isnot(None),
        )
        .group_by(UserEvent.product_id)
        .order_by(func.count(UserEvent.id).desc())
        .limit(20)
    )).fetchall()

    return [{"product_id": r.product_id, "wishlist_count": r.wishlist_count} for r in rows]
