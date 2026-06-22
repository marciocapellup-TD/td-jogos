export default function RankingBar({
  nome, pontos, max, cor, posicao,
  pontosHoje, maxHoje, maxAcumulado,
  expansivel, aberto,
}) {
  const pct = max > 0 ? (pontos / max) * 100 : 0;
  const bateuHoje = maxHoje && pontosHoje >= maxHoje;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 4,
        fontFamily: 'Rajdhani, sans-serif',
        flexWrap: 'wrap',
        gap: 6,
      }}>
        <span style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
          {expansivel && (
            <span style={{
              display: 'inline-block', width: 12, textAlign: 'center',
              color: 'var(--branco-45)', marginRight: 6, fontSize: 10,
              transition: 'transform 0.2s',
              transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)',
            }}>▶</span>
          )}
          {posicao && <span style={{ color: 'var(--amarelo)', marginRight: 8 }}>#{posicao}</span>}
          {nome}
          {bateuHoje && (
            <span style={{
              background: 'var(--verde)', color: '#fff',
              fontSize: 9, letterSpacing: 1, fontWeight: 700,
              padding: '2px 6px', borderRadius: 3, marginLeft: 8,
            }}>
              🎉 META DO DIA
            </span>
          )}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--amarelo)' }}>
          {pontos}
          {maxAcumulado != null && maxAcumulado > 0 && (
            <span style={{ color: 'var(--branco-45)', fontWeight: 500 }}>
              /{maxAcumulado}
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--branco-45)', fontWeight: 500, marginLeft: 2 }}>pts</span>
        </span>
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

      {maxHoje != null && (
        <div style={{
          fontSize: 10, color: 'var(--branco-45)',
          marginTop: 4, letterSpacing: 1,
          fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, textTransform: 'uppercase',
        }}>
          Hoje: {pontosHoje || 0}/{maxHoje}
        </div>
      )}
    </div>
  );
}
