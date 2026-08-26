'use strict';

/**
 * Parses a very small subset of YAML front matter: a leading `---` block
 * containing flat `key: value` pairs, followed by the Markdown body.
 * This intentionally avoids a YAML dependency since front matter in this
 * template only ever needs simple string/number values.
 *
 * @param {string} raw Full contents of a Markdown file.
 * @returns {{data: Record<string, string|number>, body: string}}
 */
function parseFrontMatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    return { data: {}, body: raw };
  }

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === 'weight' && value !== '' && !Number.isNaN(Number(value))) {
      data[key] = Number(value);
    } else {
      data[key] = value;
    }
  }

  return { data, body: match[2] };
}

module.exports = { parseFrontMatter };
