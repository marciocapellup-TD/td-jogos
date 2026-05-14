import { hojeISO } from './dates';

// --- Janelas ---
// Etapa 1: 20/04 → 10/05/2026 (encerrada)
// Entre-etapas: 11/05 → 17/05/2026
// Etapa 2: 18/05 → 07/06/2026
export const DATA_INICIO_ETAPA1 = '2026-04-20';
export const DATA_FIM_ETAPA1    = '2026-05-10';
export const DATA_INICIO_ETAPA2 = '2026-05-18';
export const DATA_FIM_ETAPA2    = '2026-06-07';

// Aliases (Etapa 2 é a "atual")
export const DATA_INICIO       = DATA_INICIO_ETAPA2;
export const DATA_ULTIMO_DIA   = DATA_FIM_ETAPA2;
export const DATA_PRIMEIRO_DIA_ENCERRADO = '2026-06-08';

// 'etapa1' | 'entre-etapas' | 'etapa2-andamento' | 'etapa2-ultimo-dia' | 'etapa2-encerrada'
export function statusEtapa(hoje = hojeISO()) {
  if (hoje <= DATA_FIM_ETAPA1) return 'etapa1';
  if (hoje < DATA_INICIO_ETAPA2) return 'entre-etapas';
  if (hoje < DATA_FIM_ETAPA2) return 'etapa2-andamento';
  if (hoje === DATA_FIM_ETAPA2) return 'etapa2-ultimo-dia';
  return 'etapa2-encerrada';
}

// Status simples (compat com BannerCompeticao e demais consumidores)
// 'em-andamento' | 'ultimo-dia' | 'encerrada' | 'entre-etapas'
export function statusCompeticao(hoje = hojeISO()) {
  const s = statusEtapa(hoje);
  if (s === 'entre-etapas') return 'entre-etapas';
  if (s === 'etapa2-andamento') return 'em-andamento';
  if (s === 'etapa2-ultimo-dia') return 'ultimo-dia';
  if (s === 'etapa2-encerrada') return 'encerrada';
  // Etapa 1 (datas <= 10/05): tratamos como 'encerrada' para fins de UI da Etapa 2.
  return 'encerrada';
}

export const ehUltimoDia          = (hoje) => statusCompeticao(hoje) === 'ultimo-dia';
export const competicaoEncerrada  = (hoje) => statusCompeticao(hoje) === 'encerrada';
export const entreEtapas          = (hoje) => statusCompeticao(hoje) === 'entre-etapas';
