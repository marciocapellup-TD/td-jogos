import { CATEGORIAS, HORARIO_LABEL } from '../lib/scoring';
import { formatarDataBR } from '../lib/dates';

function formatarDuracao(minutos, segundos) {
  const min = Number(minutos) || 0;
  const seg = Number(segundos) || 0;
  if (seg === 0) return `${min} min`;
  return `${min}min ${String(seg).padStart(2, '0')}s`;
}

export default function PostCard({ post, children }) {
  const cat = CATEGORIAS[post.categoria];
  const statusBadge = {
    pending:  { cls: 'badge-pending',  label: 'Pendente' },
    approved: { cls: 'badge-approved', label: `Aprovado +${post.pontos}pt` },
    rejected: { cls: 'badge-rejected', label: 'Reprovado' },
  }[post.status];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div className="label" style={{ color: cat.cor }}>{cat.emoji} {cat.label}</div>
          <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 3 }}>
            {formatarDataBR(post.data_registro)}
            {post.profiles?.nome_exibicao && <> · {post.profiles.nome_exibicao}</>}
          </div>
        </div>
        <span className={`badge ${statusBadge.cls}`}>{statusBadge.label}</span>
      </div>

      {post.foto_liberada ? (
        <div style={{
          display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          padding: '28px 16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: 3,
          fontSize: 12, color: 'var(--branco-45)',
          flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 22 }}>🗑️</div>
          <div>Foto removida para liberar espaço</div>
          <div style={{ fontSize: 10, color: 'var(--branco-45)' }}>
            (o post continua valendo)
          </div>
        </div>
      ) : post.foto_url ? (
        <img
          src={post.foto_url}
          alt=""
          style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 3 }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const placeholder = e.currentTarget.nextElementSibling;
            if (placeholder) placeholder.style.display = 'flex';
          }}
        />
      ) : null}
      {!post.foto_liberada && post.foto_url && (
        <div style={{
          display: 'none',
          alignItems: 'center', justifyContent: 'center',
          padding: '28px 16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: 3,
          fontSize: 12, color: 'var(--branco-45)',
          flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 22 }}>🖼️</div>
          <div>Foto indisponível</div>
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>
        {post.categoria === 'energia' && post.tipo_alimento === 'fruta' && (
          <>🍎 {post.quantidade_frutas} fruta{post.quantidade_frutas > 1 ? 's' : ''}</>
        )}
        {post.categoria === 'energia' && post.tipo_alimento === 'vegetal' && (
          <>🥗 Vegetal/Salada</>
        )}
        {post.categoria === 'energia' && !post.tipo_alimento && post.quantidade_frutas != null && (
          <>🍎 {post.quantidade_frutas} fruta{post.quantidade_frutas > 1 ? 's' : ''}</>
        )}
        {post.categoria === 'hidratacao' && post.horario && (
          <>{HORARIO_LABEL[post.horario]?.emoji} {HORARIO_LABEL[post.horario]?.label}</>
        )}
        {(post.categoria === 'movimento' || post.categoria === 'mental') && post.minutos != null && (
          <>⏱️ {formatarDuracao(post.minutos, post.segundos)}</>
        )}
      </div>

      {post.comentario && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderLeft: '3px solid var(--amarelo)',
          padding: '8px 12px',
          fontSize: 13,
          color: 'var(--branco-70)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {post.comentario}
        </div>
      )}

      {post.status === 'rejected' && post.motivo_reprovacao && (
        <div style={{
          background: 'rgba(192,57,43,0.12)',
          borderLeft: '3px solid var(--vermelho)',
          padding: '8px 10px',
          fontSize: 12,
        }}>
          <strong>Motivo:</strong> {post.motivo_reprovacao}
        </div>
      )}

      {children}
    </div>
  );
}
