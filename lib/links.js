'use strict';

const path = require('path');

/**
 * Markdown in an offering README is read in two places: rendered on this site,
 * and rendered by GitHub straight from the repository. Authors therefore write
 * ordinary repository-relative links (`./assets/deck.pptx`, `./guide.md`).
 *
 * This module rewrites those links at build time to the URL the generated site
 * actually serves, so one link works in both places. Links are only rewritten
 * when the target exists under `content/`, which keeps typos visible instead of
 * turning them into plausible-looking URLs.
 */

let context = null;

/**
 * Sets the source file the next Markdown render belongs to. Rendering is
 * synchronous, so a single module-level context is enough and avoids threading
 * options through every nested `marked` call.
 *
 * @param {{sourceDir: string, baseUrl: string, files: Set<string>}|null} next
 */
function setLinkContext(next) {
  context = next;
}

function splitSuffix(href) {
  const index = href.search(/[#?]/);
  if (index === -1) {
    return [href, ''];
  }
  return [href.slice(0, index), href.slice(index)];
}

/**
 * Maps a content-relative file path to the URL path the generator publishes it
 * at: `README.md` becomes its folder, another `*.md` file becomes its own
 * folder, and anything else is copied through verbatim.
 *
 * @param {string} relativePath Posix path relative to `content/`.
 * @returns {string}
 */
function toUrlPath(relativePath) {
  if (!relativePath.toLowerCase().endsWith('.md')) {
    return `/${relativePath}`;
  }

  const dir = path.posix.dirname(relativePath);
  const base = path.posix.basename(relativePath);
  const prefix = dir === '.' ? '' : `/${dir}`;

  if (base === 'README.md') {
    return `${prefix}/`;
  }

  return `${prefix}/${base.slice(0, -3)}/`;
}

/**
 * Resolves one Markdown link against the current source file.
 * @param {string} href
 * @returns {string}
 */
function resolveContentLink(href) {
  const raw = String(href ?? '');

  if (!context || !raw) {
    return raw;
  }

  // Absolute URLs, protocol-relative URLs, root-relative paths, and pure
  // fragments are already what the author intended.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//') || raw.startsWith('/') || raw.startsWith('#')) {
    return raw;
  }

  const [target, suffix] = splitSuffix(raw);
  if (!target) {
    return raw;
  }

  const resolved = path.posix.normalize(path.posix.join(context.sourceDir, decodeURIComponent(target)));
  if (resolved.startsWith('..')) {
    return raw;
  }

  if (!context.files.has(resolved)) {
    return raw;
  }

  const base = (context.baseUrl || '/').replace(/\/+$/, '');
  return `${base}${toUrlPath(resolved)}${suffix}`;
}

/**
 * A `marked` extension that rewrites relative link and image targets.
 */
const contentLinkExtension = {
  walkTokens(token) {
    if (token.type === 'link' || token.type === 'image') {
      token.href = resolveContentLink(token.href);
    }
  },
};

module.exports = { setLinkContext, resolveContentLink, toUrlPath, contentLinkExtension };
