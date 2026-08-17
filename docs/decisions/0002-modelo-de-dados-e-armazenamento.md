# ADR 0002 — Modelo de dados e armazenamento (cauda longa)

**Status:** Proposto
**Data:** 2026-08-17
**Origem:** questão levantada pelo dev senior da empresa.

## Contexto

O dashboard hoje guarda **uma linha por vídeo**, com um snapshot congelado das
primeiras 24h (`views24h`, `impressions`, `ctrStudio`, retenções). Nesse formato,
analisar a **cauda longa** dos vídeos é impossível — não por limitação do Google
Sheets, mas porque **não existe onde guardar a dimensão tempo**. Trocar o Sheets
por um banco mantendo uma linha por vídeo não resolveria nada.

Analisar cauda longa exige inverter o modelo: **uma linha por vídeo por dia**
(fact table). Só então é possível perguntar: esse vídeo cresceu ou apenas largou
bem? qual formato tem meia-vida maior? quais vídeos antigos voltaram a crescer?

### Por que isso é grave especificamente para o UN

O conteúdo do UN é **evergreen**. Uma explicação de física não tem pico e morte
como notícia — acumula views por anos via busca e recomendação. Medir conteúdo
evergreen com snapshot de 24h é usar o instrumento errado: hoje o dashboard mede
integralmente a largada no algoritmo e nada do valor que se acumula em meses.
Para uma operação que também vende cursos, o vídeo que gera matrícula seis meses
depois é hoje invisível.

### Onde o Sheets quebra de fato (com o volume real)

Estimando ~800 vídeos e 1 ano de histórico diário:

- **Volume:** 800 × 365 ≈ 292 mil linhas (~2,9M células). Cabe no limite de 10M
  do Sheets, mas fica lento muito antes do teto.
- **Payload — gargalo decisivo:** o dashboard baixa *tudo* como um JSON e
  processa no navegador. 292 mil linhas ≈ 30–40 MB. Mesmo limitando a 90 dias,
  ~72 mil linhas e ~8–10 MB por carregamento. Inviável.
- **Apps Script:** limite de ~6 min por execução; um job que percorre centenas de
  vídeos buscando série diária estoura.
- **Sem consulta server-side:** impossível pedir "só a curva dos primeiros 28
  dias dos vídeos do Q1" — é ler tudo e filtrar no cliente.
- **Edição humana quebra o contrato em silêncio:** alguém move uma coluna e o
  dashboard morre sem aviso. Forte candidato à causa da quebra atual.

## Opções consideradas

- **A) Manter tudo em Sheets, uma linha por vídeo.**
  - Prós: zero migração; editável à mão.
  - Contras: cauda longa impossível; curva de retenção e benchmark por cohort
    também impossíveis (dependem de série temporal). Não sustenta as fases 2 e 3.

- **B) Fact table em Sheets (uma linha por vídeo por dia).**
  - Prós: mantém a stack atual.
  - Contras: bate em todos os limites da seção anterior. Ganha ~poucos meses de
    sobrevida e joga o problema pra frente.

- **C) Banco (Postgres) como fonte da verdade + JSON estático como camada de serviço.**
  - Job noturno (n8n) consulta o banco, pré-agrega e escreve JSONs compactos no
    próprio repositório; GitHub Pages serve.
  - Prós: resolve volume e consulta; **nenhuma credencial no navegador** (o site é
    público e estático — restrição que costuma ser esquecida); cache eficiente;
    histórico versionado de graça. O pesado fica no banco para análise; o leve
    (curvas pré-agregadas) vai para o site.
  - Contras: mais uma peça. Custo reduzido pelo fato de o n8n self-hosted já
    usar Postgres — provavelmente a infra já existe.

- **D) Dashboard consultando o banco diretamente.**
  - Contras: exigiria credencial ou API pública num site estático. Descartado.

## Decisão

_A definir com o dev senior._ Recomendação: **C, faseada**, com duas ressalvas
importantes:

**1. Divisão métricas / metadados.** Não migrar tudo. A planilha tem uma virtude
real: humano consegue editar. `videoType`, `abTest` e anotações editoriais são
metadados curados à mão, de volume baixo — banco é ruim nisso, planilha é ótima.

- **Métricas** (escritas por máquina, série temporal, alto volume) → banco.
- **Metadados editoriais** (humano, um registro por vídeo, baixo volume) →
  permanecem em Sheets/Notion; o pipeline faz o join.

Isso mantém a operação de conteúdo trabalhando onde já trabalha, sem transformar
cada classificação de vídeo em ticket de engenharia.

**2. Ordem: estabilizar antes de migrar.** A refatoração do plano de
estabilização **não é trabalho perdido** — ao contrário, ela cria o ponto exato
de troca: `src/data.js` isola o acesso a dados, e o contrato em `SPEC.md` torna a
substituição da fonte barata. Migrar antes de ter esse isolamento significa
mexer em dois problemas ao mesmo tempo, dentro de um monólito.

### Esboço do modelo alvo

```
video          (dimensão)  video_id PK, channel, title, url, published_at
video_daily    (fato)      video_id FK, date, views, impressions, ctr,
                           avg_view_duration, ... — PK (video_id, date)
video_meta     (editorial) video_id FK, video_type, ab_test, notas
```

`views24h` continua existindo como métrica derivada (soma dos primeiros dias),
preservando a comparabilidade com o histórico atual.

### Backfill — o passado é recuperável

A YouTube Analytics API serve dados com dimensão de dia retroativamente, então a
série histórica por vídeo pode ser reconstruída em vez de acumulada do zero.
Confirmar cota e limite de vídeos por requisição antes de dimensionar o job.
Consequência prática: **migrar agora não custa meses de dados perdidos** — o que
remove o principal motivo para postergar.

## Consequências

- Cauda longa, curva de retenção e benchmark por cohort passam de impossíveis a
  triviais — as três dependem da mesma fact table.
- O dashboard deixa de baixar o dataset inteiro; passa a ler agregados pequenos.
- Custo: manter o pipeline do n8n como parte do projeto, com testes e
  observabilidade, não como caixa-preta.
- Este ADR **expande** o 0001: aquele trata de *de onde vêm* os dados
  (Apps Script vs n8n/MCP); este trata de *como são modelados e onde ficam*.
  Se ambos forem aceitos, o 0001 deve ser resolvido de forma coerente com o C.
