// Pódio do resultado oficial da Etapa 2 — top 3 + prêmios.
// Reusa as animações premio-pulse / premio-emoji-bounce do globals.css
// (mesma linguagem visual da seção Premiação em Regras).
// Props:
//   top3   — array (até 3) de { posicao, nome, pontos }
//   premios — PREMIOS_ETAPA2 (emoji, posicao, premio, detalhes, cor)
//   maxAcumulado — opcional, mostra "pontos/max pts"
export default function Podio({ top3 = [], premios = [], maxAcumulado }) {
  // Zipa cada prêmio (ordem 1,2,3) com o colocado correspondente.
  const cards = premios
    .map((p, i) => ({ premio: p, ranked: top3[i] }))
    .filter((c) => c.ranked);

  if (cards.length === 0) {
    return <div style={{ color: 'var(--branco-45)' }}>Sem participantes ranqueados ainda.</div>;
  }

  return (
    <div className="grid-cards" style={{ marginBottom: 24 }}>
      {cards.map(({ premio, ranked }) => (
        <div
          key={premio.ordem}
          className={`card premio-pulse premio-pulse-${premio.ordem}`}
          style={{ borderTopColor: premio.cor, textAlign: 'center', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ fontSize: 50, marginBottom: 2 }} className="premio-emoji-bounce">{premio.emoji}</div>
          <div className="label" style={{ color: premio.cor, letterSpacing: 1.5 }}>{premio.posicao}</div>

          <div style={{
            fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700,
            color: '#fff', marginTop: 4, lineHeight: 1.15,
          }}>
            {ranked.nome}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--amarelo)', marginTop: 2 }}>
            {ranked.pontos}
            {maxAcumulado != null && maxAcumulado > 0 && (
              <span style={{ color: 'var(--branco-45)', fontWeight: 500 }}>/{maxAcumulado}</span>
            )}
            <span style={{ fontSize: 10, color: 'var(--branco-45)', fontWeight: 500, marginLeft: 2 }}>pts</span>
          </div>

          <div style={{
            marginTop: 10, paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700,
              color: 'var(--amarelo)', lineHeight: 1.2,
            }}>
              {premio.premio}
            </div>
            {premio.detalhes && (
              <div style={{ fontSize: 11, color: 'var(--branco-70)', marginTop: 6, lineHeight: 1.5 }}>
                {premio.detalhes}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
