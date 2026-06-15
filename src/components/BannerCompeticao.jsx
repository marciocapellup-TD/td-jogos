import { statusCompeticao } from '../lib/competicao';

export default function BannerCompeticao() {
  const status = statusCompeticao();
  if (status === 'em-andamento') return null;

  if (status === 'entre-etapas') {
    return (
      <Faixa background="var(--amarelo)" color="var(--azul)" borderBottom="2px solid rgba(0,0,0,0.15)">
        <strong style={{ fontSize: 17, letterSpacing: 1, textTransform: 'uppercase' }}>
          ⚡ Etapa 3 começa em 22/06!
        </strong>{' '}
        30 dias corridos, 6 pilares e sem teto de pontos. Veja as regras e prepare a estratégia. Bora!
      </Faixa>
    );
  }

  if (status === 'ultimo-dia') {
    return (
      <Faixa background="var(--amarelo)" color="var(--azul)" borderBottom="2px solid rgba(0,0,0,0.15)">
        <strong style={{ fontSize: 17, letterSpacing: 1, textTransform: 'uppercase' }}>
          🔥 Último dia!
        </strong>{' '}
        Hoje é a reta final da Etapa 3. Cada ponto conta — registre tudo que fizer hoje. Bora!
      </Faixa>
    );
  }

  // status === 'encerrada'
  return (
    <div style={{
      background: 'var(--azul)',
      color: 'var(--branco-70, #cfd6df)',
      padding: '12px 20px',
      textAlign: 'center',
      fontSize: 14,
      borderBottom: '1px solid var(--amarelo)',
    }}>
      <strong style={{ color: 'var(--amarelo)' }}>Competição encerrada.</strong>{' '}
      Obrigado pela dedicação nesses 30 dias da Etapa 3! O ranking final tá fixo e em breve a gente solta as próximas metas. 💪
    </div>
  );
}

function Faixa({ background, color, borderBottom, children }) {
  return (
    <div style={{
      background, color, borderBottom,
      padding: '12px 20px',
      textAlign: 'center',
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: 0.5,
    }}>
      {children}
    </div>
  );
}
