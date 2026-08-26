'use strict';

const fs = require('fs');
const path = require('path');
const { parseFrontMatter } = require('./front-matter');

const DEFAULT_WEIGHT = 999;

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Recursively builds a navigation/content tree from a folder of Markdown
 * files. Every folder is a navigation entry whose `README.md` is always the
 * page shown when that entry is selected; any other `*.md` file in the same
 * folder becomes a regular leaf page.
 *
 * @param {string} contentDir Absolute path to the content root.
 * @returns {object} The root node of the content tree.
 */
function buildContentTree(contentDir) {
  return scanFolder(contentDir, contentDir, '/');
}

function scanFolder(contentRoot, dirPath, urlPath) {
  const readmePath = path.join(dirPath, 'README.md');
  if (!fs.existsSync(readmePath)) {
    return null;
  }

  const { data, body } = parseFrontMatter(fs.readFileSync(readmePath, 'utf8'));
  const slug = path.basename(dirPath);
  const node = {
    type: 'folder',
    title: data.title || titleFromSlug(slug) || 'Home',
    description: data.description || '',
    weight: typeof data.weight === 'number' ? data.weight : DEFAULT_WEIGHT,
    body,
    urlPath,
    outFile: path.join(urlPath, 'index.html'),
    children: [],
  };

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    if (entry.isDirectory()) {
      const childUrlPath = `${urlPath}${entry.name}/`;
      const child = scanFolder(contentRoot, path.join(dirPath, entry.name), childUrlPath);
      if (child) {
        node.children.push(child);
      }
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md') && entry.name !== 'README.md') {
      const pageSlug = entry.name.slice(0, -3);
      const pageUrlPath = `${urlPath}${pageSlug}/`;
      const { data: pageData, body: pageBody } = parseFrontMatter(
        fs.readFileSync(path.join(dirPath, entry.name), 'utf8'),
      );
      node.children.push({
        type: 'page',
        title: pageData.title || titleFromSlug(pageSlug),
        description: pageData.description || '',
        weight: typeof pageData.weight === 'number' ? pageData.weight : DEFAULT_WEIGHT,
        body: pageBody,
        urlPath: pageUrlPath,
        outFile: path.join(pageUrlPath, 'index.html'),
        children: [],
      });
    }
  }

  node.children.sort((a, b) => a.weight - b.weight || a.title.localeCompare(b.title));

  return node;
}

/**
 * Flattens the tree (depth-first) into a list of every page, including the
 * root, so the generator can render each one in turn.
 *
 * @param {object} root
 * @returns {object[]}
 */
function flattenTree(root) {
  const pages = [];
  const visit = (node, parent, ancestors) => {
    pages.push({ node, parent, ancestors });
    const childAncestors = ancestors.concat(node);
    for (const child of node.children) {
      visit(child, node, childAncestors);
    }
  };
  visit(root, null, []);
  return pages;
}

module.exports = { buildContentTree, flattenTree };
