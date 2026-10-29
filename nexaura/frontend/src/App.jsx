import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import WishlistPage from './pages/WishlistPage';
import SearchPage from './pages/SearchPage';
import AccountPage from './pages/AccountPage';
import RecyclePage from './pages/RecyclePage';
import BatchVerifyPage from './pages/BatchVerifyPage';
import SkinAnalyzerPage from './pages/SkinAnalyzerPage';
import ConsultationPage from './pages/ConsultationPage';
import AdminPortalPage from './pages/AdminPortalPage';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ClerkProvider } from '@clerk/clerk-react';
import AuthSync from './components/AuthSync';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_ZW1lcmdpbmctZmVsaW5lLTUzLmNsZXJrLmFjY291bnRzLmRldiQ';

// Smooth scroll restoration on route change — a quiet premium detail.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

// Floating AI Skin Concierge Pill
function FloatingSkinConcierge() {
  const location = useLocation();
  if (['/skin-analyzer', '/checkout', '/admin'].includes(location.pathname)) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 animate-fadeIn">
      <Link
        to="/skin-analyzer"
        className="group flex items-center gap-2 sm:gap-2.5 rounded-full border border-[#B08D57]/60 bg-[#241F1A]/95 text-[#F7F3ED] pl-3 pr-3.5 sm:pl-3.5 sm:pr-4 py-2 sm:py-2.5 backdrop-blur-md shadow-card transition-all duration-300 hover:scale-105 hover:bg-[#241F1A] hover:border-[#B08D57] hover:shadow-hover"
      >
        <div className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#B08D57] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#B08D57]" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-[#F7F3ED] group-hover:text-[#B08D57] transition-colors">
            AI Skin Scanner
          </span>
          <span className="text-[8px] sm:text-[8.5px] text-[#9B8B7A]">
            Multimodal Diagnostic
          </span>
        </div>
        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B08D57] ml-0.5" />
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AuthSync />
      <WishlistProvider>
        <CartProvider>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col justify-between bg-[#F7F3ED] text-[#241F1A] antialiased overflow-x-hidden w-full max-w-full">
          <Header />
          <CartDrawer />
          
          <main className="flex-grow w-full max-w-full overflow-x-hidden">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-success" element={<OrderSuccessPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/recycle" element={<RecyclePage />} />
              <Route path="/verify-batch" element={<BatchVerifyPage />} />
              <Route path="/verify-batch/:batchId" element={<BatchVerifyPage />} />
              <Route path="/skin-analyzer" element={<SkinAnalyzerPage />} />
              <Route path="/consultation" element={<ConsultationPage />} />
              <Route path="/admin" element={<AdminPortalPage />} />
              <Route path="/admin/dashboard" element={<AdminPortalPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>

          <Footer />
          <FloatingSkinConcierge />
        </div>
      </CartProvider>
    </WishlistProvider>
  </ClerkProvider>
  );
}
