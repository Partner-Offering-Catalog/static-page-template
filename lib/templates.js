'use strict';

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

function renderPage({ config, root, node, parent, ancestors, contentHtml }) {
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
    const eyebrow = node.type === 'folder' ? 'Section' : 'Documentation';
    mainHtml = `${renderBreadcrumbs(ancestors, node, config.baseUrl)}
    <article class="content-card">
      <header class="content-header">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${escapeHtml(node.title)}</h1>
        ${node.description ? `<p class="lede">${escapeHtml(node.description)}</p>` : ''}
      </header>
      <div class="prose">${contentHtml}</div>
    </article>
    ${node.type === 'folder' ? renderChildCards(node.children, config.baseUrl) : ''}`;
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

module.exports = { renderPage, withBase };
