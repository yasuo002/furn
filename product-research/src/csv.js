// CSV dışa aktarma: formül enjeksiyonuna karşı koruma (=, +, -, @, sekme, CR ile başlayan hücreler).
export function csvCell(v) {
  if (v == null) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r;]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
export function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  for (const r of rows) lines.push(headers.map(h => csvCell(r[h])).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
