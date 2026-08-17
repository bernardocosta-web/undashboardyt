/**
 * Gráfico 5 — Views ao longo do tempo, por data de publicação.
 *
 * Portado do `index.html` (branch main) na Task 5. Cópia verbatim; só foi
 * adicionado `export`.
 */
import { fmtN, fmtDateShort } from '../lib/format.js';
import { CH_COLORS } from '../config.js';
import { TT, AX, mkChart } from './base.js';

export function renderTimelineChart(vids) {
  const channels = ['Principal','Militares','Superiores'];

  // Collect and sort all unique dates
  const dateSet = new Set();
  vids.forEach(v => { if (v.publishDate) dateSet.add(fmtDateShort(v.publishDate)); });
  const allDates = [...dateSet].sort((a, b) => {
    const p = s => { const [d,m,y] = s.split('/').map(Number); return new Date(y,m-1,d); };
    return p(a) - p(b);
  });

  const activeChannels = channels.filter(ch => vids.some(v => v.channel === ch && v.publishDate));

  const datasets = activeChannels.map(ch => {
    const chMap = {};
    vids.filter(v => v.channel === ch).forEach(v => {
      if (!v.publishDate || v.views24h == null) return;
      const d = fmtDateShort(v.publishDate);
      if (!chMap[d]) chMap[d] = [];
      chMap[d].push(v.views24h);
    });
    return {
      label: ch,
      data: allDates.map(d => {
        const vals = chMap[d];
        return vals ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
      }),
      borderColor: CH_COLORS[ch],
      backgroundColor: CH_COLORS[ch] + '18',
      tension: 0.35, pointRadius: 3, pointHoverRadius: 6,
      pointBackgroundColor: CH_COLORS[ch],
      fill: false, spanGaps: false,
    };
  });

  mkChart('chart-timeline', {
    type: 'line',
    data: { labels: allDates, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { display: true, labels: { color:'#94a3b8', usePointStyle:true, pointStyleWidth:8, font:{size:12} } },
        tooltip: {
          ...TT,
          callbacks: {
            label: c => c.raw != null ? '  ' + c.dataset.label + ': ' + fmtN(c.raw) + ' views' : null,
          },
        },
      },
      scales: {
        x: { ...AX, ticks: { ...AX.ticks, maxTicksLimit:14, maxRotation:45, minRotation:0 } },
        y: { ...AX, ticks: { ...AX.ticks, callback: v => fmtN(v) } },
      },
    },
  });
}
