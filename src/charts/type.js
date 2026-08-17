/**
 * Gráfico 1 — Views médio por tipo de vídeo.
 *
 * Portado do `index.html` (branch main) na Task 5. Cópia verbatim; só foi
 * adicionado `export`.
 */
import { groupAvg } from '../lib/math.js';
import { fmtN } from '../lib/format.js';
import { TT, AX, mkChart } from './base.js';

export function renderTypeChart(vids) {
  const map     = groupAvg(vids, v => v.videoType || 'Sem tipo', v => v.views24h);
  const entries = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,12);
  const labels  = entries.map(([k]) => k);
  const data    = entries.map(([,v]) => Math.round(v));

  mkChart('chart-type', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: '#3b82f660',
        borderColor: '#60a5fa',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...TT, callbacks: { label: c => '  ' + fmtN(c.raw) + ' views médio' } },
      },
      scales: {
        x: { ...AX, ticks: { ...AX.ticks, callback: v => fmtN(v) } },
        y: { ...AX },
      },
    },
  });
}
