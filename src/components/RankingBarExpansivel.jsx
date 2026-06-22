import { useState } from 'react';
import RankingBar from './RankingBar';
import HistoricoPontos from './HistoricoPontos';

// Linha de ranking clicável: clica → expande e mostra o histórico de pontos da
// pessoa (drill-down). Envolve a RankingBar (que ganha um caret quando expansível)
// e renderiza HistoricoPontos indentado, no mesmo padrão visual do GrupoExpandido.
export default function RankingBarExpansivel({
  userId, dataDe, dataAte, cor, ...rankingProps
}) {
  const [aberto, setAberto] = useState(false);

  const toggle = () => setAberto((v) => !v);

  return (
    <div>
      <div
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
        style={{ cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        <RankingBar {...rankingProps} cor={cor} expansivel aberto={aberto} />
      </div>
      {aberto && (
        <div style={{
          margin: '0 0 14px 18px', paddingLeft: 14,
          borderLeft: `2px solid ${cor || 'var(--amarelo)'}`,
        }}>
          <HistoricoPontos userId={userId} dataDe={dataDe} dataAte={dataAte} />
        </div>
      )}
    </div>
  );
}
