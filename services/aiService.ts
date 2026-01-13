import { GoogleGenerativeAI } from '@google/generative-ai';
import { drugService } from './drugService';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

console.log("Debug: Checking API Key...");
if (!API_KEY) {
    console.error("CRITICAL: EXPO_PUBLIC_GEMINI_API_KEY is missing or empty.");
    console.log("Available Env Keys:", Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC_')));
} else {
    console.log("Debug: API Key present (Starts with: " + API_KEY.substring(0, 4) + "...)");
}

const genAI = new GoogleGenerativeAI(API_KEY || 'MISSING_KEY');
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

export const aiService = {
    /**
     * Sends a text message to the AI, performing a RAG search on the drug database first.
     */
    async sendMessageByText(message: string): Promise<string> {
        if (!API_KEY || API_KEY === 'MISSING_KEY') {
            return "Configuration Error: Gemini API Key is missing. Please check your .env file and restart the server with --clear.";
        }

        try {
            // 1. Search for relevant drug info
            // We use a broader search to give more context to the AI
            const drugs = await drugService.searchDrugs(message);

            // 2. Construct System Prompt with Context
            let context = "No specific drug information found in the local database for this query.";
            if (drugs.length > 0) {
                context = `Found the following specific drug records in the database:\n${JSON.stringify(drugs, null, 2)}`;
            }

            const prompt = `
You are an expert Medical AI Assistant specializing in pharmacology and pediatric dosing.
Your primary goal is to provide accurate, safe, and database-specific drug information.

### OPERATIONAL RULES:
1. **Database Priority**: Use the provided "Context" from our database as the source of truth for trade names, ingredients, and available strengths.
2. **Dose Extraction**: If the user asks for a dose, look for the 'strength', 'dosage_form', and 'description' fields in the context. 
3. **Medical Specificity**: If the drug is found in the database, extract and explain the dosage clearly.
4. **Safety Warning**: If a drug is NOT in our database, you may provide general medical knowledge about it but ALWAYS include a disclaimer: "Note: This medication is not in our specific database. Please consult your physician or pharmacist before any use."
5. **Tone**: Be professional, helpful, and concise. Use clear formatting (bullet points) for dosage instructions.
6. **No Guessing**: If you are unsure about a dose, state: "Specific dosing for this medication should be determined by a healthcare provider based on the patient's age and weight."

Context from Database:
${context}

User Query: ${message}

Response (Medical Assistant):
            `;

            // 3. Call Gemini
            const result = await model.generateContent(prompt);
            const response = result.response;
            return response.text().trim();

        } catch (error) {
            console.error("AI Service Error:", error);
            return "I'm sorry, I'm having trouble connecting to the medical brain right now. Please try again.";
        }
    },

    /**
     * Handles audio input by first transcribing it via Gemini, then processing it as text.
     * @param base64Audio Audio data in base64 format (no data URI prefix needed, just the raw base64)
     * @param mimeType Mime type of the audio (e.g., 'audio/m4a' or 'audio/mp4')
     */
    async processAudio(base64Audio: string, mimeType: string = 'audio/m4a'): Promise<{ text: string, reply: string }> {
        try {
            // 1. Transcribe Audio using Gemini
            // Gemini 1.5 Flash is multimodal. We can ask it to transcribe.
            const transcriptionPrompt = "Transcribe exactly what the user said in this audio. Do not adds any commentary.";

            const result = await model.generateContent([
                transcriptionPrompt,
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Audio
                    }
                }
            ]);

            const transcription = result.response.text();
            console.log("Transcription:", transcription);

            // 2. Process as Text (RAG)
            const reply = await this.sendMessageByText(transcription);

            return {
                text: transcription,
                reply
            };

        } catch (error) {
            console.error("Audio Processing Error:", error);
            return {
                text: "(Audio processing failed)",
                reply: "I couldn't understand the audio. Please try typing or recording again."
            };
        }
    }
};
