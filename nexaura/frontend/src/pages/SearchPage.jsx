import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Sparkles, SlidersHorizontal } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { apiService } from '../services/api';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [inputQuery, setInputQuery] = useState(queryParam);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInputQuery(queryParam);
    if (queryParam) {
      performSearch(queryParam);
    }
  }, [queryParam]);

  const performSearch = async (q) => {
    setLoading(true);
    const matched = await apiService.searchProducts(q);
    setResults(matched);
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputQuery.trim()) {
      setSearchParams({ q: inputQuery.trim() });
    }
  };

  const popularTags = ['De-Tan Soap', 'Saffron Serum', 'Kumkumadi Oil', 'Neem Soap', 'Rice Water', 'Sunscreen'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Search Header Form */}
      <div className="bg-gradient-to-r from-[#F7EDE2] to-[#F7F3ED] p-8 rounded-3xl border border-[#E4DACB] text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-white/80 border border-[#DDA15E]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#3F4A3D]">
          <Sparkles className="w-3.5 h-3.5 text-[#DDA15E]" /> AI Instant Product Search
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#241F1A]">Search Skinora Catalogue</h1>

        <form onSubmit={handleSubmit} className="max-w-xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search soaps, saffron, goat milk, sunscreen..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm rounded-full bg-white border border-[#DDA15E] focus:outline-none focus:border-[#3F4A3D] text-[#241F1A] shadow-sm"
            />
            <Search className="w-4 h-4 text-[#3F4A3D] absolute left-3.5 top-3.5 pointer-events-none" />
          </div>
          <button
            type="submit"
            className="bg-[#3F4A3D] hover:bg-[#A3591B] text-white px-6 py-3 rounded-full text-xs font-bold shadow-soft transition-all"
          >
            Search
          </button>
        </form>

        {/* Popular Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
          <span className="text-[#9B8B7A] font-medium">Popular:</span>
          {popularTags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setInputQuery(tag);
                setSearchParams({ q: tag });
              }}
              className="bg-white/80 border border-[#E4DACB] hover:border-[#3F4A3D] text-[#5C4E4B] px-3 py-1 rounded-full text-[11px] transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div>
        {queryParam && (
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#241F1A]">
              Search Results for "{queryParam}"
            </h2>
            <span className="text-xs text-[#9B8B7A]">Found {results.length} items</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 bg-white rounded-2xl border border-[#E4DACB] animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 && queryParam ? (
          <div className="bg-white p-12 rounded-3xl border border-[#E4DACB] text-center space-y-3">
            <p className="text-sm text-[#9B8B7A]">No products matched your search term.</p>
            <Link
              to="/shop"
              className="inline-block bg-[#3F4A3D] text-white px-6 py-2.5 rounded-full text-xs font-semibold"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
