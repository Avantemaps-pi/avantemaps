/**
 * Centralized Supabase configuration
 * 
 * This file provides a single source of truth for Supabase credentials.
 * All client-side code should import from this file rather than hardcoding credentials.
 * 
 * Note: These are publishable/anon keys designed for client-side use.
 * Security is enforced via Row Level Security (RLS) policies in the database.
 */

export const SUPABASE_CONFIG = {
  url: 'https://xvpwbocwasbtzrzrxyvu.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cHdib2N3YXNidHpyenJ4eXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MDE2NjUsImV4cCI6MjA1ODM3NzY2NX0.J8yp04TRmdyM_l5FaOFP7Elz16n1ZlQkawH5Xp1vCs0',
  projectId: 'xvpwbocwasbtzrzrxyvu'
} as const;

// Helper to get the functions URL
export const getSupabaseFunctionsUrl = () => `${SUPABASE_CONFIG.url}/functions/v1`;
