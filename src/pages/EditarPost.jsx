import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { CATEGORIAS, previewPontos } from '../lib/scoring';
import { calculaSemanaAtual, metasDaSemana } from '../lib/weeks';
import { formatarDataBR } from '../lib/dates';
import FotoUpload from '../components/FotoUpload';

export default function EditarPost() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Campos editáveis
  const [quantidadeFrutas, setQuantidadeFrutas] = useState(1);
  const [minutosInput, setMinutosInput] = useState('');
  const [segundosInput, setSegundosInput] = useState('');
  const [novaFotoUrl, setNovaFotoUrl] = useState(null); // se trocou, vem URL da nova
  const [pathFotoAntiga, setPathFotoAntiga] = useState(null);

  // Carrega o post
  useEffect(() => {
    if (!postId || !profile?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(nome_exibicao, group_id)')
        .eq('id', postId)
        .maybeSingle();

      if (error || !data) {
        setErro('Post não encontrado.');
        setLoading(false);
        return;
      }

      // Permissão: dono OU admin
      const ehDono = data.user_id === profile.id;
      if (!ehDono && !isAdmin) {
        setErro('Você não tem permissão pra editar este post.');
        setLoading(false);
        return;
      }

      // Não permite editar rejected
      if (data.status === 'rejected') {
        setErro('Posts reprovados não podem ser editados — crie um novo.');
        setLoading(false);
        return;
      }

      setPost(data);
      setQuantidadeFrutas(data.quantidade_frutas || 1);
      setMinutosInput(String(data.minutos ?? ''));
      setSegundosInput(String(data.segundos ?? ''));
      setPathFotoAntiga(extractStoragePath(data.foto_url));
      setLoading(false);
    })();
  }, [postId, profile?.id, isAdmin]);

  if (loading) return <div style={{ padding: 20, color: 'var(--branco-45)' }}>Carregando...</div>;

  if (erro && !post) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="card" style={{ borderTopColor: 'var(--vermelho)', textAlign: 'center' }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🚫</div>
          <div style={{ color: '#fff', fontSize: 14 }}>{erro}</div>
          <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const cat = CATEGORIAS[post.categoria];
  const semanaPost = calculaSemanaAtual(new Date(post.data_registro + 'T12:00:00')); // semana baseada na data do post
  const metas = metasDaSemana(semanaPost);

  const minParsed = Math.max(0, Math.min(999, Number(minutosInput) || 0));
  const segParsed = Math.max(0, Math.min(59, Number(segundosInput) || 0));
  const duracaoValida = (minParsed > 0 || segParsed > 0);

  // Detecta se algo mudou
  const houveTroca =
    novaFotoUrl !== null
    || (post.categoria === 'energia' && Number(quantidadeFrutas) !== post.quantidade_frutas)
    || (post.categoria !== 'energia' && (minParsed !== (post.minutos || 0) || segParsed !== (post.segundos || 0)));

  const pontosPreview = previewPontos(post.categoria, {
    minutos: minParsed,
    segundos: segParsed,
    quantidade_frutas: Number(quantidadeFrutas) || 0,
    data: new Date(post.data_registro + 'T12:00:00'),
  });

  const salvar = async (e) => {
    e.preventDefault();
    setErro(null);
    if (!houveTroca) { setErro('Nenhuma alteração detectada.'); return; }
    if (post.categoria !== 'energia' && !duracaoValida) {
      setErro('Informe a duração (minutos e/ou segundos).');
      return;
    }

    setSalvando(true);

    const updates = {};
    if (post.categoria === 'energia') {
      updates.quantidade_frutas = Number(quantidadeFrutas);
    } else {
      updates.minutos = minParsed;
      updates.segundos = segParsed;
    }
    if (novaFotoUrl) {
      updates.foto_url = novaFotoUrl;
      // Pra evitar bloqueio se tinha sido "liberada"
      updates.foto_liberada = false;
    }

    const { error } = await supabase.from('posts').update(updates).eq('id', post.id);

    if (error) {
      setSalvando(false);
      setErro(error.message);
      return;
    }

    // Apaga foto antiga do Storage (só se trocou)
    if (novaFotoUrl && pathFotoAntiga) {
      await supabase.storage.from('postagens').remove([pathFotoAntiga]);
    }

    setSalvando(false);
    // Volta pra origem (admin ou meus-posts)
    if (isAdmin && !isOwn(post, profile)) navigate('/admin');
    else navigate('/meus-posts');
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="label" style={{ color: cat.cor }}>{cat.emoji} {cat.label}</div>
      <h1 style={{ marginBottom: 18 }}>Editar registro</h1>

      {/* Banner readonly */}
      <div style={{
        background: 'rgba(244,204,4,0.08)',
        border: '1px solid rgba(244,204,4,0.3)',
        borderLeft: '3px solid var(--amarelo)',
        padding: '10px 14px',
        borderRadius: 3,
        marginBottom: 16,
        fontSize: 13,
        color: '#fff',
      }}>
        ⚠️ Editando post de <strong>{formatarDataBR(post.data_registro)}</strong>
        {post.profiles?.nome_exibicao && isAdmin && post.user_id !== profile.id && (
          <> · <strong>{post.profiles.nome_exibicao}</strong></>
        )}
        <div style={{ fontSize: 11, color: 'var(--branco-70)', marginTop: 4 }}>
          Categoria e data não podem ser alteradas. Pra mudar isso, exclua e crie novo post.
        </div>
      </div>

      {post.status === 'approved' && (
        <div style={{
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.4)',
          borderLeft: '3px solid var(--azul-grupo)',
          padding: '10px 14px',
          borderRadius: 3,
          marginBottom: 16,
          fontSize: 12,
          color: '#fff',
        }}>
          ℹ️ Este post está <strong>aprovado</strong>. Editar recalcula os pontos automaticamente.
        </div>
      )}

      <form onSubmit={salvar} className="card">
        {post.categoria === 'energia' && (
          <div className="form-group">
            <label>Quantas frutas você comeu?</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[1, 2].map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setQuantidadeFrutas(n)}
                  className={`btn ${quantidadeFrutas === n ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1 }}
                >
                  🍎 {n} fruta{n > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {post.categoria !== 'energia' && (
          <div className="form-group">
            <label>
              Duração registrada no app
              <span style={{ fontSize: 10, color: 'var(--branco-45)', marginLeft: 8, letterSpacing: 0 }}>
                (meta semana {semanaPost || '?'}: {post.categoria === 'movimento' ? metas?.movimento.minutos : metas?.mental.minutos} min)
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="999"
                  value={minutosInput}
                  onChange={e => setMinutosInput(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="minutos"
                  style={{ textAlign: 'center', fontSize: 18, fontFamily: 'Rajdhani', fontWeight: 700 }}
                />
                <div style={{ fontSize: 10, color: 'var(--branco-45)', marginTop: 4, textAlign: 'center', letterSpacing: 1 }}>
                  MINUTOS
                </div>
              </div>
              <div>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  value={segundosInput}
                  onChange={e => setSegundosInput(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="0"
                  style={{ textAlign: 'center', fontSize: 18, fontFamily: 'Rajdhani', fontWeight: 700 }}
                />
                <div style={{ fontSize: 10, color: 'var(--branco-45)', marginTop: 4, textAlign: 'center', letterSpacing: 1 }}>
                  SEGUNDOS (opcional)
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Foto comprovando</label>
          <FotoUpload
            userId={post.user_id}
            urlAtual={post.foto_url}
            onUploaded={setNovaFotoUrl}
          />
          <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6 }}>
            {cat.dica} · Trocar a foto apaga a antiga.
          </div>
        </div>

        <div style={{
          background: 'var(--amarelo-soft)',
          borderLeft: '3px solid var(--amarelo)',
          padding: '10px 14px',
          margin: '14px 0',
          fontFamily: 'Rajdhani', fontSize: 13, letterSpacing: 1,
        }}>
          {post.status === 'approved' ? 'Após salvar' : 'Se aprovado'}, vale <strong style={{ color: 'var(--amarelo)', fontSize: 18 }}>+{pontosPreview} pt</strong>
          {pontosPreview === 0 && post.categoria !== 'energia' && (minParsed > 0 || segParsed > 0) && (
            <div style={{ fontSize: 11, color: 'var(--vermelho)', letterSpacing: 0, marginTop: 4 }}>
              (abaixo da meta da semana — sem pontos)
            </div>
          )}
        </div>

        {erro && <div style={{ color: 'var(--vermelho)', marginBottom: 10, fontSize: 12 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancelar</button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={salvando || !houveTroca}
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Helpers
function extractStoragePath(url) {
  if (!url) return null;
  const m = String(url).match(/\/storage\/v1\/object\/public\/postagens\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function isOwn(post, profile) {
  return post && profile && post.user_id === profile.id;
}
