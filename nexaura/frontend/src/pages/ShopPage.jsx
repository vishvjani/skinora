import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Check, RotateCcw, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import { CATEGORIES } from '../services/fallbackData';
import { apiService } from '../services/api';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';
  const openFilterParam = searchParams.get('filter') === 'open';

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [priceRange, setPriceRange] = useState(2000);
  const [selectedForm, setSelectedForm] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(openFilterParam);

  const availableBrands = [...new Set(products.map((p) => p.brand).filter(Boolean))];

  const activeFilterCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (priceRange < 2000 ? 1 : 0) +
    (selectedForm !== 'all' ? 1 : 0) +
    (selectedBrand !== 'all' ? 1 : 0);

  useEffect(() => { setSelectedCategory(categoryParam); }, [categoryParam]);
  useEffect(() => { if (openFilterParam) setIsFilterDrawerOpen(true); }, [openFilterParam]);

  useEffect(() => {
    async function loadShopProducts() {
      setLoading(true);
      const data = await apiService.getProducts();
      setProducts(data);
      setLoading(false);
    }
    loadShopProducts();
  }, []);

  useEffect(() => {
    let result = [...products];
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory || p.subcategory === selectedCategory);
    }
    result = result.filter((p) => p.price <= priceRange);
    if (selectedForm !== 'all') result = result.filter((p) => (p.form || '').toLowerCase().includes(selectedForm));
    if (selectedBrand !== 'all') result = result.filter((p) => p.brand === selectedBrand);

    if (sortBy === 'price-low') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-high') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'popular') result.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    else if (sortBy === 'brand-asc') result.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
    else if (sortBy === 'brand-desc') result.sort((a, b) => (b.brand || '').localeCompare(a.brand || ''));

    setFilteredProducts(result);
  }, [products, selectedCategory, priceRange, selectedForm, selectedBrand, sortBy]);

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    if (catId === 'all') setSearchParams({});
    else setSearchParams({ category: catId });
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setPriceRange(2000);
    setSelectedForm('all');
    setSelectedBrand('all');
    setSortBy('popular');
    setSearchParams({});
  };

  const forms = [
    { id: 'all', label: 'All forms' },
    { id: 'soap', label: 'Handmade bar soap' },
    { id: 'serum', label: 'Liquid serum' },
    { id: 'gel', label: 'Gel / cleanser' },
    { id: 'lotion', label: 'Body lotion' },
    { id: 'mask', label: 'Clay mask / scrub' },
  ];

  return (
    <div className="animate-fadeIn">
      {/* Header banner */}
      <section className="bg-[#EDE6DB] border-b border-[#E4DACB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5">
          <div>
            <span className="eyebrow text-[#3F4A3D]">✦ The Botanical Atelier Compendium</span>
            <h1 className="mt-2 font-serif text-4xl sm:text-6xl tracking-editorial text-[#241F1A]">
              {selectedCategory !== 'all'
                ? CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'Atelier Formulations'
                : 'The Full Botanical Catalog'}
            </h1>
            <p className="mt-2 text-[14.5px] text-[#6B5D50]">Single-origin Kashmiri saffron elixirs, cold-pressed artisanal soaps, and clean clinical protocols.</p>
          </div>
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#241F1A] bg-[#241F1A] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F7F3ED] transition-colors hover:bg-[#3F4A3D] hover:border-[#3F4A3D]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B08D57] px-1.5 text-[10px]">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Category pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-medium tracking-wide transition-all flex-shrink-0 border ${
                  isActive
                    ? 'bg-[#241F1A] text-[#F7F3ED] border-[#241F1A]'
                    : 'bg-[#F7F3ED] text-[#6B5D50] border-[#E4DACB] hover:border-[#241F1A] hover:text-[#241F1A]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E4DACB]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#E4DACB] bg-[#F7F3ED] px-4 py-2.5 text-[12px] font-medium text-[#241F1A] transition-colors hover:border-[#241F1A]"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#241F1A] px-1 text-[9px] text-[#F7F3ED]">{activeFilterCount}</span>
              )}
            </button>
            <span className="text-[12px] text-[#9B8B7A]">
              <strong className="text-[#241F1A]">{filteredProducts.length}</strong> products
            </span>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="inline-flex items-center gap-1 text-[12px] font-medium text-[#3F4A3D] hover:underline">
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative flex items-center">
            <span className="absolute left-4 text-[12px] text-[#9B8B7A] pointer-events-none">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none rounded-full border border-[#E4DACB] bg-[#F7F3ED] pl-16 pr-10 py-2.5 text-[12px] font-medium text-[#241F1A] focus:border-[#241F1A] focus:outline-none cursor-pointer"
            >
              <option value="popular">Most popular</option>
              <option value="brand-asc">Brand: A → Z</option>
              <option value="brand-desc">Brand: Z → A</option>
              <option value="price-low">Price: low → high</option>
              <option value="price-high">Price: high → low</option>
              <option value="rating">Highest rated</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#9B8B7A] absolute right-4 pointer-events-none" />
          </div>
        </div>

        {/* Grid */}
        <main>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {[...Array(8)].map((_, n) => (
                <div key={n} className="aspect-[4/5] rounded-2xl bg-[#EDE6DB] animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="max-w-xl mx-auto rounded-[2rem] border border-[#E4DACB] bg-[#F7F3ED] px-8 py-14 text-center space-y-4">
              <h3 className="font-serif text-2xl text-[#241F1A]">No matches found</h3>
              <p className="text-[13px] text-[#6B5D50]">Try widening your price range or clearing a filter.</p>
              <button onClick={resetFilters} className="btn-primary mx-auto">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {filteredProducts.map((product, i) => (
                <Reveal key={product.id} delay={(i % 4) * 0.05}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Filter drawer */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-[#241F1A]/45 backdrop-blur-sm flex justify-end"
              onClick={() => setIsFilterDrawerOpen(false)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="flex h-full w-full max-w-md flex-col bg-[#F7F3ED] shadow-drawer"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E4DACB] px-6 py-5">
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-[#241F1A]" />
                    <h2 className="font-serif text-xl text-[#241F1A]">Filters</h2>
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-[#EDE6DB] px-2 py-0.5 text-[10px] font-semibold text-[#241F1A]">{activeFilterCount} active</span>
                    )}
                  </div>
                  <button onClick={() => setIsFilterDrawerOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#EDE6DB] transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
                  {/* Categories */}
                  <div>
                    <h3 className="eyebrow mb-3">Category</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-[12px] font-medium transition-all ${
                            selectedCategory === cat.id
                              ? 'border-[#241F1A] bg-[#241F1A] text-[#F7F3ED]'
                              : 'border-[#E4DACB] bg-[#F7F3ED] text-[#6B5D50] hover:border-[#241F1A]'
                          }`}
                        >
                          <span className="truncate">{cat.name}</span>
                          {selectedCategory === cat.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brands */}
                  <div className="border-t border-[#E4DACB] pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="eyebrow">Brand</h3>
                      {selectedBrand !== 'all' && (
                        <button onClick={() => setSelectedBrand('all')} className="text-[10px] font-semibold text-[#3F4A3D] hover:underline">Reset</button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2.5 cursor-pointer text-[13px] text-[#6B5D50] hover:text-[#241F1A]">
                        <input type="radio" name="brand" checked={selectedBrand === 'all'} onChange={() => setSelectedBrand('all')} className="accent-[#241F1A]" />
                        All brands
                      </label>
                      {availableBrands.map((b) => (
                        <label key={b} className="flex items-center gap-2.5 cursor-pointer text-[13px] text-[#6B5D50] hover:text-[#241F1A]">
                          <input type="radio" name="brand" checked={selectedBrand === b} onChange={() => setSelectedBrand(b)} className="accent-[#241F1A]" />
                          {b}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="border-t border-[#E4DACB] pt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="eyebrow">Max price</h3>
                      <span className="text-[13px] font-semibold text-[#241F1A]">₹{priceRange}</span>
                    </div>
                    <input type="range" min="100" max="2000" step="50" value={priceRange} onChange={(e) => setPriceRange(Number(e.target.value))} className="w-full accent-[#241F1A]" />
                    <div className="flex justify-between text-[10px] text-[#9B8B7A] mt-1.5">
                      <span>₹100</span>
                      <span>₹2000</span>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="border-t border-[#E4DACB] pt-6">
                    <h3 className="eyebrow mb-3">Product form</h3>
                    <div className="space-y-1.5">
                      {forms.map((form) => (
                        <label key={form.id} className="flex items-center gap-2.5 cursor-pointer text-[13px] text-[#6B5D50] hover:text-[#241F1A]">
                          <input type="radio" name="form" checked={selectedForm === form.id} onChange={() => setSelectedForm(form.id)} className="accent-[#241F1A]" />
                          {form.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-[#E4DACB] bg-[#EDE6DB] px-6 py-4 flex items-center gap-3">
                  <button onClick={resetFilters} className="w-1/3 rounded-full border border-[#E4DACB] bg-[#F7F3ED] py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B5D50] hover:text-[#241F1A] transition-colors">
                    Reset
                  </button>
                  <button onClick={() => setIsFilterDrawerOpen(false)} className="flex-1 rounded-full bg-[#241F1A] py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F7F3ED] hover:bg-[#3F4A3D] transition-colors">
                    Show {filteredProducts.length} results
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
