import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { CATEGORIAS, previewPontos } from '../lib/scoring';
import { calculaSemanaAtual, metasDaSemana } from '../lib/weeks';
import FotoUpload from '../components/FotoUpload';

export default function Postar() {
  const { categoria } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const cat = CATEGORIAS[categoria];
  const semana = calculaSemanaAtual();
  const metas = metasDaSemana(semana);

  const [quantidadeFrutas, setQuantidadeFrutas] = useState(1);
  const [minutos, setMinutos] = useState('');
  const [fotoUrl, setFotoUrl] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [postsHoje, setPostsHoje] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;
    const hoje = new Date().toISOString().slice(0, 10);
    supabase.from('posts')
      .select('*')
      .eq('user_id', profile.id)
      .eq('data_registro', hoje)
      .eq('categoria', categoria)
      .then(({ data }) => setPostsHoje(data || []));
  }, [profile?.id, categoria]);

  if (!cat) return <div>Categoria inválida.</div>;

  const frutasHoje = postsHoje.reduce((a, p) => a + (p.quantidade_frutas || 0), 0);
  const jaPostouMovMental = categoria !== 'energia' && postsHoje.length > 0;
  const bloqueado = (categoria === 'energia' && frutasHoje + Number(quantidadeFrutas) > 2)
                 || jaPostouMovMental
                 || semana === 0 || semana > 3;

  const pontosPreview = previewPontos(categoria, {
    minutos: Number(minutos) || 0,
    quantidade_frutas: Number(quantidadeFrutas) || 0,
  });

  const enviar = async (e) => {
    e.preventDefault();
    setErro(null);
    if (!fotoUrl) { setErro('Envie a foto antes de postar.'); return; }
    if (categoria !== 'energia' && (!minutos || Number(minutos) < 1)) {
      setErro('Informe os minutos.');
      return;
    }

    setEnviando(true);
    const payload = {
      user_id: profile.id,
      categoria,
      foto_url: fotoUrl,
      status: 'pending',
      ...(categoria === 'energia'
        ? { quantidade_frutas: Number(quantidadeFrutas) }
        : { minutos: Number(minutos) }),
    };
    const { error } = await supabase.from('posts').insert(payload);
    setEnviando(false);

    if (error) { setErro(error.message); return; }
    navigate('/meus-posts');
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="label" style={{ color: cat.cor }}>{cat.emoji} {cat.label}</div>
      <h1 style={{ marginBottom: 18 }}>Novo registro</h1>

      {semana === 0 && <AlertaBox>Desafio ainda não começou (inicia 20/04).</AlertaBox>}
      {semana > 3 && <AlertaBox>Desafio encerrado em 10/05.</AlertaBox>}

      <form onSubmit={enviar} className="card">
        {categoria === 'energia' && (
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
            <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6 }}>
              Hoje você já registrou {frutasHoje} fruta(s). Máximo: 2/dia.
            </div>
          </div>
        )}

        {categoria !== 'energia' && (
          <div className="form-group">
            <label>Minutos registrados no app</label>
            <input
              className="input"
              type="number"
              min="1"
              max="999"
              value={minutos}
              onChange={e => setMinutos(e.target.value)}
              placeholder={`Meta da semana ${semana || '?'}: ${categoria === 'movimento' ? metas?.movimento.minutos : metas?.mental.minutos} min`}
            />
            {jaPostouMovMental && (
              <div style={{ fontSize: 11, color: 'var(--vermelho)', marginTop: 6 }}>
                Você já registrou {cat.label.toLowerCase()} hoje.
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label>Foto comprovando</label>
          <FotoUpload userId={profile.id} onUploaded={setFotoUrl} />
          <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6 }}>{cat.dica}</div>
        </div>

        <div style={{
          background: 'var(--amarelo-soft)',
          borderLeft: '3px solid var(--amarelo)',
          padding: '10px 14px',
          margin: '14px 0',
          fontFamily: 'Rajdhani', fontSize: 13, letterSpacing: 1,
        }}>
          Se aprovado, você ganha <strong style={{ color: 'var(--amarelo)', fontSize: 18 }}>+{pontosPreview} pt</strong>
          {pontosPreview === 0 && categoria !== 'energia' && minutos && (
            <div style={{ fontSize: 11, color: 'var(--vermelho)', letterSpacing: 0, marginTop: 4 }}>
              (abaixo da meta da semana — sem pontos, mas pode postar assim mesmo)
            </div>
          )}
        </div>

        {erro && <div style={{ color: 'var(--vermelho)', marginBottom: 10, fontSize: 12 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>Cancelar</button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={enviando || bloqueado || !fotoUrl}
          >
            {enviando ? 'Enviando...' : 'Enviar para aprovação'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AlertaBox({ children }) {
  return (
    <div style={{
      background: 'rgba(244,204,4,0.08)',
      border: '1px solid rgba(244,204,4,0.3)',
      borderLeft: '3px solid var(--amarelo)',
      padding: '10px 14px',
      borderRadius: 3,
      marginBottom: 16,
      fontSize: 13,
    }}>{children}</div>
  );
}
