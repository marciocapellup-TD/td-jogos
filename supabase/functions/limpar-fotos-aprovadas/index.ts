// Edge Function: limpar-fotos-aprovadas
//
// Limpeza storage-driven do bucket `postagens`. Delega a DECISÃO pra RPC
// public.fotos_para_limpar(p_target_bytes, p_retencao), que retorna os paths a
// apagar classificados em:
//   - 'orfao' : objeto sem post de foto viva apontando (qualquer idade)
//   - 'tempo' : post approved com foto viva e > retenção (4h)
//   - 'teto'  : se o bucket ainda passar do alvo, approved recentes oldest-first
// Apaga do Storage e marca os posts (post_id) com foto_liberada=true, foto_url=null.
// Protege pending/rejected (a RPC não os inclui).
//
// Invocado por: pg_cron (1x/h) e botão manual do Admin.
//
// Auth (autorizar):
//   1) cron/serviço: header Bearer == LIMPAR_FOTOS_SECRET (segredo dedicado,
//      não rotaciona como a service_role) OU == SERVICE_ROLE_KEY (fallback)
//   2) Admin logado: JWT de user com profiles.role in admin/superadmin

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const CRON_SECRET = Deno.env.get('LIMPAR_FOTOS_SECRET') ?? '';
const BUCKET = 'postagens';
const TARGET_BYTES_DEFAULT = Number(Deno.env.get('LIMPAR_TARGET_BYTES') ?? 524288000); // 500 MB
const RETENCAO = '4 hours';
const DELETE_BATCH = 100;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function autorizar(req: Request): Promise<Response | null> {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ erro: 'Authorization ausente' }, 401);

  // Segredo dedicado do cron (preferido) ou service_role (fallback)
  if (CRON_SECRET && token === CRON_SECRET) return null;
  if (token === SERVICE_ROLE) return null;

  // JWT de usuário — valida e checa role admin
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ erro: 'Token inválido' }, 401);
  const { data: profile, error: pErr } = await adminClient
    .from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  if (pErr || !profile || !['admin', 'superadmin'].includes(profile.role)) {
    return json({ erro: 'Apenas admins podem disparar limpeza' }, 403);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });

  const blockedBy = await autorizar(req);
  if (blockedBy) return blockedBy;

  try {
    const body = await req.json().catch(() => ({}));
    const target = Number(body?.target_bytes ?? TARGET_BYTES_DEFAULT);

    // 1) RPC decide o que apagar (vê storage.objects via SECURITY DEFINER)
    const { data: alvos, error: rpcErr } = await adminClient.rpc('fotos_para_limpar', {
      p_target_bytes: target,
      p_retencao: RETENCAO,
    });
    if (rpcErr) throw rpcErr;
    if (!alvos || alvos.length === 0) {
      return json({ removidos: 0, alvos: 0, mensagem: 'Nada a limpar.' });
    }

    // 2) Apaga do Storage em lotes (404 é idempotente, não falha)
    const paths: string[] = alvos.map((a: { path: string }) => a.path);
    const erros: string[] = [];
    let removidos = 0;
    for (let i = 0; i < paths.length; i += DELETE_BATCH) {
      const batch = paths.slice(i, i + DELETE_BATCH);
      const { data: rem, error: rmErr } = await adminClient.storage.from(BUCKET).remove(batch);
      if (rmErr) { console.error('[storage.remove]', rmErr); erros.push(rmErr.message); continue; }
      removidos += rem?.length ?? 0;
    }

    // 3) Marca os posts correspondentes (órfãos têm post_id null → pula)
    const ids: string[] = alvos
      .filter((a: { post_id: string | null }) => a.post_id)
      .map((a: { post_id: string }) => a.post_id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error: upErr } = await adminClient
        .from('posts')
        .update({ foto_liberada: true, foto_url: null })
        .in('id', ids.slice(i, i + 200));
      if (upErr) { console.error('[posts.update]', upErr); erros.push(upErr.message); }
    }

    return json({ alvos: alvos.length, removidos, posts_marcados: ids.length, erros });
  } catch (err) {
    console.error('[limpar-fotos-aprovadas]', err);
    return json({ erro: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
