import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

export type Drug = Database['public']['Tables']['drugs']['Row'];

export const drugService = {
    /**
     * Search for a drug by name or active ingredient.
     * Currently returns the single best match to simulate a direct bot answer.
     */
    async searchDrug(query: string): Promise<Drug | null> {
        try {
            const { data, error } = await supabase
                .from('drugs')
                .select('*')
                .or(`trade_name.ilike.%${query}%,active_ingredients.cs.{${query}}`)
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
            const { data, error } = await supabase
                .from('drugs')
                .select('*')
                .or(`trade_name.ilike.%${query}%,active_ingredients.cs.{${query}}`)
                .limit(5);

            if (error) {
                console.error('Error searching for drugs:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('Unexpected error in searchDrugs:', err);
            return [];
        }
    },
};
