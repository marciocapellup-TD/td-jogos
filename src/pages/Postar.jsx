import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { CATEGORIAS, HORARIO_LABEL, CULTURA_LABEL, previewPontos } from '../lib/scoring';
import { hojeISO, horaBR } from '../lib/dates';
import { competicaoEncerrada, entreEtapas } from '../lib/competicao';
import FotoUpload from '../components/FotoUpload';

const HORARIOS = ['manha', 'tarde', 'noite'];

// Etapa 3: metas planas, SEM teto — cada post conta e soma, sem limite diário.
export default function Postar() {
  const { categoria } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const cat = CATEGORIAS[categoria];
  const encerrada = competicaoEncerrada();
  const aindaNaoComecou = entreEtapas();

  // Inputs
  const [quantidadeFrutas, setQuantidadeFrutas] = useState('1'); // só p/ energia (frutas)
  const [horario, setHorario] = useState('manha');               // só p/ hidratacao (referência)
  const [tipoCultura, setTipoCultura] = useState(null);          // só p/ cultura
  const [minutosInput, setMinutosInput] = useState('');
  const [segundosInput, setSegundosInput] = useState('');
  const [fotoUrl, setFotoUrl] = useState(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [postsHoje, setPostsHoje] = useState([]);

  // Posts de hoje dessa categoria — usados só pro aviso de reprovados (sem limites na E3).
  useEffect(() => {
    if (!profile?.id) return;
    const hoje = hojeISO();
    const recarregar = async () => {
      const { data } = await supabase.from('posts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('data_registro', hoje)
        .eq('categoria', categoria);
      setPostsHoje(data || []);
    };
    recarregar();
    const canal = supabase
      .channel('postar-' + profile.id + '-' + categoria)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'posts',
        filter: `user_id=eq.${profile.id}`,
      }, () => recarregar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [profile?.id, categoria]);

  // Sugere o horário de hidratação pela hora de Brasília (só default — sem trava).
  useEffect(() => {
    if (categoria !== 'hidratacao') return;
    const h = horaBR();
    setHorario(h <= 11 ? 'manha' : h <= 17 ? 'tarde' : 'noite');
  }, [categoria]);

  if (!cat) return <div>Categoria inválida.</div>;

  const postsRejeitadosHoje = postsHoje.filter(p => p.status === 'rejected');

  const bloqueado = encerrada || aindaNaoComecou;

  const minParsed = Math.max(0, Math.min(999, Number(minutosInput) || 0));
  const segParsed = Math.max(0, Math.min(59, Number(segundosInput) || 0));
  const duracaoValida = (minutosInput !== '' || segundosInput !== '') && (minParsed > 0 || segParsed > 0);

  const pontosPreview = previewPontos(categoria, {
    minutos: minParsed,
    segundos: segParsed,
    quantidade_frutas: Number(quantidadeFrutas) || 0,
    tipo_alimento: 'fruta',
    data: hojeISO(),
  });

  const enviar = async (e) => {
    e.preventDefault();
    setErro(null);
    if (!fotoUrl) { setErro('Envie a foto antes de postar.'); return; }
    if ((categoria === 'movimento' || categoria === 'mental') && !duracaoValida) {
      setErro('Informe a duração (minutos e/ou segundos).'); return;
    }
    if (categoria === 'cultura' && !tipoCultura) {
      setErro('Escolha a atividade cultural.'); return;
    }
    if (categoria === 'energia' && (Number(quantidadeFrutas) || 0) < 1) {
      setErro('Informe quantas frutas (mínimo 1).'); return;
    }

    setEnviando(true);
    const comentarioLimpo = comentario.trim().slice(0, 500);
    let extras = {};
    if (categoria === 'energia')          extras = { tipo_alimento: 'fruta', quantidade_frutas: Number(quantidadeFrutas) };
    else if (categoria === 'salada')      extras = {};
    else if (categoria === 'hidratacao')  extras = { horario };
    else if (categoria === 'cultura')     extras = { tipo_cultura: tipoCultura };
    else                                  extras = { minutos: minParsed, segundos: segParsed };

    const payload = {
      user_id: profile.id,
      categoria,
      foto_url: fotoUrl,
      status: 'pending',
      data_registro: hojeISO(),
      comentario: comentarioLimpo || null,
      ...extras,
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

      {aindaNaoComecou && (
        <AlertaBox>
          🔥 <strong>Etapa 3 começa em 22/06.</strong> Você pode preparar tudo, mas os registros só abrem na data.
        </AlertaBox>
      )}
      {encerrada && (
        <AlertaBox>
          <strong>Etapa 3 encerrada em 21/07.</strong> Os registros estão pausados — valeu pela constância nesses 30 dias!
        </AlertaBox>
      )}

      {postsRejeitadosHoje.length > 0 && (
        <div style={{
          background: 'rgba(192,57,43,0.1)',
          border: '1px solid rgba(192,57,43,0.35)',
          borderLeft: '3px solid var(--vermelho)',
          padding: '10px 14px', borderRadius: 3, marginBottom: 16, fontSize: 13, color: '#fff',
        }}>
          ⚠️ Você teve {postsRejeitadosHoje.length === 1 ? 'um post reprovado' : `${postsRejeitadosHoje.length} posts reprovados`} hoje nessa categoria.
          {postsRejeitadosHoje[0].motivo_reprovacao && (
            <span style={{ color: 'var(--branco-70)', fontStyle: 'italic' }}>
              {' '}Motivo do último: "{postsRejeitadosHoje[0].motivo_reprovacao}".
            </span>
          )}
          {' '}<strong>Você pode postar novamente</strong> — ajuste conforme o motivo.
        </div>
      )}

      <form onSubmit={enviar} className="card">
        {/* ENERGIA: frutas (1 pt cada, sem limite) */}
        {categoria === 'energia' && (
          <div className="form-group">
            <label>Quantas frutas você comeu agora?</label>
            <input
              className="input" type="number" inputMode="numeric" min="1" max="99"
              value={quantidadeFrutas}
              onChange={e => setQuantidadeFrutas(e.target.value.replace(/[^\d]/g, ''))}
              style={{ textAlign: 'center', fontSize: 20, fontFamily: 'Rajdhani', fontWeight: 700, maxWidth: 120 }}
            />
            <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6 }}>
              1 ponto por fruta, sem limite. Meta mínima do dia: 3 frutas.
            </div>
          </div>
        )}

        {/* SALADA: só foto */}
        {categoria === 'salada' && (
          <div style={{ fontSize: 12, color: 'var(--branco-70)', marginBottom: 12 }}>
            🥗 Foto do prato com salada/vegetal (almoço ou janta). <strong style={{ color: 'var(--amarelo)' }}>+1 ponto</strong> por refeição, sem limite. Meta mínima: 2/dia.
          </div>
        )}

        {/* HIDRATACAO: horário só como referência, sem trava */}
        {categoria === 'hidratacao' && (
          <div className="form-group">
            <label>Qual horário? (referência)</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {HORARIOS.map(h => (
                <button
                  type="button" key={h}
                  onClick={() => setHorario(h)}
                  className={`btn ${horario === h ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1 }}
                >
                  {HORARIO_LABEL[h].emoji} {HORARIO_LABEL[h].label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6 }}>
              1 ponto por registro · registre quantas vezes quiser ao longo do dia. Meta mínima: 3 (manhã, tarde e noite).
            </div>
          </div>
        )}

        {/* CULTURA: escolher a atividade */}
        {categoria === 'cultura' && (
          <div className="form-group">
            <label>Qual atividade cultural?</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(CULTURA_LABEL).map(([k, v]) => (
                <button
                  type="button" key={k}
                  onClick={() => setTipoCultura(k)}
                  className={`btn ${tipoCultura === k ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: '1 1 40%' }}
                >
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6 }}>
              3 pontos por atividade, sem limite. Faça mais de uma e pontue mais.
            </div>
          </div>
        )}

        {/* MOVIMENTO / MENTAL */}
        {(categoria === 'movimento' || categoria === 'mental') && (
          <div className="form-group">
            <label>
              Duração registrada no app
              <span style={{ fontSize: 10, color: 'var(--branco-45)', marginLeft: 8, letterSpacing: 0 }}>
                ({categoria === 'movimento' ? '5 pts a cada 50 min' : '4 pts a cada 10 min'})
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <input
                  className="input"
                  type="number" inputMode="numeric" min="0" max="999"
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
                  type="number" inputMode="numeric" min="0" max="59"
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
            <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6 }}>
              Sem teto: cada bloco completo soma de novo (ex: 100 min de movimento = 10 pts).
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Foto comprovando</label>
          <FotoUpload
            userId={profile.id}
            onUploaded={setFotoUrl}
            somenteCamera={['energia', 'salada', 'hidratacao'].includes(categoria)}
          />
          <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6 }}>{cat.dica}</div>
        </div>

        <div className="form-group">
          <label>
            Comentário
            <span style={{ fontSize: 10, color: 'var(--branco-45)', marginLeft: 8, letterSpacing: 0 }}>
              (opcional · até 500 caracteres)
            </span>
          </label>
          <textarea
            className="input" rows={3} maxLength={500}
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Conta um pouco como foi (qual fruta, que treino, qual livro/podcast...)"
          />
          <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 4, textAlign: 'right' }}>
            {comentario.length}/500
          </div>
        </div>

        <div style={{
          background: 'var(--amarelo-soft)',
          borderLeft: '3px solid var(--amarelo)',
          padding: '10px 14px', margin: '14px 0',
          fontFamily: 'Rajdhani', fontSize: 13, letterSpacing: 1,
        }}>
          Se aprovado, você ganha <strong style={{ color: 'var(--amarelo)', fontSize: 18 }}>+{pontosPreview} pt</strong>
          {pontosPreview === 0 && (categoria === 'movimento' || categoria === 'mental') && duracaoValida && (
            <div style={{ fontSize: 11, color: 'var(--vermelho)', letterSpacing: 0, marginTop: 4 }}>
              (abaixo de {categoria === 'movimento' ? '50 min' : '10 min'} — ainda sem pontos; cada bloco completo pontua)
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
            type="submit" className="btn btn-primary" style={{ flex: 1 }}
            disabled={enviando || bloqueado || !fotoUrl}
          >
            {encerrada ? 'Etapa 3 encerrada'
              : aindaNaoComecou ? 'Aguarde 22/06'
              : enviando ? 'Enviando...'
              : 'Enviar para aprovação'}
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
      padding: '10px 14px', borderRadius: 3, marginBottom: 16, fontSize: 13,
    }}>{children}</div>
  );
}
