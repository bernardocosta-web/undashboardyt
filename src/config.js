/**
 * Configuração — cores, ordens, rótulos e constantes.
 *
 * Portado do `index.html` (branch main, linhas 430-433) na Task 4 do plano de
 * estabilização. Valores CÓPIA VERBATIM; só foi adicionado `export`.
 *
 * A `API_URL` já é pública: está no `index.html` do site, que é servido por
 * GitHub Pages, e o deployment do Apps Script exige acesso "Qualquer pessoa"
 * para o dashboard funcionar. Movê-la para cá não muda a exposição.
 * Não é segredo — e nenhum segredo deve entrar neste arquivo, pelo mesmo motivo.
 */

export const API_URL = 'https://script.google.com/macros/s/AKfycbz45SsGps__6mDqPXETiTa4h57_Ss_mXYToUeIs_LnzPdSi8djmTNwkxKlm34KbMNnK/exec';

export const CH_COLORS   = { Principal:'#60A5FA', Militares:'#34D399', Superiores:'#FBBF24' };

/**
 * Ordem de exibição dos dias no gráfico 2. É Seg→Dom, não a ordem de
 * `Date.getDay()` (que começa no domingo). O gráfico filtra este array pelos
 * dias presentes, então a ordem daqui é a ordem da tela.
 * Os rótulos têm de casar exatamente com o campo `weekday` do payload, que vem
 * pronto do backend nesse formato — inclusive o acento em "Sáb".
 */
export const WEEKDAY_ORD = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
