import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

console.log("Debug: Checking API Key...");
if (!API_KEY) {
    console.error("CRITICAL: EXPO_PUBLIC_GEMINI_API_KEY is missing or empty.");
    console.log("Available Env Keys:", Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC_')));
} else {
    console.log("Debug: API Key present (Starts with: " + API_KEY.substring(0, 4) + "...)");
}

const genAI = new GoogleGenerativeAI(API_KEY || 'MISSING_KEY');
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const aiService = {
    /**
     * Sends a text message to the AI, performing a RAG search on the drug database first.
     */
    async sendMessageByText(message: string): Promise<string> {
        console.log("Debug: sendMessageByText called with:", message);
        if (!API_KEY || API_KEY === 'MISSING_KEY') {
            return "Configuration Error: Gemini API Key is missing. Please check your .env file and restart the server with --clear.";
        }

        try {
            // 1. Search Supabase for relevant drug data
            // We'll use a smarter way to extract the drug name from natural language
            let searchTerms = message;
            const commonFillers = ["tell me about", "what is", "how to use", "price of", "info on", "درد", "علاج", "سعر"];
            let lowerMessage = message.toLowerCase();

            for (const filler of commonFillers) {
                if (lowerMessage.includes(filler)) {
                    searchTerms = message.substring(lowerMessage.indexOf(filler) + filler.length).trim();
                    break;
                }
            }

            if (searchTerms.split(/\s+/).length > 4) {
                searchTerms = searchTerms.split(/\s+/).slice(0, 3).join(' ');
            }

            console.log("Debug: Searching Supabase for:", searchTerms);

            const { drugService } = require('./drugService');
            const drugs = await drugService.searchDrugs(searchTerms);

            let drugContext = "";
            if (drugs && drugs.length > 0) {
                drugContext = "Here is relevant information from our drug database:\n";
                drugs.forEach((drug: any, index: number) => {
                    drugContext += `--- DRUG ${index + 1} ---\n`;
                    drugContext += `Trade Name: ${drug.Trade_name || drug.trade_name || drug.Drugname}\n`;
                    drugContext += `Active Ingredient: ${drug.Active_ingredient || (drug.active_ingredients ? drug.active_ingredients.join(', ') : '')}\n`;
                    drugContext += `Manufacturer: ${drug.Company || drug.manufacturer}\n`;
                    drugContext += `Price: ${drug.Price || drug.price} ${drug.currency || 'EGP'}\n`;
                    drugContext += `Form: ${drug.Form || drug.dosage_form}\n`;
                    drugContext += `Description: ${drug.description || 'N/A'}\n`;
                    drugContext += `Category: ${drug.Category}\n`;
                    drugContext += `------------------\n\n`;
                });
            } else {
                drugContext = "No specific match found in our primary database for the current query terms.\n";
            }

            const prompt = `
You are a direct and professional Pharmacist AI Assistant. 
Provide concise, factual information based on the database context.

### DATABASE CONTEXT:
${drugContext}

### USER QUERY: "${message}"

### INSTRUCTIONS:
1.  **Response Strategy**: 
    - You are a medical assistant. Start with a polite greeting or helpful introduction in the user's language.
    - FOR ANY DRUG INFO OR MEDICAL DATA, you MUST wrap it in [[DRUG_BLOCK]] tags.

2.  **Structured Data Block**:
    [[DRUG_BLOCK]]
    trade_name:: [Name] | [Arabic Name]
    active_ingredient:: [Ingredient] | [Arabic Ingredient]
    form:: [Form] | [Arabic Form]
    category:: [Category] | [Arabic Category]
    availability:: [Status] | [Arabic Status]
    instructions:: [Usage] | [Arabic Usage]
    [[DRUG_BLOCK]]

3.  **Tagging**: Use double colons :: for labels and a pipe | to separate English and Arabic values.

4.  **For calculate Dosing**: 
    [[CALCULATE_DOSAGE]] drug_name::[English Trade Name Only] [[/CALCULATE_DOSAGE]]

Return your response now.
            `;

            console.log("Debug: Calling Gemini generating content...");

            let attempts = 0;
            const maxAttempts = 3;
            let lastError;

            while (attempts < maxAttempts) {
                try {
                    const result = await model.generateContent(prompt);
                    console.log("Debug: Gemini response received.");
                    return result.response.text().trim();
                } catch (error: any) {
                    attempts++;
                    lastError = error;
                    if (error.message?.includes('503') && attempts < maxAttempts) {
                        const delay = Math.pow(2, attempts) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    break;
                }
            }
            throw lastError;

        } catch (error: any) {
            console.error("AI Service Error:", error);
            return "I'm sorry, I'm having trouble analyzing the medical database right now. Please try again.";
        }
    },

    async processAudio(base64Audio: string, mimeType: string = 'audio/m4a'): Promise<{ text: string, reply: string }> {
        try {
            const transcriptionPrompt = "Transcribe exactly what the user said in this audio. Do not add any commentary.";
            const result = await model.generateContent([
                transcriptionPrompt,
                { inlineData: { mimeType: mimeType, data: base64Audio } }
            ]);

            const transcription = result.response.text();
            console.log("Transcription:", transcription);
            const reply = await this.sendMessageByText(transcription);

            return { text: transcription, reply };
        } catch (error) {
            console.error("Audio Processing Error:", error);
            return { text: "(Audio processing failed)", reply: "I couldn't understand the audio. Please try typing or recording again." };
        }
    }
};
