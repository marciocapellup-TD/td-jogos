import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Falha explícita em dev — evita loops de 401 sem contexto
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. Configure .env.local');
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.supabase = supabase;
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[auth]', event, session ? `user=${session.user.email}` : 'no session');
  });
}
