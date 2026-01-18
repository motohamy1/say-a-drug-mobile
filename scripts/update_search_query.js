const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateSearchQueries() {
    console.log('Fetching drugs...');
    const { data: drugs, error: fetchError } = await supabase
        .from('drugs')
        .select('id, "Drugname", "Form", "Category"');

    if (fetchError) {
        console.error('Error fetching drugs:', fetchError);
        return;
    }

    console.log(`Updating ${drugs.length} drugs...`);

    for (const drug of drugs) {
        const searchQuery = [
            drug.Drugname,
            drug.Form,
            drug.Category
        ].filter(Boolean).join(' ');

        const { error: updateError } = await supabase
            .from('drugs')
            .update({ "Search Query": searchQuery })
            .eq('id', drug.id);

        if (updateError) {
            console.error(`Error updating drug ${drug.id}:`, updateError);
        }
    }

    console.log('Update complete!');
}

updateSearchQueries();
