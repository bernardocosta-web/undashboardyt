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
  "timestamp":   "2026-08-17T19:57:45.831Z",   // ISO string; exibido como "Atualizado em ..."
  "debug":       { /* diagnóstico do backend — o front NÃO lê, ver abaixo */ }
}
```

**`debug` — quarta chave de topo, não consumida pelo front.** Presente no payload
real e útil para diagnóstico:

| Campo             | Tipo       | Observado em 17/08/2026                          |
|-------------------|------------|--------------------------------------------------|
| `sheetsFound`     | string[]   | 20 abas, incluindo 5 prefixadas `_OLD_`          |
| `channelSheets`   | string[]   | `["Principal","Militares","Superiores"]`         |
| `hasConsolidated` | boolean    | `false`                                          |
| `hasSubscriber`   | boolean    | `false` — corrobora a limitação de inscritos     |

> `hasSubscriber: false` é o próprio backend informando que não obteve dados de
> inscritos. Confirma, do lado do servidor, que o gráfico 7 vazio é limitação de
> permissão e não falha de carregamento. Vale checar aqui antes de suspeitar do
> front. O `timestamp` chega como **string ISO**, não como milissegundos — o
> `new Date(data.timestamp)` do `index.html:467` aceita os dois.

**Status: operacional.** Verificado em 17/08/2026 — o `/exec` devolve JSON válido,
inclusive em janela anônima, e o dashboard público renderiza KPIs, gráficos e
tabela. Versões anteriores deste documento tratavam o backend como quebrado; a
suspeita não se confirmou e a causa dela permanece indeterminada.

Em erro, o backend devolveria `{ "error": "mensagem" }` — o front lança e mostra o
banner "Erro:". Se o `/exec` devolvesse HTML (página de login do Google), o
`res.json()` falharia e cairia no mesmo banner. Para diagnosticar esse cenário
caso ele apareça algum dia, ver `docs/backend/runbook-diagnostico.md` (preventivo).

## Contrato — objeto de vídeo

| Campo             | Tipo             | Observação                                              |
|-------------------|------------------|--------------------------------------------------------|
> **Verificado contra payload real em 17/08/2026** (149 vídeos,
> `tests/fixtures/exec-payload.json`). Os tipos e formatos abaixo são os
> observados, não os supostos.

| Campo             | Tipo             | Observação                                              |
|-------------------|------------------|--------------------------------------------------------|
| `id`              | string           | `"Militares_20260108_planodetalha"` ou `""` (vazio em 49/149). **O front não lê este campo** |
| `channel`         | string           | "Principal" \| "Militares" \| "Superiores"             |
| `title`           | string           |                                                        |
| `url`             | string           | link do vídeo                                          |
| `publishDate`     | string→Date      | **`"AAAA-MM-DD"`, sem hora** → `new Date()` interpreta como meia-noite **UTC**. Ver nota |
| `weekday`         | string           | `"Seg"`…`"Dom"` — **vem pronto do backend**, ver nota  |
| `publishHour`     | string           | **`"9h"`, `"12h"`, `"13h"`, `"15h"`, `"18h"` — STRING com sufixo "h", não número.** Ver nota |
| `quarter`         | string           | **`"1ºT"` \| `"2ºT"` — sem ano.** Ver nota             |
| `videoType`       | string           | normalizado (trim + colapso de espaços); 11 valores distintos |
| `duration`        | string           | `"MM:SS"` ou `"H:MM:SS"` — exibida na coluna "Duração" (`index.html:782`) |
| `durationRange`   | string           | `"<8min"` \| `"8-14min"` \| `"14-30min"` \| `"30min+"`. **O front não lê este campo** |
| `durationSecs`    | number           | **só** ordena a coluna Duração — ver nota abaixo        |
| `views24h`        | number           | views nas primeiras 24h                                |
| `impressions`     | number           |                                                        |
| `ctrStudio`       | number (fração)  | **0–1**, exibido ×100                                  |
| `retention30s`    | number \| null   | fração **0–1**; **nulo observado** (1/149)             |
| `retentionMedia`  | number (fração)  | **0–1**; sem nulos na amostra                          |
| `retentionFinal`  | number \| null   | fração **0–1**; **nulo observado** (1/149)             |
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

Valores observados no payload real: `"Bom"`, `"Médio"`, `"Ruim"` e **`""`** (string
vazia — 1 ocorrência em `ret30s` e 1 em `retFinal`). As seis chaves estavam
presentes em 149/149 vídeos.

> Quem reconstruir o payload usando `views24h` como chave do `perf` perde a
> coloração da tabela — sem erro no console, só células sem cor. Chave ausente cai
> no `|| {}` e a célula fica neutra. **String vazia também** produz célula neutra,
> e é um estado válido que o backend emite.

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

> **`publishHour` é string com sufixo, não número.** Os valores são `"9h"`,
> `"12h"`, `"13h"`, `"15h"`, `"18h"`. Funciona porque o `groupAvg` usa o valor como
> **chave de objeto** (que já seria string de qualquer forma) e a ordenação do
> gráfico 3 faz `parseInt(a[0])` — e `parseInt("15h")` é `15`. Quem "limpar" esse
> campo para número precisa conferir a ordenação; quem comparar com `===` a um
> número vai falhar em silêncio.

> **`quarter` não tem ano.** Os valores são `"1ºT"` e `"2ºT"`. Isso significa que
> o filtro de trimestre **não distingue anos**: um "1ºT" de 2026 e um de 2027 caem
> no mesmo grupo. Hoje o payload cobre um único ano, então não aparece; com dois
> anos de histórico o filtro passa a somar trimestres de anos diferentes sem aviso.
> Não é bug do front — é o formato que o backend envia. Corrigir exige mudar o
> contrato (SPEC + ADR).

> **`publishDate` não tem hora, e isso mascara a armadilha de fuso.** Como o valor
> é `"AAAA-MM-DD"` puro, `new Date()` produz sempre **meia-noite UTC**. Combinado
> com as bordas de data (ver "Contrato — estado de filtros"), o efeito é que hoje o
> filtro se comporta corretamente por dia de calendário — o vazamento de fuso
> descrito lá **não pode se materializar**, porque nenhum vídeo tem hora do dia.
> A hora existe, mas mora em `publishHour`, separada. **O defeito é latente:** se
> algum dia o `publishDate` passar a carregar hora, o vazamento vira real
> imediatamente. Ver a nota correspondente na seção de filtros.

## Contrato — objeto de inscrito

| Campo     | Tipo        | Observação                          |
|-----------|-------------|-------------------------------------|
| `channel` | string      | mesmo domínio dos canais            |
| `date`    | string→Date | parseado com `new Date()`           |
| `count`   | number      | (usado no gráfico de inscritos)     |

Hoje o array chega **vazio dentro de um JSON válido** — limitação de permissão da
Brand Account, não falha de carregamento. Ver "Problemas conhecidos" nº 1.

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

Consequência **em teoria**: filtrando de 06/01, um vídeo publicado em 05/01 às
22:00 local entraria na contagem — em UTC ele seria `2025-01-06T01:00Z`, posterior
a `2025-01-06T00:00Z`. O `dateTo` não tem o problema: 23:59:59 local é o fim
correto do dia local.

> **Correção de 17/08/2026, após verificar o payload real: hoje esse vazamento
> NÃO se materializa.** O backend envia `publishDate` como `"AAAA-MM-DD"` puro,
> sem hora, então toda data de publicação também é meia-noite UTC — igual à borda.
> Nenhum vídeo tem hora do dia para cair na janela de 3 horas. A hora existe, mas
> num campo separado (`publishHour`), que o filtro de data não consulta.
>
> **O defeito é latente, não ativo.** Ele passa a valer no instante em que o
> `publishDate` carregar hora — por exemplo se a fonte mudar pelo ADR 0001, ou se
> alguém "melhorar" o backend para enviar timestamp completo. Os testes em
> `tests/filters.test.js` travam a mecânica com datas sintéticas que **têm** hora,
> justamente para o comportamento estar documentado antes de a mudança acontecer.
>
> Uma versão anterior desta nota descrevia o vazamento como se já estivesse
> acontecendo. Estava incorreto para os dados atuais.

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
7. Inscritos por canal — **vazio hoje por limitação de permissão da Brand
   Account, não por falha de carregamento.** Ver "Problemas conhecidos" nº 1

**Ranking:** tabela ordenável por views24h, impressions, ctrStudio,
retention30s/media/final, data; direção asc/desc; filtro de data próprio da
tabela. Células coloridas por `perf`.

**Extras:** botão Atualizar (re-fetch com cache-bust), Modo Apresentação,
Exportar PDF (html2canvas → jsPDF, com fatiamento multi-página).

## Problemas conhecidos

1. **Inscritos vazios — limitação de permissão, NÃO falha de carregamento.** A
   YouTube Analytics API exige propriedade primária da Brand Account para servir
   dados de inscritos; a conta usada não tem esse vínculo, então a API responde
   sem os dados. O array `subscribers` chega **vazio, num JSON válido** — o
   carregamento é bem-sucedido. O gráfico 7 exibe "Sem dados de inscritos" porque
   não há o que plotar, não porque algo falhou.

   Consequências de não confundir os dois casos:
   - **Não é bug de front.** Nenhuma alteração no `index.html`, nos módulos ou na
     refatoração faz esses dados aparecerem.
   - **Não é sintoma de backend quebrado.** O `/exec` está operacional; ele
     entrega `subscribers: []` corretamente.
   - **Não é regressão da refatoração.** Ao comparar antes/depois nas Tasks 4 e 5,
     o gráfico 7 vazio é o comportamento **esperado** nas duas versões.

   Solução conhecida: leitura por navegador (Cowork) ou repensar a fonte — ver
   `docs/decisions/0001`.
2. **Cobertura: o dashboard vê 4,42% do acervo.** O `/exec` devolve a janela de
   **janeiro/2026 em diante** — 149 vídeos. O acervo histórico completo tem
   **3.370**: Militares 1.835, Principal 1.522, Superiores 13. **3.221 vídeos são
   invisíveis ao dashboard.**

   | Canal | Acervo | No payload | Cobertura |
   |-------|-------:|-----------:|----------:|
   | Militares  | 1.835 |  92 |  5,0% |
   | Principal  | 1.522 |  49 |  3,2% |
   | Superiores |    13 |   8 | 61,5% |
   | **Total**  | **3.370** | **149** | **4,42%** |

   O corte **não é aleatório**: exclui os vídeos mais antigos, que são exatamente
   aqueles onde a cauda longa seria observável. E é muito desigual entre canais —
   61,5% em Superiores contra 3,2% em Principal, então comparações entre canais
   hoje comparam amostras de qualidade diferente. Ver `docs/decisions/0002`.

3. **Snapshot único de 24h** — não há série temporal por vídeo (48h/7d/28d/vida).
4. **Retenção como número, não curva** — sem `elapsedVideoTimeRatio`, não dá pra
   ver onde a audiência abandona.
5. **Sem elo com o negócio** — o funil para em "assistiram até o fim"; não chega
   a clique → lead → matrícula.
6. **Monólito** — tudo em um `index.html`, difícil de evoluir com segurança.
