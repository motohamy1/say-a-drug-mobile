import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const useUserProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Supabase is disabled for now, returning mock/null values
  useEffect(() => {
    // Optionally set a mock user ID here if needed for testing auth-gated features
    // setUserId("mock_user_123");
    setLoading(false);
  }, []);

  return { profile, loading, userId };
};
