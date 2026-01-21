
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Load environment variables from .env file (simple parser)
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = value;
        }
    });
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CSV_FILE_PATH = path.resolve(__dirname, '../assets/data/database112024(Sheet1).csv');

async function importData() {
    console.log('Starting data import...');

    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`Error: CSV file not found at ${CSV_FILE_PATH}`);
        process.exit(1);
    }

    // Clear existing data
    console.log('Clearing existing data from "drugs" table...');
    const { error: deleteError } = await supabase
        .from('drugs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack to delete all rows if no better policy

    if (deleteError) {
        console.error('Error clearing data:', deleteError.message);
        // Proceeding anyway might duplicate data, but let's warn
        console.warn('Proceeding with import, but duplication might occur.');
    } else {
        console.log('Data cleared successfully.');
    }

    const fileStream = fs.createReadStream(CSV_FILE_PATH);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let records = [];
    let isHeader = true;
    let headers = [];

    // Simple CSV parser helper
    const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    for await (const line of rl) {
        if (!line.trim()) continue;

        const columns = parseLine(line);

        if (isHeader) {
            headers = columns; // Use headers exactly as they are in CSV (e.g., "Active_ingredient", "Trade_name")
            isHeader = false;
            console.log('Headers found:', headers);
            continue;
        }

        const row = {};
        headers.forEach((header, index) => {
            if (header) { // Skip empty/trailing headers
                row[header] = columns[index] || '';
            }
        });

        // Map CSV fields to Supabase schema
        const trade_name = row['Trade_name'] || '';
        const active_ingredient = row['Active_ingredient'] || '';
        const searchQuery = `${trade_name} ${active_ingredient}`.trim();

        records.push({
            "Trade_name": trade_name,
            "Active_ingredient": active_ingredient,
            "Search Query": searchQuery,
            // Legacy/Fallback columns for app compatibility
            trade_name: trade_name,
            active_ingredients: active_ingredient ? [active_ingredient] : [],
        });

        if (records.length >= 100) {
            await insertBatch(records);
            records = [];
        }
    }

    if (records.length > 0) {
        await insertBatch(records);
    }

    console.log('Import completed successfully!');
}

async function insertBatch(batch) {
    const { error } = await supabase.from('drugs').insert(batch);
    if (error) {
        console.error('Error inserting batch:', error.message);
    } else {
        process.stdout.write('.');
    }
}

importData().catch(console.error);
