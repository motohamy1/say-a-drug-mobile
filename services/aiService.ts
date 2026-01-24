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
     * Uses AI to extract or infer drug-related keywords from a user query.
     * This helps map symptoms (e.g., "headache") to ingredients (e.g., "Paracetamol").
     */
    async getSearchKeywords(message: string): Promise<string> {
        try {
            const prompt = `
            Task: Extract or infer up to 3 pharmaceutical active ingredients or trade names (in English) that are most relevant to this user query.
            User Query: "${message}"
            Rules:
            - If the query mentions a specific drug, include it.
            - If it's a symptom, list the 2-3 most common active ingredients used for it.
            - Return ONLY the names, comma-separated. No other text.
            - Example: "صداع" -> "Paracetamol, Ibuprofen, Aspirin"
            - Example: "What is Panadol?" -> "Panadol, Paracetamol"
            `;
            const result = await model.generateContent(prompt);
            const keywords = result.response.text().trim();
            console.log("Debug: AI inferred keywords:", keywords);
            return keywords;
        } catch (error) {
            console.error("Error getting search keywords:", error);
            return message; // Fallback to original message
        }
    },

    /**
     * Sends a text message to the AI, performing a RAG search on the drug database first.
     */
    async sendMessageByText(message: string): Promise<string> {
        console.log("Debug: sendMessageByText called with:", message);
        if (!API_KEY || API_KEY === 'MISSING_KEY') {
            return "Configuration Error: Gemini API Key is missing. Please check your .env file and restart the server with --clear.";
        }

        try {
            // 1. Get smart keywords for search (maps symptoms to drugs)
            const searchTerms = await this.getSearchKeywords(message);

            console.log("Debug: Searching Supabase for:", searchTerms);

            const { drugService } = require('./drugService');
            const drugs = await drugService.searchDrugs(searchTerms);

            let drugContext = "";
            if (drugs && drugs.length > 0) {
                drugContext = "Here is relevant information from our drug database:\n";
                drugs.forEach((drug: any, index: number) => {
                    drugContext += `--- DRUG ${index + 1} ---\n`;
                    drugContext += `Trade Name (الاسم التجاري): ${drug.Trade_name || drug.trade_name || drug.Drugname}\n`;
                    drugContext += `Active Ingredient (المادة الفعالة): ${drug.Active_ingredient || (drug.active_ingredients ? drug.active_ingredients.join(', ') : '')}\n`;
                    drugContext += `Manufacturer (الشركة): ${drug.Company || drug.manufacturer}\n`;
                    drugContext += `Price: ${drug.Price || drug.price} ${drug.currency || 'EGP'}\n`;
                    drugContext += `Form: ${drug.Form || drug.dosage_form}\n`;
                    drugContext += `Category: ${drug.Category}\n`;
                    drugContext += `------------------\n\n`;
                });
            } else {
                drugContext = "No specific match found in our primary database for the current query terms.\n";
            }

            const prompt = `
You are a medical information assistant inside a mobile application.
Your role is to help users understand which medicines MAY be relevant to their symptoms,
based on active ingredients and a local drug database.

IMPORTANT RULES:
- You do NOT diagnose diseases.
- You do NOT prescribe dosages.
- You do NOT replace a doctor or pharmacist.
- You only provide general medical information.
- Always include a medical disclaimer in your response.

DATA AVAILABLE TO YOU:
1. A local database with two columns:
   - trade_name
   - active_ingredient

2. A small medical knowledge layer that maps active ingredients to common symptoms
   (this knowledge is general and non-diagnostic).

### DATABASE CONTEXT:
${drugContext}

### USER QUERY: "${message}"

YOUR TASK FLOW (STRICTLY FOLLOW THESE STEPS):

STEP 1: Understand the user's symptoms
- Read the user's message carefully.
- Identify the symptoms mentioned (even if written informally).

STEP 2: Infer possible active ingredients
- Based on general medical knowledge, infer which active ingredients are commonly used
  for these symptoms.
- Do NOT mention diseases.
- Do NOT mention brand names in this step.

STEP 3: Search the local database
- Match the inferred active ingredients with the database.
- The match can be:
  - by active ingredient
  - or by trade name if the user mentions it directly.

STEP 4: Generate the response
- Explain that these medicines MAY help with such symptoms.
- For each matching drug, use this structured format:
  [[DRUG_BLOCK]]
  trade_name:: [Name] | [Arabic Name]
  active_ingredient:: [Ingredient] | [Arabic Ingredient]
  form:: [Form] | [Arabic Form]
  category:: [Category] | [Arabic Category]
  [[DRUG_BLOCK]]
- Keep the tone clear, friendly, and non-alarming.
- If no match is found, clearly say so.

RESPONSE STYLE:
- Simple and clear language.
- No medical jargon unless necessary.
- No definitive claims.
- No instructions on dosage or usage.

EXAMPLE BEHAVIOR:
User says: "عندي صداع وسخونية"
You:
- infer symptoms: headache, fever
- infer active ingredients: Paracetamol
- search database
- return matching trade names in [[DRUG_BLOCK]] format
- add disclaimer

If the user's question is outside medical symptoms or drugs, politely say you cannot help.

For dosage calculation requests, use this format:
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
