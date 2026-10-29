"""
Database connection — SQLAlchemy async engine + Neon PostgreSQL client.
"""
from __future__ import annotations

import os
from typing import AsyncGenerator

# Load .env early so DATABASE_URL is available regardless of how the app is started
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

RAW_DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "",
)

if not RAW_DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Please configure it in your .env file before starting the server."
    )

def format_async_database_url(url: str) -> str:
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if "sslmode=require" in url:
        url = url.replace("sslmode=require", "ssl=require")
    if "&channel_binding=require" in url:
        url = url.replace("&channel_binding=require", "")
    return url

DATABASE_URL = format_async_database_url(RAW_DATABASE_URL)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
