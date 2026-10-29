import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, Tag, ArrowRight, Truck, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    discountAmount,
    shippingFee,
    isFreeShipping,
    cartTotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    couponError,
    couponSuccess,
    FREE_SHIPPING_THRESHOLD,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const navigate = useNavigate();

  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const freeShipProgress = Math.min(100, Math.round((cartSubtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountNeeded = FREE_SHIPPING_THRESHOLD - cartSubtotal;

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    setIsApplying(true);
    await applyCoupon(couponInput);
    setIsApplying(false);
  };

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-[#241F1A]/45 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 flex max-w-full pl-10"
          >
            <div className="flex h-full w-screen max-w-md flex-col bg-[#F7F3ED] shadow-drawer">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E4DACB] px-6 py-5 bg-[#F7F3ED]">
                <div className="flex items-center gap-3">
                  <span className="font-cinzel text-xs font-semibold uppercase tracking-[0.22em] text-[#241F1A]">
                    Atelier Bag
                  </span>
                  <span className="badge-luxury text-[10px]">
                    {itemCount} {itemCount === 1 ? 'Flacon' : 'Flacons'}
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#241F1A] transition-colors hover:bg-[#EDE6DB]"
                  aria-label="Close cart"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Free shipping progress */}
              <div className="border-b border-[#E4DACB] bg-[#FAF8F5] px-6 py-4">
                <div className="mb-2 flex items-center justify-between text-[12px] text-[#6B5D50]">
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#B08D57]" strokeWidth={1.6} />
                    {isFreeShipping ? (
                      <span className="font-medium text-[#3F4A3D]">✦ Complimentary White-Glove Dispatch Unlocked</span>
                    ) : (
                      <span>Add <strong className="text-[#241F1A]">₹{amountNeeded}</strong> for Complimentary Dispatch</span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-[#B08D57]">{freeShipProgress}%</span>
                </div>
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#E4DACB]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#B08D57] to-[#3F4A3D] transition-all duration-500"
                    style={{ width: `${freeShipProgress}%` }}
                  />
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {cart.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#E4DACB] bg-[#EDE6DB] text-[#3F4A3D]">
                      <ShoppingBag className="w-7 h-7" strokeWidth={1.4} />
                    </div>
                    <h3 className="mt-5 font-serif text-2xl text-[#241F1A]">Your bag is empty</h3>
                    <p className="mt-1.5 text-[13px] text-[#6B5D50] max-w-[16rem]">
                      Discover botanical soaps and saffron radiance serums to begin your ritual.
                    </p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="btn-primary mt-6"
                    >
                      Start shopping <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={`${item.product.id}-${item.form}`}
                        className="group flex gap-3.5 rounded-2xl border border-[#E4DACB] bg-white p-3.5 shadow-sm transition-all duration-300 hover:border-[#B08D57]/60 hover:shadow-md"
                      >
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="h-20 w-16 flex-shrink-0 rounded-xl object-cover bg-[#EDE6DB] transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={`/product/${item.product.slug || item.product.id}`}
                                onClick={() => setIsCartOpen(false)}
                                className="font-serif text-[15px] leading-tight text-[#241F1A] hover:text-[#B08D57] transition-colors line-clamp-2"
                              >
                                {item.product.name}
                              </Link>
                              <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="flex-shrink-0 text-[#9B8B7A] hover:text-[#B5755A] transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="mt-1 block text-[11px] font-cinzel tracking-wider text-[#9B8B7A]">
                              {item.form}{item.size ? ` · ${item.size}` : ''}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center rounded-full border border-[#E4DACB] bg-[#F7F3ED]">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="px-2.5 py-1 text-[#6B5D50] hover:text-[#241F1A]"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 font-mono text-[13px] font-semibold text-[#241F1A]">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="px-2.5 py-1 text-[#6B5D50] hover:text-[#241F1A]"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="font-serif text-[16px] font-semibold text-[#241F1A]">
                              ₹{item.product.price * item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              {cart.length > 0 && (
                <div className="border-t border-[#E4DACB] bg-white px-5 py-5 space-y-4">
                  {/* Coupon */}
                  <div>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-xl border border-[#E4DACB] bg-[#EDE6DB] px-3.5 py-2.5 text-[12px] text-[#241F1A]">
                        <span className="flex items-center gap-2 font-medium">
                          <Tag className="w-3.5 h-3.5 text-[#3F4A3D]" />
                          {appliedCoupon.code} · −₹{discountAmount}
                        </span>
                        <button onClick={removeCoupon} className="text-[11px] text-[#9B8B7A] underline hover:text-[#B5755A]">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Coupon code (WELCOME10)"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          className="flex-1 rounded-full border border-[#E4DACB] bg-[#F7F3ED] px-4 py-2.5 text-[12px] uppercase tracking-wide text-[#241F1A] placeholder:text-[#9B8B7A] focus:border-[#241F1A] focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isApplying}
                          className="rounded-full border border-[#241F1A] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#241F1A] transition-colors hover:bg-[#241F1A] hover:text-[#F7F3ED]"
                        >
                          {isApplying ? '…' : 'Apply'}
                        </button>
                      </form>
                    )}
                    {couponError && <p className="mt-1.5 text-[11px] text-[#B5755A]">{couponError}</p>}
                    {couponSuccess && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#3F4A3D]">
                        <Check className="w-3 h-3" /> {couponSuccess}
                      </p>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 text-[13px] text-[#6B5D50]">
                    <div className="flex justify-between">
                      <span className="font-cinzel text-xs tracking-wider text-[#9B8B7A]">Subtotal</span>
                      <span className="font-mono text-[#241F1A]">₹{cartSubtotal}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[#3F4A3D]">
                        <span className="font-cinzel text-xs tracking-wider">Atelier Privilege</span>
                        <span className="font-mono font-medium">−₹{discountAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-cinzel text-xs tracking-wider text-[#9B8B7A]">White-Glove Dispatch</span>
                      <span>{isFreeShipping ? <strong className="font-cinzel text-xs text-[#3F4A3D]">Complimentary</strong> : <span className="font-mono text-[#241F1A]">₹{shippingFee}</span>}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#E4DACB] pt-3 text-[16px] text-[#241F1A]">
                      <span className="font-cinzel text-sm uppercase tracking-[0.16em]">Total Acquisition</span>
                      <span className="font-serif text-2xl font-bold">₹{cartTotal}</span>
                    </div>
                  </div>

                  {/* Checkout */}
                  <button
                    onClick={handleCheckoutClick}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#241F1A] py-4 text-[12px] font-cinzel font-semibold uppercase tracking-[0.22em] text-[#F7F3ED] transition-all duration-300 hover:bg-[#B08D57] hover:text-[#241F1A] hover:shadow-lg active:scale-[0.99]"
                  >
                    Proceed to Acquisition <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
