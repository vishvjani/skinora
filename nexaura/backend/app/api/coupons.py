"""
/api/coupons — validate + list active coupons
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Coupon
from app.schemas import CouponValidateIn, CouponValidateOut

router = APIRouter(prefix="/api/coupons", tags=["coupons"])


@router.post("/validate", response_model=CouponValidateOut)
async def validate_coupon(
    body: CouponValidateIn,
    db: AsyncSession = Depends(get_db),
):
    coupon = (
        await db.execute(
            select(Coupon).where(
                Coupon.code == body.code.upper().strip(),
                Coupon.is_active == True,
            )
        )
    ).scalar_one_or_none()

    if not coupon:
        return CouponValidateOut(valid=False, message="Coupon not found or inactive")

    if coupon.expires_at and coupon.expires_at < datetime.utcnow():
        return CouponValidateOut(valid=False, message="Coupon has expired")

    if coupon.used_count >= coupon.max_uses:
        return CouponValidateOut(valid=False, message="Coupon usage limit reached")

    if float(coupon.min_order_value) > body.order_total:
        return CouponValidateOut(
            valid=False,
            message=f"Minimum order ₹{coupon.min_order_value:.0f} required for this coupon",
        )

    # Account-locked fraud-proof check
    if getattr(coupon, "user_id", None) and coupon.user_id:
        if not body.user_id or body.user_id.strip() != coupon.user_id.strip():
            return CouponValidateOut(
                valid=False,
                message="This exclusive recycle discount coupon is locked to another user account.",
            )

    # Calculate discount
    if coupon.discount_type == "percent":
        amount = round(body.order_total * float(coupon.discount_value) / 100, 2)
    else:
        amount = min(float(coupon.discount_value), body.order_total)

    return CouponValidateOut(
        valid=True,
        discount_type=coupon.discount_type,
        discount_value=float(coupon.discount_value),
        discount_amount=amount,
        message=f"Coupon {coupon.code} applied! You save ₹{amount:.0f}",
    )


@router.get("", response_model=list[dict])
async def list_coupons(
    user_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — returns active public coupons + user's locked recycle coupons."""
    stmt = select(Coupon).where(Coupon.is_active == True)
    if user_id:
        from sqlalchemy import or_
        stmt = stmt.where(or_(Coupon.user_id.is_(None), Coupon.user_id == user_id))
    else:
        stmt = stmt.where(Coupon.user_id.is_(None))

    coupons = (await db.execute(stmt.order_by(Coupon.discount_value.desc()))).scalars().all()

    return [
        {
            "code": c.code,
            "discount_type": c.discount_type,
            "discount_value": float(c.discount_value),
            "min_order_value": float(c.min_order_value),
            "user_id": getattr(c, "user_id", None),
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
        }
        for c in coupons
    ]
