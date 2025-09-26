import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log configuration status for debugging
console.log('Supabase configuration status:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
  isUrlPlaceholder: supabaseUrl === 'your_supabase_project_url',
  isKeyPlaceholder: supabaseAnonKey === 'your_supabase_anon_key'
});

const isConfigured = supabaseUrl && 
                    supabaseAnonKey && 
                    supabaseUrl !== 'your_supabase_project_url' && 
                    supabaseAnonKey !== 'your_supabase_anon_key';

if (!isConfigured) {
  console.warn('⚠️ Supabase not properly configured. Please check your .env file:');
  console.warn('- VITE_SUPABASE_URL should be your actual Supabase project URL');
  console.warn('- VITE_SUPABASE_ANON_KEY should be your actual Supabase anon key');
  console.warn('- Make sure to restart your dev server after updating .env');
}

// Always create the real Supabase client, even if not configured
// This allows the app to work in production where env vars are set differently
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'muzai-app',
        'Content-Type': 'application/json'
      }
    }
  }
);

export { supabase };