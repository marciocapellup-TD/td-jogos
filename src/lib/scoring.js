import {
  METAS_ETAPA3,
  METAS_ETAPA2,
  METAS_ETAPA1,
  calculaSemana,
  DATA_INICIO_ETAPA1,
  DATA_FIM_ETAPA1,
  DATA_INICIO_ETAPA2,
  DATA_FIM_ETAPA2,
  DATA_INICIO_ETAPA3,
  DATA_FIM_ETAPA3,
} from './weeks';

// Espelha a função SQL calcular_pontos. Usado apenas para preview no formulário.
// Aceita Date ou string YYYY-MM-DD.
export function previewPontos(categoria, { minutos, segundos, quantidade_frutas, tipo_alimento, data = new Date() }) {
  const dataObj = data instanceof Date ? data : parseISO(data);
  const etapa = etapaDe(dataObj);
  if (!etapa) return 0;

  const totalSeg = (Number(minutos) || 0) * 60 + (Number(segundos) || 0);

  // ----- Etapa 3 (planas, por unidade, SEM teto) -----
  if (etapa === 'etapa3') {
    if (categoria === 'energia')    return Number(quantidade_frutas) || 0;            // 1 pt/fruta
    if (categoria === 'salada')     return METAS_ETAPA3.salada.pts;                   // 1
    if (categoria === 'hidratacao') return METAS_ETAPA3.hidratacao.pts;               // 1
    if (categoria === 'cultura')    return METAS_ETAPA3.cultura.pts;                  // 3
    if (categoria === 'movimento')
      return Math.floor(totalSeg / (METAS_ETAPA3.movimento.bloco_min * 60)) * METAS_ETAPA3.movimento.pts_por_bloco;
    if (categoria === 'mental')
      return Math.floor(totalSeg / (METAS_ETAPA3.mental.bloco_min * 60)) * METAS_ETAPA3.mental.pts_por_bloco;
    return 0;
  }

  // ----- Etapa 2 -----
  if (etapa === 'etapa2') {
    if (categoria === 'energia') {
      if (tipo_alimento === 'fruta')   return Number(quantidade_frutas) || 0;
      if (tipo_alimento === 'vegetal') return METAS_ETAPA2.pontos.vegetal;
      return 0;
    }
    if (categoria === 'hidratacao') return METAS_ETAPA2.pontos.hidratacao;
    const semana = calculaSemana(dataObj, 'etapa2');
    if (semana < 1 || semana > 3) return 0;
    if (categoria === 'movimento') {
      return totalSeg >= METAS_ETAPA2.movimento[semana] * 60 ? METAS_ETAPA2.pontos.movimento : 0;
    }
    if (categoria === 'mental') {
      return totalSeg >= METAS_ETAPA2.mental[semana] * 60 ? METAS_ETAPA2.pontos.mental : 0;
    }
    return 0;
  }

  // ----- Etapa 1 (preview de edição de post antigo) -----
  if (categoria === 'energia') return Number(quantidade_frutas) || 0;
  const semana = calculaSemana(dataObj, 'etapa1');
  if (semana < 1 || semana > 3) return 0;
  if (categoria === 'movimento') {
    return totalSeg >= METAS_ETAPA1.movimento[semana] * 60 ? METAS_ETAPA1.pontos.movimento : 0;
  }
  if (categoria === 'mental') {
    return totalSeg >= METAS_ETAPA1.mental[semana] * 60 ? METAS_ETAPA1.pontos.mental : 0;
  }
  return 0;
}

function parseISO(str) {
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function etapaDe(dataObj) {
  if (dataObj >= DATA_INICIO_ETAPA1 && dataObj <= DATA_FIM_ETAPA1) return 'etapa1';
  if (dataObj >= DATA_INICIO_ETAPA2 && dataObj <= DATA_FIM_ETAPA2) return 'etapa2';
  if (dataObj >= DATA_INICIO_ETAPA3 && dataObj <= DATA_FIM_ETAPA3) return 'etapa3';
  return null;
}

// 6 pilares da Etapa 3. A ordem define a ordem dos cards na Home.
// (energia = só frutas; salada/vegetal virou pilar próprio; cultura é novo)
// `meta` = referência de meta mínima diária (não limita pontos; é só o alvo do dia).
export const CATEGORIAS = {
  energia:    { label: 'Energia',    emoji: '🍎', cor: '#10B981', dica: 'Foto de fruta(s) — 1 ponto por fruta, sem limite',         meta: 'Meta do dia: 3 frutas' },
  salada:     { label: 'Salada',     emoji: '🥗', cor: '#22C55E', dica: 'Salada/vegetal no almoço ou janta — 1 ponto por refeição', meta: 'Meta do dia: 2 refeições (almoço e janta)' },
  hidratacao: { label: 'Hidratação', emoji: '💧', cor: '#06B6D4', dica: 'Garrafinha + horário — 1 ponto por registro, sem limite',  meta: 'Meta do dia: 3 registros (manhã, tarde, noite)' },
  movimento:  { label: 'Movimento',  emoji: '🏃', cor: '#3B82F6', dica: 'Print de exercício — 5 pontos a cada 50 min',              meta: 'Meta do dia: 50 min' },
  mental:     { label: 'Mental',     emoji: '🧠', cor: '#8B5CF6', dica: 'Print de meditação — 4 pontos a cada 10 min',              meta: 'Meta do dia: 10 min' },
  cultura:    { label: 'Cultura',    emoji: '🎭', cor: '#F59E0B', dica: 'Livro, podcast, hobby, passeio ou exposição — 3 pontos',    meta: 'Meta do dia: 1 atividade' },
};

// Labels auxiliares pra UI
export const TIPO_ALIMENTO_LABEL = {
  fruta:   { label: 'Frutas',   emoji: '🍎' },
  vegetal: { label: 'Vegetal/Salada', emoji: '🥗' },
};

export const HORARIO_LABEL = {
  manha: { label: 'Manhã', emoji: '🌅' },
  tarde: { label: 'Tarde', emoji: '☀️' },
  noite: { label: 'Noite', emoji: '🌙' },
};

// Atividades do pilar Cultura (Etapa 3)
export const CULTURA_LABEL = {
  livro:     { label: 'Ler um livro',          emoji: '📚' },
  podcast:   { label: 'Ouvir um podcast',      emoji: '🎧' },
  hobby:     { label: 'Hobby / arte',          emoji: '🎨' },
  passeio:   { label: 'Passeio / lugar novo',  emoji: '🌳' },
  exposicao: { label: 'Exposição / museu',     emoji: '🏛️' },
};
