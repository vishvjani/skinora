import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, Lock, CreditCard, Banknote, Smartphone, 
  Truck, ArrowRight, CheckCircle2, AlertCircle, Sparkles, UserCheck
} from 'lucide-react';
import { useUser, SignInButton, SignUpButton } from '@clerk/clerk-react';
import { useCart } from '../context/CartContext';
import { apiService } from '../services/api';

export default function CheckoutPage() {
  const { cart, cartSubtotal, discountAmount, shippingFee, cartTotal, couponCode, clearCart } = useCart();
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'upi', // upi, card, cod
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-fill authenticated user details
  useEffect(() => {
    if (isSignedIn && user) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '',
        email: prev.email || user.primaryEmailAddress?.emailAddress || '',
      }));
    }
  }, [isSignedIn, user]);

  if (cart.length === 0) {
    navigate('/shop');
    return null;
  }

  // Mandatory Login Gate: Guests cannot checkout without logging in
  if (!isSignedIn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-fadeIn space-y-6">
        <div className="w-20 h-20 bg-[#EDE6DB] rounded-full flex items-center justify-center mx-auto text-3xl text-[#3F4A3D] shadow-soft">
          <Lock className="w-10 h-10 text-[#3F4A3D]" />
        </div>
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider">
            Sign In Required to Shop
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#241F1A]">
            Please Sign In to Complete Your Order
          </h1>
          <p className="text-sm text-[#9B8B7A] max-w-md mx-auto leading-relaxed">
            To ensure secure order delivery, live tracking, and eligible empty bottle returns for eco-cashback, you must log in to your account.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E4DACB] shadow-soft max-w-md mx-auto space-y-4">
          <SignInButton mode="modal">
            <button className="w-full bg-[#3F4A3D] hover:bg-[#2C352B] text-white py-3.5 rounded-2xl font-bold text-sm shadow-soft hover:shadow-hover transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Lock className="w-4 h-4" /> Sign In to Proceed to Checkout
            </button>
          </SignInButton>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-[#E4DACB] w-full"></div>
            <span className="bg-white px-3 text-xs text-[#9B8B7A]">or</span>
          </div>

          <SignUpButton mode="modal">
            <button className="w-full bg-[#F7F3ED] hover:bg-[#EDE6DB] text-[#3F4A3D] border border-[#E4DACB] py-3 rounded-2xl font-bold text-xs transition-colors cursor-pointer">
              Create New Skinora Account
            </button>
          </SignUpButton>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-[#9B8B7A]">
          <ShieldCheck className="w-4 h-4 text-[#3F4A3D]" /> 100% Secure Checkout &amp; Data Protection
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const currentUserId = user?.id || 'registered_user';
      const shippingAddress = `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`;

      const orderPayload = {
        items: cart.map(i => ({ 
          product_id: i.product.id, 
          quantity: i.quantity,
        })),
        coupon_code: couponCode || undefined,
        user_id: currentUserId,
        shipping_address: shippingAddress,
        final_amount: cartTotal,
        payment_method: formData.paymentMethod,
        notes: `Phone: ${formData.phone} | Name: ${formData.fullName} | Method: ${formData.paymentMethod.toUpperCase()}`,
      };

      const response = await apiService.createOrder(orderPayload);
      clearCart();
      
      // Use DB UUID if available, else generate display ID
      const dbOrderId = response?.id || null;
      const displayOrderId = dbOrderId
        ? String(dbOrderId).slice(0, 8).toUpperCase()
        : `SKIN-${Math.floor(100000 + Math.random() * 900000)}`;

      // Persist to localStorage so RecyclePage can find it (status = delivered for demo)
      const containerTypeFor = (name = '') => {
        const n = name.toLowerCase();
        if (n.includes('serum')) return 'Glass Dropper Bottle';
        if (n.includes('soap')) return 'Soap Box / Tin';
        if (n.includes('shampoo')) return 'Shampoo Pump Bottle';
        if (n.includes('body wash') || n.includes('shower')) return 'Shower Gel Pump Bottle';
        if (n.includes('lip')) return 'Glass Lip Butter Pots';
        if (n.includes('scrub') || n.includes('mask') || n.includes('ubtan')) return 'Glass / Clay Jar';
        return 'Cleanser Squeeze Tube';
      };

      const newOrderRecord = {
        id: dbOrderId || displayOrderId,
        display_id: displayOrderId,
        date: new Date().toISOString(),
        total: cartTotal,
        status: 'delivered',          // lowercase to match backend func.lower() check
        shipping_address: shippingAddress,
        payment_method: formData.paymentMethod,
        items: cart.map(i => ({
          product_id: i.product.id,
          name: i.product.name,
          image_url: i.product.image_url,
          price: i.product.price,
          quantity: i.quantity,
          category: i.product.category || 'skincare',
          brand: i.product.brand || 'Nexaura',
          container_type: containerTypeFor(i.product.name),
          recycle_points: i.product.recycle_points || 50,
          is_recycled: false,
          coupon_code: null,
        }))
      };

      const userOrders = JSON.parse(localStorage.getItem(`skinora_orders_${currentUserId}`) || '[]');
      userOrders.unshift(newOrderRecord);
      localStorage.setItem(`skinora_orders_${currentUserId}`, JSON.stringify(userOrders));
      // Also store latest order id for OrderSuccessPage
      localStorage.setItem('skinora_last_order', JSON.stringify(newOrderRecord));

      navigate('/order-success', { 
        state: { 
          order: {
            orderId: displayOrderId,
            dbOrderId: dbOrderId,
            status: formData.paymentMethod === 'cod' ? 'Placed (Cash on Delivery)' : 'Confirmed & Paid',
            estimatedDelivery: '3-4 Business Days (Express Eco-Courier)',
            total: cartTotal,
            payment_method: formData.paymentMethod,
            customer: { 
              fullName: formData.fullName, 
              address: shippingAddress,
            },
            items: cart
          } 
        } 
      });
    } catch (err) {
      console.error("Order creation failed:", err);
      alert("Something went wrong while placing your order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <div className="border-b border-[#E4DACB] pb-4">
        <h1 className="font-serif text-3xl font-bold text-[#241F1A]">Checkout</h1>
        <p className="text-xs text-[#9B8B7A] mt-1">
          Enter your shipping details to complete your order.
        </p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Shipping Address & Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Contact Information */}
          <div className="bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-soft space-y-4">
            <h2 className="font-serif font-bold text-lg text-[#241F1A] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#3F4A3D] text-white flex items-center justify-center text-xs">1</span>
              Contact Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#5C4E4B] font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F7F3ED] border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D]"
                />
              </div>
              <div>
                <label className="block text-[#5C4E4B] font-semibold mb-1">Phone Number (For Tracking Updates) *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F7F3ED] border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[#5C4E4B] font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="priya@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F7F3ED] border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D]"
                />
              </div>
            </div>
          </div>

          {/* 2. Delivery Address */}
          <div className="bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-soft space-y-4">
            <h2 className="font-serif font-bold text-lg text-[#241F1A] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#3F4A3D] text-white flex items-center justify-center text-xs">2</span>
              Shipping Address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[#5C4E4B] font-semibold mb-1">Flat / House No / Street Address *</label>
                <input
                  type="text"
                  name="address"
                  required
                  placeholder="House 402, Sunshine Apartments, MG Road"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F7F3ED] border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D]"
                />
              </div>
              <div>
                <label className="block text-[#5C4E4B] font-semibold mb-1">City *</label>
                <input
                  type="text"
                  name="city"
                  required
                  placeholder="Mumbai"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F7F3ED] border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D]"
                />
              </div>
              <div>
                <label className="block text-[#5C4E4B] font-semibold mb-1">State *</label>
                <input
                  type="text"
                  name="state"
                  required
                  placeholder="Maharashtra"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F7F3ED] border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D]"
                />
              </div>
              <div>
                <label className="block text-[#5C4E4B] font-semibold mb-1">Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  required
                  placeholder="400001"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F7F3ED] border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D]"
                />
              </div>
            </div>
          </div>

          {/* 3. Payment Method Selection */}
          <div className="bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-lg text-[#241F1A] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#3F4A3D] text-white flex items-center justify-center text-xs">3</span>
                Payment Method
              </h2>
              <span className="text-[11px] text-[#3F4A3D] bg-[#E8EAE3] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-[#C8D0BE]">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Safe & Secure
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <label
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                  formData.paymentMethod === 'upi'
                    ? 'border-[#3F4A3D] bg-[#F7EDE2]/40 ring-2 ring-[#3F4A3D]/20'
                    : 'border-[#E4DACB] bg-[#F7F3ED]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    checked={formData.paymentMethod === 'upi'}
                    onChange={handleChange}
                    className="accent-[#3F4A3D]"
                  />
                  <Smartphone className="w-5 h-5 text-[#3F4A3D]" />
                  <div>
                    <span className="font-bold text-[#241F1A] block">Instant UPI (GPay / PhonePe / Paytm / BHIM)</span>
                    <span className="text-[#9B8B7A] text-[11px]">Instant zero-fee confirmation</span>
                  </div>
                </div>
                <span className="bg-[#D8DED1] text-[#2C352B] text-[10px] font-bold px-2 py-0.5 rounded">
                  Fastest
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                  formData.paymentMethod === 'card'
                    ? 'border-[#3F4A3D] bg-[#F7EDE2]/40 ring-2 ring-[#3F4A3D]/20'
                    : 'border-[#E4DACB] bg-[#F7F3ED]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={formData.paymentMethod === 'card'}
                    onChange={handleChange}
                    className="accent-[#3F4A3D]"
                  />
                  <CreditCard className="w-5 h-5 text-[#3F4A3D]" />
                  <div>
                    <span className="font-bold text-[#241F1A] block">Credit / Debit Card / Net Banking</span>
                    <span className="text-[#9B8B7A] text-[11px]">Visa, Mastercard, RuPay & all Indian banks</span>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                  formData.paymentMethod === 'cod'
                    ? 'border-[#3F4A3D] bg-[#F7EDE2]/40 ring-2 ring-[#3F4A3D]/20'
                    : 'border-[#E4DACB] bg-[#F7F3ED]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={handleChange}
                    className="accent-[#3F4A3D]"
                  />
                  <Banknote className="w-5 h-5 text-[#3F4A3D]" />
                  <div>
                    <span className="font-bold text-[#241F1A] block">Cash On Delivery (COD)</span>
                    <span className="text-[#9B8B7A] text-[11px]">Pay via cash or UPI when your parcel arrives</span>
                  </div>
                </div>
                <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded">
                  Zero Advance
                </span>
              </label>
            </div>
          </div>

        </div>

        {/* Right Column: Order Summary Preview */}
        <div className="bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-soft space-y-6 h-fit">
          <h2 className="font-serif font-bold text-lg text-[#241F1A] border-b border-[#E4DACB] pb-3">
            Order Items ({cart.length})
          </h2>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center gap-3 text-xs">
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="w-12 h-12 object-cover rounded-lg bg-[#F7EDE2]"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-[#241F1A] line-clamp-1">{item.product.name}</h4>
                  <span className="text-[#9B8B7A]">Qty: {item.quantity}</span>
                </div>
                <span className="font-bold text-[#241F1A]">₹{item.product.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs text-[#5C4E4B] pt-4 border-t border-[#E4DACB]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{cartSubtotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[#3F4A3D] font-bold">
                <span>Discount</span>
                <span>-₹{discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping Fee</span>
              <span>{shippingFee === 0 ? <strong className="text-[#3F4A3D]">FREE</strong> : `₹${shippingFee}`}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#241F1A] pt-3 border-t border-[#E4DACB]">
              <span>Total Amount</span>
              <span className="text-[#3F4A3D] font-serif text-xl">₹{cartTotal}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-[#3F4A3D] hover:bg-[#A3591B] text-white py-4 rounded-2xl font-bold text-sm shadow-soft hover:shadow-hover transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span>Placing Your Order...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Place Order • ₹{cartTotal}
              </>
            )}
          </button>
          
          <div className="flex items-center justify-center gap-2 text-[11px] text-[#9B8B7A] pt-1">
            <Truck className="w-3.5 h-3.5 text-[#3F4A3D]" />
            <span>Dispatched in eco-friendly biodegradable box</span>
          </div>
        </div>

      </form>
    </div>
  );
}
