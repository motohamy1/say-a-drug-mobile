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
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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
            // We use a simple ILIKE search on Trade Name or Drugname for the first few words of the message
            // or the whole message if it's short.
            const searchTerms = message.trim().split(/\s+/).slice(0, 3).join(' ');

            console.log("Debug: Searching Supabase for:", searchTerms);

            const { data: drugs, error: searchError } = await supabase
                .from('drugs')
                .select('*')
                .or(`trade_name.ilike.%${searchTerms}%,Drugname.ilike.%${searchTerms}%,scientific_name.ilike.%${searchTerms}%`)
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
You are a highly professional, compassionate, and expert Pharmacist AI Assistant. 
You provide accurate medical information based on the provided database context.

### DATABASE CONTEXT (From Supabase):
${drugContext}

### USER QUERY: "${message}"

### INSTRUCTIONS:
1.  **Response Format**: For the primary drug discussed, you MUST start your response with these exact bullet points:
    - trade_name: [Insert Trade Name]
    - active ingredient: [Insert Active Ingredient(s)]
    - use or category: [Insert Use/Category]
    - availability: [State if available in Egypt based on the database or general knowledge for Egypt market]

2.  **Human-Like Interaction**: After the bullet points, provide a brief, professional explanation of the drug's purpose.

3.  **Database vs General Knowledge**:
    - If the drug information is found in the **DATABASE CONTEXT**, use it as your primary source.
    - If the drug is NOT in the database, you MAY still provide information based on your general knowledge. However, you MUST explicitly start the explanation by saying something like: "I couldn't find this specific medication in our private database, but based on general medical knowledge..."

4.  **Dosage Intelligence (CRITICAL)**:
    - If the user asks about dosage but has NOT provided the patient's **age** or **weight**, you MUST NOT give a specific dosage. Instead, ask for these details in a helpful, human-like way (e.g., "To provide the most accurate and safe dosage for you, could you please tell me the patient's age and weight?").
    - If the user HAS provided age/weight, use the most effective medical dosage calculation (pediatric or adult protocols) to provide a precise, easy-to-understand instruction. Avoid "bulk" calculations; be specific.

5.  **Language Handling**: Always reply in the same language the user queried in (Arabic or English).

6.  **Closing and Follow-up**: End your response by asking if the user has more questions or needs clarification, and leave the choice to them.

7.  **Safety**: Always include a standard medical disclaimer reminding the user to consult a doctor.

Return your professional response now.
            `;

            // 3. Call Gemini
            console.log("Debug: Calling Gemini generating content...");
            const result = await model.generateContent(prompt);
            console.log("Debug: Gemini response received.");

            const response = result.response;
            return response.text().trim();

        } catch (error) {
            console.error("AI Service Error:", error);
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
