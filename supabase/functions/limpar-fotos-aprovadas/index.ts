// Edge Function: limpar-fotos-aprovadas
//
// Limpa fotos do Storage bucket `postagens` de posts com:
//   - status = 'approved'
//   - foto_liberada = false
//   - created_at < now() - 4 horas
//   - foto_url começa com 'https://' (pula imputações 'manual://...')
//
// Marca o post com foto_liberada=true e foto_url=null. Mantém pontos/status.
//
// Invocado por:
//   - pg_cron 3x/dia (09:00, 15:00, 21:00 BR)
//   - Botão manual no painel Admin
//
// Auth: precisa Authorization: Bearer <SERVICE_ROLE_KEY> ou <ANON_KEY> com user admin.
// O service role é o que pg_cron usa (via vault).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'postagens';
const RETENCAO_MS = 4 * 60 * 60 * 1000;  // 4 horas
const BATCH_LIMIT = 500;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Extrai o path do bucket a partir da URL pública:
// https://<ref>.supabase.co/storage/v1/object/public/postagens/<user_id>/<file>
// → <user_id>/<file>
const PATH_RE = new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)$`);
function extrairPath(url: string): string | null {
  const m = url.match(PATH_RE);
  return m ? decodeURIComponent(m[1]) : null;
}

Deno.serve(async (req) => {
  // CORS básico pra invoke do front
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const corte = new Date(Date.now() - RETENCAO_MS).toISOString();

    const { data: candidatos, error: qErr } = await supabase
      .from('posts')
      .select('id, foto_url')
      .eq('status', 'approved')
      .eq('foto_liberada', false)
      .lt('created_at', corte)
      .like('foto_url', 'https://%')
      .limit(BATCH_LIMIT);

    if (qErr) throw qErr;
    if (!candidatos || candidatos.length === 0) {
      return json({ removidas: 0, erros: [], mensagem: 'Nada a limpar.' });
    }

    const idsPorPath = new Map<string, string>();
    const pathsValidos: string[] = [];
    const erros: { id: string; razao: string }[] = [];

    for (const p of candidatos) {
      const path = extrairPath(p.foto_url);
      if (!path) {
        erros.push({ id: p.id, razao: `URL fora do padrão: ${p.foto_url}` });
        continue;
      }
      idsPorPath.set(path, p.id);
      pathsValidos.push(path);
    }

    // Remove do Storage (idempotente — 404 não dá erro)
    if (pathsValidos.length > 0) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(pathsValidos);
      if (rmErr) {
        console.error('[storage.remove]', rmErr);
        erros.push({ id: 'storage-remove', razao: rmErr.message });
      }
    }

    const idsParaUpdate = [...idsPorPath.values()];
    if (idsParaUpdate.length > 0) {
      const { error: upErr } = await supabase
        .from('posts')
        .update({ foto_liberada: true, foto_url: null })
        .in('id', idsParaUpdate);

      if (upErr) {
        console.error('[posts.update]', upErr);
        erros.push({ id: 'posts-update', razao: upErr.message });
      }
    }

    return json({
      removidas: idsParaUpdate.length,
      candidatos_total: candidatos.length,
      erros,
    });
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
