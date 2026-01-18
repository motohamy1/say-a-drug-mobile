const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCategories() {
    const { data, error } = await supabase
        .from('drugs')
        .select('Category')
        .limit(100);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const categories = [...new Set(data.map(d => d.Category))];
    console.log('Unique categories found in first 100 rows:', categories);
}

checkCategories();
