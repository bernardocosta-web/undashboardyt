import { describe, it, expect } from 'vitest';
import { top80avg, avg, sum, groupAvg, calcKPIs } from '../../src/lib/math.js';
import vids   from '../fixtures/videos.sample.json' with { type: 'json' };
import golden from '../fixtures/golden.json'        with { type: 'json' };

describe('top80avg', () => {
  it('descarta os 20% piores e tira a média do resto', () => {
    // 10 valores; mantém os 8 maiores (floor(10*0.8)=8)
    const xs = [10,9,8,7,6,5,4,3,2,1];
    expect(top80avg(xs)).toBe((10+9+8+7+6+5+4+3)/8);   // 52/8 = 6.5
  });
  it('mantém pelo menos 1 elemento', () => {
    expect(top80avg([5])).toBe(5);
  });
  it('ignora null/NaN', () => {
    expect(avg([2, null, 4, NaN])).toBe(3);
  });
  it('retorna null para lista vazia', () => {
    expect(top80avg([])).toBeNull();
  });
});

describe('sum', () => {
  it('soma ignorando null/NaN', () => {
    expect(sum([10, null, 20, NaN, 30])).toBe(60);
  });
  it('retorna 0 para lista vazia — diferente de avg, que retorna null', () => {
    expect(sum([])).toBe(0);
    expect(avg([])).toBeNull();
  });
});

describe('groupAvg', () => {
  it('agrupa por chave e tira a média de cada grupo', () => {
    const xs = [
      { channel:'Principal', views24h:100 },
      { channel:'Principal', views24h:200 },
      { channel:'Militares', views24h:50  },
    ];
    expect(groupAvg(xs, v=>v.channel, v=>v.views24h))
      .toEqual({ Principal:150, Militares:50 });
  });
  it('descarta chave null/vazia e valor não numérico', () => {
    const xs = [
      { channel:'',          views24h:100  },   // chave vazia -> fora
      { channel:null,        views24h:100  },   // chave null  -> fora
      { channel:'Principal', views24h:null },   // valor null  -> fora
      { channel:'Principal', views24h:80   },
    ];
    expect(groupAvg(xs, v=>v.channel, v=>v.views24h)).toEqual({ Principal:80 });
  });
});

describe('calcKPIs', () => {
  it('devolve exatamente as 10 chaves do contrato do SPEC', () => {
    expect(Object.keys(calcKPIs(vids)).sort()).toEqual([
      'avgImpress','avgViews','ctrStudioGeral','ctrStudioTop80','ret30s',
      'retFinal','retMedia','total','totalImpress','totalViews',
    ]);
  });

  // ── TRAVA DO INVARIANTE MAIS PERIGOSO ────────────────────────────────────
  // ctrStudio e as retenções são frações 0–1 e só viram percentual na
  // EXIBIÇÃO (fmtPct). Se alguém multiplicar por 100 dentro do cálculo, este
  // teste falha. É a única defesa automatizada contra o bug de 100×.
  it('mantém ctrStudio e retenções como fração 0–1, nunca ×100', () => {
    const k = calcKPIs(vids);
    for (const campo of ['ctrStudioGeral','ctrStudioTop80','ret30s','retMedia','retFinal']) {
      expect(k[campo], `${campo} saiu da faixa 0–1`).toBeGreaterThan(0);
      expect(k[campo], `${campo} parece ter sido multiplicado por 100`).toBeLessThan(1);
    }
    expect(k.ctrStudioGeral).toBeCloseTo(0.083, 3);   // ~8,3% na tela
  });

  it('reproduz o golden congelado na Task 0, campo por campo', () => {
    expect(calcKPIs(vids)).toEqual(golden.kpis);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  PROPRIEDADE: top80avg(xs) >= avg(xs)
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUE ESTE TESTE EXISTE — e o que ele NÃO é:
//
// Ele NÃO existe para pegar uma ordenação invertida. Esse caso já é coberto
// pelo assert exato de n=10 lá em cima: com `sort((a,b) => b-a)` o resultado é
// 52/8 = 6.5, e com a ordenação invertida seria 36/8 = 4.5 — o assert quebra
// sozinho, sem precisar de propriedade.
//
// O valor dele é a GENERALIDADE SOBRE n. O assert exato trava um único
// tamanho de entrada (n=10). O corte `floor(n*0.8)` se comporta de formas
// diferentes conforme n, e é aí que mora o risco:
//
//   n=1  -> floor(0.8)=0, resgatado por Math.max(1, 0) => mantém 1
//   n=2  -> floor(1.6)=1  => o top80 fica com UM elemento (= o máximo)
//   n=3  -> floor(2.4)=2
//   n=7  -> floor(5.6)=5
//   n=10 -> floor(8.0)=8  (o único caso que o assert exato cobre)
//
// Uma mudança em `Math.max(1, ...)`, no `floor` (para `ceil`/`round`) ou no
// fator 0.8 pode manter n=10 correto e estragar n=1, 2 ou 3. A propriedade
// vale para TODO n, então cobre a família inteira em vez de um ponto.
//
// A relação é garantia matemática, não coincidência desta fixture: a média dos
// k maiores de n valores é sempre >= média dos n. Por isso é `>=` e não `>` —
// com todos os valores iguais dá IGUALDADE, e é isso que o caso "todos iguais"
// abaixo trava.
//
// BORDA DEFINIDA: quando não sobra nenhum valor válido após o filtro, os DOIS
// retornam null (é a mesma condição em ambas as funções: `v.length === 0`).
// Nesse caso comparamos null com null e NÃO usamos `>=`, porque em JS
// `null >= null` coage para `0 >= 0` e passaria por acidente — escondendo uma
// eventual troca de `null` por `0` no retorno.
function checaPropriedade(xs, rotulo) {
  const a = avg(xs);
  const t = top80avg(xs);

  if (a === null || t === null) {
    expect(a, `${rotulo}: avg deveria ser null`).toBeNull();
    expect(t, `${rotulo}: top80avg deveria ser null`).toBeNull();
    return { a, t };
  }

  expect(t, `${rotulo}: top80avg (${t}) deveria ser >= avg (${a})`)
    .toBeGreaterThanOrEqual(a);
  return { a, t };
}

describe('propriedade top80avg(xs) >= avg(xs)', () => {
  it('n=1 — floor(0.8)=0 resgatado por Math.max(1,0); dá igualdade', () => {
    const { a, t } = checaPropriedade([5], 'n=1');
    expect(a).toBe(5);
    expect(t).toBe(5);
  });

  it('n=2 — floor(1.6)=1, o top80 fica com um único elemento (o máximo)', () => {
    const { a, t } = checaPropriedade([10, 4], 'n=2');
    expect(a).toBe(7);    // (10+4)/2
    expect(t).toBe(10);   // mantém só [10]
  });

  it('n=3 — floor(2.4)=2', () => {
    const { a, t } = checaPropriedade([9, 6, 3], 'n=3');
    expect(a).toBe(6);      // (9+6+3)/3
    expect(t).toBe(7.5);    // (9+6)/2
  });

  it('n=7 — floor(5.6)=5', () => {
    const { a, t } = checaPropriedade([7,6,5,4,3,2,1], 'n=7');
    expect(a).toBe(4);   // 28/7
    expect(t).toBe(5);   // (7+6+5+4+3)/5 = 25/5
  });

  it('n=10 — floor(8.0)=8', () => {
    const { a, t } = checaPropriedade([10,9,8,7,6,5,4,3,2,1], 'n=10');
    expect(a).toBe(5.5);   // 55/10
    expect(t).toBe(6.5);   // 52/8
  });

  it('valores todos iguais — tem de dar IGUALDADE (por isso >= e não >)', () => {
    const { a, t } = checaPropriedade([4,4,4,4,4], 'todos iguais');
    expect(a).toBe(4);
    expect(t).toBe(4);
    expect(t).toBe(a);
  });

  it('com duplicatas — empates não confundem o corte', () => {
    const { a, t } = checaPropriedade([8,8,5,5,2], 'duplicatas');
    expect(a).toBeCloseTo(5.6, 10);   // 28/5
    expect(t).toBe(6.5);              // (8+8+5+5)/4 = 26/4
  });

  it('lista vazia — os dois retornam null (borda definida, sem >=)', () => {
    const { a, t } = checaPropriedade([], 'vazia');
    expect(a).toBeNull();
    expect(t).toBeNull();
  });

  it('só valores inválidos — mesma borda da lista vazia', () => {
    const { a, t } = checaPropriedade([null, NaN, undefined], 'só inválidos');
    expect(a).toBeNull();
    expect(t).toBeNull();
  });

  // Os arrays reais da fixture: é onde a propriedade tem de valer de verdade,
  // com números de produção e não com casos construídos.
  const CAMPOS = ['views24h','impressions','ctrStudio','retention30s','retentionMedia','retentionFinal'];
  it.each(CAMPOS)('array real da fixture: %s', (campo) => {
    checaPropriedade(vids.map(v => v[campo]), `fixture.${campo}`);
  });

  it('os valores da fixture batem com o golden da Task 0', () => {
    expect(avg(vids.map(v => v.ctrStudio))).toBe(golden.kpis.ctrStudioGeral);
    expect(top80avg(vids.map(v => v.ctrStudio))).toBe(golden.kpis.ctrStudioTop80);
    expect(top80avg(vids.map(v => v.views24h))).toBe(golden.top80.views24h);
    expect(top80avg(vids.map(v => v.impressions))).toBe(golden.top80.impressions);
  });
});
