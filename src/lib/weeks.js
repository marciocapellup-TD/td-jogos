// Regras do desafio — mantidas em sincronia com a função SQL calcular_pontos.
// Desafio tem 21 DIAS ÚTEIS (não corridos). Fins de semana e feriados
// não pontuam.

export const DATA_INICIO = new Date(2026, 3, 20); // 20/04/2026 (seg)
export const DATA_FIM = new Date(2026, 4, 20);    // 20/05/2026 (qua) — 21º dia útil
export const TOTAL_DIAS_DESAFIO = 21; // dias úteis

// Feriados nacionais dentro do período (formato YYYY-MM-DD)
export const FERIADOS = ['2026-04-21', '2026-05-01'];

// Fim de cada uma das 3 semanas (inclusivo). Metas crescentes.
export const FIM_SEMANA_1 = new Date(2026, 3, 29); // 29/04 qua — dia útil 7
export const FIM_SEMANA_2 = new Date(2026, 4, 11); // 11/05 seg — dia útil 14

export const METAS = {
  movimento: { 1: 20, 2: 25, 3: 30 },
  mental:    { 1: 3,  2: 4,  3: 5  },
  energia_max_dia: 2,
  pontos: { energia: 1, movimento: 3, mental: 2 },
};

// Maximo por pessoa por dia: 2 frutas (+2) + movimento (+3) + mental (+2) = 7
export const MAX_PONTOS_DIA_PESSOA = 7;
// Cap fixo por grupo (equidade entre grupos de 5 e 6 pessoas)
export const MAX_PONTOS_DIA_GRUPO = 35;

export function maxPontosDiaGrupo() { return MAX_PONTOS_DIA_GRUPO; }

function normaliza(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function dataIso(data) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ehDiaUtil(data = new Date()) {
  const dow = data.getDay();
  if (dow === 0 || dow === 6) return false;
  return !FERIADOS.includes(dataIso(data));
}

export function motivoNaoPontua(data = new Date()) {
  const dow = data.getDay();
  if (dow === 0) return 'domingo — não pontua';
  if (dow === 6) return 'sábado — não pontua';
  const iso = dataIso(data);
  if (iso === '2026-04-21') return 'feriado (Tiradentes) — não pontua';
  if (iso === '2026-05-01') return 'feriado (Dia do Trabalho) — não pontua';
  return null;
}

// Conta dias úteis no intervalo [inicio, fim] (ambos inclusivos).
export function contarDiasUteis(inicio, fim) {
  let count = 0;
  const cursor = normaliza(inicio);
  const limite = normaliza(fim);
  while (cursor <= limite) {
    if (ehDiaUtil(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function daysBetween(a, b) {
  const MS = 1000 * 60 * 60 * 24;
  return Math.floor((normaliza(a) - normaliza(b)) / MS);
}

// Semana do desafio (1, 2 ou 3) baseada em dias úteis decorridos.
// Semana 1: úteis 1-7 (20/04 a 29/04) · meta mov 20min / mental 3min
// Semana 2: úteis 8-14 (30/04 a 11/05) · meta mov 25min / mental 4min
// Semana 3: úteis 15-21 (12/05 a 20/05) · meta mov 30min / mental 5min
export function calculaSemanaAtual(hoje = new Date()) {
  const h = normaliza(hoje);
  if (h < DATA_INICIO) return 0;
  if (h > DATA_FIM) return 4;
  if (h <= FIM_SEMANA_1) return 1;
  if (h <= FIM_SEMANA_2) return 2;
  return 3;
}

// Semana em que cai uma DATA específica (pra função de pontuação).
export function semanaDa(data) {
  return calculaSemanaAtual(data);
}

export function diasRestantes(hoje = new Date()) {
  const h = normaliza(hoje);
  if (h > DATA_FIM) return 0;
  if (h < DATA_INICIO) return TOTAL_DIAS_DESAFIO;
  // dias úteis de amanhã até DATA_FIM
  const amanha = new Date(h);
  amanha.setDate(amanha.getDate() + 1);
  return contarDiasUteis(amanha, DATA_FIM);
}

// Dias úteis decorridos no desafio (incluindo hoje se hoje for útil)
export function diasDecorridos(hoje = new Date()) {
  const h = normaliza(hoje);
  if (h < DATA_INICIO) return 0;
  const ate = h > DATA_FIM ? DATA_FIM : h;
  return Math.min(TOTAL_DIAS_DESAFIO, contarDiasUteis(DATA_INICIO, ate));
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

// Maximo acumulado ate hoje (baseado em dias uteis decorridos)
export function maxAcumuladoPessoa(hoje = new Date()) {
  return diasDecorridos(hoje) * MAX_PONTOS_DIA_PESSOA;
}

export function maxAcumuladoGrupo(_tamanhoIgnorado, hoje = new Date()) {
  return diasDecorridos(hoje) * MAX_PONTOS_DIA_GRUPO;
}

// Aplica cap diario nos pontos do grupo.
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
