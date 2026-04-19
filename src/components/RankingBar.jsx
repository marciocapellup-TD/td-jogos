export default function RankingBar({ nome, pontos, max, cor, posicao }) {
  const pct = max > 0 ? (pontos / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 4,
        fontFamily: 'Rajdhani, sans-serif',
      }}>
        <span style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
          {posicao && <span style={{ color: 'var(--amarelo)', marginRight: 8 }}>#{posicao}</span>}
          {nome}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--amarelo)' }}>{pontos} pts</span>
      </div>
      <div style={{
        height: 10,
        background: 'rgba(255,255,255,0.07)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(100, pct)}%`,
          height: '100%',
          background: cor || 'var(--amarelo)',
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}
