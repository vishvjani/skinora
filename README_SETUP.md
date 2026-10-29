# 📱 NEXAURA — Multi-Device & Cross-Network Setup Guide

This guide explains how to run NEXAURA on your local computer and open it on other devices (mobile phones, tablets, or another PC on the same Wi-Fi network).

---

## ⚡ Quick Start (1-Click)
Double-click `run_dev.bat` in the project root folder. It will:
1. Detect your PC's Wi-Fi / LAN IP address (e.g. `192.168.1.45`).
2. Start the FastAPI backend bound to `0.0.0.0:8000`.
3. Start the Vite React frontend bound to `0.0.0.0:3000`.
4. Display the exact URLs to open on your phone or other devices.

---

## 🌐 Opening on Another Device (Phone / Tablet / Other PC)
1. Ensure both devices are connected to the **same Wi-Fi network**.
2. Find your host computer's IPv4 address:
   - On Windows: Run `ipconfig` in CMD/PowerShell (look for IPv4 under Wi-Fi / Wireless LAN).
   - Example IP: `192.168.1.45`
3. On your phone or other device's browser, navigate to:
   ```
   http://<YOUR_IP>:3000
   ```
   *(Example: `http://192.168.1.45:3000`)*
4. The frontend automatically detects the host IP and connects to the backend at:
   ```
   http://<YOUR_IP>:8000
   ```

---

## 🔑 Key Features Available Cross-Device
- **Storefront & Products**: Browse, filter, search, dynamic pricing, instant cart, and checkout.
- **AI Skin Diagnostic**: Upload or snap photo with phone camera; real Gemini AI skin report generated.
- **Consultation Booking**: Users can submit skincare questions at `/consultation`.
- **Admin Portal**: Accessible at `http://<YOUR_IP>:3000/admin`
  - **Username**: `admin`
  - **Password**: `admin123`
  - Review queries, update status (`pending`, `reviewed`, `resolved`), and add doctor notes.
- **User Authentication**: Clerk login & auto-sync to Neon PostgreSQL database.

---

## 🛠️ Environment Configuration

### Backend (`nexaura/backend/.env`)
```env
DATABASE_URL=postgresql://neondb_owner:<DB_PASSWORD>@<DB_HOST>.neon.tech/upsteky?sslmode=require
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
ENV=development
LOG_LEVEL=INFO
GEMINI_API_KEY=your_gemini_api_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret_here
CLERK_ISSUER=https://emerging-feline-53.clerk.accounts.dev
CLERK_JWKS_URL=https://emerging-feline-53.clerk.accounts.dev/.well-known/jwks.json
```

### Frontend (`nexaura/frontend/.env`)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZW1lcmdpbmctZmVsaW5lLTUzLmNsZXJrLmFjY291bnRzLmRldiQ
VITE_API_BASE_URL=
```
*(Leave `VITE_API_BASE_URL` empty in `.env` to enable dynamic IP detection across devices)*

---

## 🛡️ Troubleshooting Firewall / Windows Defender
If your phone cannot connect to `http://<YOUR_IP>:3000`:
1. Check Windows Firewall: Open **Windows Defender Firewall** → **Allow an app or feature through Windows Defender Firewall** → Ensure `node.exe` and `python.exe` have "Private" network access enabled.
2. Or allow inbound ports 3000 and 8000 temporarily:
   ```powershell
   New-NetFirewallRule -DisplayName "NEXAURA Dev Ports" -Direction Inbound -LocalPort 3000,8000 -Protocol TCP -Action Allow
   ```
