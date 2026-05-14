import {
  METAS_ETAPA2,
  METAS_ETAPA1,
  calculaSemana,
  DATA_INICIO_ETAPA1,
  DATA_FIM_ETAPA1,
  DATA_INICIO,
  DATA_FIM,
} from './weeks';

// Espelha a função SQL calcular_pontos. Usado apenas para preview no formulário.
// Aceita Date ou string YYYY-MM-DD.
export function previewPontos(categoria, { minutos, segundos, quantidade_frutas, tipo_alimento, data = new Date() }) {
  const dataObj = data instanceof Date ? data : parseISO(data);
  const etapa = etapaDe(dataObj);
  if (!etapa) return 0;

  if (etapa === 'etapa2') {
    if (categoria === 'energia') {
      if (tipo_alimento === 'fruta')   return Number(quantidade_frutas) || 0;
      if (tipo_alimento === 'vegetal') return METAS_ETAPA2.pontos.vegetal;
      return 0;
    }
    if (categoria === 'hidratacao') return METAS_ETAPA2.pontos.hidratacao;
    const semana = calculaSemana(dataObj, 'etapa2');
    if (semana < 1 || semana > 3) return 0;
    const totalSeg = (Number(minutos) || 0) * 60 + (Number(segundos) || 0);
    if (categoria === 'movimento') {
      return totalSeg >= METAS_ETAPA2.movimento[semana] * 60 ? METAS_ETAPA2.pontos.movimento : 0;
    }
    if (categoria === 'mental') {
      return totalSeg >= METAS_ETAPA2.mental[semana] * 60 ? METAS_ETAPA2.pontos.mental : 0;
    }
    return 0;
  }

  // Etapa 1 (preview de edição de post antigo)
  if (categoria === 'energia') return Number(quantidade_frutas) || 0;
  const semana = calculaSemana(dataObj, 'etapa1');
  if (semana < 1 || semana > 3) return 0;
  const totalSeg = (Number(minutos) || 0) * 60 + (Number(segundos) || 0);
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
  if (dataObj >= DATA_INICIO && dataObj <= DATA_FIM) return 'etapa2';
  return null;
}

// 4 categorias da Etapa 2. 'energia' agora cobre frutas E vegetal/salada.
export const CATEGORIAS = {
  energia:    { label: 'Energia',    emoji: '🍎🥗', cor: '#10B981', dica: 'Foto de fruta(s) ou do prato com vegetal/salada' },
  hidratacao: { label: 'Hidratação', emoji: '💧',   cor: '#06B6D4', dica: 'Foto com a garrafinha + horário (manhã, tarde ou noite)' },
  movimento:  { label: 'Movimento',  emoji: '🏃',   cor: '#3B82F6', dica: 'Print Strava ou app de corrida/caminhada' },
  mental:     { label: 'Mental',     emoji: '🧠',   cor: '#8B5CF6', dica: 'Print Calm, Headspace ou app similar' },
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
