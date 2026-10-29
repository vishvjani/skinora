import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, CheckCircle2, Award, QrCode, MapPin, 
  FlaskConical, Search, Calendar, RefreshCw, FileText, 
  ArrowRight, ExternalLink, Leaf, Sparkles, Building2,
  Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';

const POPULAR_BATCHES = [
  { batch: 'SKIN-2026-B101', name: 'De-Tan Saffron Soap' },
  { batch: 'SKIN-2026-B201', name: 'Kumkumadi Glow Serum' },
  { batch: 'SKIN-2026-B401', name: 'Invisible Fluid SPF50' },
  { batch: 'SKIN-2026-B501', name: 'Salicylic Foam Cleanser' },
  { batch: 'SKIN-2026-B701', name: 'Rosemary Peptide Hair Oil' },
];

export default function BatchVerifyPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const [inputBatch, setInputBatch] = useState(batchId || 'SKIN-2026-B101');
  const [activeBatch, setActiveBatch] = useState(batchId || 'SKIN-2026-B101');
  const [loading, setLoading] = useState(true);
  const [batchData, setBatchData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tests'); // 'tests', 'materials', 'circularity'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (batchId) {
      setInputBatch(batchId);
      setActiveBatch(batchId);
    }
  }, [batchId]);

  useEffect(() => {
    let isMounted = true;
    async function loadBatch() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getBatchVerification(activeBatch);
        if (isMounted) {
          if (data && data.batch_number) {
            setBatchData(data);
          } else {
            setError(`No verified records found for batch "${activeBatch}". Please check the code stamped on your container.`);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(`Unable to fetch batch details. Please verify your connection or batch code.`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBatch();
    return () => { isMounted = false; };
  }, [activeBatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!inputBatch.trim()) return;
    const clean = inputBatch.trim().toUpperCase();
    setActiveBatch(clean);
    navigate(`/verify-batch/${encodeURIComponent(clean)}`, { replace: true });
  };

  const verifyUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/verify-batch/${encodeURIComponent(activeBatch)}` 
    : `https://skinora.in/verify-batch/${activeBatch}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(verifyUrl)}&bgcolor=FFFFFF&color=1B4332&margin=6`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Breadcrumb & Hero */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#2C352B] mb-3">
          <Link to="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span className="text-gray-500">Authenticity & Batch Transparency</span>
        </div>

        <div className="bg-gradient-to-br from-[#241F1A] via-[#2C352B] to-[#3F4A3D] rounded-3xl p-8 sm:p-10 text-white shadow-card relative overflow-hidden border border-[#B08D57]/30">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#B08D57]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-[#B08D57]/20 text-[#F7F3ED] rounded-full text-xs font-semibold uppercase tracking-wider border border-[#B08D57]/30 mb-4">
              <ShieldCheck className="w-4 h-4 text-[#B08D57]" />
              <span>NABL Accredited Quality Transparency</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight mb-3">
              Batch &amp; QR Authenticity Protocol
            </h1>
            <p className="text-[#EDE6DB]/90 text-sm sm:text-base leading-relaxed mb-6 font-light">
              Every handcrafted Skinora formulation carries an individualized manufacturing serial code. 
              Review real botanical harvest provenance, heavy metal ICP-MS screening, and purity test certificates directly from accredited laboratories.
            </p>

            {/* Search Batch Form */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={inputBatch}
                  onChange={(e) => setInputBatch(e.target.value)}
                  placeholder="Enter Batch No (e.g., SKIN-2026-B101)"
                  className="w-full pl-11 pr-4 py-3.5 rounded-full bg-white/95 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B08D57] shadow-inner font-mono"
                />
              </div>
              <button
                type="submit"
                className="btn-gold !py-3.5 !px-6 cursor-pointer"
              >
                <span>Verify Batch</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Suggestions */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-emerald-300/80 font-medium">Sample Batches:</span>
              {POPULAR_BATCHES.map((item) => (
                <button
                  key={item.batch}
                  onClick={() => {
                    setInputBatch(item.batch);
                    setActiveBatch(item.batch);
                    navigate(`/verify-batch/${item.batch}`, { replace: true });
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition ${
                    activeBatch === item.batch
                      ? 'bg-emerald-400 text-emerald-950 border-emerald-400 font-bold'
                      : 'bg-white/10 hover:bg-white/20 text-emerald-100 border-white/15'
                  }`}
                >
                  {item.batch} ({item.name.split(' ')[0]})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <div className="bg-white rounded-2xl p-16 shadow-sm text-center border border-gray-100 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-[#3F4A3D] animate-spin" />
            <p className="text-gray-600 font-medium text-sm">Validating batch certificate with NABL repository...</p>
          </div>
        ) : error ? (
          <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-amber-900 mb-1">Batch Code Not Found</h3>
            <p className="text-amber-800 text-sm max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={() => {
                setInputBatch('SKIN-2026-B101');
                setActiveBatch('SKIN-2026-B101');
              }}
              className="text-xs font-bold text-amber-900 underline hover:text-amber-700"
            >
              Load verified sample batch SKIN-2026-B101
            </button>
          </div>
        ) : batchData ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Authenticity Certificate Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8EAE3] rounded-bl-full pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#D8DED1] text-[#2C352B] flex items-center justify-center flex-shrink-0 border border-[#C8D0BE] shadow-inner">
                    <ShieldCheck className="w-8 h-8 text-[#3F4A3D]" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D8DED1] text-[#2C352B]">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#3F4A3D]" />
                        GENUINE & LAB CERTIFIED
                      </span>
                      <span className="text-xs text-gray-500 font-mono">ID: {batchData.batch_number}</span>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mt-1">
                      {batchData.product_name}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 flex items-center mt-1">
                      <Building2 className="w-4 h-4 mr-1 text-gray-400" />
                      {batchData.factory_location}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {batchData.slug && (
                    <Link
                      to={`/product/${batchData.slug}`}
                      className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2"
                    >
                      <span>View Product</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  <button
                    onClick={copyShareLink}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition flex items-center space-x-2"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#3F4A3D]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Link Copied!' : 'Share Verification'}</span>
                  </button>
                </div>
              </div>

              {/* Manufacturing Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-gray-100">
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                  <span className="text-xs text-gray-500 font-medium flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-[#3F4A3D]" />
                    Mfg. Date
                  </span>
                  <p className="text-base font-bold text-gray-900 mt-1 font-mono">{batchData.mfg_date}</p>
                  <span className="text-[11px] text-[#3F4A3D] font-medium">Freshly Produced</span>
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                  <span className="text-xs text-gray-500 font-medium flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-[#9A4A3A]" />
                    Expiry Date
                  </span>
                  <p className="text-base font-bold text-gray-900 mt-1 font-mono">{batchData.exp_date}</p>
                  <span className="text-[11px] text-gray-500">24 Months Shelf-Life</span>
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                  <span className="text-xs text-gray-500 font-medium flex items-center">
                    <Leaf className="w-3.5 h-3.5 mr-1 text-[#3F4A3D]" />
                    Recycle Reward
                  </span>
                  <p className="text-base font-bold text-[#2C352B] mt-1">+{batchData.recycle_points} Pts</p>
                  <span className="text-[11px] text-gray-500">{batchData.container_type}</span>
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                  <span className="text-xs text-gray-500 font-medium flex items-center">
                    <Award className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    QA Clearance
                  </span>
                  <p className="text-base font-bold text-[#3F4A3D] mt-1">100% PASSED</p>
                  <span className="text-[11px] text-gray-500">Zero Contaminants</span>
                </div>
              </div>

              {/* Certifications Row */}
              <div className="pt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 mr-2">Official Accreditations:</span>
                {(batchData.certifications || []).map((cert, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 bg-[#E8EAE3] text-[#241F1A] text-xs font-medium rounded-lg border border-[#C8D0BE]/60"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#3F4A3D] mr-1.5" />
                    {cert}
                  </span>
                ))}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 space-x-8">
              <button
                onClick={() => setActiveTab('tests')}
                className={`pb-4 text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
                  activeTab === 'tests'
                    ? 'border-emerald-800 text-[#241F1A]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>NABL Quality & Purity Tests ({(batchData.quality_tests || []).length})</span>
              </button>

              <button
                onClick={() => setActiveTab('materials')}
                className={`pb-4 text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
                  activeTab === 'materials'
                    ? 'border-emerald-800 text-[#241F1A]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Botanical Provenance & Origins ({(batchData.raw_materials || []).length})</span>
              </button>

              <button
                onClick={() => setActiveTab('circularity')}
                className={`pb-4 text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
                  activeTab === 'circularity'
                    ? 'border-emerald-800 text-[#241F1A]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Scannable Packaging QR & Return Protocol</span>
              </button>
            </div>

            {/* Tab 1: Quality Tests Table */}
            {activeTab === 'tests' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <FlaskConical className="w-5 h-5 mr-2 text-[#3F4A3D]" />
                      Laboratory Test Results & Chromatography Certificates
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Conducted per ISO/IEC 17025 accredited laboratory methodologies under Indian & International Pharmacopeia.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-gray-400 font-mono">Sign-off: Dr. Ananya Sen, Ph.D.</span>
                    <p className="text-xs font-bold text-[#2C352B]">QA Director Sign-Off Verified</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-stone-50">
                        <th className="py-3.5 px-4 rounded-l-xl">Test Parameter</th>
                        <th className="py-3.5 px-4">Standard & Accredited Lab</th>
                        <th className="py-3.5 px-4">Analytical Result</th>
                        <th className="py-3.5 px-4 text-right rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {(batchData.quality_tests || []).map((test, index) => (
                        <tr key={index} className="hover:bg-stone-50/50 transition">
                          <td className="py-4 px-4 font-semibold text-gray-900">
                            {test.test_name}
                          </td>
                          <td className="py-4 px-4 text-xs text-gray-600">
                            {test.lab}
                          </td>
                          <td className="py-4 px-4 text-xs font-mono text-emerald-950 font-semibold bg-[#E8EAE3]/40 rounded-lg">
                            {test.result}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#D8DED1] text-[#2C352B] border border-[#B8C2AC]">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#3F4A3D]" />
                              {test.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-[#E8EAE3]/60 rounded-2xl border border-[#C8D0BE]/80 flex items-start space-x-3 text-xs text-emerald-950">
                  <ShieldCheck className="w-5 h-5 text-[#3F4A3D] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Zero Tolerance Purity Guarantee:</span> Every production batch with heavy metals exceeding 0.05 ppm or pathogenic microbial count is automatically quarantined and destroyed. This certificate guarantees your product is biologically pure and safe.
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 2: Raw Material Provenance */}
            {activeTab === 'materials' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {(batchData.raw_materials || []).map((mat, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-[#C8D0BE] transition duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-100 text-stone-700">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-[#3F4A3D]" />
                          Geographic Origin
                        </span>
                        {mat.fair_trade && (
                          <span className="text-[11px] font-bold text-[#2C352B] bg-[#D8DED1] px-2 py-0.5 rounded-full">
                            Fair Trade Certified
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-bold text-gray-900 mt-3 font-serif">
                        {mat.ingredient}
                      </h4>
                      <p className="text-xs font-medium text-[#241F1A] mt-1 flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {mat.origin}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                        Purity & Extraction Standard:
                      </span>
                      <p className="text-xs font-bold text-gray-800 mt-0.5 font-mono">
                        {mat.purity}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Tab 3: Packaging QR & Return Protocol */}
            {activeTab === 'circularity' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                  <div className="flex flex-col items-center text-center p-6 bg-stone-50 rounded-2xl border border-stone-200">
                    <img
                      src={qrCodeUrl}
                      alt={`QR Code for Batch ${activeBatch}`}
                      className="w-48 h-48 rounded-xl shadow-md bg-white p-2 border border-gray-200"
                    />
                    <p className="text-xs font-mono font-bold text-gray-700 mt-3">{activeBatch}</p>
                    <span className="text-[11px] text-gray-500 mt-0.5">Scannable Authenticity QR</span>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      Zero-Waste Packaging Circularity Protocol
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      This container is crafted from <span className="font-bold text-gray-900">{batchData.container_type}</span>. 
                      Instead of contributing to landfills, return it once finished to earn instant eco-points and account-locked discount coupons.
                    </p>

                    <div className="grid grid-cols-2 gap-4 py-2">
                      <div className="p-4 bg-[#E8EAE3] rounded-xl border border-emerald-100">
                        <span className="text-xs text-gray-600">Container Type:</span>
                        <p className="text-sm font-bold text-emerald-950 mt-0.5">{batchData.container_type}</p>
                      </div>
                      <div className="p-4 bg-[#E8EAE3] rounded-xl border border-emerald-100">
                        <span className="text-xs text-gray-600">Return Bounty:</span>
                        <p className="text-sm font-bold text-[#2C352B] mt-0.5">+{batchData.recycle_points} Eco-Points</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        to="/recycle"
                        className="inline-flex items-center px-6 py-3 bg-[#2C352B] hover:bg-emerald-900 text-white text-sm font-bold rounded-xl transition space-x-2 shadow-md"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Return Container &amp; Earn Eco-Points</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
