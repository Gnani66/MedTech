require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Tesseract = require('tesseract.js');
const Groq = require('groq-sdk');
const sharp = require('sharp');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// --- HELPER: SYSTEM PROMPT CONFIGURATION ---
const MEDICAL_EXTRACTOR_PROMPT = `
You are a Senior Medical Informatics specialist. 
Extract data from the provided OCR text into a structured JSON format.

CRITICAL RULES:
1. Standardize units (e.g., mg, mcg, mmol/L).
2. Flag "abnormal" results: If a lab value looks high/low, set the "flag" boolean to true.
3. Categorize medications (e.g., "Antibiotic", "Diabetic", "Hypertension").
4. If the text is not a medical document, set "is_valid" to false.
5. Use "is_new: true" if the medication appears to be a fresh prescription.

JSON Structure:
{
  "is_valid": boolean,
  "category": "Prescription" | "Lab Report" | "Imaging",
  "summary": "1-sentence summary of findings",
  "patient_name": string | null,
  "date": "YYYY-MM-DD" | null,
  "data": {
    "medications": [{"name": "string", "dosage": "string", "purpose": "string", "is_new": boolean}],
    "lab_results": [{"test": "string", "result": number, "unit": "string", "flag": boolean, "normal_range": "string"}]
  },
  "risk_score": 1-10,
  "notes": "Concise clinical notes"
}`;

// --- ROUTE 1: ANALYZE PRESCRIPTION/REPORT ---
app.post('/api/analyze-prescription', async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ error: "No image URL provided" });
    }

    try {
        console.log("📥 1. Downloading file from storage...");
        const response = await axios({
            method: 'get',
            url: imageUrl,
            responseType: 'arraybuffer'
        });

        const contentType = response.headers['content-type'];
        let rawText = "";

        // --- 🛡️ LOGIC BRANCHING BASED ON FILE TYPE ---
        if (contentType.includes('image')) {
            console.log("🖼️ Processing Image (Optimizing for Handwriting)...");
            
            // Pro Upgrade: Image Pre-processing for better OCR
            const cleanBuffer = await sharp(response.data)
                .grayscale()         // Remove color noise
                .normalize()         // Expand contrast
                .sharpen()           // Sharpen text edges
                .toBuffer();

            const { data } = await Tesseract.recognize(cleanBuffer, 'eng', {
                logger: m => console.log(`   OCR ${m.status}: ${Math.round(m.progress * 100)}%`)
            });
            rawText = data.text;
        } 
        else if (contentType.includes('text') || imageUrl.toLowerCase().endsWith('.txt')) {
            console.log("📄 Reading Text file directly...");
            rawText = Buffer.from(response.data).toString('utf-8');
        } 
        else {
            throw new Error("Unsupported file type. Please upload an image or text file.");
        }

        if (!rawText || rawText.trim() === "") {
            return res.status(422).json({ success: false, message: "No readable text found." });
        }

        // --- 🧠 2. SENDING TO GROQ FOR INTELLIGENT STRUCTURING ---
        console.log("🧠 2. Structuring medical data with AI...");
        
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: MEDICAL_EXTRACTOR_PROMPT },
                { role: "user", content: `Analyze this medical text: \n\n${rawText}` }
            ],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }
        });

        const structuredData = JSON.parse(chatCompletion.choices[0].message.content);

        // --- 📊 3. RISK ALERT LOGIC (UPGRADE OVER AYU) ---
        if (structuredData.risk_score >= 8) {
            structuredData.notes += " | ALERT: High risk score detected. Recommend immediate physician review.";
        }

        console.log("✅ Data processed successfully!");
        res.json({ 
            success: true, 
            extracted_text: JSON.stringify(structuredData) 
        });

    } catch (error) {
        console.error("❌ Backend Error:", error.message);
        res.status(500).json({ error: error.message || "Failed to process document" });
    }
});

// --- ROUTE 2: GENERATE DOCTOR'S SUMMARY ---
app.post('/api/generate-summary', async (req, res) => {
    const { records } = req.body;

    if (!records || records.length === 0) {
        return res.status(400).json({ error: "No records found to summarize." });
    }

    try {
        console.log("👨‍⚕️ Synthesizing Doctor's Brief...");
        
        // Combining past records for trend analysis
        const combinedHistory = records.map(r => r.extracted_text).join("\n---\n");

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert clinical physician. 
                    Summarize the patient's history. 
                    - Focus on Abnormal Trends (is the sugar going up? is the blood pressure stabilizing?).
                    - List current active medications.
                    - Highlight any red flags.
                    Format: Clear headings, professional tone, max 200 words.`
                },
                { role: "user", content: combinedHistory }
            ],
            model: "llama-3.1-70b-versatile", // Using a larger model for synthesis
        });

        res.json({ 
            success: true, 
            summary: completion.choices[0].message.content 
        });
    } catch (error) {
        console.error("Summary Error:", error);
        res.status(500).json({ error: "Failed to generate AI summary" });
    }
});

// --- SERVER START ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 MedTech Intelligence Engine running on port ${PORT}`);
});