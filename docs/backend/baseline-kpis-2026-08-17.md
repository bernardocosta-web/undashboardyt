# Baseline de comportamento — 17/08/2026

Referência capturada **antes** de qualquer modificação no `index.html`, conforme o
bloco P1–P4 da Task 4 do plano de estabilização. As Tasks 4 e 5 têm de reproduzir
estes valores exatamente.

- **Payload:** `tests/fixtures/exec-payload.json` — **local, não versionado**
  (dados comerciais; ver `tests/fixtures/README.md`)
- **`timestamp` do backend:** `2026-08-17T19:57:45.831Z` (17/08/2026, 16:57:45)
- **HTTP:** 200, `application/json; charset=utf-8`, 88.604 chars, ~5,4 s
- **Commit do `index.html` de referência:** o versionado em `main` / `467eea5`,
  1.334 linhas, **não modificado** na captura

## Como estes números foram obtidos

Calculados com `src/lib/math.js` + `src/lib/format.js` + `src/filters.js`,
reproduzindo a sequência exata de `renderKPIs` (`index.html:630-643`) sobre o
payload normalizado como em `fetchData` (`index.html:457-462`).

Isso é válido como baseline porque os três módulos foram verificados como **cópia
verbatim** do monólito (math: 1238 chars idênticos; format: 630; filtros: as 6
cláusulas conferidas uma a uma). O caminho dado→número é, portanto, o mesmo.

> **Limite desta captura, declarado:** ela cobre o caminho **dado → número → texto
> formatado**. Ela **não** cobre a montagem do DOM, o desenho dos 7 gráficos no
> canvas, a tabela de ranking, o Modo Apresentação nem a exportação em PDF. Para
> esses, a conferência visual das Tasks 4 e 5 continua sendo feita a olho, contra o
> site público. Este arquivo elimina a ambiguidade dos **números**, que é a parte
> onde erro silencioso engana decisão de conteúdo.

> **⚠ Não confira contra a fixture anonimizada.** Os números abaixo vêm do payload
> **real**, que não é versionado. A `tests/fixtures/exec-payload-anon.json` tem
> métricas escaladas de propósito e produz KPIs diferentes (ex.: `503,6K` em vez de
> `476,1K` em `kpi-views`). Comparar com ela daria divergência em todos os KPIs e
> seria **falso positivo de regressão**. A conferência é contra o dashboard real —
> site público, ou servidor local consumindo o `/exec` de verdade.

## Composição do conjunto

| Dimensão   | Valor                                                          |
|------------|----------------------------------------------------------------|
| Vídeos     | **149**                                                        |
| Canais     | Militares (92), Principal, Superiores                          |
| Trimestres | `"1ºT"`, `"2ºT"` — **sem ano no valor**                        |
| Tipos      | 11 distintos: Aula/Questão Digital, Aula/Questão no Quadro, Conversa, Corte Clóvis, Corte Conversa, Corte Podcast, Corte Quadro, Corte Questão Digital, Desafios no Quadro, Podcast, Vlog |
| Inscritos  | **0** — esperado; limitação de permissão da Brand Account. O `debug.hasSubscriber` do próprio backend vem `false` |

## Cenário 1 — SEM FILTRO (149 vídeos)

| Elemento (`id` no DOM)  | Texto renderizado      |
|-------------------------|------------------------|
| `kpi-total`             | `149`                  |
| `kpi-total-sub`         | `de 149 no total`      |
| `kpi-views`             | `476,1K`               |
| `kpi-views-sub`         | `Média: 3,2K / vídeo`  |
| `kpi-impressoes-total`  | `6,8M`                 |
| `kpi-impressoes-avg`    | `46K`                  |
| `kpi-ctr-studio-geral`  | `4,6%`                 |
| `kpi-ctr-studio-top80`  | `4,9%`                 |
| `kpi-ret30`             | `60,7%`                |
| `kpi-ret-media`         | `30,4%`                |
| `kpi-ret-final`         | `17,8%`                |

Valores brutos, antes da formatação (é neles que um `×100` acidental aparece):

```
ctrStudioGeral = 0.04584563758389263
ctrStudioTop80 = 0.04924369747899161
```

`ctrStudioTop80` > `ctrStudioGeral`, como a propriedade exige.

> `kpi-impressoes-avg` = `46K`, **sem casa decimal**, enquanto
> `kpi-impressoes-total` = `6,8M` tem. É o quirk herdado do `fmtN` (sem
> `minimumFractionDigits`) travado em `tests/lib/format.test.js`. Aparecer assim
> depois da refatoração é **correto**.

## Cenário 2 — canal Militares (92 vídeos)

Filtro: `channels = {Militares}`

| Elemento                | Texto                  |
|-------------------------|------------------------|
| `kpi-total`             | `92`                   |
| `kpi-total-sub`         | `de 149 no total`      |
| `kpi-views`             | `193,3K`               |
| `kpi-views-sub`         | `Média: 2,1K / vídeo`  |
| `kpi-impressoes-total`  | `3M`                   |
| `kpi-impressoes-avg`    | `33K`                  |
| `kpi-ctr-studio-geral`  | `4,4%`                 |
| `kpi-ctr-studio-top80`  | `4,7%`                 |
| `kpi-ret30`             | `60,6%`                |
| `kpi-ret-media`         | `31,2%`                |
| `kpi-ret-final`         | `19,3%`                |

Brutos: `ctrStudioGeral = 0.043663043478260846`,
`ctrStudioTop80 = 0.04682191780821916`

## Cenário 3 — canal + A/B (47 vídeos)

Filtro: `channels = {Militares}`, `abTest = true` (**boolean**, não `'yes'`)

| Elemento                | Texto                  |
|-------------------------|------------------------|
| `kpi-total`             | `47`                   |
| `kpi-views`             | `130K`                 |
| `kpi-views-sub`         | `Média: 2,8K / vídeo`  |
| `kpi-impressoes-total`  | `2M`                   |
| `kpi-impressoes-avg`    | `43K`                  |
| `kpi-ctr-studio-geral`  | `4,5%`                 |
| `kpi-ctr-studio-top80`  | `4,8%`                 |
| `kpi-ret30`             | `62,2%`                |
| `kpi-ret-media`         | `31,6%`                |
| `kpi-ret-final`         | `20,5%`                |

Brutos: `ctrStudioGeral = 0.045148936170212775`,
`ctrStudioTop80 = 0.04764864864864865`

## Cenário 4 — canal + A/B + intervalo de datas (30 vídeos)

Filtro: `channels = {Militares}`, `abTest = true`,
`dateFrom = 2026-03-17T00:00:00.000Z`, `dateTo = 2026-05-22T00:00:00.000Z`

> **Para reproduzir na interface, digite `17/03/2026` e `22/05/2026`.**
>
> Uma versão anterior desta linha dizia "exibido como 16/03/2026 → 21/05/2026",
> valor que vinha de `toLocaleDateString` sobre as bordas em UTC: em UTC−3 a
> meia-noite UTC de 17/03 é 16/03 às 21:00 local, e a exibição recuava um dia.
> Digitar 16/03 no filtro produz uma janela um dia maior e pode trazer 31 ou 32
> vídeos em vez de 30 — **não é regressão**, é a borda de data.
>
> Se o total não fechar em 30, use os Cenários 2 e 3 como referência: eles não têm
> filtro de data e por isso são limpos.

| Elemento                | Texto                  |
|-------------------------|------------------------|
| `kpi-total`             | `30`                   |
| `kpi-views`             | `84,2K`                |
| `kpi-views-sub`         | `Média: 2,8K / vídeo`  |
| `kpi-impressoes-total`  | `1,3M`                 |
| `kpi-impressoes-avg`    | `43,8K`                |
| `kpi-ctr-studio-geral`  | `4,5%`                 |
| `kpi-ctr-studio-top80`  | `4,8%`                 |
| `kpi-ret30`             | `63,5%`                |
| `kpi-ret-media`         | `30,3%`                |
| `kpi-ret-final`         | `20,0%`                |

Brutos: `ctrStudioGeral = 0.04506666666666667`,
`ctrStudioTop80 = 0.04750000000000001`

Este é o cenário que exercita as três famílias de cláusula ao mesmo tempo — Set,
tri-estado e intervalo de datas. É o mais valioso para detectar regressão na
camada de filtros.

## Como conferir depois das Tasks 4 e 5

1. Rodar o dashboard por servidor local (`python -m http.server 8000`, porque
   módulos ES não funcionam com `file://`).
2. Sem nenhum filtro, comparar os 11 elementos do Cenário 1 com a tela.
3. Aplicar `Militares` e comparar com o Cenário 2.
4. Somar `A/B = Sim` e comparar com o Cenário 3.
5. Somar o intervalo de datas e comparar com o Cenário 4.
6. Conferir também, a olho: os 7 gráficos, a ordenação inicial da tabela
   (`views24h`, maior primeiro) e a contagem "N vídeos".

> **Não confira "botão de exportar PDF".** Ele não existe — `exportPDF()` é código
> morto, sem elemento que a chame. Ver SPEC, seção "Features / Extras".

**Divergência em qualquer número = regressão.** O suspeito nº 1 é ter "melhorado"
uma função pura durante a extração.

## O que NÃO deve mudar, e não é regressão

- **Gráfico 7 (inscritos) vazio.** `subscribers: []` e `debug.hasSubscriber:
  false`. Esperado nas duas versões.
- **`46K` e `3M` sem casa decimal.** Quirk do `fmtN`, comportamento herdado.
- **Sábado ausente de algum gráfico por dia**, se o único vídeo daquele dia tiver
  métrica nula — o `groupAvg` descarta o bucket inteiro.
