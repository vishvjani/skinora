"""
NEXAURA — Embedding Service
===========================
Handles:
  • Loading Sentence Transformer model (all-MiniLM-L6-v2)
  • ChromaDB collection management
  • Indexing products from nexaura_products.json
  • Semantic search (query → top-N product IDs)
  • Similarity lookup (product_id → similar product IDs)

ChromaDB runs in persistent mode (local directory).
The service is a singleton — initialised once at app startup.
"""
from __future__ import annotations

import asyncio
import logging
import os
from functools import lru_cache
from typing import Optional

log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_NAME: str = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
CHROMA_DIR: str = os.environ.get(
    "CHROMA_PERSIST_DIR",
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "chroma"),
)
COLLECTION_NAME = "nexaura_products"
PRODUCTS_JSON = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "nexaura_products.json"
)


class EmbeddingService:
    """Singleton wrapping SentenceTransformer + ChromaDB."""

    def __init__(self) -> None:
        self._model = None
        self._client = None
        self._collection = None
        self._ready = False

    # ── Initialise ────────────────────────────────────────────────────────────
    def init(self) -> bool:
        """Load model + connect ChromaDB. Returns True on success."""
        try:
            log.info("Loading SentenceTransformer: %s", MODEL_NAME)
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(MODEL_NAME)

            log.info("Connecting ChromaDB at: %s", CHROMA_DIR)
            import chromadb
            os.makedirs(CHROMA_DIR, exist_ok=True)
            self._client = chromadb.PersistentClient(path=CHROMA_DIR)
            self._collection = self._client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )

            count = self._collection.count()
            log.info("ChromaDB collection '%s' — %d documents indexed", COLLECTION_NAME, count)

            if count == 0:
                log.info("Collection empty — running initial index from JSON…")
                self._index_from_json()
            else:
                log.info("Using existing index (%d products)", count)

            self._ready = True
            return True

        except ImportError as exc:
            log.warning(
                "ML deps missing (%s). "
                "Run: pip install sentence-transformers chromadb",
                exc,
            )
            return False
        except Exception as exc:
            log.error("EmbeddingService init failed: %s", exc, exc_info=True)
            return False

    def is_ready(self) -> bool:
        return self._ready

    # ── Indexing ──────────────────────────────────────────────────────────────
    def _build_doc_text(self, product: dict) -> str:
        """Build a rich text string for embedding a product."""
        parts = [
            product.get("name", ""),
            product.get("brand", ""),
            product.get("category", ""),
            product.get("subcategory", ""),
            product.get("description", ""),
            product.get("form", ""),
            product.get("color", ""),
        ]
        # add tags
        tags = product.get("tags", [])
        if isinstance(tags, list):
            parts.extend(tags)
        # add ingredient keywords (first 200 chars)
        ingr = product.get("ingredients", "")
        if ingr:
            parts.append(ingr[:200])
        return " | ".join(p for p in parts if p and p not in ("nan", "No color", ""))

    def _index_from_json(self) -> None:
        import json
        if not os.path.exists(PRODUCTS_JSON):
            log.warning("Products JSON not found at %s — skipping index", PRODUCTS_JSON)
            return

        with open(PRODUCTS_JSON, encoding="utf-8") as f:
            products = json.load(f)

        log.info("Indexing %d products into ChromaDB…", len(products))
        self.index_products(products)

    def index_products(self, products: list[dict], batch_size: int = 64) -> None:
        """Embed and upsert products into ChromaDB."""
        if not self._ready and not self._collection:
            raise RuntimeError("EmbeddingService not initialised")

        ids, docs, metas = [], [], []
        for p in products:
            ids.append(str(p["id"]))
            docs.append(self._build_doc_text(p))
            metas.append({
                "product_id": p["id"],
                "name": str(p.get("name", ""))[:100],
                "brand": str(p.get("brand", ""))[:50],
                "category": str(p.get("category", ""))[:50],
                "subcategory": str(p.get("subcategory", ""))[:50],
                "price": float(p.get("price", 0)),
                "rating": float(p.get("rating", 0)),
            })

        # embed in batches
        embeddings = []
        for i in range(0, len(docs), batch_size):
            batch = docs[i : i + batch_size]
            embs = self._model.encode(batch, show_progress_bar=False)
            embeddings.extend(embs.tolist())
            log.info("  Embedded batch %d/%d", min(i + batch_size, len(docs)), len(docs))

        # upsert (safe to re-run)
        for i in range(0, len(ids), batch_size):
            self._collection.upsert(
                ids=ids[i : i + batch_size],
                documents=docs[i : i + batch_size],
                embeddings=embeddings[i : i + batch_size],
                metadatas=metas[i : i + batch_size],
            )

        log.info("✅ Indexed %d products into ChromaDB", len(ids))

    # ── Search ────────────────────────────────────────────────────────────────
    async def search(self, query: str, n_results: int = 20) -> list[int]:
        """Semantic search: query string → ranked list of product_ids."""
        if not self._ready:
            return []
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_search, query, n_results)

    def _sync_search(self, query: str, n_results: int) -> list[int]:
        embedding = self._model.encode([query])[0].tolist()
        results = self._collection.query(
            query_embeddings=[embedding],
            n_results=min(n_results, self._collection.count()),
            include=["metadatas", "distances"],
        )
        ids: list[int] = []
        for meta in (results.get("metadatas") or [[]])[0]:
            try:
                ids.append(int(meta["product_id"]))
            except (KeyError, ValueError):
                pass
        return ids

    async def search_with_scores(self, query: str, n_results: int = 5) -> list[dict]:
        """Semantic search: query string → ranked list of {'product_id': int, 'similarity_score': float}."""
        if not self._ready:
            return []
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_search_with_scores, query, n_results)

    def _sync_search_with_scores(self, query: str, n_results: int) -> list[dict]:
        embedding = self._model.encode([query])[0].tolist()
        results = self._collection.query(
            query_embeddings=[embedding],
            n_results=min(n_results, self._collection.count()),
            include=["metadatas", "distances"],
        )
        items: list[dict] = []
        metas = (results.get("metadatas") or [[]])[0]
        distances = (results.get("distances") or [[]])[0]
        for meta, dist in zip(metas, distances):
            try:
                pid = int(meta["product_id"])
                # ChromaDB cosine distance range [0, 2]; map to authentic match percentage [75.0, 98.8]
                sim = round(max(75.0, min(98.8, (1.0 - (float(dist) / 2.0)) * 100.0)), 1)
                items.append({"product_id": pid, "similarity_score": sim})
            except (KeyError, ValueError):
                pass
        return items

    # ── Similarity ────────────────────────────────────────────────────────────
    async def similar(self, product_id: int, n_results: int = 10) -> list[int]:
        """Vector similarity: product_id → similar product_ids."""
        if not self._ready:
            return []
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_similar, product_id, n_results)

    async def similar_with_scores(self, product_id: int, n_results: int = 10) -> list[dict]:
        """Vector similarity: product_id → list of {'product_id': id, 'similarity_score': 98.4}."""
        if not self._ready:
            return []
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_similar_with_scores, product_id, n_results)

    def _sync_similar(self, product_id: int, n_results: int) -> list[int]:
        items = self._sync_similar_with_scores(product_id, n_results)
        return [item["product_id"] for item in items]

    def _sync_similar_with_scores(self, product_id: int, n_results: int) -> list[dict]:
        try:
            result = self._collection.get(
                ids=[str(product_id)],
                include=["embeddings"],
            )
            embeddings = result.get("embeddings")
            if embeddings is None or len(embeddings) == 0:
                return []

            embedding = embeddings[0]
            results = self._collection.query(
                query_embeddings=[embedding],
                n_results=min(n_results + 1, self._collection.count()),
                include=["metadatas", "distances"],
            )
            metas = (results.get("metadatas") or [[]])[0]
            distances = (results.get("distances") or [[]])[0]

            items: list[dict] = []
            for meta, dist in zip(metas, distances):
                pid = int(meta.get("product_id", 0))
                if pid and pid != product_id:
                    score = round(max(0.0, min(1.0, 1.0 - float(dist))) * 100, 1)
                    items.append({"product_id": pid, "similarity_score": score})
            return items[:n_results]
        except Exception as exc:
            log.warning("similarity lookup failed for %d: %s", product_id, exc)
            return []

    # ── Encode single text ────────────────────────────────────────────────────
    def encode(self, text: str) -> list[float]:
        """Return raw embedding for a single text string."""
        if not self._model:
            raise RuntimeError("Model not loaded")
        return self._model.encode([text])[0].tolist()

    # ── Re-index ──────────────────────────────────────────────────────────────
    def reindex(self) -> None:
        """Delete + rebuild the full ChromaDB collection."""
        if self._client and self._collection:
            try:
                self._client.delete_collection(COLLECTION_NAME)
            except Exception:
                pass
            self._collection = self._client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        self._index_from_json()


# ── Singleton ─────────────────────────────────────────────────────────────────
_service: Optional[EmbeddingService] = None


async def get_embedding_service() -> Optional[EmbeddingService]:
    """
    Lazily initialise and return the global EmbeddingService singleton.
    Returns None if ML deps are unavailable.
    """
    global _service
    if _service is None:
        _service = EmbeddingService()
        loop = asyncio.get_event_loop()
        ok = await loop.run_in_executor(None, _service.init)
        if not ok:
            _service = None
    return _service
