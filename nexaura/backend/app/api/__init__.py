from fastapi import APIRouter

from .analytics import router as analytics_router
from .cart import router as cart_router
from .coupons import router as coupons_router
from .events import router as events_router
from .experiments import router as experiments_router
from .orders import router as orders_router
from .pricing import router as pricing_router
from .products import router as products_router
from .recommendations import router as recommendations_router
from .search import router as search_router
from .users import router as users_router
from .wishlist import router as wishlist_router

from .recycle import router as recycle_router
from .skin_diagnostic import router as skin_diagnostic_router
from .consultations import router as consultations_router

__all__ = [
    "analytics_router", "cart_router", "consultations_router", "coupons_router", "events_router",
    "experiments_router", "orders_router", "pricing_router", "products_router",
    "recommendations_router", "recycle_router", "search_router", "skin_diagnostic_router", "users_router", "wishlist_router",
]

