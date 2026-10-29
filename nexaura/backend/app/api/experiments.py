"""
/api/ab-test — A/B test assignment + conversion tracking
"""
from __future__ import annotations

import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, user_id_from_claims
from app.database import get_db
from app.models import ABAssignment, ABConversion, ABTest
from app.schemas import ABAssignmentOut, ABConversionIn, MessageResponse

router = APIRouter(prefix="/api/ab-test", tags=["experiments"])


@router.get("/{experiment_name}/assign", response_model=ABAssignmentOut)
async def get_assignment(
    experiment_name: str,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    """Get or create variant assignment for a user in an experiment."""
    user_id = user_id_from_claims(claims)

    test = (
        await db.execute(
            select(ABTest).where(ABTest.name == experiment_name, ABTest.is_active == True)
        )
    ).scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Experiment not found or inactive")

    # check existing assignment
    existing = (
        await db.execute(
            select(ABAssignment).where(
                ABAssignment.user_id == user_id,
                ABAssignment.experiment_id == test.id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        return ABAssignmentOut(
            experiment_id=test.id,
            experiment_name=test.name,
            variant=existing.variant,
        )

    # deterministic assignment: hash(user_id + experiment_id) % 2
    seed_val = hash(f"{user_id}:{test.id}") % 2
    variant = test.variant_a if seed_val == 0 else test.variant_b

    assignment = ABAssignment(
        user_id=user_id,
        experiment_id=test.id,
        variant=variant,
    )
    db.add(assignment)
    await db.flush()

    return ABAssignmentOut(
        experiment_id=test.id,
        experiment_name=test.name,
        variant=variant,
    )


@router.post("/convert", response_model=MessageResponse)
async def record_conversion(
    body: ABConversionIn,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    user_id = user_id_from_claims(claims)

    assignment = (
        await db.execute(
            select(ABAssignment).where(
                ABAssignment.user_id == user_id,
                ABAssignment.experiment_id == body.experiment_id,
            )
        )
    ).scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="No assignment found for this experiment")

    conversion = ABConversion(
        assignment_id=assignment.id,
        conversion_type=body.conversion_type,
        conversion_meta=body.metadata,
    )
    db.add(conversion)
    return MessageResponse(message="Conversion recorded")


@router.get("", response_model=list[dict])
async def list_experiments(db: AsyncSession = Depends(get_db)):
    tests = (
        await db.execute(select(ABTest).where(ABTest.is_active == True))
    ).scalars().all()
    return [
        {
            "id": t.id, "name": t.name, "description": t.description,
            "variant_a": t.variant_a, "variant_b": t.variant_b,
        }
        for t in tests
    ]
