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
// `opts` aceita { dataDe, dataAte } como string YYYY-MM-DD para filtrar por etapa.
export async function fetchAllApprovedPosts(select = '*', opts = {}) {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  for (let i = 0; i < 50; i++) {
    let q = supabase
      .from('posts')
      .select(select)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });
    if (opts.dataDe)  q = q.gte('data_registro', opts.dataDe);
    if (opts.dataAte) q = q.lte('data_registro', opts.dataAte);
    const { data, error } = await q.range(from, from + PAGE - 1);
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

// Posts aprovados de UM usuário específico, opcionalmente dentro de uma janela
// de etapa ({ dataDe, dataAte } YYYY-MM-DD). Usado no drill-down do ranking
// (clicar numa pessoa → ver o histórico de pontos dela). Mais recente primeiro.
// O RLS (posts_read) libera leitura de posts 'approved' de qualquer usuário.
export async function fetchApprovedPostsByUser(userId, opts = {}) {
  if (!userId) return [];
  let q = supabase
    .from('posts')
    .select('id, categoria, data_registro, pontos, quantidade_frutas, tipo_alimento, horario, minutos, segundos, tipo_cultura, comentario, created_at')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('data_registro', { ascending: false })
    .order('created_at', { ascending: false });
  if (opts.dataDe)  q = q.gte('data_registro', opts.dataDe);
  if (opts.dataAte) q = q.lte('data_registro', opts.dataAte);
  const { data, error } = await q;
  if (error) {
    console.error('[fetchApprovedPostsByUser] erro', error);
    return [];
  }
  return data || [];
}
