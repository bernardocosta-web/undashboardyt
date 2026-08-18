/**
 * Gráfico 4 — Teste A/B — CTR e retenções comparados.
 *
 * Portado do `index.html` (branch main) na Task 5. Cópia verbatim; só foi
 * adicionado `export`.
 *
 * ⚠ SEGUNDO SÍTIO DE ×100 DO PROJETO, com precisão DIFERENTE do `fmtPct`:
 *
 *     parseFloat((a*100).toFixed(2))
 *
 * O `fmtPct` usa `Intl` com 1 casa decimal; aqui é `toFixed(2)` com 2 casas,
 * e o `parseFloat` devolve número (não string) porque o valor alimenta o
 * dataset do Chart.js, não a tela. O tooltip formata com `toFixed(1)` na hora
 * de exibir. PRESERVADO VERBATIM: unificar com o `fmtPct` mudaria os valores
 * plotados e é decisão separada, com ADR — não de carona numa extração.
 */
import { avg } from '../lib/math.js';
import { CHARTS, TT, AX, mkChart } from './base.js';

export function renderABChart(vids) {
  const sim = vids.filter(v => v.abTest === true);
  const nao = vids.filter(v => v.abTest === false);
  const ph  = document.getElementById('ph-ab');

  if (!sim.length && !nao.length) {
    if (CHARTS['chart-ab']) { CHARTS['chart-ab'].destroy(); delete CHARTS['chart-ab']; }
    if (ph) { ph.style.display = 'flex'; ph.textContent = 'Sem dados de A/B nos filtros atuais'; }
    return;
  }

  const labels = ['CTR Studio','Ret. 30s','Ret. Média','Ret. Final'];
  const fields = ['ctrStudio','retention30s','retentionMedia','retentionFinal'];
  const calcRow = g => fields.map(f => { const a = avg(g.map(v => v[f])); return a != null ? parseFloat((a*100).toFixed(2)) : null; });

  const datasets = [];
  if (sim.length) datasets.push({ label:'Com A/B ('+sim.length+')', data:calcRow(sim), backgroundColor:'#3b82f660', borderColor:'#60a5fa', borderWidth:1, borderRadius:3 });
  if (nao.length) datasets.push({ label:'Sem A/B ('+nao.length+')', data:calcRow(nao), backgroundColor:'#f59e0b60', borderColor:'#fbbf24', borderWidth:1, borderRadius:3 });

  mkChart('chart-ab', {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color:'#94a3b8', usePointStyle:true, pointStyleWidth:8, font:{size:11} } },
        tooltip: { ...TT, callbacks: { label: c => '  ' + (c.raw?.toFixed(1) ?? '—') + '%' } },
      },
      scales: {
        x: { ...AX },
        y: { ...AX, ticks: { ...AX.ticks, callback: v => v + '%' } },
      },
    },
  });
}
