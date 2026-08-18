/**
 * Render — KPIs, resumo de filtros e tabela de ranking.
 *
 * Portado do `index.html` (branch main) na Task 5. Os corpos das funções são
 * cópia verbatim. As únicas alterações são de assinatura, para o estado chegar
 * por parâmetro em vez de global:
 *
 *  - `renderKPIs(vids, totalGeral)` — `totalGeral` substitui `allVideos.length`
 *  - `renderSummary(vids, filters)` — `filters` era global
 *  - `renderTable(vids, tabela)`    — `{ rankSort, rankDir, rankDateFrom, rankDateTo }`
 *    é desestruturado na primeira linha, deixando o corpo intocado
 *
 * ⚠ `rankDateFrom` e `rankDateTo` são SEMPRE `null` hoje: as funções que os
 * definem (`rankFilterChanged`, `clearRankDates`) nunca são chamadas e os
 * elementos `#rank-date-from` / `#rank-date-to` não existem no HTML. O ramo de
 * filtro de data da tabela é, na prática, código morto — preservado como está.
 * Ver SPEC, "Features / Ranking".
 */
import { fmtN, fmtPct, fmtDateShort, esc } from './lib/format.js';
import { calcKPIs } from './lib/math.js';
import { CH_COLORS } from './config.js';
import { setText } from './dom.js';
import { renderCharts } from './charts/index.js';

export const RANK_COLS = [
  { key:'#',             label:'#',          sortKey:null,            align:'left'  },
  { key:'title',         label:'Título',      sortKey:null,            align:'left'  },
  { key:'channel',       label:'Canal',       sortKey:'channel',       align:'left'  },
  { key:'videoType',     label:'Tipo',        sortKey:'videoType',     align:'left'  },
  { key:'duration',      label:'Duração',     sortKey:'durationSecs',  align:'left'  },
  { key:'views24h',      label:'Views',       sortKey:'views24h',      align:'right' },
  { key:'impressions',   label:'Impressões',  sortKey:'impressions',   align:'right' },
  { key:'ctrStudio',     label:'CTR Studio',  sortKey:'ctrStudio',     align:'right' },
  { key:'retention30s',  label:'Ret. 30s',    sortKey:'retention30s',  align:'right' },
  { key:'retentionMedia',label:'Ret. Média',  sortKey:'retentionMedia',align:'right' },
  { key:'retentionFinal',label:'Ret. Final',  sortKey:'retentionFinal',align:'right' },
];

function perfClass(p) {
  if (!p) return '';
  const l = p.toLowerCase();
  if (l === 'bom')   return 'perf-bom';
  if (l === 'médio' || l === 'medio') return 'perf-medio';
  if (l === 'ruim')  return 'perf-ruim';
  return '';
}
function perfDot(p) {
  if (!p) return '';
  const l = p.toLowerCase();
  const cls = l === 'bom' ? 'bom' : (l === 'médio' || l === 'medio') ? 'medio' : l === 'ruim' ? 'ruim' : '';
  return cls ? `<span class="perf-dot ${cls}"></span>` : '';
}
function perfCell(val, fmt, perf) {
  return `<td class="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-sm ${perfClass(perf)}">${perfDot(perf)}${fmt}</td>`;
}

export function renderKPIs(vids, totalGeral) {
  const k = calcKPIs(vids);
  setText('kpi-total',            k.total.toLocaleString('pt-BR'));
  setText('kpi-total-sub',        'de ' + totalGeral.toLocaleString('pt-BR') + ' no total');
  setText('kpi-views',            fmtN(k.totalViews));
  setText('kpi-views-sub',        k.avgViews ? 'Média: ' + fmtN(k.avgViews) + ' / vídeo' : '—');
  setText('kpi-impressoes-total', fmtN(k.totalImpress));
  setText('kpi-impressoes-avg',   fmtN(k.avgImpress));
  setText('kpi-ctr-studio-geral', fmtPct(k.ctrStudioGeral));
  setText('kpi-ctr-studio-top80', fmtPct(k.ctrStudioTop80));
  setText('kpi-ret30',            fmtPct(k.ret30s));
  setText('kpi-ret-media',        fmtPct(k.retMedia));
  setText('kpi-ret-final',        fmtPct(k.retFinal));
}

export function renderSummary(vids, filters) {
  const parts = [];
  if (filters.channels.size)   parts.push([...filters.channels].join(', '));
  if (filters.quarters.size)   parts.push([...filters.quarters].join(', '));
  if (filters.videoTypes.size) parts.push([...filters.videoTypes].join(', '));
  if (filters.abTest !== 'all') parts.push('A/B: ' + (filters.abTest ? 'Sim' : 'Não'));
  if (filters.dateFrom || filters.dateTo) {
    const df = filters.dateFrom ? filters.dateFrom.toLocaleDateString('pt-BR') : '…';
    const dt = filters.dateTo   ? filters.dateTo.toLocaleDateString('pt-BR')   : '…';
    parts.push('Data: ' + df + ' → ' + dt);
  }
  setText('filter-summary', parts.length
    ? 'Filtros: ' + parts.join(' · ')
    : 'Mostrando todos os ' + vids.length + ' vídeos');
}

export function renderTable(vids, tabela) {
  // Estado da tabela chega como parâmetro; o corpo abaixo segue verbatim.
  const { rankSort, rankDir, rankDateFrom, rankDateTo } = tabela;
  const wrap = document.getElementById('rank-table-wrap');

  // Apply date filter
  let list = rankDateFrom || rankDateTo
    ? vids.filter(v => {
        if (!v.publishDate) return false;
        if (rankDateFrom && v.publishDate < rankDateFrom) return false;
        if (rankDateTo   && v.publishDate > rankDateTo)   return false;
        return true;
      })
    : vids;

  // Sort
  list = [...list].sort((a, b) => {
    const va = a[rankSort]; const vb = b[rankSort];
    if (va == null && vb == null) return 0;
    if (va == null) return 1; if (vb == null) return -1;
    return rankDir * (va < vb ? -1 : va > vb ? 1 : 0);
  });

  setText('rank-count', list.length + ' vídeo' + (list.length !== 1 ? 's' : ''));

  if (!list.length) {
    wrap.innerHTML = '<p class="text-slate-600 text-sm py-4">Nenhum vídeo com os filtros atuais.</p>';
    return;
  }

  const thCls = (col) => {
    let cls = 'pb-2 px-3 text-xs text-slate-600 uppercase tracking-wider';
    if (col.sortKey) {
      cls += ' sortable';
      if (rankSort === col.sortKey) cls += rankDir === -1 ? ' sort-desc' : ' sort-asc';
    }
    if (col.align === 'right') cls += ' text-right';
    return cls;
  };

  const headers = RANK_COLS.map(col => {
    const onclick = col.sortKey ? ` onclick="setRankSort('${col.sortKey}')"` : '';
    return `<th class="${thCls(col)}"${onclick}>${col.label}</th>`;
  }).join('');

  const rows = list.map((v, i) => {
    const p = v.perf || {};
    const titleCell = v.url
      ? `<a href="${esc(v.url)}" target="_blank" rel="noopener"
           class="text-blue-400 hover:text-blue-300 underline block truncate max-w-[260px]"
           title="${esc(v.title)}">${esc(v.title) || 'Ver vídeo'}</a>`
      : `<span class="text-slate-300 block truncate max-w-[260px]">${esc(v.title)}</span>`;
    const chBadge = `<span class="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style="background:${CH_COLORS[v.channel]}22;color:${CH_COLORS[v.channel]}">${esc(v.channel)}</span>`;
    return `<tr class="data-row border-t border-slate-700/60">
      <td class="py-2.5 px-3 text-slate-500 text-sm">${i+1}</td>
      <td class="py-2.5 px-3 text-sm">${titleCell}</td>
      <td class="py-2.5 px-3">${chBadge}</td>
      <td class="py-2.5 px-3 text-slate-400 text-xs whitespace-nowrap">${esc(v.videoType||'—')}</td>
      <td class="py-2.5 px-3 text-slate-400 text-xs whitespace-nowrap">${esc(v.duration||'—')}</td>
      ${perfCell(v.views24h,       fmtN(v.views24h),          p.views)}
      ${perfCell(v.impressions,    fmtN(v.impressions),        p.impressoes)}
      ${perfCell(v.ctrStudio,      fmtPct(v.ctrStudio),        p.ctrStudio)}
      ${perfCell(v.retention30s,   fmtPct(v.retention30s),     p.ret30s)}
      ${perfCell(v.retentionMedia, fmtPct(v.retentionMedia),   p.retMedia)}
      ${perfCell(v.retentionFinal, fmtPct(v.retentionFinal),   p.retFinal)}
    </tr>`;
  }).join('');

  wrap.innerHTML = `<table class="w-full text-left">
    <thead class="sticky top-0 bg-slate-800 z-10"><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/**
 * Orquestra o render completo. Recebe o estado inteiro num objeto, montado pelo
 * `index.html`, que continua sendo o dono das variáveis mutáveis.
 *
 * A ORDEM é verbatim do original: KPIs, resumo, tabela, gráficos.
 */
export function renderAll(estado) {
  const { vids, totalGeral, filters, allSubscribers } = estado;
  renderKPIs(vids, totalGeral);
  renderSummary(vids, filters);
  renderTable(vids, estado);
  renderCharts(vids, allSubscribers);
}
