'use strict';

const { Renderer } = require('marked');

const baseRenderer = new Renderer();

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
      return `<div class="table-scroll" role="region" aria-label="Table" tabindex="0">${html}</div>`;
    },
  },
};

module.exports = { responsiveTableExtension };
