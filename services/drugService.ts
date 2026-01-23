import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

export type Drug = Database['public']['Tables']['drug_database']['Row'];

export const drugService = {
    /**
     * Search for a drug by name or category.
     * Currently returns the single best match to simulate a direct bot answer.
     */
    async searchDrug(query: string): Promise<Drug | null> {
        try {
            const { data, error } = await supabase
                .from('drug_database')
                .select('*')
                .or(`Trade_name.ilike.%${query}%,Active_ingredient.ilike.%${query}%`)
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error searching for drug:', error);
                return null;
            }

            return data;
        } catch (err) {
            console.error('Unexpected error in searchDrug:', err);
            return null;
        }
    },

    /**
     * Search for multiple drugs to provide context to the AI.
     */
    async searchDrugs(query: string): Promise<Drug[]> {
        try {
            // Smart cleaning of the query
            const cleanQuery = query.replace(/[^\w\s\u0600-\u06FF]/gi, '').trim();
            if (!cleanQuery) return [];

            const { data, error } = await supabase
                .from('drug_database')
                .select('*')
                .or(`Trade_name.ilike.%${cleanQuery}%,Active_ingredient.ilike.%${cleanQuery}%,trade_name.ilike.%${cleanQuery}%`)
                .limit(5);

            if (error) {
                console.error('Error searching for drugs:', error);
                return [];
            }

            // If no results, try splitting the query into keywords to find a broader match
            if ((!data || data.length === 0) && cleanQuery.includes(' ')) {
                const keywords = cleanQuery.split(/\s+/).filter(k => k.length > 2);
                if (keywords.length > 0) {
                    const columns = ['Trade_name', 'Active_ingredient', 'trade_name'];
                    const orConditions = keywords.flatMap(kw =>
                        columns.map(col => `${col}.ilike.%${kw}%`)
                    ).join(',');

                    const { data: broaderData, error: broaderError } = await supabase
                        .from('drug_database')
                        .select('*')
                        .or(orConditions)
                        .limit(5);

                    if (!broaderError && broaderData) return broaderData;
                }
            }

            return data || [];
        } catch (err) {
            console.error('Unexpected error in searchDrugs:', err);
            return [];
        }
    },
};
