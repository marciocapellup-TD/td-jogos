// Regras do desafio — mantidas em sincronia com a função SQL calcular_pontos.
// Etapa 2 (18/05 → 07/06/2026) é a competição ATUAL. Etapa 1 (20/04 → 10/05)
// permanece como histórico para a vista do Dashboard.

// ---------- Etapa 2 (atual) ----------
export const DATA_INICIO = new Date(2026, 4, 18); // 18/05/2026 (seg)
export const DATA_FIM    = new Date(2026, 5, 7);  //  7/06/2026 (dom)
export const TOTAL_DIAS_DESAFIO = 21;

export const METAS_ETAPA2 = {
  movimento: { 1: 40, 2: 45, 3: 50 },
  mental:    { 1: 5,  2: 6,  3: 7  },
  pontos: { fruta: 1, vegetal: 1, hidratacao: 1, movimento: 4, mental: 2 },
  energia_max_frutas_dia: 2,   // dentro de 1 post
  hidratacao_horarios: ['manha', 'tarde', 'noite'],
};

// Alias (compat com chamadas antigas — agora aponta para Etapa 2)
export const METAS = METAS_ETAPA2;

// Max diário por pessoa (Etapa 2): 2 frutas + 1 vegetal + 3 hidratação + 4 mov + 2 mental
export const MAX_PONTOS_DIA_PESSOA = 12;
export const MAX_PONTOS_CICLO = 252; // 12 × 21

// ---------- Etapa 1 (histórico) ----------
export const DATA_INICIO_ETAPA1 = new Date(2026, 3, 20); // 20/04/2026
export const DATA_FIM_ETAPA1    = new Date(2026, 4, 10); // 10/05/2026
export const METAS_ETAPA1 = {
  movimento: { 1: 20, 2: 25, 3: 30 },
  mental:    { 1: 3,  2: 4,  3: 5  },
  energia_max_dia: 2,
  pontos: { energia: 1, movimento: 3, mental: 2 },
};
// Cap fixo por grupo da Etapa 1 (equidade entre grupos de 5 e 6 pessoas).
// Mantido para queries históricas do Dashboard.
export const MAX_PONTOS_DIA_GRUPO = 35;

export function maxPontosDiaGrupo() { return MAX_PONTOS_DIA_GRUPO; }

// ---------- Utilitários de data ----------
function daysBetween(a, b) {
  const MS = 1000 * 60 * 60 * 24;
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((A - B) / MS);
}

// Semana do desafio (1, 2 ou 3) relativa à Etapa 2.
// Semana 1: 18/05–24/05 · mov 40min / mental 5min
// Semana 2: 25/05–31/05 · mov 45min / mental 6min
// Semana 3: 01/06–07/06 · mov 50min / mental 7min
export function calculaSemanaAtual(hoje = new Date()) {
  return calculaSemana(hoje, 'etapa2');
}

// Calcula semana baseada na etapa. Útil para o Dashboard que mostra Etapa 1 e 2.
export function calculaSemana(hoje = new Date(), etapa = 'etapa2') {
  const inicio = etapa === 'etapa1' ? DATA_INICIO_ETAPA1 : DATA_INICIO;
  const diff = daysBetween(hoje, inicio);
  if (diff < 0) return 0;
  const semana = Math.floor(diff / 7) + 1;
  return semana > 3 ? 4 : semana;
}

export function diasRestantes(hoje = new Date()) {
  const diff = daysBetween(DATA_FIM, hoje);
  return Math.max(0, diff);
}

export function diasDecorridos(hoje = new Date()) {
  const diff = daysBetween(hoje, DATA_INICIO) + 1;
  return Math.max(0, Math.min(TOTAL_DIAS_DESAFIO, diff));
}

// Metas da semana (Etapa 2 por padrão).
export function metasDaSemana(semana, etapa = 'etapa2') {
  if (semana < 1 || semana > 3) return null;
  if (etapa === 'etapa1') {
    return {
      semana,
      energia:   { limite: METAS_ETAPA1.energia_max_dia, pontos_por_unidade: METAS_ETAPA1.pontos.energia },
      movimento: { minutos: METAS_ETAPA1.movimento[semana], pontos: METAS_ETAPA1.pontos.movimento },
      mental:    { minutos: METAS_ETAPA1.mental[semana],    pontos: METAS_ETAPA1.pontos.mental    },
    };
  }
  return {
    semana,
    energia:    { fruta_max: METAS_ETAPA2.energia_max_frutas_dia, fruta_pts: METAS_ETAPA2.pontos.fruta, vegetal_pts: METAS_ETAPA2.pontos.vegetal },
    hidratacao: { horarios: METAS_ETAPA2.hidratacao_horarios, pontos_por_horario: METAS_ETAPA2.pontos.hidratacao },
    movimento:  { minutos: METAS_ETAPA2.movimento[semana], pontos: METAS_ETAPA2.pontos.movimento },
    mental:     { minutos: METAS_ETAPA2.mental[semana],    pontos: METAS_ETAPA2.pontos.mental    },
  };
}

// Máximo acumulado por pessoa baseado em dias decorridos.
export function maxAcumuladoPessoa(hoje = new Date()) {
  return diasDecorridos(hoje) * MAX_PONTOS_DIA_PESSOA;
}

// --------- Funções legadas (Etapa 1) — usadas só em vistas de histórico ---------
export function maxAcumuladoGrupo(_tamanhoIgnorado, hoje = new Date()) {
  // Calcula dias decorridos da Etapa 1 (cap em 21 dias)
  const diff = daysBetween(hoje, DATA_INICIO_ETAPA1) + 1;
  const dias = Math.max(0, Math.min(21, diff));
  return dias * MAX_PONTOS_DIA_GRUPO;
}

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
