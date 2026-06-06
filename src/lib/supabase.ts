import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite environment variables first, falling back to the hardcoded defaults
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://qppigftbbkhcjisnpwmr.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lBrgsXkNL5AwXvOQmhGqEw_1Jfn6eU9';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && !supabaseAnonKey.startsWith('sb_publishable'));

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export let supabaseValidationError: string | null = null;

if (supabaseAnonKey && supabaseAnonKey.startsWith('sb_publishable_')) {
  supabaseValidationError = "Format Alert: Your Anon Public API Key currently resembles a Stripe publishable key ('sb_publishable_...') instead of a real Supabase Anon public key, which is a long JWT string starting with 'eyJ...'. Please copy your 'anon' 'public' key from Supabase -> Settings -> API.";
} else if (!isSupabaseConfigured) {
  supabaseValidationError = "Setup Required: Please write a valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY inside your .env configuration files.";
}

export function setSupabaseValidationError(error: string | null) {
  supabaseValidationError = error;
}

console.log("🟢 Supabase engine loaded. Status Configured:", isSupabaseConfigured);

