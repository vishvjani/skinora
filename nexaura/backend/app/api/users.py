import base64
import hashlib
import hmac
import json
import logging
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_optional_user, user_id_from_claims
from app.database import get_db
from app.models import Address, User
from app.schemas import AddressIn, AddressOut, MessageResponse, UserIn, UserOut, UserSyncIn

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["users"])

CLERK_WEBHOOK_SECRET = os.environ.get("CLERK_WEBHOOK_SECRET", "")


def _verify_svix_signature(secret: str, svix_id: str, svix_timestamp: str, body_bytes: bytes, signature: str) -> bool:
    """Verify Svix / Clerk webhook signature with HMAC-SHA256."""
    if not secret:
        # No secret configured — reject webhook rather than silently bypass in production
        log.warning("CLERK_WEBHOOK_SECRET is not configured; rejecting webhook request for security.")
        return False
    try:
        if secret.startswith("whsec_"):
            secret_bytes = base64.b64decode(secret[6:])
        else:
            secret_bytes = secret.encode("utf-8")

        to_sign = f"{svix_id}.{svix_timestamp}.".encode("utf-8") + body_bytes
        computed = base64.b64encode(hmac.new(secret_bytes, to_sign, hashlib.sha256).digest()).decode("utf-8")
        expected_v1 = f"v1,{computed}"

        passed = any(sig == expected_v1 or sig == computed for sig in signature.split(" "))
        return passed
    except Exception as e:
        log.warning(f"Svix signature check error: {e}")
        return False


# ── Direct User Sync (Called from Frontend upon Login / Signup) ───────────────
@router.post("/sync", response_model=UserOut)
async def sync_user(
    body: UserSyncIn,
    db: AsyncSession = Depends(get_db),
):
    """
    Syncs or creates a Clerk user in the PostgreSQL database.
    Ensures that every signed-in/signed-up user is safely persisted.
    """
    user = await db.get(User, body.id)
    if not user:
        # Check if a user exists with the same email (e.g. earlier demo or migration)
        if body.email:
            existing = (
                await db.execute(select(User).where(User.email == body.email))
            ).scalars().first()
            if existing:
                # Update existing user's ID to the new Clerk ID
                existing.id = body.id
                if body.full_name:
                    existing.full_name = body.full_name
                if body.avatar_url:
                    existing.avatar_url = body.avatar_url
                if body.phone:
                    existing.phone = body.phone
                await db.flush()
                return UserOut.model_validate(existing)

        user = User(
            id=body.id,
            email=body.email,
            full_name=body.full_name,
            avatar_url=body.avatar_url,
            phone=body.phone,
            eco_points=150,  # 150 Welcome bonus Eco-Points
            containers_recycled=0,
            co2_saved_kg=0.0,
        )
        db.add(user)
    else:
        if body.email is not None:
            user.email = body.email
        if body.full_name is not None:
            user.full_name = body.full_name
        if body.avatar_url is not None:
            user.avatar_url = body.avatar_url
        if body.phone is not None:
            user.phone = body.phone

    await db.flush()
    return UserOut.model_validate(user)


# ── Clerk Webhook Listener ───────────────────────────────────────────────────
@router.post("/webhook")
async def clerk_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    svix_id: Optional[str] = Header(None, alias="svix-id"),
    svix_timestamp: Optional[str] = Header(None, alias="svix-timestamp"),
    svix_signature: Optional[str] = Header(None, alias="svix-signature"),
):
    """
    Listens for Clerk webhooks (user.created, user.updated, user.deleted)
    and synchronizes them into PostgreSQL.
    """
    body_bytes = await request.body()

    if svix_signature:
        if not svix_id or not svix_timestamp:
            raise HTTPException(status_code=400, detail="Missing Svix verification headers")
        is_valid = _verify_svix_signature(
            CLERK_WEBHOOK_SECRET, svix_id, svix_timestamp, body_bytes, svix_signature
        )
        if not is_valid:
            log.warning("Invalid Clerk webhook Svix signature")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    elif CLERK_WEBHOOK_SECRET:
        # Secret is configured but no signature header — reject
        raise HTTPException(status_code=400, detail="Missing webhook signature headers")

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON")

    event_type = payload.get("type", "")
    data = payload.get("data", {})
    user_id = data.get("id")

    log.info(f"Received Clerk webhook event: {event_type} for user: {user_id}")

    if event_type in ("user.created", "user.updated") and user_id:
        # Extract primary email
        email = None
        emails = data.get("email_addresses", [])
        primary_id = data.get("primary_email_address_id")
        for em in emails:
            if em.get("id") == primary_id:
                email = em.get("email_address")
                break
        if not email and emails:
            email = emails[0].get("email_address")

        # Extract name
        first_name = data.get("first_name") or ""
        last_name = data.get("last_name") or ""
        full_name = f"{first_name} {last_name}".strip() or data.get("username")

        avatar_url = data.get("image_url") or data.get("profile_image_url")

        # Extract phone
        phone = None
        phone_nums = data.get("phone_numbers", [])
        if phone_nums:
            phone = phone_nums[0].get("phone_number")

        user = await db.get(User, user_id)
        if not user:
            # check email collision
            if email:
                existing = (
                    await db.execute(select(User).where(User.email == email))
                ).scalars().first()
                if existing:
                    existing.id = user_id
                    existing.full_name = full_name or existing.full_name
                    existing.avatar_url = avatar_url or existing.avatar_url
                    await db.flush()
                    return {"success": True, "event": event_type, "action": "updated_id"}

            user = User(
                id=user_id,
                email=email,
                full_name=full_name,
                avatar_url=avatar_url,
                phone=phone,
                eco_points=150,
            )
            db.add(user)
        else:
            if email:
                user.email = email
            if full_name:
                user.full_name = full_name
            if avatar_url:
                user.avatar_url = avatar_url
            if phone:
                user.phone = phone

        await db.flush()
        return {"success": True, "event": event_type, "action": "upserted"}

    elif event_type == "user.deleted" and user_id:
        user = await db.get(User, user_id)
        if user:
            await db.delete(user)
            await db.flush()
            return {"success": True, "event": event_type, "action": "deleted"}

    return {"success": True, "event": event_type, "action": "ignored"}


# ── Profile by ID ─────────────────────────────────────────────────────────────
@router.get("/profile/{user_id}", response_model=UserOut)
async def get_user_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found in database")
    return UserOut.model_validate(user)


# ── Profile ───────────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserOut)
async def get_me(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    user = await db.get(User, user_id)
    if not user:
        # auto-create from JWT claims
        user = User(
            id=user_id,
            email=claims.get("email"),
            full_name=claims.get("name") or claims.get("full_name"),
            avatar_url=claims.get("picture") or claims.get("image_url"),
            eco_points=150,
        )
        db.add(user)
        await db.flush()
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: UserIn,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.email is not None:
        user.email = body.email
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    if body.phone is not None:
        user.phone = body.phone

    await db.flush()
    return UserOut.model_validate(user)


# ── Addresses ─────────────────────────────────────────────────────────────────
@router.get("/me/addresses", response_model=list[AddressOut])
async def list_addresses(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    addrs = (
        await db.execute(
            select(Address)
            .where(Address.user_id == user_id)
            .order_by(Address.is_default.desc(), Address.created_at.desc())
        )
    ).scalars().all()
    return [AddressOut.model_validate(a) for a in addrs]


@router.post("/me/addresses", response_model=AddressOut, status_code=201)
async def add_address(
    body: AddressIn,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)

    # ensure user exists
    user = await db.get(User, user_id)
    if not user:
        user = User(id=user_id)
        db.add(user)
        await db.flush()

    # if marking as default, clear existing defaults
    if body.is_default:
        addrs = (
            await db.execute(select(Address).where(Address.user_id == user_id))
        ).scalars().all()
        for a in addrs:
            a.is_default = False

    addr = Address(
        user_id=user_id,
        label=body.label,
        line1=body.line1,
        line2=body.line2,
        city=body.city,
        state=body.state,
        pincode=body.pincode,
        is_default=body.is_default,
    )
    db.add(addr)
    await db.flush()
    await db.refresh(addr)
    return AddressOut.model_validate(addr)


@router.delete("/me/addresses/{address_id}", response_model=MessageResponse)
async def delete_address(
    address_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)
    addr = await db.get(Address, address_id)
    if not addr or addr.user_id != user_id:
        raise HTTPException(status_code=404, detail="Address not found")
    await db.delete(addr)
    return MessageResponse(message="Address deleted")
