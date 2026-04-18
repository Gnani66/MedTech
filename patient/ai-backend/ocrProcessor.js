import Tesseract from 'tesseract.js';

export const performOCR = async (imageBuffer) => {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imageBuffer,
      'eng',
      { logger: m => console.log(m) } // Optional: tracks progress
    );
    return text;
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to extract text from image");
  }
};