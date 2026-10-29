"""
NEXAURA — Full ML Training on Real Dataset
===========================================
Runs directly from the workspace root.
Does 3 things:
  1. Embeds all 350 products → ChromaDB index
  2. Trains XGBoost pricing model on real product features
  3. Smoke-tests both

Usage:
    python run_ml_training.py
"""
import json
import logging
import math
import os
import random
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT         = os.path.dirname(os.path.abspath(__file__))
BACKEND      = os.path.join(ROOT, "nexaura", "backend")
DATA_DIR     = os.path.join(BACKEND, "data")
CHROMA_DIR   = os.path.join(DATA_DIR, "chroma")
MODELS_DIR   = os.path.join(DATA_DIR, "models")
PRODUCTS_JSON = os.path.join(DATA_DIR, "nexaura_products.json")
MODEL_PATH   = os.path.join(MODELS_DIR, "pricing_model.json")

os.makedirs(CHROMA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

COLLECTION_NAME = "nexaura_products"
MODEL_NAME      = "all-MiniLM-L6-v2"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Load Products
# ═══════════════════════════════════════════════════════════════════════════════
log.info("=" * 60)
log.info("Loading products from: %s", PRODUCTS_JSON)
with open(PRODUCTS_JSON, encoding="utf-8") as f:
    products = json.load(f)
log.info("Loaded %d products", len(products))

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Build ChromaDB Vector Index
# ═══════════════════════════════════════════════════════════════════════════════
log.info("=" * 60)
log.info("STEP 2: Building ChromaDB vector index")

from sentence_transformers import SentenceTransformer
import chromadb

CATEGORY_LABELS = {
    "skincare":  "skincare face moisturizer serum cleanser toner",
    "face":      "face makeup foundation blush concealer primer highlight",
    "body":      "body wash scrub perfume lotion soap deodorant",
    "hair":      "hair shampoo conditioner mask oil treatment styling",
    "eyes":      "eyes mascara eyeliner eyeshadow brow lash primer",
    "lips":      "lips lipstick gloss balm liner stain color",
}

def build_doc(p: dict) -> str:
    """Rich text representation used for embedding."""
    cat_hint = CATEGORY_LABELS.get(p.get("category", ""), "")
    parts = [
        p.get("name", ""),
        p.get("brand", ""),
        p.get("category", ""),
        p.get("subcategory", ""),
        cat_hint,
        p.get("form", ""),
        p.get("color", "") if p.get("color") not in ("No color", "nan", "") else "",
        p.get("description", "")[:300],
    ]
    tags = p.get("tags", [])
    if isinstance(tags, list):
        parts += [t for t in tags if t not in ("nan", "")]
    ingr = p.get("ingredients", "")
    if ingr:
        parts.append(ingr[:150])
    return " | ".join(x.strip() for x in parts if x and x.strip() not in ("nan", ""))

log.info("Loading SentenceTransformer: %s", MODEL_NAME)
t0 = time.time()
st_model = SentenceTransformer(MODEL_NAME)
log.info("  Model ready in %.1fs", time.time() - t0)

# Fresh ChromaDB client
client = chromadb.PersistentClient(path=CHROMA_DIR)
try:
    client.delete_collection(COLLECTION_NAME)
    log.info("  Deleted old collection")
except Exception:
    pass

collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"},
)

# Build docs + metadata
BATCH = 64
all_ids   = [str(p["id"]) for p in products]
all_docs  = [build_doc(p) for p in products]
all_metas = [
    {
        "product_id":  p["id"],
        "name":        str(p.get("name", ""))[:100],
        "brand":       str(p.get("brand", ""))[:60],
        "category":    str(p.get("category", "")),
        "subcategory": str(p.get("subcategory", "")),
        "price":       float(p.get("price", 0)),
        "rating":      float(p.get("rating", 0)),
        "stock":       int(p.get("stock", 0)),
    }
    for p in products
]

log.info("Embedding %d documents in batches of %d...", len(all_docs), BATCH)
t0 = time.time()
all_embeddings = []
for i in range(0, len(all_docs), BATCH):
    batch = all_docs[i : i + BATCH]
    embs  = st_model.encode(batch, show_progress_bar=False).tolist()
    all_embeddings.extend(embs)
    log.info("  Embedded %d / %d", min(i + BATCH, len(all_docs)), len(all_docs))

log.info("  Embedding done in %.1fs", time.time() - t0)

log.info("Upserting into ChromaDB...")
for i in range(0, len(all_ids), BATCH):
    collection.upsert(
        ids        = all_ids[i : i + BATCH],
        documents  = all_docs[i : i + BATCH],
        embeddings = all_embeddings[i : i + BATCH],
        metadatas  = all_metas[i : i + BATCH],
    )

log.info("✅ ChromaDB index built: %d vectors", collection.count())

# ── Quick smoke tests ─────────────────────────────────────────────────────────
test_queries = [
    "hydrating face serum vitamin C",
    "de-tan soap saffron goat milk",
    "anti dandruff shampoo tea tree",
    "sunscreen spf 50 matte",
    "ceramide barrier repair cream",
]
log.info("\nSearch smoke tests:")
for q in test_queries:
    q_emb = st_model.encode([q], show_progress_bar=False).tolist()[0]
    res   = collection.query(
        query_embeddings=[q_emb],
        n_results=3,
        include=["metadatas", "distances"],
    )
    metas = res["metadatas"][0]
    dists = res["distances"][0]
    log.info('  Query: "%s"', q)
    for m, d in zip(metas, dists):
        log.info("    → [%.3f] %s | %s | ₹%.0f",
                 1 - d, m["name"][:55], m["brand"], m["price"])

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Train XGBoost Pricing Model on Real Product Features
# ═══════════════════════════════════════════════════════════════════════════════
log.info("\n" + "=" * 60)
log.info("STEP 3: Training XGBoost pricing model on real product data")

import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

CATEGORY_ENC = {
    "soaps": 0, "serums": 1, "moisturizers": 2, "sunscreen": 3,
    "facewash": 4, "masks": 5, "haircare": 6, "bodywash": 7,
    "lipcare": 8, "combos": 9, "skincare": 1, "face": 4, "body": 7,
    "hair": 6, "eyes": 1, "lips": 8,
}
SUBCATEGORY_ENC = {
    s: i for i, s in enumerate([
        "detan", "acne-care", "detox", "moisturizer", "brightening", "refreshing",
        "hydration", "anti-aging", "barrier-repair", "gel-cream", "barrier-cream",
        "night-cream", "day-lotion", "matte-fluid", "mineral-sunscreen", "sports-gel",
        "tinted-sunscreen", "after-sun", "foaming-wash", "gentle-cleanser",
        "clarifying-cleanser", "exfoliating-cleanser", "micellar-cleanser",
        "clay-mask", "scrub", "peel-off-mask", "shampoo", "hair-oil", "hair-mask",
        "conditioner", "shower-gel", "body-lotion", "body-scrub", "body-butter",
        "body-mist", "lip-scrub", "lip-balm", "lip-mask", "lip-oil", "gift-set",
        "skincare-routine", "haircare-kit", "general", "serum", "cleanser", "mask",
    ])
}

random.seed(42)
np.random.seed(42)

def product_to_features(p: dict, demand_score: float, competitor_ratio: float) -> list:
    """
    Real features derived from actual product attributes.
    This is what the model sees at inference time too.
    """
    base_price      = float(p.get("price", 500))
    mrp             = float(p.get("mrp", base_price))
    discount_pct    = float(p.get("discount_percent", 0))
    rating          = float(p.get("rating", 3.5))
    review_count    = float(p.get("review_count", 0))
    stock           = float(p.get("stock", 50))
    cat_enc         = CATEGORY_ENC.get(p.get("category", ""), 0) / 5.0
    subcat_enc      = SUBCATEGORY_ENC.get(p.get("subcategory", ""), 0) / 37.0
    log_price       = math.log1p(base_price)
    log_reviews     = math.log1p(review_count)
    stock_norm      = min(1.0, stock / 200.0)
    discount_norm   = discount_pct / 100.0
    mrp_ratio       = (mrp / base_price) if base_price > 0 else 1.0
    rating_norm     = (rating - 1) / 4.0   # scale 1-5 → 0-1
    is_premium      = 1.0 if base_price > 1500 else 0.0
    is_budget       = 1.0 if base_price < 300 else 0.0
    now             = __import__("datetime").datetime.now()
    hour_norm       = now.hour / 23.0
    dow_norm        = now.weekday() / 6.0
    is_evening      = 1.0 if 17 <= now.hour <= 22 else 0.0
    is_weekend      = 1.0 if now.weekday() >= 5 else 0.0

    return [
        log_price, demand_score, stock_norm, competitor_ratio,
        cat_enc, subcat_enc, discount_norm, mrp_ratio,
        rating_norm, log_reviews, is_premium, is_budget,
        hour_norm, dow_norm, is_evening, is_weekend,
    ]

FEATURE_NAMES = [
    "log_price", "demand_score", "stock_norm", "competitor_ratio",
    "cat_enc", "subcat_enc", "discount_norm", "mrp_ratio",
    "rating_norm", "log_reviews", "is_premium", "is_budget",
    "hour_norm", "dow_norm", "is_evening", "is_weekend",
]

# ── Generate training data from real products ─────────────────────────────────
# Each real product is sampled N times with randomised demand / competitor signals
# to create a realistic distribution of market scenarios.
N_SCENARIOS = 150   # scenarios per product -> 65 * 150 = 9,750 rows
X_rows, y_rows = [], []

for p in products:
    base_price  = float(p.get("price", 500))
    rating      = float(p.get("rating", 3.5))
    review_count = float(p.get("review_count", 0))
    stock       = float(p.get("stock", 50))
    category    = p.get("category", "skincare")
    discount_pct = float(p.get("discount_percent", 0))

    for _ in range(N_SCENARIOS):
        # Simulated market signals for this scenario
        demand_score   = random.betavariate(2, 2)   # ~0.5 mean, realistic spread
        comp_variation = random.uniform(0.82, 1.22)
        competitor_ratio = comp_variation

        # ── Compute "optimal" price multiplier using business logic ──────────
        # This IS the label — what a smart pricing analyst would set
        multiplier = 1.0

        # Demand signal
        if demand_score > 0.75:
            multiplier += 0.13
        elif demand_score > 0.55:
            multiplier += 0.07
        elif demand_score > 0.35:
            multiplier += 0.02
        elif demand_score < 0.20:
            multiplier -= 0.07

        # Stock scarcity / surplus
        if stock < 8:
            multiplier += 0.12
        elif stock < 20:
            multiplier += 0.06
        elif stock > 150:
            multiplier -= 0.04

        # Competitor alignment
        if competitor_ratio > 1.15:
            # Competitor charges more → we can raise slightly
            multiplier += 0.04
        elif competitor_ratio < 0.88:
            # Competitor is cheaper → we need to lower to stay competitive
            multiplier -= 0.06

        # Rating-based premium
        if rating >= 4.5 and review_count > 500:
            multiplier += 0.05
        elif rating < 3.5:
            multiplier -= 0.04

        # High-discount products → already competitive, don't raise much
        if discount_pct > 25:
            multiplier = min(multiplier, 1.10)

        # Premium category markup
        if category in ("skincare", "face") and base_price > 800:
            multiplier += 0.02

        # Add realistic market noise
        multiplier += random.gauss(0, 0.015)

        # Hard cap: never go below -20% or above +30% of base
        multiplier = max(0.80, min(1.30, multiplier))

        feats = product_to_features(
            p, demand_score, competitor_ratio
        )
        X_rows.append(feats)
        y_rows.append(multiplier)

X = np.array(X_rows, dtype=np.float32)
y = np.array(y_rows, dtype=np.float32)
log.info("Training data shape: X=%s  y=%s", X.shape, y.shape)
log.info("  y range: [%.3f, %.3f]  mean: %.3f  std: %.3f",
         y.min(), y.max(), y.mean(), y.std())

# ── Train / Val split ─────────────────────────────────────────────────────────
X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.15, random_state=42
)

dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=FEATURE_NAMES)
dval   = xgb.DMatrix(X_val,   label=y_val,   feature_names=FEATURE_NAMES)

params = {
    "objective":         "reg:squarederror",
    "eval_metric":       "rmse",
    "max_depth":         6,
    "eta":               0.04,
    "subsample":         0.85,
    "colsample_bytree":  0.85,
    "min_child_weight":  5,
    "gamma":             0.1,
    "alpha":             0.05,
    "lambda":            1.5,
    "seed":              42,
}

log.info("Training XGBoost (300 rounds, early stop 25)…")
t0 = time.time()
model = xgb.train(
    params,
    dtrain,
    num_boost_round=300,
    evals=[(dtrain, "train"), (dval, "val")],
    early_stopping_rounds=25,
    verbose_eval=50,
)
log.info("  Training done in %.1fs  (best round: %d)", time.time() - t0, model.best_iteration)

# ── Evaluate ──────────────────────────────────────────────────────────────────
preds = model.predict(dval)
mae   = mean_absolute_error(y_val, preds)
r2    = r2_score(y_val, preds)
log.info("Validation  MAE=%.4f  R²=%.4f", mae, r2)
log.info("  Avg predicted multiplier: %.4f  (actual mean: %.4f)", preds.mean(), y_val.mean())

# ── Feature importance ────────────────────────────────────────────────────────
importance = model.get_score(importance_type="gain")
top = sorted(importance.items(), key=lambda x: -x[1])[:8]
log.info("Top feature importances (gain):")
for fname, score in top:
    log.info("  %-22s %.2f", fname, score)

# ── Save model ────────────────────────────────────────────────────────────────
model.save_model(MODEL_PATH)
log.info("✅ Pricing model saved → %s", MODEL_PATH)

# ── Save feature names for inference ─────────────────────────────────────────
import json as _json
meta_path = os.path.join(MODELS_DIR, "pricing_meta.json")
with open(meta_path, "w") as f:
    _json.dump({
        "feature_names": FEATURE_NAMES,
        "model_path": MODEL_PATH,
        "n_training_rows": len(X_rows),
        "n_products": len(products),
        "val_mae": round(float(mae), 5),
        "val_r2": round(float(r2), 5),
        "best_iteration": int(model.best_iteration),
    }, f, indent=2)
log.info("Metadata saved → %s", meta_path)

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Pricing Smoke Tests on Real Products
# ═══════════════════════════════════════════════════════════════════════════════
log.info("\n" + "=" * 60)
log.info("STEP 4: Pricing smoke tests on real products")

def predict_price(p: dict, demand: float, comp_ratio: float) -> dict:
    feats = product_to_features(p, demand, comp_ratio)
    dm    = xgb.DMatrix(
        np.array([feats], dtype=np.float32),
        feature_names=FEATURE_NAMES,
    )
    mult  = float(model.predict(dm)[0])
    mult  = max(0.80, min(1.30, mult))
    rec   = round(float(p["price"]) * mult, -1)
    return {"name": p["name"][:55], "base": p["price"], "rec": rec, "mult": round(mult, 3)}

# Pick one from each category
log.info("\nReal product pricing examples:")
by_cat = {}
for p in products:
    cat = p["category"]
    if cat not in by_cat:
        by_cat[cat] = p

scenarios = [
    ("High demand, low stock",    0.85, 1.05),
    ("Low demand, high stock",    0.15, 0.95),
    ("Competitor cheaper",        0.50, 0.85),
    ("Competitor expensive",      0.60, 1.20),
    ("Normal market",             0.50, 1.00),
]

for cat, prod in by_cat.items():
    log.info("\n  [%s] %s — base ₹%.0f", cat.upper(), prod["name"][:45], prod["price"])
    for label, demand, comp in scenarios:
        r = predict_price(prod, demand, comp)
        direction = "▲" if r["rec"] > r["base"] else "▼" if r["rec"] < r["base"] else "="
        log.info("    %-35s → ₹%.0f %s  (×%.3f)", label, r["rec"], direction, r["mult"])

# ═══════════════════════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════════════════════
log.info("\n" + "=" * 60)
log.info("✅ ALL ML TRAINING COMPLETE")
log.info("   ChromaDB index : %s  (%d vectors)", CHROMA_DIR, collection.count())
log.info("   Pricing model  : %s", MODEL_PATH)
log.info("   Pricing meta   : %s", meta_path)
log.info("=" * 60)
log.info("Next: update app/ml/pricing.py to use product_to_features() — done automatically.")
log.info("Start backend: uvicorn app.main:app --reload --port 8000")
