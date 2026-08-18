/**
 * Formatação para exibição — funções puras, sem DOM.
 *
 * Portado do `index.html` (branch main: `fmtN`/`fmtPct`/`fmtDateShort` nas
 * linhas 605-617, `esc` nas 1323-1326) na Task 2 do plano de estabilização.
 * A lógica é CÓPIA VERBATIM: só foi adicionado `export`.
 *
 * MECANISMO DE ARREDONDAMENTO: `Number.prototype.toLocaleString('pt-BR', …)`,
 * isto é `Intl.NumberFormat` com `roundingMode: "halfExpand"` (padrão do Intl).
 * Não é `toFixed`. `Math.round` só no ramo `< 1000` do `fmtN`.
 *
 * É AQUI, E SÓ AQUI, que fração 0–1 vira percentual. O cálculo
 * (`src/lib/math.js`) trabalha sempre em fração; o `×100` mora no `fmtPct`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * QUIRKS HERDADOS — travados em `tests/lib/format.test.js`. NÃO corrigir aqui
 * sem ADR: mudar qualquer um destes muda número na tela do Bernardo.
 *
 *  - `fmtN` não define `minimumFractionDigits`, mas `fmtPct` define. Então
 *    1.000.000 sai `"1M"` enquanto 1.500.000 sai `"1,5M"` — casa decimal
 *    aparece e desaparece na mesma coluna.
 *  - `fmtN(999999)` → `"1.000K"`, não `"1M"`: 999999 < 1e6 cai no ramo K e
 *    999,999 arredonda para 1000, com separador de milhar dentro do K.
 *  - Negativo nunca recebe sufixo K/M: as guardas são `n >= 1e3` / `n >= 1e6`,
 *    falsas para negativos. `fmtN(-2300000)` → `"-2.300.000"`.
 *  - Nenhuma das duas testa `isNaN`, só `== null`. `fmtN(NaN)` → `"NaN"` e
 *    `fmtPct(NaN)` → `"NaN%"` vazam para a interface.
 *  - `fmtDateShort` não tem guarda de null (diferente das outras) e lança
 *    TypeError.
 *  - `esc` usa `if (!s)`, não `if (s == null)`: o número 0 e o boolean false
 *    viram string vazia. E não escapa aspas simples — hoje inofensivo porque
 *    todo atributo gerado usa aspas duplas.
 * ────────────────────────────────────────────────────────────────────────────
 */

export function fmtN(n) {
  if (n == null) return '—';
  if (n >= 1e6) return (n/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+'M';
  if (n >= 1e3) return (n/1e3).toLocaleString('pt-BR',{maximumFractionDigits:1})+'K';
  return Math.round(n).toLocaleString('pt-BR');
}

export function fmtPct(f) {
  if (f == null) return '—';
  return (f*100).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
}

export function fmtDateShort(d) {
  return d.toLocaleDateString('pt-BR'); // DD/MM/YYYY
}

export function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
