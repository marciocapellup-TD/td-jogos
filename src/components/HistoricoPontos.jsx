import { useEffect, useState } from 'react';
import { fetchApprovedPostsByUser } from '../lib/supabase';
import { CATEGORIAS, CULTURA_LABEL, HORARIO_LABEL } from '../lib/scoring';
import { formatarDataBR } from '../lib/dates';

// "O que a pessoa fez" — texto curto por pilar, derivado dos campos do post.
function descricaoPost(p) {
  switch (p.categoria) {
    case 'energia': {
      const n = p.quantidade_frutas || 0;
      return `${n} fruta${n === 1 ? '' : 's'}`;
    }
    case 'salada':
      return 'Salada / vegetal';
    case 'hidratacao':
      return HORARIO_LABEL[p.horario]?.label || 'Hidratação';
    case 'movimento':
    case 'mental': {
      const min = Number(p.minutos) || 0;
      const seg = Number(p.segundos) || 0;
      return seg > 0 ? `${min}min ${String(seg).padStart(2, '0')}s` : `${min} min`;
    }
    case 'cultura':
      return CULTURA_LABEL[p.tipo_cultura]?.label || 'Cultura';
    default:
      return '';
  }
}

// Histórico de pontos de um usuário (drill-down do ranking). Fetch lazy: só
// busca quando o componente monta (ou seja, quando a linha é expandida).
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

  return (
    <div>
      {posts.map((p, i) => {
        const cat = CATEGORIAS[p.categoria];
        return (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              padding: '6px 0', fontSize: 12,
              borderBottom: i < posts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{cat?.emoji || '•'}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: cat?.cor || 'var(--branco-70)', fontWeight: 600 }}>{cat?.label || p.categoria}</span>
              <span style={{ color: 'var(--branco-70)' }}> · {descricaoPost(p)}</span>
              {p.comentario && (
                <span style={{
                  display: 'block', color: 'var(--branco-45)', fontSize: 11, marginTop: 2,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {p.comentario}
                </span>
              )}
            </span>
            <span style={{ color: 'var(--branco-45)', whiteSpace: 'nowrap' }}>{formatarDataBR(p.data_registro)}</span>
            <span style={{ color: 'var(--amarelo)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 38, textAlign: 'right' }}>
              +{p.pontos}pt
            </span>
          </div>
        );
      })}
    </div>
  );
}
