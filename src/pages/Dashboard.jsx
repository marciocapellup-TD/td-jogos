import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { DATA_INICIO, diasDecorridos, MAX_PONTOS_DIA_GRUPO } from '../lib/weeks';
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

// Ordena ranking: pontos desc; empate -> quem chegou primeiro (reviewed_at asc)
function ordenarRanking(a, b) {
  if (b.pontos !== a.pontos) return b.pontos - a.pontos;
  if (!a.ultimoReviewedAt && !b.ultimoReviewedAt) return 0;
  if (!a.ultimoReviewedAt) return 1;
  if (!b.ultimoReviewedAt) return -1;
  return a.ultimoReviewedAt < b.ultimoReviewedAt ? -1 : 1;
}

export default function Dashboard() {
  const [data, setData] = useState({ posts: [], profiles: [], groups: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [postsRes, profRes, groupRes] = await Promise.all([
        supabase.from('posts').select('*').eq('status', 'approved'),
        supabase.from('profiles').select('id, nome_exibicao, group_id').order('nome_exibicao'),
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

  const { rankingGrupos, rankingIndiv, rankingIndivFull, porCategoria, serieTemporal, maisAtivos } = useMemo(() => {
    const { posts, profiles, groups } = data;
    const prefById = Object.fromEntries(profiles.map(p => [p.id, p]));

    const somaUser = {};
    const ultimoUser = {}; // desempate: maior reviewed_at (com pontos > 0)
    const ultimoGrupo = Object.fromEntries(groups.map(g => [g.id, null]));
    const catGrp = Object.fromEntries(groups.map(g => [g.id, { energia: 0, movimento: 0, mental: 0 }]));
    const dia = {};
    const atividadeCat = { energia: {}, movimento: {}, mental: {} };

    for (const p of posts) {
      const uid = p.user_id;
      const prof = prefById[uid];
      const gid = prof?.group_id;
      const pts = p.pontos || 0;
      if (gid) {
        catGrp[gid][p.categoria] = (catGrp[gid][p.categoria] || 0) + 1;
      }
      somaUser[uid] = (somaUser[uid] || 0) + pts;
      if (pts > 0 && p.reviewed_at) {
        if (!ultimoUser[uid] || p.reviewed_at > ultimoUser[uid]) ultimoUser[uid] = p.reviewed_at;
        if (gid && (!ultimoGrupo[gid] || p.reviewed_at > ultimoGrupo[gid])) ultimoGrupo[gid] = p.reviewed_at;
      }
      const dataStr = p.data_registro;
      dia[dataStr] = dia[dataStr] || Object.fromEntries(groups.map(g => [g.id, 0]));
      if (gid) dia[dataStr][gid] += pts;
      atividadeCat[p.categoria][uid] = (atividadeCat[p.categoria][uid] || 0) + 1;
    }

    // Pontos do grupo com cap diario de 35 (equidade entre grupos de 5 e 6)
    const somaGrp = Object.fromEntries(groups.map(g => [g.id, 0]));
    for (const [_data, porGrupo] of Object.entries(dia)) {
      for (const g of groups) {
        somaGrp[g.id] += Math.min(porGrupo[g.id] || 0, MAX_PONTOS_DIA_GRUPO);
      }
    }

    const rankingGrupos = groups.map(g => ({
      ...g,
      pontos: somaGrp[g.id] || 0,
      ultimoReviewedAt: ultimoGrupo[g.id],
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
        ultimoReviewedAt: ultimoUser[p.id] || null,
      };
    }).sort(ordenarRanking);

    const rankingIndiv = rankingIndivFull.slice(0, 10);

    const porCategoria = groups.map(g => ({
      grupo: g.nome,
      Energia: catGrp[g.id].energia,
      Movimento: catGrp[g.id].movimento,
      Mental: catGrp[g.id].mental,
    }));

    // Série temporal acumulada por grupo (com cap diário)
    const datas = Object.keys(dia).sort();
    const acum = Object.fromEntries(groups.map(g => [g.id, 0]));
    const serieTemporal = datas.map(d => {
      const row = { data: d.slice(5).replace('-', '/') };
      for (const g of groups) {
        acum[g.id] += Math.min(dia[d][g.id] || 0, MAX_PONTOS_DIA_GRUPO);
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

    return { rankingGrupos, rankingIndiv, rankingIndivFull, porCategoria, serieTemporal, maisAtivos };
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
        <StatCard label="Dia" value={`${diasDecorridos()} / 21`} sub="20/04 → 10/05" />
        <StatCard label="Registros aprovados" value={totalPosts} />
        <StatCard label="Participantes" value={participantes} />
        <StatCard label="Grupo líder" value={rankingGrupos[0]?.nome || '—'} cor={rankingGrupos[0]?.cor} sub={`${rankingGrupos[0]?.pontos || 0} pts`} />
      </div>

      {/* Ranking grupos — expansível */}
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
          marginTop: 10,
          marginLeft: 20,
          paddingLeft: 14,
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
