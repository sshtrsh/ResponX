// lib/supabase.ts - Enterprise-grade Supabase client with validation
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Environment variable validation
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables at module load time
if (!supabaseUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL environment variable. " +
    "Create .env at the project root with your Supabase URL."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable. " +
    "Create .env at the project root with your Supabase anonymous key."
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error(
    `Invalid Supabase URL format: "${supabaseUrl}". ` +
    "URL must be a valid HTTP/HTTPS address (e.g., https://your-project.supabase.co)"
  );
}

// Validate key format (Supabase keys are typically 60+ characters)
if (supabaseAnonKey.length < 20) {
  throw new Error(
    `Invalid Supabase anonymous key format. Key appears too short (${supabaseAnonKey.length} chars). ` +
    "Please check your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;