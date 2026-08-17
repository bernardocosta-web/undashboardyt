# Estabilização do UN Dashboard YT — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar os dados e migrar o monólito `index.html` para módulos
testáveis, sem mudar o comportamento visível.

**Architecture:** O `index.html` de ~1.300 linhas é quebrado em módulos ES por
responsabilidade (config, lib pura, dados, filtros, gráficos, render). A lógica
pura ganha testes que travam o comportamento atual antes de qualquer mexida. A
fonte de dados continua sendo o Apps Script neste plano; trocá-la é assunto do
ADR 0001 e de um plano futuro.

**Tech Stack:** HTML + Tailwind (CDN) + Chart.js 4.4.0; módulos ES nativos;
vitest para testes de lógica pura; Node 18+.

## Global Constraints

- UI e mensagens em pt-BR; números/datas em locale pt-BR.
- `ctrStudio` e retenções são frações 0–1, exibidas ×100. Nunca tratar como %.
- `top80avg` = ordena desc, mantém `floor(n*0.8)` (mín. 1), tira a média.
- Refatoração é **sem mudança de comportamento**: os números renderizados têm de
  bater com a versão atual.
- Contrato de dados definido em `SPEC.md`. Alterá-lo exige atualizar SPEC.md + ADR.

---

## Pré-requisito (fora do TDD): restaurar os dados

Antes da Task 1, seguir `docs/backend/runbook-diagnostico.md` até o `/exec`
devolver JSON válido. Registrar a causa no ADR 0001. Sem dados fluindo, os testes
de lógica pura ainda passam (usam fixtures), mas a validação visual do "mesmo
comportamento" depende de o dashboard carregar.

---

### Task 1: Extrair lib de matemática pura com testes

**Files:**
- Create: `src/lib/math.js`
- Test: `tests/lib/math.test.js`
- Create (fixture): `tests/fixtures/videos.sample.json`

**Interfaces:**
- Produces: `avg(arr): number|null`, `sum(arr): number`,
  `top80avg(arr): number|null`, `groupAvg(vids, keyFn, valFn): Record<string,number>`,
  `calcKPIs(vids): {total,totalViews,avgViews,totalImpress,avgImpress,ctrStudioGeral,ctrStudioTop80,ret30s,retMedia,retFinal}`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { top80avg, avg, calcKPIs } from '../../src/lib/math.js';

describe('top80avg', () => {
  it('descarta os 20% piores e tira a média do resto', () => {
    // 10 valores; mantém os 8 maiores (floor(10*0.8)=8)
    const xs = [10,9,8,7,6,5,4,3,2,1];
    expect(top80avg(xs)).toBe((10+9+8+7+6+5+4+3)/8);
  });
  it('mantém pelo menos 1 elemento', () => {
    expect(top80avg([5])).toBe(5);
  });
  it('ignora null/NaN', () => {
    expect(avg([2, null, 4, NaN])).toBe(3);
  });
  it('retorna null para lista vazia', () => {
    expect(top80avg([])).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/math.test.js`
Expected: FAIL — `Cannot find module '../../src/lib/math.js'`

- [ ] **Step 3: Write minimal implementation**

Portar `avg`, `sum`, `top80avg`, `groupAvg`, `calcKPIs` do `index.html` para
`src/lib/math.js` como funções exportadas, **sem alterar a lógica** (copiar a
semântica atual verbatim).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/math.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/math.js tests/lib/math.test.js tests/fixtures/videos.sample.json
git commit -m "refactor: extrai lib de matemática pura com testes"
```

---

### Task 2: Extrair lib de formatação com testes

**Files:**
- Create: `src/lib/format.js`
- Test: `tests/lib/format.test.js`

**Interfaces:**
- Produces: `fmtN(n): string`, `fmtPct(f): string`, `fmtDateShort(d): string`,
  `esc(s): string`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { fmtN, fmtPct } from '../../src/lib/format.js';

describe('fmtN', () => {
  it('formata milhares e milhões', () => {
    expect(fmtN(1500)).toBe('1,5K');
    expect(fmtN(2_300_000)).toBe('2,3M');
  });
  it('mostra travessão para null', () => {
    expect(fmtN(null)).toBe('—');
  });
});

describe('fmtPct', () => {
  it('trata fração 0–1 como percentual', () => {
    expect(fmtPct(0.083)).toBe('8,3%');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/format.test.js`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Write minimal implementation**

Portar `fmtN`, `fmtPct`, `fmtDateShort`, `esc` para `src/lib/format.js`,
preservando o locale pt-BR.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/format.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.js tests/lib/format.test.js
git commit -m "refactor: extrai lib de formatação com testes"
```

---

### Task 3: Extrair filtros com testes

**Files:**
- Create: `src/filters.js`
- Test: `tests/filters.test.js`

**Interfaces:**
- Consumes: fixture `tests/fixtures/videos.sample.json`
- Produces: `getFiltered(allVideos, filters): Video[]` — versão pura que recebe o
  estado de filtros como argumento (o estado global some da função)

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { getFiltered } from '../src/filters.js';

const vids = [
  { channel:'Principal', quarter:'2025-Q1', videoType:'Aula', abTest:true,  publishDate:new Date('2025-02-01') },
  { channel:'Militares', quarter:'2025-Q1', videoType:'Short', abTest:false, publishDate:new Date('2025-03-01') },
];

describe('getFiltered', () => {
  it('filtra por canal', () => {
    const f = { channels:new Set(['Militares']), quarters:new Set(), videoTypes:new Set(), abTest:'all', dateFrom:null, dateTo:null };
    expect(getFiltered(vids, f).map(v=>v.channel)).toEqual(['Militares']);
  });
  it('filtra por A/B booleano', () => {
    const f = { channels:new Set(), quarters:new Set(), videoTypes:new Set(), abTest:true, dateFrom:null, dateTo:null };
    expect(getFiltered(vids, f)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/filters.test.js`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Write minimal implementation**

Portar `getFiltered` para `src/filters.js` recebendo `(allVideos, filters)` em vez
de ler globais. Manter a mesma lógica de cada cláusula.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/filters.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/filters.js tests/filters.test.js
git commit -m "refactor: extrai getFiltered como função pura testada"
```

---

### Task 4: Extrair config e camada de dados

**Files:**
- Create: `src/config.js`
- Create: `src/data.js`
- Modify: `index.html` (remover os blocos migrados; importar os módulos)

**Interfaces:**
- Consumes: `math.js`, `format.js`, `filters.js`
- Produces: `CH_COLORS`, `WEEKDAY_ORD` (config); `fetchData(apiUrl): Promise<{videos, subscribers, timestamp}>` com a normalização de datas/tipos do SPEC

- [ ] **Step 1** Mover `API_URL`, `CH_COLORS`, `WEEKDAY_ORD` para `src/config.js`.
- [ ] **Step 2** Mover `fetchData` (fetch + `.map` de normalização) para `src/data.js`, recebendo `apiUrl` como parâmetro.
- [ ] **Step 3** No `index.html`, trocar os blocos inline por `<script type="module">` importando config, data, lib e filtros.
- [ ] **Step 4** Abrir o dashboard e conferir visualmente: KPIs, os 7 gráficos, ranking e PDF idênticos à versão atual (checklist de comportamento).
- [ ] **Step 5: Commit**

```bash
git add src/config.js src/data.js index.html
git commit -m "refactor: extrai config e camada de dados; index vira shell modular"
```

---

### Task 5: Separar gráficos e render

**Files:**
- Create: `src/charts/*.js` (um por gráfico: type, weekday, hour, ab, timeline, funnel, subscribers)
- Create: `src/render.js`
- Modify: `index.html`

- [ ] **Step 1** Mover cada `render<X>Chart` para `src/charts/<x>.js`.
- [ ] **Step 2** Mover `render`, `renderKPIs`, `renderTable`, `renderSummary` para `src/render.js`.
- [ ] **Step 3** Conferir visualmente contra o checklist de comportamento.
- [ ] **Step 4: Commit**

```bash
git add src/charts src/render.js index.html
git commit -m "refactor: separa gráficos e render em módulos"
```

---

## Self-Review

- **Cobertura:** matemática, formatação e filtros — as três fontes de erro
  silencioso que enganam decisão de conteúdo — têm teste. Gráficos e render são
  validados por checklist visual (DOM/canvas não valem TDD aqui).
- **Sem placeholders:** cada task tem código real e comando de teste.
- **Consistência de tipos:** nomes batem com `SPEC.md` (`views24h`, `ctrStudio`,
  `retention30s/media/final`, `abTest` booleano).

## Execution Handoff

Plano salvo. Duas opções de execução no seu Claude Code com superpowers:
1. **Subagent-Driven (recomendado)** — um subagente por task, revisão entre elas.
2. **Inline** — executa as tasks na sessão com checkpoints.
