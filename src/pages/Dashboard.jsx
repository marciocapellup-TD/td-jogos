import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { DATA_INICIO, diasDecorridos } from '../lib/weeks';
import { CATEGORIAS } from '../lib/scoring';
import RankingBar from '../components/RankingBar';
import StatCard from '../components/StatCard';

const CHART_TOOLTIP_STYLE = {
  background: '#011F36',
  border: '1px solid rgba(244,204,4,0.3)',
  borderRadius: 3,
  fontFamily: 'Inter',
  fontSize: 12,
};

export default function Dashboard() {
  const [data, setData] = useState({ posts: [], profiles: [], groups: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [postsRes, profRes, groupRes] = await Promise.all([
        supabase.from('posts').select('*').eq('status', 'approved'),
        supabase.from('profiles').select('id, nome_exibicao, group_id'),
        supabase.from('groups').select('*').order('id'),
      ]);
      setData({
        posts: postsRes.data || [],
        profiles: profRes.data || [],
        groups: groupRes.data || [],
      });
      setLoading(false);
    })();
  }, []);

  const { rankingGrupos, rankingIndiv, porCategoria, serieTemporal, maisAtivos } = useMemo(() => {
    const { posts, profiles, groups } = data;
    const prefById = Object.fromEntries(profiles.map(p => [p.id, p]));

    const somaGrp = Object.fromEntries(groups.map(g => [g.id, 0]));
    const somaUser = {};
    const catGrp = Object.fromEntries(groups.map(g => [g.id, { energia: 0, movimento: 0, mental: 0 }]));
    const dia = {};
    const atividadeCat = { energia: {}, movimento: {}, mental: {} };

    for (const p of posts) {
      const uid = p.user_id;
      const prof = prefById[uid];
      const gid = prof?.group_id;
      if (gid) {
        somaGrp[gid] = (somaGrp[gid] || 0) + (p.pontos || 0);
        catGrp[gid][p.categoria] = (catGrp[gid][p.categoria] || 0) + 1;
      }
      somaUser[uid] = (somaUser[uid] || 0) + (p.pontos || 0);
      const dataStr = p.data_registro;
      dia[dataStr] = dia[dataStr] || Object.fromEntries(groups.map(g => [g.id, 0]));
      if (gid) dia[dataStr][gid] += p.pontos || 0;
      atividadeCat[p.categoria][uid] = (atividadeCat[p.categoria][uid] || 0) + 1;
    }

    const rankingGrupos = groups.map(g => ({
      ...g,
      pontos: somaGrp[g.id] || 0,
    })).sort((a, b) => b.pontos - a.pontos);

    const rankingIndiv = Object.entries(somaUser)
      .map(([uid, pts]) => {
        const p = prefById[uid];
        const g = groups.find(gg => gg.id === p?.group_id);
        return { id: uid, nome: p?.nome_exibicao || '—', grupo: g?.nome, cor: g?.cor, pontos: pts };
      })
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 10);

    const porCategoria = groups.map(g => ({
      grupo: g.nome,
      Energia: catGrp[g.id].energia,
      Movimento: catGrp[g.id].movimento,
      Mental: catGrp[g.id].mental,
    }));

    // Série temporal acumulada por grupo
    const datas = Object.keys(dia).sort();
    const acum = Object.fromEntries(groups.map(g => [g.id, 0]));
    const serieTemporal = datas.map(d => {
      const row = { data: d.slice(5).replace('-', '/') };
      for (const g of groups) {
        acum[g.id] += dia[d][g.id] || 0;
        row[g.nome] = acum[g.id];
      }
      return row;
    });

    const maisAtivos = {};
    for (const cat of Object.keys(atividadeCat)) {
      const arr = Object.entries(atividadeCat[cat]).sort((a, b) => b[1] - a[1]);
      if (arr.length > 0) {
        const [uid, qtd] = arr[0];
        maisAtivos[cat] = { nome: prefById[uid]?.nome_exibicao || '—', qtd };
      }
    }

    return { rankingGrupos, rankingIndiv, porCategoria, serieTemporal, maisAtivos };
  }, [data]);

  if (loading) return <div style={{ color: 'var(--branco-45)' }}>Carregando...</div>;

  const maxGrupo = Math.max(1, ...rankingGrupos.map(g => g.pontos));
  const maxIndiv = Math.max(1, ...rankingIndiv.map(r => r.pontos));
  const totalPosts = data.posts.length;
  const participantes = data.profiles.length;

  return (
    <div>
      <div className="label">Placar geral</div>
      <h1 style={{ marginBottom: 22 }}>Dashboard</h1>

      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <StatCard label="Dia" value={`${diasDecorridos()} / 21`} sub={DATA_INICIO.toLocaleDateString('pt-BR') + ' → 10/05'} />
        <StatCard label="Registros aprovados" value={totalPosts} />
        <StatCard label="Participantes" value={participantes} />
        <StatCard label="Grupo líder" value={rankingGrupos[0]?.nome || '—'} cor={rankingGrupos[0]?.cor} sub={`${rankingGrupos[0]?.pontos || 0} pts`} />
      </div>

      {/* Ranking grupos */}
      <h3 style={{ marginBottom: 12 }}>Ranking dos grupos</h3>
      <div className="card" style={{ marginBottom: 26 }}>
        {rankingGrupos.map((g, i) => (
          <RankingBar key={g.id} nome={g.nome} pontos={g.pontos} max={maxGrupo} cor={g.cor} posicao={i + 1} />
        ))}
      </div>

      {/* Hall dos mais ativos */}
      <h3 style={{ marginBottom: 12 }}>Hall dos mais ativos</h3>
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

      {/* Gráfico por categoria stacked */}
      <h3 style={{ marginBottom: 12 }}>Registros por grupo e categoria</h3>
      <div className="card" style={{ marginBottom: 26, height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={porCategoria}>
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

      {/* Série temporal */}
      <h3 style={{ marginBottom: 12 }}>Evolução acumulada</h3>
      <div className="card" style={{ marginBottom: 26, height: 320 }}>
        {serieTemporal.length === 0 ? (
          <div style={{ color: 'var(--branco-45)', padding: 40, textAlign: 'center' }}>
            Ainda sem dados suficientes.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serieTemporal}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="data" stroke="#aaa" style={{ fontSize: 11 }} />
              <YAxis stroke="#aaa" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {data.groups.map(g => (
                <Line key={g.id} type="monotone" dataKey={g.nome} stroke={g.cor} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top 10 individual */}
      <h3 style={{ marginBottom: 12 }}>Top 10 individual</h3>
      <div className="card">
        {rankingIndiv.length === 0 && <div style={{ color: 'var(--branco-45)' }}>Sem dados ainda.</div>}
        {rankingIndiv.map((r, i) => (
          <RankingBar key={r.id} nome={`${r.nome} · ${r.grupo}`} pontos={r.pontos} max={maxIndiv} cor={r.cor} posicao={i + 1} />
        ))}
      </div>
    </div>
  );
}
