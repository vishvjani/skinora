"""SQLAlchemy ORM models with Container Return & Eco-Rewards support."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database.connection import Base


class Category(Base):
    __tablename__ = "categories"

    id          = Column(Integer, primary_key=True)
    name        = Column(String(100), nullable=False)
    slug        = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    image_url   = Column(Text)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"

    id               = Column(Integer, primary_key=True)
    name             = Column(String(255), nullable=False)
    slug             = Column(String(300), unique=True, nullable=False)
    description      = Column(Text)
    category         = Column(String(100))
    subcategory      = Column(String(100))
    brand            = Column(String(100))
    mrp              = Column(Numeric(10, 2), nullable=False, default=0)
    price            = Column(Numeric(10, 2), nullable=False, default=0)
    discount_percent = Column(Integer, default=0)
    stock            = Column(Integer, default=0)
    rating           = Column(Numeric(3, 1), default=0)
    review_count     = Column(Integer, default=0)
    image_url        = Column(Text)
    secondary_image  = Column(Text)
    tags             = Column(ARRAY(Text))
    ingredients      = Column(Text)
    form             = Column(String(100))
    size             = Column(String(50))
    container_type   = Column(String(100), default="Glass Bottle")
    recycle_points   = Column(Integer, default=50)
    batch_number     = Column(String(100))
    mfg_date         = Column(String(50))
    exp_date         = Column(String(50))
    raw_materials    = Column(Text)
    quality_tests    = Column(Text)
    factory_location = Column(String(255))
    certifications   = Column(Text)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    order_items       = relationship("OrderItem", back_populates="product")
    cart_items        = relationship("CartItem", back_populates="product")
    wishlist_items    = relationship("WishlistItem", back_populates="product")
    reviews           = relationship("Review", back_populates="product")
    competitor_prices = relationship("CompetitorPrice", back_populates="product")
    events            = relationship("UserEvent", back_populates="product")
    container_returns = relationship("ContainerReturnRequest", back_populates="product")


class User(Base):
    __tablename__ = "users"

    id                   = Column(String(255), primary_key=True)   # Clerk user_id or demo id
    email                = Column(String(255), unique=True)
    full_name            = Column(String(255))
    avatar_url           = Column(Text)
    phone                = Column(String(20))
    eco_points           = Column(Integer, default=150)             # Live Eco-Points balance
    containers_recycled  = Column(Integer, default=0)               # Total containers returned
    co2_saved_kg         = Column(Float, default=0.0)               # Total CO2 saved
    created_at           = Column(DateTime(timezone=True), server_default=func.now())

    orders               = relationship("Order", back_populates="user")
    container_returns    = relationship("ContainerReturnRequest", back_populates="user")


class Address(Base):
    __tablename__ = "addresses"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"))
    label      = Column(String(50), default="Home")
    line1      = Column(Text, nullable=False)
    line2      = Column(Text)
    city       = Column(String(100), nullable=False)
    state      = Column(String(100), nullable=False)
    pincode    = Column(String(10), nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user   = relationship("User")


class CartItem(Base):
    __tablename__ = "cart"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"))
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    quantity   = Column(Integer, nullable=False, default=1)
    added_at   = Column(DateTime(timezone=True), server_default=func.now())

    user    = relationship("User")
    product = relationship("Product", back_populates="cart_items")


class WishlistItem(Base):
    __tablename__ = "wishlist"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"))
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    added_at   = Column(DateTime(timezone=True), server_default=func.now())

    user    = relationship("User")
    product = relationship("Product", back_populates="wishlist_items")


class Order(Base):
    __tablename__ = "orders"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id              = Column(String(255), ForeignKey("users.id"))
    status               = Column(String(50), default="pending")
    total_amount         = Column(Numeric(10, 2), nullable=False, default=0)
    discount_amount      = Column(Numeric(10, 2), default=0)
    eco_points_redeemed  = Column(Integer, default=0)               # Points redeemed on this order
    eco_discount_amount  = Column(Numeric(10, 2), default=0)        # Instant cash discount from points
    final_amount         = Column(Numeric(10, 2), nullable=False, default=0)
    coupon_code          = Column(String(50))
    shipping_address     = Column(Text)
    payment_method       = Column(String(50))
    payment_status       = Column(String(50), default="pending")
    payment_id           = Column(String(100))
    razorpay_order_id    = Column(String(100))
    eco_points_earned    = Column(Integer, default=0)
    notes                = Column(Text)
    created_at           = Column(DateTime(timezone=True), server_default=func.now())

    user       = relationship("User", back_populates="orders")
    items      = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")



class OrderItem(Base):
    __tablename__ = "order_items"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id    = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"))
    product_id  = Column(Integer, ForeignKey("products.id"))
    quantity    = Column(Integer, nullable=False, default=1)
    unit_price  = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    order   = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class ContainerReturnRequest(Base):
    """Industry-Relevant Circular Beauty Container Recycling & Return Request Model"""
    __tablename__ = "container_returns"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id     = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    container_type = Column(String(100), nullable=False)             # e.g., "Glass Serum Dropper", "Pump Bottle"
    quantity       = Column(Integer, nullable=False, default=1)
    pickup_address = Column(Text, nullable=False)
    pincode        = Column(String(10), nullable=False)
    status         = Column(String(50), default="Scheduled for Pickup") # "Scheduled for Pickup", "Received", "Points Credited"
    points_awarded = Column(Integer, nullable=False, default=50)
    co2_saved_kg   = Column(Float, default=0.25)
    tracking_code  = Column(String(100))
    notes          = Column(Text)
    order_id       = Column(UUID(as_uuid=True))
    order_item_id  = Column(UUID(as_uuid=True))
    coupon_code    = Column(String(50))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    user    = relationship("User", back_populates="container_returns")
    product = relationship("Product", back_populates="container_returns")


class Coupon(Base):
    __tablename__ = "coupons"

    id              = Column(Integer, primary_key=True)
    code            = Column(String(50), unique=True, nullable=False)
    discount_type   = Column(String(20), nullable=False, default="percent")
    discount_value  = Column(Numeric(10, 2), nullable=False)
    min_order_value = Column(Numeric(10, 2), default=0)
    user_id         = Column(String(255), ForeignKey("users.id"), nullable=True)
    max_uses        = Column(Integer, default=1000)
    used_count      = Column(Integer, default=0)
    is_active       = Column(Boolean, default=True)
    expires_at      = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


class CompetitorPrice(Base):
    __tablename__ = "competitor_prices"

    id               = Column(Integer, primary_key=True)
    product_id       = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    competitor       = Column(String(100), nullable=False)
    competitor_price = Column(Numeric(10, 2), nullable=False)
    recorded_at      = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="competitor_prices")


class UserEvent(Base):
    __tablename__ = "user_events"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(255))
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"))
    event_type = Column(String(50), nullable=False)
    session_id = Column(String(100))
    event_meta = Column('metadata', JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="events")


class ABTest(Base):
    __tablename__ = "ab_tests"

    id          = Column(Integer, primary_key=True)
    name        = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    variant_a   = Column(String(100), nullable=False)
    variant_b   = Column(String(100), nullable=False)
    start_date  = Column(DateTime(timezone=True), server_default=func.now())
    end_date    = Column(DateTime(timezone=True))
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    assignments = relationship("ABAssignment", back_populates="test")


class ABAssignment(Base):
    __tablename__ = "ab_assignments"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(String(255), nullable=False)
    experiment_id = Column(Integer, ForeignKey("ab_tests.id", ondelete="CASCADE"))
    variant       = Column(String(100), nullable=False)
    assigned_at   = Column(DateTime(timezone=True), server_default=func.now())

    test         = relationship("ABTest", back_populates="assignments")
    conversions  = relationship("ABConversion", back_populates="assignment")


class ABConversion(Base):
    __tablename__ = "ab_conversions"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id   = Column(UUID(as_uuid=True), ForeignKey("ab_assignments.id", ondelete="CASCADE"))
    conversion_type = Column(String(50), nullable=False)
    conversion_meta = Column('metadata', JSONB, default={})
    converted_at    = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("ABAssignment", back_populates="conversions")


class Review(Base):
    __tablename__ = "reviews"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id  = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    user_id     = Column(String(255), ForeignKey("users.id"))
    rating      = Column(Integer, nullable=False)
    title       = Column(String(200))
    body        = Column(Text)
    is_verified = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="reviews")
    user    = relationship("User")


class ConsultationQuery(Base):
    __tablename__ = "consultation_queries"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id           = Column(String(255), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name              = Column(String(255), nullable=False)
    email             = Column(String(255), nullable=False)
    phone             = Column(String(50), nullable=True)
    skin_type         = Column(String(100), nullable=True)     # Oily, Dry, Combination, Sensitive, Normal
    concern           = Column(String(255), nullable=True)     # De-Tan, Acne, Radiance, Aging, Routine
    preferred_contact = Column(String(50), default="Email")   # Email, WhatsApp, Phone Call
    message           = Column(Text, nullable=False)
    status            = Column(String(50), default="PENDING")  # PENDING, IN_REVIEW, CONTACTED, RESOLVED
    admin_notes       = Column(Text, nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())

    user              = relationship("User")
