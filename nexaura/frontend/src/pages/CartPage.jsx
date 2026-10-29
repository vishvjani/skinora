import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, Tag, ArrowRight, Truck, ShieldCheck, Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser, SignInButton } from '@clerk/clerk-react';

export default function CartPage() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    cartMrpTotal,
    discountAmount,
    shippingFee,
    isFreeShipping,
    cartTotal,
    totalSavings,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    couponError,
    couponSuccess,
    FREE_SHIPPING_THRESHOLD,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  const freeShipProgress = Math.min(100, Math.round((cartSubtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountNeededForFreeShip = FREE_SHIPPING_THRESHOLD - cartSubtotal;

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    setIsApplying(true);
    await applyCoupon(couponInput, user?.id || null);
    setIsApplying(false);
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn space-y-4">
        <div className="w-24 h-24 bg-[#F7EDE2] rounded-full flex items-center justify-center mx-auto text-4xl">
          🛍️
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#241F1A]">Your Cart is Currently Empty</h1>
        <p className="text-xs sm:text-sm text-[#9B8B7A] max-w-md mx-auto">
          Explore our pure De-Tan soaps, saffron radiant serums, and herbal facial cleansers.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 bg-[#3F4A3D] hover:bg-[#A3591B] text-white px-8 py-3 rounded-full text-xs font-bold shadow-soft transition-all"
        >
          Explore Shop <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <div className="border-b border-[#E4DACB] pb-4">
        <h1 className="font-serif text-3xl font-bold text-[#241F1A]">Shopping Cart</h1>
        <p className="text-xs text-[#9B8B7A] mt-1">
          Review your items and apply discount coupons before checkout.
        </p>
      </div>

      {/* Free Delivery Meter */}
      <div className="bg-[#F7EDE2] p-4 rounded-2xl border border-[#E4DACB]">
        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
          <span className="flex items-center gap-1.5 text-[#5C4E4B]">
            <Truck className="w-4 h-4 text-[#3F4A3D]" />
            {isFreeShipping ? (
              <strong className="text-[#3F4A3D] font-semibold">🎉 You unlocked FREE Express Delivery!</strong>
            ) : (
              <span>
                Add <strong className="text-[#3F4A3D]">₹{amountNeededForFreeShip}</strong> more to qualify for FREE Shipping!
              </span>
            )}
          </span>
          <span className="font-bold text-[#3F4A3D]">{freeShipProgress}%</span>
        </div>
        <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-[#E4DACB]">
          <div
            className="h-full bg-gradient-to-r from-[#DDA15E] to-[#3F4A3D] transition-all duration-500 rounded-full"
            style={{ width: `${freeShipProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Items Table */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div
              key={`${item.product.id}-${item.form}`}
              className="bg-white p-4 rounded-2xl border border-[#E4DACB] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:border-[#DDA15E] transition-all"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="w-20 h-20 object-cover rounded-xl bg-[#F7EDE2]"
                />
                <div>
                  <Link
                    to={`/product/${item.product.slug || item.product.id}`}
                    className="font-serif font-bold text-sm text-[#241F1A] hover:text-[#3F4A3D] line-clamp-1"
                  >
                    {item.product.name}
                  </Link>
                  <span className="text-xs text-[#9B8B7A] block mt-0.5">
                    {item.form} {item.size ? `• ${item.size}` : ''}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-bold text-sm text-[#241F1A]">₹{item.product.price}</span>
                    {item.product.mrp > item.product.price && (
                      <span className="text-xs text-[#9B8B7A] line-through">₹{item.product.mrp}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto gap-6 pt-2 sm:pt-0 border-t sm:border-0 border-[#E4DACB]">
                <div className="flex items-center border border-[#E4DACB] rounded-xl bg-[#F7F3ED]">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="px-3 py-1 text-[#5C4E4B] hover:bg-[#F7EDE2] rounded-l-xl text-xs"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-xs font-bold text-[#241F1A]">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="px-3 py-1 text-[#5C4E4B] hover:bg-[#F7EDE2] rounded-r-xl text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right">
                  <span className="font-serif font-bold text-base text-[#241F1A]">
                    ₹{item.product.price * item.quantity}
                  </span>
                </div>

                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-[#9B8B7A] hover:text-red-500 p-2"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Order Summary */}
        <div className="bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-soft space-y-6 h-fit">
          <h2 className="font-serif font-bold text-lg text-[#241F1A] border-b border-[#E4DACB] pb-3">
            Order Summary
          </h2>

          {/* Coupon Input */}
          <div>
            {appliedCoupon ? (
              <div className="bg-[#E8EAE3] border border-[#C8D0BE] text-[#2C352B] text-xs p-3 rounded-xl flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold">
                  <Tag className="w-4 h-4 text-[#3F4A3D]" />
                  Coupon {appliedCoupon.code} (-₹{discountAmount})
                </span>
                <button
                  onClick={removeCoupon}
                  className="text-xs text-red-600 underline font-semibold"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon Code (e.g. WELCOME10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#F7F3ED] border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D] uppercase"
                />
                <button
                  type="submit"
                  disabled={isApplying}
                  className="bg-[#F7EDE2] hover:bg-[#DDA15E] hover:text-white text-[#3F4A3D] px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  {isApplying ? 'Checking...' : 'Apply'}
                </button>
              </form>
            )}
            {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
            {couponSuccess && <p className="text-xs text-[#3F4A3D] mt-1">{couponSuccess}</p>}
          </div>

          <div className="space-y-2 text-xs text-[#5C4E4B]">
            <div className="flex justify-between">
              <span>Bag MRP Total</span>
              <span className="line-through text-[#9B8B7A]">₹{cartMrpTotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Bag Subtotal</span>
              <span>₹{cartSubtotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[#3F4A3D] font-bold">
                <span>Coupon Savings</span>
                <span>-₹{discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{isFreeShipping ? <strong className="text-[#3F4A3D]">FREE</strong> : `₹${shippingFee}`}</span>
            </div>
            {totalSavings > 0 && (
              <div className="p-2 bg-[#E8EAE3] rounded-xl text-[#2C352B] font-bold text-center text-xs mt-2">
                🎉 You are saving ₹{totalSavings} on this order!
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#241F1A] pt-3 border-t border-[#E4DACB]">
              <span>Total Amount</span>
              <span className="text-[#3F4A3D] font-serif text-xl">₹{cartTotal}</span>
            </div>
          </div>

          {!isSignedIn ? (
            <div className="space-y-2 pt-2">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-850 text-xs flex items-center gap-2 font-medium">
                <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Sign in or create an account to proceed to checkout.</span>
              </div>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full bg-[#3F4A3D] hover:bg-[#2C352B] text-white py-3.5 rounded-2xl font-bold text-sm shadow-soft hover:shadow-hover transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" /> Sign In to Proceed <ArrowRight className="w-4 h-4" />
                </button>
              </SignInButton>
            </div>
          ) : (
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-[#3F4A3D] hover:bg-[#A3591B] text-white py-3.5 rounded-2xl font-bold text-sm shadow-soft hover:shadow-hover transition-all flex items-center justify-center gap-2"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
