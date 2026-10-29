"""
/api/wishlist — add, remove, list (auth required)
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, user_id_from_claims
from app.database import get_db
from app.models import Product, User, WishlistItem
from app.schemas import MessageResponse, WishlistItemOut

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])


async def _ensure_user(user_id: str, db: AsyncSession) -> None:
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


@router.get("", response_model=list[WishlistItemOut])
async def get_wishlist(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    stmt = (
        select(WishlistItem)
        .options(selectinload(WishlistItem.product))
        .where(WishlistItem.user_id == user_id)
        .order_by(WishlistItem.added_at.desc())
    )
    items = (await db.execute(stmt)).scalars().all()
    return [
        WishlistItemOut(
            id=i.id,
            product_id=i.product_id,
            product=_to_card(i.product) if i.product else None,
            added_at=i.added_at,
        )
        for i in items
    ]


@router.post("/{product_id}", response_model=WishlistItemOut, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    await _ensure_user(user_id, db)

    product = await db.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = (
        await db.execute(
            select(WishlistItem).where(
                WishlistItem.user_id == user_id,
                WishlistItem.product_id == product_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        return WishlistItemOut(
            id=existing.id,
            product_id=existing.product_id,
            product=_to_card(product),
            added_at=existing.added_at,
        )

    item = WishlistItem(user_id=user_id, product_id=product_id)
    db.add(item)
    await db.flush()
    await db.refresh(item)

    return WishlistItemOut(
        id=item.id,
        product_id=item.product_id,
        product=_to_card(product),
        added_at=item.added_at,
    )


@router.delete("/{product_id}", response_model=MessageResponse)
async def remove_from_wishlist(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    await db.execute(
        delete(WishlistItem).where(
            WishlistItem.user_id == user_id,
            WishlistItem.product_id == product_id,
        )
    )
    return MessageResponse(message="Removed from wishlist")
