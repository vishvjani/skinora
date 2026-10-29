import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser, useAuth, SignInButton, SignOutButton } from '@clerk/clerk-react';
import {
  User as UserIcon,
  Package,
  MapPin,
  Heart,
  ShieldCheck,
  Leaf,
  CheckCircle2,
  LogOut,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { getApiBaseUrl } from '../services/api';

const API_BASE_URL = getApiBaseUrl();

export default function AccountPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const [dbUser, setDbUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Sync user to DB and fetch profile + eco points
  useEffect(() => {
    if (!isSignedIn || !user) return;

    const cached = sessionStorage.getItem('skinora_db_user');
    if (cached) {
      try { setDbUser(JSON.parse(cached)); } catch (e) { /* ignore */ }
    }

    const fetchDbProfile = async () => {
      try {
        const token = await getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(`${API_BASE_URL}/api/users/profile/${user.id}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setDbUser(data);
          sessionStorage.setItem('skinora_db_user', JSON.stringify(data));
        } else {
          // Auto-sync user to DB
          const syncRes = await fetch(`${API_BASE_URL}/api/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              full_name:
                user.fullName ||
                `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                user.username,
              avatar_url: user.imageUrl,
            }),
          });
          if (syncRes.ok) {
            const data = await syncRes.json();
            setDbUser(data);
            sessionStorage.setItem('skinora_db_user', JSON.stringify(data));
          }
        }
      } catch (err) {
        console.warn('Error fetching DB profile:', err);
      }
    };

    fetchDbProfile();
  }, [isSignedIn, user, getToken]);

  // Fetch real orders from DB (with localStorage fallback)
  useEffect(() => {
    if (!isSignedIn || !user) return;

    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const token = await getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}/api/orders?page=1&page_size=10`, { headers });
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : []);
        } else {
          const local = JSON.parse(localStorage.getItem(`skinora_orders_${user.id}`) || '[]');
          setOrders(local.slice(0, 10));
        }
      } catch {
        const local = JSON.parse(localStorage.getItem(`skinora_orders_${user?.id}`) || '[]');
        setOrders(local.slice(0, 10));
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [isSignedIn, user, getToken]);

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}`.toUpperCase()
    : 'NX';

  const statusColor = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'delivered') return 'bg-[#D8DED1] text-[#2C352B]';
    if (s === 'confirmed' || s === 'processing') return 'bg-sky-100 text-sky-800';
    if (s === 'cancelled') return 'bg-[#EAD9D2] text-[#9A4A3A]';
    return 'bg-amber-100 text-amber-800';
  };

  if (!isLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-[#3F4A3D] animate-spin" />
        <p className="text-sm text-[#9B8B7A]">Loading your account...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 animate-fadeIn">
        <div className="bg-white rounded-3xl border border-[#E4DACB] p-8 sm:p-12 text-center shadow-soft space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#EDE6DB] border border-[#E4DACB] flex items-center justify-center text-[#3F4A3D] shadow-inner">
            <Sparkles className="w-10 h-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold text-[#241F1A]">Welcome to Nexaura</h1>
            <p className="text-sm text-[#9B8B7A] max-w-md mx-auto">
              Sign in to access order tracking, 150 free Eco-Points, and your AI skin diagnostics.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-4">
            <SignInButton mode="modal">
              <button className="bg-gradient-to-r from-[#3F4A3D] to-[#2C352B] text-white px-8 py-3 rounded-full text-sm font-semibold shadow-soft transition-all flex items-center justify-center gap-2">
                <UserIcon className="w-4 h-4" /> Sign In / Create Account
              </button>
            </SignInButton>
            <Link to="/shop" className="px-6 py-3 rounded-full text-sm font-semibold text-[#6B5D50] bg-[#F7F3ED] hover:bg-[#EDE6DB] border border-[#E4DACB] transition-all">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#E4DACB] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#241F1A]">My Account</h1>
          <p className="text-xs text-[#9B8B7A] mt-1">Orders synced with Neon PostgreSQL</p>
        </div>
        <SignOutButton>
          <button className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#9A4A3A] bg-[#F3E8E2] hover:bg-[#EAD9D2] border border-[#E0C9BF] transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </SignOutButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Profile */}
        <div className="bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-soft space-y-5 h-fit">
          <div className="flex items-center gap-3.5 pb-4 border-b border-[#E4DACB]">
            {user.imageUrl ? (
              <img src={user.imageUrl} alt={user.fullName || 'User'} className="w-14 h-14 rounded-full object-cover border-2 border-[#3F4A3D]/40" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#EDE6DB] flex items-center justify-center text-xl font-serif font-bold text-[#3F4A3D]">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-serif font-bold text-base text-[#241F1A] truncate">
                {user.fullName || user.username || 'Nexaura Member'}
              </h3>
              <span className="text-xs text-[#9B8B7A] block truncate">{user.primaryEmailAddress?.emailAddress}</span>
              <span className="text-[10px] text-[#3F4A3D] bg-[#E8EAE3] px-2 py-0.5 rounded font-bold inline-block mt-1 border border-emerald-100">
                ✓ Verified Customer
              </span>
            </div>
          </div>

          {/* Live Eco-Points */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F7F3ED] to-[#EDE6DB] border border-[#E4DACB] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-[#3F4A3D]"><Leaf className="w-4 h-4" /> Eco-Points Balance</span>
              <span className="text-sm font-bold text-[#3F4A3D]">{dbUser?.eco_points ?? 150} pts</span>
            </div>
            <p className="text-[11px] text-[#9B8B7A]">50 pts per recycled container • ₹1 per point at checkout</p>
          </div>

          <div className="space-y-1 text-xs">
            <Link to="/wishlist" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#F7F3ED] text-[#241F1A] transition-colors">
              <Heart className="w-4 h-4 text-[#3F4A3D]" /> Saved Wishlist
            </Link>
            <Link to="/recycle" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#F7F3ED] text-[#241F1A] transition-colors">
              <Leaf className="w-4 h-4 text-[#3F4A3D]" /> Return Containers → Eco-Cashback
            </Link>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#F7F3ED] cursor-pointer transition-colors">
              <MapPin className="w-4 h-4 text-[#3F4A3D]" /> Saved Addresses
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#F7F3ED] cursor-pointer transition-colors">
              <ShieldCheck className="w-4 h-4 text-[#3F4A3D]" /> Security &amp; Sessions
            </div>
          </div>
        </div>

        {/* Right: Orders + Skin Diagnostic */}
        <div className="lg:col-span-2 space-y-6">

          {/* Orders */}
          <div className="bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4DACB] pb-3">
              <h2 className="font-serif font-bold text-lg text-[#241F1A] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#3F4A3D]" /> Order History
              </h2>
              {ordersLoading && <RefreshCw className="w-4 h-4 text-[#3F4A3D] animate-spin" />}
            </div>

            {ordersLoading ? (
              <div className="py-8 flex flex-col items-center gap-2 text-[#9B8B7A]">
                <RefreshCw className="w-6 h-6 animate-spin text-[#3F4A3D]" />
                <p className="text-xs">Loading your orders from database...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <ShoppingBag className="w-10 h-10 text-[#9B8B7A]/40 mx-auto" />
                <p className="text-sm text-[#9B8B7A]">No orders yet.</p>
                <Link to="/shop" className="inline-block px-5 py-2 rounded-xl text-xs font-semibold bg-[#3F4A3D] text-white hover:bg-[#2C352B] transition-colors">
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const orderId = order.id || order.display_id || '';
                  const displayId = typeof orderId === 'string' && orderId.length > 8
                    ? orderId.slice(0, 8).toUpperCase()
                    : String(orderId).toUpperCase();
                  const itemCount = order.items?.length || 0;
                  const dateStr = order.created_at
                    ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : order.date
                    ? new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Recently';

                  return (
                    <div key={String(orderId)} className="p-4 rounded-2xl bg-[#F7F3ED] border border-[#E4DACB] space-y-3 hover:border-[#3F4A3D]/30 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#241F1A]">Order #{displayId}</span>
                          <span className="text-[#9B8B7A] flex items-center gap-1 text-[11px] mt-0.5">
                            <Clock className="w-3 h-3" /> {dateStr}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${statusColor(order.status)}`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {(order.status || 'confirmed').charAt(0).toUpperCase() + (order.status || '').slice(1)}
                        </span>
                      </div>

                      {itemCount > 0 && (
                        <p className="text-[11px] text-[#6B5D50]">
                          <span className="font-semibold">Items ({itemCount}): </span>
                          <span className="text-[#9B8B7A]">
                            {(order.items || []).slice(0, 2).map(i => i.product?.name || i.name || 'Product').join(', ')}
                            {itemCount > 2 && ` +${itemCount - 2} more`}
                          </span>
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-[#E4DACB] text-xs">
                        <span className="font-bold text-[#241F1A]">
                          ₹{Number(order.final_amount || order.total || 0).toFixed(0)}
                          {order.payment_method && (
                            <span className="text-[#9B8B7A] font-normal ml-1.5">• {order.payment_method.toUpperCase()}</span>
                          )}
                        </span>
                        <Link to="/recycle" className="text-[#3F4A3D] font-semibold hover:underline flex items-center gap-0.5 text-[11px]">
                          Recycle for Eco-Points <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Skin Diagnostic CTA */}
          <div className="bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-soft">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-sm text-[#241F1A]">✨ AI Skin Diagnostic</h4>
                <p className="text-xs text-[#9B8B7A]">
                  Gemini 2.0 Vision face scan → personalized skincare routine with matched products.
                </p>
              </div>
              <Link to="/skin-analyzer" className="whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#3F4A3D] hover:bg-[#2C352B] transition-colors">
                Scan My Skin
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
