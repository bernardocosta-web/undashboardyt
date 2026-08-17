/**
 * Matemática de métricas — funções puras, sem DOM.
 *
 * Portado do `index.html` (branch main, linhas 566-600) na Task 1 do plano de
 * estabilização. A lógica é CÓPIA VERBATIM: só foi adicionado `export`. A ordem
 * das funções é a mesma do original, para facilitar o diff.
 *
 * NÃO "melhorar" nada aqui sem um ADR. Nesta fase, melhorar é bug: o objetivo é
 * mudar a organização do código sem mudar nenhum resultado. `tests/fixtures/
 * golden.json` trava os valores de antes da refatoração.
 *
 * Duas semânticas que parecem erro e não são:
 *  - `avg([])` devolve `null`, mas `sum([])` devolve `0`.
 *  - `top80avg` NÃO é mediana nem trimmed-mean simétrica: ordena desc, mantém
 *    `floor(n*0.8)` (mínimo 1) e tira a média — descarta só a cauda ruim.
 *
 * `ctrStudio` e as retenções entram e saem daqui como FRAÇÃO 0–1. A conversão
 * para percentual é responsabilidade da exibição (`fmtPct`), nunca do cálculo.
 */

export function avg(arr) {
  const v = arr.filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((a,b) => a+b, 0) / v.length : null;
}

export function top80avg(arr) {
  const v = arr.filter(x => x != null && !isNaN(x)).sort((a,b) => b-a);
  if (!v.length) return null;
  return avg(v.slice(0, Math.max(1, Math.floor(v.length * 0.8))));
}

export function sum(arr) { return arr.filter(x => x != null && !isNaN(x)).reduce((a,b) => a+b, 0); }

export function groupAvg(vids, keyFn, valFn) {
  const g = {};
  for (const v of vids) {
    const k = keyFn(v); if (k == null || k === '') continue;
    const val = valFn(v); if (val == null || isNaN(val)) continue;
    if (!g[k]) g[k] = { s:0, n:0 };
    g[k].s += val; g[k].n++;
  }
  return Object.fromEntries(Object.entries(g).map(([k,v]) => [k, v.s/v.n]));
}

export function calcKPIs(vids) {
  return {
    total:           vids.length,
    totalViews:      sum(vids.map(v => v.views24h)),
    avgViews:        avg(vids.map(v => v.views24h)),
    totalImpress:    sum(vids.map(v => v.impressions)),
    avgImpress:      avg(vids.map(v => v.impressions)),
    ctrStudioGeral:  avg(vids.map(v => v.ctrStudio)),
    ctrStudioTop80:  top80avg(vids.map(v => v.ctrStudio)),
    ret30s:          avg(vids.map(v => v.retention30s)),
    retMedia:        avg(vids.map(v => v.retentionMedia)),
    retFinal:        avg(vids.map(v => v.retentionFinal)),
  };
}
