# Como o YouTube decide (aplicado a canal de ciência)

Nota de domínio. Objetivo: entender o que as métricas do dashboard estão medindo
de verdade, pra que as decisões de conteúdo sejam causais e não supersticiosas.

## O laço central

O YouTube mostra um vídeo (impressões), mede se as pessoas clicam (CTR) e, depois
do clique, se elas ficam (retenção / tempo de exibição). Cada rodada dá mais ou
menos alcance na rodada seguinte. Simplificando:

```
impressões → CTR → clique → retenção/tempo de exibição → mais impressões → ...
```

Duas leituras práticas disso:

1. **CTR e retenção se equilibram.** Uma thumbnail sensacionalista pode subir o
   CTR e derrubar a retenção — o vídeo é mostrado, clicado e abandonado, e o
   alcance encolhe. Para conteúdo de ciência, a promessa da capa precisa bater
   com a entrega do vídeo.
2. **As primeiras horas pesam.** O desempenho inicial calibra quanto o vídeo será
   distribuído depois. Por isso `views24h` é a métrica de partida do dashboard —
   mas ela é só o começo da história (ver limitação de snapshot no SPEC).

## O que isso significa para o UN

- **Canal de vídeo longo vive de retenção.** Em explicações de física/matemática,
  o abandono costuma vir em pontos específicos: uma passagem densa, um trecho
  arrastado, uma transição confusa. Um número único de retenção esconde isso — a
  **curva** de retenção (fase futura) mostra o timestamp exato do abandono e vira
  instrução de edição.
- **Impressão sem CTR é embalagem fraca; CTR sem retenção é promessa quebrada.**
  Olhar as duas juntas (o gráfico A/B e um scatter CTR×impressões, na fase de
  packaging) separa problema de capa de problema de conteúdo.
- **Comparar com o próprio histórico, não com números absolutos.** "50 mil views"
  não diz nada sozinho; "acima ou abaixo da mediana do canal na mesma idade" diz.
  É o que motiva o benchmark por cohort (fase de análise avançada).

## Armadilhas de interpretação

- Média simples é enganada por outliers. O `top80avg` do dashboard existe pra
  mostrar quanto os piores vídeos estão puxando a média pra baixo.
- Retenção "média" e retenção "final" medem coisas diferentes: quanto do vídeo a
  pessoa média assistiu vs. quantos chegaram ao fim. Um vídeo pode ter retenção
  média alta e final baixa (perde todo mundo no último terço) — sinal de final
  arrastado.
- Comparar tipos de vídeo diferentes (Short vs. Aula) na mesma métrica bruta
  engana: as dinâmicas de distribuição são distintas. Filtre por tipo.
