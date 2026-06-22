import { useEffect, useState } from 'react';
import { fetchApprovedPostsByUser } from '../lib/supabase';
import { CATEGORIAS } from '../lib/scoring';

// Quantidade-resumo por pilar: texto curto a partir do agregado.
function quantidadeLabel(categoria, agg) {
  switch (categoria) {
    case 'energia':    return `${agg.frutas} fruta${agg.frutas === 1 ? '' : 's'}`;
    case 'salada':     return `${agg.n} refeiç${agg.n === 1 ? 'ão' : 'ões'}`;
    case 'hidratacao': return `${agg.n} registro${agg.n === 1 ? '' : 's'}`;
    case 'movimento':
    case 'mental':     return `${agg.min} min`;
    case 'cultura':    return `${agg.n} atividade${agg.n === 1 ? '' : 's'}`;
    default:           return `${agg.n}×`;
  }
}

// Histórico de pontos de um usuário (drill-down do ranking), RESUMIDO por pilar:
// uma linha por pilar (em vez de uma por post), pra lista não ficar enorme.
// Fetch lazy: só busca quando o componente monta (linha expandida).
export default function HistoricoPontos({ userId, dataDe, dataAte }) {
  const [posts, setPosts] = useState(null); // null = carregando

  useEffect(() => {
    let mounted = true;
    fetchApprovedPostsByUser(userId, { dataDe, dataAte }).then((data) => {
      if (mounted) setPosts(data);
    });
    return () => { mounted = false; };
  }, [userId, dataDe, dataAte]);

  if (posts === null) {
    return <div style={{ fontSize: 12, color: 'var(--branco-45)', padding: '4px 0' }}>Carregando...</div>;
  }
  if (posts.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--branco-45)', padding: '4px 0' }}>Nenhum registro nesta etapa.</div>;
  }

  // Agrega por categoria: contagem, pontos, frutas e minutos.
  const porCat = {};
  for (const p of posts) {
    const c = p.categoria;
    if (!porCat[c]) porCat[c] = { n: 0, pts: 0, frutas: 0, min: 0 };
    porCat[c].n += 1;
    porCat[c].pts += p.pontos || 0;
    porCat[c].frutas += p.quantidade_frutas || 0;
    porCat[c].min += Math.round(((Number(p.minutos) || 0) * 60 + (Number(p.segundos) || 0)) / 60);
  }

  // Ordem canônica de CATEGORIAS, só pilares com registro.
  const linhas = Object.keys(CATEGORIAS).filter((c) => porCat[c]);

  return (
    <div>
      {linhas.map((c, i) => {
        const cat = CATEGORIAS[c];
        const agg = porCat[c];
        return (
          <div
            key={c}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              padding: '6px 0', fontSize: 12,
              borderBottom: i < linhas.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{cat.emoji}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: cat.cor, fontWeight: 600 }}>{cat.label}</span>
              <span style={{ color: 'var(--branco-70)' }}> · {quantidadeLabel(c, agg)}</span>
            </span>
            <span style={{ color: 'var(--amarelo)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 38, textAlign: 'right' }}>
              {agg.pts} pt{agg.pts === 1 ? '' : 's'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
