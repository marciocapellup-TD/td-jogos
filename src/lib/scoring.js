import { METAS, calculaSemanaAtual, ehDiaUtil } from './weeks';

// Prever os pontos que um post ganharia se aprovado. Só para exibição no formulário.
export function previewPontos(categoria, { minutos, quantidade_frutas, data = new Date() }) {
  const semana = calculaSemanaAtual(data);
  if (semana < 1 || semana > 3) return 0;
  if (!ehDiaUtil(data)) return 0;
  if (categoria === 'energia') return Number(quantidade_frutas) || 0;
  if (categoria === 'movimento') {
    return (minutos >= METAS.movimento[semana]) ? METAS.pontos.movimento : 0;
  }
  if (categoria === 'mental') {
    return (minutos >= METAS.mental[semana]) ? METAS.pontos.mental : 0;
  }
  return 0;
}

export const CATEGORIAS = {
  energia:   { label: 'Energia',   emoji: '🍎', cor: '#10B981', dica: 'Foto de fruta no horário de trabalho' },
  movimento: { label: 'Movimento', emoji: '🏃', cor: '#3B82F6', dica: 'Print Strava ou app de corrida/caminhada' },
  mental:    { label: 'Mental',    emoji: '🧠', cor: '#8B5CF6', dica: 'Print Calm, Headspace ou app similar' },
};
