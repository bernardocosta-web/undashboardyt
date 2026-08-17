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

Seguir `docs/backend/runbook-diagnostico.md` até o `/exec` devolver JSON válido.
Registrar a causa no ADR 0001.

**O que isso bloqueia, e o que não bloqueia:** as **Tasks 0 a 3** rodam sem
backend — usam a fixture sintética da Task 0. As **Tasks 4 e 5** ficam
bloqueadas, porque a validação de "mesmo comportamento" é visual e exige o
dashboard carregando com dados reais (ver o bloco P1–P4 na Task 4). Ou seja: dá
para começar a refatoração hoje, mas não para terminá-la.

---

### Task 0: Congelar baseline (antes de tocar em qualquer coisa)

**Por que primeiro:** o plano exige "os números depois têm de bater com os de
antes", mas a referência mora dentro do monólito. Assim que o `index.html` for
desmontado, ela desaparece. Esta task materializa a referência em disco **antes**
de qualquer extração.

**Files:**
- Create: `package.json`
- Create (fixture): `tests/fixtures/videos.sample.json`
- Create (descartável): `scripts/baseline-snapshot.mjs`
- Create (saída): `tests/fixtures/golden.json`

- [ ] **Step 0: Preparar o ambiente de teste**

Absorve o que era o passo 5.2 do `COMECE-AQUI.md`, para guia e plano não se
contradizerem. Criar `package.json` com `"type": "module"` e os scripts:

```jsonc
"scripts": {
  "test":       "vitest run",
  "test:watch": "vitest",
  "baseline":   "node scripts/baseline-snapshot.mjs"
}
```

Instalar com `npm install --save-dev vitest` (deixar o npm resolver a versão em
vez de fixar um número à mão) e confirmar que `node_modules/` é ignorado:

```bash
git check-ignore -v node_modules   # deve casar com .gitignore:1
```

`npm test` aqui responde "No test files found, exiting with code 1" — correto
neste ponto, porque os testes só nascem na Task 1.

- [ ] **Step 1: Montar a fixture sintética**

`tests/fixtures/videos.sample.json` com **10 vídeos** (10 é o mínimo para o corte
do `top80avg` ser observável: `floor(10*0.8)=8`, descarta 2). Requisitos:

- `ctrStudio` com dispersão real e **média exatamente 0,083**. Valores usados:
  `0.041, 0.055, 0.067, 0.075, 0.083, 0.083, 0.091, 0.104, 0.111, 0.120`
  (soma 0,830 ÷ 10). **Atenção:** média 0,0835 **reprova** o assert
  `toBeCloseTo(0.083, 3)` da Task 1 — a tolerância é `< 0,0005` e 0,0835 cai
  exatamente no limite, onde a comparação é estrita. A média tem de ser 0,083.
- `retention30s`, `retentionMedia`, `retentionFinal` variadas em 0–1, com
  `retentionFinal` sempre ≤ `retentionMedia` ≤ `retention30s`.
- Os 3 canais, ≥2 `quarter`, ≥3 `videoType`, `abTest` misturando `true` e
  `false` (**boolean**, ver "Contrato — estado de filtros" no SPEC).
- **`weekday` e `publishHour` preenchidos em todos os vídeos.** Os gráficos 2 e
  3 leem esses dois campos **direto do payload** — o front não os calcula a
  partir de `publishDate` (ver `index.html:880` e `:917`). Sem eles,
  `porDiaSemana` e `porHora` saem vazios no golden e a lacuna passa batido.
- `publishDate` coerente com `weekday`, cobrindo os 7 dias da semana, e
  `publishHour` com horas repetidas e distintas, para o `groupAvg` ter buckets
  de 1 e de vários itens.
- **Pelo menos um `null` e um valor não numérico** em `views24h`/`impressions`,
  para travar o descarte de `null`/`NaN` em `avg`/`sum`/`groupAvg`.

- [ ] **Step 2: Copiar as funções puras, sem alterar nada**

`scripts/baseline-snapshot.mjs` recebe `avg`, `sum`, `top80avg`, `groupAvg` e
`calcKPIs` **copiados verbatim** do `index.html` (linhas ~566–600). Copiar, não
melhorar: se a função parecer estranha, ela fica estranha. Qualquer "correção"
aqui envenena a referência e o resto do plano passa a validar contra o valor
errado.

- [ ] **Step 3: Gerar o golden**

Rodar e gravar `tests/fixtures/golden.json` com, no mínimo:

```jsonc
{
  "kpis":       { /* calcKPIs(videos) completo, 10 chaves */ },
  "top80":      { "ctrStudio": 0.0, "impressions": 0.0 },
  "groupAvg":   { "porTipo": {}, "porDiaSemana": {}, "porHora": {} },
  "escalares":  { "avgVazio": null, "sumVazio": 0 }
}
```

- [ ] **Step 4: Conferir o golden a olho antes de confiar nele**

Checagem obrigatória: em `kpis`, os campos `ctrStudioGeral`, `ctrStudioTop80`,
`ret30s`, `retMedia` e `retFinal` têm de estar **entre 0 e 1**. Se algum vier
como 8.3 em vez de 0.083, a cópia introduziu um `×100` e o baseline está
inválido — refazer o Step 2.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/fixtures scripts/baseline-snapshot.mjs
git commit -m "test: congela baseline das funções puras antes da refatoração"
```

**Propriedade a preservar:** o `golden.json` é gravado **sem timestamp**, de
propósito. Rodar `npm run baseline` de novo produz um arquivo byte a byte
idêntico (confirmado por hash). Se um dia o hash mudar sem ninguém ter mexido na
fixture, alguém alterou as funções copiadas — e isso é exatamente o alarme que
esta task existe para disparar.

> `scripts/baseline-snapshot.mjs` é descartável: pode ser removido no fim da
> Task 3, quando os módulos já reproduzem o `golden.json`. As duas fixtures
> **ficam** — são a rede de segurança das Tasks 1 a 3.

---

### Task 1: Extrair lib de matemática pura com testes

**Files:**
- Create: `src/lib/math.js`
- Test: `tests/lib/math.test.js`
- Consumes (da Task 0): `tests/fixtures/videos.sample.json`, `tests/fixtures/golden.json`

**Interfaces:**
- Produces: `avg(arr): number|null`, `sum(arr): number`,
  `top80avg(arr): number|null`, `groupAvg(vids, keyFn, valFn): Record<string,number>`,
  `calcKPIs(vids): {total,totalViews,avgViews,totalImpress,avgImpress,ctrStudioGeral,ctrStudioTop80,ret30s,retMedia,retFinal}`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { top80avg, avg, sum, groupAvg, calcKPIs } from '../../src/lib/math.js';
import vids   from '../fixtures/videos.sample.json' with { type: 'json' };
import golden from '../fixtures/golden.json'        with { type: 'json' };

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

describe('sum', () => {
  it('soma ignorando null/NaN', () => {
    expect(sum([10, null, 20, NaN, 30])).toBe(60);
  });
  it('retorna 0 para lista vazia — diferente de avg, que retorna null', () => {
    expect(sum([])).toBe(0);
    expect(avg([])).toBeNull();
  });
});

describe('groupAvg', () => {
  it('agrupa por chave e tira a média de cada grupo', () => {
    const xs = [
      { channel:'Principal', views24h:100 },
      { channel:'Principal', views24h:200 },
      { channel:'Militares', views24h:50  },
    ];
    expect(groupAvg(xs, v=>v.channel, v=>v.views24h))
      .toEqual({ Principal:150, Militares:50 });
  });
  it('descarta chave null/vazia e valor não numérico', () => {
    const xs = [
      { channel:'',          views24h:100  },   // chave vazia -> fora
      { channel:null,        views24h:100  },   // chave null  -> fora
      { channel:'Principal', views24h:null },   // valor null  -> fora
      { channel:'Principal', views24h:80   },
    ];
    expect(groupAvg(xs, v=>v.channel, v=>v.views24h)).toEqual({ Principal:80 });
  });
});

describe('calcKPIs', () => {
  it('devolve exatamente as 10 chaves do contrato do SPEC', () => {
    expect(Object.keys(calcKPIs(vids)).sort()).toEqual([
      'avgImpress','avgViews','ctrStudioGeral','ctrStudioTop80','ret30s',
      'retFinal','retMedia','total','totalImpress','totalViews',
    ]);
  });

  // ── TRAVA DO INVARIANTE MAIS PERIGOSO ────────────────────────────────────
  // ctrStudio e as retenções são frações 0–1 e só viram percentual na
  // EXIBIÇÃO (fmtPct). Se alguém multiplicar por 100 dentro do cálculo, este
  // teste falha. É a única defesa automatizada contra o bug de 100×.
  it('mantém ctrStudio e retenções como fração 0–1, nunca ×100', () => {
    const k = calcKPIs(vids);
    for (const campo of ['ctrStudioGeral','ctrStudioTop80','ret30s','retMedia','retFinal']) {
      expect(k[campo], `${campo} saiu da faixa 0–1`).toBeGreaterThan(0);
      expect(k[campo], `${campo} parece ter sido multiplicado por 100`).toBeLessThan(1);
    }
    expect(k.ctrStudioGeral).toBeCloseTo(0.083, 3);   // ~8,3% na tela
  });

  it('reproduz o golden congelado na Task 0, campo por campo', () => {
    expect(calcKPIs(vids)).toEqual(golden.kpis);
  });
});
```

> O último teste é o que dá sentido à Task 0: compara a implementação nova com a
> saída do monólito original, não com um número que alguém digitou à mão.

- [ ] **Step 1b: Propriedade `top80avg(xs) >= avg(xs)`**

Implementada em `tests/lib/math.test.js`, no `describe('propriedade …')`.

**O que ela NÃO cobre:** ordenação invertida. Esse caso já cai no assert exato
de n=10 acima — o correto é `52/8 = 6.5` e o invertido daria `36/8 = 4.5`, então
o assert quebra sozinho. Registrar isso importa para ninguém acher que a
propriedade é redundante com ele, nem que cobre o que não cobre.

**O que ela cobre:** generalidade sobre `n`. O assert exato trava um único
tamanho de entrada; o corte `floor(n*0.8)` muda de comportamento conforme `n`:

| `n` | `floor(n*0.8)` | observação |
|-----|----------------|------------|
| 1   | 0              | resgatado por `Math.max(1, 0)` |
| 2   | 1              | o top80 fica com **um** elemento (= o máximo) |
| 3   | 2              | |
| 7   | 5              | |
| 10  | 8              | o único caso coberto pelo assert exato |

Uma alteração em `Math.max(1, …)`, no `floor` (trocado por `ceil`/`round`) ou no
fator `0.8` pode manter n=10 correto e estragar n=1, 2 ou 3.

A relação é garantia matemática, não coincidência da fixture: a média dos `k`
maiores de `n` valores é sempre ≥ a média dos `n`.

Casos exercitados: **n=1, 2, 3, 7, 10**; **todos os valores iguais** (tem de dar
igualdade — é por isso que o operador é `>=` e não `>`); **com duplicatas**;
**lista vazia**; **lista só de inválidos**; e os **6 arrays reais da fixture**.

**Borda definida:** quando não sobra nenhum valor válido após o filtro, `avg` e
`top80avg` retornam **os dois** `null` — é a mesma condição nas duas funções
(`v.length === 0`). O helper compara `null` com `null` e **não** usa `>=`, porque
em JS `null >= null` coage para `0 >= 0` e passaria por acidente, escondendo uma
eventual troca de `null` por `0` no retorno.

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
git add src/lib/math.js tests/lib/math.test.js
git commit -m "refactor: extrai lib de matemática pura com testes"
```

> As fixtures **não** entram aqui — já foram versionadas na Task 0. Antes de
> commitar, conferir que a cópia é verbatim: normalizando espaços e o `export`, o
> corpo de `src/lib/math.js` tem de ser idêntico às linhas 566-600 do
> `index.html`. Divergência aqui significa que alguém "melhorou" a lógica.

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

// Estado de filtro neutro. Os valores conferem com `index.html` linhas 440 /
// 226-228 / 556 — ver "Contrato — estado de filtros" no SPEC.md.
const semFiltro = () => ({
  channels: new Set(), quarters: new Set(), videoTypes: new Set(),
  abTest: 'all', dateFrom: null, dateTo: null,
});

describe('getFiltered', () => {
  it('filtra por canal', () => {
    expect(getFiltered(vids, { ...semFiltro(), channels:new Set(['Militares']) })
      .map(v=>v.channel)).toEqual(['Militares']);
  });

  it('conjunto vazio não filtra nada', () => {
    expect(getFiltered(vids, semFiltro())).toHaveLength(2);
  });

  // ── TRI-ESTADO DO FILTRO A/B: 'all' | true | false ───────────────────────
  // O campo do VÍDEO é boolean; o do FILTRO é string 'all' OU boolean.
  // Não existe 'yes'/'no' — 'Sim'/'Não' são só rótulos de botão.
  it("abTest 'all' devolve os dois", () => {
    expect(getFiltered(vids, { ...semFiltro(), abTest:'all' })).toHaveLength(2);
  });
  it('abTest true devolve só quem participou', () => {
    expect(getFiltered(vids, { ...semFiltro(), abTest:true })
      .map(v=>v.channel)).toEqual(['Principal']);
  });
  it('abTest false devolve só quem não participou', () => {
    expect(getFiltered(vids, { ...semFiltro(), abTest:false })
      .map(v=>v.channel)).toEqual(['Militares']);
  });

  // Guarda de regressão: a comparação em getFiltered é `!==` estrita contra o
  // boolean do vídeo. Se alguém "normalizar" o filtro para string, nenhum vídeo
  // casa e o dashboard esvazia silenciosamente. Este teste documenta a armadilha
  // e falha se o contrato do filtro for trocado sem ADR.
  it('string no lugar de boolean descarta tudo (por isso o tipo é boolean)', () => {
    expect(getFiltered(vids, { ...semFiltro(), abTest:'yes' })).toHaveLength(0);
    expect(getFiltered(vids, { ...semFiltro(), abTest:'Sim' })).toHaveLength(0);
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

> ### Pré-requisito obrigatório das Tasks 4 e 5 — ANTES de desmontar o monólito
>
> As Tasks 1 a 3 têm teste automatizado. As Tasks 4 e 5 tocam DOM, canvas e PDF,
> e são validadas por conferência visual — que exige um "antes" ainda existente.
> Depois que o `index.html` virar shell modular, o estado anterior não é mais
> reproduzível: a referência tem de estar em disco antes.
>
> - [ ] **P1. Salvar um payload real.** Com o `/exec` devolvendo JSON (ver
>   "Pré-requisito (fora do TDD)" no topo), gravar a resposta crua em
>   `tests/fixtures/exec-payload.json`. É o único registro do formato real do
>   Apps Script; se a fonte mudar (ADR 0001), ele segue valendo como referência.
> - [ ] **P2. Registrar os KPIs renderizados pelo monólito.** Com o dashboard
>   atual aberto e **sem filtro aplicado**, anotar em
>   `docs/backend/baseline-kpis-AAAA-MM-DD.md`: os KPIs do topo exatamente como
>   aparecem na tela, o texto "Atualizado em ...", o número de linhas da tabela
>   de ranking e a ordenação inicial (`views24h`, maior primeiro).
> - [ ] **P3. Repetir com um filtro não trivial** — ex.: canal `Militares` +
>   A/B = `Sim` + um intervalo de datas — e anotar os mesmos valores. Um único
>   cenário não detecta erro introduzido na camada de filtros.
> - [ ] **P4.** Só depois de P1–P3 iniciar o Step 1 abaixo.
>
> **Se o backend ainda estiver quebrado, pare aqui.** As Tasks 4 e 5 não têm
> como ser validadas sem dados reais. As Tasks 0 a 3 seguem normalmente, porque
> usam fixtures.

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

> **Pré-requisito:** vale o mesmo bloco P1–P4 da Task 4. Se a Task 4 foi feita
> na mesma sessão, o baseline já está gravado e serve aqui; se não, registrar de
> novo antes de mover qualquer `render`. Sem baseline, "conferir visualmente" não
> tem contra o que conferir.

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
  silencioso que enganam decisão de conteúdo — têm teste. `avg`, `sum`,
  `top80avg`, `groupAvg` e `calcKPIs` são todos exercitados por assert, não só
  importados. Gráficos e render são validados por checklist visual (DOM/canvas
  não valem TDD aqui), agora ancorado num baseline gravado antes da mexida.
- **Baseline:** a Task 0 congela a saída das funções originais em
  `tests/fixtures/golden.json`, e as Tasks 1 a 3 têm de reproduzi-lo. Para as
  Tasks 4 e 5, o bloco P1–P4 exige payload real e KPIs anotados antes de
  desmontar o monólito. Nenhuma etapa valida contra número digitado à mão.
- **Invariante das frações:** travado por assert em `calcKPIs` — os cinco campos
  fracionários têm de ficar em 0–1, então um `×100` acidental no cálculo quebra o
  teste em vez de virar bug silencioso na tela.
- **Sem placeholders:** cada task tem código real e comando de teste.
- **Consistência de tipos:** nomes batem com `SPEC.md` (`views24h`, `ctrStudio`,
  `retention30s/media/final`). `abTest` é **boolean no vídeo** e **tri-estado
  (`'all' | true | false`) no filtro** — dois tipos, documentados em "Contrato —
  estado de filtros" e cobertos por guarda de regressão na Task 3.

## Execution Handoff

Plano salvo. Duas opções de execução no seu Claude Code com superpowers:
1. **Subagent-Driven (recomendado)** — um subagente por task, revisão entre elas.
2. **Inline** — executa as tasks na sessão com checkpoints.
