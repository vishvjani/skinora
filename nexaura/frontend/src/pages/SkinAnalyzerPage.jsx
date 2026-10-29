import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, 
  Sun, Moon, ShieldCheck, ArrowRight, Zap, Eye, Sliders, Droplets,
  Award, Heart, ShoppingBag, Info, ChevronRight, Activity, AlertCircle
} from 'lucide-react';
import { apiService } from '../services/api';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export default function SkinAnalyzerPage() {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  // Mode: 'capture' (camera/upload) -> 'scanning' (animation) -> 'results'
  const [stage, setStage] = useState('capture');
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' or 'upload'
  const [capturedImage, setCapturedImage] = useState(null);
  const [activeRoutineTab, setActiveRoutineTab] = useState('am'); // 'am' or 'pm'
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bundleAdded, setBundleAdded] = useState(false);
  const [scanStepText, setScanStepText] = useState('Initializing Gemini 1.5 Vision Core...');
  const [errorMessage, setErrorMessage] = useState(null);

  // Camera references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // Initialize camera when camera tab is selected
  useEffect(() => {
    if (activeTab === 'camera' && stage === 'capture') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, stage]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable:", err);
      setCameraError("Camera permission was not granted or camera is not available. You can use the 'Upload Photo' tab to select an existing selfie.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    triggerScanSequence({ image_data: dataUrl });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setErrorMessage(null);
    try {
      const compressedDataUrl = await compressImage(file);
      setCapturedImage(compressedDataUrl);
      triggerScanSequence({ image_data: compressedDataUrl });
    } catch (err) {
      console.warn("Compression fallback:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setCapturedImage(dataUrl);
        triggerScanSequence({ image_data: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerScanSequence = async (payload) => {
    setErrorMessage(null);
    setStage('scanning');
    setIsProcessing(true);

    const steps = [
      'Establishing secure connection with Gemini AI Vision...',
      'Verifying facial landmarks & dermal focal boundaries...',
      'Mapping epidermal lipid distribution (Sebum Index)...',
      'Quantifying follicular micro-congestion & erythema flush...',
      'Analyzing melanin uniformity & Fitzpatrick phototype...',
      'Querying ChromaDB vector core for botanical routine match...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setScanStepText(steps[currentStep]);
      }
    }, 450);

    try {
      const res = await apiService.analyzeSkin(payload);
      clearInterval(interval);
      setDiagnosticResult(res);
      setIsProcessing(false);
      setStage('results');
    } catch (err) {
      clearInterval(interval);
      console.error("Skin diagnostic failed:", err);
      setIsProcessing(false);
      setStage('capture');

      // Extract specific medical validation message if available
      const detail = err.response?.data?.detail || err.message || "Diagnostic could not complete. Please provide a clear facial photo.";
      setErrorMessage(detail);
    }
  };

  const handleAddBundleToCart = () => {
    if (!diagnosticResult) return;
    const itemsToAdd = activeRoutineTab === 'am' ? diagnosticResult.am_routine : diagnosticResult.pm_routine;
    
    itemsToAdd.forEach((item) => {
      addToCart({
        id: item.product_id,
        name: item.product_name,
        price: item.price,
        mrp: item.mrp,
        image_url: item.image_url,
        category: item.category,
        brand: item.brand
      }, 1);
    });

    setBundleAdded(true);
    setTimeout(() => {
      navigate('/checkout');
    }, 1000);
  };

  const resetDiagnostic = () => {
    setStage('capture');
    setDiagnosticResult(null);
    setCapturedImage(null);
    setBundleAdded(false);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-fadeIn">
      
      {/* Top Hero Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EDE6DB] border border-[#B08D57]/50 text-[#3F4A3D] text-[11px] font-bold uppercase tracking-wider shadow-xs">
          <Sparkles className="w-4 h-4 text-[#B08D57]" /> Multimodal AI Vision Core &amp; ChromaDB Dense Embeddings
        </div>
        <h1 className="font-serif text-3xl sm:text-6xl font-bold tracking-editorial text-[#241F1A]">
          Atelier Clinical Facial Scanner
        </h1>
        <p className="text-sm sm:text-base text-[#6B5D50] leading-relaxed max-w-2xl mx-auto">
          High-fidelity dermatological visual analysis. Our multimodal vision architecture dynamically analyzes facial sebum distribution, follicular congestion, epidermal hydration deficit, erythema flush, and melanin uniformity to curate your bespoke AM &amp; PM botanical ritual.
        </p>
      </div>

      {/* ── STAGE 1: CAPTURE & INPUT ───────────────────────────────────────── */}
      {stage === 'capture' && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-[#E4DACB] shadow-soft p-6 sm:p-10 space-y-8">
          
          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-[#F3E8E2] border border-[#E0C9BF] text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-[#9A4A3A] flex-shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <strong className="font-bold block text-rose-900">Image Verification Notice</strong>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Mode Switcher: Camera vs Upload */}
          <div className="flex border-b border-[#E4DACB] justify-center gap-8 text-sm font-bold">
            <button
              onClick={() => { setActiveTab('camera'); setErrorMessage(null); }}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'camera'
                  ? 'border-[#3F4A3D] text-[#3F4A3D]'
                  : 'border-transparent text-[#9B8B7A] hover:text-[#241F1A]'
              }`}
            >
              <Camera className="w-4 h-4" /> Live Camera Scanner
            </button>
            <button
              onClick={() => { setActiveTab('upload'); setErrorMessage(null); }}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'border-[#3F4A3D] text-[#3F4A3D]'
                  : 'border-transparent text-[#9B8B7A] hover:text-[#241F1A]'
              }`}
            >
              <Upload className="w-4 h-4" /> Upload Photo
            </button>
          </div>

          {/* TAB 1: LIVE CAMERA */}
          {activeTab === 'camera' && (
            <div className="space-y-6 text-center max-w-md mx-auto">
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto rounded-full overflow-hidden border-4 border-[#3F4A3D] shadow-2xl bg-black flex items-center justify-center">
                {cameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="text-white text-xs p-6 space-y-3">
                    {cameraError ? (
                      <div className="text-rose-300 space-y-2">
                        <AlertTriangle className="w-8 h-8 mx-auto" />
                        <p>{cameraError}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Camera className="w-10 h-10 mx-auto animate-pulse text-[#DDA15E]" />
                        <p>Requesting camera permissions…</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Target Face Oval Overlay */}
                <div className="absolute inset-0 border-2 border-white/40 rounded-full pointer-events-none" />
                <div className="absolute inset-8 border border-dashed border-[#DDA15E]/80 rounded-full pointer-events-none animate-pulse" />
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  disabled={!cameraStream}
                  className="w-full max-w-xs mx-auto bg-[#3F4A3D] hover:bg-[#A3591B] disabled:bg-stone-300 text-white py-3.5 px-6 rounded-full font-bold text-xs shadow-soft transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Camera className="w-4 h-4" /> Capture Face &amp; Analyze with AI
                </button>
                <p className="text-[11px] text-[#9B8B7A]">
                  Align your face within the circle in a well-lit environment.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD PHOTO */}
          {activeTab === 'upload' && (
            <div className="max-w-md mx-auto text-center space-y-6">
              <label className="border-2 border-dashed border-[#3F4A3D]/40 hover:border-[#3F4A3D] rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition bg-[#F7F3ED] space-y-3 hover:scale-[1.01]">
                <div className="w-16 h-16 rounded-full bg-[#F7EDE2] text-[#3F4A3D] flex items-center justify-center shadow-inner">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <span className="font-bold text-sm text-[#241F1A] block">Click to choose or drop a facial selfie</span>
                  <span className="text-xs text-[#9B8B7A]">Supports JPG, PNG, WEBP (Up to 10MB)</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-[#9B8B7A]">
                Photos are analyzed strictly for dermatological diagnostic scoring and are never retained or sold.
              </p>
            </div>
          )}

          {/* Clinical Guidelines Card */}
          <div className="p-4 rounded-2xl bg-[#F7F3ED] border border-[#E4DACB] space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#3F4A3D] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> For Optimal Dermatological Accuracy:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-[#5C4E4B]">
              <div className="p-2.5 rounded-xl bg-white border border-[#E4DACB]">
                <strong className="block text-[#241F1A] mb-0.5">1. Direct Lighting</strong>
                Face natural, soft light directly; avoid harsh backlighting.
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E4DACB]">
                <strong className="block text-[#241F1A] mb-0.5">2. Unobstructed</strong>
                Ensure forehead, cheeks, and chin are visible without masks.
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E4DACB]">
                <strong className="block text-[#241F1A] mb-0.5">3. Natural Skin</strong>
                Avoid heavy digital beauty filters for genuine pore reading.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── STAGE 2: SCANNING HOLOGRAPHIC ANIMATION ────────────────────────── */}
      {stage === 'scanning' && (
        <div className="max-w-xl mx-auto bg-white p-10 sm:p-12 rounded-3xl border border-[#E4DACB] shadow-2xl text-center space-y-8 animate-fadeIn">
          
          <div className="relative w-56 h-56 mx-auto rounded-full overflow-hidden border-4 border-[#3F4A3D] shadow-glow flex items-center justify-center bg-stone-900">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Scanning Face"
                className="w-full h-full object-cover opacity-85 filter contrast-125"
              />
            ) : (
              <div className="text-white text-xs">Connecting Neural Vision Pipeline...</div>
            )}

            {/* Glowing Laser Scanline */}
            <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scanline" />
            
            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-mono font-bold animate-pulse">
              <Activity className="w-3.5 h-3.5 animate-spin" /> Neural Diagnostic Pipeline Active
            </div>
            <h3 className="font-serif font-bold text-xl text-[#241F1A]">
              {scanStepText}
            </h3>
            <p className="text-xs text-[#9B8B7A] max-w-sm mx-auto">
              Performing multi-spectral feature extraction and computing dense cosine similarity vectors with ChromaDB.
            </p>
          </div>
        </div>
      )}

      {/* ── STAGE 3: DIAGNOSTIC RESULTS & ROUTINE DASHBOARD ─────────────────── */}
      {stage === 'results' && diagnosticResult && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Top Bar with Re-Scan Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E4DACB] shadow-soft">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2C352B]">
                  Diagnosis Complete • {diagnosticResult.analysis_source}
                </span>
              </div>
              <h2 className="font-serif font-bold text-2xl text-[#241F1A]">
                {diagnosticResult.skin_type}
              </h2>
              <span className="text-xs text-[#9B8B7A] inline-block font-mono">
                Fitzpatrick Classification: {diagnosticResult.fitzpatrick_type}
              </span>
            </div>

            <button
              onClick={resetDiagnostic}
              className="px-5 py-2.5 rounded-full border border-[#DDA15E] text-[#3F4A3D] hover:bg-[#F7EDE2] text-xs font-bold transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Scan Another Photo
            </button>
          </div>

          {/* 2-Column Split: Clinical Summary + Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Overall Health Score & Clinical Summary */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E4DACB] shadow-soft space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#9B8B7A]">
                  Overall Skin Health Index
                </span>
                
                {/* Score Circular Dial */}
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center rounded-full border-8 border-[#F7EDE2] shadow-inner bg-[#F7F3ED]">
                  <div className="text-center">
                    <span className="text-4xl font-serif font-extrabold text-[#241F1A]">
                      {diagnosticResult.overall_score}
                    </span>
                    <span className="text-[11px] text-[#9B8B7A] block font-bold">/ 100</span>
                  </div>
                  <div 
                    className="absolute inset-0 rounded-full border-8 border-[#3F4A3D] border-t-transparent animate-spin-slow pointer-events-none"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 70%)' }}
                  />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-xs font-bold text-[#2C352B] bg-[#E8EAE3] px-3 py-1 rounded-full border border-[#C8D0BE] inline-block">
                    Diagnostic Grade: Clinical Formulation Match
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F3ED] border border-[#E4DACB] text-xs text-[#5C4E4B] leading-relaxed">
                  <strong className="block text-[#241F1A] mb-1 font-serif">Clinical Assessment:</strong>
                  {diagnosticResult.clinical_summary}
                </div>
              </div>

              {/* Target Actives Recommended */}
              <div className="pt-4 border-t border-[#E4DACB] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9B8B7A] block">
                  Prescribed Botanical Actives
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {diagnosticResult.target_actives.map((active, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F7EDE2] text-[#3F4A3D] border border-[#DDA15E]/40"
                    >
                      ✦ {active}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 2 Columns: Detailed Clinical Metrics Breakdown */}
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-[#E4DACB] shadow-soft space-y-6">
              <div className="flex items-center justify-between border-b border-[#E4DACB] pb-3">
                <h3 className="font-serif font-bold text-lg text-[#241F1A] flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#3F4A3D]" /> Biomarker Analysis
                </h3>
                <span className="text-xs text-[#9B8B7A]">
                  Evaluated via Computer Vision Density
                </span>
              </div>

              <div className="space-y-4">
                {diagnosticResult.metrics.map((metric, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#F7F3ED] border border-[#E4DACB] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#241F1A] text-sm flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
                        {metric.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span 
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: metric.color }}
                        >
                          {metric.status}
                        </span>
                        <span className="font-mono font-bold text-[#241F1A] text-sm">
                          {metric.score}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#E4DACB] rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full transition-all duration-1000"
                        style={{
                          width: `${metric.score}%`,
                          backgroundColor: metric.color,
                        }}
                      />
                    </div>

                    <p className="text-[11px] text-[#9B8B7A]">
                      {metric.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── ROUTINE RECOMMENDATION ENGINE SECTION ───────────────────────── */}
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-[#E4DACB] shadow-soft space-y-8">
            
            {/* Header with AM/PM Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DACB] pb-6">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#3F4A3D] bg-[#F7EDE2] px-3 py-1 rounded-full border border-[#DDA15E]/30 inline-block">
                  AI Prescribed Botanical Protocol
                </span>
                <h3 className="font-serif font-bold text-2xl text-[#241F1A]">
                  Your Tailored AM &amp; PM Routine
                </h3>
                <p className="text-xs text-[#9B8B7A]">
                  Matched from 65 botanical formulations using ChromaDB dense vector cosine similarity.
                </p>
              </div>

              {/* AM vs PM Toggle */}
              <div className="flex bg-[#F7F3ED] p-1.5 rounded-2xl border border-[#E4DACB] text-xs font-bold">
                <button
                  onClick={() => setActiveRoutineTab('am')}
                  className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                    activeRoutineTab === 'am'
                      ? 'bg-[#3F4A3D] text-white shadow-soft'
                      : 'text-[#9B8B7A] hover:text-[#241F1A]'
                  }`}
                >
                  <Sun className="w-4 h-4" /> Morning (AM) Protocol
                </button>
                <button
                  onClick={() => setActiveRoutineTab('pm')}
                  className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                    activeRoutineTab === 'pm'
                      ? 'bg-[#241F1A] text-white shadow-soft'
                      : 'text-[#9B8B7A] hover:text-[#241F1A]'
                  }`}
                >
                  <Moon className="w-4 h-4" /> Evening (PM) Protocol
                </button>
              </div>
            </div>

            {/* Routine Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(activeRoutineTab === 'am' ? diagnosticResult.am_routine : diagnosticResult.pm_routine).map((item) => (
                <div
                  key={item.step_number}
                  className="bg-[#F7F3ED] rounded-2xl border border-[#E4DACB] p-5 flex flex-col justify-between space-y-4 hover:shadow-hover hover:border-[#3F4A3D]/40 transition group"
                >
                  <div className="space-y-3">
                    {/* Step indicator */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F4A3D] bg-[#F7EDE2] px-2.5 py-0.5 rounded-full border border-[#DDA15E]/40">
                        Step {item.step_number}
                      </span>
                      <span className="text-[10px] font-bold text-[#2C352B] bg-[#E8EAE3] px-2 py-0.5 rounded border border-[#C8D0BE]">
                        ✨ {item.similarity_score}% Match
                      </span>
                    </div>

                    {/* Image */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#E4DACB]">
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>

                    {/* Meta */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#9B8B7A] tracking-wider block">
                        {item.step_name}
                      </span>
                      <h4 className="font-bold text-[#241F1A] text-sm line-clamp-2 mt-0.5 group-hover:text-[#3F4A3D] transition">
                        {item.product_name}
                      </h4>
                      <p className="text-[11px] text-[#5C4E4B] mt-1.5 italic line-clamp-2">
                        "{item.why_matched}"
                      </p>
                    </div>
                  </div>

                  {/* Price & Add Single */}
                  <div className="pt-3 border-t border-[#E4DACB] flex items-center justify-between">
                    <div>
                      <span className="text-base font-serif font-bold text-[#241F1A]">
                        ₹{item.price}
                      </span>
                      {item.mrp > item.price && (
                        <span className="text-xs text-[#9B8B7A] line-through ml-1.5">
                          ₹{item.mrp}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => addToCart({
                        id: item.product_id,
                        name: item.product_name,
                        price: item.price,
                        mrp: item.mrp,
                        image_url: item.image_url,
                        category: item.category,
                        brand: item.brand
                      }, 1)}
                      className="px-3 py-1.5 rounded-lg bg-[#3F4A3D] hover:bg-[#A3591B] text-white text-xs font-bold transition shadow-xs"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 1-Click Complete Routine Checkout Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#F7EDE2] to-[#F7F3ED] border-2 border-[#DDA15E] shadow-soft flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#3F4A3D] text-white text-[11px] font-bold uppercase tracking-wider">
                  <Award className="w-3.5 h-3.5" /> 15% Diagnostic Bundle Discount Applied
                </div>
                <h4 className="font-serif font-bold text-xl sm:text-2xl text-[#241F1A]">
                  Adopt the Complete {activeRoutineTab === 'am' ? 'Morning (AM)' : 'Evening (PM)'} Protocol
                </h4>
                <p className="text-xs text-[#5C4E4B] max-w-lg">
                  Curated to work synergistically. Includes account-locked promo code{' '}
                  <strong className="text-[#3F4A3D] font-mono">{diagnosticResult.bundle_discount_code}</strong>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <div className="text-center sm:text-right">
                  <span className="text-xs text-[#9B8B7A] line-through block">
                    ₹{diagnosticResult.bundle_original_price}
                  </span>
                  <span className="font-serif text-3xl font-extrabold text-[#3F4A3D]">
                    ₹{diagnosticResult.bundle_discounted_price}
                  </span>
                </div>

                <button
                  onClick={handleAddBundleToCart}
                  disabled={bundleAdded}
                  className="w-full sm:w-auto bg-[#3F4A3D] hover:bg-[#A3591B] disabled:bg-[#3F4A3D] text-white px-8 py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-soft hover:shadow-hover transition-all flex items-center justify-center gap-2"
                >
                  {bundleAdded ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Added to Bag! Proceeding...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" /> Add Complete Routine &amp; Checkout
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Medical Disclaimer Note */}
            <div className="p-4 rounded-2xl bg-[#F7F3ED] border border-[#E4DACB] flex items-start gap-3 text-xs text-[#9B8B7A]">
              <ShieldCheck className="w-5 h-5 text-[#3F4A3D] flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-[#241F1A]">Dermatological Safety Disclaimer:</strong> Skinora AI Skin Diagnostic leverages multimodal computer vision for cosmetic routine optimization and barrier replenishment. For acute cutaneous infections, cystic nodular acne, or suspicious pigmented lesions, consult a licensed physician or dermatologist.
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
