import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  ArrowRight, ArrowUpRight, Star, Leaf, FlaskConical, 
  Recycle, ShieldCheck, Sparkles, MapPin, Award, CheckCircle2,
  ChevronRight, Compass, Droplets, Sun, Moon
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import { CATEGORIES, TESTIMONIALS, PRODUCT_FALLBACK_IMAGES } from '../services/fallbackData';
import { apiService } from '../services/api';

const HAUTE_HERO_SLIDES = [
  {
    id: 1,
    category: "Signature Handcrafted Soap",
    title: "Kashmiri Saffron & Goat Milk De-Tan Alchemy",
    italicWord: "De-Tan Alchemy",
    subtitle: "Triple-milled cold-pressed bathing bar cured for 21 days with Grade-A Mogra Saffron from Pampore and organic pasture goat milk. Gently melts away epidermal sun tan while replenishing the lipid barrier.",
    provenance: "Pampore, Kashmir · 33.99° N, 74.93° E",
    assay: "99.8% Grade-1 Saffron Crocin · Draize: 0.00",
    batch: "SKN-2026-B101",
    price: "₹299",
    mrp: "₹399",
    discount: "25% OFF",
    image: "/images/hero-lineup-banner.jpg",
    link: "/shop?category=soaps",
    primaryBtn: "Acquire Ritual Bar",
  },
  {
    id: 2,
    category: "Haute Concentrated Serum",
    title: "Pure Kumkumadi & 24K Saffron Liquid Gold Elixir",
    italicWord: "Liquid Gold",
    subtitle: "A 26-botanical micro-milled nectar engineered for intensive cellular repair. Penetrates stratum corneum overnight to fade stubborn pigmentation, hyper-melanin clusters, and post-blemish shadows.",
    provenance: "Pulwama Valley & Mysore Sandalwood Reserve",
    assay: "Active Santalol & HPLC Verified Purity",
    batch: "SKN-2026-B201",
    price: "₹649",
    mrp: "₹899",
    discount: "28% OFF",
    image: "/images/saffron-serum.jpg",
    link: "/shop?category=serums",
    primaryBtn: "Discover Elixir",
  },
  {
    id: 3,
    category: "Cellular Barrier & UV Shield",
    title: "Weightless Marine Ceramide & Photostable Sunshield",
    italicWord: "Photostable",
    subtitle: "Broad-spectrum SPF 50+ PA++++ breathable fluid infused with 5 essential ceramides. Zero white cast, zero follicular congestion — providing an impenetrable biological shield against UV free-radicals.",
    provenance: "Solan High-Altitude Clean Facility",
    assay: "ISO 24443 Broad Spectrum · Non-Comedogenic",
    batch: "SKN-2026-B401",
    price: "₹499",
    mrp: "₹699",
    discount: "29% OFF",
    image: "/images/moisturizer.jpg",
    link: "/shop?category=sunscreen",
    primaryBtn: "Explore Sunshield",
  }
];

function ValuesMarquee() {
  const values = [
    'Single-Origin Kashmiri Mogra Saffron',
    'Hand-Harvested & Cold-Pressed at 24°C',
    'NABL Certified 0.00 Hypoallergenic Draize Score',
    'Zero Synthetic Fragrance · Zero Sulfates',
    'Circular Apothecary Glass · Doorstep Pickup',
    'Clinical AI Facial Diagnostic Integration',
    'ISO 22716 Good Manufacturing Practice',
  ];
  const items = [...values, ...values];
  return (
    <div className="border-y border-[#E4DACB] bg-[#EDE6DB]/80 overflow-hidden backdrop-blur-xs">
      <div className="marquee-track animate-marquee py-3.5">
        {items.map((v, i) => (
          <span key={i} className="mx-8 flex items-center gap-8 text-[10.5px] uppercase tracking-[0.26em] text-[#6B5D50] font-medium">
            {v}
            <span className="text-[#B08D57]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [products, setProducts] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        setLoading(true);
        const allProds = await apiService.getProducts();
        const best = await apiService.getBestsellers();
        setProducts(allProds || []);
        setBestsellers((best && best.length > 0) ? best : (allProds || []));
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HAUTE_HERO_SLIDES.length);
    }, 7500);
    return () => clearInterval(timer);
  }, []);

  const slide = HAUTE_HERO_SLIDES[currentSlide];
  const displayBestsellers = bestsellers.slice(0, 8);

  return (
    <div className="animate-fadeIn">
      
      {/* ───────────── EDITORIAL SPLIT HERO ───────────── */}
      <section className="relative overflow-hidden bg-[#EDE6DB]">
        {/* Ambient golden aura glows */}
        <div className="pointer-events-none absolute -top-40 -right-20 h-[32rem] w-[32rem] rounded-full bg-[#B08D57]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full bg-[#3F4A3D]/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center min-h-[64vh]">
            
            {/* Left Column: Editorial Typography & Intent */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6 max-w-xl"
                >
                  {/* Category Eyebrow Pill */}
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#B08D57]/50 bg-[#F7F3ED]/90 px-3.5 py-1 shadow-xs">
                    <span className="text-[#B08D57] text-xs">✦</span>
                    <span className="text-[10px] uppercase tracking-[0.24em] font-semibold text-[#3F4A3D]">
                      {slide.category}
                    </span>
                  </div>

                  {/* Main Editorial Headline */}
                  <h1 className="font-serif text-[2.15rem] sm:text-5xl lg:text-[4.2rem] leading-[1.05] tracking-editorial text-[#241F1A] text-balance break-words">
                    {slide.title}
                  </h1>

                  {/* Storytelling Subtitle */}
                  <p className="text-[14px] sm:text-[16.5px] leading-relaxed text-[#6B5D50] max-w-lg text-pretty">
                    {slide.subtitle}
                  </p>

                  {/* Provenance & Clinical Assay Pills */}
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E4DACB] bg-[#F7F3ED]/95 px-3 py-1 text-[10.5px] font-medium text-[#241F1A]">
                      <MapPin className="w-3 h-3 text-[#B08D57]" /> {slide.provenance}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E4DACB] bg-[#F7F3ED]/95 px-3 py-1 text-[10.5px] font-medium text-[#3F4A3D]">
                      <Award className="w-3 h-3 text-[#3F4A3D]" /> {slide.assay}
                    </span>
                  </div>

                  {/* Pricing & CTA Row */}
                  <div className="flex flex-wrap items-center gap-5 pt-3">
                    <Link to={slide.link} className="btn-primary group">
                      <span>{slide.primaryBtn}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>

                    <div className="flex items-baseline gap-3">
                      <span className="font-sans font-bold text-2xl text-[#241F1A]">{slide.price}</span>
                      {slide.mrp && (
                        <span className="text-sm text-[#9B8B7A] line-through font-sans">{slide.mrp}</span>
                      )}
                      <span className="badge-luxury bg-[#B5755A] text-[#F7F3ED]">
                        {slide.discount}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Slide Switcher Thumbnails / Dots */}
              <div className="flex items-center gap-3 pt-12">
                {HAUTE_HERO_SLIDES.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Select formula ${idx + 1}`}
                    className={`group relative flex items-center gap-2 rounded-full py-1.5 px-3 transition-all duration-400 ${
                      idx === currentSlide
                        ? 'bg-[#241F1A] text-[#F7F3ED] shadow-xs'
                        : 'bg-[#EDE6DB] text-[#6B5D50] hover:bg-[#E4DACB]'
                    }`}
                  >
                    <span className="text-[10px] font-mono">0{idx + 1}</span>
                    <span className={`text-[11px] font-medium hidden sm:inline ${idx === currentSlide ? 'opacity-100' : 'opacity-70'}`}>
                      {s.category.split(' ')[0]}
                    </span>
                  </button>
                ))}
                <span className="ml-3 text-[11px] font-mono text-[#9B8B7A]">
                  EST. 2026 · ATELIER BATCH
                </span>
              </div>
            </div>

            {/* Right Column: Museum Art Display Frame */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="relative mx-auto w-full max-w-md"
                >
                  {/* Museum curved card */}
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[2.25rem] border border-[#E4DACB] bg-[#F2EBE0] shadow-card">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      onError={(e) => { e.target.src = PRODUCT_FALLBACK_IMAGES.banner; }}
                      className="h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#241F1A]/40 via-transparent to-transparent" />
                  </div>

                  {/* Floating Metadata Card 1: Origin Coordinates */}
                  <div className="absolute left-2 sm:-left-6 top-4 sm:top-8 rounded-2xl border border-[#E4DACB] bg-[#F7F3ED]/95 px-3 sm:px-4 py-2 sm:py-2.5 backdrop-blur-md shadow-card space-y-0.5 max-w-[170px] sm:max-w-none">
                    <div className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] uppercase tracking-[0.18em] font-semibold text-[#B08D57]">
                      <Compass className="w-3 h-3" /> Botanical Origin
                    </div>
                    <p className="text-[10.5px] sm:text-[11.5px] font-medium text-[#241F1A] truncate">Pampore Saffron Valley</p>
                  </div>

                  {/* Floating Metadata Card 2: Batch Seal */}
                  <div className="absolute right-2 sm:-right-6 bottom-4 sm:bottom-10 rounded-2xl border border-[#E4DACB] bg-[#241F1A] text-[#F7F3ED] px-3 sm:px-4 py-2 sm:py-3 shadow-hover space-y-0.5 text-right max-w-[170px] sm:max-w-none">
                    <div className="text-[8.5px] sm:text-[9px] uppercase tracking-[0.2em] font-semibold text-[#B08D57]">
                      Traceable Serial
                    </div>
                    <p className="text-[11px] sm:text-[12px] font-mono font-semibold text-[#F7F3ED]">{slide.batch}</p>
                    <p className="text-[8px] sm:text-[9px] text-[#9B8B7A]">NABL Accredited Tested</p>
                  </div>

                  {/* Monogram Seal Stamp */}
                  <div className="absolute left-6 -bottom-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#B08D57] bg-[#EDE6DB] text-center font-serif text-[11px] font-bold text-[#241F1A] shadow-soft">
                    100%<br/>PURE
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <ValuesMarquee />
      </section>


      {/* ───────────── THE ATELIER CODE (4 PILLARS) ───────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Reveal className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <span className="eyebrow text-[#3F4A3D]">The Atelier Standard</span>
          <h2 className="font-serif text-3xl sm:text-5xl tracking-editorial text-[#241F1A]">
            Four commitments of pure botanical alchemy
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              roman: "I",
              title: "Cold-Pressed Bioactives",
              desc: "Unheated 24°C slow extraction preserving 100% active flavonoids, polyphenols and carotenoids without thermal degradation.",
              tag: "Zero Synthetics"
            },
            {
              roman: "II",
              title: "Single-Origin Provenance",
              desc: "Direct ethical partnerships with GI-tagged Pampore saffron harvesters and high-altitude Himalayan wild rose distillers.",
              tag: "Fair Trade Guild"
            },
            {
              roman: "III",
              title: "NABL Analytical Assays",
              desc: "Every small batch undergoes HPLC chromatography, heavy metal ICP-MS screening, and 48hr human patch testing.",
              tag: "0.00 Draize Score"
            },
            {
              roman: "IV",
              title: "Closed-Loop Circular Glass",
              desc: "100% pharmaceutical amber glass jars. Return 4 empties to your doorstep and receive an instant 100% Eco-Credit voucher.",
              tag: "Doorstep Pickup"
            }
          ].map((pillar, i) => (
            <Reveal key={pillar.roman} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-[#E4DACB] bg-[#F7F3ED] p-7 transition-all duration-300 hover:border-[#B08D57]/60 hover:shadow-card flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-cinzel text-xl font-bold text-[#B08D57]">{pillar.roman}</span>
                    <span className="badge-luxury bg-[#EDE6DB] text-[#3F4A3D]">{pillar.tag}</span>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-[#241F1A]">{pillar.title}</h3>
                  <p className="text-[13px] leading-relaxed text-[#6B5D50]">{pillar.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>


      {/* ───────────── THE 4-STEP CURATED PROTOCOL ───────────── */}
      <section className="bg-[#EDE6DB] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <Reveal className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <span className="eyebrow text-[#3F4A3D]">The Daily Ritual</span>
              <h2 className="mt-2 font-serif text-3xl sm:text-5xl tracking-editorial text-[#241F1A]">
                The prescribed 4-step protocol
              </h2>
            </div>
            <Link
              to="/skin-analyzer"
              className="inline-flex items-center gap-2 rounded-full border border-[#B08D57] bg-[#F7F3ED] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#241F1A] transition-colors hover:bg-[#241F1A] hover:text-[#F7F3ED]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B08D57]" /> Customize with AI Scanner
            </Link>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                step: "01",
                phase: "Purify",
                name: "Clarifying Botanique Wash",
                focus: "Preserves Acid Mantle · pH 5.5",
                time: "Morning & Night",
                link: "/shop?category=facewash"
              },
              {
                step: "02",
                phase: "Correct",
                name: "24K Kumkumadi Active Elixir",
                focus: "Mogra Crocin & Active Vitamin C",
                time: "Night Intensive",
                link: "/shop?category=serums"
              },
              {
                step: "03",
                phase: "Hydrate",
                name: "Ceramide Moisture Lock",
                focus: "Transepidermal Lipid Barrier",
                time: "Morning & Night",
                link: "/shop?category=lotion"
              },
              {
                step: "04",
                phase: "Shield",
                name: "Photostable Mineral Fluid",
                focus: "SPF 50+ PA++++ Zero Cast",
                time: "Morning Ritual",
                link: "/shop?category=sunscreen"
              }
            ].map((p, idx) => (
              <Reveal key={p.step} delay={idx * 0.07}>
                <Link
                  to={p.link}
                  className="group block h-full rounded-2xl border border-[#E4DACB] bg-[#F7F3ED] p-6 transition-all duration-300 hover:border-[#241F1A] hover:shadow-card"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#9B8B7A] pb-4 border-b border-[#E4DACB]">
                    <span>STEP {p.step}</span>
                    <span className="uppercase text-[#3F4A3D] font-semibold">{p.phase}</span>
                  </div>
                  <div className="pt-4 space-y-2">
                    <h4 className="font-serif text-xl font-semibold text-[#241F1A] group-hover:text-[#3F4A3D] transition-colors">
                      {p.name}
                    </h4>
                    <p className="text-[12.5px] text-[#6B5D50]">{p.focus}</p>
                    <div className="pt-2 flex items-center justify-between text-[11px] text-[#9B8B7A]">
                      <span>{p.time}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#241F1A] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ───────────── THE COLLECTION · SHOP BY RITUAL ───────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Reveal className="flex items-end justify-between mb-10">
          <div>
            <span className="eyebrow">The Complete Formulations</span>
            <h2 className="mt-2 font-serif text-3xl sm:text-5xl tracking-editorial text-[#241F1A]">
              Explore by category
            </h2>
          </div>
          <Link to="/shop" className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium text-[#241F1A] hover:text-[#3F4A3D] transition-colors">
            All categories <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {CATEGORIES.map((cat, i) => (
            <Reveal key={cat.id} delay={i * 0.05} className="group">
              <Link
                to={cat.id === 'all' ? '/shop' : `/shop?category=${cat.id}`}
                className="relative block aspect-[4/5] overflow-hidden rounded-[1.25rem] border border-[#E4DACB] bg-[#EDE6DB] shadow-xs"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  onError={(e) => { e.target.src = PRODUCT_FALLBACK_IMAGES.soaps; }}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.08]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#241F1A]/85 via-[#241F1A]/25 to-transparent" />
                <div className="absolute inset-0 p-5 flex flex-col justify-end">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#B08D57] font-semibold">Curated</span>
                  <h3 className="font-serif text-xl sm:text-2xl leading-tight text-[#F7F3ED]">{cat.name}</h3>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#F2EBE0]/80">{cat.count}</p>
                  <span className="mt-3 inline-flex w-fit items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#F7F3ED] opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                    Explore <ArrowUpRight className="w-3.5 h-3.5 text-[#B08D57]" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>


      {/* ───────────── BESTSELLERS · ATELIER ICONICS ───────────── */}
      <section className="bg-[#EDE6DB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Reveal className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="eyebrow text-[#3F4A3D]">Most Coveted</span>
              <h2 className="mt-2 font-serif text-3xl sm:text-5xl tracking-editorial text-[#241F1A]">
                The iconic formulations
              </h2>
            </div>
            <Link to="/shop" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#241F1A] hover:text-[#3F4A3D] transition-colors">
              Browse full catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="aspect-[4/5] rounded-2xl bg-[#F2EBE0] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {displayBestsellers.map((product, i) => (
                <Reveal key={product.id} delay={(i % 4) * 0.06}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* ───────────── CIRCULAR PACKAGING & RECYCLING SPOTLIGHT ───────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Reveal className="relative overflow-hidden rounded-[2.25rem] border border-[#E4DACB] bg-[#241F1A] text-[#F7F3ED] p-8 sm:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="badge-luxury bg-[#3F4A3D] text-[#F7F3ED] border border-[#B08D57]/40">
                <Recycle className="w-3.5 h-3.5 text-[#B08D57]" /> Closed-Loop Beauty Privilege
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl leading-[1.05] tracking-editorial text-[#F7F3ED]">
                Zero waste apothecary glass. Handcrafted for endless renewal.
              </h2>
              <p className="text-sm sm:text-base text-[#EDE6DB]/85 leading-relaxed max-w-xl">
                Every amber bottle and ceramic tin returned to our atelier prevents 0.35kg of carbon emissions. We arrange complimentary doorstep courier pickup and credit your account with instant Eco-Points and tokenized discount codes.
              </p>
              <div className="pt-2 flex flex-wrap gap-4">
                <Link to="/recycle" className="btn-gold">
                  Initiate Bottle Return <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/verify-batch" className="btn-ghost !border-[#EDE6DB]/40 !text-[#F7F3ED] hover:!bg-[#F7F3ED] hover:!text-[#241F1A]">
                  Verify Batch Authenticity
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#EDE6DB]/20 bg-[#3F4A3D]/40 p-5 space-y-1">
                <span className="font-mono text-3xl font-bold text-[#B08D57]">50</span>
                <p className="text-xs uppercase tracking-wider text-[#EDE6DB]">Points per Bottle</p>
                <p className="text-[11px] text-[#9B8B7A]">Redeemable instantly on checkout</p>
              </div>
              <div className="rounded-2xl border border-[#EDE6DB]/20 bg-[#3F4A3D]/40 p-5 space-y-1">
                <span className="font-mono text-3xl font-bold text-[#B08D57]">100%</span>
                <p className="text-xs uppercase tracking-wider text-[#EDE6DB]">Apothecary Glass</p>
                <p className="text-[11px] text-[#9B8B7A]">Zero landfill degradation</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>


      {/* ───────────── PATRON TESTIMONIALS ───────────── */}
      <section className="bg-[#EDE6DB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Reveal className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="eyebrow">The Private Archive</span>
            <h2 className="font-serif text-3xl sm:text-5xl tracking-editorial text-[#241F1A]">
              Endorsed by connoisseurs
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.id} delay={i * 0.08} className="flex h-full flex-col justify-between rounded-[1.75rem] border border-[#E4DACB] bg-[#F7F3ED] p-8 shadow-xs hover:shadow-card transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center gap-1">
                    {[...Array(t.rating)].map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-[#B08D57] text-[#B08D57]" />
                    ))}
                  </div>
                  <p className="font-serif text-[19px] sm:text-[21px] leading-snug text-[#241F1A] text-balance">
                    “{t.comment}”
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-3.5 border-t border-[#E4DACB] pt-5">
                  <img
                    src={t.avatar || t.userPhoto}
                    alt={t.name}
                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"; }}
                    className="h-10 w-10 rounded-full object-cover border border-[#B08D57]/40"
                  />
                  <div>
                    <h4 className="text-[13px] font-semibold text-[#241F1A]">{t.name}</h4>
                    <span className="text-[11px] text-[#9B8B7A]">{t.location} · Verified Patron</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
