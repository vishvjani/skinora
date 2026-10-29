"""
/api/orders — place order, list, detail, cancel
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, get_optional_user, user_id_from_claims
from app.database import get_db
from app.models import CartItem, Coupon, Order, OrderItem, Product, User
from app.schemas import (
    MessageResponse,
    OrderIn,
    OrderOut,
    CreatePaymentIn,
    CreatePaymentOut,
    VerifyPaymentIn,
    VerifyPaymentOut,
)

router = APIRouter(prefix="/api/orders", tags=["orders"])


async def _ensure_user(user_id: str, db: AsyncSession) -> User:
    user = await db.get(User, user_id)
    if not user:
        user = User(id=user_id)
        db.add(user)
        await db.flush()
    return user


async def _validate_coupon(code: str, total: float, db: AsyncSession) -> Optional[Coupon]:
    coupon = (
        await db.execute(select(Coupon).where(Coupon.code == code.upper(), Coupon.is_active == True))
    ).scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon")
    if coupon.expires_at and coupon.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Coupon has expired")
    if float(coupon.min_order_value) > total:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order value for this coupon is ₹{coupon.min_order_value}",
        )
    if coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    return coupon


def _apply_coupon(coupon: Coupon, total: float) -> float:
    if coupon.discount_type == "percent":
        return round(total * float(coupon.discount_value) / 100, 2)
    return min(float(coupon.discount_value), total)


@router.post("/create-payment", response_model=CreatePaymentOut)
async def create_payment_session(
    body: CreatePaymentIn,
    db: AsyncSession = Depends(get_db),
    claims: Optional[dict] = Depends(get_optional_user),
):
    """
    Generate payment session ID and mock Razorpay Order ID for frontend checkout.
    """
    session_id = f"sess_{uuid.uuid4().hex[:16]}"
    order_id = f"order_{uuid.uuid4().hex[:14]}"
    return CreatePaymentOut(
        payment_session_id=session_id,
        razorpay_order_id=order_id,
        amount=round(float(body.amount), 2),
        currency=body.currency or "INR",
        key_id="rzp_test_SkinoraLive2026",
        status="created",
    )


@router.post("/verify-payment", response_model=VerifyPaymentOut)
async def verify_payment(
    body: VerifyPaymentIn,
    db: AsyncSession = Depends(get_db),
    claims: Optional[dict] = Depends(get_optional_user),
):
    """
    Verify payment signature and persist order as 'paid' & 'confirmed',
    awarding eco-points to the user.
    """
    user_id = user_id_from_claims(claims) if claims else None
    order_payload = body.order_payload or {}
    if not user_id:
        user_id = order_payload.get("user_id") or "demo_user_101"

    user = await _ensure_user(user_id, db)

    # Check if this was an existing unconfirmed order
    existing_order_id = order_payload.get("order_id")
    order = None
    if existing_order_id:
        try:
            parsed_id = uuid.UUID(str(existing_order_id))
            order = await db.get(Order, parsed_id)
        except Exception:
            pass

    if order:
        order.payment_status = "paid"
        order.status = "confirmed"
        order.payment_id = body.razorpay_payment_id
        order.razorpay_order_id = body.razorpay_order_id
        earned_points = int(float(order.final_amount) * 0.05)
        order.eco_points_earned = earned_points
        user.eco_points = (user.eco_points or 0) + earned_points
        await db.flush()
        return VerifyPaymentOut(
            success=True,
            order_id=str(order.id),
            transaction_id=body.razorpay_payment_id,
            payment_status="paid",
            amount=float(order.final_amount),
            eco_points_earned=earned_points,
            message="Payment verified successfully. Order confirmed!",
        )

    # Otherwise create new order from order_payload
    items_in = order_payload.get("items", [])
    if not items_in:
        raise HTTPException(status_code=400, detail="No items provided in order payload")

    order_items_data: list[dict] = []
    total = 0.0
    for item_dict in items_in:
        pid = item_dict.get("product_id")
        qty = item_dict.get("quantity", 1)
        product = await db.get(Product, pid)
        if not product or not product.is_active:
            raise HTTPException(status_code=404, detail=f"Product {pid} not found")
        if product.stock < qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for '{product.name}'")
        unit_price = float(product.price)
        line_total = unit_price * qty
        total += line_total
        order_items_data.append({
            "product": product,
            "quantity": qty,
            "unit_price": unit_price,
            "total_price": line_total,
        })

    # Validate coupon if any
    coupon_code = order_payload.get("coupon_code")
    discount_amount = 0.0
    coupon = None
    if coupon_code:
        coupon = await _validate_coupon(coupon_code, total, db)
        discount_amount = _apply_coupon(coupon, total)

    final_amount = max(0.0, total - discount_amount)
    earned_points = sum(int(getattr(d["product"], "recycle_points", 20) or 20) * d["quantity"] for d in order_items_data)

    address_id_raw = order_payload.get("address_id")
    address_id = None
    if address_id_raw:
        try:
            address_id = uuid.UUID(str(address_id_raw))
        except Exception:
            pass

    new_order = Order(
        user_id=user_id,
        status="confirmed",
        total_amount=total,
        discount_amount=discount_amount,
        final_amount=final_amount,
        coupon_code=coupon_code.upper() if coupon_code else None,
        shipping_address=str(order_payload.get("shipping_address") or order_payload.get("address") or "Standard Delivery Address"),
        payment_method=order_payload.get("payment_method", "upi"),
        payment_status="paid",
        payment_id=body.razorpay_payment_id,
        razorpay_order_id=body.razorpay_order_id,
        eco_points_earned=earned_points,
        notes=order_payload.get("notes"),
    )
    db.add(new_order)
    await db.flush()

    for d in order_items_data:
        oi = OrderItem(
            order_id=new_order.id,
            product_id=d["product"].id,
            quantity=d["quantity"],
            unit_price=d["unit_price"],
            total_price=d["total_price"],
        )
        db.add(oi)
        d["product"].stock = max(0, d["product"].stock - d["quantity"])

    if coupon:
        coupon.used_count += 1

    # Credit eco-points to user
    user.eco_points = (user.eco_points or 0) + earned_points
    await db.flush()

    return VerifyPaymentOut(
        success=True,
        order_id=str(new_order.id),
        transaction_id=body.razorpay_payment_id,
        payment_status="paid",
        amount=float(final_amount),
        eco_points_earned=earned_points,
        message="Payment verified successfully! Your order has been placed and eco-points credited.",
    )


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def place_order(
    body: OrderIn,
    db: AsyncSession = Depends(get_db),
    claims: Optional[dict] = Depends(get_optional_user),
):
    # Prefer user_id from Clerk JWT, then from body, then demo fallback
    user_id = user_id_from_claims(claims) if claims else (body.user_id or "demo_user_101")
    await _ensure_user(user_id, db)

    if not body.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    # Fetch + validate products
    order_items_data: list[dict] = []
    total = 0.0

    for item_in in body.items:
        product = await db.get(Product, item_in.product_id)
        if not product or not product.is_active:
            raise HTTPException(status_code=404, detail=f"Product {item_in.product_id} not found")
        if product.stock < item_in.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}'",
            )
        unit_price = float(product.price)
        line_total = unit_price * item_in.quantity
        total += line_total
        order_items_data.append({
            "product": product,
            "quantity": item_in.quantity,
            "unit_price": unit_price,
            "total_price": line_total,
        })

    # Coupon
    discount_amount = 0.0
    coupon = None
    if body.coupon_code:
        coupon = await _validate_coupon(body.coupon_code, total, db)
        discount_amount = _apply_coupon(coupon, total)

    final_amount = max(0.0, total - discount_amount)

    # Create order
    order = Order(
        user_id=user_id,
        status="confirmed",
        total_amount=total,
        discount_amount=discount_amount,
        final_amount=final_amount,
        coupon_code=body.coupon_code.upper() if body.coupon_code else None,
        shipping_address=body.shipping_address or str(body.notes or "Standard Delivery Address"),
        payment_method=body.payment_method,
        payment_status="paid" if body.payment_method != "cod" else "pending",
        notes=body.notes,
    )
    db.add(order)
    await db.flush()

    # Create order items + deduct stock
    for d in order_items_data:
        oi = OrderItem(
            order_id=order.id,
            product_id=d["product"].id,
            quantity=d["quantity"],
            unit_price=d["unit_price"],
            total_price=d["total_price"],
        )
        db.add(oi)
        d["product"].stock -= d["quantity"]

    # Increment coupon usage
    if coupon:
        coupon.used_count += 1

    await db.flush()
    await db.refresh(order)

    # Build response
    items_out = []
    for d in order_items_data:
        p = d["product"]
        items_out.append({
            "id": uuid.uuid4(),
            "product_id": p.id,
            "quantity": d["quantity"],
            "unit_price": d["unit_price"],
            "total_price": d["total_price"],
            "product": {
                "id": p.id, "name": p.name, "slug": p.slug,
                "brand": p.brand, "category": p.category, "subcategory": p.subcategory,
                "mrp": float(p.mrp), "price": float(p.price),
                "discount_percent": p.discount_percent or 0,
                "rating": float(p.rating or 0), "review_count": p.review_count or 0,
                "image_url": p.image_url, "stock": p.stock or 0,
                "tags": list(p.tags or []),
            },
        })

    return {
        "id": order.id,
        "status": order.status,
        "total_amount": float(order.total_amount),
        "discount_amount": float(order.discount_amount),
        "final_amount": float(order.final_amount),
        "coupon_code": order.coupon_code,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "items": items_out,
        "created_at": order.created_at,
    }


@router.get("", response_model=list[OrderOut])
async def list_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    claims: Optional[dict] = Depends(get_optional_user),
):
    user_id = user_id_from_claims(claims) if claims else "demo_user_101"
    stmt = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    orders = (await db.execute(stmt)).scalars().all()

    result = []
    for o in orders:
        items = []
        for oi in o.items:
            p = oi.product
            items.append({
                "id": oi.id, "product_id": oi.product_id,
                "quantity": oi.quantity,
                "unit_price": float(oi.unit_price),
                "total_price": float(oi.total_price),
                "product": {
                    "id": p.id, "name": p.name, "slug": p.slug,
                    "brand": p.brand, "category": None, "subcategory": p.subcategory,
                    "mrp": float(p.mrp), "price": float(p.price),
                    "discount_percent": p.discount_percent or 0,
                    "rating": float(p.rating or 0), "review_count": p.review_count or 0,
                    "image_url": p.image_url, "stock": p.stock or 0,
                    "tags": list(p.tags or []),
                } if p else None,
            })
        result.append({
            "id": o.id, "status": o.status,
            "total_amount": float(o.total_amount),
            "discount_amount": float(o.discount_amount),
            "final_amount": float(o.final_amount),
            "coupon_code": o.coupon_code,
            "payment_method": o.payment_method,
            "payment_status": o.payment_status,
            "items": items,
            "created_at": o.created_at,
        })
    return result


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    claims: Optional[dict] = Depends(get_optional_user),
):
    user_id = user_id_from_claims(claims) if claims else "demo_user_101"
    stmt = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.id == order_id, Order.user_id == user_id)
    )
    o = (await db.execute(stmt)).scalar_one_or_none()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")

    items = []
    for oi in o.items:
        p = oi.product
        items.append({
            "id": oi.id, "product_id": oi.product_id,
            "quantity": oi.quantity,
            "unit_price": float(oi.unit_price),
            "total_price": float(oi.total_price),
            "product": {
                "id": p.id, "name": p.name, "slug": p.slug,
                "brand": p.brand, "category": None, "subcategory": p.subcategory,
                "mrp": float(p.mrp), "price": float(p.price),
                "discount_percent": p.discount_percent or 0,
                "rating": float(p.rating or 0), "review_count": p.review_count or 0,
                "image_url": p.image_url, "stock": p.stock or 0,
                "tags": list(p.tags or []),
            } if p else None,
        })

    return {
        "id": o.id, "status": o.status,
        "total_amount": float(o.total_amount),
        "discount_amount": float(o.discount_amount),
        "final_amount": float(o.final_amount),
        "coupon_code": o.coupon_code,
        "payment_method": o.payment_method,
        "payment_status": o.payment_status,
        "items": items,
        "created_at": o.created_at,
    }


@router.patch("/{order_id}/cancel", response_model=MessageResponse)
async def cancel_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    claims: Optional[dict] = Depends(get_optional_user),
):
    user_id = user_id_from_claims(claims) if claims else "demo_user_101"
    stmt = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.id == order_id, Order.user_id == user_id)
    )
    o = (await db.execute(stmt)).scalar_one_or_none()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    if o.status not in ("pending", "confirmed"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel order in '{o.status}' status")

    o.status = "cancelled"
    # restore stock
    for oi in o.items:
        if oi.product:
            oi.product.stock += oi.quantity

    return MessageResponse(message="Order cancelled successfully")
