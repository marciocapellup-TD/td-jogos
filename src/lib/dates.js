// Helpers de data TZ-safe para garantir que o "hoje" e a exibição usem
// sempre o calendário LOCAL do usuário (Brasília), não UTC.

export function hojeISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Recebe string "YYYY-MM-DD" e devolve "DD/MM/YYYY" sem conversão de timezone.
export function formatarDataBR(dataIso) {
  if (!dataIso) return '';
  const str = String(dataIso).slice(0, 10);
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return str;
  return `${d}/${m}/${y}`;
}
