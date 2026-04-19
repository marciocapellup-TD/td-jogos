export default function StatCard({ label, value, sub, cor }) {
  return (
    <div className="card" style={cor ? { borderTopColor: cor } : null}>
      <div className="label">{label}</div>
      <div style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 28,
        fontWeight: 700,
        color: 'var(--amarelo)',
        marginTop: 4,
        lineHeight: 1.1,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--branco-45)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
