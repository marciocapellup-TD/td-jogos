import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { CATEGORIAS, previewPontos } from '../lib/scoring';
import { calculaSemanaAtual, metasDaSemana, MAX_PONTOS_DIA_PESSOA, MAX_PONTOS_DIA_GRUPO, motivoNaoPontua } from '../lib/weeks';
import { hojeISO } from '../lib/dates';
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
  const [pontosHoje, setPontosHoje] = useState({ pessoa: 0, grupo: 0, tamanhoGrupo: 0 });

  useEffect(() => {
    if (!profile?.id) return;
    const hoje = hojeISO();

    const recarregar = async () => {
      // Posts da categoria (pra limite diário)
      const { data: postsCat } = await supabase.from('posts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('data_registro', hoje)
        .eq('categoria', categoria);
      setPostsHoje(postsCat || []);

      // Pontos totais hoje — pessoa + grupo
      const { data: meus } = await supabase.from('posts')
        .select('pontos').eq('user_id', profile.id).eq('status', 'approved').eq('data_registro', hoje);
      const pessoa = (meus || []).reduce((a, x) => a + (x.pontos || 0), 0);

      let grupo = 0, tamanho = 0;
      if (profile.group_id) {
        const { data: cohort } = await supabase.from('profiles')
          .select('id').eq('group_id', profile.group_id);
        tamanho = (cohort || []).length;
        if (tamanho > 0) {
          const ids = cohort.map(c => c.id);
          const { data: grpPosts } = await supabase.from('posts')
            .select('pontos').in('user_id', ids).eq('status', 'approved').eq('data_registro', hoje);
          grupo = (grpPosts || []).reduce((a, x) => a + (x.pontos || 0), 0);
        }
      }
      setPontosHoje({ pessoa, grupo, tamanhoGrupo: tamanho });
    };

    recarregar();

    // Realtime: recarrega quando admin aprova, reprova ou exclui post do usuário
    const canal = supabase
      .channel('postar-' + profile.id + '-' + categoria)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: `user_id=eq.${profile.id}`,
      }, () => recarregar())
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [profile?.id, profile?.group_id, categoria]);

  if (!cat) return <div>Categoria inválida.</div>;

  // Apenas posts VALIDOS (pending ou approved) ocupam slot do dia.
  // Rejeitados/deletados nao bloqueiam — usuario pode postar de novo.
  const postsValidos = postsHoje.filter(p => p.status !== 'rejected');
  const frutasHoje = postsValidos.reduce((a, p) => a + (p.quantidade_frutas || 0), 0);
  const jaPostouMovMental = categoria !== 'energia' && postsValidos.length > 0;
  const postsRejeitadosHoje = postsHoje.filter(p => p.status === 'rejected');

  // Permite postar no aquecimento (pré-desafio) — pontos só contam a partir de 20/04.
  // Só bloqueia depois que o desafio encerra.
  const bloqueado = (categoria === 'energia' && frutasHoje + Number(quantidadeFrutas) > 2)
                 || jaPostouMovMental
                 || semana > 3;

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
      data_registro: hojeISO(), // força data local BR em vez de current_date UTC
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

      {semana === 0 && (
        <AlertaBox>
          🔥 <strong>Modo aquecimento</strong> — desafio oficial começa 20/04.
          Você pode postar agora mas os <strong>pontos só contam a partir de segunda</strong>.
        </AlertaBox>
      )}
      {semana > 3 && <AlertaBox>Desafio encerrado em 20/05.</AlertaBox>}

      {semana >= 1 && semana <= 3 && motivoNaoPontua() && (
        <AlertaBox>
          📅 Hoje é <strong>{motivoNaoPontua()}</strong>. Você pode registrar mas <strong>não pontua</strong> — só dias úteis valem.
        </AlertaBox>
      )}

      {postsRejeitadosHoje.length > 0 && !jaPostouMovMental && (
        <div style={{
          background: 'rgba(192,57,43,0.1)',
          border: '1px solid rgba(192,57,43,0.35)',
          borderLeft: '3px solid var(--vermelho)',
          padding: '10px 14px',
          borderRadius: 3,
          marginBottom: 16,
          fontSize: 13,
          color: '#fff',
        }}>
          ⚠️ Você teve um post reprovado hoje.{' '}
          {postsRejeitadosHoje[0].motivo_reprovacao && (
            <span style={{ color: 'var(--branco-70)', fontStyle: 'italic' }}>
              Motivo: "{postsRejeitadosHoje[0].motivo_reprovacao}". {' '}
            </span>
          )}
          <strong>Você pode postar novamente</strong> — ajuste conforme o motivo e tente de novo.
        </div>
      )}

      {/* Celebração: bateu meta pessoal do dia */}
      {pontosHoje.pessoa >= MAX_PONTOS_DIA_PESSOA && (
        <CelebracaoBox tipo="pessoa" pontos={pontosHoje.pessoa} max={MAX_PONTOS_DIA_PESSOA} />
      )}
      {/* Celebração: time bateu meta coletiva do dia (cap 35 igual pra todos) */}
      {pontosHoje.pessoa < MAX_PONTOS_DIA_PESSOA
        && pontosHoje.grupo >= MAX_PONTOS_DIA_GRUPO && (
        <CelebracaoBox
          tipo="grupo"
          pontos={Math.min(pontosHoje.grupo, MAX_PONTOS_DIA_GRUPO)}
          max={MAX_PONTOS_DIA_GRUPO}
          grupoNome={profile?.groups?.nome}
        />
      )}

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

        {!fotoUrl && (
          <div style={{ fontSize: 11, color: 'var(--branco-45)', marginBottom: 8, textAlign: 'center' }}>
            ⬆ Anexe uma foto acima para habilitar o envio
          </div>
        )}

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

function CelebracaoBox({ tipo, pontos, max, grupoNome }) {
  const titulo = tipo === 'pessoa'
    ? '🎉 Meta pessoal do dia batida!'
    : `🎉 Seu time ${grupoNome || ''} bateu a meta do dia!`;
  const mensagem = tipo === 'pessoa'
    ? `Você já somou ${pontos}/${max} pontos hoje — o máximo possível. Pode relaxar, descansar ou só incentivar a galera. Não precisa postar mais nada hoje.`
    : `O time inteiro já somou ${pontos}/${max} pontos hoje — o máximo coletivo. Parabéns time! Pode descansar ou incentivar quem ainda tá postando.`;
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(244,204,4,0.12))',
      border: '1px solid var(--verde)',
      borderLeft: '4px solid var(--verde)',
      padding: '16px 20px',
      borderRadius: 4,
      marginBottom: 18,
    }}>
      <div style={{
        fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700,
        color: 'var(--amarelo)', letterSpacing: 1.5, textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        {titulo}
      </div>
      <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.5 }}>
        {mensagem}
      </div>
    </div>
  );
}
