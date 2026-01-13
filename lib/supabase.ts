import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { Database } from '../types/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy initialization to avoid SSR issues with Expo Router web
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabaseClient = () => {
    if (supabaseInstance) {
        return supabaseInstance;
    }

    // Only initialize on client side
    if (typeof window !== 'undefined' || Platform.OS !== 'web') {
        supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: AsyncStorage,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
            },
        });

        // Tells Supabase Auth to continuously refresh the session automatically
        // if the app is in the foreground. When this is added, you will continue
        // to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
        // `SIGNED_OUT` event if the user's session is terminated. This should
        // only be registered once.
        AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                supabaseInstance?.auth.startAutoRefresh();
            } else {
                supabaseInstance?.auth.stopAutoRefresh();
            }
        });
    }

    return supabaseInstance;
};

// Convenience export for backwards compatibility
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
    get(target, prop) {
        const client = getSupabaseClient();
        if (client) {
            return client[prop as keyof typeof client];
        }
        return undefined;
    },
});
