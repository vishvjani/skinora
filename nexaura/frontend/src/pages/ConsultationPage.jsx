import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import {
  Sparkles,
  User,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Send,
  HeartHandshake,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

import { getApiBaseUrl } from '../services/api';

const API_BASE_URL = getApiBaseUrl();

const SKIN_TYPES = [
  { id: 'Oily', label: 'Oily', desc: 'Excess sebum, shine, enlarged pores' },
  { id: 'Dry', label: 'Dry / Dehydrated', desc: 'Flaky, tight, lacking moisture' },
  { id: 'Combination', label: 'Combination', desc: 'Oily T-zone, normal or dry cheeks' },
  { id: 'Sensitive', label: 'Sensitive', desc: 'Prone to redness, burning, allergies' },
  { id: 'Normal', label: 'Normal / Balanced', desc: 'Comfortable, neither dry nor oily' },
];

const CONCERN_OPTIONS = [
  '🌞 Sun Tan & Uneven Tone',
  '🌸 Acne & Breakouts',
  '✨ Dull Skin & Glow Need',
  '🌿 Dark Spots & Pigmentation',
  '💧 Barrier Damage & Redness',
  '🍃 Anti-Aging & Fine Lines',
  '🛁 Handcrafted Soap Advice',
  '🧴 Custom Routine Formulation',
];

const CONTACT_MODES = [
  { id: 'WhatsApp', label: 'WhatsApp', desc: 'Fastest reply (2-4 hrs)' },
  { id: 'Email', label: 'Email Report', desc: 'Detailed routine doc' },
  { id: 'Phone Call', label: 'Phone Call', desc: '1-on-1 expert call' },
];

export default function ConsultationPage() {
  const { isSignedIn, user } = useUser();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    skin_type: 'Combination',
    concern: '🌞 Sun Tan & Uneven Tone',
    preferred_contact: 'WhatsApp',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Auto-fill details from Clerk if available
  useEffect(() => {
    if (isSignedIn && user) {
      setFormData((prev) => ({
        ...prev,
        name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.name,
        email: user.primaryEmailAddress?.emailAddress || prev.email,
        phone: user.primaryPhoneNumber?.phoneNumber || prev.phone,
      }));
    }
  }, [isSignedIn, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Please provide your full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }
    if (formData.message.trim().length < 10) {
      setErrorMessage('Please describe your skin query in at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        skin_type: formData.skin_type,
        concern: formData.concern,
        preferred_contact: formData.preferred_contact,
        message: formData.message.trim(),
        user_id: user?.id || null,
      };

      const res = await fetch(`${API_BASE_URL}/api/consultations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to submit consultation query.');
      }

      const created = await res.json();
      setSuccessData(created);
    } catch (err) {
      setErrorMessage(err.message || 'Network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-fadeIn">
      {/* 1. Hero Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#FAF8F5] text-[#B08D57] font-cinzel text-xs font-semibold px-4 py-1.5 rounded-full border border-[#B08D57]/30">
          <HeartHandshake className="w-3.5 h-3.5" />
          <span className="tracking-[0.22em] uppercase">Clinical Botanical Dermatological Advisory</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-editorial text-[#241F1A]">
          Personal Skin Diagnostic Consultation
        </h1>
        <p className="text-xs sm:text-sm text-[#6B5D50] leading-relaxed">
          Submit your dermatology or formulation inquiries. Our board-certified botanical cosmetologists and Ayurvedic physicians review your epidermal history and deliver a tailored care protocol within 2–4 hours.
        </p>
      </div>

      {/* 2. Success Modal / State */}
      {successData ? (
        <div className="bg-white rounded-3xl border border-[#E4DACB] p-8 sm:p-12 text-center shadow-soft max-w-2xl mx-auto space-y-6 animate-scaleUp">
          <div className="w-16 h-16 rounded-full bg-[#E8EAE3] border border-[#C8D0BE] flex items-center justify-center text-[#3F4A3D] mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#3F4A3D] bg-[#D8DED1]/80 px-3 py-1 rounded-full uppercase tracking-wider">
              Inquiry Registered
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#241F1A]">
              Consultation Request Received!
            </h2>
            <p className="text-xs text-[#9B8B7A]">
              Inquiry Reference ID:{' '}
              <span className="font-mono font-bold text-[#3F4A3D]">
                #{successData.id.slice(0, 8).toUpperCase()}
              </span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F3ED] border border-[#E4DACB] text-left text-xs text-[#6B5D50] space-y-2">
            <div className="flex justify-between">
              <span className="text-[#9B8B7A]">Customer Name:</span>
              <span className="font-semibold text-[#241F1A]">{successData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9B8B7A]">Selected Concern:</span>
              <span className="font-semibold text-[#3F4A3D]">{successData.concern}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9B8B7A]">Response Channel:</span>
              <span className="font-semibold text-[#241F1A]">{successData.preferred_contact}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9B8B7A]">Estimated Response:</span>
              <span className="font-bold text-[#3F4A3D]">Within 2 to 4 Hours</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSuccessData(null);
                setFormData((p) => ({ ...p, message: '' }));
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-semibold text-[#6B5D50] bg-[#F7F3ED] hover:bg-[#EDE6DB] border border-[#E4DACB] transition-all"
            >
              Submit Another Query
            </button>
            <Link
              to="/skin-analyzer"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#3F4A3D] hover:bg-[#2C352B] transition-all flex items-center justify-center gap-1.5 shadow-soft"
            >
              <span>Scan Face with AI Diagnostic</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* 3. Main Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: The Query Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-2 bg-white rounded-3xl border border-[#E4DACB] p-6 sm:p-8 shadow-soft space-y-6"
          >
            <div className="border-b border-[#E4DACB] pb-4">
              <h2 className="font-serif font-bold text-xl text-[#241F1A] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#3F4A3D]" />
                <span>Tell Us What Your Skin Needs</span>
              </h2>
              <p className="text-xs text-[#9B8B7A] mt-0.5">
                Every query is personally examined by certified Ayurvedic cosmetologists.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-[#F3E8E2] border border-[#E0C9BF] text-xs text-[#9A4A3A] flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#241F1A] mb-1.5">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pooja Verma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F7F3ED]/60 border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D] text-[#241F1A]"
                  />
                  <User className="w-4 h-4 text-[#9B8B7A] absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#241F1A] mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="pooja@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F7F3ED]/60 border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D] text-[#241F1A]"
                  />
                  <Mail className="w-4 h-4 text-[#9B8B7A] absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Phone & Preferred Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#241F1A] mb-1.5">
                  Phone / WhatsApp (Optional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F7F3ED]/60 border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D] text-[#241F1A]"
                  />
                  <Phone className="w-4 h-4 text-[#9B8B7A] absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#241F1A] mb-1.5">
                  Preferred Contact Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CONTACT_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, preferred_contact: mode.id })}
                      className={`p-2 rounded-xl text-[11px] font-semibold text-center border transition-all ${
                        formData.preferred_contact === mode.id
                          ? 'bg-[#3F4A3D] text-white border-[#3F4A3D] shadow-xs'
                          : 'bg-[#F7F3ED]/60 text-[#6B5D50] border-[#E4DACB] hover:border-[#3F4A3D]/40'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Skin Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#241F1A] mb-2">
                What is your Skin Type?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SKIN_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, skin_type: t.id })}
                    className={`p-2.5 rounded-2xl text-left border transition-all ${
                      formData.skin_type === t.id
                        ? 'bg-[#EDE6DB] border-[#3F4A3D] text-[#241F1A] ring-1 ring-[#3F4A3D]'
                        : 'bg-white border-[#E4DACB] text-[#6B5D50] hover:bg-[#F7F3ED]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{t.label}</span>
                      {formData.skin_type === t.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#3F4A3D]" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#9B8B7A] mt-0.5 line-clamp-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Skin Concern */}
            <div>
              <label className="block text-xs font-semibold text-[#241F1A] mb-2">
                Primary Skin Concern / Target Issue
              </label>
              <div className="flex flex-wrap gap-2">
                {CONCERN_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, concern: c })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      formData.concern === c
                        ? 'bg-[#3F4A3D] text-white border-[#3F4A3D] shadow-xs'
                        : 'bg-[#F7F3ED]/80 text-[#6B5D50] border-[#E4DACB] hover:border-[#3F4A3D]/50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Message Query */}
            <div>
              <label className="block text-xs font-semibold text-[#241F1A] mb-1.5">
                Describe Your Skincare Query in Detail <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe what symptoms you have, how long you've noticed them, any soap or cosmetics you currently use, and what outcome you desire..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full p-3 text-xs rounded-2xl bg-[#F7F3ED]/60 border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D] text-[#241F1A] resize-none"
              />
              <p className="text-[10px] text-[#9B8B7A] mt-1 flex items-center justify-between">
                <span>Minimum 10 characters</span>
                <span>{formData.message.length} characters entered</span>
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#241F1A] hover:bg-[#B08D57] hover:text-[#241F1A] text-[#F7F3ED] py-4 rounded-full font-cinzel text-xs font-semibold uppercase tracking-[0.2em] shadow-md transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Inquiry to Dermatologists...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Transmit Query for Atelier Consultation</span>
                </>
              )}
            </button>
          </form>

          {/* Right Column: Advisory Trust Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#E4DACB] p-6 shadow-soft space-y-4">
              <h3 className="font-serif font-bold text-base text-[#241F1A] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#3F4A3D]" />
                <span>Why Skinora Consultations?</span>
              </h3>

              <div className="space-y-3.5 text-xs text-[#6B5D50]">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#3F4A3D] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#241F1A]">100% Free &amp; Confidential</strong>
                    <span className="text-[#9B8B7A]">
                      Your skin photos and concerns are reviewed strictly by licensed Ayurvedic professionals.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#3F4A3D] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#241F1A]">Rapid Clinical Turnaround</strong>
                    <span className="text-[#9B8B7A]">
                      Personalized diagnosis and routine recommendations sent within 2-4 working hours.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#3F4A3D] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#241F1A]">Pure Botanicals Only</strong>
                    <span className="text-[#9B8B7A]">
                      Zero steroid, zero chemical solutions. Recipes made with pure sandalwood, saffron, and cold-pressed oils.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Link to AI Analyzer */}
            <div className="bg-gradient-to-br from-[#F7F3ED] to-[#EDE6DB] rounded-3xl border border-[#E4DACB] p-6 space-y-3">
              <span className="text-[10px] font-bold text-[#3F4A3D] uppercase tracking-wider block">
                Instant AI Alternative
              </span>
              <h4 className="font-serif font-bold text-sm text-[#241F1A]">
                Want Immediate Camera Diagnostics?
              </h4>
              <p className="text-xs text-[#9B8B7A]">
                Use our Gemini 2.0 Vision clinical scanner right now to scan barrier health in 3 seconds.
              </p>
              <Link
                to="/skin-analyzer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3F4A3D] hover:underline pt-1"
              >
                <span>Launch AI Skin Scanner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
