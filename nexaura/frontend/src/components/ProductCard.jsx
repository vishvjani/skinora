import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart, ShoppingBag, Check, ArrowUpRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { SVG_PRODUCT_STUDIO_IMAGES } from '../services/fallbackData';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [isAdded, setIsAdded] = useState(false);

  const getCategoryFallback = () => {
    const cat = (product.category || product.subcategory || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    if (name.includes('shampoo') || cat.includes('shampoo') || cat.includes('hair')) return SVG_PRODUCT_STUDIO_IMAGES.shampoo;
    if (name.includes('soap') || cat.includes('soap')) return SVG_PRODUCT_STUDIO_IMAGES.soaps;
    if (name.includes('serum') || cat.includes('serum')) return SVG_PRODUCT_STUDIO_IMAGES.serums;
    if (name.includes('body wash') || name.includes('shower') || cat.includes('body')) return SVG_PRODUCT_STUDIO_IMAGES.bodywash;
    if (name.includes('sunscreen') || cat.includes('sun')) return SVG_PRODUCT_STUDIO_IMAGES.sunscreen;
    if (name.includes('mask') || name.includes('scrub') || cat.includes('mask')) return SVG_PRODUCT_STUDIO_IMAGES.masks;
    if (name.includes('lotion') || name.includes('cream')) return SVG_PRODUCT_STUDIO_IMAGES.lotion;
    if (name.includes('lip')) return SVG_PRODUCT_STUDIO_IMAGES.lipcare;
    if (name.includes('combo') || cat.includes('combo')) return SVG_PRODUCT_STUDIO_IMAGES.combos;
    return SVG_PRODUCT_STUDIO_IMAGES.soaps;
  };

  const [imgSrc, setImgSrc] = useState(product.image_url || getCategoryFallback());
  const isFavorite = isInWishlist(product.id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1600);
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleImageError = () => setImgSrc(getCategoryFallback());

  return (
    <div className="group relative flex h-full flex-col">
      <div className="surface-card relative overflow-hidden rounded-[1.25rem] transition-all duration-500 group-hover:border-[#B08D57]/50 group-hover:shadow-hover">
        {/* Image */}
        <Link
          to={`/product/${product.slug || product.id}`}
          className="relative block aspect-[4/5] overflow-hidden bg-[#EDE6DB]"
        >
          <img
            src={imgSrc}
            alt={product.name}
            onError={handleImageError}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
          />
          {/* subtle golden vignette sheen on hover */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#241F1A]/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </Link>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5 pointer-events-none">
          {product.similarity_score && (
            <span className="badge-luxury bg-[#241F1A]/90 text-[#F7F3ED] border border-[#B08D57]/50 backdrop-blur-md shadow-xs">
              <span className="text-[#B08D57]">✦</span> {Math.round(Number(product.similarity_score))}% Match
            </span>
          )}
          {product.is_bestseller && (
            <span className="badge-luxury bg-[#F7F3ED]/95 text-[#241F1A] border border-[#B08D57]/40 backdrop-blur-md shadow-xs">
              Atelier Choice
            </span>
          )}
          {product.discount_percent > 0 && (
            <span className="badge-luxury bg-[#B5755A] text-[#F7F3ED] shadow-xs">
              −{product.discount_percent}%
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute right-3 top-3 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 shadow-xs ${
            isFavorite
              ? 'bg-[#241F1A] text-[#B08D57] scale-105'
              : 'bg-[#F7F3ED]/90 text-[#241F1A] border border-[#E4DACB]/80 hover:bg-[#241F1A] hover:text-[#F7F3ED]'
          }`}
          title={isFavorite ? 'Remove from curated ritual' : 'Add to curated ritual'}
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Quick Action Button — Slides up smoothly */}
        <div className="absolute inset-x-3 bottom-3 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            onClick={handleAddToCart}
            disabled={isAdded}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 shadow-md ${
              isAdded
                ? 'bg-[#3F4A3D] text-[#F7F3ED]'
                : 'bg-[#241F1A] text-[#F7F3ED] hover:bg-[#3F4A3D] hover:border-[#B08D57]/40 border border-transparent'
            }`}
          >
            {isAdded ? (
              <><Check className="w-3.5 h-3.5 text-[#B08D57]" /> Added to Ritual</>
            ) : (
              <><ShoppingBag className="w-3.5 h-3.5" /> Quick Add</>
            )}
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-grow flex-col pt-3.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#9B8B7A]">
          <span className="truncate">
            {product.form || product.subcategory || product.category}
          </span>
          <div className="flex items-center gap-1 font-medium text-[#6B5D50]">
            <Star className="w-3 h-3 fill-[#B08D57] text-[#B08D57]" />
            <span className="font-sans font-semibold">{product.rating || '4.9'}</span>
          </div>
        </div>

        <Link
          to={`/product/${product.slug || product.id}`}
          className="mt-1.5 font-serif text-[17px] sm:text-[18px] leading-[1.28] text-[#241F1A] transition-colors duration-200 hover:text-[#3F4A3D] line-clamp-2"
        >
          {product.name}
        </Link>

        {product.size && (
          <span className="mt-1 text-[11px] text-[#9B8B7A] italic font-serif">
            {product.size} · Single-Origin Botanical
          </span>
        )}

        <div className="mt-auto flex items-end justify-between pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[16px] sm:text-[17px] font-bold text-[#241F1A] font-sans">₹{product.price}</span>
            {product.mrp > product.price && (
              <span className="text-[11px] sm:text-[12px] text-[#9B8B7A] line-through font-sans">₹{product.mrp}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAddToCart}
              disabled={isAdded}
              className={`sm:hidden flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                isAdded ? 'bg-[#3F4A3D] text-[#F7F3ED]' : 'bg-[#241F1A] text-[#F7F3ED] active:scale-95'
              }`}
              title="Add to bag"
            >
              {isAdded ? <Check className="w-3 h-3 text-[#B08D57]" /> : <ShoppingBag className="w-3 h-3" />}
            </button>
            <Link
              to={`/product/${product.slug || product.id}`}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-[#E4DACB] text-[#241F1A] transition-all duration-300 hover:border-[#B08D57] hover:bg-[#241F1A] hover:text-[#F7F3ED]"
              title="Inspect formulation"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
