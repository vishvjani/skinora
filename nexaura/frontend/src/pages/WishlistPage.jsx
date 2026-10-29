import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';

export default function WishlistPage() {
  const { wishlist } = useWishlist();

  if (wishlist.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn space-y-4">
        <div className="w-20 h-20 bg-[#F7EDE2] rounded-full flex items-center justify-center mx-auto text-3xl">
          ❤️
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#241F1A]">Your Wishlist is Empty</h1>
        <p className="text-xs sm:text-sm text-[#9B8B7A] max-w-md mx-auto">
          Save your favorite soaps, serums, and organic scrubs here to shop anytime!
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 bg-[#3F4A3D] hover:bg-[#A3591B] text-white px-8 py-3 rounded-full text-xs font-bold shadow-soft transition-all"
        >
          Explore Collection <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <div className="border-b border-[#E4DACB] pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#241F1A]">My Wishlist</h1>
          <p className="text-xs text-[#9B8B7A] mt-1">
            You have saved {wishlist.length} item(s) to your wishlist.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {wishlist.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
