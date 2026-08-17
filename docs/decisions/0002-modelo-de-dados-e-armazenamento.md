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

## Cobertura de dados — o dashboard é cego para 96% do acervo

**Acervo histórico completo dos três canais, números reais (17/08/2026):**

| Canal | Vídeos no acervo | % do acervo | No payload atual | Cobertura |
|-------|-----------------:|------------:|-----------------:|----------:|
| Militares  | 1.835 | 54,5% |  92 |  **5,0%** |
| Principal  | 1.522 | 45,2% |  49 |  **3,2%** |
| Superiores |    13 |  0,4% |   8 |  61,5% |
| **Total**  | **3.370** | 100% | **149** | **4,42%** |

O payload é a janela de **janeiro/2026 em diante**: 149 de 3.370 vídeos. **O
dashboard hoje não vê 3.221 vídeos — 95,58% do acervo.**

**Onde o corte recai é o que agrava.** A exclusão não é aleatória: elimina
exatamente os **vídeos mais antigos**, que são os únicos em que a cauda longa
seria observável. Um vídeo publicado em 2023 já teve dois anos para acumular
views por busca e recomendação; é nele que o comportamento evergreen aparece. O
dashboard mede a largada de 24h dos vídeos recentes e descarta justamente o
acervo onde a hipótese de cauda longa poderia ser testada.

A cobertura também é **muito desigual entre canais**: 61,5% em Superiores (que
tem só 13 vídeos, todos recentes) contra 3,2% em Principal. Qualquer comparação
entre canais feita hoje compara amostras de qualidade radicalmente diferente.

### Onde o Sheets quebra de fato (com o acervo real de 3.370 vídeos)

Fact table diária sobre o acervo completo: **3.370 × 365 = 1.230.050 linhas/ano.**

**Limite de 10M células do Sheets** — o modelo alvo (esboçado adiante) tem
`video_id`, `date`, `views`, `impressions`, `ctr`, `avg_view_duration` e as três
retenções: **9 colunas no mínimo**, 10 com `watch_time`.

| Colunas | Células/ano | vs. limite 10M | Estoura em |
|--------:|------------:|----------------|-----------:|
|  6 |  7.380.300 | cabe | 16,2 meses |
|  8 |  9.840.400 | cabe (98,4% do teto) | 12,2 meses |
|  **9** | **11.070.450** | **ESTOURA** | **10,8 meses** |
| **10** | **12.300.500** | **ESTOURA** | **9,7 meses** |
| 12 | 14.760.600 | ESTOURA | 8,1 meses |

**Confirmado: com 10 colunas o limite é atingido em 297 dias — 9,7 meses.** E o
modelo alvo estoura já com **9** colunas: não há versão enxuta que sobreviva a um
ano. Com 8 colunas "cabe" a 98,4% do teto, o que não é margem, é véspera.

**Payload — o gargalo decisivo, com densidade medida.** O payload real de 149
vídeos ocupa **88.604 bytes de fio** (JSON compacto, o que o navegador baixa), ou
**~600 bytes por vídeo**. Uma linha de fact table com 10 colunas, medida em JSON
compacto, ocupa **221 bytes**.

| Cenário | Linhas | Payload |
|---------|-------:|--------:|
| Snapshot do acervo completo (modelo de hoje, 1 linha/vídeo) | 3.370 | **1,93 MiB** — 22,6× o atual |
| Fact table, 30 dias | 101.100 | **21,3 MiB** |
| Fact table, 90 dias | 303.300 | **63,9 MiB** |
| Fact table, 365 dias | 1.230.050 | **259,2 MiB** |
| Fact table, 365 dias, **só a janela atual de 149 vídeos** | 54.385 | **11,5 MiB** |

O dashboard baixa *tudo* e processa no navegador. **259 MiB por carregamento é
inviável em qualquer conexão.** Mesmo recortar 90 dias dá 63,9 MiB. E note a
última linha: mesmo mantendo a cegueira atual de 96% do acervo, adicionar a
dimensão tempo já produz 11,5 MiB — 130× o payload de hoje.

> **A estimativa original era conservadora em dois eixos, não em um.** A versão
> anterior desta seção supunha ~800 vídeos e estimava 30–40 MB para 292 mil
> linhas, o que implica ~103 bytes por linha. O acervo real é **4,2× maior** e a
> densidade medida é **221 bytes/linha, 2,1× maior**. O erro composto no
> dimensionamento de payload era de aproximadamente **8,8×**. O argumento de
> volume estava subestimado, nunca inflado.

**Apps Script:** limite de ~6 min por execução; um job que percorre 3.370 vídeos
buscando série diária estoura com folga — não é questão de otimizar o loop.

**Sem consulta server-side:** impossível pedir "só a curva dos primeiros 28 dias
dos vídeos do Q1" — é ler tudo e filtrar no cliente.

**Edição humana quebra o contrato em silêncio:** alguém move uma coluna e o
dashboard morre sem aviso. Risco real e permanente do modelo editável à mão.

### Dois argumentos independentes — cada um decide sozinho

Esta é a distinção que importa para a decisão, porque os dois têm remédios
diferentes e nenhum depende do outro:

| | **Argumento estrutural** | **Argumento de escala** |
|---|---|---|
| **Tese** | O modelo não tem dimensão tempo | O volume não cabe no Sheets |
| **Evidência** | Uma linha por vídeo, snapshot de 24h congelado | 1,23M linhas/ano; 9 colunas estouram 10M em 10,8 meses; 259 MiB de payload |
| **Vale se o volume fosse pequeno?** | **Sim.** Com 50 vídeos, cauda longa continua impossível — não existe onde guardar a série | — |
| **Vale se o modelo já tivesse tempo?** | — | **Sim.** Uma fact table correta em Sheets estoura o limite em menos de um ano |
| **Remédio** | Inverter o modelo: uma linha por vídeo **por dia** | Sair do Sheets, ou reduzir granularidade |

**Consequência prática:** trocar o Sheets por Postgres mantendo uma linha por
vídeo **não resolve nada** — só o argumento de escala. E inverter o modelo dentro
do Sheets resolve o estrutural e morre no de escala em 10 meses. A opção C
endereça os dois; nenhuma outra endereça.

> **Nota de 17/08/2026:** a versão original desta linha dizia que essa edição
> humana era "forte candidato à causa da quebra atual". **Não havia quebra** — o
> backend foi verificado e está operacional. O risco descrito continua válido como
> propriedade do Sheets, mas não há incidente que o comprove, e nenhuma causa foi
> atribuída retroativamente. O restante deste ADR (volume, gargalo de payload,
> limite de 6 min do Apps Script, ausência de consulta server-side e a cauda longa
> do conteúdo evergreen) é **estrutural** e independe disso: os números do gargalo
> valem com o backend funcionando perfeitamente.

## Opções consideradas

- **A) Manter tudo em Sheets, uma linha por vídeo.**
  - Prós: zero migração; editável à mão.
  - Contras: cauda longa impossível; curva de retenção e benchmark por cohort
    também impossíveis (dependem de série temporal). Não sustenta as fases 2 e 3.

- **B) Fact table em Sheets (uma linha por vídeo por dia).**
  - Prós: mantém a stack atual.
  - Contras: bate em todos os limites da seção anterior. Com o modelo alvo de 9–10
    colunas, estoura o limite de 10M células em **10,8 a 9,7 meses** — menos de um
    ano de sobrevida, e o payload de 259 MiB já é inviável no primeiro dia.
    Viável **apenas** com política de retenção agressiva (ver Consequência C), que
    é uma decisão analítica com custo irreversível, tomada por restrição técnica.

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
                           avg_view_duration, retention_30s, retention_media,
                           retention_final  — PK (video_id, date)
video_meta     (editorial) video_id FK, video_type, ab_test, notas
```

**`video_daily` tem 9 colunas** contando as três retenções que o dashboard já
exibe, ou 10 com `watch_time`. Esse número é o que determina o prazo de morte da
opção B: 9 colunas estouram o limite do Sheets em 10,8 meses; 10, em 9,7. Não há
recorte do modelo que sobreviva a um ano — cortar para 8 colunas dá 98,4% do teto,
o que não é margem.

`views24h` continua existindo como métrica derivada (soma dos primeiros dias),
preservando a comparabilidade com o histórico atual.

### Backfill — o passado é recuperável, mas tem custo de cota

A YouTube Analytics API serve dados com dimensão de dia retroativamente, então a
série histórica por vídeo pode ser reconstruída em vez de acumulada do zero.
Consequência prática: **migrar agora não custa meses de dados perdidos** — o que
remove o principal motivo para postergar.

O que mudou com o acervo real: são **3.370 vídeos**, não ~800. Isso tira o backfill
da categoria "detalhe de implementação" e o coloca como item que exige estratégia
própria — cota, lotes, priorização e granularidade do passado. Ver **Consequência
A**, com o volume paramétrico por idade média do acervo.

## Consequências

- Cauda longa, curva de retenção e benchmark por cohort passam de impossíveis a
  triviais — as três dependem da mesma fact table.
- O dashboard deixa de baixar o dataset inteiro; passa a ler agregados pequenos.
- Custo: manter o pipeline do n8n como parte do projeto, com testes e
  observabilidade, não como caixa-preta.
- A cobertura salta de 4,42% para 100% do acervo. Isso é o ganho analítico
  principal, e não decorre do banco em si: decorre de parar de recortar a janela.

### A) Cota da YouTube Analytics API vira restrição de projeto

**Isto exige estratégia, não é detalhe de implementação.** Backfill de 3.370
vídeos com série diária é um projeto por si — não um script que se roda numa
tarde.

O que precisa ser decidido antes de dimensionar o job:

- **Cota real disponível** (unidades/dia da conta) e **custo por requisição** com
  dimensão `day`. Sem esses dois números não há estimativa honesta de prazo.
- **Vídeos por requisição:** a API aceita filtro por lista de vídeos, e o limite
  por chamada determina se o backfill leva dias ou semanas.
- **Estratégia de lotes:** dividir por canal e por período, com retomada
  idempotente. Um backfill que falha no meio e não sabe onde parou é retrabalho
  total.
- **Priorização:** os 3.221 vídeos invisíveis não têm o mesmo valor analítico.
  Candidato a ordem: (1) os que já estão na janela, para validar o pipeline
  contra dados conhecidos; (2) os de maior view total, onde a cauda longa é
  mensurável; (3) o resto.
- **Granularidade reduzida para o passado:** dia-a-dia para 4 anos de acervo pode
  ser desnecessário. Semanal ou mensal no passado remoto reduz cota e volume ao
  mesmo tempo — ver item (C), é a mesma alavanca.

**Volume de backfill, paramétrico.** As datas de publicação dos 3.221 vídeos fora
da janela **não estão** no payload, então isto não é medido:

| Idade média do acervo | Linhas de backfill | Células (10 col) | vs. 10M do Sheets |
|-----------------------|-------------------:|-----------------:|------------------:|
| 1 ano  | 1.230.050 | 12.300.500 | 1,2× |
| 2 anos | 2.460.100 | 24.601.000 | 2,5× |
| 3 anos | 3.690.150 | 36.901.500 | 3,7× |
| 4 anos | 4.920.200 | 49.202.000 | 4,9× |

> **Questão aberta:** obter as datas de publicação do acervo completo é
> pré-requisito para fechar este número. Enquanto isso não existir, o prazo do
> backfill é desconhecido — e não deve ser prometido.

### B) Superiores tem n=13 — benchmark por cohort não é viável nesse canal

| Canal | n | Viabilidade de benchmark por mediana do canal |
|-------|--:|---|
| Militares  | 1.835 | ok |
| Principal  | 1.522 | ok |
| **Superiores** | **13** | **inviável** |

Com 13 vídeos, a mediana do canal é instável: um único vídeo atípico a desloca.
E o benchmark útil não é por canal inteiro, é **por cohort** — comparar um vídeo
com os semelhantes (mesmo tipo, mesma faixa de duração, mesmo período). Dividir
13 vídeos por tipo e trimestre deixa células com 1 a 3 vídeos. **Mediana de dois
vídeos não é benchmark, é coincidência.**

**Questão aberta para a fase 2 (análise avançada).** Alternativas a decidir, sem
recomendação fechada aqui:

- **Pool entre canais** para Superiores, com o cohort definido por tipo e duração
  em vez de por canal. Ganha n, perde a especificidade do público.
- **Suprimir o benchmark** onde `n` for abaixo de um limiar (ex.: 30), exibindo
  "amostra insuficiente" em vez de um número que parece autoritativo. Mais
  honesto, e barato de implementar.
- **Percentil com intervalo de confiança**, para o próprio número carregar sua
  incerteza.
- **Aceitar que Superiores é qualitativo** por enquanto: 13 vídeos se analisam a
  olho, não por estatística.

> Isto não bloqueia a migração. Vale registrar agora porque a fase 2 tende a
> tratar "benchmark por cohort" como resolvido pela fact table — e para 0,4% do
> acervo ela não resolve. O problema é de tamanho de amostra, não de modelo.

### C) Política de retenção como mitigação — decisão a tomar

**1,23M linhas/ano é o teto sem otimização.** Granularidade decrescente reduz
volume mantendo o que importa analiticamente: a resolução fina só é necessária
onde a curva se move, isto é, nos primeiros dias após a publicação.

| Política | Linhas/vídeo/ano | Total/ano | Redução | Células (10 col) | Cabe em 10M? |
|----------|-----------------:|----------:|--------:|-----------------:|--------------|
| Diária sempre | 365,0 | 1.230.050 | — | 12.300.500 | **não** |
| Diária 90d + semanal depois | 129,3 | 435.693 | −65% | 4.356.929 | sim |
| Diária 90d + mensal depois | 99,0 | 333.745 | −73% | 3.337.451 | sim |
| Diária 30d + semanal depois | 77,9 | 262.379 | −79% | 2.623.786 | sim |
| Diária 30d + mensal depois | 41,0 | 138.188 | −89% | 1.381.877 | sim |

**Isto é decisão a tomar, não recomendação.** Os trade-offs reais:

- **A favor:** "diária 90d + semanal" corta 65% do volume e é a granularidade que
  a maioria das perguntas de cauda longa exige. Reduz cota de API no backfill pelo
  mesmo fator. E torna a opção B (fact table em Sheets) tecnicamente possível — o
  que muda a conversa, porque deixa de ser "Sheets ou banco" e passa a ser uma
  escolha com duas alternativas viáveis.
- **Contra:** agregação é **irreversível**. Uma vez que a série diária do dia 91
  virou média semanal, nenhuma pergunta futura recupera o dia. Perguntas que hoje
  não sabemos que teremos podem exigir a resolução que jogamos fora.
- **Nota de custo:** em Postgres, 1,23M linhas/ano é volume pequeno — cabe
  confortavelmente com índice em `(video_id, date)`. **A política de retenção só é
  necessária se o Sheets for mantido.** Se a decisão for C, a granularidade diária
  completa é viável e a agregação passa a ser escolha analítica, não restrição
  técnica. Vale decidir na ordem: primeiro onde os dados ficam, depois se agregar.
- Este ADR **expande** o 0001: aquele trata de *de onde vêm* os dados
  (Apps Script vs n8n/MCP); este trata de *como são modelados e onde ficam*.
  Se ambos forem aceitos, o 0001 deve ser resolvido de forma coerente com o C.
