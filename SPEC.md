# SPEC.md — Estado atual do UN Dashboard YT

Fonte da verdade sobre **como o dashboard funciona hoje**, extraída do
`index.html` real (branch `main`, ~1.334 linhas). Usada como baseline para
refatorar sem mudar comportamento.

---

## Fonte de dados

Um único endpoint, um Apps Script Web App:

```
GET https://script.google.com/macros/s/<deployment>/exec?t=<timestamp>
```

Resposta esperada (JSON):

```jsonc
{
  "videos":      [ /* objeto de vídeo, ver abaixo */ ],
  "subscribers": [ /* objeto de inscrito, ver abaixo */ ],
  "timestamp":   1699999999999      // ms ou ISO; exibido como "Atualizado em ..."
}
```

Em erro, o backend devolve `{ "error": "mensagem" }` — o front lança e mostra o
banner "Erro:". Se o `/exec` devolver HTML (página de login do Google), o
`res.json()` falha e cai no mesmo banner. Ver
`docs/backend/runbook-diagnostico.md`.

## Contrato — objeto de vídeo

| Campo             | Tipo             | Observação                                              |
|-------------------|------------------|--------------------------------------------------------|
| `channel`         | string           | "Principal" \| "Militares" \| "Superiores"             |
| `title`           | string           |                                                        |
| `url`             | string           | link do vídeo                                          |
| `publishDate`     | string→Date      | parseado com `new Date()`                              |
| `weekday`         | string           | `"Seg"`…`"Dom"` — **vem pronto do backend**, ver nota  |
| `publishHour`     | number           | 0–23 — **vem pronto do backend**, ver nota             |
| `quarter`         | string           | ex. "2025-Q1"; alimenta filtro dinâmico de trimestre   |
| `videoType`       | string           | normalizado (trim + colapso de espaços)                |
| `duration`        | string           | exibida na coluna "Duração" (`index.html:782`)          |
| `durationSecs`    | number           | **só** ordena a coluna Duração — ver nota abaixo        |
| `views24h`        | number           | views nas primeiras 24h                                |
| `impressions`     | number           |                                                        |
| `ctrStudio`       | number (fração)  | **0–1**, exibido ×100                                  |
| `retention30s`    | number (fração)  | **0–1**                                                |
| `retentionMedia`  | number (fração)  | **0–1**                                                |
| `retentionFinal`  | number (fração)  | **0–1**                                                |
| `abTest`          | boolean          | participou de teste A/B — **boolean**; o filtro homônimo é tri-estado, ver "Contrato — estado de filtros" |
| `perf`            | object           | colore a tabela — chaves próprias, ver tabela abaixo    |

### `perf` — as chaves NÃO são os nomes dos campos

`perf` é `{ <chave>: "Bom" | "Médio" | "Ruim" }`, mas as chaves são abreviadas e
em português, e divergem dos nomes das métricas. Lidas em `index.html:783-788`
como `p.<chave>`, onde `p = v.perf || {}`:

| Chave em `perf` | Colore a métrica | Bate com o nome do campo? |
|-----------------|------------------|---------------------------|
| `views`         | `views24h`       | **não**                   |
| `impressoes`    | `impressions`    | **não** — e em português  |
| `ctrStudio`     | `ctrStudio`      | sim                       |
| `ret30s`        | `retention30s`   | **não**                   |
| `retMedia`      | `retentionMedia` | **não**                   |
| `retFinal`      | `retentionFinal` | **não**                   |

> Quem reconstruir o payload usando `views24h` como chave do `perf` perde a
> coloração da tabela — sem erro no console, só células sem cor. Chave ausente cai
> no `|| {}` e a célula fica neutra.

### `durationSecs` só existe como chave dinâmica

`durationSecs` **nunca** aparece como `v.durationSecs` no código. Ele existe
apenas como string em `RANK_COLS` (`index.html:716`, `sortKey:'durationSecs'`) e
é consumido em `index.html:740` via `a[rankSort]`. Por isso não aparece em busca
textual por `v.<campo>` — foi assim que escapou da primeira versão deste contrato.

> Se a fonte de dados mudar (ADR 0001) e não enviar `durationSecs`, o comparador
> cai em `va == null && vb == null → return 0` e clicar em "Duração" **não ordena
> nada**, sem erro. Mesma família de falha silenciosa do `weekday`/`publishHour`.

### Colunas ordenáveis (`RANK_COLS`, `index.html:711-723`)

`rankSort` só assume um destes valores, todos lidos via `a[rankSort]`:

`channel`, `videoType`, `durationSecs`, `views24h`, `impressions`, `ctrStudio`,
`retention30s`, `retentionMedia`, `retentionFinal`.

As colunas `#` e `Título` têm `sortKey: null` e não são ordenáveis. Note que
`channel` e `videoType` são **strings** — o comparador usa `<`/`>`, portanto
ordenação lexicográfica, não alfabética com locale (acentos não são tratados).

**Nulos sempre no fim, nas duas direções.** O comparador testa `va == null`
*antes* de aplicar `rankDir`, então valores ausentes ficam presos no fim tanto em
ordem crescente quanto decrescente:

```js
if (va == null && vb == null) return 0;
if (va == null) return 1; if (vb == null) return -1;
return rankDir * (va < vb ? -1 : va > vb ? 1 : 0);
```

> **`weekday` e `publishHour` são derivados no backend, não no front.** O
> `fetchData` só espalha o objeto (`...v`) e converte `publishDate`; nunca calcula
> dia da semana nem hora. Os gráficos 2 (views por dia) e 3 (views por horário)
> leem `v.weekday` e `v.publishHour` diretamente (`index.html:880` e `:917`).
> Consequência prática: se a fonte de dados mudar (ADR 0001) e o novo payload não
> trouxer esses dois campos, os dois gráficos ficam **vazios sem erro** — o
> `groupAvg` descarta chave `null` silenciosamente. Quem trocar a fonte precisa
> derivá-los ou mover o cálculo para `src/data.js`.

## Contrato — objeto de inscrito

| Campo     | Tipo        | Observação                          |
|-----------|-------------|-------------------------------------|
| `channel` | string      | mesmo domínio dos canais            |
| `date`    | string→Date | parseado com `new Date()`           |
| `count`   | number      | (usado no gráfico de inscritos)     |

Hoje vem vazio — ver limitação em "Problemas conhecidos".

## Contrato — estado de filtros

Dois estados independentes. **O ponto que mais engana:** o campo `abTest` existe
nos dois com **tipos diferentes**.

### Filtros globais (`filters`) — afetam KPIs, gráficos e tabela

| Campo        | Tipo                     | Inicial | Observação                                                    |
|--------------|--------------------------|---------|---------------------------------------------------------------|
| `channels`   | `Set<string>`            | vazio   | conjunto vazio = todos (não filtra)                           |
| `quarters`   | `Set<string>`            | vazio   | vazio = todos                                                 |
| `videoTypes` | `Set<string>`            | vazio   | vazio = todos                                                 |
| `abTest`     | `'all' \| true \| false` | `'all'` | **tri-estado: string OU boolean** — ver abaixo                |
| `dateFrom`   | `Date \| null`           | `null`  | `new Date('AAAA-MM-DD')` → meia-noite **UTC**                 |
| `dateTo`     | `Date \| null`           | `null`  | `new Date('AAAA-MM-DD' + 'T23:59:59')` → fim do dia **local** |

### Bordas do intervalo de datas: as duas são INCLUSIVAS

`getFiltered` (`index.html:557-558`):

```js
if (filters.dateFrom && (!v.publishDate || v.publishDate < filters.dateFrom)) return false;
if (filters.dateTo   && (!v.publishDate || v.publishDate > filters.dateTo))   return false;
```

A **exclusão** usa `<` e `>` estritos, então o que passa é `>= dateFrom` e
`<= dateTo`: **ambas as bordas são inclusivas**. Um vídeo publicado exatamente na
data-limite entra na contagem. A tabela de ranking repete a mesma semântica em
`index.html:732-733`, com `rankDateFrom`/`rankDateTo`.

**Vídeo sem `publishDate`:** excluído sempre que houver **qualquer** filtro de
data ativo (por causa do `!v.publishDate ||`). Sem filtro de data, ele passa.

### A armadilha de fuso que move um vídeo sem ninguém notar

As bordas são inclusivas, mas os dois extremos são **construídos de formas
diferentes** (`index.html:543-544`):

```js
filters.dateFrom = df ? new Date(df) : null;                // 'AAAA-MM-DD'      -> meia-noite UTC
filters.dateTo   = dt ? new Date(dt + 'T23:59:59') : null;  // 'AAAA-MM-DDT…'    -> 23:59:59 LOCAL
```

Pela especificação de `Date`, uma data pura (`'2025-01-06'`) é interpretada como
**UTC**, e uma data com hora (`'2025-01-06T23:59:59'`) como **hora local**. Em
UTC−3, `dateFrom` portanto começa às **21:00 do dia anterior**, hora local.

Consequência concreta: filtrando **de 06/01**, um vídeo publicado em **05/01 às
22:00 local** entra na contagem — em UTC ele é `2025-01-06T01:00Z`, que é
posterior a `2025-01-06T00:00Z`. O `dateTo` não tem o problema: 23:59:59 local é
o fim correto do dia local.

> **Comportamento herdado — preservar na refatoração.** É precisamente o caso de
> erro que altera a contagem em um vídeo mantendo o número plausível. Corrigir a
> assimetria é decisão separada, com ADR e com alguém conferindo qual número
> mudou. Não de carona numa extração de módulo.

### `abTest`: boolean no vídeo, tri-estado no filtro

- **No objeto de vídeo:** `v.abTest` é **boolean** (`true`/`false`).
- **No estado de filtro:** `filters.abTest` é a string `'all'` **ou** o boolean
  `true` **ou** o boolean `false`. Não são `'yes'`/`'no'` nem `'Sim'`/`'Não'` —
  esses rótulos existem só na UI (botões Todos/Sim/Não) e na legenda do resumo.

Origem dos valores, em `index.html`:

```html
<button onclick="setAB('all')" id="ab-all">Todos</button>
<button onclick="setAB(true)"  id="ab-sim">Sim</button>
<button onclick="setAB(false)" id="ab-nao">Não</button>
```

A cláusula do filtro usa **comparação estrita**:

```js
if (filters.abTest !== 'all' && v.abTest !== filters.abTest) return false;
```

> **Invariante:** a união `string | boolean` é proposital e **não** pode ser
> "normalizada" para strings. Como a comparação é `!==` estrita, trocar o filtro
> para `'yes'`/`'no'` tornaria `v.abTest !== filters.abTest` sempre verdadeiro e
> **todo vídeo seria descartado** — tabela e gráficos ficariam vazios, sem erro
> no console e sem nada quebrado aparentemente. Mudar isso exige ADR.

### Estado exclusivo da tabela de ranking

Independente de `filters`; a tabela aplica os dois em sequência.

| Campo          | Tipo           | Inicial      | Observação                                  |
|----------------|----------------|--------------|---------------------------------------------|
| `rankSort`     | string         | `'views24h'` | chave da coluna ordenada                    |
| `rankDir`      | `-1 \| 1`      | `-1`         | `-1` = maior primeiro; `1` = menor primeiro |
| `rankDateFrom` | `Date \| null` | `null`       | filtro de data próprio da tabela            |
| `rankDateTo`   | `Date \| null` | `null`       | `+ 'T23:59:59'`, fim do dia local           |

## Métricas derivadas

- `avg(arr)` — média ignorando `null`/`NaN`.
- `sum(arr)` — soma ignorando `null`/`NaN`.
- `top80avg(arr)` — ordena desc, mantém os primeiros 80% (`floor(n*0.8)`, mínimo
  1), tira a média. Objetivo: revelar o peso dos piores outliers na média geral.
- `groupAvg(vids, keyFn, valFn)` — média por grupo.
- `calcKPIs(vids)` → `{ total, totalViews, avgViews, totalImpress, avgImpress,
  ctrStudioGeral, ctrStudioTop80, ret30s, retMedia, retFinal }`.

## Features (inventário)

**KPIs (topo):** total de vídeos; views totais 24h + média; impressões total +
média + top80; CTR Studio geral + top80; retenção 30s / média / final.

**Filtros:** canais (multi), trimestres (multi, dinâmico), tipos (multi,
dinâmico), A/B (Sim / Não / Todos), intervalo de datas global. `getFiltered()`
aplica todos.

**Gráficos (Chart.js):**
1. Views médio por tipo de vídeo
2. Views médio por dia da semana (ordem Seg→Dom)
3. Views médio por horário
4. Teste A/B — CTR e retenção comparados
5. Views ao longo do tempo (timeline por data de publicação)
6. Funil de conversão: Impressões → Views 24h → Assistiram 30s → Assistiram até
   o fim (30s e fim estimados por `views24h × retenção`)
7. Inscritos por canal (vazio hoje)

**Ranking:** tabela ordenável por views24h, impressions, ctrStudio,
retention30s/media/final, data; direção asc/desc; filtro de data próprio da
tabela. Células coloridas por `perf`.

**Extras:** botão Atualizar (re-fetch com cache-bust), Modo Apresentação,
Exportar PDF (html2canvas → jsPDF, com fatiamento multi-página).

## Problemas conhecidos

1. **Inscritos vazios** — exigência de propriedade primária da Brand Account na
   YouTube Analytics API bloqueia leitura via API. Não é bug de front.
2. **Snapshot único de 24h** — não há série temporal por vídeo (48h/7d/28d/vida).
3. **Retenção como número, não curva** — sem `elapsedVideoTimeRatio`, não dá pra
   ver onde a audiência abandona.
4. **Sem elo com o negócio** — o funil para em "assistiram até o fim"; não chega
   a clique → lead → matrícula.
5. **Monólito** — tudo em um `index.html`, difícil de evoluir com segurança.
