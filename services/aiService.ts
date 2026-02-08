import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

console.log("Debug: Checking API Key...");
if (!API_KEY) {
    console.error("CRITICAL: EXPO_PUBLIC_GEMINI_API_KEY is missing or empty.");
    console.log("Available Env Keys:", Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC_')));
} else {
    console.log("Debug: API Key present (Starts with: " + API_KEY.substring(0, 4) + "...)");
}

const genAI = new GoogleGenerativeAI(API_KEY || 'MISSING_KEY');
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

interface MedicalKnowledgeResult {
    question: string;
    answer: string;
    relevance_score: number;
}

interface MedicalKnowledgeResponse {
    query: string;
    results: MedicalKnowledgeResult[];
    total_found: number;
    error?: string;
}

/**
 * Fetches relevant medical knowledge from the RAG database
 */
async function fetchMedicalKnowledge(query: string, topK: number = 3): Promise<MedicalKnowledgeResult[]> {
    try {
        console.log("Debug: Fetching medical knowledge for:", query);

        const response = await fetch(`${BACKEND_URL}/api/medical-knowledge/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, top_k: topK })
        });

        if (!response.ok) {
            console.warn("Medical knowledge service returned:", response.status);
            return [];
        }

        const data: MedicalKnowledgeResponse = await response.json();

        if (data.error) {
            console.warn("Medical knowledge service error:", data.error);
            return [];
        }

        console.log(`Debug: Retrieved ${data.results.length} medical knowledge entries`);
        return data.results;
    } catch (error) {
        console.warn("Failed to fetch medical knowledge:", error);
        return [];
    }
}

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

            // 2. Fetch from drug database
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

            // 3. Fetch from Medical Knowledge Base (RAG)
            const medicalKnowledge = await fetchMedicalKnowledge(message, 3);
            let medicalKnowledgeContext = "";

            if (medicalKnowledge.length > 0) {
                medicalKnowledgeContext = "\n### SPECIALIZED MEDICAL KNOWLEDGE BASE (From Medical-Reasoning Dataset):\n";
                medicalKnowledgeContext += "The following is expert medical reasoning from a curated medical knowledge base. USE THIS AS YOUR PRIMARY SOURCE.\n\n";

                medicalKnowledge.forEach((entry, index) => {
                    medicalKnowledgeContext += `--- MEDICAL REFERENCE ${index + 1} (Relevance: ${Math.round(entry.relevance_score * 100)}%) ---\n`;
                    medicalKnowledgeContext += `Original Question: ${entry.question.substring(0, 300)}${entry.question.length > 300 ? '...' : ''}\n`;
                    medicalKnowledgeContext += `Expert Answer: ${entry.answer.substring(0, 1500)}${entry.answer.length > 1500 ? '...' : ''}\n`;
                    medicalKnowledgeContext += `------------------\n\n`;
                });
            }

            const prompt = `
You are a PROFESSIONAL MEDICAL REFERENCE AI - equivalent to a senior physician or medical specialist.
This is a MEDICAL EDUCATION AND REFERENCE application used by healthcare professionals and medical students.

YOUR ROLE:
- You ARE a reliable medical reference that provides PROFESSIONAL DIAGNOSTIC ASSESSMENTS
- You provide differential diagnoses ranked by likelihood
- You explain clinical reasoning and pathophysiology
- You recommend appropriate diagnostic tests and workups
- You discuss treatment approaches and protocols
- You act like a medical textbook combined with clinical decision support

KNOWLEDGE SOURCES:
You have access to the Medical-Reasoning-SFT-GPT-OSS-120B dataset containing expert medical reasoning.
${medicalKnowledgeContext}


### CLINICAL QUERY: "${message}"

RESPONSE FORMAT FOR DIAGNOSTIC QUESTIONS:

**1. CLINICAL ASSESSMENT:**
Analyze the presenting symptoms, patient demographics, and relevant history.

**2. DIFFERENTIAL DIAGNOSIS (ranked by likelihood):**
List the most probable diagnoses with clinical reasoning:
- Most Likely: [Diagnosis] - [Why this fits the presentation]
- Also Consider: [Diagnosis] - [Supporting/excluding factors]
- Rule Out: [Serious conditions to exclude]

**3. PATHOPHYSIOLOGY:**
Explain the underlying mechanism (e.g., "Dark urine after strep pharyngitis suggests possible post-streptococcal glomerulonephritis due to immune complex deposition...")

**4. RECOMMENDED WORKUP:**
- Laboratory tests (e.g., urinalysis, ASO titer, complement levels, BUN/creatinine)
- Imaging if indicated
- Referrals needed

**5. MANAGEMENT APPROACH:**
- Acute management
- Monitoring parameters
- When to escalate care

**6. RELEVANT MEDICATIONS:**
If drugs from the database are relevant, include:
[[DRUG_BLOCK]]
trade_name:: [Name] | [Arabic Name]
active_ingredient:: [Ingredient] | [Arabic Ingredient]
form:: [Form] | [Arabic Form]
indication:: [How this drug relates to the diagnosis]
[[DRUG_BLOCK]]

RESPONSE STYLE:
- Be thorough and clinically precise
- Use medical terminology appropriately (with explanations when helpful)
- Provide evidence-based recommendations
- Always reply in the user's language
- For pediatric cases, include age-appropriate considerations

EXAMPLE - For the query "7-year-old with dark urine after strep pharyngitis":

**Clinical Assessment:**
A 7-year-old presenting with dark urine (likely hematuria or hemoglobinuria) following recent streptococcal pharyngitis raises concern for post-infectious complications.

**Differential Diagnosis:**
1. **Post-Streptococcal Glomerulonephritis (PSGN)** - Most likely given the classic presentation of hematuria 1-3 weeks after strep infection
2. **IgA Nephropathy** - Can present similarly but typically occurs during or shortly after infection
3. **Dehydration-concentrated urine** - Less likely given the strep history

**Pathophysiology:**
PSGN results from immune complex deposition in glomeruli following Group A Streptococcus infection, causing inflammation and hematuria...

[Continue with workup and management]

NOW RESPOND TO THE USER'S CLINICAL QUERY:
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
