/**
 * Task 0 — Congelar baseline.  DESCARTÁVEL.
 *
 * Gera tests/fixtures/golden.json rodando as funções puras do index.html
 * (branch main, linhas 566-600) contra tests/fixtures/videos.sample.json.
 *
 * REGRA DESTE ARQUIVO: as funções abaixo são CÓPIA VERBATIM do index.html.
 * Não corrigir, não modernizar, não "melhorar". Se parecerem estranhas, ficam
 * estranhas — qualquer alteração aqui envenena a referência e todo o resto do
 * plano passa a validar contra o valor errado.
 *
 * Pode ser removido no fim da Task 3, quando src/lib/math.js já reproduzir o
 * golden. As fixtures ficam.
 *
 * Uso: npm run baseline
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// ═══════════════════════════════════════════════════════════════════════════
//  CÓPIA VERBATIM — index.html linhas 566-600.  NÃO EDITAR.
// ═══════════════════════════════════════════════════════════════════════════
function avg(arr) {
  const v = arr.filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((a,b) => a+b, 0) / v.length : null;
}
function top80avg(arr) {
  const v = arr.filter(x => x != null && !isNaN(x)).sort((a,b) => b-a);
  if (!v.length) return null;
  return avg(v.slice(0, Math.max(1, Math.floor(v.length * 0.8))));
}
function sum(arr) { return arr.filter(x => x != null && !isNaN(x)).reduce((a,b) => a+b, 0); }
function groupAvg(vids, keyFn, valFn) {
  const g = {};
  for (const v of vids) {
    const k = keyFn(v); if (k == null || k === '') continue;
    const val = valFn(v); if (val == null || isNaN(val)) continue;
    if (!g[k]) g[k] = { s:0, n:0 };
    g[k].s += val; g[k].n++;
  }
  return Object.fromEntries(Object.entries(g).map(([k,v]) => [k, v.s/v.n]));
}

function calcKPIs(vids) {
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
// ═══════════════════════════════════════════════════════════════════════════
//  FIM DA CÓPIA VERBATIM
// ═══════════════════════════════════════════════════════════════════════════

const vids = JSON.parse(readFileSync(join(raiz, 'tests/fixtures/videos.sample.json'), 'utf8'));

// keyFn/valFn copiadas dos gráficos: index.html 845 (tipo), 880 (dia), 917 (hora).
const golden = {
  kpis: calcKPIs(vids),
  top80: {
    ctrStudio:   top80avg(vids.map(v => v.ctrStudio)),
    impressions: top80avg(vids.map(v => v.impressions)),
    views24h:    top80avg(vids.map(v => v.views24h)),
  },
  groupAvg: {
    porTipo:      groupAvg(vids, v => v.videoType || 'Sem tipo', v => v.views24h),
    porDiaSemana: groupAvg(vids, v => v.weekday,                 v => v.views24h),
    porHora:      groupAvg(vids, v => v.publishHour,             v => v.views24h),
  },
  escalares: {
    avgVazio:      avg([]),
    sumVazio:      sum([]),
    top80Vazio:    top80avg([]),
    top80Unitario: top80avg([5]),
    avgComNulos:   avg([2, null, 4, NaN]),
    sumComNulos:   sum([10, null, 20, NaN, 30]),
  },
};

// ── Step 4: sanidade do golden ────────────────────────────────────────────
// Se algum campo fracionário sair de 0-1, a cópia introduziu um ×100 e o
// baseline é inválido. Falhar aqui é MUITO melhor que gravar lixo.
const FRACIONARIOS = ['ctrStudioGeral','ctrStudioTop80','ret30s','retMedia','retFinal'];
const problemas = [];

console.log('\n── Step 4: conferência de sanidade ──────────────────────────');
for (const campo of FRACIONARIOS) {
  const v = golden.kpis[campo];
  const ok = typeof v === 'number' && v > 0 && v < 1;
  if (!ok) problemas.push(`${campo} = ${v} (fora da faixa 0-1)`);
  console.log(`  ${ok ? 'OK  ' : 'FALHA'}  ${campo.padEnd(15)} = ${v}   -> ${(v*100).toFixed(1)}% na tela`);
}

const ctr = golden.kpis.ctrStudioGeral;
const ctrOk = Math.abs(ctr - 0.083) < 0.0005;
if (!ctrOk) problemas.push(`ctrStudioGeral = ${ctr}, esperado ~0.083`);
console.log(`  ${ctrOk ? 'OK  ' : 'FALHA'}  ctrStudioGeral ~= 0.083 (toBeCloseTo(0.083, 3))`);

if (problemas.length) {
  console.error('\nBASELINE INVÁLIDO — nada foi gravado:');
  for (const p of problemas) console.error('  - ' + p);
  process.exit(1);
}

// Sem timestamp de propósito: rodar de novo tem de produzir arquivo idêntico.
const destino = join(raiz, 'tests/fixtures/golden.json');
writeFileSync(destino, JSON.stringify(golden, null, 2) + '\n', 'utf8');
console.log('\nSanidade OK. Gravado em tests/fixtures/golden.json\n');
