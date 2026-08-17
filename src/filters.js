/**
 * Filtros globais — função pura, sem DOM e sem estado global.
 *
 * Portado do `index.html` (branch main, `getFiltered` nas linhas 551-561) na
 * Task 3 do plano de estabilização. Única mudança em relação ao original: o
 * estado de filtros deixa de ser lido da variável global `filters` e passa a
 * chegar como parâmetro. As seis cláusulas são CÓPIA VERBATIM, na mesma ordem.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CONTRATO DO PARÂMETRO `filters` (ver SPEC.md, "Contrato — estado de filtros"):
 *
 *   channels   Set<string>              vazio = todos (não filtra)
 *   quarters   Set<string>              vazio = todos
 *   videoTypes Set<string>              vazio = todos
 *   abTest     'all' | true | false     TRI-ESTADO: string OU boolean
 *   dateFrom   Date | null              borda inclusiva
 *   dateTo     Date | null              borda inclusiva
 *
 * `abTest` é o ponto que mais engana: no VÍDEO o campo é boolean; no FILTRO é a
 * string 'all' ou um boolean. Não existe 'yes'/'no' — 'Sim'/'Não' são rótulos
 * dos botões da UI. Como a comparação é `!==` estrita contra o boolean do vídeo,
 * trocar o filtro para string faria TODO vídeo ser descartado, deixando tabela e
 * gráficos vazios sem erro no console. Mudar isso exige ADR.
 *
 * BORDAS DE DATA: a exclusão usa `<` e `>` estritos, então o que passa é
 * `>= dateFrom` e `<= dateTo` — as duas bordas são INCLUSIVAS. Vídeo sem
 * `publishDate` é excluído sempre que houver qualquer filtro de data ativo.
 *
 * Atenção ao construir as bordas fora daqui: no `index.html:543-544` o
 * `dateFrom` vem de `new Date('AAAA-MM-DD')` (meia-noite **UTC**) e o `dateTo`
 * de `new Date('AAAA-MM-DD' + 'T23:59:59')` (fim do dia **local**). Em UTC-3 o
 * `dateFrom` começa às 21:00 do dia anterior, então vídeos da véspera à noite
 * entram na contagem. É comportamento herdado, travado em teste; corrigir é
 * decisão separada com ADR.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {Array<object>} allVideos lista completa, já normalizada (publishDate como Date)
 * @param {object} filters estado de filtros conforme o contrato acima
 * @returns {Array<object>} subconjunto de `allVideos`, na ordem original
 */
export function getFiltered(allVideos, filters) {
  return allVideos.filter(v => {
    if (filters.channels.size   && !filters.channels.has(v.channel))     return false;
    if (filters.quarters.size   && !filters.quarters.has(v.quarter))     return false;
    if (filters.videoTypes.size && !filters.videoTypes.has(v.videoType)) return false;
    if (filters.abTest !== 'all' && v.abTest !== filters.abTest)         return false;
    if (filters.dateFrom && (!v.publishDate || v.publishDate < filters.dateFrom)) return false;
    if (filters.dateTo   && (!v.publishDate || v.publishDate > filters.dateTo))   return false;
    return true;
  });
}
