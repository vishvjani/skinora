import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Recycle, Leaf, Award, ShieldCheck, CheckCircle2, 
  Sparkles, ArrowRight, PackageCheck, Coins, RefreshCw,
  Copy, Check, Gift, ShoppingBag, Clock, Lock, Tag
} from 'lucide-react';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { useCart } from '../context/CartContext';
import { getApiBaseUrl } from '../services/api';

const API_BASE_URL = getApiBaseUrl();

export default function RecyclePage() {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const { applyCoupon } = useCart();

  // Delivered Orders state
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [claimingItemId, setClaimingItemId] = useState(null);
  const [copiedCoupon, setCopiedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(null);
  const [applyCouponMsg, setApplyCouponMsg] = useState({});

  const [containerTypes] = useState([
    { type: "Glass Dropper Bottle", points: 50, co2_saved_kg: 0.35, description: "Serum & Kumkumadi dropper bottles" },
    { type: "Shower Gel Pump Bottle", points: 50, co2_saved_kg: 0.30, description: "De-Tan Body Wash pump bottles" },
    { type: "Shampoo Pump Bottle", points: 50, co2_saved_kg: 0.30, description: "Rice Water Shampoo bottles" },
    { type: "Cleanser Squeeze Tube", points: 40, co2_saved_kg: 0.20, description: "Vitamin C Face Wash & Sunscreen tubes" },
    { type: "Glass / Clay Jar", points: 40, co2_saved_kg: 0.25, description: "Face pack clay jars & scrub pots" },
    { type: "Soap Box / Tin", points: 30, co2_saved_kg: 0.15, description: "Handmade soap tins & packaging boxes" },
    { type: "Glass Lip Butter Pots", points: 35, co2_saved_kg: 0.18, description: "Lip scrub & lip balm glass pots" },
  ]);

  const [ecoSummary, setEcoSummary] = useState({
    eco_points_balance: 0,
    cash_value_rupees: 0,
    containers_recycled_total: 0,
    co2_saved_kg_total: 0.0,
    badge_level: "Seedling Pioneer 🌿"
  });

  const roundTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  useEffect(() => {
    async function loadData() {
      setOrdersLoading(true);
      try {
        if (!isSignedIn || !user) {
          setEligibleOrders([]);
          setOrdersLoading(false);
          return;
        }

        const userId = user.id;

        // Fetch live eco-points from backend
        try {
          const ecoRes = await fetch(
            `${API_BASE_URL}/api/recycle/eco-points?user_id=${encodeURIComponent(userId)}`
          );
          if (ecoRes.ok) {
            const ecoData = await ecoRes.json();
            setEcoSummary({
              eco_points_balance: ecoData.eco_points_balance || 0,
              cash_value_rupees: ecoData.cash_value_rupees || 0,
              containers_recycled_total: ecoData.containers_recycled_total || 0,
              co2_saved_kg_total: ecoData.co2_saved_kg_total || 0,
              badge_level: ecoData.badge_level || 'Eco Pioneer 🌱',
            });
          }
        } catch (e) { /* ignore, use local */ }

        // Check orders from localStorage (user specific)
        const localUserOrders = JSON.parse(localStorage.getItem(`skinora_orders_${userId}`) || '[]');

        if (localUserOrders.length > 0) {
          const formatted = localUserOrders.map(o => ({
            order_id: o.id,
            order_date: o.date || new Date().toISOString(),
            status: o.status || 'delivered',
            items: (o.items || []).map((it, idx) => ({
              item_id: `${o.id}-item-${idx}`,
              product_id: it.product_id || idx,
              name: it.name || it.product_name || 'Skincare Product',
              image_url: it.image_url || '/images/detan-soap.jpg',
              container_type: it.container_type || 'Glass Dropper Bottle',
              recycle_points: it.recycle_points || 50,
              is_recycled: !!it.is_recycled,
              coupon_code: it.coupon_code || null,
            })),
          }));
          setEligibleOrders(formatted);
        } else {
          setEligibleOrders([]);
        }
      } catch (err) {
        console.warn('Error loading eligible orders:', err);
        setEligibleOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    }
    loadData();
  }, [isSignedIn, user]);

  const handleClaimItem = async (order, item) => {
    setClaimingItemId(item.item_id);
    try {
      const userId = user?.id || 'demo_user_101';

      // Call backend API to record the claim in DB, award points, generate coupon
      let mintedCoupon = `ECO-RETURN-${Math.floor(1000 + Math.random() * 9000)}`;
      let pointsAwarded = item.recycle_points || 50;

      try {
        const res = await fetch(`${API_BASE_URL}/api/recycle/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            order_id: order.order_id,
            product_id: item.product_id,
            pickup_address: 'Home Address',
            pincode: '000000',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          mintedCoupon = data.coupon_code || mintedCoupon;
          pointsAwarded = data.points_awarded || pointsAwarded;
          // Refresh eco summary from backend
          setEcoSummary(prev => ({
            ...prev,
            eco_points_balance: data.new_points_balance ?? (prev.eco_points_balance + pointsAwarded),
            cash_value_rupees: data.new_points_balance ?? (prev.eco_points_balance + pointsAwarded),
            containers_recycled_total: prev.containers_recycled_total + 1,
            co2_saved_kg_total: roundTwo(prev.co2_saved_kg_total + (data.co2_saved_kg || 0.35)),
            badge_level: (data.new_points_balance || 0) >= 300 ? 'Planet Champion 🌎' :
                         (data.new_points_balance || 0) >= 150 ? 'Rose Eco Warrior 🌿' : 'Eco Pioneer 🌱',
          }));
        }
      } catch (apiErr) {
        console.warn('Backend recycle claim failed, using local fallback:', apiErr);
        setEcoSummary(prev => ({
          ...prev,
          eco_points_balance: prev.eco_points_balance + pointsAwarded,
          cash_value_rupees: prev.cash_value_rupees + pointsAwarded,
          containers_recycled_total: prev.containers_recycled_total + 1,
          co2_saved_kg_total: roundTwo(prev.co2_saved_kg_total + 0.35),
          badge_level: 'Rose Eco Warrior 🌿',
        }));
      }

      // Update item in local eligible orders state
      setEligibleOrders(prevOrders =>
        prevOrders.map(o => {
          if (o.order_id !== order.order_id) return o;
          return {
            ...o,
            items: o.items.map(i => {
              if (i.item_id !== item.item_id) return i;
              return { ...i, is_recycled: true, coupon_code: mintedCoupon };
            }),
          };
        })
      );

      // Persist recycle status to localStorage
      if (user?.id) {
        const userOrders = JSON.parse(localStorage.getItem(`skinora_orders_${user.id}`) || '[]');
        userOrders.forEach(o => {
          if (o.id === order.order_id) {
            (o.items || []).forEach(i => {
              if (i.name === item.name || i.product_id === item.product_id) {
                i.is_recycled = true;
                i.coupon_code = mintedCoupon;
              }
            });
          }
        });
        localStorage.setItem(`skinora_orders_${user.id}`, JSON.stringify(userOrders));
      }

      // Update wallet points
      setEcoSummary(prev => ({
        ...prev,
        eco_points_balance: prev.eco_points_balance + 50,
        cash_value_rupees: prev.cash_value_rupees + 50,
        containers_recycled_total: prev.containers_recycled_total + 1,
        co2_saved_kg_total: roundTwo(prev.co2_saved_kg_total + 0.35),
        badge_level: "Rose Eco Warrior 🌿"
      }));

    } catch (err) {
      console.error("Failed to claim recycle item:", err);
    } finally {
      setClaimingItemId(null);
    }
  };

  const copyCouponToClipboard = (couponCode) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCoupon(couponCode);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const handleApplyCouponToCart = async (couponCode) => {
    setApplyingCoupon(couponCode);
    setApplyCouponMsg(prev => ({ ...prev, [couponCode]: null }));
    try {
      const ok = await applyCoupon(couponCode, user?.id || null);
      if (ok) {
        setApplyCouponMsg(prev => ({ ...prev, [couponCode]: { type: 'success', text: 'Coupon applied! Go to cart.' } }));
      } else {
        setApplyCouponMsg(prev => ({ ...prev, [couponCode]: { type: 'error', text: 'Could not apply coupon.' } }));
      }
    } catch {
      setApplyCouponMsg(prev => ({ ...prev, [couponCode]: { type: 'error', text: 'Something went wrong.' } }));
    } finally {
      setApplyingCoupon(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-10">
      
      {/* 1. Hero Sustainability Header */}
      <div className="bg-[#241F1A] text-white p-8 sm:p-14 rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-[#B08D57]/30">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#B08D57]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#FAF8F5]/10 border border-[#B08D57]/40 px-4 py-1 rounded-full text-xs font-cinzel font-semibold text-[#B08D57] uppercase tracking-[0.24em] backdrop-blur-md">
            <Recycle className="w-3.5 h-3.5 text-[#B08D57]" />
            Circular Atelier Covenant &amp; Privilege Credits
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-normal text-white leading-tight">
            Return Spent Flacons. Earn Atelier Privilege Credits.
          </h1>
          <p className="text-sm sm:text-base text-[#EDE6DB]/80 leading-relaxed max-w-2xl font-light">
            Partake in Skinora's closed-loop lifecycle. Send back your emptied amber glass dropper bottles, botanical wash dispensers, and terracotta jars for pharmaceutical-grade sterilization and re-infusion.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-4">
            <Link
              to="/shop"
              className="bg-[#B08D57] hover:bg-[#977341] text-[#241F1A] font-cinzel font-semibold px-6 py-3.5 rounded-full text-xs uppercase tracking-[0.18em] flex items-center gap-2 transition-all shadow-md"
            >
              Acquire Formulations &amp; Redeem Credits <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Live Eco-Points Wallet Card & Impact Counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        {/* Wallet Balance Card */}
        <div className="bg-white p-6 rounded-3xl border border-[#B08D57]/40 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-cinzel font-semibold text-[#B08D57] uppercase tracking-[0.18em] mb-2">
              <span>Atelier Privilege Vault</span>
              <Coins className="w-5 h-5 text-[#B08D57]" />
            </div>
            <div className="font-serif text-4xl text-[#241F1A]">
              {ecoSummary.eco_points_balance} <span className="text-xs font-cinzel uppercase tracking-wider text-[#9B8B7A]">Credits</span>
            </div>
            <span className="text-xs text-[#3F4A3D] font-medium mt-1.5 block">
              ✦ Redeemable for ₹{ecoSummary.cash_value_rupees} Order Privilege!
            </span>
          </div>

          <div className="mt-5 pt-3 border-t border-[#E4DACB] flex items-center justify-between text-xs text-[#6B5D50]">
            <span className="font-cinzel text-[11px] text-[#9B8B7A]">Status:</span>
            <span className="bg-[#EDE6DB] px-3 py-0.5 rounded-full text-[#241F1A] font-cinzel text-[11px] font-semibold border border-[#E4DACB]">
              {ecoSummary.badge_level}
            </span>
          </div>
        </div>

        {/* Containers Recycled Counter */}
        <div className="bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-cinzel font-semibold text-[#9B8B7A] uppercase tracking-[0.18em] mb-2">
            <span>Flacons Repurposed</span>
            <PackageCheck className="w-5 h-5 text-[#3F4A3D]" />
          </div>
          <div className="font-serif text-4xl text-[#241F1A]">
            {ecoSummary.containers_recycled_total} <span className="text-xs font-cinzel uppercase tracking-wider text-[#9B8B7A]">Flacons</span>
          </div>
          <p className="text-xs text-[#9B8B7A] mt-1.5">Sterilized &amp; re-circulated through clean ateliers.</p>
        </div>

        {/* CO2 Saved Counter */}
        <div className="bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-cinzel font-semibold text-[#9B8B7A] uppercase tracking-[0.18em] mb-2">
            <span>Carbon Abated</span>
            <Leaf className="w-5 h-5 text-[#3F4A3D]" />
          </div>
          <div className="font-serif text-4xl text-[#3F4A3D]">
            {ecoSummary.co2_saved_kg_total} <span className="text-xs font-cinzel uppercase tracking-wider text-[#9B8B7A]">kg CO₂</span>
          </div>
          <p className="text-xs text-[#9B8B7A] mt-1.5">Direct emissions prevented through glass circularity.</p>
        </div>

        {/* Eco Redemption Rate */}
        <div className="bg-white p-6 rounded-3xl border border-[#B08D57]/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-cinzel font-semibold text-[#B08D57] uppercase tracking-[0.18em] mb-2">
            <span>Privilege Equivalence</span>
            <Award className="w-5 h-5 text-[#B08D57]" />
          </div>
          <div className="font-serif text-4xl text-[#241F1A]">
            1 Credit = ₹1
          </div>
          <p className="text-xs text-[#9B8B7A] mt-1.5">Redeemable directly on your next atelier order.</p>
        </div>
      </div>

      {/* 3. Interactive 3-Step Recycling Process Guide */}
      <div className="bg-white p-8 rounded-3xl border border-[#E4DACB] shadow-soft">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-xs uppercase font-bold tracking-widest text-[#3F4A3D] block mb-1">
            How Circular Beauty Works
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#241F1A]">
            3 Easy Steps to Return &amp; Earn
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#F7F3ED] p-6 rounded-2xl border border-[#E4DACB] space-y-3 relative">
            <div className="w-10 h-10 rounded-full bg-[#3F4A3D] text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-serif text-base font-bold text-[#241F1A]">Save Your Empty Containers</h3>
            <p className="text-xs text-[#6B5D50] leading-relaxed">
              Rinse out your empty Skinora serum dropper bottles, shampoo pump bottles, body wash tubes, or soap tins.
            </p>
          </div>

          <div className="bg-[#F7F3ED] p-6 rounded-2xl border border-[#E4DACB] space-y-3 relative">
            <div className="w-10 h-10 rounded-full bg-[#3F4A3D] text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-serif text-base font-bold text-[#241F1A]">Schedule Free Pickup</h3>
            <p className="text-xs text-[#6B5D50] leading-relaxed">
              Fill out the simple form below. Our eco-courier will pick up the containers right from your doorstep at zero cost.
            </p>
          </div>

          <div className="bg-[#F7F3ED] p-6 rounded-2xl border border-[#E4DACB] space-y-3 relative">
            <div className="w-10 h-10 rounded-full bg-[#3F4A3D] text-white flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-serif text-base font-bold text-[#241F1A]">Get Eco-Points &amp; Discounts</h3>
            <p className="text-xs text-[#6B5D50] leading-relaxed">
              Points are credited to your account instantly! Use points as ₹1 per point cash credit at checkout.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Fraud-Proof Delivered Orders Recycling Section */}
      {!isSignedIn ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E4DACB] shadow-soft text-center space-y-5">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-3xl text-amber-600 shadow-xs">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Authentication Required
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#241F1A]">
              Sign In to Access Container Returns
            </h3>
            <p className="text-xs text-[#9B8B7A] leading-relaxed">
              To maintain the purity standards of our cosmetic sanitization line, empty packaging can only be returned for products verified in your Skinora order history.
            </p>
          </div>
          <SignInButton mode="modal">
            <button className="bg-[#3F4A3D] hover:bg-[#2C352B] text-white px-8 py-3 rounded-full text-xs font-bold shadow-soft transition-all cursor-pointer">
              Sign In to View Purchases
            </button>
          </SignInButton>
        </div>
      ) : ordersLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-[#E4DACB] text-center flex flex-col items-center justify-center space-y-3 shadow-soft">
          <RefreshCw className="w-7 h-7 text-[#3F4A3D] animate-spin" />
          <p className="text-xs text-[#9B8B7A]">Checking your purchase history for eligible recyclable containers...</p>
        </div>
      ) : eligibleOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E4DACB] shadow-soft text-center space-y-5">
          <div className="w-16 h-16 bg-[#F1EAE0] rounded-full flex items-center justify-center mx-auto text-3xl">
            🛍️
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <span className="px-3 py-1 bg-[#EDE6DB] text-[#3F4A3D] rounded-full text-[10px] font-bold uppercase tracking-wider">
              Verified Purchase Policy
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#241F1A]">
              No Purchased Products Found Eligible for Return
            </h3>
            <p className="text-xs text-[#9B8B7A] leading-relaxed">
              Under our zero-waste circular beauty policy, you can only return empty containers for products that you have previously purchased from Skinora. You have not placed any orders yet.
            </p>
          </div>
          <div className="p-4 bg-[#E8EAE3] border border-[#C8D0BE] rounded-2xl max-w-md mx-auto text-xs text-[#2C352B] font-medium space-y-1">
            <p className="font-bold flex items-center justify-center gap-1.5 text-[#241F1A]">
              <Sparkles className="w-4 h-4 text-[#3F4A3D]" /> How to unlock ₹50 Eco-Cashback:
            </p>
            <p className="text-[11px] text-[#3F4A3D]">
              Purchase any handcrafted De-Tan Soap, Kumkumadi Serum, or Herbal Shampoo, and once delivered, return its empty packaging here for 50 Eco-Points + 15% discount coupon!
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-[#3F4A3D] hover:bg-[#2C352B] text-white px-8 py-3.5 rounded-full text-xs font-bold shadow-soft hover:shadow-hover transition-all"
          >
            Explore Shop &amp; Purchase Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#D8DED1] text-[#2C352B] rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3F4A3D]" />
                <span>Verified Purchase Recycling</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-gray-900">
                Claim Packaging Return from Your Delivered Orders
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Select containers from your verified past orders below. Each returned container earns ₹50 Eco-Cashback and an instant 15% discount coupon.
              </p>
            </div>

            <div className="bg-[#E8EAE3] px-4 py-2 rounded-2xl text-[#241F1A] text-xs font-bold border border-[#C8D0BE]">
              Eligible Items: {eligibleOrders.reduce((acc, o) => acc + (o.items?.length || 0), 0)}
            </div>
          </div>

          <div className="space-y-6">
            {eligibleOrders.map((order) => (
              <div key={order.order_id} className="bg-stone-50/70 rounded-2xl border border-stone-200 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-600 pb-3 border-b border-stone-200 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-gray-900">Order #{String(order.order_id).slice(0, 12)}...</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#D8DED1] text-[#2C352B] text-[10px] font-bold">
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Ordered: {new Date(order.order_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(order.items || []).map((item) => (
                    <div
                      key={item.item_id}
                      className="bg-white rounded-2xl p-4 border border-stone-200 flex flex-col justify-between space-y-3 shadow-xs"
                    >
                      <div className="flex items-start space-x-3">
                        <img
                          src={item.image_url || '/images/detan-soap.jpg'}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover border border-stone-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif font-bold text-sm text-gray-900 truncate">
                            {item.name}
                          </h4>
                          <span className="text-[11px] text-gray-500 block">
                            Container: {item.container_type}
                          </span>
                          <span className="inline-flex items-center text-[10px] font-bold text-[#2C352B] bg-[#E8EAE3] px-2 py-0.5 rounded mt-1 border border-emerald-100">
                            +{item.recycle_points} Eco-Points Bounty (₹50 Off)
                          </span>
                        </div>
                      </div>

                      {/* Claim Status & Action */}
                      <div className="pt-2 border-t border-stone-100">
                        {item.is_recycled ? (
                          <div className="bg-[#E8EAE3] p-3 rounded-xl border border-[#C8D0BE] text-xs">
                            <div className="flex items-center justify-between text-[#241F1A] font-bold mb-1">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-[#3F4A3D]" />
                                Returned &amp; Verified
                              </span>
                              <span className="text-[10px] uppercase font-mono text-[#3F4A3D] bg-white px-2 py-0.5 rounded border">
                                Points Credited
                              </span>
                            </div>
                            {item.coupon_code && (
                              <div className="mt-2 space-y-1.5">
                                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#B8C2AC]">
                                  <span className="font-mono font-bold text-xs text-emerald-950">
                                    {item.coupon_code} (15% OFF)
                                  </span>
                                  <button
                                    onClick={() => copyCouponToClipboard(item.coupon_code)}
                                    className="px-2.5 py-1 bg-[#3F4A3D] hover:bg-[#2C352B] text-white rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                  >
                                    {copiedCoupon === item.coupon_code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedCoupon === item.coupon_code ? 'Copied' : 'Copy'}</span>
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleApplyCouponToCart(item.coupon_code)}
                                  disabled={applyingCoupon === item.coupon_code}
                                  className="w-full py-2 px-3 bg-[#3F4A3D] hover:bg-[#2C352B] disabled:opacity-60 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  {applyingCoupon === item.coupon_code ? (
                                    <><RefreshCw className="w-3 h-3 animate-spin" /><span>Applying...</span></>
                                  ) : (
                                    <><Tag className="w-3 h-3" /><span>Apply Coupon to Cart</span></>
                                  )}
                                </button>
                                {applyCouponMsg[item.coupon_code] && (
                                  <p className={`text-[11px] font-semibold text-center ${applyCouponMsg[item.coupon_code].type === 'success' ? 'text-[#3F4A3D]' : 'text-red-600'}`}>
                                    {applyCouponMsg[item.coupon_code].text}
                                    {applyCouponMsg[item.coupon_code].type === 'success' && (
                                      <button onClick={() => navigate('/cart')} className="ml-1 underline font-bold">Go to Cart →</button>
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleClaimItem(order, item)}
                            disabled={claimingItemId === item.item_id}
                            className="w-full py-2.5 px-4 bg-[#2C352B] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            {claimingItemId === item.item_id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Processing Return &amp; Minting Coupon...</span>
                              </>
                            ) : (
                              <>
                                <Gift className="w-3.5 h-3.5" />
                                <span>Return Empty Container &amp; Earn ₹50</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Container Return History Tracking Table */}
      {isSignedIn && eligibleOrders.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E4DACB] shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4DACB] pb-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#241F1A]">Your Verified Return History</h3>
              <p className="text-xs text-[#9B8B7A]">Track returned packaging &amp; credited Eco-Points</p>
            </div>
            <span className="text-xs text-[#3F4A3D] font-bold bg-[#EDE6DB] px-3 py-1 rounded-full">
              {eligibleOrders.reduce((acc, o) => acc + (o.items || []).filter(i => i.is_recycled).length, 0)} Returned
            </span>
          </div>

          {eligibleOrders.some(o => (o.items || []).some(i => i.is_recycled)) ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-[#6B5D50]">
                <thead className="bg-[#F7F3ED] text-[#241F1A] uppercase font-bold text-[10px] tracking-wider border-b border-[#E4DACB]">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Container Type</th>
                    <th className="py-3 px-4">Coupon Code</th>
                    <th className="py-3 px-4">Points Awarded</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DACB]">
                  {eligibleOrders.flatMap(o => (o.items || []).filter(i => i.is_recycled).map(item => (
                    <tr key={item.item_id} className="hover:bg-[#F7F3ED]/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#241F1A]">{item.name}</td>
                      <td className="py-3 px-4 text-[#6B5D50]">{item.container_type}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#3F4A3D]">{item.coupon_code || '15% OFF'}</td>
                      <td className="py-3 px-4 font-bold text-[#3F4A3D]">+{item.recycle_points} Pts</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D8DED1] text-[#2C352B]">
                          Credited &amp; Sanitized
                        </span>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic text-center py-4">
              No containers returned yet. Click "Return Empty Container" on any of your eligible delivered items above!
            </p>
          )}
        </div>
      )}

    </div>
  );
}
