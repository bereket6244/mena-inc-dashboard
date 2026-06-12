import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kfscegrozkxvuacgihtc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmc2NlZ3Jvemt4dnVhY2dpaHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzk2OTcsImV4cCI6MjA5NjgxNTY5N30.YSsvt9aYhK5PWgpwAlxfwjYDoaEIc1zDoL409x3fkBk';

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
