import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { calculaSemanaAtual, metasDaSemana, diasRestantes, diasDecorridos } from '../lib/weeks';
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
      const { data: posts } = await supabase
        .from('posts')
        .select('pontos, user_id, profiles!inner(group_id)')
        .eq('status', 'approved');
      const { data: groups } = await supabase.from('groups').select('*').order('id');
      if (posts && groups) {
        const soma = Object.fromEntries(groups.map(g => [g.id, 0]));
        for (const p of posts) {
          const gid = p.profiles?.group_id;
          if (gid) soma[gid] = (soma[gid] || 0) + (p.pontos || 0);
        }
        setRankingGrupos(groups.map(g => ({ ...g, pontos: soma[g.id] || 0 })).sort((a, b) => b.pontos - a.pontos));
      }

      if (profile?.id) {
        const { data: meus } = await supabase.from('posts')
          .select('pontos').eq('user_id', profile.id).eq('status', 'approved');
        setMeusPontos((meus || []).reduce((a, x) => a + (x.pontos || 0), 0));
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
        const ativos = (prof.data || []).map(p => ({ nome: p.nome_exibicao, ativo: true, id: p.id }));
        const pendentes = (pend.data || []).map(p => ({ nome: p.nome_exibicao, ativo: false, id: `pc-${p.id}` }));
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {colegas.map(c => {
                const souEu = c.id === profile.id;
                return (
                  <div key={c.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: souEu ? 'var(--amarelo-soft)' : 'rgba(255,255,255,0.03)',
                    borderRadius: 3,
                    borderLeft: `2px solid ${souEu ? 'var(--amarelo)' : profile.groups.cor}`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: profile.groups.cor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--azul)', fontWeight: 700, fontSize: 12,
                      fontFamily: 'Rajdhani',
                      opacity: c.ativo ? 1 : 0.5,
                    }}>
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13, color: c.ativo ? '#fff' : 'var(--branco-45)' }}>
                      {c.nome}
                      {souEu && <span style={{ color: 'var(--amarelo)', fontSize: 10, marginLeft: 6, letterSpacing: 1 }}>VOCÊ</span>}
                      {!c.ativo && <div style={{ fontSize: 9, color: 'var(--branco-45)', letterSpacing: 1 }}>ainda não logou</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Ranking grupos */}
      <h3 style={{ marginBottom: 12 }}>Placar dos grupos</h3>
      <div className="card">
        {rankingGrupos.length === 0 && (
          <div style={{ color: 'var(--branco-45)', fontSize: 12 }}>Ainda sem pontos aprovados.</div>
        )}
        {rankingGrupos.map((g, i) => (
          <RankingBar key={g.id} nome={g.nome} pontos={g.pontos} max={maxPontos} cor={g.cor} posicao={i + 1} />
        ))}
      </div>
    </div>
  );
}
