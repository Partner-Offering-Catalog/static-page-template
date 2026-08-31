#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { buildContentTree, flattenTree } = require('./lib/content-tree');
const { renderPage, renderOffering, renderCatalog, renderFrameworkTable } = require('./lib/templates');
const { parseOffering, toCatalogEntry, isTemplateEntry } = require('./lib/offerings');
const { setLinkContext, contentLinkExtension } = require('./lib/links');
const { responsiveTableExtension } = require('./lib/tables');

const ROOT_DIR = __dirname;
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const STATIC_DIR = path.join(ROOT_DIR, 'static');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public');
const CONFIG_PATH = path.join(ROOT_DIR, 'site.config.json');

const OFFERINGS_URL_PATH = '/offerings/';
const CATALOG_MARKER = '<!-- offering-catalog -->';
const FRAMEWORK_MARKER = '<!-- framework-stages -->';

marked.setOptions({ gfm: true, breaks: false });
marked.use(contentLinkExtension);
marked.use(responsiveTableExtension);

/**
 * Lists every file under `content/` as a posix path relative to that folder,
 * so relative Markdown links can be resolved against real files only.
 * @param {string} dir
 * @param {string} [prefix]
 * @returns {Set<string>}
 */
function listContentFiles(dir, prefix = '') {
  const files = new Set();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      for (const nested of listContentFiles(path.join(dir, entry.name), relative)) {
        files.add(nested);
      }
    } else if (entry.isFile()) {
      files.add(relative);
    }
  }
  return files;
}

/**
 * Normalizes a deployment base path into a leading-slash, no-trailing-slash
 * prefix (`/` becomes an empty prefix). GitHub Pages project sites are served
 * from `/<repository>/`, so the base path must be prepended to every generated
 * URL for that deployment.
 * @param {string} value
 * @returns {string}
 */
function normalizeBaseUrl(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function loadConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const baseUrl = process.env.BASE_URL ?? config.baseUrl;
  return { ...config, baseUrl: normalizeBaseUrl(baseUrl) };
}

function copyRecursive(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

/**
 * Copies every non-Markdown file under `content/` to the matching output
 * folder, so an offering can keep its decks, checklists, and images next to
 * the README that links to them.
 * @param {string} source
 * @param {string} destination
 */
function copyContentAssets(source, destination) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyContentAssets(from, to);
      continue;
    }
    if (entry.isFile() && !entry.name.toLowerCase().endsWith('.md')) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

/**
 * Finds a node by its URL path.
 * @param {object} root
 * @param {string} urlPath
 * @returns {object|null}
 */
function findNode(root, urlPath) {
  if (root.urlPath === urlPath) {
    return root;
  }
  for (const child of root.children) {
    const match = findNode(child, urlPath);
    if (match) {
      return match;
    }
  }
  return null;
}

/**
 * Parses every offering folder under `content/offerings/` against the shared
 * delivery framework, failing the build with all validation errors at once so
 * an author can fix them in a single pass.
 *
 * @param {object} root
 * @returns {{byUrlPath: Map<string, object>, entries: object[], templates: object[]}}
 */
function collectOfferings(root) {
  const offeringsNode = findNode(root, OFFERINGS_URL_PATH);
  const byUrlPath = new Map();
  const entries = [];
  const templates = [];

  if (!offeringsNode) {
    return { byUrlPath, entries, templates };
  }

  const errors = [];
  for (const child of offeringsNode.children) {
    if (child.type !== 'folder') {
      continue;
    }

    const offering = parseOffering(child.body, { source: `content/${child.contentPath}` });
    errors.push(...offering.errors);
    byUrlPath.set(child.urlPath, offering);

    const entry = toCatalogEntry(child, offering);
    if (isTemplateEntry(entry)) {
      templates.push(entry);
    } else {
      entries.push(entry);
    }
  }

  if (errors.length) {
    throw new Error(
      `Offering validation failed:\n  - ${errors.join('\n  - ')}`,
    );
  }

  return { byUrlPath, entries, templates };
}

function build() {
  const config = loadConfig();

  if (!fs.existsSync(path.join(CONTENT_DIR, 'README.md'))) {
    throw new Error(
      'content/README.md is required as the site home page. The repository using this template provides the content/ folder.',
    );
  }

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (fs.existsSync(STATIC_DIR)) {
    copyRecursive(STATIC_DIR, OUTPUT_DIR);
  }

  const root = buildContentTree(CONTENT_DIR);
  const pages = flattenTree(root);
  const seenUrlPaths = new Set();
  for (const { node } of pages) {
    if (seenUrlPaths.has(node.urlPath)) {
      throw new Error(`Multiple content entries resolve to ${node.urlPath}`);
    }
    seenUrlPaths.add(node.urlPath);
  }

  const offerings = collectOfferings(root);
  const catalogHtml = renderCatalog(offerings.entries, config.baseUrl);
  const frameworkHtml = renderFrameworkTable();
  const contentFiles = listContentFiles(CONTENT_DIR);

  for (const { node, ancestors } of pages) {
    const offering = offerings.byUrlPath.get(node.urlPath);
    const isCatalog = node.urlPath === OFFERINGS_URL_PATH;

    setLinkContext({
      sourceDir: path.posix.dirname(node.contentPath),
      baseUrl: config.baseUrl,
      files: contentFiles,
    });

    let contentHtml = offering ? renderOffering(offering) : marked.parse(node.body);

    setLinkContext(null);

    if (contentHtml.includes(FRAMEWORK_MARKER)) {
      contentHtml = contentHtml.split(FRAMEWORK_MARKER).join(frameworkHtml);
    }

    if (isCatalog) {
      contentHtml = contentHtml.includes(CATALOG_MARKER)
        ? contentHtml.split(CATALOG_MARKER).join(catalogHtml)
        : `${contentHtml}${catalogHtml}`;
    }

    const html = renderPage({
      config,
      root,
      node,
      ancestors,
      contentHtml,
      isOffering: Boolean(offering),
      isWide: isCatalog,
    });

    const outFile = path.join(OUTPUT_DIR, node.outFile);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
  }

  copyContentAssets(CONTENT_DIR, OUTPUT_DIR);

  const offeringCount = offerings.entries.length + offerings.templates.length;
  console.log(
    `Built ${pages.length} page(s) into ${path.relative(ROOT_DIR, OUTPUT_DIR)}/` +
      (offeringCount ? `, including ${offerings.entries.length} offering(s) and ${offerings.templates.length} template(s).` : '.'),
  );
}

build();
