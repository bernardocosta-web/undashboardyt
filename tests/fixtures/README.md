# Fixtures de teste

| Arquivo | Versionado? | Para que serve |
|---------|-------------|----------------|
| `videos.sample.json` | sim | 10 vídeos sintéticos, feitos à mão na Task 0. Base do `golden.json` e dos testes unitários |
| `golden.json` | sim | Saída congelada das funções puras do monólito, rodadas contra `videos.sample.json`. Referência que as Tasks 1 a 3 reproduzem |
| `exec-payload-anon.json` | sim | Payload real do `/exec` **anonimizado**: 149 vídeos, estrutura e esquisitices reais, métricas escaladas |
| `exec-payload.json` | **NÃO** | Payload real, com dados comerciais. Local apenas |

## Por que o payload real não é versionado

`tests/fixtures/exec-payload.json` contém **dados comerciais reais** dos canais:
views em 24h, impressões, CTR e retenção de 149 vídeos, com títulos e URLs que
identificam cada um.

Três razões para ele ficar fora do git:

1. **O repositório é público.** O site sai do branch `main` via GitHub Pages.
2. **O histórico do git é permanente.** Uma vez commitado, o arquivo continua
   recuperável e indexável para sempre — mesmo depois de removido num commit
   posterior, e mesmo que o `/exec` seja fechado.
3. **A exposição atual é revogável; a do git não é.** Hoje os dados são servíveis
   pelo `/exec` com acesso "Qualquer pessoa", mas essa permissão pode ser mudada
   numa tela do Apps Script. Um commit não.

Está no `.gitignore`. **Mantenha-o em disco** — é dele que sai a versão
anonimizada e as conferências contra dados reais.

### Como obter um payload real novo

```bash
# 1. Pegue a API_URL no index.html (const API_URL = '...')
# 2. Baixe com cache-bust, como o front faz:
curl -s "<API_URL>?t=$(date +%s)" -o tests/fixtures/exec-payload.json
# 3. Regenere a versão anonimizada:
node scripts/anonymize-payload.mjs
```

## Como a anonimização funciona

`scripts/anonymize-payload.mjs`, **determinístico** (PRNG com semente fixa
`20260817`, não `Math.random()`): rodar de novo produz arquivo byte a byte
idêntico. Se o hash mudar sem o payload real ter mudado, alguém alterou o script.

### Preservado — é o valor da fixture

Dados reais têm esquisitices que ninguém inventa escrevendo fixture à mão. Todas
as 29 checagens de contrato que o payload real exercitava continuam valendo na
versão anonimizada (validado; nenhum caso perdido):

- nomes, tipos e presença de **todos** os 20 campos, inclusive os que o front
  ignora (`id`, `durationRange`, `debug`)
- **formatos que o código parseia:** `publishDate` `"AAAA-MM-DD"` sem hora,
  `quarter` `"1ºT"` sem ano, `publishHour` `"15h"` como string, `duration`
  `"MM:SS"`, `id` `"Canal_AAAAMMDD_slug"`, URL com id de 11 caracteres
- contagem de vídeos (149) e distribuições de canal, trimestre, tipo, `weekday`,
  `publishHour`, `durationRange` e `abTest` (90 com A/B, 59 sem)
- **os nulos**: 1 em `retention30s`, 1 em `retentionFinal`, nas mesmas posições
- **`id` vazio** nos mesmos 49 vídeos
- **a string vazia `""` em `perf`** (2 ocorrências) e as 6 sub-chaves em 149/149
- **as 5 violações de monotonia** `ret30s >= retMedia >= retFinal` que existem nos
  dados reais — o fator de escala é o mesmo para as três retenções, então a
  relação (inclusive quando quebrada) sobrevive
- `subscribers: []` e `debug.hasSubscriber: false`

### Substituído

| Campo | Como |
|---|---|
| `title` | `"Vídeo 001"`, `"Vídeo 002"`, … |
| `url` | `watch?v=` + id sintético de 11 chars |
| `id` | mantém o formato, troca o slug por `videoNNN` |
| `views24h`, `impressions` | escalados por fator aleatório por vídeo (0,60–1,60) |
| `ctrStudio` | escalado (0,70–1,40), clampado em (0, 1) |
| as 3 retenções | escaladas pelo **mesmo** fator por vídeo (0,80–1,15), clampadas |
| `perf` | objetos **embaralhados** entre vídeos — preserva a distribuição exata dos valores e rompe o vínculo com o desempenho real |

## ⚠ Os KPIs da fixture anonimizada NÃO são o baseline

`docs/backend/baseline-kpis-2026-08-17.md` registra os números do **dashboard
real**, calculados a partir do payload real. Como esse payload não é versionado,
**os valores do baseline não são reproduzíveis a partir do repositório sozinho.**

A fixture anonimizada dá números diferentes, de propósito:

| KPI | Baseline real | Fixture anonimizada |
|---|---|---|
| `kpi-total` | 149 | 149 |
| `kpi-views` | `476,1K` | `503,6K` |
| `kpi-impressoes-total` | `6,8M` | `7,3M` |
| `kpi-ctr-studio-geral` | `4,6%` | `4,9%` |
| `kpi-ret30` | `60,7%` | `58,8%` |

**Consequência prática para as Tasks 4 e 5:** a conferência de "mesmo
comportamento" tem de ser feita contra o **dashboard real** (site público ou
servidor local com o `/exec` de verdade) e os números do
`baseline-kpis-2026-08-17.md`. Usar a fixture anonimizada para essa comparação
daria divergência em todos os KPIs — e seria falso positivo de regressão.

Use `exec-payload-anon.json` para: forma do contrato, tipos, presença de campos,
nulos, casos de borda. **Não** para conferir valores de KPI.
