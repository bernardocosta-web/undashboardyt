import { describe, it, expect } from 'vitest';
import { getFiltered } from '../src/filters.js';
import fixture from './fixtures/videos.sample.json' with { type: 'json' };

// A fixture guarda publishDate como string; o app converte no fetchData
// (index.html:459). Aqui convertemos igual, para o filtro receber Date.
const vidsReais = fixture.map(v => ({
  ...v,
  publishDate: v.publishDate ? new Date(v.publishDate) : null,
}));

const vids = [
  { channel:'Principal', quarter:'2025-Q1', videoType:'Aula',  abTest:true,  publishDate:new Date('2025-02-01') },
  { channel:'Militares', quarter:'2025-Q1', videoType:'Short', abTest:false, publishDate:new Date('2025-03-01') },
];

// Estado de filtro neutro. Os valores conferem com `index.html` linhas 440 /
// 226-228 / 556 — ver "Contrato — estado de filtros" no SPEC.md.
const semFiltro = () => ({
  channels: new Set(), quarters: new Set(), videoTypes: new Set(),
  abTest: 'all', dateFrom: null, dateTo: null,
});

describe('getFiltered', () => {
  it('filtra por canal', () => {
    expect(getFiltered(vids, { ...semFiltro(), channels:new Set(['Militares']) })
      .map(v=>v.channel)).toEqual(['Militares']);
  });

  it('conjunto vazio não filtra nada', () => {
    expect(getFiltered(vids, semFiltro())).toHaveLength(2);
  });

  it('filtra por trimestre e por tipo', () => {
    expect(getFiltered(vids, { ...semFiltro(), quarters:new Set(['2025-Q1']) })).toHaveLength(2);
    expect(getFiltered(vids, { ...semFiltro(), videoTypes:new Set(['Short']) })
      .map(v=>v.videoType)).toEqual(['Short']);
  });

  it('cláusulas se acumulam (AND, não OR)', () => {
    const f = { ...semFiltro(), channels:new Set(['Principal']), videoTypes:new Set(['Short']) };
    expect(getFiltered(vids, f)).toHaveLength(0);   // Principal é Aula, não Short
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  TRI-ESTADO DO FILTRO A/B: 'all' | true | false
// ═══════════════════════════════════════════════════════════════════════════
// O campo do VÍDEO é boolean; o do FILTRO é a string 'all' OU um boolean.
// Não existe 'yes'/'no' — 'Sim'/'Não' são só rótulos dos botões da UI.
// Origem: index.html:226-228 (setAB('all') / setAB(true) / setAB(false)).
describe('tri-estado do abTest', () => {
  it('o campo do vídeo é boolean em TODOS os vídeos da fixture', () => {
    expect(vidsReais).not.toHaveLength(0);
    for (const v of vidsReais) {
      expect(typeof v.abTest, `${v.title}: abTest deveria ser boolean`).toBe('boolean');
    }
  });

  it('os três valores produzem três resultados DISTINTOS sobre a mesma fixture', () => {
    const todos = getFiltered(vidsReais, { ...semFiltro(), abTest:'all'  });
    const sim   = getFiltered(vidsReais, { ...semFiltro(), abTest:true   });
    const nao   = getFiltered(vidsReais, { ...semFiltro(), abTest:false  });

    const ids = (lista) => lista.map(v => v.url).sort().join('|');

    // Três conjuntos, dois a dois diferentes.
    expect(ids(todos)).not.toBe(ids(sim));
    expect(ids(todos)).not.toBe(ids(nao));
    expect(ids(sim)).not.toBe(ids(nao));

    // E são uma PARTIÇÃO de 'all': sem sobreposição, e a soma fecha o total.
    expect(sim.length + nao.length).toBe(todos.length);
    const urlsSim = new Set(sim.map(v => v.url));
    expect(nao.some(v => urlsSim.has(v.url))).toBe(false);

    // Na fixture: 10 vídeos, 5 com A/B e 5 sem.
    expect(todos).toHaveLength(10);
    expect(sim).toHaveLength(5);
    expect(nao).toHaveLength(5);
    expect(sim.every(v => v.abTest === true)).toBe(true);
    expect(nao.every(v => v.abTest === false)).toBe(true);
  });

  it('com contagens diferentes, os três resultados também diferem em tamanho', () => {
    // A fixture real tem 5/5, então as contagens de true e false empatam.
    // Aqui um recorte 2/1 deixa os três tamanhos distintos: 3, 2 e 1.
    const tres = vidsReais.filter(v => ['Principal','Militares'].includes(v.channel)).slice(0, 3);
    const conta = (ab) => getFiltered(tres, { ...semFiltro(), abTest:ab }).length;
    const tamanhos = [conta('all'), conta(true), conta(false)];
    expect(new Set(tamanhos).size).toBe(3);
    expect(tamanhos[0]).toBe(tamanhos[1] + tamanhos[2]);
  });

  // Guarda de regressão: a comparação em getFiltered é `!==` estrita contra o
  // boolean do vídeo. Se alguém "normalizar" o filtro para string, nenhum vídeo
  // casa e o dashboard esvazia silenciosamente. Este teste documenta a armadilha
  // e falha se o contrato do filtro for trocado sem ADR.
  it('string no lugar de boolean descarta tudo (por isso o tipo é boolean)', () => {
    expect(getFiltered(vids, { ...semFiltro(), abTest:'yes' })).toHaveLength(0);
    expect(getFiltered(vids, { ...semFiltro(), abTest:'Sim' })).toHaveLength(0);
    expect(getFiltered(vidsReais, { ...semFiltro(), abTest:'no' })).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  BORDAS DO INTERVALO DE DATAS
// ═══════════════════════════════════════════════════════════════════════════
// Conferido no original (index.html:557-558): a EXCLUSÃO usa `<` e `>`
// estritos, portanto o que passa é `>= dateFrom` e `<= dateTo` — as duas
// bordas são INCLUSIVAS. Um vídeo exatamente na data-limite entra.
//
// Datas construídas com `new Date(ano, mes0, dia, …)` de propósito: o
// construtor numérico é hora local e não depende de parsing de string, então
// estes asserts valem em qualquer fuso.
describe('bordas do intervalo de datas', () => {
  const emJan = (dia, h = 12) => ({ url:`u${dia}-${h}`, publishDate:new Date(2025, 0, dia, h, 0, 0) });
  const lote  = [emJan(5), emJan(6), emJan(7), emJan(8), emJan(9)];

  it('dateFrom é INCLUSIVA: vídeo exatamente na borda entra', () => {
    const borda = new Date(2025, 0, 7, 12, 0, 0);
    const f = { ...semFiltro(), dateFrom: borda };
    const r = getFiltered(lote, f);
    expect(r.map(v => v.publishDate.getDate())).toEqual([7, 8, 9]);
  });

  it('dateTo é INCLUSIVA: vídeo exatamente na borda entra', () => {
    const borda = new Date(2025, 0, 7, 12, 0, 0);
    const f = { ...semFiltro(), dateTo: borda };
    const r = getFiltered(lote, f);
    expect(r.map(v => v.publishDate.getDate())).toEqual([5, 6, 7]);
  });

  it('1 ms além da borda já exclui — prova que a comparação é estrita', () => {
    const umMsDepois = new Date(2025, 0, 7, 12, 0, 0, 1);
    expect(getFiltered(lote, { ...semFiltro(), dateFrom: umMsDepois })
      .map(v => v.publishDate.getDate())).toEqual([8, 9]);

    const umMsAntes = new Date(2025, 0, 7, 11, 59, 59, 999);
    expect(getFiltered(lote, { ...semFiltro(), dateTo: umMsAntes })
      .map(v => v.publishDate.getDate())).toEqual([5, 6]);
  });

  it('intervalo fechado inclui os dois extremos', () => {
    const f = {
      ...semFiltro(),
      dateFrom: new Date(2025, 0, 6, 12, 0, 0),
      dateTo:   new Date(2025, 0, 8, 12, 0, 0),
    };
    expect(getFiltered(lote, f).map(v => v.publishDate.getDate())).toEqual([6, 7, 8]);
  });

  it('publishDate null: excluído se HOUVER filtro de data, mantido se não houver', () => {
    const comNulo = [...lote, { url:'sem-data', publishDate:null }];
    // Sem filtro de data, o vídeo sem data passa.
    expect(getFiltered(comNulo, semFiltro())).toHaveLength(6);
    // Com qualquer das duas bordas, ele cai (`!v.publishDate ||` nas duas linhas).
    expect(getFiltered(comNulo, { ...semFiltro(), dateFrom:new Date(2025,0,1) })).toHaveLength(5);
    expect(getFiltered(comNulo, { ...semFiltro(), dateTo:new Date(2025,0,31) })).toHaveLength(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  ARMADILHA DE FUSO NA CONSTRUÇÃO DAS BORDAS — comportamento herdado
// ═══════════════════════════════════════════════════════════════════════════
// As bordas são inclusivas, mas os extremos são construídos de formas
// DIFERENTES no index.html:543-544:
//
//   filters.dateFrom = new Date(df)                // 'AAAA-MM-DD'   -> meia-noite UTC
//   filters.dateTo   = new Date(dt + 'T23:59:59')  // com hora       -> 23:59:59 LOCAL
//
// Data pura ISO é interpretada como UTC; data com hora, como hora local. Em
// UTC-3 isso faz o dateFrom começar às 21:00 do dia ANTERIOR, hora local.
// Preservar na refatoração — corrigir é mudança de comportamento e exige ADR.
describe('armadilha de fuso nas bordas (herdado)', () => {
  const dateFromApp = (s) => new Date(s);                  // como o index.html faz
  const dateToApp   = (s) => new Date(s + 'T23:59:59');    // como o index.html faz

  it('dateFrom é meia-noite UTC; dateTo é fim de dia LOCAL', () => {
    // Data pura ISO -> UTC, garantido por especificação, independe do fuso.
    expect(dateFromApp('2025-01-06').toISOString()).toBe('2025-01-06T00:00:00.000Z');
    // Data com hora -> local: os getters locais confirmam, em qualquer fuso.
    const to = dateToApp('2025-01-06');
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
    expect(to.getSeconds()).toBe(59);
  });

  it('a janela de vazamento é exatamente o offset do fuso', () => {
    const from = dateFromApp('2025-01-06');
    const meiaNoiteLocal = new Date(2025, 0, 6).getTime();
    const offsetMin = from.getTimezoneOffset();          // 180 em UTC-3
    // dateFrom fica ANTES da meia-noite local, pelo tamanho do offset.
    expect(from.getTime()).toBe(meiaNoiteLocal - offsetMin * 60_000);
  });

  it('consequência: um instante logo após a borda entra, mesmo sendo véspera local', () => {
    const from = dateFromApp('2025-01-06');
    const v = { url:'vespera', publishDate:new Date(from.getTime() + 1) };
    // Entra no filtro "de 06/01" em qualquer fuso, porque a borda é inclusiva.
    expect(getFiltered([v], { ...semFiltro(), dateFrom: from })).toHaveLength(1);
    // E em fuso a oeste de Greenwich esse instante ainda é dia 05 no calendário
    // local — é daí que vem o vídeo "da véspera" na contagem.
    const offsetMin = from.getTimezoneOffset();
    expect(v.publishDate.getDate()).toBe(offsetMin > 0 ? 5 : 6);
  });
});
