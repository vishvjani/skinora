# SKINORA — Luxury Ayurvedic Cosmetics Platform

Skinora is a high-luxury botanical cosmetic e-commerce and dermatological advisory platform inspired by international luxury houses (Aesop, Le Labo). It is powered by FastAPI, PostgreSQL (Neon Cloud DB), React + Vite, and Google Gemini AI.

---

## 🏛️ Platform Architecture

- **Frontend**: React (Vite 5), Tailwind CSS, Framer Motion, Lucide Icons, Clerk Authentication
- **Backend API**: FastAPI, SQLAlchemy (AsyncPG), Pydantic v2, Google Gemini Vision Core
- **Database**: PostgreSQL hosted on Neon DB with NABL test certificates, serial batch tracking, and user wallets
- **Machine Learning & Diagnostics**: Multimodal AI Skin Scanner, XGBoost pricing intelligence, sentence-transformers vector embeddings

---

## 📱 Cross-Device Responsive Layout
- Fully optimized across mobile (320px+), tablet, iPad, laptops, and ultra-wide desktop monitors
- Adaptive touch controls (1-tap quick add, mobile drawer navigation, responsive modal carousels)

---

## 🚀 Local Development

1. **Backend**:
   ```bash
   cd nexaura/backend
   pip install -r requirements.txt
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Frontend**:
   ```bash
   cd nexaura/frontend
   npm install
   npm run dev
   ```

3. **Or 1-Click Launch**:
   Run `run_dev.bat` from project root.

---

## ☁️ Production Deployment on Vercel

### 1. Frontend (`nexaura/frontend`)
- Framework Preset: `Vite`
- Root Directory: `nexaura/frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
  - `VITE_API_BASE_URL`: URL of your deployed backend (e.g. `https://your-backend.onrender.com` or backend Vercel URL)

### 2. Backend (`nexaura/backend`)
- Deploy as a Web Service on Render / Railway / Fly.io (using the included `Dockerfile`) or on Vercel (using the included `vercel.json` + `api/index.py`)
- Environment Variables:
  - `DATABASE_URL`: Your Neon PostgreSQL connection string
  - `GEMINI_API_KEY`: Your Google Gemini API key
  - `ADMIN_USERNAME`: `admin`
  - `ADMIN_PASSWORD`: Your chosen admin portal password
  - `CORS_ORIGINS`: Comma-separated domains including your Vercel frontend domain
