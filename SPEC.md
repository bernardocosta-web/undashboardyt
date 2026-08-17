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
| `quarter`         | string           | ex. "2025-Q1"; alimenta filtro dinâmico de trimestre   |
| `videoType`       | string           | normalizado (trim + colapso de espaços)                |
| `views24h`        | number           | views nas primeiras 24h                                |
| `impressions`     | number           |                                                        |
| `ctrStudio`       | number (fração)  | **0–1**, exibido ×100                                  |
| `retention30s`    | number (fração)  | **0–1**                                                |
| `retentionMedia`  | number (fração)  | **0–1**                                                |
| `retentionFinal`  | number (fração)  | **0–1**                                                |
| `abTest`          | boolean          | participou de teste A/B — **boolean**; o filtro homônimo é tri-estado, ver "Contrato — estado de filtros" |
| `perf`            | object           | `{ <metrica>: "Bom" \| "Médio" \| "Ruim" }` — colore a tabela |

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

> A assimetria UTC (`dateFrom`) vs. local (`dateTo`) é o comportamento atual.
> Preservar na refatoração; corrigir é mudança de comportamento e exige ADR.

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
