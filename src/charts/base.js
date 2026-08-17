/**
 * Infraestrutura compartilhada dos gráficos (Chart.js 4.4.0).
 *
 * Portado do `index.html` (branch main, linhas 742-772) na Task 5.
 * `CHARTS`, `TT`, `AX` e `mkChart` são cópia verbatim; só foi adicionado
 * `export`.
 *
 * ⚠ `Chart` vem do CDN como global (`index.html:9`), não por import. Os
 * `Chart.defaults` abaixo são aplicados na avaliação deste módulo — antes do
 * corpo do `index.html` rodar, portanto antes de qualquer gráfico existir.
 * Mesma ordem efetiva do original.
 *
 * `CHARTS` é o registro de instâncias vivas. `mkChart` destrói a anterior antes
 * de criar a nova: sem isso, cada re-render vaza um Chart e os tooltips passam a
 * responder duas vezes. O `togglePresentation` no `index.html` também percorre
 * este registro para redimensionar.
 */

export const CHARTS = {};

Chart.defaults.color         = '#64748b';
Chart.defaults.borderColor   = '#1e293b';
Chart.defaults.font.family   = 'system-ui, -apple-system, sans-serif';
Chart.defaults.font.size     = 12;

export const TT = {                          // shared tooltip style
  backgroundColor: '#0f172a',
  titleColor: '#e2e8f0',
  bodyColor:  '#94a3b8',
  borderColor:'#334155',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  displayColors: true,
  boxPadding: 4,
};
export const AX = {                          // shared axis style
  ticks:  { color:'#475569', font:{ size:11 } },
  grid:   { color:'#1e293b' },
  border: { color:'#334155' },
};

export function mkChart(id, config) {
  if (CHARTS[id]) { CHARTS[id].destroy(); delete CHARTS[id]; }
  const canvas = document.getElementById(id);
  const ph = canvas.parentElement.querySelector('.chart-ph');
  if (ph) ph.style.display = 'none';
  CHARTS[id] = new Chart(canvas, config);
}
