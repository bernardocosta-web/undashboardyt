# Glossário de métricas do dashboard

Cada métrica que o dashboard mostra hoje, o que ela mede e a armadilha de leitura.

## Volume

- **Views (24h)** — views nas primeiras 24h após publicação. É o sinal de partida
  do algoritmo, não o total de vida do vídeo. Bom para comparar largadas; ruim
  para julgar sucesso final (a cauda longa não aparece).
- **Impressões** — quantas vezes a thumbnail foi mostrada. Sozinha diz pouco; só
  faz sentido junto do CTR.

## Cliques

- **CTR Studio** — fração de impressões que viraram clique. **Vem como fração
  0–1** e é exibido ×100. Mede a força da embalagem (thumbnail + título). CTR alto
  com retenção baixa = promessa que o vídeo não cumpre.

## Retenção (todas vêm como fração 0–1)

- **Retenção 30s** — quantos passaram dos primeiros 30 segundos. É o filtro da
  abertura: se cai aqui, o problema é o gancho inicial.
- **Retenção média** — quanto do vídeo a pessoa média assistiu.
- **Retenção final** — quantos chegaram ao fim. Comparar média × final revela
  onde a audiência se perde: final baixa com média alta = últimos trechos
  arrastados.

## Métricas derivadas do dashboard

- **Top 80%** — ordena os vídeos pela métrica (maior → menor), descarta os 20%
  piores e tira a média do resto. Revela o quanto os outliers ruins puxam a média
  geral pra baixo. **Não** é mediana nem trimmed-mean simétrica.
- **Média/vídeo** — média simples; sensível a outliers (por isso o top80 existe
  ao lado).
- **perf (Bom/Médio/Ruim)** — classificação por métrica vinda do backend, que
  colore a tabela. É um benchmark binário embrionário; a fase de análise avançada
  o troca por percentil/índice vs. cohort do mesmo canal e idade.

## Funil atual

`Impressões → Views (24h) → Assistiram 30s → Assistiram até o fim`. Os dois
últimos são **estimados** (`views24h × retenção`), não contagens diretas. Mede
atenção, não negócio — o funil de vendas (view → clique no link → lead →
matrícula) é fase posterior.

## Regra de ouro

Fração vs. percentual é a fonte de bug número um: `ctrStudio` e as três retenções
são 0–1 no dado e ×100 na tela. Qualquer cálculo novo que as use tem de respeitar
isso — e ter teste que trave (ver `SPEC.md` e o plano de estabilização).
