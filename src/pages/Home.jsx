import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, fetchAllApprovedPosts } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { diasRestantes, diasDecorridos } from '../lib/weeks';
import { CATEGORIAS } from '../lib/scoring';
import { competicaoEncerrada, entreEtapas, DATA_INICIO_ETAPA3, DATA_FIM_ETAPA3 } from '../lib/competicao';
import StatCard from '../components/StatCard';
import RankingBar from '../components/RankingBar';

// Ordena ranking: pontos desc; empate → quem postou primeiro (menor created_at do último post).
function ordenarRanking(a, b) {
  if (b.pontos !== a.pontos) return b.pontos - a.pontos;
  if (!a.ultimoPostAt && !b.ultimoPostAt) return 0;
  if (!a.ultimoPostAt) return 1;
  if (!b.ultimoPostAt) return -1;
  return a.ultimoPostAt < b.ultimoPostAt ? -1 : 1;
}

// Paleta para barras do ranking individual (cíclica).
const PALETA = ['#F4CC04', '#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#EC4899', '#06B6D4', '#84CC16'];

export default function Home() {
  const { profile } = useAuth();
  const encerrada = competicaoEncerrada();
  const aindaNaoComecou = entreEtapas();
  const emAndamento = !encerrada && !aindaNaoComecou;
  const [rankingIndividual, setRankingIndividual] = useState([]);
  const [meusPontos, setMeusPontos] = useState(0);
  const [meuRank, setMeuRank] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      const [posts, profilesRes] = await Promise.all([
        fetchAllApprovedPosts(
          'pontos, user_id, categoria, data_registro, created_at',
          { dataDe: DATA_INICIO_ETAPA3, dataAte: DATA_FIM_ETAPA3 },
        ),
        supabase.from('profiles').select('id, nome_exibicao, ativo').eq('ativo', true),
      ]);
      if (!mounted) return;

      const profiles = profilesRes.data || [];

      const porUser = {};
      for (const p of posts) {
        if (!(p.pontos > 0)) continue;
        const uid = p.user_id;
        if (!porUser[uid]) porUser[uid] = { total: 0, ultimoPostAt: null };
        porUser[uid].total += p.pontos;
        if (p.created_at && (!porUser[uid].ultimoPostAt || p.created_at > porUser[uid].ultimoPostAt)) {
          porUser[uid].ultimoPostAt = p.created_at;
        }
      }

      const lista = profiles.map(p => ({
        id: p.id,
        nome: p.nome_exibicao,
        pontos: porUser[p.id]?.total || 0,
        ultimoPostAt: porUser[p.id]?.ultimoPostAt || null,
      })).sort(ordenarRanking);

      setRankingIndividual(lista);

      if (profile?.id) {
        const eu = lista.find(x => x.id === profile.id);
        setMeusPontos(eu?.pontos || 0);
        setMeuRank(eu ? lista.findIndex(x => x.id === profile.id) + 1 : null);
      }
    };

    fetchAll();

    const onFocus = () => fetchAll();
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchAll(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const channel = supabase
      .channel('posts-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchAll)
      .subscribe();

    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const topN = rankingIndividual.slice(0, 15);
  const maxPontos = Math.max(1, ...topN.map(x => x.pontos));

  return (
    <div>
      {/* Stats topo */}
      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <StatCard
          label={emAndamento ? 'Dia do desafio' : aindaNaoComecou ? 'Pré-Etapa 3' : 'Encerrado'}
          value={emAndamento ? `${diasDecorridos()}/30` : '—'}
          sub="22/06 → 21/07"
        />
        <StatCard label="Dias restantes" value={diasRestantes()} sub="até 21/07" />
        <StatCard
          label="Seus pontos"
          value={meusPontos}
          sub={meuRank ? `${meuRank}º lugar` : 'sem teto — vá além!'}
        />
      </div>

      {/* Como pontuar (Etapa 3 — planas, sem teto) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 10 }}>Como pontuar · sem teto, quanto mais você faz mais pontua</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 14 }}>
          <Pilar emoji="🍎" pts="+1 / fruta" desc="meta 3 frutas/dia" />
          <Pilar emoji="🥗" pts="+1 / refeição" desc="salada no almoço e janta" />
          <Pilar emoji="💧" pts="+1 / registro" desc="manhã, tarde e noite" />
          <Pilar emoji="🏃" pts="+5 / 50 min" desc="movimento, constância" />
          <Pilar emoji="🧠" pts="+4 / 10 min" desc="mental, constância" />
          <Pilar emoji="🎭" pts="+3 / atividade" desc="cultura (livro, podcast...)" />
        </div>
      </div>

      {/* CTAs postar */}
      <h3 style={{ marginBottom: 12 }}>Registrar agora</h3>
      {encerrada && (
        <AvisoBox>
          <strong>Registro pausado.</strong> A Etapa 3 encerrou em 21/07.{' '}
          <Link to="/dashboard" style={{ color: 'var(--amarelo)', textDecoration: 'underline' }}>
            Veja o pódio e o ranking final no Dashboard.
          </Link>
        </AvisoBox>
      )}
      {aindaNaoComecou && (
        <AvisoBox>
          <strong>Etapa 3 começa em 22/06.</strong> Os registros abrem nessa data — 30 dias corridos.
        </AvisoBox>
      )}
      <div className="grid-cards" style={{ marginBottom: 30 }}>
        {Object.entries(CATEGORIAS).map(([key, cat]) => {
          const desabilitado = encerrada || aindaNaoComecou;
          const conteudo = (
            <div className="card" style={{
              borderTopColor: cat.cor,
              cursor: desabilitado ? 'not-allowed' : 'pointer',
              opacity: desabilitado ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
              onMouseEnter={desabilitado ? undefined : (e => e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={desabilitado ? undefined : (e => e.currentTarget.style.transform = '')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                <div style={{ fontSize: 36, lineHeight: 1 }}>{cat.emoji}</div>
                <div className={desabilitado ? '' : 'cta-pulse'} style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#fff' }}>
                  {encerrada ? 'Encerrado' : aindaNaoComecou ? 'Em breve' : 'Registre aqui'}
                </div>
              </div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: cat.cor }}>
                {cat.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 4 }}>
                {cat.dica}
              </div>
              {cat.meta && (
                <div style={{
                  marginTop: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  color: cat.cor,
                  background: `${cat.cor}1A`,
                  border: `1px solid ${cat.cor}40`,
                  borderRadius: 999,
                  padding: '3px 9px',
                }}>
                  🎯 {cat.meta}
                </div>
              )}
            </div>
          );
          if (desabilitado) return <div key={key}>{conteudo}</div>;
          return (
            <Link key={key} to={`/postar/${key}`} style={{ textDecoration: 'none' }}>
              {conteudo}
            </Link>
          );
        })}
      </div>

      {/* Ranking individual — Top 15 */}
      <h3 style={{ marginBottom: 12 }}>Ranking individual · Top 15</h3>
      <div className="card">
        {rankingIndividual.length === 0 ? (
          <div style={{ color: 'var(--branco-45)', fontSize: 12 }}>Carregando ranking...</div>
        ) : topN.every(x => x.pontos === 0) ? (
          <>
            <div style={{ color: 'var(--branco-45)', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>
              Placar zerado — a Etapa 3 começa em 22/06.
            </div>
            {topN.map((u, i) => (
              <RankingBar
                key={u.id} nome={u.nome} pontos={0} max={1}
                cor={PALETA[i % PALETA.length]} posicao={i + 1}
              />
            ))}
          </>
        ) : (
          topN.map((u, i) => {
            const ehVoce = u.id === profile?.id;
            return (
              <RankingBar
                key={u.id}
                nome={ehVoce ? `${u.nome} (você)` : u.nome}
                pontos={u.pontos}
                max={maxPontos}
                cor={ehVoce ? 'var(--amarelo)' : PALETA[i % PALETA.length]}
                posicao={i + 1}
              />
            );
          })
        )}

        {/* Sua linha se estiver fora do top 15 */}
        {profile?.id && meuRank && meuRank > 15 && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
            <RankingBar
              nome={`${profile.nome_exibicao} (você)`}
              pontos={meusPontos}
              max={maxPontos}
              cor="var(--amarelo)"
              posicao={meuRank}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Pilar({ emoji, pts, desc }) {
  return (
    <div>
      <div style={{ fontSize: 20 }}>{emoji} <strong style={{ color: 'var(--amarelo)' }}>{pts}</strong></div>
      <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>{desc}</div>
    </div>
  );
}

function AvisoBox({ children }) {
  return (
    <div style={{
      background: 'rgba(244,204,4,0.08)',
      border: '1px solid rgba(244,204,4,0.3)',
      borderLeft: '3px solid var(--amarelo)',
      padding: '10px 14px', borderRadius: 3, marginBottom: 16, fontSize: 13,
    }}>{children}</div>
  );
}
