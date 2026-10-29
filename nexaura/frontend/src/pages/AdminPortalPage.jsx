import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  LogOut,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Phone,
  Mail,
  Trash2,
  Edit3,
  Sparkles,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';

import { getApiBaseUrl } from '../services/api';

const API_BASE_URL = getApiBaseUrl();

export default function AdminPortalPage() {
  const [adminToken, setAdminToken] = useState(
    () => sessionStorage.getItem('skinora_admin_token') || ''
  );

  // Login form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard state
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Inquiry for Modal View & Editing Notes
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [modalFeedback, setModalFeedback] = useState('');

  // 1. Fetch consultations and stats when logged in
  const fetchConsultations = async () => {
    if (!adminToken) return;
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      // Fetch list
      const queryParams = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());

      const [resList, resStats] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/consultations?${queryParams.toString()}`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/stats`, { headers }),
      ]);

      if (resList.status === 401 || resList.status === 403) {
        // Token expired
        sessionStorage.removeItem('skinora_admin_token');
        setAdminToken('');
        return;
      }

      if (resList.ok) {
        const data = await resList.json();
        setInquiries(data);
      }
      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData);
      }
    } catch (err) {
      console.warn('Error fetching admin consultations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, [adminToken, statusFilter]);

  // 2. Handle Admin Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Invalid admin credentials');
      }

      const data = await res.json();
      sessionStorage.setItem('skinora_admin_token', data.access_token);
      setAdminToken(data.access_token);
      setLoginForm({ username: '', password: '' });
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check username and password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 3. Handle Admin Logout
  const handleLogout = () => {
    sessionStorage.removeItem('skinora_admin_token');
    setAdminToken('');
    setInquiries([]);
    setSelectedInquiry(null);
  };

  // 4. Update Status & Notes for an Inquiry
  const handleUpdateInquiry = async (inquiryId, newStatus, notesToSave) => {
    setUpdatingStatus(true);
    setModalFeedback('');
    try {
      const payload = {};
      if (newStatus) payload.status = newStatus;
      if (notesToSave !== undefined) payload.admin_notes = notesToSave;

      const res = await fetch(`${API_BASE_URL}/api/admin/consultations/${inquiryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        // update local list
        setInquiries((prev) => prev.map((item) => (item.id === inquiryId ? updated : item)));
        if (selectedInquiry && selectedInquiry.id === inquiryId) {
          setSelectedInquiry(updated);
        }
        setModalFeedback('✓ Inquiry updated in database!');
        // Refresh stats
        fetch(`${API_BASE_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
          .then((r) => r.json())
          .then((s) => setStats(s))
          .catch(() => {});
      } else {
        setModalFeedback('Failed to update inquiry');
      }
    } catch (err) {
      setModalFeedback('Network error while updating inquiry');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 5. Delete an Inquiry
  const handleDeleteInquiry = async (inquiryId) => {
    if (!window.confirm('Are you sure you want to permanently delete this customer inquiry?')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/consultations/${inquiryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        setInquiries((prev) => prev.filter((item) => item.id !== inquiryId));
        if (selectedInquiry && selectedInquiry.id === inquiryId) {
          setSelectedInquiry(null);
        }
      }
    } catch (err) {
      alert('Failed to delete inquiry.');
    }
  };

  // Status styling helper
  const getStatusBadge = (st) => {
    switch (st) {
      case 'PENDING':
        return (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
            Pending
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
            In Review
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
            Contacted
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="bg-[#D8DED1] text-[#2C352B] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#C8D0BE]">
            Resolved
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            {st}
          </span>
        );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: Admin Login View
  // ─────────────────────────────────────────────────────────────────────────────
  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 animate-fadeIn">
        <div className="bg-white rounded-3xl border border-[#E4DACB] p-8 shadow-soft space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#EDE6DB] border border-[#E4DACB] flex items-center justify-center text-[#3F4A3D] mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#9A4A3A] bg-[#F3E8E2] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-[#EAD9D2]">
              Restricted Area
            </span>
            <h1 className="font-serif text-2xl font-bold text-[#241F1A]">
              Skinora Admin Portal
            </h1>
            <p className="text-xs text-[#9B8B7A]">
              Administrative access strictly reserved for authorized clinical staff.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-[#F3E8E2] border border-[#E0C9BF] text-xs text-[#9A4A3A] flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-[#241F1A] mb-1">
                Admin Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F7F3ED]/60 border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D] text-[#241F1A]"
                />
                <User className="w-4 h-4 text-[#9B8B7A] absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#241F1A] mb-1">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F7F3ED]/60 border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D] text-[#241F1A]"
                />
                <Lock className="w-4 h-4 text-[#9B8B7A] absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#241F1A] hover:bg-[#1A0F11] text-white py-2.5 rounded-xl text-xs font-semibold transition-all shadow-soft flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#3F4A3D]" />
                  <span>Unlock Admin Dashboard</span>
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-[#9B8B7A] pt-2 border-t border-[#E4DACB]">
            🔒 Regular users cannot access this panel. Credentials: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">admin / admin123</code>
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: Admin Dashboard View
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DACB] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241F1A]">
              Consultation &amp; Inquiries Panel
            </h1>
            <span className="text-[10px] font-bold text-white bg-[#3F4A3D] px-2.5 py-0.5 rounded-full">
              ADMIN LIVE
            </span>
          </div>
          <p className="text-xs text-[#9B8B7A] mt-0.5">
            Review user skincare queries, formulate doctor prescriptions, and manage customer tickets.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchConsultations}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6B5D50] bg-white border border-[#E4DACB] hover:bg-[#F7F3ED] transition-all"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#9A4A3A] bg-[#F3E8E2] hover:bg-[#EAD9D2] border border-[#E0C9BF] transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Admin</span>
          </button>
        </div>
      </div>

      {/* 2. Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E4DACB] shadow-soft space-y-1">
          <span className="text-[11px] font-semibold text-[#9B8B7A] block">Total Inquiries</span>
          <span className="text-2xl font-bold text-[#241F1A]">
            {stats?.total_inquiries ?? inquiries.length}
          </span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/70 shadow-soft space-y-1">
          <span className="text-[11px] font-semibold text-amber-800 block">Pending Review</span>
          <span className="text-2xl font-bold text-amber-900">
            {stats?.pending_inquiries ?? inquiries.filter((i) => i.status === 'PENDING').length}
          </span>
        </div>

        <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-200/70 shadow-soft space-y-1">
          <span className="text-[11px] font-semibold text-sky-800 block">In Review</span>
          <span className="text-2xl font-bold text-sky-900">
            {stats?.in_review_inquiries ?? inquiries.filter((i) => i.status === 'IN_REVIEW').length}
          </span>
        </div>

        <div className="bg-[#E8EAE3]/70 p-4 rounded-2xl border border-[#C8D0BE]/70 shadow-soft space-y-1">
          <span className="text-[11px] font-semibold text-[#2C352B] block">Resolved Cases</span>
          <span className="text-2xl font-bold text-[#241F1A]">
            {stats?.resolved_inquiries ?? inquiries.filter((i) => i.status === 'RESOLVED').length}
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E4DACB] shadow-soft">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {['ALL', 'PENDING', 'IN_REVIEW', 'CONTACTED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-[#3F4A3D] text-white shadow-xs'
                  : 'text-[#6B5D50] bg-[#F7F3ED] hover:bg-[#EDE6DB]'
              }`}
            >
              {st === 'ALL' ? 'All Inquiries' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search name, email, query..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchConsultations()}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-[#F7F3ED]/80 border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D] text-[#241F1A]"
          />
          <Search className="w-3.5 h-3.5 text-[#9B8B7A] absolute left-3 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTimeout(fetchConsultations, 50);
              }}
              className="absolute right-2.5 top-2 text-[#9B8B7A] hover:text-[#241F1A]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Inquiries Table / Cards */}
      {inquiries.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E4DACB] p-12 text-center shadow-soft space-y-3">
          <MessageSquare className="w-10 h-10 text-[#9B8B7A] mx-auto opacity-40" />
          <h3 className="font-serif font-bold text-lg text-[#241F1A]">
            No Inquiries Found
          </h3>
          <p className="text-xs text-[#9B8B7A] max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try changing your status filter or clearing your search term.'
              : 'New customer skincare inquiries will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {inquiries.map((inq) => (
            <div
              key={inq.id}
              className="bg-white p-5 rounded-2xl border border-[#E4DACB] shadow-soft hover:shadow-hover transition-all space-y-3.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4DACB] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#EDE6DB] border border-[#E4DACB] flex items-center justify-center font-bold text-xs text-[#3F4A3D]">
                    {inq.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-sm text-[#241F1A]">{inq.name}</h3>
                      {getStatusBadge(inq.status)}
                    </div>
                    <span className="text-[11px] text-[#9B8B7A]">
                      Ref: <code className="text-[#3F4A3D]">#{inq.id.slice(0, 8).toUpperCase()}</code> •{' '}
                      {inq.created_at
                        ? new Date(inq.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Recent'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {inq.email && (
                    <a
                      href={`mailto:${inq.email}?subject=Skinora Skincare Consultation Reply`}
                      className="p-1.5 text-[#6B5D50] hover:text-[#3F4A3D] hover:bg-[#F7F3ED] rounded-lg border border-[#E4DACB] transition-all flex items-center gap-1"
                      title="Send Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{inq.email}</span>
                    </a>
                  )}
                  {inq.phone && (
                    <a
                      href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-[#3F4A3D] hover:bg-[#E8EAE3] rounded-lg border border-[#C8D0BE] transition-all flex items-center gap-1 font-semibold"
                      title="Open WhatsApp"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Badges: Skin type, Concern, Preferred contact */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                {inq.skin_type && (
                  <span className="bg-[#F7F3ED] text-[#6B5D50] px-2.5 py-0.5 rounded-full border border-[#E4DACB]">
                    Skin: <strong>{inq.skin_type}</strong>
                  </span>
                )}
                {inq.concern && (
                  <span className="bg-[#EDE6DB] text-[#3F4A3D] font-semibold px-2.5 py-0.5 rounded-full border border-[#E4DACB]">
                    {inq.concern}
                  </span>
                )}
                <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full">
                  Channel: <strong>{inq.preferred_contact}</strong>
                </span>
              </div>

              {/* Message Preview */}
              <div className="p-3 rounded-xl bg-[#F7F3ED] border border-[#E4DACB] text-xs text-[#241F1A] leading-relaxed">
                <span className="font-bold block text-[11px] text-[#9B8B7A] mb-1">
                  Customer Inquiry:
                </span>
                <p className="line-clamp-3">{inq.message}</p>
              </div>

              {/* Admin Notes if present */}
              {inq.admin_notes && (
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs text-blue-900 space-y-1">
                  <span className="font-bold text-[10px] uppercase text-blue-700 block">
                    Doctor / Admin Notes:
                  </span>
                  <p className="text-[11px]">{inq.admin_notes}</p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                {/* Quick Status Changers */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#9B8B7A]">Set Status:</span>
                  <button
                    onClick={() => handleUpdateInquiry(inq.id, 'PENDING')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      inq.status === 'PENDING'
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => handleUpdateInquiry(inq.id, 'IN_REVIEW')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      inq.status === 'IN_REVIEW'
                        ? 'bg-sky-100 border-sky-300 text-sky-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Reviewing
                  </button>
                  <button
                    onClick={() => handleUpdateInquiry(inq.id, 'CONTACTED')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      inq.status === 'CONTACTED'
                        ? 'bg-purple-100 border-purple-300 text-purple-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Contacted
                  </button>
                  <button
                    onClick={() => handleUpdateInquiry(inq.id, 'RESOLVED')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      inq.status === 'RESOLVED'
                        ? 'bg-[#D8DED1] border-[#B8C2AC] text-[#2C352B]'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Resolved
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedInquiry(inq);
                      setAdminNotes(inq.admin_notes || '');
                      setModalFeedback('');
                    }}
                    className="flex items-center gap-1 text-[#3F4A3D] font-semibold hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>View &amp; Add Advice</span>
                  </button>
                  <button
                    onClick={() => handleDeleteInquiry(inq.id)}
                    className="p-1 text-gray-400 hover:text-[#9A4A3A] transition-colors"
                    title="Delete Inquiry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Detail & Response Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E4DACB] p-6 sm:p-8 max-w-2xl w-full shadow-hover space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4DACB] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#241F1A]">
                  Inquiry Review &amp; Consultation Advice
                </h3>
                <span className="text-xs text-[#9B8B7A]">
                  Ref: <code className="text-[#3F4A3D]">#{selectedInquiry.id}</code>
                </span>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-1.5 rounded-full hover:bg-[#F7F3ED] text-[#9B8B7A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details Box */}
            <div className="p-4 rounded-2xl bg-[#F7F3ED] border border-[#E4DACB] space-y-2 text-xs text-[#6B5D50]">
              <div className="flex justify-between">
                <span className="text-[#9B8B7A]">Customer Name:</span>
                <span className="font-bold text-[#241F1A]">{selectedInquiry.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9B8B7A]">Email:</span>
                <span className="font-semibold">{selectedInquiry.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9B8B7A]">Phone / WhatsApp:</span>
                <span className="font-semibold">{selectedInquiry.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9B8B7A]">Skin Type &amp; Concern:</span>
                <span className="font-semibold text-[#3F4A3D]">
                  {selectedInquiry.skin_type} • {selectedInquiry.concern}
                </span>
              </div>
            </div>

            {/* Full Query */}
            <div className="space-y-1 text-xs">
              <span className="font-bold text-[#241F1A]">Full Inquiry Message:</span>
              <div className="p-3.5 rounded-2xl bg-white border border-[#E4DACB] text-[#241F1A] whitespace-pre-wrap leading-relaxed">
                {selectedInquiry.message}
              </div>
            </div>

            {/* Admin Advice / Internal Notes */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-[#241F1A] block">
                Doctor's Recommendation / Admin Resolution Notes:
              </label>
              <textarea
                rows={3}
                placeholder="Write consultation notes, recommended products (e.g. Magic De-Tan Soap + Kashmiri Saffron Serum), or instructions given to the customer..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#F7F3ED]/70 border border-[#E4DACB] focus:outline-none focus:border-[#3F4A3D] text-[#241F1A] resize-none"
              />
            </div>

            {modalFeedback && (
              <div className="text-xs font-semibold text-[#3F4A3D] bg-[#E8EAE3] p-2.5 rounded-xl border border-[#C8D0BE]">
                {modalFeedback}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9B8B7A]">Mark as:</span>
                <button
                  onClick={() =>
                    handleUpdateInquiry(selectedInquiry.id, 'RESOLVED', adminNotes)
                  }
                  disabled={updatingStatus}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#3F4A3D] hover:bg-[#3F4A3D] transition-colors"
                >
                  ✓ Mark Resolved
                </button>
                <button
                  onClick={() =>
                    handleUpdateInquiry(selectedInquiry.id, 'CONTACTED', adminNotes)
                  }
                  disabled={updatingStatus}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors"
                >
                  Mark Contacted
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateInquiry(selectedInquiry.id, null, adminNotes)}
                  disabled={updatingStatus}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#3F4A3D] hover:bg-[#2C352B] transition-colors"
                >
                  Save Notes
                </button>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#6B5D50] bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
