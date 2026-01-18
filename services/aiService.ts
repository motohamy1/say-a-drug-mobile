import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';

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
            // We use the first 2-3 words of the message for a more reliable search
            const cleanMessage = message.replace(/[^\w\s\u0600-\u06FF]/gi, '').trim();
            const searchTerms = cleanMessage.split(/\s+/).slice(0, 2).join(' ');

            console.log("Debug: Searching Supabase for:", searchTerms);

            const { data: drugs, error: searchError } = await supabase
                .from('drugs')
                .select('*')
                .ilike('Search Query', `%${searchTerms}%`)
                .limit(5);

            if (searchError) {
                console.error("Supabase search error:", searchError);
            }

            let drugContext = "";
            if (drugs && drugs.length > 0) {
                drugContext = "Here is relevant information from our drug database:\n";
                drugs.forEach((drug, index) => {
                    drugContext += `--- DRUG ${index + 1} ---\n`;
                    drugContext += `Name: ${drug.trade_name || drug.Drugname}\n`;
                    drugContext += `Scientific Name: ${drug.scientific_name}\n`;
                    drugContext += `Manufacturer: ${drug.manufacturer || drug.Company}\n`;
                    drugContext += `Price: ${drug.price || drug.Price} ${drug.currency}\n`;
                    drugContext += `Form: ${drug.dosage_form || drug.Form}\n`;
                    drugContext += `Description: ${drug.description}\n`;
                    drugContext += `Category: ${drug.Category}\n`;
                    drugContext += `------------------\n\n`;
                });
            } else {
                drugContext = "No specific match found in our primary database for the current query terms. Use general knowledge but state if specific database info is missing.\n";
            }

            // 2. Construct System Prompt
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
    - You can have multiple [[DRUG_BLOCK]] sections.

2.  **Structured Data Block**:
    [[DRUG_BLOCK]]
    trade_name:: [Name] | [Arabic Name]
    active_ingredient:: [Ingredient] | [Arabic Ingredient]
    form:: [Form] | [Arabic Form]
    category:: [Category] | [Arabic Category]
    availability:: [Status] | [Arabic Status]
    instructions:: [Usage] | [Arabic Usage]
    [[DRUG_BLOCK]]

3.  **Tagging**: Use double colons :: for labels and a pipe | to separate English and Arabic values. Use exactly these labels.

4.  **Safety**: End your response with a disclaimer tagged as:
    ● disclaimer:: [Safety Warning] | [Arabic Warning]

Return your response now.
            `;

            // 3. Call Gemini
            console.log("Debug: Calling Gemini generating content...");
            const result = await model.generateContent(prompt);
            console.log("Debug: Gemini response received.");

            const response = result.response;
            return response.text().trim();

        } catch (error: any) {
            console.error("AI Service Error (Full Details):", error);
            if (error?.message) {
                console.error("Error Message:", error.message);
            }
            return "I'm sorry, I'm having trouble analyzing the medical database right now. Please try again.";
        }
    },

    /**
     * Handles audio input by first transcribing it via Gemini, then processing it as text.
     */
    async processAudio(base64Audio: string, mimeType: string = 'audio/m4a'): Promise<{ text: string, reply: string }> {
        try {
            const transcriptionPrompt = "Transcribe exactly what the user said in this audio. Do not add any commentary.";

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
