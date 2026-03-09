require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HF_TOKEN = process.env.HF_TOKEN;

if (!GEMINI_API_KEY) {
    console.error('CRITICAL: GEMINI_API_KEY is missing in backend/.env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchMedicalKnowledge(query) {
    try {
        const url = new URL('https://datasets-server.huggingface.co/search');
        url.searchParams.append('dataset', 'OpenMed/Medical-Reasoning-SFT-Mega');
        url.searchParams.append('config', 'default');
        url.searchParams.append('split', 'train');
        url.searchParams.append('query', query);

        const response = await fetch(url.toString());
        if (!response.ok) return '';

        const data = await response.json();
        if (data.error || !data.rows?.length) return '';

        let context = '';
        data.rows.slice(0, 3).forEach((rowItem, index) => {
            const messages = rowItem.row.messages || [];
            const userMsg = messages.find((m) => m.role === 'user');
            const assistantMsg = messages.find((m) => m.role === 'assistant');
            if (userMsg && assistantMsg) {
                context += `--- REFERENCE ${index + 1} ---\n`;
                context += `Original Question: ${userMsg.content}\n`;
                context += `Expert Answer: ${assistantMsg.content}\n`;
                context += `------------------\n\n`;
            }
        });
        return context;
    } catch {
        return '';
    }
}

async function callGemini(prompt, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (err) {
            if (err.message?.includes('503') && attempt < retries - 1) {
                await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
                continue;
            }
            throw err;
        }
    }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// POST /api/keywords — extract drug/ingredient keywords from a query
app.post('/api/keywords', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

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
        const keywords = await callGemini(prompt);
        res.json({ keywords });
    } catch (err) {
        console.error('[/api/keywords]', err.message);
        res.status(500).json({ error: 'Keyword extraction failed', keywords: message });
    }
});

// POST /api/chat — main AI chat endpoint
app.post('/api/chat', async (req, res) => {
    const { message, mode = 'general' } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    try {
        // Fetch medical knowledge context
        const rawKnowledge = await fetchMedicalKnowledge(message);
        const medicalKnowledgeContext = rawKnowledge
            ? `\n### SPECIALIZED MEDICAL KNOWLEDGE BASE (From OpenMed/Medical-Reasoning-SFT-Mega):\n` +
            `The following is expert medical reasoning retrieved directly from a curated medical dataset. USE THIS AS YOUR PRIMARY SOURCE.\n\n` +
            rawKnowledge + `\n\n`
            : '';

        let prompt = '';

        if (mode === 'fast_recap') {
            prompt = `
You are a highly advanced Medical AI Assistant.
YOUR TASK: Provide a FAST TOPIC RECAP for the user's selected medical topic: "${message}".

KNOWLEDGE SOURCES:
You must base your clinical reasoning on the following medical knowledge context:
${medicalKnowledgeContext}

CRITICAL FORMATTING RULE — NO EXCEPTIONS:
Every single word of your response MUST be inside a structured section. Do NOT use any asterisks (*) or markdown bold (**). 

You MUST use EXACTLY these section delimiters:

##DEFINITION##
content
##END##

##CLINICAL PICTURE##
content
##END##

##INVESTIGATIONS##
content
##END##

##DIFFERENTIAL DIAGNOSIS##
content
##END##

##UPDATED INFO / SCORES##
content
##END##

##TREATMENT##
content
##END##

STRICT RULES:
- Zero asterisks (*) allowed.
- Zero markdown bold (**) allowed.
- No text outside of ##SECTION## blocks.
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

CRITICAL FORMATTING RULE — EVERY RESPONSE MUST BE STRUCTURED:
You MUST divide your entire response into clear sections using this exact delimiter format:

##SECTION HEADING##
content goes here
##END##

STRICT RULES:
- Never use asterisks (*) or markdown bold (**).
- Never write text before the first ##HEADING## or after the last ##END##.
- Use 2 to 6 sections. Heading must be ALL CAPS.

HEADING CATEGORIES:
1. CLINICAL: ##CLINICAL ASSESSMENT##, ##DIFFERENTIAL DIAGNOSIS##, ##MANAGEMENT / WORKUP##, ##RELEVANT MEDICATIONS##
2. SCORING: ##OVERVIEW##, ##SCORING CRITERIA##, ##INTERPRETATION##, ##CLINICAL USE##
3. DRUG: ##DRUG OVERVIEW##, ##MECHANISM OF ACTION##, ##INDICATIONS##, ##DOSAGE AND FORMS##, ##SIDE EFFECTS##
4. CONCEPT: ##DEFINITION##, ##KEY POINTS##, ##CLINICAL RELEVANCE##, ##IMPORTANT NOTES##
5. LABS: ##OVERVIEW##, ##NORMAL VALUES##, ##INTERPRETATION##, ##CLINICAL SIGNIFICANCE##

IMPORTANT: If the user writes in Arabic, reply fully in Arabic and use Arabic headings too.

NOW RESPOND TO THE USER'S QUERY:
      `;
        }

        const reply = await callGemini(prompt);
        res.json({ reply });
    } catch (err) {
        console.error('[/api/chat]', err.message);
        res.status(500).json({
            error: 'AI service error',
            reply: "I'm sorry, I'm having trouble right now. Please try again.",
        });
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ Med Arena backend running on http://localhost:${PORT}`);
    console.log(`   Gemini key loaded: ${GEMINI_API_KEY.substring(0, 8)}...`);
});
