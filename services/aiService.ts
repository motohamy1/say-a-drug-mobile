import { GoogleGenerativeAI } from "@google/generative-ai";
import { HfInference } from "@huggingface/inference";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const HF_TOKEN = process.env.EXPO_PUBLIC_HF_TOKEN;
const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3001";

const hf = new HfInference(HF_TOKEN);

console.log("Debug: Checking API Key...");
if (!API_KEY) {
  console.error("CRITICAL: EXPO_PUBLIC_GEMINI_API_KEY is missing or empty.");
  console.log(
    "Available Env Keys:",
    Object.keys(process.env).filter((k) => k.startsWith("EXPO_PUBLIC_")),
  );
} else {
  console.log(
    "Debug: API Key present (Starts with: " + API_KEY.substring(0, 4) + "...)",
  );
}

const genAI = new GoogleGenerativeAI(API_KEY || "MISSING_KEY");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Fetches relevant medical knowledge from the Hugging Face Serverless Dataset API
 * using the OpenMed/Medical-Reasoning-SFT-Mega dataset.
 */
async function fetchMedicalKnowledgeFromHF(query: string): Promise<string> {
  try {
    console.log("Debug: Fetching medical knowledge from OpenMed dataset for:", query);

    // Using the Hugging Face Dataset Server API to search the dataset directly
    // This requires hitting the datasets-server API rather than the model inference API.
    const url = new URL('https://datasets-server.huggingface.co/search');
    url.searchParams.append('dataset', 'OpenMed/Medical-Reasoning-SFT-Mega');
    url.searchParams.append('config', 'default');
    url.searchParams.append('split', 'train');
    url.searchParams.append('query', query);

    // We fetch a few relevant rows based on the user's query
    const response = await fetch(url.toString());

    if (!response.ok) {
      console.warn("Medical knowledge dataset service returned:", response.status);
      return "";
    }

    const data = await response.json();

    if (data.error) {
      console.warn("Medical knowledge dataset service error:", data.error);
      return "";
    }

    if (data.rows && data.rows.length > 0) {
      console.log(`Debug: Retrieved ${data.rows.length} relevant medical knowledge rows from OpenMed directly`);

      let contextStr = "";
      // Map up to top 3 relevant Q&A pairs from the dataset
      data.rows.slice(0, 3).forEach((rowItem: any, index: number) => {
        // The dataset format usually has 'messages' containing role/content 
        const messages = rowItem.row.messages || [];
        const userMsg = messages.find((m: any) => m.role === 'user');
        const assistantMsg = messages.find((m: any) => m.role === 'assistant');

        if (userMsg && assistantMsg) {
          contextStr += `--- REFERENCE ${index + 1} ---\n`;
          contextStr += `Original Question: ${userMsg.content}\n`;
          contextStr += `Expert Answer: ${assistantMsg.content}\n`;
          contextStr += `------------------\n\n`;
        }
      });
      return contextStr;
    }

    return "";
  } catch (error) {
    console.warn("Failed to fetch medical knowledge from OpenMed dataset:", error);
    return "";
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
   * Sends a text message to the AI, performing a RAG search on the medical database first.
   */
  async sendMessageByText(message: string, mode: 'general' | 'fast_recap' = 'general'): Promise<string> {
    console.log(`Debug: sendMessageByText called with message: "${message}", mode: "${mode}"`);
    if (!API_KEY || API_KEY === "MISSING_KEY") {
      return "Configuration Error: Gemini API Key is missing. Please check your .env file and restart the server with --clear.";
    }

    try {

      // 3. Fetch from Medical Knowledge Base (BioMistral)
      const medicalKnowledge = await fetchMedicalKnowledgeFromHF(message);
      let medicalKnowledgeContext = "";

      if (medicalKnowledge) {
        medicalKnowledgeContext =
          "\n### SPECIALIZED MEDICAL KNOWLEDGE BASE (From OpenMed/Medical-Reasoning-SFT-Mega):\n" +
          "The following is expert medical reasoning retrieved directly from a curated medical dataset. USE THIS AS YOUR PRIMARY SOURCE.\n\n" +
          medicalKnowledge + "\n\n";
      }

      let prompt = "";

      if (mode === 'fast_recap') {
        prompt = `
You are a highly advanced Medical AI Assistant.
YOUR TASK: Provide a FAST TOPIC RECAP for the user's selected medical topic: "${message}".

KNOWLEDGE SOURCES: 
You must base your clinical reasoning on the following medical knowledge context:
${medicalKnowledgeContext}

STRICT RESPONSE FORMAT:
Provide a highly structured, accurate, and concise recap using exactly these sections. Do not use conversational filler.

**Definition:** (Brief clinical definition of the condition)
**Clinical Picture:** (Key symptoms and signs)
**Investigations:** (Required labs, imaging, or specific tests)
**Differential Diagnosis:** (Top 3-4 likely alternatives ranked)
**Updated Info/Scores:** (Any relevant clinical scores or recent protocol updates, if available)
**Treatment:** (Current standard treatment protocol and most accurate suggestions)
        `;
      } else {
        prompt = `
You are Med Arena AI, an advanced MEDICAL AND PHARMACEUTICAL ASSISTANT.

YOUR ROLE:
You handle all types of medical queries.

KNOWLEDGE SOURCES:
You have access to the following retrieved medical knowledge:
${medicalKnowledgeContext}

### USER QUERY: "${message}"

CRITICAL FORMATTING RULE — APPLIES TO EVERY SINGLE RESPONSE WITHOUT EXCEPTION:
You MUST divide your entire response into clear sections using this exact delimiter format:

##SECTION HEADING##
content goes here
##END##

Do NOT write any text before the first ##HEADING## or after the last ##END##.
Do NOT use asterisks (*) or markdown **bold** anywhere.
Use 2 to 6 sections depending on the topic.

Choose section headings based on the query type:

TYPE 1 — CLINICAL CASE or DISEASE (pharyngitis, chest pain, stroke, etc.):
  ##CLINICAL ASSESSMENT##, ##DIFFERENTIAL DIAGNOSIS##, ##MANAGEMENT / WORKUP##, ##RELEVANT MEDICATIONS##

TYPE 2 — SCORING SYSTEM or SCALE (Glasgow Coma Scale, SOFA, Wells, APGAR, etc.):
  ##OVERVIEW##, ##SCORING CRITERIA##, ##INTERPRETATION##, ##CLINICAL USE##

TYPE 3 — DRUG or MEDICATION (metformin, amoxicillin, warfarin, etc.):
  ##DRUG OVERVIEW##, ##MECHANISM OF ACTION##, ##INDICATIONS##, ##DOSAGE AND FORMS##, ##SIDE EFFECTS##

TYPE 4 — GENERAL CONCEPT or PROCEDURE (sepsis, dialysis, shock, intubation, etc.):
  ##DEFINITION##, ##KEY POINTS##, ##CLINICAL RELEVANCE##, ##IMPORTANT NOTES##

TYPE 5 — INVESTIGATION or LAB (ABG, troponin, CBC, ECG changes, etc.):
  ##OVERVIEW##, ##NORMAL VALUES##, ##INTERPRETATION##, ##CLINICAL SIGNIFICANCE##

For any query not covered above, use 3-5 logical short headings that fit the topic — still using ##HEADING## ... ##END##.

IMPORTANT: If the user writes in Arabic, reply fully in Arabic and write section headings in Arabic too.

NOW RESPOND TO THE USER'S QUERY:
        `;
      }

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
          if (error.message?.includes("503") && attempts < maxAttempts) {
            const delay = Math.pow(2, attempts) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
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

  async processAudio(
    base64Audio: string,
    mimeType: string = "audio/m4a",
  ): Promise<{ text: string; reply: string }> {
    try {
      const transcriptionPrompt =
        "Transcribe exactly what the user said in this audio. Do not add any commentary.";
      const result = await model.generateContent([
        transcriptionPrompt,
        { inlineData: { mimeType: mimeType, data: base64Audio } },
      ]);

      const transcription = result.response.text();
      console.log("Transcription:", transcription);
      const reply = await this.sendMessageByText(transcription, 'general');

      return { text: transcription, reply };
    } catch (error) {
      console.error("Audio Processing Error:", error);
      return {
        text: "(Audio processing failed)",
        reply:
          "I couldn't understand the audio. Please try typing or recording again.",
      };
    }
  },
};
