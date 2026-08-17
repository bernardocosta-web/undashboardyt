# UN Dashboard YT

Dashboard de performance dos canais do **Universo Narrado** no YouTube
(Principal, Militares, Superiores). Serve à operação de conteúdo e, a médio
prazo, ao elo entre desempenho de vídeo e venda de cursos.

## Estado

Em estabilização. O dashboard público (`index.html`) está com o backend quebrado
e o código é um monólito. Este repositório é a base para restaurar os dados e
migrar para uma estrutura testável, evoluída com o plugin **superpowers**.

## Por onde começar

0. **Guia passo a passo do zero** → `COMECE-AQUI.md` ← comece por aqui
1. **Consertar o carregamento** → `docs/backend/runbook-diagnostico.md`
2. **Entender o sistema atual** → `SPEC.md` (contrato de dados e features)
3. **Como trabalhar no repo** → `CLAUDE.md` (constituição e fluxo)
4. **Plano de estabilização** → `docs/superpowers/plans/2026-08-17-estabilizacao.md`

## Estrutura

```
.
├── CLAUDE.md                # constituição: o que é, como trabalhar, o que não quebrar
├── SPEC.md                  # estado atual: contrato de dados + inventário de features
├── README.md                # este arquivo
├── index.html               # dashboard (a migrar para src/ — ver plano)
└── docs/
    ├── backend/
    │   └── runbook-diagnostico.md      # árvore de decisão do backend quebrado
    ├── decisions/                       # ADRs — decisões de arquitetura
    │   ├── 0000-template.md
    │   ├── 0001-fonte-de-dados-apps-script-vs-mcp.md
    │   └── 0002-modelo-de-dados-e-armazenamento.md
    ├── learning/                        # notas de domínio (YouTube + métricas)
    │   ├── README.md
    │   ├── 01-como-o-youtube-decide.md
    │   └── 02-glossario-de-metricas.md
    └── superpowers/
        └── plans/                       # planos de implementação (formato superpowers)
            └── 2026-08-17-estabilizacao.md
```

## Fases previstas (após estabilizar)

1. **Estabilização** — restaurar dados + refatorar para módulos testados. _(atual)_
2. **Análise avançada** — curva de retenção por vídeo, benchmark por cohort,
   visão de packaging (thumbnail/título).
3. **Automação/IA** — digests e alertas de cohort no n8n; resumos por LLM.
4. **Negócio** — funil view → clique → lead → matrícula (ActiveCampaign/HubSpot),
   com lente de campanha (ITA/Militares).

O `index.html` atual não está incluído neste pacote inicial — copie o seu do
repositório para a raiz e siga o plano de estabilização para migrá-lo.
