# MedBridge AI

> The Smart, Secure, and AI-Powered Clinical Intelligence Vault.

[![Built with React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square)](https://react.dev) [![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=flat-square)](https://expressjs.com) [![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square)](https://supabase.com) [![AI](https://img.shields.io/badge/AI-Groq%20Llama--3-F97316?style=flat-square)](https://groq.com) [![Deployed on Netlify](https://img.shields.io/badge/Hosted-Netlify-00C7B7?style=flat-square)](https://netlify.com)

---

## Overview

MedBridge AI modernises healthcare record management by bridging the gap between raw, unstructured medical documents and actionable clinical intelligence. Built for patients and clinicians alike, the platform uses OCR and LLM-based extraction to parse prescriptions, lab reports, and discharge summaries — transforming them into a structured, highly visual dashboard.

When every second counts, doctors cannot afford to sift through disorganised physical files. MedBridge addresses this with **Temporal QR Access**, **Emergency WhatsApp Alerts**, and **Smart Medication Reminders**.

---

## Live Demo

> **No local setup required.** Log in with Google and upload any medical record to explore the full feature set.

👉 [**Launch MedBridge AI →**](https://med-bridgeai.netlify.app/)

---

## Features

### Clinical OCR & AI Extraction

- **Intelligent parsing** — Upload any medical document (image or PDF). An OCR + Groq LLM pipeline extracts patient vitals, medications, diagnoses, and lab results with standardised units (e.g., mg/dL, mmHg).
- **Human-in-the-loop verification** — Patients review AI-extracted data in a structured UI before it is committed to their permanent vault.

### Smart Medication Reminders

- **Duration-aware scheduling** — Distinguishes short-term courses (e.g., Amoxicillin for 5 days) from chronic medications (e.g., Metformin indefinitely).
- **Visual time slots** — Decodes clinical frequency notation (OD, BD, TDS, SOS) into a readable daily schedule (Morning / Afternoon / Evening / Night).
- **Auto-expiration** — Short-term medications are automatically retired once the course is complete.

### Emergency Health Alerts (AI Sentry)

- **Vitals monitoring** — During extraction, the AI evaluates physiological markers against clinical thresholds (e.g., Systolic BP > 180 mmHg, Fasting Glucose > 250 mg/dL, SpO₂ < 92%).
- **Automated WhatsApp alerts** — If an anomaly is detected, the system generates a pre-filled `wa.me` deep-link to notify a designated emergency contact instantly.

### Secure Doctor Access & Audit Trails

- **Temporal QR sharing** — Patients generate time-boxed (e.g., 10 min, 1 hour), permission-scoped (e.g., "Lab records only") links for clinician access.
- **Live session monitoring** — When a doctor opens the shared portal, the patient receives a real-time "Doctor is viewing" notification and can revoke access via a one-tap kill-switch.
- **Audit logs** — Every action (document upload, verification, external access) is permanently logged in a Supabase vault with row-level security.

### Authentication & Security

- **Google OAuth via Supabase** — Frictionless sign-in with no password management overhead. Sessions are secured with JWT.
- **Row-level security (RLS)** — All health records and audit logs are protected by Supabase PostgreSQL RLS policies, ensuring strict data isolation between users.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Vite, React Router v6 |
| Backend | Node.js + Express |
| Database & Auth | Supabase PostgreSQL, Supabase Google OAuth |
| OCR | `tesseract.js` |
| AI / LLM | `groq-sdk` (Llama 3) |
| Frontend hosting | Netlify |
| Backend hosting | Render |

---

## Architecture

```
User (Browser)
    │
    ├── React + Vite (Netlify)
    │       └── Supabase Auth (Google OAuth → JWT)
    │
    └── Express API (Render)
            ├── tesseract.js  →  OCR extraction
            ├── groq-sdk      →  LLM structuring (Llama 3)
            └── Supabase DB   →  Vault, audit logs (RLS)
```

---

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/your-username/medbridge-ai.git
cd medbridge-ai

# 2. Install dependencies
npm install          # frontend
cd server && npm install   # backend

# 3. Configure environment variables
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, GROQ_API_KEY

# 4. Start development servers
npm run dev          # frontend (localhost:5173)
npm run start        # backend  (localhost:3001)
```

---

## Disclaimer

MedBridge AI is designed with privacy best practices inspired by HIPAA guidelines. It is **not** a certified HIPAA-compliant platform and should not be used as a substitute for regulated medical records systems in clinical environments.

---

