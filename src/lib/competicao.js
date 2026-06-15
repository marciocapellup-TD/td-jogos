import { hojeISO } from './dates';

// --- Janelas ---
// Etapa 1: 20/04 → 10/05/2026 (encerrada, histórico)
// Etapa 2: 18/05 → 07/06/2026 (encerrada, histórico)
// Entre-etapas: 08/06 → 21/06/2026
// Etapa 3: 22/06 → 21/07/2026 (ATUAL) — 30 dias corridos
export const DATA_INICIO_ETAPA1 = '2026-04-20';
export const DATA_FIM_ETAPA1    = '2026-05-10';
export const DATA_INICIO_ETAPA2 = '2026-05-18';
export const DATA_FIM_ETAPA2    = '2026-06-07';
export const DATA_INICIO_ETAPA3 = '2026-06-22';
export const DATA_FIM_ETAPA3    = '2026-07-21';

// Aliases (Etapa 3 é a "atual")
export const DATA_INICIO       = DATA_INICIO_ETAPA3;
export const DATA_ULTIMO_DIA   = DATA_FIM_ETAPA3;
export const DATA_PRIMEIRO_DIA_ENCERRADO = '2026-07-22';

// 'entre-etapas' | 'etapa3-andamento' | 'etapa3-ultimo-dia' | 'etapa3-encerrada'
// (E1/E2 já são passado; o Dashboard acessa o histórico via toggle explícito.)
export function statusEtapa(hoje = hojeISO()) {
  if (hoje < DATA_INICIO_ETAPA3) return 'entre-etapas';
  if (hoje < DATA_FIM_ETAPA3) return 'etapa3-andamento';
  if (hoje === DATA_FIM_ETAPA3) return 'etapa3-ultimo-dia';
  return 'etapa3-encerrada';
}

// Status simples (compat com BannerCompeticao e demais consumidores)
// 'em-andamento' | 'ultimo-dia' | 'encerrada' | 'entre-etapas'
export function statusCompeticao(hoje = hojeISO()) {
  const s = statusEtapa(hoje);
  if (s === 'entre-etapas') return 'entre-etapas';
  if (s === 'etapa3-andamento') return 'em-andamento';
  if (s === 'etapa3-ultimo-dia') return 'ultimo-dia';
  return 'encerrada';
}

export const ehUltimoDia          = (hoje) => statusCompeticao(hoje) === 'ultimo-dia';
export const competicaoEncerrada  = (hoje) => statusCompeticao(hoje) === 'encerrada';
export const entreEtapas          = (hoje) => statusCompeticao(hoje) === 'entre-etapas';
