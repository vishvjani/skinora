"""
/api/consultations & /api/admin — Skincare Consultation Inquiries & Admin Portal
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_optional_user, user_id_from_claims
from app.database import get_db
from app.models import ConsultationQuery
from app.schemas import (
    AdminLoginIn,
    AdminLoginOut,
    AdminStatsOut,
    ConsultationCreateIn,
    ConsultationOut,
    ConsultationUpdateIn,
    MessageResponse,
)

log = logging.getLogger(__name__)

router = APIRouter(tags=["consultations"])

# ── Admin Auth Secrets & Configuration ───────────────────────────────────────
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_JWT_SECRET = os.environ.get(
    "ADMIN_JWT_SECRET", "skinora_luxury_admin_jwt_secret_key_2026_secure"
)
ADMIN_JWT_ALGORITHM = "HS256"

if not ADMIN_PASSWORD:
    import warnings
    warnings.warn(
        "ADMIN_PASSWORD environment variable is not set. "
        "Admin login will be disabled until ADMIN_PASSWORD is configured in .env.",
        RuntimeWarning,
        stacklevel=1,
    )

admin_bearer_scheme = HTTPBearer(auto_error=False)


def create_admin_token() -> str:
    """Generate a signed JWT token valid for 7 days specifically for the Admin."""
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {
        "sub": ADMIN_USERNAME,
        "role": "admin",
        "iss": "skinora-admin",
        "exp": expire,
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm=ADMIN_JWT_ALGORITHM)


async def require_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(admin_bearer_scheme),
) -> dict:
    """
    Dependency that enforces strict administrator-only authorization.
    Regular users or invalid tokens receive HTTP 401/403.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required. Please log in with administrative credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = jwt.decode(
            credentials.credentials,
            ADMIN_JWT_SECRET,
            algorithms=[ADMIN_JWT_ALGORITHM],
        )
        if claims.get("role") != "admin" or claims.get("sub") != ADMIN_USERNAME:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Administrative privileges required.",
            )
        return claims
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired admin session token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Public / User Consultation Endpoints ─────────────────────────────────────
@router.post("/api/consultations", response_model=ConsultationOut, status_code=201)
async def submit_consultation_inquiry(
    body: ConsultationCreateIn,
    db: AsyncSession = Depends(get_db),
    clerk_user: Optional[dict] = Depends(get_optional_user),
):
    """
    Public endpoint for customers to submit a skincare query or consultation request.
    Stores all details in Neon PostgreSQL database.
    """
    user_id = body.user_id
    if not user_id and clerk_user:
        user_id = user_id_from_claims(clerk_user)

    query = ConsultationQuery(
        id=uuid.uuid4(),
        user_id=user_id,
        name=body.name.strip(),
        email=body.email.strip().lower(),
        phone=body.phone.strip() if body.phone else None,
        skin_type=body.skin_type,
        concern=body.concern,
        preferred_contact=body.preferred_contact,
        message=body.message.strip(),
        status="PENDING",
    )

    db.add(query)
    await db.flush()
    await db.refresh(query)
    log.info(f"New consultation query submitted: id={query.id} by {query.email}")
    return ConsultationOut.model_validate(query)


@router.get("/api/consultations/my", response_model=list[ConsultationOut])
async def get_my_consultations(
    db: AsyncSession = Depends(get_db),
    clerk_user: Optional[dict] = Depends(get_optional_user),
):
    """
    Allows signed-in customers to view their submitted consultation inquiries.
    """
    if not clerk_user:
        return []
    user_id = user_id_from_claims(clerk_user)
    if not user_id:
        return []

    stmt = (
        select(ConsultationQuery)
        .where(ConsultationQuery.user_id == user_id)
        .order_by(ConsultationQuery.created_at.desc())
    )
    result = await db.execute(stmt)
    inquiries = result.scalars().all()
    return [ConsultationOut.model_validate(q) for q in inquiries]


# ── Admin Portal Endpoints ───────────────────────────────────────────────────
@router.post("/api/admin/login", response_model=AdminLoginOut)
async def admin_login(body: AdminLoginIn):
    """
    Authenticates the administrator using admin / admin123 credentials.
    Rejects any non-matching user.
    """
    if not ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin portal is not configured. Set ADMIN_PASSWORD in environment variables.",
        )
    if body.username != ADMIN_USERNAME or body.password != ADMIN_PASSWORD:
        log.warning(f"Failed admin login attempt for username: '{body.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrative username or password.",
        )

    token = create_admin_token()
    log.info("Admin successfully logged into the Skinora Administrative Portal")
    return AdminLoginOut(
        access_token=token,
        token_type="bearer",
        role="admin",
        username=ADMIN_USERNAME,
    )


@router.get("/api/admin/consultations", response_model=list[ConsultationOut])
async def list_admin_consultations(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """
    Administrator endpoint: Lists all customer inquiries with filtering and search.
    """
    stmt = select(ConsultationQuery)

    if status_filter and status_filter.upper() != "ALL":
        stmt = stmt.where(ConsultationQuery.status == status_filter.upper())

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            (ConsultationQuery.name.ilike(term))
            | (ConsultationQuery.email.ilike(term))
            | (ConsultationQuery.phone.ilike(term))
            | (ConsultationQuery.message.ilike(term))
            | (ConsultationQuery.concern.ilike(term))
        )

    stmt = stmt.order_by(ConsultationQuery.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    inquiries = result.scalars().all()
    return [ConsultationOut.model_validate(q) for q in inquiries]


@router.get("/api/admin/consultations/{inquiry_id}", response_model=ConsultationOut)
async def get_admin_consultation_detail(
    inquiry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """
    Administrator endpoint: View detailed info for a single consultation query.
    """
    inquiry = await db.get(ConsultationQuery, inquiry_id)
    if not inquiry:
        raise HTTPException(status_code=404, detail="Consultation inquiry not found")
    return ConsultationOut.model_validate(inquiry)


@router.patch("/api/admin/consultations/{inquiry_id}", response_model=ConsultationOut)
async def update_admin_consultation(
    inquiry_id: uuid.UUID,
    body: ConsultationUpdateIn,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """
    Administrator endpoint: Update consultation status (PENDING, IN_REVIEW, CONTACTED, RESOLVED)
    and add resolution notes or advice.
    """
    inquiry = await db.get(ConsultationQuery, inquiry_id)
    if not inquiry:
        raise HTTPException(status_code=404, detail="Consultation inquiry not found")

    if body.status is not None:
        inquiry.status = body.status.upper()
    if body.admin_notes is not None:
        inquiry.admin_notes = body.admin_notes

    await db.flush()
    await db.refresh(inquiry)
    log.info(f"Admin updated inquiry {inquiry_id}: status={inquiry.status}")
    return ConsultationOut.model_validate(inquiry)


@router.delete("/api/admin/consultations/{inquiry_id}", response_model=MessageResponse)
async def delete_admin_consultation(
    inquiry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """
    Administrator endpoint: Delete a consultation query.
    """
    inquiry = await db.get(ConsultationQuery, inquiry_id)
    if not inquiry:
        raise HTTPException(status_code=404, detail="Consultation inquiry not found")

    await db.delete(inquiry)
    await db.flush()
    log.info(f"Admin deleted consultation inquiry {inquiry_id}")
    return MessageResponse(message="Consultation inquiry deleted successfully", success=True)


@router.get("/api/admin/stats", response_model=AdminStatsOut)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """
    Administrator endpoint: Aggregated inquiry metrics for the dashboard.
    """
    total = (await db.execute(select(func.count(ConsultationQuery.id)))).scalar_one() or 0
    pending = (
        await db.execute(
            select(func.count(ConsultationQuery.id)).where(
                ConsultationQuery.status == "PENDING"
            )
        )
    ).scalar_one() or 0
    in_review = (
        await db.execute(
            select(func.count(ConsultationQuery.id)).where(
                ConsultationQuery.status == "IN_REVIEW"
            )
        )
    ).scalar_one() or 0
    contacted = (
        await db.execute(
            select(func.count(ConsultationQuery.id)).where(
                ConsultationQuery.status == "CONTACTED"
            )
        )
    ).scalar_one() or 0
    resolved = (
        await db.execute(
            select(func.count(ConsultationQuery.id)).where(
                ConsultationQuery.status == "RESOLVED"
            )
        )
    ).scalar_one() or 0

    return AdminStatsOut(
        total_inquiries=total,
        pending_inquiries=pending,
        in_review_inquiries=in_review,
        contacted_inquiries=contacted,
        resolved_inquiries=resolved,
    )
