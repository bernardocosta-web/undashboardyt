/**
 * Gráfico 7 — Inscritos por canal — VAZIO hoje, ver nota.
 *
 * Portado do `index.html` (branch main) na Task 5. Cópia verbatim; só foi
 * adicionado `export` e o parâmetro.
 *
 * ⚠ Recebe `allSubscribers` como PARÂMETRO (antes lia a global). O nome do
 * parâmetro foi mantido igual ao da global de propósito, para o corpo da função
 * seguir cópia verbatim.
 *
 * Hoje este gráfico é sempre VAZIO: a YouTube Analytics API exige propriedade
 * primária da Brand Account e devolve `subscribers: []` num JSON válido. NÃO é
 * falha de carregamento nem regressão da refatoração. Ver SPEC, "Problemas
 * conhecidos" nº 1.
 */
import { fmtN, fmtDateShort } from '../lib/format.js';
import { CH_COLORS } from '../config.js';
import { CHARTS, TT, AX, mkChart } from './base.js';

export function renderSubscriberChart(allSubscribers) {
  const ph = document.getElementById('ph-subscribers');
  if (!allSubscribers.length) {
    if (CHARTS['chart-subscribers']) { CHARTS['chart-subscribers'].destroy(); delete CHARTS['chart-subscribers']; }
    if (ph) { ph.style.display = 'flex'; ph.textContent = 'Sem dados de inscritos'; }
    return;
  }

  const sorted = [...allSubscribers].filter(s => s.date).sort((a,b) => a.date - b.date);
  const labels = sorted.map(s => fmtDateShort(s.date));

  const channels = ['Principal','Militares','Superiores'];
  const keys     = ['principal','militares','superiores'];
  const datasets = channels
    .map((ch, i) => {
      const data = sorted.map(s => s[keys[i]]);
      if (data.every(d => d == null)) return null;
      return {
        label: ch,
        data,
        borderColor:       CH_COLORS[ch],
        backgroundColor:   CH_COLORS[ch] + '18',
        borderWidth: 2,
        pointRadius: 4, pointHoverRadius: 7,
        pointBackgroundColor: CH_COLORS[ch],
        pointBorderColor: '#0f172a',
        tension: 0.35, fill: false, spanGaps: true,
      };
    })
    .filter(Boolean);

  if (!datasets.length) {
    if (ph) { ph.style.display = 'flex'; ph.textContent = 'Sem dados de inscritos'; }
    return;
  }

  mkChart('chart-subscribers', {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { color:'#94a3b8', usePointStyle:true, pointStyleWidth:8, font:{size:11} } },
        tooltip: {
          ...TT,
          callbacks: {
            label: c => c.raw != null ? '  ' + c.dataset.label + ': ' + fmtN(c.raw) : null,
          },
        },
      },
      scales: {
        x: { ...AX, ticks: { ...AX.ticks, maxTicksLimit: 12, maxRotation: 45 } },
        y: { ...AX, ticks: { ...AX.ticks, callback: v => fmtN(v) } },
      },
    },
  });
}
