import axios from 'axios';

export const parseMedicalText = async (rawText) => {
  const prompt = `
    Act as a professional medical data analyst. 
    Extract data from the following raw OCR text into a clean JSON format.
    
    Rules:
    1. If a value is missing, return null.
    2. Standardize medication names.
    3. Detect if it is a "Prescription" or a "Lab Report".

    Text: "${rawText}"

    Response Format:
    {
      "type": "Prescription | Lab Report",
      "date": "YYYY-MM-DD",
      "doctor": "Name",
      "diagnosis": "Condition name",
      "medications": [{ "name": "", "dosage": "", "frequency": "", "duration": "" }],
      "lab_results": [{ "parameter": "", "value": "", "unit": "", "status": "Normal/High/Low" }]
    }
  `;

  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: "gpt-4o-mini", // Cost-effective and fast
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  }, {
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
  });

  return JSON.parse(response.data.choices[0].message.content);
};