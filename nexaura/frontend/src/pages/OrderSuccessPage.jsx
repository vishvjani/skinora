import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle2, Package, Truck, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';

export default function OrderSuccessPage() {
  const location = useLocation();
  const order = location.state?.order || {
    orderId: 'SKIN-849201',
    status: 'Confirmed',
    estimatedDelivery: '3-4 Business Days',
    total: 899,
    customer: { fullName: 'Valued Customer', address: 'Your Shipping Address' },
    items: [],
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fadeIn space-y-8">
      {/* Top Banner */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#E4DACB] shadow-soft text-center space-y-4">
        <div className="w-20 h-20 bg-[#E8EAE3] rounded-full flex items-center justify-center mx-auto text-[#3F4A3D] border border-[#C8D0BE]">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="text-xs uppercase font-bold tracking-widest text-[#3F4A3D] bg-[#E8EAE3] px-3 py-1 rounded-full inline-block">
          Order Placed Successfully 🎉
        </span>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#241F1A]">
          Thank You For Your Order!
        </h1>

        <p className="text-xs sm:text-sm text-[#5C4E4B] max-w-lg mx-auto">
          We have received your order <strong>#{order.orderId}</strong>. A confirmation SMS & Email has been dispatched to your mobile.
        </p>

        <div className="p-4 rounded-2xl bg-[#F7F3ED] border border-[#E4DACB] grid grid-cols-2 gap-4 text-xs max-w-md mx-auto">
          <div>
            <span className="text-[#9B8B7A] block text-[10px] uppercase font-bold">Order Reference</span>
            <span className="font-bold text-[#241F1A]">{order.orderId}</span>
          </div>
          <div>
            <span className="text-[#9B8B7A] block text-[10px] uppercase font-bold">Estimated Delivery</span>
            <span className="font-bold text-[#3F4A3D]">{order.estimatedDelivery}</span>
          </div>
        </div>
      </div>

      {/* Order Status Tracker */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E4DACB] shadow-soft space-y-6">
        <h2 className="font-serif font-bold text-lg text-[#241F1A] border-b border-[#E4DACB] pb-3">
          Delivery Timeline
        </h2>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="space-y-1">
            <div className="w-8 h-8 rounded-full bg-[#3F4A3D] text-white flex items-center justify-center mx-auto font-bold text-xs">
              1
            </div>
            <span className="font-bold text-[#241F1A] block">Confirmed</span>
            <span className="text-[10px] text-[#9B8B7A]">Just Now</span>
          </div>
          <div className="space-y-1">
            <div className="w-8 h-8 rounded-full bg-[#F7EDE2] text-[#3F4A3D] border border-[#DDA15E] flex items-center justify-center mx-auto font-bold text-xs">
              2
            </div>
            <span className="font-bold text-[#5C4E4B] block">Handcrafted & Packed</span>
            <span className="text-[10px] text-[#9B8B7A]">Within 24 Hours</span>
          </div>
          <div className="space-y-1">
            <div className="w-8 h-8 rounded-full bg-[#F7F3ED] text-[#9B8B7A] border border-[#E4DACB] flex items-center justify-center mx-auto font-bold text-xs">
              3
            </div>
            <span className="font-bold text-[#9B8B7A] block">Out for Delivery</span>
            <span className="text-[10px] text-[#9B8B7A]">In 3-4 Days</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to="/shop"
          className="w-full sm:w-auto bg-[#3F4A3D] hover:bg-[#A3591B] text-white px-8 py-3.5 rounded-full text-xs font-bold shadow-soft transition-all flex items-center justify-center gap-2"
        >
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/account"
          className="w-full sm:w-auto bg-[#F7EDE2] hover:bg-[#DDA15E] hover:text-white text-[#3F4A3D] px-8 py-3.5 rounded-full text-xs font-bold transition-all flex items-center justify-center"
        >
          Track Order Details
        </Link>
      </div>
    </div>
  );
}
