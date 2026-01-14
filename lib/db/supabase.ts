// ============================================
// CLIENT SUPABASE
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// En développement, on permet de continuer sans Supabase (avec des clients mock)
const isDevelopment = process.env.NODE_ENV === 'development';

if (!supabaseUrl || !supabaseAnonKey) {
  if (isDevelopment) {
    console.warn('⚠️  Supabase non configuré. Utilisation de clients mock pour le développement.');
    console.warn('   Pour activer Supabase, configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local');
  } else {
    throw new Error('Missing Supabase environment variables');
  }
}

// Client pour le frontend (avec Row Level Security)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

// Client pour le backend (avec service role key - bypass RLS)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseServiceKey || 'placeholder-service-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
