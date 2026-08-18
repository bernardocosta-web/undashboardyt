/**
 * Camada de dados — busca e normalização do payload do `/exec`.
 *
 * Portado do `index.html` (branch main, `fetchData` nas linhas 450-475) na
 * Task 4 do plano de estabilização.
 *
 * Duas mudanças em relação ao original, ambas deliberadas:
 *
 *  1. `apiUrl` chega como parâmetro, em vez de ler a constante global.
 *  2. A função **devolve** os dados em vez de atribuir a globais, mostrar
 *     banner e disparar `render()`. Toda a orquestração de DOM (overlay de
 *     carregamento, banner de erro, timestamp, filtros dinâmicos, render) fica
 *     no `index.html`.
 *
 * O `fetch`, o cache-bust, as três checagens de erro e as duas normalizações
 * são CÓPIA VERBATIM. Nenhum comportamento muda: os mesmos erros são lançados
 * com as mesmas mensagens, na mesma ordem.
 *
 * **É AQUI que a fonte de dados será trocada** se o ADR 0001 for aceito. Este
 * arquivo é o ponto de isolamento que a refatoração existe para criar: quem
 * migrar para n8n/Postgres reescreve só este módulo, mantendo a forma de
 * retorno definida em `SPEC.md`.
 *
 * ⚠ O contrato de retorno está em `SPEC.md`, "Contrato — objeto de vídeo".
 * Campos que o front lê e o backend precisa entregar, além dos óbvios:
 * `weekday` e `publishHour` (gráficos 2 e 3, NÃO são calculados aqui),
 * `durationSecs` (ordenação da coluna Duração, lido só via `a[rankSort]`) e as
 * seis sub-chaves de `perf`, cujos nomes divergem dos nomes das métricas.
 */

/**
 * Busca e normaliza o payload. Lança `Error` em HTTP não-OK, em JSON inválido
 * (inclusive quando o `/exec` devolve HTML de login) e em `{ error }`.
 *
 * @param {string} apiUrl URL do Web App do Apps Script, terminada em `/exec`
 * @returns {Promise<{videos: object[], subscribers: object[], timestamp: unknown}>}
 */
export async function fetchData(apiUrl) {
  const res  = await fetch(apiUrl + '?t=' + Date.now());
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return {
    videos: (data.videos || []).map(v => ({
      ...v,
      publishDate: v.publishDate ? new Date(v.publishDate) : null,
      videoType:   v.videoType ? v.videoType.trim().replace(/\s+/g, ' ') : v.videoType,
      perf:        v.perf || {},
    })),
    subscribers: (data.subscribers || []).map(s => ({
      ...s,
      date: s.date ? new Date(s.date) : null,
    })),
    timestamp: data.timestamp,
  };
}
