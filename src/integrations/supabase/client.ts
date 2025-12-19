import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Hardcoded Supabase config - Lovable doesn't support VITE_* env variables
const SUPABASE_URL = 'https://xvpwbocwasbtzrzrxyvu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cHdib2N3YXNidHpyenJ4eXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MDE2NjUsImV4cCI6MjA1ODM3NzY2NX0.J8yp04TRmdyM_l5FaOFP7Elz16n1ZlQkawH5Xp1vCs0';

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'supabase.auth.token',
    },
  }
);
