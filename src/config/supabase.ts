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
  anonKey: 'sb_publishable_Syh_HcsQ3A-lzsB7476gUQ_57t4L-Yl',
  projectId: 'xvpwbocwasbtzrzrxyvu'
} as const;

// Helper to get the functions URL
export const getSupabaseFunctionsUrl = () => `${SUPABASE_CONFIG.url}/functions/v1`;
