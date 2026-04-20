import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { calculaSemanaAtual, metasDaSemana, diasRestantes, diasDecorridos, MAX_PONTOS_DIA_PESSOA, MAX_PONTOS_DIA_GRUPO, maxAcumuladoGrupo, aplicarCapDiarioGrupo } from '../lib/weeks';
import { hojeISO } from '../lib/dates';
import { CATEGORIAS } from '../lib/scoring';
import StatCard from '../components/StatCard';
import RankingBar from '../components/RankingBar';

export default function Home() {
  const { profile } = useAuth();
  const semana = calculaSemanaAtual();
  const metas = metasDaSemana(semana);
  const [rankingGrupos, setRankingGrupos] = useState([]);
  const [meusPontos, setMeusPontos] = useState(0);
  const [colegas, setColegas] = useState([]);

  useEffect(() => {
    (async () => {
      const hoje = hojeISO();
      const [postsRes, profilesRes, groupsRes] = await Promise.all([
        supabase.from('posts').select('pontos, user_id, categoria, data_registro').eq('status', 'approved'),
        supabase.from('profiles').select('id, group_id'),
        supabase.from('groups').select('*').order('id'),
      ]);

      const posts = postsRes.data || [];
      const profiles = profilesRes.data || [];
      const groups = groupsRes.data || [];

      // Mapa user_id -> group_id
      const userGroup = Object.fromEntries(profiles.map(p => [p.id, p.group_id]));
      // Tamanho de cada grupo
      const tamanhoGrupo = Object.fromEntries(groups.map(g => [g.id, 0]));
      for (const p of profiles) {
        if (p.group_id) tamanhoGrupo[p.group_id] = (tamanhoGrupo[p.group_id] || 0) + 1;
      }

      // Agrupa posts por grupo (pro cap diário)
      const postsPorGrupo = Object.fromEntries(groups.map(g => [g.id, []]));
      const porUser = {}; // { user_id: { energia, movimento, mental, total, hoje } }

      for (const p of posts) {
        const uid = p.user_id;
        const gid = userGroup[uid];
        const ehHoje = p.data_registro === hoje;
        if (gid) postsPorGrupo[gid].push(p);
        if (!porUser[uid]) porUser[uid] = { energia: 0, movimento: 0, mental: 0, total: 0, hoje: 0 };
        porUser[uid][p.categoria] += (p.pontos || 0);
        porUser[uid].total += (p.pontos || 0);
        if (ehHoje) porUser[uid].hoje += (p.pontos || 0);
      }

      // Aplica cap diário de 35 pts pra cada grupo
      setRankingGrupos(
        groups
          .map(g => {
            const capped = aplicarCapDiarioGrupo(postsPorGrupo[g.id] || [], hoje);
            return {
              ...g,
              pontos: capped.total,
              pontosHoje: capped.totalHoje,
              maxHoje: MAX_PONTOS_DIA_GRUPO,
              maxAcumulado: maxAcumuladoGrupo(null),
              tamanho: tamanhoGrupo[g.id],
            };
          })
          .sort((a, b) => b.pontos - a.pontos)
      );

      if (profile?.id) {
        setMeusPontos(porUser[profile.id]?.total || 0);
      }

      // Colegas do mesmo grupo (profiles já cadastrados) + pending_claims (ainda não logaram)
      if (profile?.group_id) {
        const [prof, pend] = await Promise.all([
          supabase.from('profiles')
            .select('id, nome_exibicao, ativo')
            .eq('group_id', profile.group_id)
            .eq('ativo', true)
            .order('nome_exibicao'),
          supabase.from('pending_claims')
            .select('id, nome_exibicao')
            .eq('group_id', profile.group_id)
            .is('claimed_by', null)
            .order('nome_exibicao'),
        ]);
        const ativos = (prof.data || []).map(p => ({
          nome: p.nome_exibicao,
          ativo: true,
          id: p.id,
          pontos: porUser[p.id] || { energia: 0, movimento: 0, mental: 0, total: 0, hoje: 0 },
        }));
        const pendentes = (pend.data || []).map(p => ({
          nome: p.nome_exibicao,
          ativo: false,
          id: `pc-${p.id}`,
          pontos: { energia: 0, movimento: 0, mental: 0, total: 0, hoje: 0 },
        }));
        // Ordena: ativos por pontos desc, pending no final
        ativos.sort((a, b) => b.pontos.total - a.pontos.total);
        setColegas([...ativos, ...pendentes]);
      }
    })();
  }, [profile?.id, profile?.group_id]);

  const maxPontos = Math.max(1, ...rankingGrupos.map(g => g.pontos));

  return (
    <div>
      {/* Stats topo */}
      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <StatCard
          label={semana >= 1 && semana <= 3 ? `Semana ${semana} de 3` : semana === 0 ? 'Pré-desafio' : 'Encerrado'}
          value={semana >= 1 && semana <= 3 ? `${diasDecorridos()}/21` : '—'}
          sub="dias do desafio"
        />
        <StatCard label="Dias restantes" value={diasRestantes()} sub="até 10/05" />
        <StatCard label="Seus pontos" value={meusPontos} sub={profile?.groups?.nome} cor={profile?.groups?.cor} />
      </div>

      {/* Metas da semana */}
      {metas && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="label" style={{ marginBottom: 10 }}>Metas desta semana</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 22 }}>🍎 <strong>+1 pt</strong></div>
              <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>por fruta · máx 2/dia</div>
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
        </div>
      )}

      {/* CTAs postar */}
      <h3 style={{ marginBottom: 12 }}>Registrar agora</h3>
      <div className="grid-cards" style={{ marginBottom: 30 }}>
        {Object.entries(CATEGORIAS).map(([key, cat]) => (
          <Link key={key} to={`/postar/${key}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              borderTopColor: cat.cor,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
            >
              <div style={{ fontSize: 36, marginBottom: 6 }}>{cat.emoji}</div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: cat.cor }}>
                {cat.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 4 }}>
                {cat.dica}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Seu grupo */}
      {profile?.groups && colegas.length > 0 && (
        <>
          <h3 style={{ marginBottom: 12 }}>Seu time — {profile.groups.nome}</h3>
          <div className="card" style={{ borderTopColor: profile.groups.cor, marginBottom: 26 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {colegas.map((c, idx) => {
                const souEu = c.id === profile.id;
                // posicao entre ativos (pending nao entra no ranking)
                const posicao = c.ativo ? colegas.filter(x => x.ativo).indexOf(c) + 1 : null;
                return (
                  <div key={c.id} style={{
                    padding: '10px 12px',
                    background: souEu ? 'var(--amarelo-soft)' : 'rgba(255,255,255,0.03)',
                    borderRadius: 3,
                    borderLeft: `2px solid ${souEu ? 'var(--amarelo)' : profile.groups.cor}`,
                  }}>
                    {/* Linha 1: avatar + nome */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: profile.groups.cor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--azul)', fontWeight: 700, fontSize: 13,
                        fontFamily: 'Rajdhani',
                        opacity: c.ativo ? 1 : 0.5,
                        flexShrink: 0,
                      }}>
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 13, color: c.ativo ? '#fff' : 'var(--branco-45)', flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {posicao && (
                            <span style={{
                              fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 10,
                              color: 'var(--branco-45)', letterSpacing: 1,
                            }}>
                              #{posicao}
                            </span>
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</span>
                          {souEu && <span style={{ color: 'var(--amarelo)', fontSize: 9, letterSpacing: 1, fontWeight: 700 }}>VOCÊ</span>}
                        </div>
                        {!c.ativo && <div style={{ fontSize: 9, color: 'var(--branco-45)', letterSpacing: 1 }}>ainda não logou</div>}
                      </div>
                      {c.ativo && (
                        <div style={{
                          fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700,
                          color: 'var(--amarelo)', flexShrink: 0,
                        }}>
                          {c.pontos.total}
                          <span style={{ fontSize: 10, marginLeft: 2, color: 'var(--branco-45)' }}>pts</span>
                        </div>
                      )}
                    </div>

                    {/* Linha 2: breakdown por categoria (só pra ativos) */}
                    {c.ativo && (
                      <div style={{
                        display: 'flex', gap: 10, marginTop: 6,
                        fontSize: 11, color: 'var(--branco-70)',
                        paddingLeft: 40, alignItems: 'center', flexWrap: 'wrap',
                      }}>
                        <span title="Energia (frutas)">🍎 {c.pontos.energia}</span>
                        <span title="Movimento (exercício)">🏃 {c.pontos.movimento}</span>
                        <span title="Controle mental (meditação)">🧠 {c.pontos.mental}</span>
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: 10, color: c.pontos.hoje >= MAX_PONTOS_DIA_PESSOA ? 'var(--verde)' : 'var(--branco-45)',
                          letterSpacing: 1, fontFamily: 'Rajdhani', fontWeight: 700,
                        }}>
                          {c.pontos.hoje >= MAX_PONTOS_DIA_PESSOA
                            ? '🎉 META!'
                            : `HOJE ${c.pontos.hoje}/${MAX_PONTOS_DIA_PESSOA}`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{
              fontSize: 10, color: 'var(--branco-45)',
              marginTop: 12, paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.05)',
              textAlign: 'center', letterSpacing: 1,
              fontFamily: 'Rajdhani', fontWeight: 600, textTransform: 'uppercase',
            }}>
              Incentive quem está abaixo 💪 · ordenado por pontos
            </div>
          </div>
        </>
      )}

      {/* Ranking grupos */}
      <h3 style={{ marginBottom: 12 }}>Placar dos grupos</h3>
      <div className="card">
        {rankingGrupos.length === 0 ? (
          <div style={{ color: 'var(--branco-45)', fontSize: 12 }}>Carregando grupos...</div>
        ) : rankingGrupos.every(g => g.pontos === 0) ? (
          <>
            <div style={{ color: 'var(--branco-45)', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>
              Placar zerado — o desafio começa segunda 20/04.
            </div>
            {rankingGrupos.map((g, i) => (
              <RankingBar
                key={g.id} nome={g.nome} pontos={g.pontos} max={1} cor={g.cor} posicao={i + 1}
                pontosHoje={g.pontosHoje} maxHoje={g.maxHoje} maxAcumulado={g.maxAcumulado}
              />
            ))}
          </>
        ) : (
          rankingGrupos.map((g, i) => (
            <RankingBar
              key={g.id} nome={g.nome} pontos={g.pontos} max={Math.max(maxPontos, g.maxAcumulado || 1)} cor={g.cor} posicao={i + 1}
              pontosHoje={g.pontosHoje} maxHoje={g.maxHoje} maxAcumulado={g.maxAcumulado}
            />
          ))
        )}
      </div>
    </div>
  );
}
