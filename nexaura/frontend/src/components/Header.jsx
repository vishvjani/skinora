import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, Heart, Menu, X, User, SlidersHorizontal, Plus } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const ANNOUNCEMENTS = [
  'Complimentary White-Glove Shipping Across India on Orders Above ₹499',
  'Haute Botanical Formulation · Kashmiri Mogra Saffron & 24K Kumkumadi Elixir',
  'Circular Beauty Privilege · Return Empty Glass Jars, Earn 100% Eco-Credit',
  'Clinical Purity · NABL Accredited QC · Hand-Harvested in Small Batches',
  'Private Patron Code WELCOME10 for 10% Off Your Curated Ritual',
];

const NAV_LINKS = [
  { name: 'Shop All', path: '/shop' },
  { name: 'AI Skin Scanner', path: '/skin-analyzer' },
  { name: 'Consultation', path: '/consultation' },
  { name: 'Verify Batch', path: '/verify-batch' },
  { name: 'Recycle', path: '/recycle' },
];

function Marquee() {
  // Duplicate the list so the track loops seamlessly.
  const items = [...ANNOUNCEMENTS, ...ANNOUNCEMENTS];
  return (
    <div className="overflow-hidden bg-[#3F4A3D] text-[#F2EBE0]">
      <div className="marquee-track animate-marquee py-2.5">
        {items.map((text, i) => (
          <span
            key={i}
            className="mx-8 text-[11px] font-medium uppercase tracking-[0.22em] flex items-center gap-8"
          >
            {text}
            <span className="text-[#B08D57]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function NavLink({ link, active, onClick }) {
  return (
    <Link
      to={link.path}
      onClick={onClick}
      className={`relative py-1.5 text-[13px] font-medium tracking-wide transition-colors duration-200 ${
        active ? 'text-[#241F1A]' : 'text-[#6B5D50] hover:text-[#241F1A]'
      }`}
    >
      {link.name}
      <span
        className={`absolute -bottom-0.5 left-0 h-px bg-[#241F1A] transition-transform duration-300 origin-left ${
          active ? 'w-full scale-x-100' : 'w-full scale-x-0 group-hover:scale-x-100'
        }`}
      />
    </Link>
  );
}

function IconAction({ to, onClick, label, count, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group relative flex items-center justify-center rounded-full p-2 text-[#241F1A] transition-colors duration-200 hover:text-[#3F4A3D]"
    >
      {children}
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#241F1A] px-1 text-[9px] font-semibold text-[#F7F3ED]">
          {count}
        </span>
      )}
    </button>
  );
}

export default function Header() {
  const { cartCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-40">
      <Marquee />

      <div
        className={`transition-all duration-300 ${
          scrolled ? 'glass shadow-soft' : 'bg-[#F7F3ED]'
        } border-b border-[#E4DACB]`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-[68px] items-center justify-between gap-4 lg:gap-8">
            {/* Left: mobile toggle */}
            <div className="flex items-center gap-3 lg:gap-6 flex-1 lg:flex-none">
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="lg:hidden -ml-1 p-1.5 text-[#241F1A] transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-7">
                {NAV_LINKS.slice(0, 3).map((link) => {
                  const active = location.pathname === link.path;
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`relative py-1.5 text-[13px] font-medium tracking-wide transition-colors duration-200 ${
                        active ? 'text-[#241F1A]' : 'text-[#6B5D50] hover:text-[#241F1A]'
                      }`}
                    >
                      {link.name}
                      <span
                        className={`absolute -bottom-0.5 left-0 h-px bg-[#241F1A] transition-transform duration-300 origin-left ${
                          active ? 'w-full scale-x-100' : 'w-full scale-x-0'
                        }`}
                      />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Center: Atelier Brand Seal & Wordmark */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3.5 group flex-shrink-0">
              <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-[#B08D57]/70 bg-gradient-to-br from-[#EDE6DB] to-[#F7F3ED] shadow-xs transition-transform duration-500 group-hover:scale-105 group-hover:border-[#B08D57]">
                <div className="absolute inset-1 rounded-full border border-[#B08D57]/30" />
                <span className="font-serif font-bold text-sm sm:text-lg text-[#241F1A]">
                  S
                </span>
              </div>
              <div className="flex flex-col text-left">
                <span className="font-cinzel text-[17px] sm:text-[24px] font-bold leading-none tracking-[0.2em] sm:tracking-[0.24em] text-[#241F1A] transition-colors duration-300 group-hover:text-[#3F4A3D]">
                  SKINORA
                </span>
                <span className="mt-0.5 sm:mt-1 text-[7px] sm:text-[8px] uppercase tracking-[0.24em] sm:tracking-[0.34em] text-[#9B8B7A] font-medium">
                  Botanical Atelier · Kashmir
                </span>
              </div>
            </Link>

            {/* Right: actions */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-3 flex-1 lg:flex-none">
              {/* Desktop search */}
              <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative">
                <input
                  type="text"
                  placeholder="Search rituals, serums…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-44 lg:w-56 bg-transparent border-b border-transparent focus:border-[#241F1A] focus:outline-none pl-7 pr-3 py-2 text-[13px] text-[#241F1A] placeholder:text-[#9B8B7A] transition-colors"
                />
                <Search className="w-4 h-4 text-[#9B8B7A] absolute left-0 pointer-events-none" />
              </form>

              {/* Mobile search toggle */}
              <button
                onClick={() => setIsSearchOpen((v) => !v)}
                className="md:hidden p-2 text-[#241F1A] transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Desktop filter shortcut */}
              <button
                onClick={() => navigate('/shop?filter=open')}
                className="hidden lg:block p-2 text-[#241F1A] hover:text-[#3F4A3D] transition-colors"
                aria-label="Filter products"
                title="Filter products"
              >
                <SlidersHorizontal className="w-[18px] h-[18px]" />
              </button>

              {/* Account / auth */}
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E4DACB] px-4 py-2 text-[12px] font-medium tracking-wide text-[#241F1A] transition-all duration-300 hover:border-[#241F1A] hover:bg-[#241F1A] hover:text-[#F7F3ED]"
                    title="Sign in / Register"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Sign in</span>
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <div className="flex items-center gap-2">
                  <Link to="/account" className="p-2 text-[#241F1A] hover:text-[#3F4A3D] transition-colors" title="My account">
                    <User className="w-[18px] h-[18px]" />
                  </Link>
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        userButtonAvatarBox:
                          'w-8 h-8 ring-2 ring-[#E4DACB] hover:ring-[#241F1A] transition-all rounded-full',
                      },
                    }}
                  />
                </div>
              </SignedIn>

              {/* Wishlist */}
              <IconAction
                to="/wishlist"
                label="Wishlist"
                count={wishlistCount}
                onClick={() => navigate('/wishlist')}
              >
                <Heart className="w-[18px] h-[18px]" />
              </IconAction>

              {/* Cart */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-2 rounded-full bg-[#241F1A] px-4 py-2 text-[12px] font-medium tracking-wide text-[#F7F3ED] transition-all duration-300 hover:bg-[#3F4A3D] active:scale-[0.97]"
              >
                <ShoppingBag className="w-[15px] h-[15px]" />
                <span className="hidden sm:inline">Cart</span>
                <span className="text-[#B08D57]">({cartCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary nav row (desktop) — remaining links + shop categories */}
        <div className="hidden lg:block border-t border-[#E4DACB]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-7 py-2.5">
            {NAV_LINKS.slice(3).map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`relative text-[12px] tracking-wide transition-colors duration-200 ${
                    active ? 'text-[#241F1A]' : 'text-[#9B8B7A] hover:text-[#241F1A]'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <span className="h-3 w-px bg-[#E4DACB]" />
            <Link
              to="/shop?category=soaps"
              className="text-[12px] tracking-wide text-[#9B8B7A] hover:text-[#241F1A] transition-colors"
            >
              Soaps
            </Link>
            <Link
              to="/shop?category=serums"
              className="text-[12px] tracking-wide text-[#9B8B7A] hover:text-[#241F1A] transition-colors"
            >
              Serums
            </Link>
            <Link
              to="/shop?category=combos"
              className="text-[12px] tracking-wide text-[#9B8B7A] hover:text-[#241F1A] transition-colors"
            >
              Ritual Sets
            </Link>
          </div>
        </div>

        {/* Mobile search expand */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden border-t border-[#E4DACB]/60"
            >
              <form onSubmit={handleSearchSubmit} className="flex items-center relative px-4 py-3">
                <input
                  type="text"
                  placeholder="Search rituals, serums…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#EDE6DB] border-b border-[#241F1A] focus:outline-none pl-9 pr-4 py-2.5 text-sm text-[#241F1A]"
                  autoFocus
                />
                <Search className="w-4 h-4 text-[#241F1A] absolute left-7 top-5 pointer-events-none" />
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile drawer menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden overflow-hidden border-t border-[#E4DACB]"
            >
              <div className="bg-[#F7F3ED] px-4 py-5 space-y-5">
                {/* Auth */}
                <div className="pb-4 border-b border-[#E4DACB]">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center gap-2 bg-[#241F1A] text-[#F7F3ED] py-3 rounded-full text-xs font-semibold uppercase tracking-[0.16em]"
                      >
                        <User className="w-4 h-4" />
                        Sign in / Register
                      </button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#E4DACB]">
                      <div className="flex items-center gap-2.5">
                        <UserButton afterSignOutUrl="/" />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-[#241F1A] truncate max-w-[150px]">
                            {user?.fullName || user?.username || 'My Profile'}
                          </p>
                          <p className="text-[10px] text-[#9B8B7A] truncate max-w-[150px]">
                            {user?.primaryEmailAddress?.emailAddress}
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/account"
                        className="text-xs font-medium text-[#241F1A] bg-[#EDE6DB] px-3 py-1.5 rounded-full"
                      >
                        Dashboard
                      </Link>
                    </div>
                  </SignedIn>
                </div>

                {/* Nav */}
                <div>
                  <p className="eyebrow mb-3">Explore</p>
                  <div className="space-y-1">
                    {NAV_LINKS.map((link) => (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between py-2.5 text-[15px] font-medium text-[#241F1A]"
                      >
                        {link.name}
                        <Plus className="w-4 h-4 text-[#9B8B7A]" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Admin */}
                <div className="pt-4 border-t border-[#E4DACB]">
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#9B8B7A]"
                  >
                    <span>Admin Portal</span>
                    <span className="text-[10px] text-[#9B8B7A]">admin / admin123</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
