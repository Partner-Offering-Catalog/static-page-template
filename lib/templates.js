'use strict';

const { marked } = require('marked');
const { STAGES } = require('./offerings');

const STATE_LABELS = {
  active: 'Covered',
  'not-applicable': 'Not applicable',
  empty: 'No content captured yet',
  absent: 'Not declared',
};

/**
 * Escapes text for safe interpolation into HTML.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

/**
 * Joins a configured base URL with a root-relative path produced by the
 * content tree (e.g. `/getting-started/overview/`).
 * @param {string} baseUrl
 * @param {string} urlPath
 * @returns {string}
 */
function withBase(baseUrl, urlPath) {
  const base = (baseUrl || '/').replace(/\/+$/, '');
  return `${base}${urlPath}` || '/';
}

function renderMarkdown(markdown) {
  const source = String(markdown ?? '').trim();
  return source ? marked.parse(source) : '';
}

function renderInlineMarkdown(markdown) {
  const source = String(markdown ?? '').trim();
  return source ? marked.parseInline(source) : '';
}

function renderResources(resources, notes) {
  const items = resources
    .map((resource) => {
      const audience = resource.audience
        ? `<span class="resource-audience${resource.audienceKey ? ` audience-${resource.audienceKey}` : ''}">${escapeHtml(resource.audience)}</span>`
        : '';
      const type = resource.type
        ? `<span class="resource-type">${escapeHtml(resource.type)}</span>`
        : '';
      const link = resource.link
        ? `<p class="resource-link">${renderInlineMarkdown(resource.link)}</p>`
        : '';
      return `<li class="resource">
        <p class="resource-name">${renderInlineMarkdown(resource.name)}</p>
        ${type || audience ? `<p class="resource-tags">${type}${audience}</p>` : ''}
        ${link}
      </li>`;
    })
    .join('');

  const list = items ? `<ul class="resource-list">${items}</ul>` : '';
  return `${list}${renderMarkdown(notes)}`;
}

function renderStageSections(sections) {
  if (!sections.length) {
    return '';
  }

  const blocks = sections
    .map((section) => {
      const slug = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const content =
        section.title === 'Resources'
          ? renderResources(section.resources, section.markdown)
          : renderMarkdown(section.markdown);
      return `<section class="stage-section stage-section-${slug}">
        <h4>${escapeHtml(section.title)}</h4>
        ${content}
      </section>`;
    })
    .join('');

  return `<div class="stage-sections">${blocks}</div>`;
}

/**
 * Renders the declared stages as a timeline: the timing anchor on the rail,
 * a numbered dot and connector in the middle, and the stage card beside it.
 *
 * @param {object[]} stages Stages returned by `parseOffering`.
 * @returns {string}
 */
function renderTimeline(stages) {
  if (!stages.length) {
    return '';
  }

  const items = stages
    .map((stage, index) => {
      const isLast = index === stages.length - 1;
      const anchorLabel = stage.anchor ? stage.anchor.label : stage.defaultAnchor;
      const anchorClass = stage.anchor ? ` timeline-phase-${stage.anchor.phase}` : '';
      const phaseLabel = stage.anchor ? stage.anchor.phaseLabel : '';
      const isMuted = stage.state !== 'active';

      const flags = [
        `<span class="stage-flag${stage.core ? ' stage-flag-core' : ''}">${stage.core ? 'Core' : 'Optional'}</span>`,
      ];
      if (stage.state === 'not-applicable') {
        flags.push('<span class="stage-flag stage-flag-muted">Not applicable</span>');
      }

      const owner = stage.owner
        ? `<p class="stage-owner"><span>Owner</span>${renderInlineMarkdown(stage.owner)}</p>`
        : '';

      let bodyHtml;
      if (stage.state === 'not-applicable') {
        const reason = stage.statusNote.replace(/^not applicable[\s.:—-]*/i, '').trim();
        bodyHtml = `<p class="stage-empty">This offering does not use this stage${reason ? `: ${escapeHtml(reason)}` : '.'}</p>`;
      } else if (stage.state === 'empty') {
        bodyHtml = '<p class="stage-empty">Declared, but no content has been captured yet.</p>';
      } else {
        bodyHtml = `${stage.purpose ? `<p class="stage-purpose">${renderInlineMarkdown(stage.purpose)}</p>` : ''}
        ${renderMarkdown(stage.lede)}
        ${renderStageSections(stage.sectionList)}`;
      }

      return `<li class="timeline-item${isMuted ? ' is-muted' : ''}" value="${stage.number}" id="stage-${escapeHtml(stage.id)}">
        <div class="timeline-opposite">
          <p class="timeline-anchor${anchorClass}">${escapeHtml(anchorLabel)}</p>
          ${phaseLabel ? `<p class="timeline-phase">${escapeHtml(phaseLabel)}</p>` : ''}
        </div>
        <div class="timeline-separator" aria-hidden="true">
          <span class="timeline-dot">${stage.number}</span>
          ${isLast ? '' : '<span class="timeline-connector"></span>'}
        </div>
        <div class="timeline-content">
          <article class="timeline-card">
            <header class="stage-header">
              <h3>${escapeHtml(stage.title)}</h3>
              <p class="stage-flags">${flags.join('')}</p>
            </header>
            ${owner}
            ${bodyHtml}
          </article>
        </div>
      </li>`;
    })
    .join('');

  return `<ol class="timeline">${items}</ol>`;
}

/**
 * Renders one offering page: intro prose, the timeline, then any trailing
 * sections, in the order the author wrote them.
 *
 * @param {object} offering Parsed offering.
 * @returns {string}
 */
function renderOffering(offering) {
  const timeline = offering.stages.length
    ? `<section class="timeline-wrap" aria-labelledby="delivery-framework-heading">
        <div class="section-heading">
          <p class="eyebrow">Delivery framework</p>
          <h2 id="delivery-framework-heading">Stage by stage</h2>
        </div>
        ${renderMarkdown(offering.frameworkIntro)}
        ${renderTimeline(offering.stages)}
      </section>`
    : renderMarkdown(offering.frameworkIntro);

  return `${renderMarkdown(offering.intro)}${timeline}${renderMarkdown(offering.outro)}`;
}

function renderStageBadges(stages, offeringTitle) {
  const badges = stages
    .map(
      (stage) =>
        `<li class="stage-badge stage-badge-${stage.state}" title="${escapeHtml(`${stage.number}. ${stage.title} — ${STATE_LABELS[stage.state]}`)}"><span class="visually-hidden">${escapeHtml(`${stage.title}: ${STATE_LABELS[stage.state]}`)}</span><span aria-hidden="true">${stage.number}</span></li>`,
    )
    .join('');

  return `<ul class="stage-badges" aria-label="${escapeHtml(`Stages covered by ${offeringTitle}`)}">${badges}</ul>`;
}

function renderList(values) {
  return values.length ? escapeHtml(values.join(', ')) : '<span class="cell-empty">—</span>';
}

function renderCell(value) {
  return String(value ?? '').trim() ? escapeHtml(value) : '<span class="cell-empty">—</span>';
}

/**
 * Renders the catalog overview table from the parsed offerings, so the table
 * can never drift from the offerings it describes.
 *
 * @param {object[]} entries Catalog entries from `toCatalogEntry`.
 * @param {string} baseUrl
 * @returns {string}
 */
function renderCatalogTable(entries, baseUrl) {
  if (!entries.length) {
    return '<p class="catalog-empty">No offerings have been published yet. Add a folder under <code>content/offerings/</code> to get started.</p>';
  }

  const rows = entries
    .map((entry) => {
      const statusKey = entry.status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `<tr>
        <th scope="row">
          <a href="${withBase(baseUrl, entry.urlPath)}">${escapeHtml(entry.title)}</a>
          ${entry.description ? `<small>${escapeHtml(entry.description)}</small>` : ''}
        </th>
        <td>${renderCell(entry.type)}</td>
        <td>${renderList(entry.audience)}</td>
        <td>${renderCell(entry.duration)}</td>
        <td>${renderCell(entry.level)}</td>
        <td class="cell-stages">${renderStageBadges(entry.stages, entry.title)}</td>
        <td>${renderCell(entry.owner)}</td>
        <td>${entry.status ? `<span class="status-pill status-${escapeHtml(statusKey)}">${escapeHtml(entry.status)}</span>` : '<span class="cell-empty">—</span>'}</td>
        <td>${renderCell(entry.updated)}</td>
      </tr>`;
    })
    .join('');

  const legend = STAGES.map(
    (stage) =>
      `<li><span class="stage-badge stage-badge-active" aria-hidden="true">${stage.number}</span>${escapeHtml(stage.shortTitle)}</li>`,
  ).join('');

  return `<div class="catalog">
    <div class="table-scroll" tabindex="0" role="region" aria-label="Offering catalog table">
      <table class="catalog-table">
        <caption class="visually-hidden">Offerings in this catalog, with the delivery stages each one covers</caption>
        <thead>
          <tr>
            <th scope="col">Offering</th>
            <th scope="col">Type</th>
            <th scope="col">Audience</th>
            <th scope="col">Duration</th>
            <th scope="col">Level</th>
            <th scope="col">Stages</th>
            <th scope="col">Owner</th>
            <th scope="col">Status</th>
            <th scope="col">Updated</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <ul class="stage-legend" aria-label="Stage number key">${legend}</ul>
  </div>`;
}

/**
 * Renders the framework reference table from the same stage catalog the build
 * validates against, so the documentation cannot drift from the rules.
 * @returns {string}
 */
function renderFrameworkTable() {
  const rows = STAGES.map(
    (stage) => `<tr>
      <td class="cell-number"><span class="stage-badge stage-badge-active" aria-hidden="true">${stage.number}</span></td>
      <th scope="row">${escapeHtml(stage.title)}</th>
      <td><code>${escapeHtml(stage.defaultAnchor)}</code></td>
      <td>${stage.core ? '<span class="stage-flag stage-flag-core">Core</span>' : '<span class="stage-flag">Optional</span>'}</td>
      <td>${escapeHtml(stage.summary)}</td>
    </tr>`,
  ).join('');

  return `<div class="table-scroll" tabindex="0" role="region" aria-label="Delivery framework stages">
    <table class="framework-table">
      <caption class="visually-hidden">The stages of the delivery framework</caption>
      <thead>
        <tr>
          <th scope="col"><span class="visually-hidden">Number</span></th>
          <th scope="col">Stage</th>
          <th scope="col">Default anchor</th>
          <th scope="col">Core</th>
          <th scope="col">Purpose</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderOfferingMeta(node) {
  const data = node.data || {};
  const toText = (value) => (Array.isArray(value) ? value.join(', ') : String(value ?? '').trim());
  const facts = [
    ['Type', toText(data.type)],
    ['Audience', toText(data.audience)],
    ['Duration', toText(data.duration)],
    ['Level', toText(data.level)],
    ['Owner', toText(data.owner)],
    ['Status', toText(data.status)],
    ['Updated', toText(data.updated)],
  ].filter(([, value]) => value);

  const tags = Array.isArray(data.tags) ? data.tags : [];

  if (!facts.length && !tags.length) {
    return '';
  }

  const items = facts
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join('');
  const tagList = tags.length
    ? `<ul class="offering-tags" aria-label="Tags">${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>`
    : '';

  return `${items ? `<dl class="offering-meta">${items}</dl>` : ''}${tagList}`;
}

function renderNavTree(nodes, currentUrlPath, baseUrl) {
  if (!nodes.length) {
    return '';
  }

  const items = nodes
    .map((node) => {
      const isCurrent = node.urlPath === currentUrlPath;
      const isAncestor = !isCurrent && currentUrlPath.startsWith(node.urlPath);
      const hasChildren = node.children.length > 0;
      const classes = [];
      if (hasChildren) classes.push('has-children');
      if (isCurrent) classes.push('is-current');
      if (isAncestor) classes.push('is-ancestor');
      const liClass = classes.length ? ` class="${classes.join(' ')}"` : '';
      const link = `<a href="${withBase(baseUrl, node.urlPath)}"${isCurrent ? ' aria-current="page"' : ''}><span>${escapeHtml(node.title)}</span></a>`;

      if (!hasChildren) {
        return `<li${liClass}>${link}</li>`;
      }

      const open = isCurrent || isAncestor ? ' open' : '';
      const childList = renderNavTree(node.children, currentUrlPath, baseUrl);
      return `<li${liClass}><details${open}><summary>${link}</summary>${childList}</details></li>`;
    })
    .join('');

  return `<ul class="nav-tree">${items}</ul>`;
}

function renderBreadcrumbs(ancestors, node, baseUrl) {
  if (!ancestors.length) {
    return '';
  }

  const trail = ancestors
    .filter((ancestor) => ancestor.urlPath !== '/')
    .map(
      (ancestor) =>
        `<span aria-hidden="true">/</span><a href="${withBase(baseUrl, ancestor.urlPath)}">${escapeHtml(ancestor.title)}</a>`,
    )
    .join('');

  return `<nav class="breadcrumbs" aria-label="Breadcrumb">
    <a href="${withBase(baseUrl, '/')}">Home</a>${trail}<span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(node.title)}</span>
  </nav>`;
}

function renderChildCards(children, baseUrl) {
  if (!children.length) {
    return '';
  }

  const cards = children
    .map(
      (child) => `<a class="page-card" href="${withBase(baseUrl, child.urlPath)}">
        <span>${child.type === 'folder' ? 'Folder' : 'Page'}</span>
        <strong>${escapeHtml(child.title)}</strong>
        ${child.description ? `<small>${escapeHtml(child.description)}</small>` : ''}
      </a>`,
    )
    .join('');

  return `<section class="section-grid" aria-labelledby="section-pages-heading">
    <div class="section-heading">
      <p class="eyebrow">In this section</p>
      <h2 id="section-pages-heading">Explore pages</h2>
    </div>
    <div class="card-grid">${cards}</div>
  </section>`;
}

function renderHeroStats(heroStats) {
  if (!heroStats || !heroStats.length) {
    return '';
  }

  const cards = heroStats
    .map(
      (stat, index) => `<div class="summary-card${index === 0 ? ' summary-card-primary' : ''}">
        <span>${escapeHtml(stat.label)}</span>
        <strong>${escapeHtml(stat.value)}</strong>
        <small>${escapeHtml(stat.caption)}</small>
      </div>`,
    )
    .join('');

  return `<div class="hero-summary" aria-label="Site highlights">${cards}</div>`;
}

function renderHeader(config) {
  const sourceLink = config.repositoryUrl
    ? `<a class="source-button" href="${escapeHtml(config.repositoryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(config.repositoryLabel || 'Source')}</a>`
    : '';

  return `<header class="topbar">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <div class="topbar-inner">
      <a class="brand" href="${withBase(config.baseUrl, '/')}" aria-label="${escapeHtml(config.brand || config.title)}, back to home">
        <span class="ms-logo" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
        <span class="brand-copy">
          <strong>${escapeHtml(config.brand || config.title)}</strong>
          <small>${escapeHtml(config.description)}</small>
        </span>
      </a>
      <div class="topbar-actions">
        ${sourceLink}
        <button class="theme-toggle" type="button" aria-label="Toggle color theme" data-theme-toggle>
          <span aria-hidden="true">◐</span>
        </button>
      </div>
    </div>
  </header>`;
}

function renderFooter(config) {
  const sourceLink = config.repositoryUrl
    ? `<a href="${escapeHtml(config.repositoryUrl)}" rel="noopener noreferrer" target="_blank">${escapeHtml(config.repositoryLabel || 'Source')}</a>`
    : '';

  return `<footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="ms-logo" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
        <span>
          <strong>${escapeHtml(config.brand || config.title)}</strong>
          <small>${escapeHtml(config.footerNote)}</small>
        </span>
      </div>
      ${sourceLink}
    </div>
  </footer>`;
}

function renderSidebar(root, currentUrlPath, baseUrl) {
  return `<div class="sidebar-inner">
    <div class="sidebar-heading">
      <p class="eyebrow">Navigation</p>
      <h2>Contents</h2>
    </div>
    ${renderNavTree(root.children, currentUrlPath, baseUrl)}
  </div>`;
}

function renderPage({ config, root, node, parent, ancestors, contentHtml, isOffering, isWide }) {
  const isHome = node.urlPath === '/';
  const pageTitle = isHome ? config.title : `${node.title} | ${config.title}`;

  let mainHtml;
  if (isHome) {
    mainHtml = `<section class="hero" id="top">
      <div class="hero-grid" aria-hidden="true"></div>
      <div class="hero-orb hero-orb-one" aria-hidden="true"></div>
      <div class="hero-orb hero-orb-two" aria-hidden="true"></div>
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(config.brand || config.title)}</p>
        <h1>${escapeHtml(node.title)}</h1>
        ${node.description ? `<p>${escapeHtml(node.description)}</p>` : ''}
      </div>
      ${renderHeroStats(config.heroStats)}
    </section>
    <article class="content-card"><div class="prose">${contentHtml}</div></article>
    ${
      node.children.length
        ? `<section class="section-grid" aria-labelledby="site-sections-heading">
          <div class="section-heading">
            <p class="eyebrow">Folder structure</p>
            <h2 id="site-sections-heading">Browse the site</h2>
          </div>
          <div class="card-grid">${node.children
            .map(
              (child) => `<a class="page-card" href="${withBase(config.baseUrl, child.urlPath)}">
                <span>${child.type === 'folder' ? 'Folder' : 'Page'}</span>
                <strong>${escapeHtml(child.title)}</strong>
                ${child.description ? `<small>${escapeHtml(child.description)}</small>` : ''}
              </a>`,
            )
            .join('')}</div>
        </section>`
        : ''
    }`;
  } else {
    const eyebrow = isOffering ? 'Offering' : node.type === 'folder' ? 'Section' : 'Documentation';
    mainHtml = `${renderBreadcrumbs(ancestors, node, config.baseUrl)}
    <article class="content-card${isOffering ? ' offering-card' : ''}">
      <header class="content-header">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${escapeHtml(node.title)}</h1>
        ${node.description ? `<p class="lede">${escapeHtml(node.description)}</p>` : ''}
        ${isOffering ? renderOfferingMeta(node) : ''}
      </header>
      <div class="prose${isOffering || isWide ? ' prose-wide' : ''}">${contentHtml}</div>
    </article>
    ${node.type === 'folder' && !isOffering ? renderChildCards(node.children, config.baseUrl) : ''}`;
  }

  return `<!doctype html>
<html lang="${escapeHtml(config.languageCode || 'en')}" data-theme-storage-key="static-page-template-theme">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(node.description || config.description)}">
    <title>${escapeHtml(pageTitle)}</title>
    <script>
      (function () {
        var key = document.documentElement.dataset.themeStorageKey;
        var theme = 'light';
        try {
          theme = localStorage.getItem(key) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        } catch (error) {}
        document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
      })();
    </script>
    <link rel="stylesheet" href="${withBase(config.baseUrl, '/css/styles.css')}">
    <script defer src="${withBase(config.baseUrl, '/js/theme.js')}"></script>
  </head>
  <body>
    <div class="page-shell">
      ${renderHeader(config)}
      <div class="content-shell">
        <aside class="sidebar" aria-label="Repository navigation">
          ${renderSidebar(root, node.urlPath, config.baseUrl)}
        </aside>
        <main id="main-content" class="main-content">
          ${mainHtml}
        </main>
      </div>
      ${renderFooter(config)}
    </div>
  </body>
</html>
`;
}

module.exports = {
  renderPage,
  withBase,
  renderTimeline,
  renderOffering,
  renderCatalogTable,
  renderFrameworkTable,
};
