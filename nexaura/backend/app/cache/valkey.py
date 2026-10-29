"""
Valkey / Redis cache layer.
All cache helpers are async. Falls back gracefully if Valkey is unreachable.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional

import redis.asyncio as aioredis

log = logging.getLogger(__name__)

VALKEY_URL: str = os.environ.get("VALKEY_URL", "redis://localhost:6379/0")

# TTLs (seconds)
TTL_TRENDING     = 5 * 60       #  5 min
TTL_SEARCH       = 5 * 60       #  5 min
TTL_SIMILAR      = 10 * 60      # 10 min
TTL_CATEGORIES   = 60 * 60      #  1 hour
TTL_PRODUCT      = 15 * 60      # 15 min
TTL_PRICING      = 3 * 60       #  3 min
TTL_RECS         = 10 * 60      # 10 min

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> Optional[aioredis.Redis]:
    global _redis
    if _redis is None:
        try:
            _redis = aioredis.from_url(
                VALKEY_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            await _redis.ping()
            log.info("Valkey connected: %s", VALKEY_URL)
        except Exception as exc:
            log.warning("Valkey unavailable (%s) — caching disabled", exc)
            _redis = None
    return _redis


async def cache_get(key: str) -> Optional[Any]:
    r = await get_redis()
    if r is None:
        return None
    try:
        raw = await r.get(key)
        return json.loads(raw) if raw else None
    except Exception as exc:
        log.debug("cache_get error: %s", exc)
        return None


async def cache_set(key: str, value: Any, ttl: int = TTL_PRODUCT) -> None:
    r = await get_redis()
    if r is None:
        return
    try:
        await r.setex(key, ttl, json.dumps(value, default=str))
    except Exception as exc:
        log.debug("cache_set error: %s", exc)


async def cache_delete(key: str) -> None:
    r = await get_redis()
    if r is None:
        return
    try:
        await r.delete(key)
    except Exception as exc:
        log.debug("cache_delete error: %s", exc)


async def cache_delete_pattern(pattern: str) -> None:
    r = await get_redis()
    if r is None:
        return
    try:
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
    except Exception as exc:
        log.debug("cache_delete_pattern error: %s", exc)


# ── Key builders ──────────────────────────────────────────────────────────────
def key_product(product_id: int) -> str:
    return f"nexaura:product:{product_id}"

def key_products_list(page: int, page_size: int, category: str, sort: str) -> str:
    return f"nexaura:products:{category}:{sort}:{page}:{page_size}"

def key_search(query: str) -> str:
    import hashlib
    h = hashlib.md5(query.lower().strip().encode()).hexdigest()[:12]
    return f"nexaura:search:{h}"

def key_trending() -> str:
    return "nexaura:trending"

def key_similar(product_id: int) -> str:
    return f"nexaura:similar:{product_id}"

def key_recs(user_id: str) -> str:
    return f"nexaura:recs:{user_id}"

def key_categories() -> str:
    return "nexaura:categories"

def key_pricing(product_id: int) -> str:
    return f"nexaura:pricing:{product_id}"
