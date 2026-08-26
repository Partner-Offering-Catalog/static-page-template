#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { buildContentTree, flattenTree } = require('./lib/content-tree');
const { renderPage } = require('./lib/templates');

const ROOT_DIR = __dirname;
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const STATIC_DIR = path.join(ROOT_DIR, 'static');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public');
const CONFIG_PATH = path.join(ROOT_DIR, 'site.config.json');

marked.setOptions({ gfm: true, breaks: false });

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

function build() {
  const config = loadConfig();

  if (!fs.existsSync(path.join(CONTENT_DIR, 'README.md'))) {
    throw new Error('content/README.md is required as the site home page.');
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

  for (const { node, ancestors } of pages) {
    const contentHtml = marked.parse(node.body);
    const html = renderPage({
      config,
      root,
      node,
      ancestors,
      contentHtml,
    });

    const outFile = path.join(OUTPUT_DIR, node.outFile);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
  }

  console.log(`Built ${pages.length} page(s) into ${path.relative(ROOT_DIR, OUTPUT_DIR)}/`);
}

build();
