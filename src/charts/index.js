/**
 * Orquestrador dos 7 gráficos.
 *
 * Portado do `index.html` (branch main, linhas 774-782) na Task 5. A ORDEM das
 * chamadas é verbatim e importa: `renderSubscriberChart` vem antes do funil no
 * original, e mudar a ordem muda a ordem de criação dos canvas.
 *
 * Única alteração: `allSubscribers` chega como parâmetro e é repassado ao
 * gráfico 7, que antes lia a global.
 */
import { renderTypeChart }       from './type.js';
import { renderWeekdayChart }    from './weekday.js';
import { renderHourChart }       from './hour.js';
import { renderABChart }         from './ab.js';
import { renderTimelineChart }   from './timeline.js';
import { renderSubscriberChart } from './subscribers.js';
import { renderFunnelChart }     from './funnel.js';

export function renderCharts(vids, allSubscribers) {
  renderTypeChart(vids);
  renderWeekdayChart(vids);
  renderHourChart(vids);
  renderABChart(vids);
  renderTimelineChart(vids);
  renderSubscriberChart(allSubscribers);
  renderFunnelChart(vids);
}
