"""
/api/events — user event tracking (view, click, add_to_cart, purchase…)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_optional_user, user_id_from_claims
from app.database import get_db
from app.models import UserEvent
from app.schemas import EventIn, MessageResponse

router = APIRouter(prefix="/api/events", tags=["events"])

ALLOWED_EVENTS = {
    "view", "click", "search",
    "add_to_cart", "remove_from_cart",
    "wishlist", "purchase",
}


@router.post("", response_model=MessageResponse, status_code=201)
async def track_event(
    body: EventIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    claims: dict | None = Depends(get_optional_user),
):
    event_type = body.event_type.lower()
    if event_type not in ALLOWED_EVENTS:
        return MessageResponse(message="Unknown event type — ignored", success=False)

    user_id = user_id_from_claims(claims) if claims else None

    ev = UserEvent(
        user_id=user_id,
        product_id=body.product_id,
        event_type=event_type,
        session_id=body.session_id,
        event_meta={
            **body.metadata,
            "ip": request.client.host if request.client else None,
            "ua": request.headers.get("user-agent", "")[:200],
        },
    )
    db.add(ev)
    return MessageResponse(message="Event recorded")
