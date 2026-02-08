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
     * First searches local Supabase DB, then falls back to DrugEye website.
     */
    async searchDrugs(query: string): Promise<Drug[]> {
        try {
            // Smart cleaning of the query
            const cleanQuery = query.replace(/[^\w\s\u0600-\u06FF]/gi, '').trim();
            if (!cleanQuery) return [];

            // First, try local Supabase database
            const { data, error } = await supabase
                .from('drug_database')
                .select('*')
                .or(`Trade_name.ilike.%${cleanQuery}%,Active_ingredient.ilike.%${cleanQuery}%`)
                .limit(5);

            if (error) {
                console.error('Error searching for drugs:', error);
            }

            // If we have results from local DB, return them
            if (data && data.length > 0) {
                return data;
            }

            // If no results, try splitting the query into keywords to find a broader match
            if (cleanQuery.includes(' ')) {
                const keywords = cleanQuery.split(/\s+/).filter(k => k.length > 2);
                if (keywords.length > 0) {
                    const columns = ['Trade_name', 'Active_ingredient'];
                    const orConditions = keywords.flatMap(kw =>
                        columns.map(col => `${col}.ilike.%${kw}%`)
                    ).join(',');

                    const { data: broaderData, error: broaderError } = await supabase
                        .from('drug_database')
                        .select('*')
                        .or(orConditions)
                        .limit(5);

                    if (!broaderError && broaderData && broaderData.length > 0) {
                        return broaderData;
                    }
                }
            }

            // If still no results from local DB, search DrugEye website
            console.log('[DrugService] No local results, searching DrugEye website...');
            const drugEyeResults = await this.searchDrugEye(cleanQuery);
            return drugEyeResults;

        } catch (err) {
            console.error('Unexpected error in searchDrugs:', err);
            return [];
        }
    },

    /**
     * Search the DrugEye website through the backend scraper service.
     */
    async searchDrugEye(query: string): Promise<Drug[]> {
        const BACKEND_URL = process.env.EXPO_PUBLIC_DRUGEYE_BACKEND_URL || 'http://localhost:3001';

        try {
            console.log(`[DrugService] Searching DrugEye for: ${query}`);

            const response = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}`);

            if (!response.ok) {
                console.error(`[DrugService] DrugEye API error: ${response.status}`);
                return [];
            }

            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                console.log(`[DrugService] Found ${result.data.length} results from DrugEye`);

                // Transform DrugEye results to match Supabase Drug type
                return result.data.map((item: any) => ({
                    id: `drugeye_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    Trade_name: item.trade_name || item.Trade_name || 'Unknown',
                    Active_ingredient: item.active_ingredient || item.Active_ingredient || 'N/A',
                    Price: item.price || item.Price || 'N/A',
                    Company: item.company || item.Company || 'N/A',
                    Form: item.form || item.Form || 'N/A',
                    Category: item.Category || 'DrugEye Database',
                    source: 'drugeye',
                    currency: item.price?.includes('EGP') ? 'EGP' : 'N/A'
                }));
            }

            return [];
        } catch (err) {
            console.error('[DrugService] DrugEye search error:', err);
            return [];
        }
    },
};
