import { describe, it, expect } from 'vitest';
import { fmtN, fmtPct, fmtDateShort, esc } from '../../src/lib/format.js';
import golden from '../fixtures/golden.json' with { type: 'json' };

// ═══════════════════════════════════════════════════════════════════════════
//  MECANISMO DE ARREDONDAMENTO — apurado no index.html antes de escrever isto
// ═══════════════════════════════════════════════════════════════════════════
//
// `Number.prototype.toLocaleString('pt-BR', …)` — ou seja Intl.NumberFormat,
// com roundingMode "halfExpand" (o padrão do Intl). NÃO é toFixed.
// `Math.round` aparece só no ramo `< 1000` do fmtN.
//
// ESTA FASE É REFACTOR SEM MUDANÇA DE COMPORTAMENTO. Vários resultados abaixo
// são feios de propósito: eles travam o que o monólito faz HOJE. Melhorar a
// formatação é decisão separada, com ADR, número mudando de propósito e alguém
// sabendo qual mudou. Não de carona numa extração de módulo.

describe('fmtN', () => {
  it('formata milhares e milhões', () => {
    expect(fmtN(1500)).toBe('1,5K');
    expect(fmtN(2_300_000)).toBe('2,3M');
  });
  it('mostra travessão para null', () => {
    expect(fmtN(null)).toBe('—');
  });

  it('undefined também cai no travessão (== null é frouxo, de propósito)', () => {
    expect(fmtN(undefined)).toBe('—');
  });

  it('zero sai como "0", sem sufixo e sem decimal', () => {
    expect(fmtN(0)).toBe('0');
  });

  it('valores reais de KPI da fixture', () => {
    expect(fmtN(golden.kpis.totalViews)).toBe('135,5K');       // 135500
    expect(fmtN(golden.kpis.avgViews)).toBe('15,1K');          // 15055.5555…
    expect(fmtN(golden.kpis.avgImpress)).toBe('174,1K');       // 174111.111…
    expect(fmtN(golden.kpis.totalImpress)).toBe('1,6M');       // 1567000
  });
});

describe('fmtPct', () => {
  it('trata fração 0–1 como percentual', () => {
    expect(fmtPct(0.083)).toBe('8,3%');
  });

  // O NÚMERO QUE O calcKPIs REALMENTE PRODUZ, não o arredondado à mão.
  // 0.083 é o que a gente escreve; 0.08299999999999999 é o que sai da média.
  // Os dois formatam igual — o ruído de ponto flutuante não vaza para a tela.
  it('o valor REAL de ctrStudioGeral formata igual ao valor "limpo"', () => {
    expect(fmtPct(0.08299999999999999)).toBe('8,3%');
    expect(fmtPct(0.08299999999999999)).toBe(fmtPct(0.083));
  });

  it('valores reais dos 5 campos fracionários do golden', () => {
    expect(fmtPct(golden.kpis.ctrStudioGeral)).toBe('8,3%');    // 0.08299999999999999
    expect(fmtPct(golden.kpis.ctrStudioTop80)).toBe('9,2%');    // 0.09174999999999997
    expect(fmtPct(golden.kpis.ret30s)).toBe('71,7%');           // 0.717
    expect(fmtPct(golden.kpis.retMedia)).toBe('47,8%');          // 0.4779999999999999
    expect(fmtPct(golden.kpis.retFinal)).toBe('30,6%');          // 0.30600000000000005
  });

  it('zero mantém a casa decimal: "0,0%" (minimumFractionDigits:1)', () => {
    expect(fmtPct(0)).toBe('0,0%');
  });

  it('null e undefined viram travessão', () => {
    expect(fmtPct(null)).toBe('—');
    expect(fmtPct(undefined)).toBe('—');
  });

  it('negativo é formatado normalmente, com sinal', () => {
    expect(fmtPct(-0.05)).toBe('-5,0%');
  });

  it('fração 1 vira 100,0%', () => {
    expect(fmtPct(1)).toBe('100,0%');
  });
});

describe('fmtDateShort', () => {
  it('formata como DD/MM/AAAA no locale pt-BR', () => {
    // Construtor (ano, mês0, dia) em vez de string ISO: independe de fuso.
    expect(fmtDateShort(new Date(2025, 0, 6))).toBe('06/01/2025');
    expect(fmtDateShort(new Date(2025, 11, 25))).toBe('25/12/2025');
  });

  it('COMPORTAMENTO HERDADO: não valida entrada, então null explode', () => {
    // O original não tem guarda de null (diferente de fmtN/fmtPct). Quem
    // chamar com null recebe TypeError. Travado para a extração não "consertar"
    // isso de carona — se for para consertar, é ADR e mudança de comportamento.
    expect(() => fmtDateShort(null)).toThrow(TypeError);
  });
});

describe('esc', () => {
  it('escapa &, <, > e aspas duplas', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
    expect(esc('a & b "c"')).toBe('a &amp; b &quot;c&quot;');
  });

  it('COMPORTAMENTO HERDADO: NÃO escapa aspas simples', () => {
    // Só &, <, > e " estão na lista. Aspas simples passam intactas. Hoje isso
    // não é explorável porque todos os atributos gerados usam aspas duplas
    // (index.html 771-782). Fica travado para não mudar sem se dar conta.
    expect(esc("aspas simples ' aqui")).toBe("aspas simples ' aqui");
  });

  it('COMPORTAMENTO HERDADO: qualquer valor falsy vira string vazia', () => {
    // A guarda é `if (!s) return ''`, não `if (s == null)`. Então o número 0 e
    // o boolean false somem, em vez de virarem "0" e "false".
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
    expect(esc('')).toBe('');
    expect(esc(0)).toBe('');
    expect(esc(false)).toBe('');
  });

  it('converte não-string para string quando truthy', () => {
    expect(esc(123)).toBe('123');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  QUIRKS HERDADOS — travados de propósito, não são "expectativas desejadas"
// ═══════════════════════════════════════════════════════════════════════════
// Cada assert aqui documenta algo que provavelmente queremos mudar um dia. Se
// mudar, é decisão consciente com ADR: o teste falha e obriga a atualização.
describe('fmtN — quirks herdados', () => {
  it('1.000.000 exato sai "1M", não "1,0M" (fmtN não tem minimumFractionDigits)', () => {
    // O fmtPct define minimumFractionDigits:1; o fmtN NÃO. Consequência: na
    // mesma coluna convivem "1M" e "1,5M", com e sem casa decimal.
    expect(fmtN(1_000_000)).toBe('1M');
    expect(fmtN(1_500_000)).toBe('1,5M');
    expect(fmtN(1_000)).toBe('1K');
    expect(fmtN(1_500)).toBe('1,5K');
  });

  it('999.999 sai "1.000K" em vez de "1M" — separador de milhar dentro do K', () => {
    // 999999 < 1e6, então cai no ramo K: 999.999 arredonda para 1000 -> "1.000K".
    // É o caso que aparece feio num print de relatório.
    expect(fmtN(999_999)).toBe('1.000K');
    expect(fmtN(1_049_999)).toBe('1M');      // arredonda para baixo, vira "1M"
    expect(fmtN(1_050_000)).toBe('1,1M');
  });

  it('negativo NUNCA recebe sufixo K/M, porque a guarda é `n >= 1e3`', () => {
    expect(fmtN(-1_500)).toBe('-1.500');
    expect(fmtN(-2_300_000)).toBe('-2.300.000');
    expect(fmtN(-500)).toBe('-500');
  });

  it('abaixo de 1000, Math.round mata toda casa decimal', () => {
    expect(fmtN(0.5)).toBe('1');    // halfExpand: 0,5 -> 1
    expect(fmtN(0.4)).toBe('0');
    expect(fmtN(999)).toBe('999');
  });

  it('NaN vaza como texto "NaN" para a interface, sem guarda', () => {
    // Nem fmtN nem fmtPct testam isNaN. Só `== null`.
    expect(fmtN(NaN)).toBe('NaN');
    expect(fmtPct(NaN)).toBe('NaN%');
  });
});

describe('arredondamento é halfExpand (Intl), não truncamento', () => {
  // Documenta o roundingMode efetivo. Estes valores dependem da representação
  // IEEE-754 do produto ×100 — são estáveis por especificação, mas é por isso
  // que existem só como demonstração do modo, não como regra de negócio.
  it('arredonda o meio para longe do zero', () => {
    expect(fmtPct(0.1255)).toBe('12,6%');
    expect(fmtPct(0.1245)).toBe('12,5%');
  });
  it('valor minúsculo colapsa para 0,0%', () => {
    expect(fmtPct(0.0004)).toBe('0,0%');
  });
});
