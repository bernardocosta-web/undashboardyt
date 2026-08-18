/**
 * Gráfico 6 — Funil: Impressões → Views 24h → 30s → fim.
 *
 * Portado do `index.html` (branch main) na Task 5. Cópia verbatim; só foi
 * adicionado `export`.
 */
import { sum } from '../lib/math.js';
import { fmtN } from '../lib/format.js';
import { TT, AX, mkChart } from './base.js';

export function renderFunnelChart(vids) {
  const imp   = sum(vids.map(v => v.impressions));
  const views = sum(vids.map(v => v.views24h));
  const s30   = sum(vids.filter(v => v.retention30s  != null && v.views24h != null).map(v => Math.round(v.views24h * v.retention30s)));
  const sfin  = sum(vids.filter(v => v.retentionFinal != null && v.views24h != null).map(v => Math.round(v.views24h * v.retentionFinal)));

  const data   = [imp, views, s30, sfin];
  const labels = ['Impressões','Views (24h)','Assistiram 30s','Assistiram até o fim'];
  const colors = ['#6366f1','#3b82f6','#0ea5e9','#06b6d4'];
  const ref    = imp || 1;
  const pcts   = data.map(v => imp > 0 ? (v/ref*100).toFixed(1)+'%' : '—');

  mkChart('chart-funnel', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + '99'),
        borderColor: colors,
        borderWidth: 1, borderRadius: 4, borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...TT,
          callbacks: {
            label: c => {
              const i = c.dataIndex;
              return '  ' + fmtN(data[i]) + '   (' + pcts[i] + ' das impressões)';
            },
          },
        },
      },
      scales: {
        x: { ...AX, ticks: { ...AX.ticks, callback: v => fmtN(v) } },
        y: { ...AX },
      },
    },
  });
}
