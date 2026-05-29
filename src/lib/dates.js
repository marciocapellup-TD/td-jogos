// Helpers de data TZ-safe. Sempre retornam a data do calendário de Brasília,
// independente do fuso do navegador. Isso garante consistência com o trigger SQL
// force_data_registro_hoje (que também força fuso 'America/Sao_Paulo').
//
// Necessário porque temos participantes em outros fusos (ex: Mariane em Londres).
// Sem isso, o filtro "posts de hoje" no front desincronizava do data_registro do banco.

const _formatterBR = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric', month: '2-digit', day: '2-digit',
});

const _formatterHoraBR = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  hour: 'numeric', hour12: false,
});

export function hojeISO() {
  // en-CA formata como YYYY-MM-DD direto, sempre no fuso de Brasília.
  return _formatterBR.format(new Date());
}

export function horaBR() {
  // Hora inteira atual (0-23) sempre no fuso de Brasília. Usado pra validar
  // janelas manha/tarde/noite da hidratacao independente do fuso do navegador.
  return parseInt(_formatterHoraBR.format(new Date()), 10);
}

// Recebe string "YYYY-MM-DD" e devolve "DD/MM/YYYY" sem conversão de timezone.
export function formatarDataBR(dataIso) {
  if (!dataIso) return '';
  const str = String(dataIso).slice(0, 10);
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return str;
  return `${d}/${m}/${y}`;
}
