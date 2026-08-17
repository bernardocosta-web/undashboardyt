/**
 * Gráfico 3 — Views médio por horário de publicação.
 *
 * Portado do `index.html` (branch main) na Task 5. Cópia verbatim; só foi
 * adicionado `export`.
 */
import { groupAvg } from '../lib/math.js';
import { fmtN } from '../lib/format.js';
import { TT, AX, mkChart } from './base.js';

export function renderHourChart(vids) {
  const map     = groupAvg(vids, v => v.publishHour, v => v.views24h);
  const entries = Object.entries(map).sort((a,b) => parseInt(a[0]) - parseInt(b[0]));

  mkChart('chart-hour', {
    type: 'line',
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([,v]) => Math.round(v)),
        borderColor: '#a78bfa',
        backgroundColor: '#8b5cf620',
        borderWidth: 2,
        pointRadius: 4, pointHoverRadius: 7,
        pointBackgroundColor: '#a78bfa',
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
