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

// Pega TODOS os posts aprovados paginando em chunks de 1000.
// Necessário porque o Supabase tem db-max-rows=1000 server-side, então
// .range(0, 9999) numa query só é ignorado e retorna no máx 1000 linhas.
// Solução: várias requests paginadas até receber página incompleta.
export async function fetchAllApprovedPosts(select = '*') {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  // Limite de segurança: 50 páginas = 50k posts (impossível ser atingido)
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase
      .from('posts')
      .select(select)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('[fetchAllApprovedPosts] erro pagina', i, error);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
