# MedBridge AI

### Smart, Secure, and AI-Powered Clinical Intelligence Vault

MedBridge AI transforms unstructured medical documents into structured clinical intelligence using OCR and AI. The platform enables patients and healthcare professionals to securely manage, analyze, and share healthcare records through an intelligent and privacy-focused ecosystem.

---

## 🚀 Live Demo

🔗 https://med-bridgeai.netlify.app/

---

# 📌 Overview

Healthcare records are often fragmented across prescriptions, lab reports, discharge summaries, and scattered digital files. During emergencies, doctors lose valuable time searching through unorganized records.

MedBridge AI solves this problem by converting raw medical documents into structured clinical insights using OCR and Large Language Models (LLMs).

The platform provides:
- AI-powered medical record extraction
- Smart medication reminders
- Emergency health alerts
- Secure doctor access
- Audit-protected healthcare vaults

---

# ✨ Features

## 🧠 Clinical OCR & AI Extraction

- Upload prescriptions, lab reports, or discharge summaries
- OCR extracts raw medical text
- AI structures:
  - Medications
  - Diagnoses
  - Blood pressure
  - Glucose levels
  - Laboratory values
- Human verification before permanent storage

---

## 💊 Smart Medication Reminders

- Detects chronic vs short-term medications
- Converts medical notation (OD, BD, TDS, SOS) into readable schedules
- Visual daily medication tracking
- Auto-removes expired medication courses

---

## 🚨 Emergency Health Alerts

The AI evaluates extracted vitals against medical thresholds.

Examples:
- BP > 180 mmHg
- Glucose > 250 mg/dL
- SpO₂ < 92%

If abnormalities are detected:
- Instant WhatsApp emergency alert links are generated
- Emergency contacts can be notified immediately

---

## 🔐 Secure Doctor Access

### Temporal QR Sharing
Patients can generate:
- Time-limited access links
- Permission-based medical record sharing

### Live Session Monitoring
- Real-time doctor viewing notifications
- One-tap access revocation

### Audit Logs
Every action is securely logged:
- Uploads
- Verification actions
- Record access
- External sharing

---

# 🛡 Authentication & Security

- Google OAuth Authentication
- JWT-secured sessions
- Supabase PostgreSQL Row-Level Security (RLS)
- User-isolated healthcare vault architecture

---

# 🏗 System Architecture

```text
User Browser
    │
    ├── React + Vite Frontend (Netlify)
    │       └── Supabase Google OAuth (JWT)
    │
    └── Express Backend API
            ├── Tesseract.js  → OCR Processing
            ├── Groq SDK      → AI Structuring (Llama 3)
            └── Supabase DB   → Secure Vault + Audit Logs
```

---

# 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Vite |
| Backend | Node.js + Express |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Google OAuth |
| OCR Engine | tesseract.js |
| AI/LLM | Groq SDK (Llama 3) |
| Hosting | Netlify + Render |

---

# ⚙️ Local Setup (Windows)

## 1. Clone Repository

```bash
git clone https://github.com/yourusername/medbridge-ai.git
cd medbridge-ai
```

---

## 2. Install Dependencies

### Frontend

```bash
npm install
```

### Backend

```bash
cd server
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file and add:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
GROQ_API_KEY=your_groq_api_key
```

---

## 4. Start Development Servers

### Frontend

```bash
npm run dev
```

Runs on:
```text
http://localhost:5173
```

### Backend

```bash
npm run start
```

Runs on:
```text
http://localhost:3001
```

---

# 📈 Future Scope

- AI-powered disease prediction
- Voice-enabled healthcare assistant
- Multi-language medical OCR
- Doctor collaboration portal
- EHR/FHIR interoperability

---


# 📄 Disclaimer

MedBridge AI follows privacy and security best practices inspired by HIPAA guidelines.

This project is intended for educational, research, and innovation purposes only and is not a certified HIPAA-compliant healthcare platform.
