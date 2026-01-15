const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Validations & Setup
console.log("--- Gemini API Diagnostics ---");

// Simple .env parser since dotenv might not be installed
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        if (!fs.existsSync(envPath)) return null;
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // remove quotes
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        console.error("Error reading .env:", e);
        return null;
    }
}

const env = loadEnv();
const API_KEY = env ? env.EXPO_PUBLIC_GEMINI_API_KEY : process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ CRITICAL: Could not find EXPO_PUBLIC_GEMINI_API_KEY in .env or process.env");
    process.exit(1);
}

console.log(`✅ API Key found (starts with: ${API_KEY.substring(0, 4)}...)`);

const genAI = new GoogleGenerativeAI(API_KEY);

async function testModel(modelName) {
    console.log(`\nTesting model: "${modelName}"...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you online?");
        const response = result.response;
        const text = response.text();
        console.log(`✅ Success! Response: "${text.trim().substring(0, 50)}..."`);
        return true;
    } catch (error) {
        console.error(`❌ Failed with error: ${error.message}`);
        // console.error(JSON.stringify(error, null, 2));
        return false;
    }
}

async function run() {
    // Test 1: The model currently used in the app
    const currentModel = "gemini-flash-latest";
    const currentInfo = await testModel(currentModel);

    if (currentInfo) {
        console.log("\n✅ The current model configuration is VALID.");
    } else {
        console.log("\n⚠️ The current model configuration appears INVALID.");

        // Test 2: The recommended fallback
        const fallbackModel = "gemini-1.5-flash";
        console.log(`Trying fallback model: "${fallbackModel}"...`);
        const fallbackInfo = await testModel(fallbackModel);

        if (fallbackInfo) {
            console.log(`\nRECOMMENDATION: Change model name in aiService.ts from "${currentModel}" to "${fallbackModel}"`);
        } else {
            console.log("\n❌ Both models failed. Check your API Key or Quota.");
        }
    }
}

run();
