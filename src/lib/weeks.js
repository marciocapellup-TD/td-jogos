// Regras do desafio — mantidas em sincronia com a função SQL calcular_pontos.

export const DATA_INICIO = new Date(2026, 3, 20); // 20/04/2026 (mês 0-indexado)
export const DATA_FIM = new Date(2026, 4, 10);    // 10/05/2026
export const TOTAL_DIAS_DESAFIO = 21;

export const METAS = {
  movimento: { 1: 20, 2: 25, 3: 30 },
  mental:    { 1: 3,  2: 4,  3: 5  },
  energia_max_dia: 2,
  pontos: { energia: 1, movimento: 3, mental: 2 },
};

// Maximo teorico de pontos por pessoa por dia:
// 2 frutas (+2) + 1 movimento na meta (+3) + 1 mental na meta (+2) = 7 pts
export const MAX_PONTOS_DIA_PESSOA = 7;

// Cap fixo por grupo por dia (equidade entre grupos de 5 e 6 pessoas).
// Assume cenario-base: 5 pessoas * 7 pts = 35 pts/dia.
export const MAX_PONTOS_DIA_GRUPO = 35;

export function maxPontosDiaGrupo(/* tamanhoGrupo ignorado */) {
  return MAX_PONTOS_DIA_GRUPO;
}

// Aplica cap diario nos pontos do grupo. Soma pontos por dia_registro,
// limita cada dia ao cap, retorna total e pontos de hoje.
export function aplicarCapDiarioGrupo(postsDoGrupo, hojeIso) {
  const porDia = {};
  for (const p of postsDoGrupo) {
    const d = p.data_registro;
    porDia[d] = (porDia[d] || 0) + (p.pontos || 0);
  }
  let total = 0;
  let totalHoje = 0;
  for (const [data, pts] of Object.entries(porDia)) {
    const capped = Math.min(pts, MAX_PONTOS_DIA_GRUPO);
    total += capped;
    if (data === hojeIso) totalHoje = capped;
  }
  return { total, totalHoje };
}

function daysBetween(a, b) {
  const MS = 1000 * 60 * 60 * 24;
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((A - B) / MS);
}

export function calculaSemanaAtual(hoje = new Date()) {
  const diff = daysBetween(hoje, DATA_INICIO);
  if (diff < 0) return 0;                // pré-desafio
  const semana = Math.floor(diff / 7) + 1;
  return semana > 3 ? 4 : semana;        // 4 = encerrado
}

export function diasRestantes(hoje = new Date()) {
  const diff = daysBetween(DATA_FIM, hoje);
  return Math.max(0, diff);
}

export function diasDecorridos(hoje = new Date()) {
  const diff = daysBetween(hoje, DATA_INICIO) + 1;
  return Math.max(0, Math.min(TOTAL_DIAS_DESAFIO, diff));
}

export function metasDaSemana(semana) {
  if (semana < 1 || semana > 3) return null;
  return {
    semana,
    energia: { limite: METAS.energia_max_dia, pontos_por_unidade: METAS.pontos.energia },
    movimento: { minutos: METAS.movimento[semana], pontos: METAS.pontos.movimento },
    mental: { minutos: METAS.mental[semana], pontos: METAS.pontos.mental },
  };
}

// Maximo acumulado ate hoje (inclusive). Pre-desafio = 0.
export function maxAcumuladoPessoa(hoje = new Date()) {
  return diasDecorridos(hoje) * MAX_PONTOS_DIA_PESSOA;
}

export function maxAcumuladoGrupo(_tamanhoIgnorado, hoje = new Date()) {
  return diasDecorridos(hoje) * MAX_PONTOS_DIA_GRUPO;
}
