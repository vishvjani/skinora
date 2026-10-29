"""Pydantic v2 schemas — request/response validation."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── Category ──────────────────────────────────────────────────────────────────
class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None


# ── Product ───────────────────────────────────────────────────────────────────
class ProductCard(BaseModel):
    """Lightweight representation for listing pages."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    brand: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    mrp: float
    price: float
    discount_percent: int = 0
    rating: float = 0.0
    review_count: int = 0
    stock: int = 0
    image_url: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    batch_number: Optional[str] = None
    container_type: Optional[str] = None
    recycle_points: Optional[int] = 30
    similarity_score: Optional[float] = None

    @field_validator("tags", mode="before")
    @classmethod
    def coerce_tags(cls, v):
        if v is None:
            return []
        return list(v)


class ProductDetail(ProductCard):
    """Full product for PDP."""
    description: Optional[str] = None
    ingredients: Optional[str] = None
    secondary_image: Optional[str] = None
    form: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    mfg_date: Optional[str] = None
    exp_date: Optional[str] = None
    raw_materials: Optional[Any] = None
    quality_tests: Optional[Any] = None
    factory_location: Optional[str] = None
    certifications: Optional[Union[str, list[str]]] = None
    created_at: Optional[datetime] = None


class BatchVerificationResponse(BaseModel):
    verified: bool = True
    product_id: int
    product_name: str
    product_slug: str
    brand: str
    category: str
    batch_number: str
    mfg_date: str
    exp_date: str
    status: str = "GENUINE & LAB CERTIFIED"
    factory_location: str
    certifications: Union[str, list[str]] = Field(default_factory=list)
    raw_materials: list[Any] = Field(default_factory=list)
    quality_tests: list[Any] = Field(default_factory=list)
    qa_inspector: str = "Dr. Ananya Mukherjee, Head of Quality & Formulation"
    lab_certificate_no: str = "NABL-SKN-QC-2026-08492"
    image_url: Optional[str] = None
    verification_timestamp: str


class ProductListResponse(BaseModel):
    products: list[ProductCard]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Cart ──────────────────────────────────────────────────────────────────────
class CartItemIn(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=20)


class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: int
    quantity: int
    product: Optional[ProductCard] = None
    added_at: Optional[datetime] = None


class CartResponse(BaseModel):
    items: list[CartItemOut]
    subtotal: float
    item_count: int


# ── Wishlist ──────────────────────────────────────────────────────────────────
class WishlistItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: int
    product: Optional[ProductCard] = None
    added_at: Optional[datetime] = None


# ── Order ─────────────────────────────────────────────────────────────────────
class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=20)


class OrderIn(BaseModel):
    items: list[OrderItemIn]
    address_id: Optional[uuid.UUID] = None
    coupon_code: Optional[str] = None
    payment_method: str = "cod"
    notes: Optional[str] = None
    # Allow frontend to pass user_id and shipping info directly
    user_id: Optional[str] = None
    shipping_address: Optional[str] = None
    final_amount: Optional[float] = None


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: int
    quantity: int
    unit_price: float
    total_price: float
    product: Optional[ProductCard] = None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    total_amount: float
    discount_amount: float
    final_amount: float
    coupon_code: Optional[str] = None
    payment_method: Optional[str] = None
    payment_status: str
    items: list[OrderItemOut] = Field(default_factory=list)
    created_at: Optional[datetime] = None


# ── User ──────────────────────────────────────────────────────────────────────
class UserIn(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None


class UserSyncIn(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    eco_points: Optional[int] = 150
    containers_recycled: Optional[int] = 0
    co2_saved_kg: Optional[float] = 0.0
    created_at: Optional[datetime] = None


# ── Address ───────────────────────────────────────────────────────────────────
class AddressIn(BaseModel):
    label: str = "Home"
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str = Field(pattern=r"^\d{6}$")
    is_default: bool = False


class AddressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    is_default: bool


# ── Events ────────────────────────────────────────────────────────────────────
class EventIn(BaseModel):
    product_id: Optional[int] = None
    event_type: str
    session_id: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


# ── Search ────────────────────────────────────────────────────────────────────
class SearchResponse(BaseModel):
    products: list[ProductCard]
    total: int
    query: str
    search_type: str = "semantic"


# ── Coupon ────────────────────────────────────────────────────────────────────
class CouponValidateIn(BaseModel):
    code: str
    order_total: float
    user_id: Optional[str] = None


class CouponValidateOut(BaseModel):
    valid: bool
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_amount: Optional[float] = None
    free_shipping: bool = False
    message: str


# ── Payment Gateway ───────────────────────────────────────────────────────────
class CreatePaymentIn(BaseModel):
    order_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    user_id: Optional[str] = "demo_user_101"
    customer_name: Optional[str] = "Priya Sharma"
    customer_email: Optional[str] = "priya.sharma@example.com"
    customer_phone: Optional[str] = "9876543210"


class CreatePaymentOut(BaseModel):
    payment_session_id: str
    razorpay_order_id: str
    amount: float
    currency: str
    key_id: str
    status: str = "created"


class VerifyPaymentIn(BaseModel):
    payment_session_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    order_payload: Optional[dict[str, Any]] = None


class VerifyPaymentOut(BaseModel):
    success: bool
    order_id: str
    transaction_id: str
    payment_status: str
    amount: float
    eco_points_earned: int
    message: str


# ── Recommendations ───────────────────────────────────────────────────────────
class RecommendationResponse(BaseModel):
    products: list[ProductCard]
    strategy: str


# ── Pricing ───────────────────────────────────────────────────────────────────
class PricingRequest(BaseModel):
    product_id: int
    demand_score: Optional[float] = None
    competitor_avg: Optional[float] = None


class PricingResponse(BaseModel):
    product_id: int
    base_price: float
    recommended_price: float
    demand_score: float
    competitor_avg: Optional[float] = None
    adjustment_reason: str


# ── A/B ───────────────────────────────────────────────────────────────────────
class ABAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    experiment_id: int
    experiment_name: str
    variant: str


class ABConversionIn(BaseModel):
    experiment_id: int
    conversion_type: str
    metadata: dict[str, Any] = Field(default_factory=dict)


# ── Analytics ─────────────────────────────────────────────────────────────────
class AnalyticsSummary(BaseModel):
    total_products: int
    total_orders: int
    total_revenue: float
    top_categories: list[dict]
    top_brands: list[dict]
    recent_events: list[dict]


# ── Generic ───────────────────────────────────────────────────────────────────
class MessageResponse(BaseModel):
    message: str
    success: bool = True


# ── Consultation & Inquiries ──────────────────────────────────────────────────
class ConsultationCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=5, max_length=255)
    phone: Optional[str] = None
    skin_type: Optional[str] = None
    concern: Optional[str] = None
    preferred_contact: str = "Email"
    message: str = Field(min_length=5)
    user_id: Optional[str] = None


class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = None
    skin_type: Optional[str] = None
    concern: Optional[str] = None
    preferred_contact: str
    message: str
    status: str
    admin_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ConsultationUpdateIn(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None


class AdminLoginIn(BaseModel):
    username: str
    password: str


class AdminLoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "admin"
    username: str = "admin"


class AdminStatsOut(BaseModel):
    total_inquiries: int
    pending_inquiries: int
    in_review_inquiries: int
    contacted_inquiries: int
    resolved_inquiries: int
