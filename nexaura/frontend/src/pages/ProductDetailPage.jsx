import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, Heart, ShoppingBag, Truck, ShieldCheck, RefreshCw,
  Check, Plus, Minus, ChevronRight, QrCode, Leaf, Award,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { apiService } from '../services/api';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import { PRODUCT_FALLBACK_IMAGES } from '../services/fallbackData';

const TABS = [
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'description', label: 'Description' },
  { id: 'usage', label: 'How to use' },
  { id: 'transparency', label: 'Batch & lab report' },
];

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('ingredients');
  const [loading, setLoading] = useState(true);
  const [isAdded, setIsAdded] = useState(false);

  const getCategoryFallback = (prod) => {
    if (!prod) return PRODUCT_FALLBACK_IMAGES.soaps;
    const cat = (prod.category || prod.subcategory || '').toLowerCase();
    if (cat.includes('shampoo') || cat.includes('hair')) return PRODUCT_FALLBACK_IMAGES.shampoo;
    if (cat.includes('soap')) return PRODUCT_FALLBACK_IMAGES.soaps;
    if (cat.includes('serum')) return PRODUCT_FALLBACK_IMAGES.serums;
    if (cat.includes('body')) return PRODUCT_FALLBACK_IMAGES.bodywash;
    if (cat.includes('sun')) return PRODUCT_FALLBACK_IMAGES.sunscreen;
    if (cat.includes('mask') || cat.includes('scrub')) return PRODUCT_FALLBACK_IMAGES.masks;
    if (cat.includes('lip')) return PRODUCT_FALLBACK_IMAGES.lipcare;
    if (cat.includes('combo')) return PRODUCT_FALLBACK_IMAGES.combos;
    return PRODUCT_FALLBACK_IMAGES.soaps;
  };

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      const data = await apiService.getProductBySlug(slug);
      setProduct(data);
      setSelectedImage(data.image_url || getCategoryFallback(data));
      const recs = await apiService.getRecommendations(data.id);
      setRecommendations(recs);
      setLoading(false);
      window.scrollTo(0, 0);
    }
    loadProduct();
  }, [slug]);

  if (loading || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="w-10 h-10 border-2 border-[#241F1A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[13px] text-[#9B8B7A]">Loading…</p>
      </div>
    );
  }

  const isFavorite = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigate('/checkout');
  };

  const handleMainImageError = () => setSelectedImage(getCategoryFallback(product));

  const galleryImages = [
    selectedImage,
    product.secondary_image || getCategoryFallback(product),
    getCategoryFallback(product),
  ].filter(Boolean);

  const batchNo = product.batch_number || `SKIN-2026-B${product.id}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-14 animate-fadeIn">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[12px] text-[#9B8B7A]">
        <Link to="/" className="hover:text-[#241F1A] transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/shop" className="hover:text-[#241F1A] transition-colors">Shop</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#241F1A] font-medium truncate">{product.name}</span>
      </nav>

      {/* Main */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-4 lg:sticky lg:top-40 lg:self-start">
          <Reveal>
            <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-[#EDE6DB] border border-[#E4DACB]">
              <img
                src={selectedImage}
                alt={product.name}
                onError={handleMainImageError}
                className="h-full w-full object-cover transition-transform duration-700"
              />
              <div className="absolute left-4 top-4 flex flex-col gap-2">
                {product.is_bestseller && (
                  <span className="rounded-full bg-[#F7F3ED] border border-[#E4DACB] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#241F1A]">Bestseller</span>
                )}
                {product.discount_percent > 0 && (
                  <span className="rounded-full bg-[#B5755A] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F7F3ED]">−{product.discount_percent}%</span>
                )}
              </div>
            </div>
          </Reveal>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all bg-[#EDE6DB] ${
                  selectedImage === img ? 'border-[#241F1A] opacity-100' : 'border-[#E4DACB] opacity-65 hover:opacity-100'
                }`}
              >
                <img src={img} alt="thumbnail" onError={(e) => { e.target.src = getCategoryFallback(product); }} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <Reveal delay={0.05} className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-cinzel text-xs font-semibold uppercase tracking-[0.26em] text-[#B08D57]">
              {product.brand || 'SKINORA ATELIER'}
            </span>
            <button
              onClick={() => toggleWishlist(product)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
                isFavorite ? 'border-[#B08D57] bg-[#241F1A] text-[#B08D57]' : 'border-[#E4DACB] bg-[#F7F3ED] text-[#241F1A] hover:border-[#B08D57]'
              }`}
              title={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl tracking-editorial leading-[1.04] text-[#241F1A] text-balance">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-3 text-[13px] text-[#6B5D50]">
            <div className="flex items-center gap-1.5 rounded-full border border-[#B08D57]/40 bg-[#EDE6DB]/60 px-3 py-1 font-semibold text-[#241F1A]">
              <Star className="w-4 h-4 fill-[#B08D57] text-[#B08D57]" />
              {product.rating || 4.8}
            </div>
            <span className="text-[#9B8B7A]">✦ {product.review_count || 1200} Verified Atelier Reviews</span>
          </div>

          {/* Price */}
          <div className="flex items-end gap-4 pt-2">
            <span className="font-serif text-4xl text-[#241F1A]">₹{product.price}</span>
            {product.mrp > product.price && <span className="font-serif text-lg text-[#9B8B7A] line-through">₹{product.mrp}</span>}
            {product.discount_percent > 0 && (
              <span className="badge-luxury text-[11px]">
                Privilege Benefit −{product.discount_percent}% (Save ₹{product.mrp - product.price})
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#9B8B7A] -mt-2">Inclusive of all duties & taxes · Complimentary dispatch above ₹499</p>

          {/* Form / size */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-2xl border border-[#E4DACB] bg-white p-4 shadow-sm">
              <span className="block font-cinzel text-[10px] uppercase tracking-[0.2em] text-[#9B8B7A]">Galenic Formulation</span>
              <span className="text-[15px] font-serif font-medium text-[#241F1A] mt-0.5 block">{product.form || 'Handmade Cold-Pressed Bar'}</span>
            </div>
            <div className="rounded-2xl border border-[#E4DACB] bg-white p-4 shadow-sm">
              <span className="block font-cinzel text-[10px] uppercase tracking-[0.2em] text-[#9B8B7A]">Atelier Measure</span>
              <span className="text-[15px] font-serif font-medium text-[#241F1A] mt-0.5 block">{product.size || '125g e 4.4 oz'}</span>
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4 pt-2">
            <span className="font-cinzel text-xs uppercase tracking-[0.16em] text-[#241F1A]">Reserve Units</span>
            <div className="flex items-center rounded-full border border-[#E4DACB] bg-[#F7F3ED]">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3.5 py-2.5 text-[#6B5D50] hover:text-[#241F1A]" aria-label="Decrease"><Minus className="w-4 h-4" /></button>
              <span className="px-4 font-mono text-[14px] font-semibold text-[#241F1A] tabular-nums">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="px-3.5 py-2.5 text-[#6B5D50] hover:text-[#241F1A]" aria-label="Increase"><Plus className="w-4 h-4" /></button>
            </div>
            <span className="text-[12px] text-[#3F4A3D] flex items-center gap-1.5 font-medium">
              <Check className="w-3.5 h-3.5" /> Freshly Poured ({product.stock || 85} units available)
            </span>
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <button
              onClick={handleAddToCart}
              disabled={isAdded}
              className={`flex items-center justify-center gap-2 rounded-full py-4 text-[12px] font-cinzel font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
                isAdded ? 'bg-[#3F4A3D] text-[#F7F3ED]' : 'border border-[#241F1A] bg-[#F7F3ED] text-[#241F1A] hover:bg-[#241F1A] hover:text-[#F7F3ED] hover:shadow-md'
              }`}
            >
              {isAdded ? <><Check className="w-4 h-4" /> Added to Atelier Bag</> : <><ShoppingBag className="w-4 h-4" /> Add to Bag</>}
            </button>
            <button
              onClick={handleBuyNow}
              className="flex items-center justify-center gap-2 rounded-full bg-[#241F1A] py-4 text-[12px] font-cinzel font-semibold uppercase tracking-[0.2em] text-[#F7F3ED] transition-all duration-300 hover:bg-[#B08D57] hover:text-[#241F1A] hover:shadow-lg active:scale-[0.99]"
            >
              Instant Acquisition
            </button>
          </div>

          {/* Trust row */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#E4DACB] text-center">
            <div className="flex flex-col items-center gap-1.5 py-2">
              <Truck className="w-5 h-5 text-[#B08D57]" strokeWidth={1.5} />
              <span className="font-cinzel text-[10px] tracking-wider text-[#6B5D50]">Cold-Chain Dispatch</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 py-2 border-x border-[#E4DACB]">
              <ShieldCheck className="w-5 h-5 text-[#3F4A3D]" strokeWidth={1.5} />
              <span className="font-cinzel text-[10px] tracking-wider text-[#6B5D50]">100% Certified Bio-Active</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 py-2">
              <RefreshCw className="w-5 h-5 text-[#B08D57]" strokeWidth={1.5} />
              <span className="font-cinzel text-[10px] tracking-wider text-[#6B5D50]">Zero-Waste Return</span>
            </div>
          </div>

          {/* Transparency */}
          <div className="rounded-[1.75rem] border border-[#B08D57]/30 bg-[#EDE6DB]/60 p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#3F4A3D]" strokeWidth={1.6} />
                <span className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.2em] text-[#241F1A]">Batch & Lab Authenticated</span>
              </div>
              <span className="rounded-full bg-white border border-[#E4DACB] px-3 py-1 font-mono text-[11px] font-bold text-[#241F1A]">{batchNo}</span>
            </div>
            <p className="text-[12px] text-[#6B5D50] leading-relaxed">
              Every unit carries an encrypted QR linking to its NABL chromatography assay, raw harvest provenance, and a circular packaging credit.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="flex items-center gap-1.5 text-[12px] text-[#3F4A3D]">
                <Leaf className="w-3.5 h-3.5 text-[#B08D57]" /> Circular return credit: <strong className="text-[#241F1A]">+{product.recycle_points || 30} Eco-Points</strong>
              </span>
              <Link
                to={`/verify-batch/${encodeURIComponent(batchNo)}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#241F1A] hover:bg-[#B08D57] hover:text-[#241F1A] px-4 py-2.5 text-[11px] font-cinzel font-semibold uppercase tracking-[0.16em] text-[#F7F3ED] transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" /> Inspect NABL Assay
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Tabs */}
      <div className="rounded-[2.5rem] border border-[#E4DACB] bg-white p-6 sm:p-12 space-y-8 shadow-sm">
        <div className="flex gap-6 sm:gap-12 border-b border-[#E4DACB] overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-4 whitespace-nowrap font-cinzel text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${
                activeTab === tab.id ? 'text-[#241F1A]' : 'text-[#9B8B7A] hover:text-[#241F1A]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.span layoutId="tab-underline" className="absolute -bottom-px left-0 h-[2px] w-full bg-[#B08D57]" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-[14px] leading-relaxed text-[#6B5D50]"
          >
            {activeTab === 'ingredients' && (
              <div className="space-y-4 max-w-3xl">
                <p className="font-serif text-lg leading-relaxed text-[#241F1A]">{product.ingredients}</p>
                <div className="rounded-2xl border border-[#B08D57]/30 bg-[#FAF8F5] p-6">
                  <span className="block font-cinzel text-[11px] uppercase tracking-[0.22em] text-[#B08D57] font-semibold mb-1">Botanical Purity Covenant</span>
                  <p className="text-[13px] text-[#6B5D50]">Cold-formulated without artificial dyes, synthetic petro-fragrances, SLS, or parabens. Sustainably hand-harvested by fair-trade agricultural guilds across Kashmir and the Western Ghats.</p>
                </div>
              </div>
            )}
            {activeTab === 'description' && <p className="whitespace-pre-line max-w-3xl font-serif text-lg leading-relaxed text-[#241F1A]">{product.description}</p>}
            {activeTab === 'usage' && (
              <p className="max-w-3xl font-serif text-lg leading-relaxed text-[#241F1A]">{product.usage || 'Work into an emulsified velvet lather with tepid water. Allow bio-actives to interact with the dermis for 120 seconds before rinsing completely.'}</p>
            )}
            {activeTab === 'transparency' && (
              <div className="space-y-6 max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#B08D57]/30 bg-[#EDE6DB]/40 p-6">
                  <div>
                    <span className="block font-cinzel text-[10px] uppercase tracking-[0.22em] text-[#B08D57] font-semibold">Authenticated Batch Registry</span>
                    <p className="text-xl font-bold font-mono text-[#241F1A] mt-1">{batchNo}</p>
                    <p className="text-[12px] text-[#9B8B7A] mt-1">{product.factory_location || 'Skinora Clean Chemistry Facility, Solan, Himachal Pradesh'}</p>
                  </div>
                  <Link
                    to={`/verify-batch/${encodeURIComponent(batchNo)}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[#241F1A] hover:bg-[#B08D57] hover:text-[#241F1A] px-5 py-3 text-[11px] font-cinzel font-semibold uppercase tracking-[0.18em] text-[#F7F3ED] transition-all self-start sm:self-auto shadow-sm"
                  >
                    <Award className="w-4 h-4" /> Inspect NABL Assay
                  </Link>
                </div>
                {product.raw_materials && Array.isArray(product.raw_materials) && product.raw_materials.length > 0 && (
                  <div>
                    <h4 className="font-cinzel text-xs uppercase tracking-[0.22em] text-[#241F1A] mb-3">Direct Provenance Traceability</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {product.raw_materials.map((mat, i) => (
                        <div key={i} className="rounded-xl border border-[#E4DACB] bg-[#FAF8F5] p-4 transition-colors hover:border-[#B08D57]">
                          <span className="block font-serif text-[15px] font-semibold text-[#241F1A]">{mat.ingredient}</span>
                          <span className="block font-cinzel text-[11px] tracking-wider text-[#9B8B7A] mt-0.5">{mat.origin}</span>
                          <span className="block text-[11px] font-mono text-[#3F4A3D] font-medium mt-1">✦ Purity {mat.purity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-6 pt-6">
          <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="font-cinzel text-xs font-semibold uppercase tracking-[0.24em] text-[#B08D57]">
                Atelier Synergy
              </span>
              <h2 className="mt-2 font-serif text-3xl sm:text-4xl tracking-editorial text-[#241F1A]">
                Prescribed Botanical Protocol
              </h2>
            </div>
            <p className="font-cinzel text-xs text-[#3F4A3D] flex items-center gap-1.5 tracking-wider">
              ✦ Neural Formulation Matching · MiniLM Embeddings
            </p>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
            {recommendations.map((rec, i) => (
              <Reveal key={rec.id} delay={(i % 4) * 0.05}>
                <ProductCard product={rec} />
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
