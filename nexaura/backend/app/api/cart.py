"""
/api/cart — add, update, remove, fetch cart (auth required)
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, user_id_from_claims
from app.database import get_db
from app.models import CartItem, Product, User
from app.schemas import CartItemIn, CartItemOut, CartResponse, MessageResponse

router = APIRouter(prefix="/api/cart", tags=["cart"])


async def _ensure_user(user_id: str, db: AsyncSession) -> None:
    """Create a user row if it doesn't exist (upsert on first access)."""
    user = await db.get(User, user_id)
    if not user:
        db.add(User(id=user_id))
        await db.flush()


def _to_card(p: Product) -> dict:
    return {
        "id": p.id, "name": p.name, "slug": p.slug,
        "brand": p.brand, "category": None, "subcategory": p.subcategory,
        "mrp": float(p.mrp), "price": float(p.price),
        "discount_percent": p.discount_percent or 0,
        "rating": float(p.rating or 0), "review_count": p.review_count or 0,
        "image_url": p.image_url, "stock": p.stock or 0,
        "tags": list(p.tags or []),
    }


@router.get("", response_model=CartResponse)
async def get_cart(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    stmt = (
        select(CartItem)
        .options(selectinload(CartItem.product))
        .where(CartItem.user_id == user_id)
    )
    items = (await db.execute(stmt)).scalars().all()

    subtotal = sum(
        float(item.product.price) * item.quantity
        for item in items
        if item.product
    )

    cart_items = [
        CartItemOut(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            product=_to_card(item.product) if item.product else None,
            added_at=item.added_at,
        )
        for item in items
    ]
    return CartResponse(items=cart_items, subtotal=subtotal, item_count=len(items))


@router.post("", response_model=CartItemOut, status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    body: CartItemIn,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    await _ensure_user(user_id, db)

    # verify product exists
    product = await db.get(Product, body.product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < body.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    # upsert
    existing = (
        await db.execute(
            select(CartItem).where(
                CartItem.user_id == user_id,
                CartItem.product_id == body.product_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.quantity = min(existing.quantity + body.quantity, 20)
        item = existing
    else:
        item = CartItem(
            user_id=user_id,
            product_id=body.product_id,
            quantity=body.quantity,
        )
        db.add(item)

    await db.flush()
    await db.refresh(item)

    return CartItemOut(
        id=item.id,
        product_id=item.product_id,
        quantity=item.quantity,
        product=_to_card(product),
        added_at=item.added_at,
    )


@router.put("/{item_id}", response_model=CartItemOut)
async def update_cart_item(
    item_id: uuid.UUID,
    body: CartItemIn,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    item = await db.get(CartItem, item_id)
    if not item or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Cart item not found")

    product = await db.get(Product, item.product_id)
    if product and product.stock < body.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    item.quantity = body.quantity
    await db.flush()

    return CartItemOut(
        id=item.id,
        product_id=item.product_id,
        quantity=item.quantity,
        product=_to_card(product) if product else None,
        added_at=item.added_at,
    )


@router.delete("/{item_id}", response_model=MessageResponse)
async def remove_from_cart(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    item = await db.get(CartItem, item_id)
    if not item or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Cart item not found")
    await db.delete(item)
    return MessageResponse(message="Removed from cart")


@router.delete("", response_model=MessageResponse)
async def clear_cart(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    await db.execute(delete(CartItem).where(CartItem.user_id == user_id))
    return MessageResponse(message="Cart cleared")
