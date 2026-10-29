import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ShieldCheck, Truck, RefreshCw, Leaf, Check } from 'lucide-react';

const TRUST = [
  { icon: Leaf, title: 'Clean formulas', sub: 'No parabens, sulfates or mineral oil' },
  { icon: Truck, title: 'Complimentary shipping', sub: 'On all orders over ₹499' },
  { icon: ShieldCheck, title: 'Traceable batches', sub: 'Lab-verified provenance per jar' },
  { icon: RefreshCw, title: 'Empty-jar returns', sub: 'Earn Eco-Points on every recycle' },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  return (
    <footer className="bg-[#EDE6DB] text-[#241F1A]">
      {/* Trust strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 border-y border-[#E4DACB] py-10">
          {TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#E4DACB] bg-[#F7F3ED] text-[#3F4A3D]">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold tracking-tight">{t.title}</h4>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B5D50]">{t.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Brand */}
        <div className="md:col-span-4 space-y-5">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#B08D57]/70 bg-gradient-to-br from-[#EDE6DB] to-[#F7F3ED] shadow-xs">
              <span className="font-serif font-bold text-sm text-[#241F1A]">S</span>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-cinzel text-2xl font-bold tracking-[0.24em] text-[#241F1A]">SKINORA</span>
              <span className="text-[7.5px] uppercase tracking-[0.32em] text-[#9B8B7A] font-medium">Botanical Atelier</span>
            </div>
          </Link>
          <p className="text-[13px] leading-relaxed text-[#6B5D50] max-w-sm">
            Haute botanical formulation. Small-batch, cold-pressed elixirs engineered from traceable Kashmiri Mogra saffron, unpasteurized pasture goat milk, and pure bioactives.
          </p>
          <div className="space-y-2 text-[12px] text-[#6B5D50] pt-1">
            <p className="flex items-center gap-2.5">
              <Phone className="w-3.5 h-3.5 text-[#3F4A3D]" strokeWidth={1.6} /> 1800-SKINORA · Atelier Concierge (10am–7pm)
            </p>
            <p className="flex items-center gap-2.5">
              <Mail className="w-3.5 h-3.5 text-[#3F4A3D]" strokeWidth={1.6} /> concierge@skinora.com
            </p>
            <p className="flex items-center gap-2.5">
              <MapPin className="w-3.5 h-3.5 text-[#3F4A3D]" strokeWidth={1.6} /> Formulations: Solan · Pampore Valley · Paris
            </p>
          </div>
        </div>

        {/* Shop */}
        <div className="md:col-span-2">
          <h4 className="eyebrow mb-4">Shop</h4>
          <ul className="space-y-2.5 text-[13px] text-[#6B5D50]">
            <li><Link to="/shop" className="hover:text-[#241F1A] transition-colors">All products</Link></li>
            <li><Link to="/shop?category=soaps" className="hover:text-[#241F1A] transition-colors">De-Tan soaps</Link></li>
            <li><Link to="/shop?category=serums" className="hover:text-[#241F1A] transition-colors">Face serums</Link></li>
            <li><Link to="/shop?category=facewash" className="hover:text-[#241F1A] transition-colors">Cleansers</Link></li>
            <li><Link to="/shop?category=body" className="hover:text-[#241F1A] transition-colors">Body care</Link></li>
            <li><Link to="/shop?category=combos" className="hover:text-[#241F1A] transition-colors">Ritual sets</Link></li>
          </ul>
        </div>

        {/* Customer care */}
        <div className="md:col-span-2">
          <h4 className="eyebrow mb-4">Customer</h4>
          <ul className="space-y-2.5 text-[13px] text-[#6B5D50]">
            <li><Link to="/account" className="hover:text-[#241F1A] transition-colors">Track order</Link></li>
            <li><a href="#shipping" className="hover:text-[#241F1A] transition-colors">Shipping</a></li>
            <li><a href="#returns" className="hover:text-[#241F1A] transition-colors">Returns &amp; refunds</a></li>
            <li><a href="#privacy" className="hover:text-[#241F1A] transition-colors">Privacy policy</a></li>
            <li><a href="#faq" className="hover:text-[#241F1A] transition-colors">FAQs</a></li>
            <li><Link to="/recycle" className="hover:text-[#241F1A] transition-colors">Recycle program</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="md:col-span-4">
          <h4 className="eyebrow mb-4">The Beauty Circle</h4>
          <p className="text-[13px] text-[#6B5D50] mb-4 leading-relaxed">
            Join for early access to new rituals, skincare notes and a 10% code on your first order.
          </p>
          {subscribed ? (
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#E4DACB] bg-[#F7F3ED] px-4 py-3 text-[13px] text-[#3F4A3D]">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Welcome to the Circle — your code is on its way.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="flex items-center bg-[#F7F3ED] border border-[#E4DACB] rounded-full pl-5 pr-1.5 py-1.5 focus-within:border-[#241F1A] transition-colors">
                <input
                  type="email"
                  required
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] text-[#241F1A] placeholder:text-[#9B8B7A] focus:outline-none py-1"
                />
                <button
                  type="submit"
                  className="rounded-full bg-[#241F1A] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F7F3ED] transition-colors hover:bg-[#3F4A3D]"
                >
                  Join
                </button>
              </div>
              <p className="text-[11px] text-[#9B8B7A]">By subscribing you agree to our privacy policy.</p>
            </form>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#E4DACB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[#9B8B7A]">
            © {new Date().getFullYear()} Skinora. Crafted in small batches.
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {['UPI', 'GPay', 'PhonePe', 'VISA', 'Mastercard', 'COD'].map((p) => (
              <span
                key={p}
                className="rounded-full border border-[#E4DACB] bg-[#F7F3ED] px-3 py-1 text-[10px] font-semibold tracking-wider text-[#6B5D50]"
              >
                {p}
              </span>
            ))}
            <Link
              to="/admin"
              className="ml-1 rounded-full border border-[#E4DACB] bg-[#F7F3ED] px-3 py-1 text-[10px] font-semibold tracking-wider text-[#9B8B7A] hover:text-[#241F1A] transition-colors"
              title="Admin portal"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
