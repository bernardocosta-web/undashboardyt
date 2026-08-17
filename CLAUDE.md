# CLAUDE.md — UN Dashboard YT

Constituição do projeto. Leia este arquivo por inteiro antes de qualquer ação.
Ele diz **o que é o projeto**, **como trabalhar aqui** e **o que nunca quebrar**.

---

## 1. O que é

Dashboard de performance dos canais do **Universo Narrado** no YouTube
(Principal, Militares, Superiores). Serve à operação de conteúdo: decidir o que
gravar, o que editar diferente e o que impulsionar. O UN também vende cursos de
física e matemática, então a médio prazo o dashboard precisa conectar
desempenho de vídeo a leads e matrículas — mas isso é fase posterior
(ver `docs/superpowers/plans/`).

Estado atual: página única `index.html` publicada em GitHub Pages, lendo de um
Apps Script Web App. **Está quebrada no backend** (ver
`docs/backend/runbook-diagnostico.md`) e o código é um monólito de ~1.300 linhas.
O trabalho em curso é estabilizar: restaurar os dados e migrar para uma estrutura
testável.

## 2. Tech stack e restrições

- **Front:** HTML + Tailwind (CDN) + Chart.js 4.4.0. Sem build no estado atual.
- **Export:** html2canvas 1.4.1 + jsPDF 2.5.1.
- **Dados:** hoje via Google Apps Script `/exec` (JSON). Fonte em revisão — ver
  `docs/decisions/0001-fonte-de-dados-apps-script-vs-mcp.md`.
- **Idioma da UI e da doc:** português (pt-BR). Números e datas em locale pt-BR.
- **Público:** o site é público. Nunca colocar segredos, tokens ou URLs de
  planilha privada no código versionado além do que já é público.

## 3. Como trabalhar aqui (fluxo superpowers)

Este repo é feito para ser evoluído com o plugin **superpowers**. A ordem é
sempre a mesma:

1. **Brainstorm antes de construir.** Qualquer feature nova começa por
   `superpowers:brainstorming`. Não pule para código.
2. **Plano antes de tocar código.** Requisitos viram um plano em
   `docs/superpowers/plans/AAAA-MM-DD-<feature>.md` no formato do
   `superpowers:writing-plans` (Goal / Architecture / Tech Stack / Global
   Constraints + tarefas TDD com checkbox).
3. **TDD.** Toda lógica pura (matemática de métricas, formatação, filtros) tem
   teste antes da implementação. Ver seção 5.
4. **Decisões viram ADR.** Escolhas de arquitetura vão para `docs/decisions/`
   usando `0000-template.md`. Não decida arquitetura no chat e esqueça — registre.
5. **Commits pequenos e frequentes.** Um deliverable testável por vez.

Instruções diretas do Bernardo têm precedência sobre skills; skills têm
precedência sobre o comportamento padrão.

## 4. Fronteiras de módulo (alvo da refatoração)

O monólito atual mistura tudo. O alvo é separar por responsabilidade, não por
camada técnica, mantendo arquivos pequenos e focados:

- `src/config.js` — cores, ordens, rótulos, constantes.
- `src/lib/math.js` — funções puras: `avg`, `sum`, `top80avg`, `groupAvg`,
  `calcKPIs`. **Sem DOM.** É o coração testável.
- `src/lib/format.js` — `fmtN`, `fmtPct`, `fmtDateShort`, `esc`. Puras.
- `src/data.js` — fetch + normalização do payload da API. Contrato em `SPEC.md`.
- `src/filters.js` — estado de filtros + `getFiltered`.
- `src/charts/*.js` — um arquivo por gráfico.
- `src/render.js` — orquestra render + tabela.
- `index.html` — só o shell + montagem.

Regra: se um arquivo passar de ~200 linhas ou fizer mais de uma coisa, divida.

## 5. Testes

Lógica pura (`src/lib/*`) é testável em Node sem navegador. Alvo: **vitest**
(leve, zero-config). Todo PR que altera métrica precisa de teste que trave o
comportamento — especialmente `top80avg`, `calcKPIs` e `getFiltered`, que são
onde erros silenciosos enganam decisão de conteúdo.

## 6. Invariantes — o que NUNCA quebrar

- **O contrato de dados** (campos e tipos do objeto de vídeo) está em `SPEC.md`.
  Qualquer mudança nele exige atualizar SPEC.md **e** um ADR.
- **Frações vs. percentuais:** `ctrStudio` e as três retenções vêm como fração
  (0–1) e são multiplicadas por 100 na exibição. Não confunda — é a fonte de bug
  mais provável.
- **`top80avg`** = ordena desc, descarta os 20% piores, tira a média do resto.
  Não é mediana nem trimmed-mean simétrica. Preserve a semântica.
- **Comportamento antes da refatoração = comportamento depois.** A migração para
  módulos é *refactor sem mudança de comportamento*. Números renderizados têm de
  bater com a versão atual antes de adicionar qualquer feature.

## 7. Contexto que economiza retrabalho

- Inscritos aparecem vazios ("Sem dados de inscritos") por causa da exigência de
  propriedade primária da Brand Account na YouTube Analytics API. Não é bug do
  front. Solução conhecida: leitura por navegador (Cowork) ou repensar a fonte.
- Existe um n8n self-hosted e um MCP próprio de YouTube Analytics. Eles são
  candidatos a substituir/complementar o Apps Script como fonte de dados — é a
  decisão registrada em `docs/decisions/0001`.
- Já existe um campo `perf` por métrica (Bom/Médio/Ruim) calculado no backend. É
  um benchmark binário embrionário; a fase de "análise avançada" o substitui por
  percentil/índice vs. cohort.
