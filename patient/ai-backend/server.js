require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Tesseract = require('tesseract.js');
const Groq = require('groq-sdk');
const sharp = require('sharp');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Enhanced System Prompt — Structured Extraction v2 ──────────────────────
const MEDICAL_EXTRACTOR_PROMPT = `
You are a Senior Medical Informatics Specialist with expertise in clinical data extraction.

Extract ALL information from the provided OCR/text into a structured JSON. Be thorough.

CRITICAL RULES:
1. Standardise units (e.g., mg, mcg, mmol/L, mg/dL).
2. Flag abnormal results: set "flag": true if the value is outside the normal range.
3. Categorise medications (e.g., "Antibiotic", "Diabetic", "Hypertension", "Anticoagulant").
4. Set "is_new": true if the medication appears to be freshly prescribed.
5. Set "is_valid": false if the text is NOT a medical document.
6. Risk score: 1 (routine), 5 (moderate attention needed), 8-10 (urgent physician review needed).
7. Extract vitals_extraction if present (BP, Glucose, Heart Rate, SpO2, Weight, HbA1c, Temperature).
8. Extract clinical_entities: doctor_name, clinic_name, diagnosis, date_of_visit.
9. Set "category" based on document type.

JSON OUTPUT (strict — no extra keys):
{
  "is_valid": boolean,
  "category": "Prescription" | "Lab Report" | "Imaging" | "Vaccine" | "Discharge Summary" | "Other",
  "summary": "1-sentence patient-friendly summary of findings",
  "patient_name": "string or null",
  "date": "YYYY-MM-DD or null",
  "data": {
    "medications": [
      {
        "name": "string",
        "dosage": "string",
        "frequency": "string",
        "duration": "string",
        "purpose": "string (drug class or indication)",
        "is_new": boolean
      }
    ],
    "lab_results": [
      {
        "test": "string",
        "result": number,
        "unit": "string",
        "flag": boolean,
        "normal_range": "string (e.g. 70-100 mg/dL)"
      }
    ],
    "vitals_extraction": {
      "BP": "string or null (e.g. 120/80 mmHg)",
      "Glucose": "string or null",
      "Heart Rate": "string or null",
      "HbA1c": "string or null",
      "SpO2": "string or null",
      "Weight": "string or null"
    },
    "clinical_entities": {
      "doctor_name": "string or null",
      "clinic_name": "string or null",
      "diagnosis": "string or null",
      "date_of_visit": "string or null"
    }
  },
  "risk_score": integer (1-10),
  "notes": "concise clinical notes for physician; mention any contraindication concerns"
}`;

// ── ROUTE 1: ANALYZE PRESCRIPTION / LAB REPORT / IMAGING ──────────────────
app.post('/api/analyze-prescription', async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'No image URL provided' });

    try {
        console.log('📥 1. Downloading file from storage…');
        const response = await axios({
            method: 'get',
            url: imageUrl,
            responseType: 'arraybuffer'
        });

        const contentType = response.headers['content-type'] || '';
        const urlLower = imageUrl.toLowerCase();
        let rawText = '';

        // ── Branch by file type ────────────────────────
        if (contentType.includes('image') || /\.(jpg|jpeg|png|webp|bmp|tiff|gif)/.test(urlLower)) {
            console.log('🖼️  Processing Image — enhancing for handwriting OCR…');
            const cleanBuffer = await sharp(response.data)
                .grayscale()
                .normalize()
                .sharpen({ sigma: 1.2 })
                .modulate({ brightness: 1.05, contrast: 1.1 })
                .toBuffer();

            const { data } = await Tesseract.recognize(cleanBuffer, 'eng', {
                logger: m => console.log(`   OCR ${m.status}: ${Math.round(m.progress * 100)}%`)
            });
            rawText = data.text;
            console.log(`✅ OCR extracted ${rawText.length} characters`);

        } else if (contentType.includes('pdf') || urlLower.endsWith('.pdf')) {
            console.log('📄 Processing PDF — extracting text…');
            try {
                // Dynamic require of pdf-parse (optional dependency)
                const pdfParse = require('pdf-parse');
                const pdfData = await pdfParse(Buffer.from(response.data));
                rawText = pdfData.text;
                console.log(`✅ PDF extracted ${rawText.length} characters from ${pdfData.numpages} pages`);
            } catch (pdfErr) {
                // Fallback: treat as binary and try OCR on first page if possible
                console.warn('⚠️  pdf-parse not available, attempting raw text extraction…');
                rawText = Buffer.from(response.data).toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ');
            }

        } else if (contentType.includes('text') || urlLower.endsWith('.txt')) {
            console.log('📝 Reading plain-text file…');
            rawText = Buffer.from(response.data).toString('utf-8');

        } else {
            // Unknown: attempt text decode as fallback
            console.log('❓ Unknown file type, attempting text decode…');
            rawText = Buffer.from(response.data).toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ');
        }

        if (!rawText || rawText.trim().length < 10) {
            return res.status(422).json({
                success: false,
                message: 'No readable text found in this document. Please upload a clearer image or a digital PDF.'
            });
        }

        // ── 2. Groq AI Structured Extraction ──────────────
        console.log('🧠 2. Structuring medical data with Groq AI…');
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: MEDICAL_EXTRACTOR_PROMPT },
                { role: 'user', content: `Analyze this medical document text and extract all information:\n\n${rawText.substring(0, 8000)}` }
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' },
            temperature: 0.1
        });

        const structuredData = JSON.parse(chatCompletion.choices[0].message.content);

        // ── 3. Risk Alert Logic ────────────────────────────
        if (structuredData.risk_score >= 8) {
            structuredData.notes = (structuredData.notes || '') + ' | ⚠ ALERT: High risk score. Recommend immediate physician review.';
        }

        // Ensure required fields exist
        if (!structuredData.data) structuredData.data = {};
        if (!structuredData.data.medications) structuredData.data.medications = [];
        if (!structuredData.data.lab_results) structuredData.data.lab_results = [];
        if (!structuredData.data.vitals_extraction) structuredData.data.vitals_extraction = {};
        if (!structuredData.data.clinical_entities) structuredData.data.clinical_entities = {};

        console.log(`✅ Data processed! Category: ${structuredData.category}, Risk: ${structuredData.risk_score}/10`);
        res.json({ success: true, extracted_text: JSON.stringify(structuredData) });

    } catch (error) {
        console.error('❌ Backend Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to process document' });
    }
});

// ── ROUTE 2: GENERATE DOCTOR'S SUMMARY ────────────────────────────────────
app.post('/api/generate-summary', async (req, res) => {
    const { records, patientName } = req.body;

    if (!records || records.length === 0) {
        return res.status(400).json({ error: 'No records found to summarize.' });
    }

    try {
        console.log(`👨‍⚕️ Synthesizing Doctor's Brief for ${patientName || 'patient'}…`);

        // Include up to last 10 records for context
        const combinedHistory = records.slice(0, 10).map(r => r.extracted_text).join('\n---\n');

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an expert clinical physician reviewing a patient's medical history.
Provide a High-Velocity 5-Second Doctor's Brief for the patient "${patientName || 'Patient'}".

Structure your response EXACTLY as follows (no markdown, no extra headings):

ACTIVE MEDICATIONS: [comma-separated list of medications with dosages]

ABNORMAL TRENDS: [describe any concerning lab value trends, use % changes where possible, e.g. "Glucose: 140 (+18% from last visit)". If none, say "None detected."]

KNOWN ALLERGIES: [list if found in records, else "None documented"]

RED FLAGS: [critical items needing immediate attention, or "None"]

CLINICAL RECOMMENDATION: [1-2 sentence recommendation for the attending physician]

Be concise, professional, and data-driven. Max 200 words total.`
                },
                { role: 'user', content: combinedHistory }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2
        });

        res.json({ success: true, summary: completion.choices[0].message.content });

    } catch (error) {
        console.error('Summary Error:', error);
        res.status(500).json({ error: 'Failed to generate AI summary' });
    }
});

// ── ROUTE 3: SEMANTIC SEARCH ───────────────────────────────────────────────
app.post('/api/semantic-search', async (req, res) => {
    const { query, records } = req.body;
    if (!query || !records) return res.status(400).json({ error: 'Query and records required' });

    try {
        // Simple semantic matching: look for the query concept in extracted JSON
        const queryLower = query.toLowerCase().trim();

        // Map common medical synonyms
        const synonyms = {
            'sugar': ['glucose', 'hba1c', 'diabetes', 'diabetic'],
            'heart': ['cardiac', 'bp', 'blood pressure', 'ecg', 'hypertension'],
            'kidney': ['creatinine', 'urea', 'renal', 'nephrology'],
            'liver': ['sgpt', 'sgot', 'bilirubin', 'hepatic', 'alt', 'ast'],
            'thyroid': ['tsh', 't3', 't4', 'hypothyroid', 'hyperthyroid'],
            'blood': ['cbc', 'hemoglobin', 'rbc', 'wbc', 'platelets', 'hematocrit'],
            'flu': ['influenza', 'viral', 'fever', 'infection'],
        };

        // Build search terms
        const searchTerms = [queryLower];
        Object.entries(synonyms).forEach(([key, vals]) => {
            if (queryLower.includes(key)) searchTerms.push(...vals);
            vals.forEach(v => { if (queryLower.includes(v)) searchTerms.push(key, ...vals); });
        });

        const matchedIds = records
            .filter(r => {
                const text = (r.extracted_text || '').toLowerCase();
                return searchTerms.some(term => text.includes(term));
            })
            .map(r => r.id);

        res.json({ success: true, matchedIds });

    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// ── SERVER START ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 MedBridge Clinical Intelligence Engine running on port ${PORT}`);
    console.log(`   Modules active: OCR 2.0 | Doctor's View | QR Share | Timeline | AI Sentry`);
});