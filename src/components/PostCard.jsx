import { CATEGORIAS } from '../lib/scoring';

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
            {new Date(post.data_registro).toLocaleDateString('pt-BR')}
            {post.profiles?.nome_exibicao && <> · {post.profiles.nome_exibicao}</>}
          </div>
        </div>
        <span className={`badge ${statusBadge.cls}`}>{statusBadge.label}</span>
      </div>

      {post.foto_url && (
        <img src={post.foto_url} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 3 }} />
      )}

      <div style={{ fontSize: 12, color: 'var(--branco-70)' }}>
        {post.categoria === 'energia' && <>🍎 {post.quantidade_frutas} fruta{post.quantidade_frutas > 1 ? 's' : ''}</>}
        {post.categoria !== 'energia' && post.minutos && <>⏱️ {post.minutos} minuto{post.minutos > 1 ? 's' : ''}</>}
      </div>

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
