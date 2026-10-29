"""
NEXAURA — FastAPI application entry point
"""
from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager

# Load .env before any other app imports so DATABASE_URL and other env vars are available
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    analytics_router, cart_router, consultations_router, coupons_router, events_router,
    experiments_router, orders_router, pricing_router, products_router,
    recommendations_router, recycle_router, search_router, skin_diagnostic_router,
    users_router, wishlist_router,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("🚀 NEXAURA backend starting…")

    # Verify / initialize database tables (including consultation_queries)
    try:
        from app.database import engine, Base
        import app.models  # load models
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        log.info("✅ Database tables verified/synced")
    except Exception as exc:
        log.warning("⚠️  Database table verification error: %s", exc)

    # Warm up ML embedding service (non-blocking)
    try:
        from app.ml.embeddings import get_embedding_service
        svc = await get_embedding_service()
        if svc:
            log.info("✅ Embedding service ready — ChromaDB + Sentence Transformers loaded")
        else:
            log.warning("⚠️  Embedding service not ready — semantic search disabled")
    except Exception as exc:
        log.warning("⚠️  Embedding service init failed: %s — semantic search disabled", exc)

    # Warm up pricing model
    try:
        from app.ml.pricing import get_pricing_engine
        engine = get_pricing_engine()
        if engine:
            log.info("✅ Pricing engine ready")
    except Exception as exc:
        log.warning("⚠️  Pricing engine init failed: %s — rule-based fallback active", exc)

    yield
    log.info("🛑 NEXAURA backend shutting down")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NEXAURA API",
    description="AI-powered cosmetics e-commerce backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]

# Allow any localhost, local LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x), and any Vercel deployment (*.vercel.app)
CORS_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|.*\.vercel\.app)(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Response-Time"] = f"{elapsed}ms"
    return response


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception on %s %s: %s", request.method, request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(products_router)
app.include_router(search_router)
app.include_router(recommendations_router)
app.include_router(cart_router)
app.include_router(wishlist_router)
app.include_router(orders_router)
app.include_router(events_router)
app.include_router(pricing_router)
app.include_router(coupons_router)
app.include_router(experiments_router)
app.include_router(analytics_router)
app.include_router(recycle_router)
app.include_router(users_router)
app.include_router(skin_diagnostic_router)
app.include_router(consultations_router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "nexaura-api"}


@app.get("/", tags=["health"])
async def root():
    return {
        "name": "NEXAURA API",
        "version": "1.0.0",
        "docs": "/docs",
    }
