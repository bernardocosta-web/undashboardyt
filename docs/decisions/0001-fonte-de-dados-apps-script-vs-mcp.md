# ADR 0001 — Fonte de dados: Apps Script vs n8n/MCP

**Status:** Proposto
**Data:** 2026-08-17
**Ver também:** ADR 0002 (modelo de dados e armazenamento). Este ADR trata de
*de onde vêm* os dados; o 0002 trata de *como são modelados e onde ficam*. A
decisão aqui deve ser coerente com a de lá.

## Contexto

Todo o dashboard depende de um único Apps Script Web App (`/exec`) que lê uma
planilha e devolve JSON. Esse desenho é a raiz da fragilidade atual:

- **Ponto único de falha** — o dashboard quebrou inteiro por causa do endpoint.
- **Acoplado à conta Google** — deployment, permissões e OAuth vivem numa conta;
  qualquer mudança de acesso derruba tudo.
- **Difícil de testar** — a lógica de leitura mora no Apps Script, fora do repo.
- **Inscritos bloqueados** — a leitura via API esbarra na exigência de
  propriedade primária da Brand Account.

Ao mesmo tempo, já existe infraestrutura própria: um **n8n self-hosted** e um
**MCP de YouTube Analytics** feitos internamente.

## Opções consideradas

- **A) Manter Apps Script como está.**
  - Prós: já existe; zero migração; a planilha continua editável à mão.
  - Contras: mantém todos os problemas acima; não resolve inscritos; continua
    difícil de testar e evoluir.

- **B) Apps Script vira só "escrivão" da planilha; n8n orquestra a coleta.**
  - n8n coleta métricas (via MCP de YT Analytics + leitura de inscritos por
    navegador/Cowork), consolida e grava. O dashboard lê um JSON estável
    (arquivo estático publicado, ou endpoint do n8n).
  - Prós: separa coleta de exibição; testável; resolve inscritos; abre caminho
    para série temporal e alertas (fases 3 e 4).
  - Contras: mais peças; depende do n8n estar de pé.

- **C) Dashboard lê direto do MCP de YT Analytics.**
  - Prós: menos intermediários.
  - Contras: MCP não é feito pra ser consumido por um site público; expõe
    superfície de auth; mistura coleta com exibição de novo.

## Decisão

_A definir com o Bernardo._ Recomendação inicial: **B**, faseada — primeiro
restaurar o Apps Script (runbook) para destravar o dashboard **hoje**, depois
mover a coleta para o n8n de forma que o dashboard passe a ler um JSON estável e
versionável. Isso resolve o ponto único de falha, destrava inscritos e cria a
base para as fases de análise avançada e automação.

## Consequências

- O dashboard passa a depender de um **contrato de dados estável** (SPEC.md),
  não de um endpoint específico — trocar a fonte por trás fica barato.
- Coleta ganha testes e observabilidade (execuções do n8n).
- Custo: manter o pipeline do n8n como parte do projeto, não como caixa-preta.
