'use strict';

/**
 * Strips one layer of matching single or double quotes from a scalar.
 * @param {string} value
 * @returns {string}
 */
function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
    (value.startsWith("'") && value.endsWith("'") && value.length > 1)
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Splits a YAML flow sequence body (the text between `[` and `]`) on commas
 * that sit outside quotes, so quoted items may themselves contain commas.
 * @param {string} inner
 * @returns {string[]}
 */
function splitFlowSequence(inner) {
  const items = [];
  let current = '';
  let quote = null;

  for (const char of inner) {
    if (quote) {
      if (char === quote) {
        quote = null;
      }
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ',') {
      items.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  items.push(current);

  return items.map((item) => unquote(item.trim())).filter((item) => item !== '');
}

/**
 * Parses a very small subset of YAML front matter: a leading `---` block
 * containing flat `key: value` pairs, followed by the Markdown body. Values
 * written as a YAML flow sequence (`key: [one, two]`) become string arrays,
 * which keeps multi-value fields such as `audience` and `tags` valid YAML for
 * anything else that reads the front matter.
 *
 * This intentionally avoids a YAML dependency since front matter in this
 * template only ever needs simple string, number, and list values.
 *
 * @param {string} raw Full contents of a Markdown file.
 * @returns {{data: Record<string, string|number|string[]>, body: string}}
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

    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = splitFlowSequence(value.slice(1, -1));
      continue;
    }

    value = unquote(value);
    if (key === 'weight' && value !== '' && !Number.isNaN(Number(value))) {
      data[key] = Number(value);
    } else {
      data[key] = value;
    }
  }

  return { data, body: match[2] };
}

module.exports = { parseFrontMatter };
