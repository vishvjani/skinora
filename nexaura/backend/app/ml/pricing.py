"""
NEXAURA — Dynamic Pricing Engine (trained on real product data)
================================================================
Features are derived from actual product attributes (price, rating,
review_count, stock, category, subcategory, discount_pct) plus live
demand signals and competitor ratio.

The XGBoost model is trained by:
    python run_ml_training.py   (workspace root)

Or inline via train_pricing_model() below.
"""
from __future__ import annotations

import logging
import math
import os
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "models", "pricing_model.json"
)

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

FEATURE_NAMES = [
    "log_price", "demand_score", "stock_norm", "competitor_ratio",
    "cat_enc", "subcat_enc", "discount_norm", "mrp_ratio",
    "rating_norm", "log_reviews", "is_premium", "is_budget",
    "hour_norm", "dow_norm", "is_evening", "is_weekend",
]


def build_features(
    base_price: float,
    demand_score: float,
    stock: int,
    competitor_avg: Optional[float],
    category: str = "skincare",
    subcategory: str = "general",
    mrp: float = 0.0,
    discount_pct: float = 0.0,
    rating: float = 3.5,
    review_count: int = 0,
) -> list[float]:
    """Return the 16-feature vector used by both training and inference."""
    now         = datetime.now()
    comp_ratio  = (competitor_avg / base_price) if competitor_avg and base_price else 1.0
    mrp_r       = (mrp / base_price) if base_price > 0 and mrp > 0 else 1.0
    stock_n     = min(1.0, stock / 200.0)
    cat_enc     = CATEGORY_ENC.get(category.lower(), 0) / 5.0
    subcat_enc  = SUBCATEGORY_ENC.get(subcategory.lower(), 0) / 37.0
    log_price   = math.log1p(base_price)
    log_reviews = math.log1p(review_count)
    discount_n  = min(discount_pct, 100) / 100.0
    rating_n    = (max(1.0, min(5.0, rating)) - 1) / 4.0
    is_premium  = 1.0 if base_price > 1500 else 0.0
    is_budget   = 1.0 if base_price < 300 else 0.0
    hour_n      = now.hour / 23.0
    dow_n       = now.weekday() / 6.0
    is_evening  = 1.0 if 17 <= now.hour <= 22 else 0.0
    is_weekend  = 1.0 if now.weekday() >= 5 else 0.0

    return [
        log_price, demand_score, stock_n, comp_ratio,
        cat_enc, subcat_enc, discount_n, mrp_r,
        rating_n, log_reviews, is_premium, is_budget,
        hour_n, dow_n, is_evening, is_weekend,
    ]


# ── Pricing Engine ────────────────────────────────────────────────────────────
class PricingEngine:
    def __init__(self, model) -> None:
        self._model = model

    def predict(
        self,
        base_price: float,
        demand_score: float,
        stock: int,
        competitor_avg: Optional[float] = None,
        category: str = "skincare",
        subcategory: str = "general",
        mrp: float = 0.0,
        discount_pct: float = 0.0,
        rating: float = 3.5,
        review_count: int = 0,
    ) -> dict:
        try:
            import xgboost as xgb
            import numpy as np

            feats = build_features(
                base_price, demand_score, stock, competitor_avg,
                category, subcategory, mrp, discount_pct, rating, review_count,
            )
            dmat = xgb.DMatrix(
                np.array([feats], dtype=np.float32),
                feature_names=FEATURE_NAMES,
            )
            multiplier = float(self._model.predict(dmat)[0])
            multiplier = max(0.80, min(1.30, multiplier))
            price      = round(base_price * multiplier, -1)   # nearest ₹10

            # Human-readable reason
            reasons = []
            if demand_score > 0.65:
                reasons.append("high_demand")
            elif demand_score < 0.25:
                reasons.append("low_demand")
            if stock < 15:
                reasons.append("low_stock")
            elif stock > 150:
                reasons.append("high_stock")
            if competitor_avg:
                ratio = competitor_avg / base_price
                if ratio > 1.10:
                    reasons.append("comp_price_higher")
                elif ratio < 0.90:
                    reasons.append("comp_price_lower")
            if rating >= 4.5 and review_count > 200:
                reasons.append("high_rated")
            if not reasons:
                reasons.append("stable_market")

            return {
                "price":      price,
                "multiplier": round(multiplier, 4),
                "reason":     "|".join(reasons),
            }
        except Exception as exc:
            log.warning("XGBoost predict failed: %s — rule-based fallback", exc)
            return _rule_based(base_price, demand_score, stock, competitor_avg)


def _rule_based(
    base: float,
    demand: float,
    stock: int,
    comp_avg: Optional[float],
) -> dict:
    """Used only when XGBoost is unavailable."""
    price = base
    parts = []
    if demand > 0.7:
        price *= 1.13; parts.append("high_demand")
    elif demand > 0.4:
        price *= 1.05; parts.append("moderate_demand")
    elif demand < 0.2:
        price *= 0.95; parts.append("low_demand")
    if stock < 10:
        price *= 1.10; parts.append("low_stock")
    elif stock > 150:
        price *= 0.97; parts.append("high_stock")
    if comp_avg:
        r = comp_avg / base
        if r > 1.1:
            price = min(price, comp_avg * 1.05); parts.append("comp_align")
        elif r < 0.9:
            price = max(price, comp_avg * 0.98); parts.append("comp_undercut")
    price = max(base * 0.80, min(base * 1.30, price))
    return {
        "price":      round(price, -1),
        "multiplier": round(price / base, 4),
        "reason":     "|".join(parts) or "stable_market",
    }


# ── Singleton ─────────────────────────────────────────────────────────────────
_engine: Optional[PricingEngine] = None


def get_pricing_engine() -> Optional[PricingEngine]:
    global _engine
    if _engine is not None:
        return _engine
    if not os.path.exists(MODEL_PATH):
        log.info("Pricing model not found — run: python run_ml_training.py")
        return None
    try:
        import xgboost as xgb
        model = xgb.Booster()
        model.load_model(MODEL_PATH)
        _engine = PricingEngine(model)
        log.info("✅ Pricing model loaded from %s", MODEL_PATH)
        return _engine
    except ImportError:
        log.warning("xgboost not installed")
        return None
    except Exception as exc:
        log.error("Failed to load pricing model: %s", exc)
        return None
