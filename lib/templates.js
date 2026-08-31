'use strict';

const { marked } = require('marked');
const { STAGES } = require('./offerings');

/**
 * The overview says only whether a stage is represented. Everything finer —
 * declared but empty, deliberately not applicable — is on the offering page.
 */
const REPRESENTATION_LABELS = {
  represented: 'Represented',
  absent: 'Not represented',
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
 * Renders the declared stages as a timeline: the offering's own timing anchor
 * on the rail, a numbered dot and connector in the middle, and the stage card
 * beside it. A stage with no `Timing` gets no anchor rather than an invented
 * one, so the rail only ever shows what the offering itself committed to.
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
      const isMuted = stage.state !== 'active';

      const anchor = stage.anchor
        ? `<div class="timeline-opposite">
          <p class="timeline-anchor timeline-phase-${escapeHtml(stage.anchor.phase)}">${escapeHtml(stage.anchor.label)}</p>
          ${stage.anchor.phaseLabel ? `<p class="timeline-phase">${escapeHtml(stage.anchor.phaseLabel)}</p>` : ''}
        </div>`
        : '';

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
        ${anchor}
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
    .map((stage) => {
      const label = stage.represented
        ? REPRESENTATION_LABELS.represented
        : REPRESENTATION_LABELS.absent;
      return `<li class="stage-badge stage-badge-${stage.represented ? 'represented' : 'absent'}" title="${escapeHtml(`${stage.number}. ${stage.title} — ${label}`)}"><span class="visually-hidden">${escapeHtml(`${stage.title}: ${label}`)}</span><span aria-hidden="true">${stage.number}</span></li>`;
    })
    .join('');

  return `<ul class="stage-badges" aria-label="${escapeHtml(`Stages represented in ${offeringTitle}`)}">${badges}</ul>`;
}

function renderList(values) {
  return values.length ? escapeHtml(values.join(', ')) : '<span class="cell-empty">—</span>';
}

function renderCell(value) {
  return String(value ?? '').trim() ? escapeHtml(value) : '<span class="cell-empty">—</span>';
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Collects the distinct values of one catalog field, in first-seen order, so
 * the browse facets only ever offer filters that match something.
 *
 * @param {object[]} entries
 * @param {(entry: object) => string[]} pick
 * @returns {{ value: string, count: number }[]}
 */
function collectFacetOptions(entries, pick) {
  const counts = new Map();
  for (const entry of entries) {
    for (const raw of pick(entry)) {
      const value = String(raw ?? '').trim();
      if (!value) continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count }));
}

function renderFacet(legend, name, options) {
  if (options.length < 2) {
    return '';
  }

  const items = options
    .map(({ value, count }) => {
      const id = `facet-${name}-${slugify(value)}`;
      return `<li class="facet-option">
        <label class="facet-label" for="${escapeHtml(id)}">
          <input type="checkbox" id="${escapeHtml(id)}" name="${escapeHtml(name)}" value="${escapeHtml(value)}">
          <span class="facet-text">${escapeHtml(value)}</span>
          <span class="facet-count">${count}</span>
        </label>
      </li>`;
    })
    .join('');

  return `<fieldset class="facet">
    <legend>${escapeHtml(legend)}</legend>
    <ul class="facet-options">${items}</ul>
  </fieldset>`;
}

function renderCatalogCard(entry, baseUrl) {
  const statusKey = slugify(entry.status);
  const facts = [
    ['Duration', entry.duration],
    ['Level', entry.level],
    ['Owner', entry.owner],
    ['Updated', entry.updated],
  ].filter(([, value]) => String(value ?? '').trim());

  const factList = facts.length
    ? `<dl class="browse-card-facts">${facts
        .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
        .join('')}</dl>`
    : '';

  const audience = entry.audience.length
    ? `<p class="browse-card-audience"><span>Audience</span>${renderList(entry.audience)}</p>`
    : '';

  const representedStages = entry.stages.filter((stage) => stage.represented);

  const filterData = [
    ['type', entry.type],
    ['level', entry.level],
    ['status', entry.status],
  ]
    .filter(([, value]) => String(value ?? '').trim())
    .map(([key, value]) => ` data-${key}="${escapeHtml(value)}"`)
    .join('');

  const audienceData = entry.audience.length ? ` data-audience="${escapeHtml(entry.audience.join('|'))}"` : '';
  const stageData = representedStages.length
    ? ` data-stage="${escapeHtml(representedStages.map((stage) => stage.title).join('|'))}"`
    : '';
  const searchText = [
    entry.title,
    entry.description,
    entry.type,
    entry.level,
    entry.owner,
    ...entry.audience,
    ...representedStages.map((stage) => stage.title),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return `<article class="browse-card" data-browse-card${filterData}${audienceData}${stageData} data-search="${escapeHtml(searchText)}">
    <div class="browse-card-head">
      ${entry.type ? `<p class="eyebrow">${escapeHtml(entry.type)}</p>` : ''}
      ${
        entry.status
          ? `<span class="status-pill status-${escapeHtml(statusKey)}">${escapeHtml(entry.status)}</span>`
          : ''
      }
    </div>
    <h3 class="browse-card-title">
      <a href="${withBase(baseUrl, entry.urlPath)}">${escapeHtml(entry.title)}</a>
    </h3>
    ${entry.description ? `<p class="browse-card-description">${escapeHtml(entry.description)}</p>` : ''}
    ${factList}
    ${audience}
    <div class="browse-card-stages">
      <p class="browse-card-stages-label">Delivery stages<span>${representedStages.length} of ${STAGES.length}</span></p>
      ${renderStageBadges(entry.stages, entry.title)}
    </div>
  </article>`;
}

/**
 * Renders the catalog as a browse experience — keyword search, facet filters,
 * a live result count, and a responsive card grid — from the parsed offerings,
 * so it can never drift from the offerings it describes.
 *
 * @param {object[]} entries Catalog entries from `toCatalogEntry`.
 * @param {string} baseUrl
 * @returns {string}
 */
function renderCatalog(entries, baseUrl) {
  if (!entries.length) {
    return '<p class="catalog-empty">No offerings have been published yet. Add a folder under <code>content/offerings/</code> to get started.</p>';
  }

  const stageOptions = STAGES.map((stage) => ({
    value: stage.title,
    count: entries.filter((entry) =>
      entry.stages.some((declared) => declared.id === stage.id && declared.represented),
    ).length,
  })).filter((option) => option.count > 0);

  const facets = [
    renderFacet('Type', 'type', collectFacetOptions(entries, (entry) => [entry.type])),
    renderFacet('Level', 'level', collectFacetOptions(entries, (entry) => [entry.level])),
    renderFacet('Audience', 'audience', collectFacetOptions(entries, (entry) => entry.audience)),
    renderFacet('Stage', 'stage', stageOptions),
    renderFacet('Status', 'status', collectFacetOptions(entries, (entry) => [entry.status])),
  ]
    .filter(Boolean)
    .join('');

  const cards = entries.map((entry) => renderCatalogCard(entry, baseUrl)).join('');
  const legend = STAGES.map(
    (stage) =>
      `<li><span class="stage-badge stage-badge-represented" aria-hidden="true">${stage.number}</span>${escapeHtml(stage.title)}</li>`,
  ).join('');

  const filterPanel = facets
    ? `<div class="browse-filters" data-browse-filters hidden>
        <div class="browse-filters-head">
          <h2>Filter</h2>
          <button type="button" class="browse-clear" data-browse-clear>Clear all</button>
        </div>
        ${facets}
      </div>`
    : '';

  return `<div class="browse" data-browse>
    <form class="browse-controls" role="search" data-browse-form hidden>
      <div class="browse-search">
        <label class="visually-hidden" for="browse-search-input">Search offerings</label>
        <span class="browse-search-icon" aria-hidden="true">⌕</span>
        <input type="search" id="browse-search-input" data-browse-search placeholder="Search offerings" autocomplete="off">
      </div>
      ${filterPanel ? '<button type="button" class="browse-filter-toggle" data-browse-filter-toggle aria-expanded="false" aria-controls="browse-filters" hidden>Filter</button>' : ''}
    </form>
    <div class="browse-layout">
      ${filterPanel ? `<aside class="browse-rail" id="browse-filters" aria-label="Filter offerings">${filterPanel}</aside>` : ''}
      <div class="browse-results">
        <p class="browse-count" data-browse-count aria-live="polite">${entries.length} ${entries.length === 1 ? 'offering' : 'offerings'}</p>
        <div class="browse-grid" data-browse-grid>${cards}</div>
        <p class="browse-empty" data-browse-empty hidden>No offerings match the current filters. <button type="button" class="browse-clear" data-browse-clear>Clear all filters</button></p>
        <ul class="stage-legend" aria-label="Stage number key">${legend}</ul>
      </div>
    </div>
  </div>`;
}

/**
 * Renders the framework reference table from the same stage catalog the build
 * validates against, so the documentation cannot drift from the rules. The
 * framework names the stages; each offering sets its own timing anchors, so
 * there is no anchor column here.
 * @returns {string}
 */
function renderFrameworkTable() {
  const rows = STAGES.map(
    (stage) => `<tr>
      <td class="cell-number"><span class="stage-badge stage-badge-represented" aria-hidden="true">${stage.number}</span></td>
      <th scope="row">${escapeHtml(stage.title)}</th>
      <td data-label="Core">${stage.core ? '<span class="stage-flag stage-flag-core">Core</span>' : '<span class="stage-flag">Optional</span>'}</td>
      <td data-label="Purpose">${escapeHtml(stage.summary)}</td>
    </tr>`,
  ).join('');

  return `<div class="framework-scroll">
    <table class="framework-table">
      <caption class="visually-hidden">The stages of the delivery framework</caption>
      <thead>
        <tr>
          <th scope="col"><span class="visually-hidden">Number</span></th>
          <th scope="col">Stage</th>
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
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav" hidden>
        <span class="nav-toggle-glyph" aria-hidden="true"><span></span><span></span><span></span></span>
        <span class="nav-toggle-label">Menu</span>
      </button>
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
      <nav class="footer-links" aria-label="Footer">
        <a href="${withBase(config.baseUrl, '/')}">Home</a>
        <a href="#main-content">Back to top</a>
        ${sourceLink}
      </nav>
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
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(config.brand || config.title)}</p>
        <h1>${escapeHtml(node.title)}</h1>
        ${node.description ? `<p class="lede">${escapeHtml(node.description)}</p>` : ''}
      </div>
      ${renderHeroStats(config.heroStats)}
    </section>
    <div class="page-body"><div class="prose">${contentHtml}</div></div>
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
    <article class="page${isOffering ? ' page-offering' : ''}">
      <header class="page-header">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${escapeHtml(node.title)}</h1>
        ${node.description ? `<p class="lede">${escapeHtml(node.description)}</p>` : ''}
        ${isOffering ? renderOfferingMeta(node) : ''}
      </header>
      <div class="page-body">
        <div class="prose${isOffering || isWide ? ' prose-wide' : ''}">${contentHtml}</div>
      </div>
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
        var root = document.documentElement;
        var key = root.dataset.themeStorageKey;
        var theme = 'light';
        try {
          theme = localStorage.getItem(key) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        } catch (error) {}
        root.dataset.theme = theme === 'dark' ? 'dark' : 'light';
        root.dataset.js = 'true';
      })();
    </script>
    <link rel="stylesheet" href="${withBase(config.baseUrl, '/css/styles.css')}">
    <script defer src="${withBase(config.baseUrl, '/js/theme.js')}"></script>
    <script defer src="${withBase(config.baseUrl, '/js/site.js')}"></script>
  </head>
  <body>
    <div class="page-shell">
      ${renderHeader(config)}
      <div class="content-shell">
        <aside class="sidebar" id="site-nav" aria-label="Site navigation">
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
  renderCatalog,
  renderFrameworkTable,
};
