/**
 * Gera tests/fixtures/exec-payload-anon.json a partir do payload real.
 *
 *   node scripts/anonymize-payload.mjs
 *
 * O payload real (`tests/fixtures/exec-payload.json`) é local e ignorado pelo
 * git — contém dados comerciais. Este script produz a versão versionável.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * O QUE É PRESERVADO (é o valor da fixture — dados reais têm esquisitices que
 * ninguém inventa ao escrever uma fixture à mão):
 *
 *  - nomes, tipos e presença de TODOS os campos, inclusive os que o front
 *    ignora (`id`, `durationRange`, `debug`)
 *  - a quantidade de vídeos e a distribuição de canal / trimestre / tipo
 *  - FORMATOS que o código parseia: `publishDate` "AAAA-MM-DD" (sem hora),
 *    `quarter` "1ºT", `publishHour` "15h" (string com sufixo), `duration`
 *    "MM:SS", `id` "Canal_AAAAMMDD_slug", URL de 11 caracteres
 *  - `weekday` coerente com `publishDate`
 *  - os NULOS de `retention30s` / `retentionFinal`, nas mesmas posições
 *  - `id` vazio nos mesmos vídeos em que era vazio
 *  - a string vazia `""` em `perf`, e as 6 sub-chaves em todos os vídeos
 *  - a monotonia retention30s >= retentionMedia >= retentionFinal, quando
 *    existia no original (o fator de escala é o MESMO para as três)
 *
 * O QUE É SUBSTITUÍDO:
 *
 *  - `title` -> "Vídeo NNN"
 *  - `url`   -> watch?v= + id sintético de 11 chars
 *  - `id`    -> mantém o formato, troca o slug
 *  - `views24h`, `impressions` -> escalados por fator aleatório por vídeo
 *  - `ctrStudio` e as 3 retenções -> escaladas, sempre clampadas em (0, 1)
 *  - `perf`  -> os objetos são EMBARALHADOS entre os vídeos. Preserva a
 *              distribuição exata dos valores (inclusive o `""`) e rompe o
 *              vínculo com o desempenho real de cada vídeo.
 *
 * DETERMINÍSTICO: usa PRNG com semente fixa, não `Math.random()`. Rodar de novo
 * produz arquivo idêntico — se o hash mudar sem o payload real ter mudado,
 * alguém alterou este script.
 * ────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM  = join(raiz, 'tests/fixtures/exec-payload.json');
const DESTINO = join(raiz, 'tests/fixtures/exec-payload-anon.json');

if (!existsSync(ORIGEM)) {
  console.error('Falta ' + ORIGEM);
  console.error('Ele é local e não versionado. Busque um payload novo do /exec antes.');
  process.exit(1);
}

// mulberry32 — PRNG com semente, para o resultado ser reproduzível.
function prng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = prng(20260817);

const entre = (a, b) => a + rnd() * (b - a);
const clamp01 = (x) => Math.min(0.999, Math.max(0.001, x));
const arred = (x, casas) => Number(x.toFixed(casas));

const p = JSON.parse(readFileSync(ORIGEM, 'utf8'));
const V = p.videos;

// ── perf embaralhado (Fisher-Yates com o mesmo PRNG) ──────────────────────
const perfs = V.map(v => v.perf || {});
for (let i = perfs.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [perfs[i], perfs[j]] = [perfs[j], perfs[i]];
}

// ── id sintético de 11 chars, no formato de videoId do YouTube ────────────
const ALFA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const idYT = (n) => {
  let s = '';
  for (let i = 0; i < 11; i++) s += ALFA[(n * 37 + i * 91 + 7) % ALFA.length];
  return s;
};

const videos = V.map((v, i) => {
  const num = String(i + 1).padStart(3, '0');

  // Fatores por vídeo. O mesmo fator serve as três retenções, para preservar a
  // monotonia; views e impressões têm fatores próprios.
  const fViews = entre(0.60, 1.60);
  const fImpr  = entre(0.60, 1.60);
  const fCtr   = entre(0.70, 1.40);
  const fRet   = entre(0.80, 1.15);

  // `id`: preserva o formato Canal_AAAAMMDD_slug e o vazio quando era vazio.
  let idAnon = '';
  if (v.id !== '') {
    const partes = String(v.id).split('_');
    const data = partes[1] && /^\d{8}$/.test(partes[1])
      ? partes[1]
      : String(v.publishDate).replace(/-/g, '');
    idAnon = `${v.channel}_${data}_video${num}`;
  }

  const escalaFracao = (x, f) => (x === null || x === undefined ? x : arred(clamp01(x * f), 4));

  return {
    id:             idAnon,
    channel:        v.channel,                        // preservado: distribuição
    quarter:        v.quarter,                        // preservado: formato "1ºT"
    url:            'https://www.youtube.com/watch?v=' + idYT(i + 1),
    title:          'Vídeo ' + num,
    publishDate:    v.publishDate,                    // preservado: "AAAA-MM-DD", sem hora
    weekday:        v.weekday,                        // preservado: coerente com publishDate
    publishHour:    v.publishHour,                    // preservado: string "15h"
    videoType:      v.videoType,                      // preservado: distribuição
    duration:       v.duration,                       // preservado: "MM:SS"
    durationRange:  v.durationRange,                  // preservado: faixa
    durationSecs:   v.durationSecs,                   // preservado: coerente com duration
    views24h:       Math.round(v.views24h * fViews),
    impressions:    Math.round(v.impressions * fImpr),
    ctrStudio:      escalaFracao(v.ctrStudio, fCtr),
    retention30s:   escalaFracao(v.retention30s, fRet),
    retentionMedia: escalaFracao(v.retentionMedia, fRet),
    retentionFinal: escalaFracao(v.retentionFinal, fRet),
    abTest:         v.abTest,                         // preservado: distribuição
    perf:           perfs[i],                         // embaralhado
  };
});

const anon = {
  videos,
  subscribers: p.subscribers,     // vazio no real; preservado como está
  timestamp:   p.timestamp,       // preservado: string ISO
  debug:       p.debug,           // preservado: nomes de aba, sem métricas
};

writeFileSync(DESTINO, JSON.stringify(anon, null, 2) + '\n', 'utf8');

// ── relatório do que a anonimização preservou ─────────────────────────────
const conta = (arr, f) => arr.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {});
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ok = (b) => (b ? 'OK  ' : 'QUEBROU');

console.log('\n=== distribuições preservadas ===');
for (const [rot, f] of [['canal', v => v.channel], ['trimestre', v => v.quarter],
                        ['tipo', v => v.videoType], ['abTest', v => v.abTest],
                        ['weekday', v => v.weekday], ['publishHour', v => v.publishHour],
                        ['durationRange', v => v.durationRange]]) {
  console.log(`  ${ok(igual(conta(V, f), conta(videos, f)))}  ${rot}`);
}
console.log(`  ${ok(V.length === videos.length)}  contagem de vídeos (${videos.length})`);
console.log(`  ${ok(igual(V.map(v => v.publishDate), videos.map(v => v.publishDate)))}  datas de publicação`);
console.log(`  ${ok(igual(V.map(v => v.id === ''), videos.map(v => v.id === '')))}  posições de id vazio`);

console.log('\n=== nulos preservados ===');
for (const k of ['retention30s', 'retentionFinal', 'retentionMedia']) {
  const a = V.filter(v => v[k] === null).length, b = videos.filter(v => v[k] === null).length;
  console.log(`  ${ok(a === b)}  ${k}: ${a} -> ${b}`);
}

console.log('\n=== frações dentro de 0-1 ===');
for (const k of ['ctrStudio', 'retention30s', 'retentionMedia', 'retentionFinal']) {
  const fora = videos.filter(v => v[k] !== null && !(v[k] > 0 && v[k] < 1));
  console.log(`  ${ok(fora.length === 0)}  ${k} (${fora.length} fora da faixa)`);
}

console.log('\n=== monotonia ret30s >= retMedia >= retFinal ===');
const mono = (arr) => arr.filter(v =>
  v.retention30s != null && v.retentionMedia != null && v.retentionFinal != null &&
  !(v.retention30s >= v.retentionMedia && v.retentionMedia >= v.retentionFinal)).length;
console.log(`  original: ${mono(V)} violações | anonimizado: ${mono(videos)} violações`);
console.log(`  ${ok(mono(V) === mono(videos))}  preservada`);

console.log('\n=== perf ===');
const vals = (arr) => conta(arr.flatMap(v => Object.values(v.perf || {})), x => x);
console.log(`  ${ok(igual(vals(V), vals(videos)))}  distribuição de valores (inclui "")`);
const chaves = (arr) => [...new Set(arr.flatMap(v => Object.keys(v.perf || {})))].sort();
console.log(`  ${ok(igual(chaves(V), chaves(videos)))}  sub-chaves: ${chaves(videos).join(', ')}`);

console.log('\n=== ordem de magnitude das métricas ===');
for (const k of ['views24h', 'impressions']) {
  const s = (arr) => arr.reduce((t, v) => t + (v[k] || 0), 0);
  const r = s(videos) / s(V);
  console.log(`  ${ok(r > 0.7 && r < 1.4)}  ${k}: total anon / total real = ${r.toFixed(3)}`);
}

console.log('\nGravado em tests/fixtures/exec-payload-anon.json\n');
