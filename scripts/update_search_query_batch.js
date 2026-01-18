const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function updateSearchQueries() {
    console.log('Fetching drugs...');
    const { data: drugs, error: fetchError } = await supabase
        .from('drugs')
        .select('id, "Drugname", "Form", "Category"');

    if (fetchError) {
        console.error('Error fetching drugs:', fetchError);
        return;
    }

    console.log(`Processing ${drugs.length} drugs...`);

    const updates = drugs.map(drug => ({
        id: drug.id,
        "Search Query": [
            drug.Drugname,
            drug.Form,
            drug.Category
        ].filter(Boolean).join(' ')
    }));

    // Batch size of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        console.log(`Updating batch ${i / BATCH_SIZE + 1}...`);

        // Supabase upsert can be used for batch updates if the primary key is included
        const { error } = await supabase
            .from('drugs')
            .upsert(batch);

        if (error) {
            console.error('Error updating batch:', error);
        }
    }

    console.log('Update complete!');
}

updateSearchQueries();
