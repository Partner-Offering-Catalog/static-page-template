'use strict';

const { Renderer } = require('marked');

const baseRenderer = new Renderer();

/**
 * Names the scroll region after the table's own column headers, so a page with
 * several tables does not present a screen reader user with several identical
 * "Table" regions. GFM has no caption syntax, so the header row is the only
 * description the source offers.
 * @param {{ header?: Array<{ text?: string }> }} token
 * @returns {string}
 */
function describeTable(token) {
  const headers = (token.header || [])
    .map((cell) =>
      String(cell.text ?? '')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[`*_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim())
    .filter(Boolean)
    .slice(0, 3);
  return headers.length ? `Table: ${headers.join(', ')}` : 'Table';
}

/**
 * A `marked` extension that wraps Markdown tables in a horizontally
 * scrollable container.
 *
 * Wide tables are the main source of overflow in prose. The wrapper is a
 * focusable, labelled region so the scroll area is reachable by keyboard
 * without a pointing device (WCAG 2.1.1). `static/js/site.js` removes the tab
 * stop again for tables that turn out to fit, so only genuinely scrollable
 * regions cost a keyboard user a stop.
 */
const responsiveTableExtension = {
  renderer: {
    table(token) {
      const html = baseRenderer.table.call(this, token);
      const label = describeTable(token)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      return `<div class="table-scroll" role="region" aria-label="${label}" tabindex="0">${html}</div>`;
    },
  },
};

module.exports = { responsiveTableExtension, describeTable };

