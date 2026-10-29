"""
Clerk JWT verification middleware for FastAPI.

Every protected route uses `Depends(get_current_user)`.
The JWT is verified against Clerk's JWKS endpoint — no secret needed.
"""
from __future__ import annotations

import asyncio
import os
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

CLERK_JWKS_URL: str = os.environ.get(
    "CLERK_JWKS_URL",
    "https://emerging-feline-53.clerk.accounts.dev/.well-known/jwks.json",
)
CLERK_ISSUER: str = os.environ.get(
    "CLERK_ISSUER",
    "https://emerging-feline-53.clerk.accounts.dev",
)

bearer_scheme = HTTPBearer(auto_error=False)

# Module-level JWKS cache — avoids blocking the event loop on every request
_jwks_cache: Optional[dict] = None
_jwks_lock = asyncio.Lock()


async def _get_jwks() -> dict:
    """Fetch JWKS from Clerk asynchronously — cached for the process lifetime."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    async with _jwks_lock:
        # Double-check after acquiring the lock
        if _jwks_cache is not None:
            return _jwks_cache
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                CLERK_JWKS_URL,
                headers={"User-Agent": "Skinora-Backend/1.0"},
            )
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


async def _refresh_jwks() -> dict:
    """Force-refresh JWKS cache (handles key rotation)."""
    global _jwks_cache
    _jwks_cache = None
    return await _get_jwks()


async def _decode_token(token: str) -> dict:
    """
    Decode + verify a Clerk JWT.
    Tries cached JWKS first; on failure refreshes once (key rotation).
    """
    for attempt in range(2):
        jwks = await _get_jwks() if attempt == 0 else await _refresh_jwks()
        try:
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")
            # Find matching key
            key = next(
                (k for k in jwks.get("keys", []) if k.get("kid") == kid),
                None,
            )
            if key is None:
                if attempt == 0:
                    continue
                raise JWTError("No matching JWK found")

            options = {"verify_aud": False}
            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                options=options,
            )
            return claims
        except JWTError:
            if attempt == 1:
                raise
    raise JWTError("Failed to decode token")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency — extracts and verifies Clerk JWT.
    Returns the decoded claims dict (includes `sub` = Clerk user_id).
    Raises 401 if missing/invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = await _decode_token(credentials.credentials)
        return claims
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[dict]:
    """Like get_current_user but returns None for unauthenticated requests."""
    if credentials is None:
        return None
    try:
        return await _decode_token(credentials.credentials)
    except JWTError:
        return None


def user_id_from_claims(claims: dict) -> str:
    return claims.get("sub", "")
