require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const HF_TOKEN = process.env.HF_TOKEN;

if (!GROQ_API_KEY || GROQ_API_KEY === 'PASTE_YOUR_GROQ_KEY_HERE') {
    console.error('CRITICAL: GROQ_API_KEY is missing in backend/.env');
    // We don't exit here to allow health checks, but AI calls will fail
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

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
        data.rows.slice(0, 2).forEach((rowItem, index) => {
            const messages = rowItem.row.messages || [];
            const userMsg = messages.find((m) => m.role === 'user');
            const assistantMsg = messages.find((m) => m.role === 'assistant');
            if (userMsg && assistantMsg) {
                // Truncate expert answer to keep context window small
                const expertText = assistantMsg.content.length > 2000
                    ? assistantMsg.content.substring(0, 2000) + '... [TRUNCATED]'
                    : assistantMsg.content;

                context += `--- REFERENCE ${index + 1} ---\n`;
                context += `Original Question: ${userMsg.content}\n`;
                context += `Expert Answer: ${expertText}\n`;
                context += `------------------\n\n`;
            }
        });
        return context;
    } catch {
        return '';
    }
}

async function callAI(prompt, retries = 3) {
    if (!GROQ_API_KEY || GROQ_API_KEY === 'PASTE_YOUR_GROQ_KEY_HERE') {
        throw new Error('GROQ_API_KEY is not configured');
    }

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const result = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.1-8b-instant', // Switched from 70B to 8B for much higher TPM/RPM limits
                temperature: 0.3,
                max_tokens: 2048,
            });
            return result.choices[0]?.message?.content?.trim() || '';
        } catch (err) {
            console.error(`Attempt ${attempt + 1} failed:`, err.message);
            if (attempt < retries - 1) {
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
        const keywords = await callAI(prompt);
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
You are a senior Medical AI Expert. 
YOUR TASK: Provide a FAST but PROFESSIONAL TOPIC RECAP for the medical topic: "${message}".

KNOWLEDGE SOURCES:
Retrieved expert medical knowledge for context:
${medicalKnowledgeContext}

STRICT FORMATTING RULE — NO EXCEPTIONS:
Every word of your response MUST be inside a structured section. 
Do NOT use ANY asterisks (*) or markdown bold (**). 

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
- ZERO asterisks (*) allowed anywhere.
- ZERO markdown bold (**) allowed anywhere.
- No conversational text outside of ##SECTION## blocks.
- LANGUAGE RULE: Match the user's language perfectly. If the query is in English, respond ONLY in English. If the query is in Arabic, respond in Arabic but include English medical terms in parentheses.
      `;
        } else {
            prompt = `
You are Med Arena AI, a senior Clinical Consultant and Pharmaceutical Expert. 

KNOWLEDGE SOURCES:
Retrieved expert medical knowledge for context:
${medicalKnowledgeContext}

### USER QUERY: "${message}"

### INSTRUCTIONS:
Step 1: INTERNAL REASONING (DO NOT OUTPUT THIS PART):
Before responding, internally categorize the query:
- Is it a Disease Overview (e.g., Gastroenteritis)?
- Is it a Clinical Case Study/Problem?
- Is it a Medical Scoring System or Diagnostic Criteria?
- Is it a General Medical Concern?

Step 2: DELIVER A PROFESSIONAL GRADE RESPONSE:
- Provide deep, accurate, and reliable medical insights. 
- Maintain an expert tone. Explain reasoning clearly within the sections.

Step 3: UI DECORATION & STRUCTURE (STRICTLY START HERE):
You MUST divide your entire response into clear sections using this exact delimiter format. 

STRICT OUTPUT RULE:
- Your final response MUST START immediately with the first ##SECTION HEADING##.
- DO NOT list "Step 1", "Step 2", or any categorization labels in your response.
- LANGUAGE RULE: Match the user's language perfectly. If the query is in English, respond ONLY in English. If the query is in Arabic, respond in Arabic but include medical terminology in English in parentheses for clarity (e.g., "التهاب البلعوم (Pharyngitis)").
- NEVER use asterisks (*) or markdown bold (**).
- ZERO markdown formatting allowed inside sections.
- ALL HEADINGS must be in ALL CAPS.

HEADING CATEGORIES (Pick the most relevant):
- CLINICAL: ##DEFINITION##, ##CLINICAL PICTURE##, ##DIFFERENTIAL DIAGNOSIS##, ##INVESTIGATIONS##, ##TREATMENT##, ##MANAGEMENT PROTOCOL##
- SCORING/CRITERIA: ##OVERVIEW##, ##SCORING CRITERIA##, ##INTERPRETATION##, ##CLINICAL SIGNIFICANCE##
- DRUG/PHARMA: ##INDICATIONS##, ##CONTRAINDICATIONS##, ##SIDE EFFECTS##, ##MECHANISM##
- GENERAL: ##KEY POINTS##, ##PROFESSIONAL ADVICE##

NOW RESPOND TO THE USER'S QUERY (START WITH ##):
      `;
        }

        const rawReply = await callAI(prompt);

        // --- AGGRESSIVE CLEANER & FAIL-SAFE ---
        // 1. Strip anything before the first "##"
        let scrubbed = rawReply;
        const firstIdx = rawReply.indexOf('##');
        if (firstIdx !== -1) scrubbed = rawReply.substring(firstIdx);

        // 2. Strong Section Whitelist: Remove any section the AI hallucinated that isn't a real UI category
        // This stops "INTERNAL REASONING", "CATEGORIZATION", etc. from appearing.
        const sections = scrubbed.split(/##(.*?)##/);
        const APPROVED_HEADINGS = [
            'DEFINITION', 'CLINICAL PICTURE', 'DIFFERENTIAL DIAGNOSIS', 'INVESTIGATIONS',
            'TREATMENT', 'MANAGEMENT PROTOCOL', 'OVERVIEW', 'SCORING CRITERIA',
            'INTERPRETATION', 'CLINICAL SIGNIFICANCE', 'INDICATIONS', 'CONTRAINDICATIONS',
            'SIDE EFFECTS', 'MECHANISM', 'KEY POINTS', 'PROFESSIONAL ADVICE', 'UPDATED INFO / SCORES'
        ];

        let finalReply = '';
        for (let i = 1; i < sections.length; i += 2) {
            const h = sections[i].trim().toUpperCase();
            const content = sections[i + 1] || '';
            // Only keep if heading is in our whitelist
            if (APPROVED_HEADINGS.some(app => h.includes(app))) {
                finalReply += `##${sections[i]}##\n${content}\n##END##\n\n`;
            }
        }

        // 3. Last fallback: if everything was stripped, use the scrubbed text
        const reply = finalReply.trim() || scrubbed.trim();

        console.log(`[AI Response] Scrubbed Start: "${reply.substring(0, 50).replace(/\n/g, ' ')}..."`);
        console.log(`[AI Response Status] Structured: ${reply.includes('##')}, Length: ${reply.length}`);

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
    if (GROQ_API_KEY && GROQ_API_KEY !== 'PASTE_YOUR_GROQ_KEY_HERE') {
        console.log(`   Groq key loaded: ${GROQ_API_KEY.substring(0, 8)}...`);
    } else {
        console.log(`   ⚠️ GROQ_API_KEY is not configured in .env`);
    }
});
