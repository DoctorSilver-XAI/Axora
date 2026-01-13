/**
 * Supabase Client Configuration
 * 
 * This module initializes the Supabase client for authentication and database access.
 * Credentials are loaded from environment variables.
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables - these will be injected by webpack
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '⚠️ Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.'
    );
}

/**
 * Supabase client instance
 * 
 * Features:
 * - persistSession: Keeps user logged in across app restarts
 * - autoRefreshToken: Automatically refreshes expired tokens
 * - detectSessionInUrl: Handles magic link redirects
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // For Electron, we need to use localStorage
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
});

/**
 * Helper to check if Supabase is properly configured
 */
export const isSupabaseConfigured = () => {
    return Boolean(supabaseUrl && supabaseAnonKey);
};
