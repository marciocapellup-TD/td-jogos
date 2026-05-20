import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { CATEGORIAS, HORARIO_LABEL, TIPO_ALIMENTO_LABEL, previewPontos } from '../lib/scoring';
import { calculaSemanaAtual, metasDaSemana, MAX_PONTOS_DIA_PESSOA } from '../lib/weeks';
import { hojeISO } from '../lib/dates';
import { competicaoEncerrada, entreEtapas, statusEtapa } from '../lib/competicao';
import FotoUpload from '../components/FotoUpload';

const HORARIOS = ['manha', 'tarde', 'noite'];

export default function Postar() {
  const { categoria } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const cat = CATEGORIAS[categoria];
  const semana = calculaSemanaAtual();
  const metas = metasDaSemana(semana);
  const etapa = statusEtapa();
  const encerrada = competicaoEncerrada();
  const aindaNaoComecou = entreEtapas() || etapa === 'etapa1';

  // Inputs
  const [tipoAlimento, setTipoAlimento] = useState('fruta'); // só p/ energia
  const [quantidadeFrutas, setQuantidadeFrutas] = useState(1);
  const [horario, setHorario] = useState('manha'); // só p/ hidratacao
  const [minutosInput, setMinutosInput] = useState('');
  const [segundosInput, setSegundosInput] = useState('');
  const [fotoUrl, setFotoUrl] = useState(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [postsHoje, setPostsHoje] = useState([]);
  const [pontosPessoaHoje, setPontosPessoaHoje] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    const hoje = hojeISO();

    const recarregar = async () => {
      const { data: postsCat } = await supabase.from('posts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('data_registro', hoje)
        .eq('categoria', categoria);
      setPostsHoje(postsCat || []);

      const { data: meus } = await supabase.from('posts')
        .select('pontos')
        .eq('user_id', profile.id)
        .eq('status', 'approved')
        .eq('data_registro', hoje);
      setPontosPessoaHoje((meus || []).reduce((a, x) => a + (x.pontos || 0), 0));
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

  // Clamp quantidadeFrutas quando o restante diminui (ex: depois de aprovar 1 fruta,
  // o seletor padrão de 2 frutas precisa cair pra 1).
  useEffect(() => {
    if (categoria !== 'energia') return;
    const valida = postsHoje.filter(p => p.status !== 'rejected');
    const somaFrutas = valida
      .filter(p => p.tipo_alimento === 'fruta')
      .reduce((acc, p) => acc + (p.quantidade_frutas || 0), 0);
    const restantes = Math.max(0, 2 - somaFrutas);
    if (restantes > 0 && quantidadeFrutas > restantes) {
      setQuantidadeFrutas(restantes);
    }
  }, [postsHoje, categoria, quantidadeFrutas]);

  // Default do horário de hidratacao baseado na hora local do navegador.
  // Ex: às 14h, o padrão é "tarde" (não "manha"). Só ajusta no mount/troca de categoria.
  useEffect(() => {
    if (categoria !== 'hidratacao') return;
    const h = new Date().getHours();
    const sugerido = h <= 11 ? 'manha' : h <= 17 ? 'tarde' : 'noite';
    setHorario(sugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria]);

  if (!cat) return <div>Categoria inválida.</div>;

  // Posts válidos do dia (não rejeitados) — ocupam slot.
  const postsValidos = postsHoje.filter(p => p.status !== 'rejected');
  const postsRejeitadosHoje = postsHoje.filter(p => p.status === 'rejected');

  // Tipo-alimento já registrado hoje
  // Frutas: até 2 posts/dia somando max 2 frutas. Vegetal: 1/dia.
  const frutasJaPostadas = categoria === 'energia'
    ? postsValidos
        .filter(p => p.tipo_alimento === 'fruta')
        .reduce((acc, p) => acc + (p.quantidade_frutas || 0), 0)
    : 0;
  const frutasRestantes = Math.max(0, 2 - frutasJaPostadas);
  const jaTemFrutas  = categoria === 'energia' && frutasRestantes === 0;
  const jaTemVegetal = categoria === 'energia' && postsValidos.some(p => p.tipo_alimento === 'vegetal');
  const horariosUsados = categoria === 'hidratacao'
    ? new Set(postsValidos.map(p => p.horario))
    : new Set();
  const jaPostouMovMental = (categoria === 'movimento' || categoria === 'mental') && postsValidos.length > 0;

  // Janela de horário para hidratacao baseada na hora LOCAL do navegador do usuário.
  // Espelha a validação SQL em enforce_daily_limits (que usa profiles.timezone).
  // Manhã: 00-11, Tarde: 12-17, Noite: 18-23.
  const horaLocalAtual = new Date().getHours();
  const horarioPermitido = {
    manha: horaLocalAtual >= 0 && horaLocalAtual <= 11,
    tarde: horaLocalAtual >= 12 && horaLocalAtual <= 17,
    noite: horaLocalAtual >= 18 && horaLocalAtual <= 23,
  };

  // Bloqueios para o slot atual
  const bloqueioEnergia = categoria === 'energia' && (
    (tipoAlimento === 'fruta'   && Number(quantidadeFrutas) > frutasRestantes) ||
    (tipoAlimento === 'vegetal' && jaTemVegetal)
  );
  const bloqueioHidratacao = categoria === 'hidratacao' && (
    horariosUsados.has(horario) || !horarioPermitido[horario]
  );
  const bloqueado = encerrada || aindaNaoComecou || bloqueioEnergia || bloqueioHidratacao || jaPostouMovMental;

  const minParsed = Math.max(0, Math.min(999, Number(minutosInput) || 0));
  const segParsed = Math.max(0, Math.min(59, Number(segundosInput) || 0));
  const duracaoValida = (minutosInput !== '' || segundosInput !== '') && (minParsed > 0 || segParsed > 0);

  // Usa hojeISO (string YYYY-MM-DD) pra garantir consistência com o mock de data,
  // em vez do new Date() que reflete data real do sistema.
  const pontosPreview = previewPontos(categoria, {
    minutos: minParsed,
    segundos: segParsed,
    quantidade_frutas: Number(quantidadeFrutas) || 0,
    tipo_alimento: tipoAlimento,
    data: hojeISO(),
  });

  const enviar = async (e) => {
    e.preventDefault();
    setErro(null);
    if (!fotoUrl) { setErro('Envie a foto antes de postar.'); return; }
    if (categoria === 'movimento' || categoria === 'mental') {
      if (!duracaoValida) { setErro('Informe a duração (minutos e/ou segundos).'); return; }
    }

    setEnviando(true);
    const comentarioLimpo = comentario.trim().slice(0, 500);
    let extras = {};
    if (categoria === 'energia') {
      extras = tipoAlimento === 'fruta'
        ? { tipo_alimento: 'fruta', quantidade_frutas: Number(quantidadeFrutas) }
        : { tipo_alimento: 'vegetal' };
    } else if (categoria === 'hidratacao') {
      extras = { horario };
    } else {
      extras = { minutos: minParsed, segundos: segParsed };
    }
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

  // ----- Render -----
  const bateuMetaPessoal = pontosPessoaHoje >= MAX_PONTOS_DIA_PESSOA;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="label" style={{ color: cat.cor }}>{cat.emoji} {cat.label}</div>
      <h1 style={{ marginBottom: 18 }}>Novo registro</h1>

      {aindaNaoComecou && (
        <AlertaBox>
          🔥 <strong>Etapa 2 começa em 18/05.</strong> Você pode preparar tudo, mas os registros só abrem na data.
        </AlertaBox>
      )}
      {encerrada && (
        <AlertaBox>
          <strong>Competição encerrada em 07/06.</strong> Os registros estão pausados — em breve a gente solta as próximas metas. Valeu pela dedicação!
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

      {bateuMetaPessoal ? (
        <>
          <CelebracaoBox pontos={pontosPessoaHoje} max={MAX_PONTOS_DIA_PESSOA} />
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>
              Voltar pra home
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={enviar} className="card">
          {/* ENERGIA: fruta vs vegetal */}
          {categoria === 'energia' && (
            <div className="form-group">
              <label>O que você está registrando?</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {['fruta', 'vegetal'].map(t => {
                  const ativo = tipoAlimento === t;
                  const ocupado = (t === 'fruta' && jaTemFrutas) || (t === 'vegetal' && jaTemVegetal);
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setTipoAlimento(t)}
                      className={`btn ${ativo ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1, opacity: ocupado ? 0.5 : 1 }}
                      title={ocupado ? 'Já registrado hoje' : ''}
                    >
                      {TIPO_ALIMENTO_LABEL[t].emoji} {TIPO_ALIMENTO_LABEL[t].label}
                      {ocupado && ' ✓'}
                    </button>
                  );
                })}
              </div>

              {tipoAlimento === 'fruta' && frutasRestantes === 0 && (
                <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>
                  Você já registrou 2 frutas hoje. Pode postar vegetal/salada se ainda não tiver.
                </div>
              )}

              {tipoAlimento === 'fruta' && frutasRestantes > 0 && (
                <>
                  <label>Quantas frutas você comeu agora?</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[1, 2].map(n => {
                      const desabilitada = n > frutasRestantes;
                      return (
                        <button
                          type="button"
                          key={n}
                          onClick={() => !desabilitada && setQuantidadeFrutas(n)}
                          disabled={desabilitada}
                          className={`btn ${quantidadeFrutas === n ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ flex: 1, opacity: desabilitada ? 0.35 : 1, cursor: desabilitada ? 'not-allowed' : 'pointer' }}
                          title={desabilitada ? `Só sobra ${frutasRestantes} fruta no dia` : ''}
                        >
                          🍎 {n} fruta{n > 1 ? 's' : ''}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6 }}>
                    {frutasJaPostadas > 0
                      ? <>Hoje você já registrou <strong>{frutasJaPostadas} fruta{frutasJaPostadas > 1 ? 's' : ''}</strong>. Pode postar mais <strong>{frutasRestantes}</strong>.</>
                      : <>+1 pt por fruta · até 2/dia (em 1 ou 2 posts)</>}
                  </div>
                </>
              )}
              {tipoAlimento === 'vegetal' && (
                <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>
                  🥗 Vegetal ou salada no almoço/janta · <strong style={{ color: 'var(--amarelo)' }}>+1 pt</strong>
                </div>
              )}
            </div>
          )}

          {/* HIDRATACAO: horario manha/tarde/noite */}
          {categoria === 'hidratacao' && (
            <div className="form-group">
              <label>Qual horário?</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {HORARIOS.map(h => {
                  const ativo = horario === h;
                  const ocupado = horariosUsados.has(h);
                  const foraJanela = !horarioPermitido[h];
                  const desabilitado = ocupado || foraJanela;
                  const motivo = ocupado
                    ? 'Já registrado hoje'
                    : foraJanela
                      ? `${HORARIO_LABEL[h].label}: fora da janela do horário atual`
                      : '';
                  return (
                    <button
                      type="button"
                      key={h}
                      onClick={() => !desabilitado && setHorario(h)}
                      disabled={desabilitado}
                      className={`btn ${ativo ? 'btn-primary' : 'btn-ghost'}`}
                      style={{
                        flex: 1,
                        opacity: desabilitado ? 0.4 : 1,
                        cursor: desabilitado ? 'not-allowed' : 'pointer',
                      }}
                      title={motivo}
                    >
                      {HORARIO_LABEL[h].emoji} {HORARIO_LABEL[h].label}
                      {ocupado && ' ✓'}
                      {!ocupado && foraJanela && ' 🕒'}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 6 }}>
                +1 pt por horário · Manhã 00h-12h · Tarde 12h-18h · Noite 18h-00h (seu fuso)
              </div>
            </div>
          )}

          {/* MOVIMENTO / MENTAL */}
          {(categoria === 'movimento' || categoria === 'mental') && (
            <div className="form-group">
              <label>
                Duração registrada no app
                <span style={{ fontSize: 10, color: 'var(--branco-45)', marginLeft: 8, letterSpacing: 0 }}>
                  (meta semana {semana || '?'}: {categoria === 'movimento' ? metas?.movimento.minutos : metas?.mental.minutos} min)
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
              {jaPostouMovMental && (
                <div style={{ fontSize: 11, color: 'var(--vermelho)', marginTop: 8 }}>
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
              placeholder="Conta um pouco como foi (qual fruta, que treino, onde meditou...)"
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
              type="submit" className="btn btn-primary" style={{ flex: 1 }}
              disabled={enviando || bloqueado || !fotoUrl}
            >
              {encerrada ? 'Competição encerrada'
                : aindaNaoComecou ? 'Aguarde 18/05'
                : enviando ? 'Enviando...'
                : 'Enviar para aprovação'}
            </button>
          </div>
        </form>
      )}
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

function CelebracaoBox({ pontos, max }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(244,204,4,0.12))',
      border: '1px solid var(--verde)',
      borderLeft: '4px solid var(--verde)',
      padding: '16px 20px', borderRadius: 4, marginBottom: 18,
    }}>
      <div style={{
        fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700,
        color: 'var(--amarelo)', letterSpacing: 1.5, textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        🎉 Você já bateu sua meta do dia!
      </div>
      <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.5 }}>
        Você somou {pontos}/{max} pontos hoje — o máximo possível. Pode relaxar, descansar ou só incentivar a galera. Não precisa postar mais nada hoje.
      </div>
    </div>
  );
}
