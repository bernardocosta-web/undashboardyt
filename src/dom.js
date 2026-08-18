/**
 * Utilitários de DOM — os quatro auxiliares que o render e a orquestração usam.
 *
 * Portado do `index.html` (branch main, linhas 1319-1322 do original) na Task 5.
 * Cópia verbatim; só foi adicionado `export`.
 *
 * Este módulo não estava previsto no plano. Ele é necessário porque
 * `src/render.js` chama `setText` em três funções, e deixá-lo no
 * `index.html` criaria dependência circular (render importa do index, index
 * importa do render).
 *
 * `setText` é tolerante a id inexistente (`if (el)`); `setLoading` NÃO é —
 * ele assume que `#overlay-loading` existe e lança se não existir. Diferença
 * herdada, preservada.
 */

export function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
export function setLoading(on)   { document.getElementById('overlay-loading').style.display = on ? 'flex' : 'none'; }
export function showBanner(msg)  { setText('error-msg', msg); document.getElementById('banner-error').classList.remove('hidden'); }
export function hideBanner()     { document.getElementById('banner-error').classList.add('hidden'); }
