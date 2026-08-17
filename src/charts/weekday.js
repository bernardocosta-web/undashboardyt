/**
 * Gráfico 2 — Views médio por dia da semana (ordem Seg→Dom).
 *
 * Portado do `index.html` (branch main) na Task 5. Cópia verbatim; só foi
 * adicionado `export`.
 */
import { groupAvg } from '../lib/math.js';
import { fmtN } from '../lib/format.js';
import { WEEKDAY_ORD } from '../config.js';
import { TT, AX, mkChart } from './base.js';

export function renderWeekdayChart(vids) {
  const map    = groupAvg(vids, v => v.weekday, v => v.views24h);
  const labels = WEEKDAY_ORD.filter(d => map[d] != null);
  const data   = labels.map(d => Math.round(map[d]));

  const palette = ['#6366f1','#3b82f6','#0ea5e9','#06b6d4','#10b981','#f59e0b','#f97316'];

  mkChart('chart-weekday', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#818cf8',
        backgroundColor: '#818cf820',
        borderWidth: 2,
        pointRadius: 5, pointHoverRadius: 7,
        pointBackgroundColor: labels.map((_,i) => palette[i % palette.length]),
        pointBorderColor: '#0f172a',
        tension: 0.35, fill: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...TT, callbacks: { label: c => '  ' + fmtN(c.raw) + ' views médio' } },
      },
      scales: {
        x: { ...AX },
        y: { ...AX, ticks: { ...AX.ticks, callback: v => fmtN(v) } },
      },
    },
  });
}
