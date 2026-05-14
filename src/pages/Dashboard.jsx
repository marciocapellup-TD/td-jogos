import { useEffect, useMemo, useState } from 'react';
import { supabase, fetchAllApprovedPosts } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { diasDecorridos, MAX_PONTOS_DIA_GRUPO, MAX_PONTOS_CICLO } from '../lib/weeks';
import { CATEGORIAS } from '../lib/scoring';
import {
  DATA_INICIO_ETAPA1, DATA_FIM_ETAPA1,
  DATA_INICIO_ETAPA2, DATA_FIM_ETAPA2,
} from '../lib/competicao';
import RankingBar from '../components/RankingBar';
import StatCard from '../components/StatCard';

const CHART_TOOLTIP_STYLE = {
  background: '#011F36',
  border: '1px solid rgba(244,204,4,0.3)',
  borderRadius: 3,
  fontFamily: 'Inter',
  fontSize: 12,
};

// Paleta cíclica usada nas barras individuais da Etapa 2.
const PALETA = ['#F4CC04', '#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#EC4899', '#06B6D4', '#84CC16'];

// Ordena ranking: pontos desc; empate -> created_at do último post asc.
function ordenarRanking(a, b) {
  if (b.pontos !== a.pontos) return b.pontos - a.pontos;
  if (!a.ultimoPostAt && !b.ultimoPostAt) return 0;
  if (!a.ultimoPostAt) return 1;
  if (!b.ultimoPostAt) return -1;
  return a.ultimoPostAt < b.ultimoPostAt ? -1 : 1;
}

export default function Dashboard() {
  const [etapaView, setEtapaView] = useState('etapa2'); // 'etapa1' | 'etapa2'
  const [data, setData] = useState({ posts: [], profiles: [], groups: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const janela = etapaView === 'etapa1'
      ? { dataDe: DATA_INICIO_ETAPA1, dataAte: DATA_FIM_ETAPA1 }
      : { dataDe: DATA_INICIO_ETAPA2, dataAte: DATA_FIM_ETAPA2 };

    const fetchAll = async () => {
      if (mounted) setLoading(true);
      // Etapa 2: só profiles ativos (quem saiu da TD não aparece no ranking).
      // Etapa 1: todos os profiles (preserva histórico de quem participou e depois saiu).
      let profQuery = supabase.from('profiles')
        .select('id, nome_exibicao, group_id, ativo')
        .order('nome_exibicao');
      if (etapaView === 'etapa2') profQuery = profQuery.eq('ativo', true);

      const [posts, profRes, groupRes] = await Promise.all([
        fetchAllApprovedPosts('*', janela),
        profQuery,
        supabase.from('groups').select('*').order('id'),
      ]);
      if (!mounted) return;
      setData({
        posts,
        profiles: profRes.data || [],
        groups: groupRes.data || [],
      });
      setLoading(false);
    };

    fetchAll();

    const onFocus = () => fetchAll();
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchAll(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const channel = supabase
      .channel('posts-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchAll)
      .subscribe();

    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      supabase.removeChannel(channel);
    };
  }, [etapaView]);

  const agregados = useMemo(() => {
    const { posts, profiles, groups } = data;
    const prefById = Object.fromEntries(profiles.map(p => [p.id, p]));

    const somaUser = {};
    const ultimoUser = {};
    const ultimoGrupo = Object.fromEntries(groups.map(g => [g.id, null]));
    const catGrp = Object.fromEntries(groups.map(g => [g.id, { energia: 0, movimento: 0, mental: 0, hidratacao: 0 }]));
    const catTotal = { energia: 0, movimento: 0, mental: 0, hidratacao: 0 };
    const dia = {};                  // {dataIso: {gid: pts}} (etapa1)
    const diaUser = {};              // {dataIso: {uid: pts}} (etapa2)
    const atividadeCat = { energia: {}, movimento: {}, mental: {}, hidratacao: {} };

    for (const p of posts) {
      const uid = p.user_id;
      const prof = prefById[uid];
      const gid = prof?.group_id;
      const pts = p.pontos || 0;
      if (gid) catGrp[gid][p.categoria] = (catGrp[gid][p.categoria] || 0) + 1;
      catTotal[p.categoria] = (catTotal[p.categoria] || 0) + 1;
      somaUser[uid] = (somaUser[uid] || 0) + pts;
      if (pts > 0 && p.created_at) {
        if (!ultimoUser[uid] || p.created_at > ultimoUser[uid]) ultimoUser[uid] = p.created_at;
        if (gid && (!ultimoGrupo[gid] || p.created_at > ultimoGrupo[gid])) ultimoGrupo[gid] = p.created_at;
      }
      const dataStr = p.data_registro;
      if (!dia[dataStr]) dia[dataStr] = Object.fromEntries(groups.map(g => [g.id, 0]));
      if (gid) dia[dataStr][gid] += pts;
      if (!diaUser[dataStr]) diaUser[dataStr] = {};
      diaUser[dataStr][uid] = (diaUser[dataStr][uid] || 0) + pts;
      atividadeCat[p.categoria][uid] = (atividadeCat[p.categoria][uid] || 0) + 1;
    }

    // Etapa 1: cap diário de 35 pts/grupo
    const somaGrp = Object.fromEntries(groups.map(g => [g.id, 0]));
    for (const [, porGrupo] of Object.entries(dia)) {
      for (const g of groups) {
        somaGrp[g.id] += Math.min(porGrupo[g.id] || 0, MAX_PONTOS_DIA_GRUPO);
      }
    }

    const rankingGrupos = groups.map(g => ({
      ...g,
      pontos: somaGrp[g.id] || 0,
      ultimoPostAt: ultimoGrupo[g.id],
    })).sort(ordenarRanking);

    const rankingIndivFull = profiles.map(p => {
      const g = groups.find(gg => gg.id === p.group_id);
      return {
        id: p.id,
        nome: p.nome_exibicao,
        grupo: g?.nome,
        group_id: p.group_id,
        cor: g?.cor,
        pontos: somaUser[p.id] || 0,
        ultimoPostAt: ultimoUser[p.id] || null,
      };
    }).sort(ordenarRanking);

    const rankingIndiv = rankingIndivFull.slice(0, 15);

    const porCategoriaPorGrupo = groups.map(g => ({
      grupo: g.nome,
      Energia: catGrp[g.id].energia,
      Movimento: catGrp[g.id].movimento,
      Mental: catGrp[g.id].mental,
      Hidratação: catGrp[g.id].hidratacao,
    }));

    // Série temporal Etapa 1: acumulado por grupo (com cap diário)
    const datasG = Object.keys(dia).sort();
    const acumG = Object.fromEntries(groups.map(g => [g.id, 0]));
    const serieGrupos = datasG.map(d => {
      const row = { data: d.slice(5).replace('-', '/') };
      for (const g of groups) {
        acumG[g.id] += Math.min(dia[d][g.id] || 0, MAX_PONTOS_DIA_GRUPO);
        row[g.nome] = acumG[g.id];
      }
      return row;
    });

    // Série temporal Etapa 2: acumulado individual (top 5)
    const top5Uids = rankingIndiv.slice(0, 5).map(r => r.id);
    const datasU = Object.keys(diaUser).sort();
    const acumU = Object.fromEntries(top5Uids.map(uid => [uid, 0]));
    const serieIndividuais = datasU.map(d => {
      const row = { data: d.slice(5).replace('-', '/') };
      for (const uid of top5Uids) {
        acumU[uid] += diaUser[d][uid] || 0;
        const nome = prefById[uid]?.nome_exibicao || '—';
        row[nome] = acumU[uid];
      }
      return row;
    });
    const top5Nomes = top5Uids.map(uid => prefById[uid]?.nome_exibicao || '—');

    const maisAtivos = {};
    for (const cat of Object.keys(atividadeCat)) {
      const arr = Object.entries(atividadeCat[cat]).sort((a, b) => b[1] - a[1]);
      if (arr.length > 0) {
        const [uid, qtd] = arr[0];
        maisAtivos[cat] = { nome: prefById[uid]?.nome_exibicao || '—', qtd };
      }
    }

    return {
      rankingGrupos, rankingIndiv, rankingIndivFull,
      porCategoriaPorGrupo, catTotal,
      serieGrupos, serieIndividuais, top5Nomes,
      maisAtivos,
    };
  }, [data]);

  if (loading) return <div style={{ color: 'var(--branco-45)' }}>Carregando...</div>;

  const totalPosts = data.posts.length;
  const participantes = data.profiles.length;
  const ehEtapa2 = etapaView === 'etapa2';

  return (
    <div>
      <div className="label">Placar geral</div>
      <h1 style={{ marginBottom: 14 }}>Dashboard</h1>

      <Toggle etapa={etapaView} onChange={setEtapaView} />

      {ehEtapa2 ? (
        <Etapa2View
          totalPosts={totalPosts}
          participantes={participantes}
          agregados={agregados}
        />
      ) : (
        <Etapa1View
          totalPosts={totalPosts}
          participantes={participantes}
          agregados={agregados}
          groups={data.groups}
        />
      )}
    </div>
  );
}

function Toggle({ etapa, onChange }) {
  const btn = (val, label, sub) => {
    const ativo = etapa === val;
    return (
      <button
        type="button"
        onClick={() => onChange(val)}
        className={`btn ${ativo ? 'btn-primary' : 'btn-ghost'}`}
        style={{ flex: 1, padding: '10px 12px', textAlign: 'left' }}
      >
        <div style={{
          fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: 1, fontSize: 13,
          color: ativo ? 'var(--azul)' : undefined,
        }}>{label}</div>
        <div style={{
          fontSize: 10, letterSpacing: 0,
          color: ativo ? 'rgba(1,31,54,0.7)' : 'var(--branco-45)',
        }}>{sub}</div>
      </button>
    );
  };
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
      {btn('etapa2', 'Etapa 2 — atual', '18/05 → 07/06 · individual')}
      {btn('etapa1', 'Etapa 1 — histórico', '20/04 → 10/05 · grupos')}
    </div>
  );
}

function Etapa2View({ totalPosts, participantes, agregados }) {
  const { rankingIndiv, porCategoriaPorGrupo, catTotal, serieIndividuais, top5Nomes, maisAtivos } = agregados;
  const maxIndiv = Math.max(1, ...rankingIndiv.map(r => r.pontos));

  return (
    <>
      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <StatCard label="Dia" value={`${diasDecorridos()} / 21`} sub="18/05 → 07/06" />
        <StatCard label="Registros aprovados" value={totalPosts} />
        <StatCard label="Participantes" value={participantes} />
        <StatCard
          label="Líder"
          value={rankingIndiv[0]?.nome || '—'}
          sub={`${rankingIndiv[0]?.pontos || 0} de ${MAX_PONTOS_CICLO} pts`}
        />
      </div>

      <h3 style={{ marginBottom: 12 }}>Ranking individual · Top 15</h3>
      <div className="card" style={{ marginBottom: 26 }}>
        {rankingIndiv.length === 0 && <div style={{ color: 'var(--branco-45)' }}>Sem dados ainda.</div>}
        {rankingIndiv.map((r, i) => (
          <RankingBar
            key={r.id} nome={r.nome} pontos={r.pontos}
            max={Math.max(maxIndiv, MAX_PONTOS_CICLO)}
            cor={PALETA[i % PALETA.length]}
            posicao={i + 1}
            maxAcumulado={MAX_PONTOS_CICLO}
          />
        ))}
      </div>

      <h3 style={{ marginBottom: 12 }}>Mais ativos por categoria</h3>
      <div className="grid-cards" style={{ marginBottom: 26 }}>
        {Object.entries(CATEGORIAS).map(([key, cat]) => (
          <div key={key} className="card" style={{ borderTopColor: cat.cor }}>
            <div className="label" style={{ color: cat.cor }}>{cat.emoji} {cat.label}</div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {maisAtivos[key]?.nome || '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--branco-45)' }}>
              {maisAtivos[key]?.qtd ? `${maisAtivos[key].qtd} registros aprovados` : 'sem registros'}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginBottom: 12 }}>Total de registros por categoria</h3>
      <div className="card" style={{ marginBottom: 26, height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[
            { categoria: 'Energia', total: catTotal.energia, fill: '#10B981' },
            { categoria: 'Hidratação', total: catTotal.hidratacao, fill: '#06B6D4' },
            { categoria: 'Movimento', total: catTotal.movimento, fill: '#3B82F6' },
            { categoria: 'Mental', total: catTotal.mental, fill: '#8B5CF6' },
          ]}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="categoria" stroke="#aaa" style={{ fontSize: 11 }} />
            <YAxis stroke="#aaa" style={{ fontSize: 11 }} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Bar dataKey="total" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 style={{ marginBottom: 12 }}>Evolução acumulada · Top 5</h3>
      <div className="card" style={{ marginBottom: 26, height: 320 }}>
        {serieIndividuais.length === 0 ? (
          <div style={{ color: 'var(--branco-45)', padding: 40, textAlign: 'center' }}>
            Ainda sem dados suficientes.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serieIndividuais}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="data" stroke="#aaa" style={{ fontSize: 11 }} />
              <YAxis stroke="#aaa" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {top5Nomes.map((nome, i) => (
                <Line key={nome} type="monotone" dataKey={nome} stroke={PALETA[i % PALETA.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <h3 style={{ marginBottom: 12 }}>Registros por categoria (legado · grupos da Etapa 1)</h3>
      <div className="card" style={{ marginBottom: 26, height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={porCategoriaPorGrupo}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="grupo" stroke="#aaa" style={{ fontSize: 11 }} />
            <YAxis stroke="#aaa" style={{ fontSize: 11 }} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Energia" stackId="a" fill="#10B981" />
            <Bar dataKey="Hidratação" stackId="a" fill="#06B6D4" />
            <Bar dataKey="Movimento" stackId="a" fill="#3B82F6" />
            <Bar dataKey="Mental" stackId="a" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function Etapa1View({ totalPosts, participantes, agregados, groups }) {
  const { rankingGrupos, rankingIndivFull, porCategoriaPorGrupo, serieGrupos, maisAtivos } = agregados;
  const maxGrupo = Math.max(1, ...rankingGrupos.map(g => g.pontos));

  return (
    <>
      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <StatCard label="Período" value="20/04 → 10/05" sub="21 dias · encerrado" />
        <StatCard label="Registros aprovados" value={totalPosts} />
        <StatCard label="Participantes" value={participantes} />
        <StatCard
          label="Grupo campeão"
          value={rankingGrupos[0]?.nome || '—'}
          cor={rankingGrupos[0]?.cor}
          sub={`${rankingGrupos[0]?.pontos || 0} pts`}
        />
      </div>

      <h3 style={{ marginBottom: 12 }}>Ranking dos grupos</h3>
      <div className="card" style={{ marginBottom: 26 }}>
        {rankingGrupos.map((g, i) => (
          <GrupoExpandido
            key={g.id}
            grupo={g}
            posicao={i + 1}
            max={maxGrupo}
            membros={rankingIndivFull.filter(r => r.group_id === g.id)}
          />
        ))}
      </div>

      <h3 style={{ marginBottom: 12 }}>Hall dos mais ativos</h3>
      <div className="grid-cards" style={{ marginBottom: 26 }}>
        {Object.entries(CATEGORIAS).filter(([k]) => k !== 'hidratacao').map(([key, cat]) => (
          <div key={key} className="card" style={{ borderTopColor: cat.cor }}>
            <div className="label" style={{ color: cat.cor }}>{cat.emoji} {cat.label}</div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {maisAtivos[key]?.nome || '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--branco-45)' }}>
              {maisAtivos[key]?.qtd ? `${maisAtivos[key].qtd} registros aprovados` : 'sem registros'}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginBottom: 12 }}>Registros por grupo e categoria</h3>
      <div className="card" style={{ marginBottom: 26, height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={porCategoriaPorGrupo}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="grupo" stroke="#aaa" style={{ fontSize: 11 }} />
            <YAxis stroke="#aaa" style={{ fontSize: 11 }} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Energia" stackId="a" fill="#10B981" />
            <Bar dataKey="Movimento" stackId="a" fill="#3B82F6" />
            <Bar dataKey="Mental" stackId="a" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 style={{ marginBottom: 12 }}>Evolução acumulada</h3>
      <div className="card" style={{ marginBottom: 26, height: 320 }}>
        {serieGrupos.length === 0 ? (
          <div style={{ color: 'var(--branco-45)', padding: 40, textAlign: 'center' }}>
            Ainda sem dados suficientes.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serieGrupos}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="data" stroke="#aaa" style={{ fontSize: 11 }} />
              <YAxis stroke="#aaa" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {groups.map(g => (
                <Line key={g.id} type="monotone" dataKey={g.nome} stroke={g.cor} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}

function GrupoExpandido({ grupo, posicao, max, membros }) {
  const [aberto, setAberto] = useState(false);
  const membrosOrdenados = [...membros].sort(ordenarRanking);

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        onClick={() => setAberto(!aberto)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 4, fontFamily: 'Rajdhani, sans-serif',
        }}>
          <span style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
            <span style={{
              display: 'inline-block', width: 14, textAlign: 'center',
              color: 'var(--amarelo)', marginRight: 6,
              transition: 'transform 0.2s',
              transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)',
            }}>▶</span>
            <span style={{ color: 'var(--amarelo)', marginRight: 8 }}>#{posicao}</span>
            {grupo.nome}
            <span style={{ color: 'var(--branco-45)', fontSize: 10, marginLeft: 8, letterSpacing: 1 }}>
              · {membros.length} {membros.length === 1 ? 'membro' : 'membros'}
            </span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--amarelo)' }}>{grupo.pontos} pts</span>
        </div>
        <div style={{ height: 10, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, max > 0 ? (grupo.pontos / max) * 100 : 0)}%`,
            height: '100%', background: grupo.cor || 'var(--amarelo)',
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {aberto && (
        <div style={{
          marginTop: 10, marginLeft: 20, paddingLeft: 14,
          borderLeft: `2px solid ${grupo.cor}`,
        }}>
          {membrosOrdenados.length === 0 && (
            <div style={{ color: 'var(--branco-45)', fontSize: 11 }}>Sem membros cadastrados ainda.</div>
          )}
          {membrosOrdenados.map((m, i) => (
            <div key={m.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0', fontSize: 12,
              borderBottom: i < membrosOrdenados.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span><span style={{ color: 'var(--branco-45)', marginRight: 8 }}>{i + 1}.</span>{m.nome}</span>
              <span style={{ color: 'var(--amarelo)', fontFamily: 'Rajdhani', fontWeight: 700 }}>{m.pontos} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
