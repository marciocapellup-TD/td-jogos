// Pódio do resultado oficial da Etapa 1 (por GRUPO) — só reconhecimento.
// Medalha + nome do grupo + pontos, sem cards de prêmio. Reusa as animações
// premio-pulse / premio-emoji-bounce do globals.css (mesma linguagem do Podio).
// Props:
//   top3 — array (até 3) de { posicao, nome, pontos, cor }
const MEDALHAS = [
  { emoji: '🥇', posicao: 'Grupo campeão', cor: '#F4CC04' },
  { emoji: '🥈', posicao: '2º lugar',      cor: '#C0C0C0' },
  { emoji: '🥉', posicao: '3º lugar',      cor: '#CD7F32' },
];

export default function PodioGrupos({ top3 = [] }) {
  const cards = top3.slice(0, 3);
  if (cards.length === 0) {
    return <div style={{ color: 'var(--branco-45)' }}>Sem grupos ranqueados ainda.</div>;
  }

  return (
    <div className="grid-cards" style={{ marginBottom: 24 }}>
      {cards.map((g, i) => {
        const m = MEDALHAS[i];
        return (
          <div
            key={`${m.posicao}-${g.nome}`}
            className={`card premio-pulse premio-pulse-${i + 1}`}
            style={{ borderTopColor: g.cor || m.cor, textAlign: 'center', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ fontSize: 50, marginBottom: 2 }} className="premio-emoji-bounce">{m.emoji}</div>
            <div className="label" style={{ color: m.cor, letterSpacing: 1.5 }}>{m.posicao}</div>

            <div style={{
              fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700,
              color: '#fff', marginTop: 4, lineHeight: 1.15,
            }}>
              {g.nome}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--amarelo)', marginTop: 2 }}>
              {g.pontos}
              <span style={{ fontSize: 10, color: 'var(--branco-45)', fontWeight: 500, marginLeft: 2 }}>pts</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
