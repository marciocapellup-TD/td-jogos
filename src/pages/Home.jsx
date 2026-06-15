import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, fetchAllApprovedPosts } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  calculaSemanaAtual, metasDaSemana, diasRestantes, diasDecorridos,
  MAX_PONTOS_DIA_PESSOA, MAX_PONTOS_CICLO,
} from '../lib/weeks';
import { hojeISO } from '../lib/dates';
import { CATEGORIAS } from '../lib/scoring';
import { competicaoEncerrada, entreEtapas, DATA_INICIO_ETAPA2, DATA_FIM_ETAPA2 } from '../lib/competicao';
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
  const semana = calculaSemanaAtual();
  const metas = metasDaSemana(semana);
  const encerrada = competicaoEncerrada();
  const aindaNaoComecou = entreEtapas();
  const [rankingIndividual, setRankingIndividual] = useState([]);
  const [meusPontos, setMeusPontos] = useState(0);
  const [meuRank, setMeuRank] = useState(null);
  const [pontosHoje, setPontosHoje] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      const hoje = hojeISO();
      const [posts, profilesRes] = await Promise.all([
        fetchAllApprovedPosts(
          'pontos, user_id, categoria, data_registro, created_at',
          { dataDe: DATA_INICIO_ETAPA2, dataAte: DATA_FIM_ETAPA2 },
        ),
        supabase.from('profiles').select('id, nome_exibicao, ativo').eq('ativo', true),
      ]);
      if (!mounted) return;

      const profiles = profilesRes.data || [];

      // Agrega por usuário
      const porUser = {};
      for (const p of posts) {
        if (!(p.pontos > 0)) continue;
        const uid = p.user_id;
        if (!porUser[uid]) porUser[uid] = { total: 0, hoje: 0, ultimoPostAt: null };
        porUser[uid].total += p.pontos;
        if (p.data_registro === hoje) porUser[uid].hoje += p.pontos;
        if (p.created_at && (!porUser[uid].ultimoPostAt || p.created_at > porUser[uid].ultimoPostAt)) {
          porUser[uid].ultimoPostAt = p.created_at;
        }
      }

      // Lista todos os participantes ativos, mesmo zerados (aparecem no final)
      const lista = profiles.map(p => ({
        id: p.id,
        nome: p.nome_exibicao,
        pontos: porUser[p.id]?.total || 0,
        pontosHoje: porUser[p.id]?.hoje || 0,
        ultimoPostAt: porUser[p.id]?.ultimoPostAt || null,
      })).sort(ordenarRanking);

      setRankingIndividual(lista);

      if (profile?.id) {
        const eu = lista.find(x => x.id === profile.id);
        setMeusPontos(eu?.pontos || 0);
        setPontosHoje(eu?.pontosHoje || 0);
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
          label={semana >= 1 && semana <= 3 ? `Semana ${semana} de 3` : aindaNaoComecou ? 'Pré-etapa 2' : 'Encerrado'}
          value={semana >= 1 && semana <= 3 ? `${diasDecorridos()}/21` : '—'}
          sub="dias decorridos"
        />
        <StatCard label="Dias restantes" value={diasRestantes()} sub="até 07/06" />
        <StatCard
          label="Seus pontos"
          value={meusPontos}
          sub={meuRank ? `${meuRank}º lugar` : `de ${MAX_PONTOS_CICLO} possíveis`}
        />
      </div>

      {/* Metas da semana */}
      {metas && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="label" style={{ marginBottom: 10 }}>Metas desta semana</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 22 }}>🍎 <strong>+1 pt</strong></div>
              <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>por fruta · até 2/dia (1-2 posts)</div>
            </div>
            <div>
              <div style={{ fontSize: 22 }}>🥗 <strong>+1 pt</strong></div>
              <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>1 vegetal/salada/dia</div>
            </div>
            <div>
              <div style={{ fontSize: 22 }}>💧 <strong>+1 pt</strong></div>
              <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>por horário · 3/dia</div>
            </div>
            <div>
              <div style={{ fontSize: 22 }}>🏃 <strong>+{metas.movimento.pontos} pt</strong></div>
              <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>≥ {metas.movimento.minutos} min/dia</div>
            </div>
            <div>
              <div style={{ fontSize: 22 }}>🧠 <strong>+{metas.mental.pontos} pt</strong></div>
              <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>≥ {metas.mental.minutos} min/dia</div>
            </div>
          </div>
          <div style={{
            marginTop: 14, paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11, color: 'var(--branco-45)', letterSpacing: 1,
            fontFamily: 'Rajdhani', fontWeight: 600, textTransform: 'uppercase',
          }}>
            Máximo por dia: {MAX_PONTOS_DIA_PESSOA} pts · {MAX_PONTOS_CICLO} pts no ciclo
            {pontosHoje > 0 && (
              <span style={{ marginLeft: 12, color: pontosHoje >= MAX_PONTOS_DIA_PESSOA ? 'var(--verde)' : 'var(--amarelo)' }}>
                · Você hoje: {pontosHoje}/{MAX_PONTOS_DIA_PESSOA}
              </span>
            )}
          </div>
        </div>
      )}

      {/* CTAs postar */}
      <h3 style={{ marginBottom: 12 }}>Registrar agora</h3>
      {encerrada && (
        <AvisoBox>
          <strong>Registro pausado.</strong> A competição encerrou em 07/06 — aguarde as próximas metas.{' '}
          <Link to="/dashboard" style={{ color: 'var(--amarelo)', textDecoration: 'underline' }}>
            Veja o pódio e o ranking final no Dashboard.
          </Link>
        </AvisoBox>
      )}
      {aindaNaoComecou && (
        <AvisoBox>
          <strong>Etapa 2 começa em 18/05.</strong> Os registros abrem nessa data.
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
              Placar zerado — a Etapa 2 começa em 18/05.
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
                max={Math.max(maxPontos, MAX_PONTOS_CICLO)}
                cor={ehVoce ? 'var(--amarelo)' : PALETA[i % PALETA.length]}
                posicao={i + 1}
                pontosHoje={u.pontosHoje}
                maxHoje={MAX_PONTOS_DIA_PESSOA}
                maxAcumulado={MAX_PONTOS_CICLO}
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
              max={Math.max(maxPontos, MAX_PONTOS_CICLO)}
              cor="var(--amarelo)"
              posicao={meuRank}
              pontosHoje={pontosHoje}
              maxHoje={MAX_PONTOS_DIA_PESSOA}
              maxAcumulado={MAX_PONTOS_CICLO}
            />
          </div>
        )}
      </div>
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
