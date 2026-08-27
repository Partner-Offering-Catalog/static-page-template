#!/usr/bin/env node
/**
 * validate-offering.mjs — deterministic structure check for offering pages.
 *
 * Zero dependencies, Node 18+. Every finding carries a stable rule id, so the
 * output is a contract an agent can act on rather than prose it has to read.
 *
 *   node validate-offering.mjs <file-or-dir> [...]   validate paths
 *   node validate-offering.mjs --dir content/offerings
 *   node validate-offering.mjs --json               machine-readable output
 *   node validate-offering.mjs --strict             warnings fail too
 *   node validate-offering.mjs --rules              print the rule catalog
 *
 * Exit codes: 0 clean, 1 findings that fail the gate, 2 usage or IO error.
 *
 * The structural rules mirror the site generator exactly. The completeness
 * rules are deliberately stricter: the generator renders a half-finished
 * offering without complaint, and this script is the gate that stops one from
 * being published.
 */

import fs from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = 1;

/** The delivery framework spine. Order here is the order stages must appear in. */
export const STAGES = [
  { id: 'discover-and-qualify', number: 1, title: 'Discover & Qualify', core: true, defaultAnchor: 'T-90d → T-45d' },
  { id: 'engage-and-commit', number: 2, title: 'Engage & Commit', core: true, defaultAnchor: 'T-45d → T-30d' },
  { id: 'scope-and-design', number: 3, title: 'Scope & Design', core: false, defaultAnchor: 'T-30d → T-21d' },
  { id: 'prepare', number: 4, title: 'Prepare', core: true, defaultAnchor: 'T-30d → T-7d' },
  { id: 'readiness-go-no-go', number: 5, title: 'Readiness / Go–No-Go', core: false, defaultAnchor: 'T-7d → T-3d' },
  { id: 'execute', number: 6, title: 'Execute', core: true, defaultAnchor: 'D0 → D+n' },
  { id: 'wrap-and-close-out', number: 7, title: 'Wrap & Close-out', core: true, defaultAnchor: 'D0 → T+7d' },
  { id: 'follow-up-and-value-realization', number: 8, title: 'Follow-up & Value realization', core: true, defaultAnchor: 'T+7d → T+90d' },
];

export const FRAMEWORK_HEADING = 'Delivery framework';
export const STAGE_FIELDS = ['Timing', 'Owner', 'Purpose', 'Status'];
export const STAGE_SECTIONS = ['Entry criteria', 'Activities', 'Outputs', 'Exit criteria', 'Resources'];
export const RESOURCE_AUDIENCES = ['Internal', 'Partner', 'Customer', 'Participant', 'Public'];
export const RESOURCE_COLUMNS = ['Resource', 'Type', 'Audience', 'Link'];
export const NOT_APPLICABLE = 'Not applicable';

/** Front matter the catalog table reads. Missing values render as an em-dash. */
export const REQUIRED_FRONT_MATTER = [
  'title', 'description', 'type', 'audience', 'duration', 'level', 'owner', 'status', 'updated',
];
export const OPTIONAL_FRONT_MATTER = ['weight', 'tags'];
export const LIST_FRONT_MATTER = ['audience', 'tags'];

/** Text that means "not written yet". Expected in the template, never in an offering. */
const PLACEHOLDER = /\b(replace me|lorem ipsum|todo|tbd|fixme|xxx)\b/i;

/** The rule catalog. Severity is the default; --strict promotes warnings. */
export const RULES = {
  'file/unreadable': ['error', 'The offering file could not be read.'],
  'file/name': ['error', 'An offering must be a folder containing README.md.'],
  'frontmatter/missing': ['error', 'The file must open with a --- front matter block.'],
  'frontmatter/required-field': ['error', 'A front matter field the catalog table needs is missing or empty.'],
  'frontmatter/unknown-field': ['warning', 'A front matter field that nothing reads.'],
  'frontmatter/unsupported-syntax': ['error', 'Front matter the site generator silently drops.'],
  'frontmatter/list-format': ['error', 'A multi-value field must use a flow sequence, [one, two].'],
  'frontmatter/date-format': ['error', 'updated must be a real calendar date in YYYY-MM-DD form.'],
  'frontmatter/description-length': ['warning', 'description is shown in a table cell and should stay short.'],
  'framework/missing': ['error', 'No "## Delivery framework" heading, so the page renders no timeline.'],
  'framework/no-stages': ['error', 'The framework heading declares no stages.'],
  'framework/orphan-content': ['error', 'Content under the framework heading that is not inside a stage.'],
  'stage/unknown': ['error', 'A "###" heading that is not a framework stage.'],
  'stage/duplicate': ['error', 'The same stage is declared twice.'],
  'stage/order': ['error', 'Stages must appear in framework order.'],
  'stage/missing-core': ['warning', 'A core stage is not declared at all.'],
  'stage/field-unknown': ['error', 'A bold-label bullet that is not a stage field.'],
  'stage/field-duplicate': ['error', 'A stage field is declared twice.'],
  'stage/timing-missing': ['error', 'A stage has no Timing field, so it has no place on the timeline.'],
  'stage/timing-invalid': ['error', 'A timing anchor outside the token grammar.'],
  'stage/owner-missing': ['warning', 'A stage with no accountable owner.'],
  'stage/purpose-missing': ['warning', 'A stage with no purpose.'],
  'stage/section-unknown': ['error', 'A "####" heading that is not a stage subsection.'],
  'stage/section-duplicate': ['error', 'A stage subsection is declared twice.'],
  'stage/empty': ['warning', 'A declared stage with no content and no Not applicable status.'],
  'stage/not-applicable-reason': ['warning', 'Not applicable without a reason.'],
  'resource/table-header': ['error', 'The Resources table header must match the fixed columns.'],
  'resource/cell-count': ['error', 'A Resources row has the wrong number of cells.'],
  'resource/audience-unknown': ['error', 'A resource audience outside the fixed vocabulary.'],
  'resource/audience-missing': ['warning', 'A resource with no audience tag.'],
  'resource/link-missing': ['warning', 'A resource with no link.'],
  'content/placeholder': ['error', 'Template placeholder text left in a real offering.'],
  'content/intro-missing': ['warning', 'No prose above the framework heading to sell the offering.'],
};

/** `Wrap & Close-out`, `wrap and close-out` and `wrap-and-close-out` all match. */
export function normalizeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const STAGE_BY_KEY = new Map();
for (const stage of STAGES) {
  STAGE_BY_KEY.set(stage.id, stage);
  STAGE_BY_KEY.set(normalizeKey(stage.title), stage);
}
const SECTION_BY_KEY = new Map(STAGE_SECTIONS.map((s) => [normalizeKey(s), s]));
const FIELD_BY_KEY = new Map(STAGE_FIELDS.map((f) => [normalizeKey(f), f]));
const AUDIENCE_BY_KEY = new Map(RESOURCE_AUDIENCES.map((a) => [normalizeKey(a), a]));

const UNIT_DAYS = { d: 1, w: 7, m: 30 };

/** One timing token: `T-30d`, `D0`, `D+2`, `D+n`, `T+90d`. */
export function parseTimingToken(token) {
  const raw = String(token ?? '').trim();
  if (/^D0$/i.test(raw)) return { raw: 'D0', phase: 'delivery', days: 0 };

  const during = /^D\+(\d+|n)$/i.exec(raw);
  if (during) {
    const value = during[1].toLowerCase();
    return { raw: `D+${value}`, phase: 'delivery', days: value === 'n' ? Number.MAX_SAFE_INTEGER : Number(value) };
  }

  const relative = /^T([+-])(\d+)([dwm])$/i.exec(raw);
  if (relative) {
    const [, sign, amount, unit] = relative;
    const days = Number(amount) * UNIT_DAYS[unit.toLowerCase()];
    return {
      raw: `T${sign}${amount}${unit.toLowerCase()}`,
      phase: sign === '-' ? 'before' : 'after',
      days: sign === '-' ? -days : days,
    };
  }
  return null;
}

/** A single token or a `from → to` range. */
export function parseTimingAnchor(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { anchor: null, errors: [] };

  const parts = raw.split(/\s*(?:→|-{1,2}>)\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0 || parts.length > 2) {
    return { anchor: null, errors: [`timing "${raw}" must be a single token or a "from → to" range`] };
  }

  const tokens = [];
  const errors = [];
  for (const part of parts) {
    const token = parseTimingToken(part);
    if (!token) {
      errors.push(`timing token "${part}" is not recognised. Use T-<n>d|w|m, D0, D+<n>, D+n, or T+<n>d|w|m`);
      continue;
    }
    tokens.push(token);
  }
  if (errors.length) return { anchor: null, errors };

  const [from, to = null] = tokens;
  return { anchor: { raw, from, to, phase: from.phase, sortKey: from.days }, errors: [] };
}

/**
 * Splits Markdown into heading-delimited segments, ignoring headings inside
 * fenced code blocks so documentation examples do not read as real stages.
 */
export function segmentByHeading(lines, offset = 0) {
  const segments = [];
  let current = { level: 0, title: '', line: offset, lines: [] };
  let fence = null;

  lines.forEach((text, index) => {
    const n = offset + index + 1;
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(text);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      current.lines.push({ text, n });
      return;
    }

    if (!fence) {
      const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(text);
      if (heading) {
        segments.push(current);
        current = { level: heading[1].length, title: heading[2].trim(), line: n, lines: [] };
        return;
      }
    }
    current.lines.push({ text, n });
  });

  segments.push(current);
  return segments;
}

/**
 * Parses the front matter block the way the site generator does, and reports
 * the syntax it would silently drop rather than quietly agreeing with it.
 */
export function parseFrontMatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    const bodyLines = raw.split(/\r?\n/);
    return { found: false, data: {}, rawValues: {}, lineOf: {}, body: bodyLines, bodyOffset: 0, issues: [] };
  }

  const data = {};
  const rawValues = {};
  const lineOf = {};
  const issues = [];
  const blockLines = match[1].split(/\r?\n/);

  blockLines.forEach((line, index) => {
    const n = index + 2; // line 1 is the opening ---
    if (!line.trim() || line.trim().startsWith('#')) return;

    if (/^\s*-\s+/.test(line)) {
      issues.push({ line: n, text: line.trim(), kind: 'block-sequence' });
      return;
    }
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      issues.push({ line: n, text: line.trim(), kind: 'no-colon' });
      return;
    }
    if (/^\s+\S/.test(line)) {
      issues.push({ line: n, text: line.trim(), kind: 'nested' });
      return;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    lineOf[key] = n;
    rawValues[key] = value;

    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = splitFlowSequence(value.slice(1, -1));
      return;
    }
    data[key] = unquote(value);
  });

  const bodyOffset = blockLines.length + 2;
  return { found: true, data, rawValues, lineOf, body: match[2].split(/\r?\n/), bodyOffset, issues };
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
    (value.startsWith("'") && value.endsWith("'") && value.length > 1)
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function splitFlowSequence(inner) {
  const items = [];
  let current = '';
  let quote = null;
  for (const char of inner) {
    if (quote) {
      if (char === quote) quote = null;
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

/** True for a real calendar date in YYYY-MM-DD form, so 2026-02-30 is rejected. */
function isIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Validates one offering file.
 * @returns {{findings: object[], isTemplate: boolean, stages: object[]}}
 */
export function validateOffering(raw, filePath = 'README.md') {
  const findings = [];
  const add = (rule, line, message, fix) => {
    const known = RULES[rule];
    findings.push({
      file: filePath,
      line: line || null,
      rule,
      severity: known ? known[0] : 'error',
      message,
      ...(fix ? { fix } : {}),
    });
  };

  if (path.basename(filePath) !== 'README.md') {
    add('file/name', 1, `an offering must live at <offering-folder>/README.md, found "${path.basename(filePath)}"`,
      'Rename the file to README.md, or move it out of the offerings folder.');
  }

  const fm = parseFrontMatter(raw);

  if (!fm.found) {
    add('frontmatter/missing', 1, 'the file does not start with a "---" front matter block',
      'Add a front matter block with: ' + REQUIRED_FRONT_MATTER.join(', ') + '.');
  }

  const isTemplate = normalizeKey(fm.data.status) === 'template';

  for (const issue of fm.issues) {
    const explain = {
      'block-sequence': 'the site generator reads flat "key: value" pairs only, so a "-" list item is dropped. Use a flow sequence: key: [one, two]',
      nested: 'the site generator reads flat "key: value" pairs only, so an indented key is dropped',
      'no-colon': 'a front matter line without a ":" is ignored',
    }[issue.kind];
    add('frontmatter/unsupported-syntax', issue.line, `${explain} — found "${issue.text}"`,
      'Rewrite the value on one line as key: value, using [one, two] for lists.');
  }

  if (fm.found) {
    for (const key of REQUIRED_FRONT_MATTER) {
      const value = fm.data[key];
      const empty = Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim();
      if (empty) {
        add('frontmatter/required-field', fm.lineOf[key] || 1,
          `front matter field "${key}" is missing or empty`,
          `Add "${key}:" to the front matter. The catalog table renders an em-dash without it.`);
      }
    }

    const known = new Set([...REQUIRED_FRONT_MATTER, ...OPTIONAL_FRONT_MATTER]);
    for (const key of Object.keys(fm.data)) {
      if (!known.has(key)) {
        add('frontmatter/unknown-field', fm.lineOf[key],
          `front matter field "${key}" is not read by the catalog or the page`,
          `Remove "${key}", or add it to the schema if it is genuinely needed.`);
      }
    }

    for (const key of LIST_FRONT_MATTER) {
      const rawValue = fm.rawValues[key];
      if (rawValue === undefined || rawValue === '') continue;
      if (!Array.isArray(fm.data[key])) {
        add('frontmatter/list-format', fm.lineOf[key],
          `front matter field "${key}" must be a flow sequence, found "${rawValue}"`,
          `Write it as ${key}: [${rawValue}].`);
      }
    }

    if (fm.rawValues.updated !== undefined && !isIsoDate(fm.data.updated)) {
      add('frontmatter/date-format', fm.lineOf.updated,
        `"updated" must be a real date in YYYY-MM-DD form, found "${fm.rawValues.updated}"`,
        'Use the ISO form, for example 2026-08-27.');
    }

    const description = String(fm.data.description ?? '');
    if (description.length > 200) {
      add('frontmatter/description-length', fm.lineOf.description,
        `"description" is ${description.length} characters; it is rendered in a table cell`,
        'Trim it to roughly 200 characters or fewer.');
    }
  }

  const segments = segmentByHeading(fm.body, fm.bodyOffset);
  const frameworkIndex = segments.findIndex(
    (s) => s.level === 2 && normalizeKey(s.title) === normalizeKey(FRAMEWORK_HEADING),
  );

  if (frameworkIndex === -1) {
    add('framework/missing', null, `no "## ${FRAMEWORK_HEADING}" heading, so the page renders no timeline`,
      `Add a "## ${FRAMEWORK_HEADING}" heading and declare the stages beneath it as "###" headings.`);
    checkPlaceholders(fm.body, isTemplate, add);
    return { findings, isTemplate, stages: [] };
  }

  const intro = segments.slice(0, frameworkIndex).map((s) => s.lines.map((l) => l.text).join('\n')).join('\n').trim();
  if (!intro) {
    add('content/intro-missing', segments[frameworkIndex].line,
      'there is no prose above the framework heading',
      'Add a short pitch above the framework: what the offering is, who it is for, what a buyer gets.');
  }

  let endIndex = segments.length;
  for (let i = frameworkIndex + 1; i < segments.length; i += 1) {
    if (segments[i].level > 0 && segments[i].level <= 2) {
      endIndex = i;
      break;
    }
  }

  const stages = [];
  let currentStage = null;
  let currentSection = null;

  for (const segment of segments.slice(frameworkIndex + 1, endIndex)) {
    if (segment.level === 3) {
      const definition = STAGE_BY_KEY.get(normalizeKey(segment.title));
      if (!definition) {
        add('stage/unknown', segment.line,
          `"${segment.title}" is not a framework stage`,
          `Use one of: ${STAGES.map((s) => s.title).join(', ')}.`);
        currentStage = null;
        currentSection = null;
        continue;
      }
      if (stages.some((s) => s.id === definition.id)) {
        add('stage/duplicate', segment.line, `stage "${definition.title}" is declared more than once`,
          'Merge the two blocks into one.');
      }
      currentStage = { ...definition, line: segment.line, fieldLines: segment.lines.slice(), sections: new Map() };
      currentSection = null;
      stages.push(currentStage);
      continue;
    }

    if (!currentStage) {
      if (segment.title || segment.lines.some((l) => l.text.trim())) {
        add('framework/orphan-content', segment.line || segments[frameworkIndex].line,
          `"${segment.title || 'content'}" sits under ${FRAMEWORK_HEADING} but not inside a stage`,
          'Stages are "###" headings and their subsections are "####".');
      }
      continue;
    }

    if (segment.level === 4) {
      const section = SECTION_BY_KEY.get(normalizeKey(segment.title));
      if (!section) {
        add('stage/section-unknown', segment.line,
          `"${segment.title}" is not a stage subsection`,
          `Use one of: ${STAGE_SECTIONS.join(', ')}.`);
        currentSection = null;
        continue;
      }
      if (currentStage.sections.has(section)) {
        add('stage/section-duplicate', segment.line,
          `stage "${currentStage.title}" declares "${section}" more than once`,
          'Merge the two subsections into one.');
      }
      currentSection = { title: section, line: segment.line, lines: segment.lines.slice() };
      currentStage.sections.set(section, currentSection);
      continue;
    }

    if (currentSection) currentSection.lines.push(...segment.lines);
    else currentStage.fieldLines.push(...segment.lines);
  }

  if (!stages.length) {
    add('framework/no-stages', segments[frameworkIndex].line,
      `"## ${FRAMEWORK_HEADING}" declares no stages`,
      'Declare at least one stage as a "###" heading.');
  }

  for (const stage of stages) {
    validateStage(stage, add);
  }

  const declaredOrder = stages.map((s) => s.number);
  const ordered = declaredOrder.every((n, i) => i === 0 || n > declaredOrder[i - 1]);
  if (!ordered) {
    add('stage/order', stages[0]?.line,
      `stages must appear in framework order, found ${declaredOrder.join(', ')}`,
      `Reorder them to follow ${STAGES.map((s) => s.number).join(', ')}.`);
  }

  const declared = new Set(stages.map((s) => s.id));
  for (const stage of STAGES) {
    if (stage.core && !declared.has(stage.id)) {
      add('stage/missing-core', segments[frameworkIndex].line,
        `core stage "${stage.title}" is not declared`,
        `Add a "### ${stage.title}" block, or declare it with "- **Status:** ${NOT_APPLICABLE} — <reason>" to record the decision.`);
    }
  }

  checkPlaceholders(fm.body, isTemplate, add);
  return { findings, isTemplate, stages };
}

function validateStage(stage, add) {
  const fields = {};
  const lede = [];

  for (const { text, n } of stage.fieldLines) {
    const bullet = /^\s*[-*]\s+\*\*\s*([^*]+?)\s*:?\s*\*\*\s*:?\s*(.*)$/.exec(text);
    if (bullet) {
      const label = bullet[1].trim();
      const field = FIELD_BY_KEY.get(normalizeKey(label));
      if (!field) {
        add('stage/field-unknown', n, `stage "${stage.title}": "${label}" is not a stage field`,
          `Use one of: ${STAGE_FIELDS.join(', ')}.`);
        continue;
      }
      if (fields[field] !== undefined) {
        add('stage/field-duplicate', n, `stage "${stage.title}": "${field}" is declared more than once`,
          'Keep one bullet per field.');
      }
      fields[field] = { value: bullet[2].trim(), line: n };
      continue;
    }
    if (text.trim()) lede.push(text.trim());
  }

  const status = fields.Status?.value ?? '';
  const notApplicable = normalizeKey(status).startsWith(normalizeKey(NOT_APPLICABLE));

  if (notApplicable) {
    const reason = status.slice(NOT_APPLICABLE.length).replace(/^[\s—:-]+/, '').trim();
    if (!reason) {
      add('stage/not-applicable-reason', fields.Status.line,
        `stage "${stage.title}" is marked ${NOT_APPLICABLE} without a reason`,
        `Write "- **Status:** ${NOT_APPLICABLE} — <why this stage does not apply>".`);
    }
    return;
  }

  const timing = fields.Timing?.value ?? '';
  if (!timing) {
    add('stage/timing-missing', fields.Timing?.line ?? stage.line,
      `stage "${stage.title}" has no Timing anchor`,
      `Add "- **Timing:** ${stage.defaultAnchor}".`);
  } else {
    const { errors } = parseTimingAnchor(timing);
    for (const message of errors) {
      add('stage/timing-invalid', fields.Timing.line, `stage "${stage.title}": ${message}`,
        `The default for this stage is ${stage.defaultAnchor}.`);
    }
  }

  if (!fields.Owner?.value) {
    add('stage/owner-missing', stage.line, `stage "${stage.title}" has no Owner`,
      'Add "- **Owner:** <accountable role>".');
  }
  if (!fields.Purpose?.value) {
    add('stage/purpose-missing', stage.line, `stage "${stage.title}" has no Purpose`,
      'Add "- **Purpose:** <one or two lines>".');
  }

  const resources = stage.sections.get('Resources');
  if (resources) validateResources(stage, resources, add);

  const hasSectionContent = [...stage.sections.values()].some((s) =>
    s.lines.some((l) => l.text.trim()),
  );
  if (!fields.Purpose?.value && !fields.Owner?.value && !lede.length && !hasSectionContent) {
    add('stage/empty', stage.line,
      `stage "${stage.title}" is declared but has no content`,
      `Fill it in, or mark it "- **Status:** ${NOT_APPLICABLE} — <reason>" so the decision is visible.`);
  }
}

function validateResources(stage, section, add) {
  const tableLines = section.lines.filter((l) => /^\s*\|/.test(l.text));
  if (!tableLines.length) return;

  const rows = tableLines.map(({ text, n }) => ({
    n,
    cells: text.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()),
  }));

  const header = rows.shift();
  const headerMatches =
    header.cells.length === RESOURCE_COLUMNS.length &&
    header.cells.every((cell, i) => normalizeKey(cell) === normalizeKey(RESOURCE_COLUMNS[i]));

  if (!headerMatches) {
    add('resource/table-header', header.n,
      `stage "${stage.title}": the Resources table header must be exactly "| ${RESOURCE_COLUMNS.join(' | ')} |", found "| ${header.cells.join(' | ')} |"`,
      `Use | ${RESOURCE_COLUMNS.join(' | ')} |.`);
    return;
  }

  if (rows.length && /^:?-{2,}:?$/.test(rows[0].cells[0] ?? '')) rows.shift();

  for (const row of rows) {
    if (row.cells.every((c) => c === '')) continue;
    if (row.cells.length !== RESOURCE_COLUMNS.length) {
      add('resource/cell-count', row.n,
        `stage "${stage.title}": a Resources row has ${row.cells.length} cell(s), ${RESOURCE_COLUMNS.length} are required`,
        `Every row needs | ${RESOURCE_COLUMNS.join(' | ')} |.`);
      continue;
    }

    const [name, , audience, link] = row.cells;
    if (!audience) {
      add('resource/audience-missing', row.n,
        `stage "${stage.title}": resource "${name}" has no audience tag`,
        `Tag it with one of: ${RESOURCE_AUDIENCES.join(', ')}, so internal-only material is visible as such.`);
    } else if (!AUDIENCE_BY_KEY.has(normalizeKey(audience))) {
      add('resource/audience-unknown', row.n,
        `stage "${stage.title}": resource "${name}" has audience "${audience}"`,
        `Use one of: ${RESOURCE_AUDIENCES.join(', ')}.`);
    }
    if (!link) {
      add('resource/link-missing', row.n,
        `stage "${stage.title}": resource "${name}" has no link`,
        'Link the resource, or drop the row until the material exists.');
    }
  }
}

/** Placeholder text is expected in the template and is a defect anywhere else. */
function checkPlaceholders(bodyLines, isTemplate, add) {
  if (isTemplate) return;
  let fence = null;
  for (const { text, n } of bodyLines.map((text, i) => ({ text, n: i + 1 }))) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(text);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence) continue;
    const hit = PLACEHOLDER.exec(text);
    if (hit) {
      add('content/placeholder', n, `placeholder text "${hit[0]}" is still in the page`,
        'Replace it with real content before publishing.');
    }
  }
}

/* ------------------------------- CLI ------------------------------------ */

function collectFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  const files = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === 'assets' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) {
      const readme = path.join(full, 'README.md');
      if (fs.existsSync(readme)) files.push(readme);
    }
  }
  return files;
}

function formatText(results, strict) {
  const lines = [];
  let errors = 0;
  let warnings = 0;

  for (const result of results) {
    const findings = result.findings;
    if (!findings.length) {
      lines.push(`  ok  ${result.file}`);
      continue;
    }
    lines.push(`      ${result.file}`);
    for (const f of findings) {
      if (f.severity === 'error') errors += 1;
      else warnings += 1;
      const where = f.line ? `:${f.line}` : '';
      lines.push(`  ${f.severity === 'error' ? 'ERR ' : 'warn'}  ${result.file}${where}  [${f.rule}] ${f.message}`);
      if (f.fix) lines.push(`        fix: ${f.fix}`);
    }
  }

  lines.push('');
  lines.push(`${results.length} file(s), ${errors} error(s), ${warnings} warning(s)${strict ? ' (strict: warnings fail)' : ''}`);
  return { text: lines.join('\n'), errors, warnings };
}

function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(
      'Usage: validate-offering.mjs [--json] [--strict] [--rules] <file-or-dir>...\n' +
      '  --dir <path>  validate every <path>/*/README.md\n' +
      '  --json        machine-readable output\n' +
      '  --strict      warnings fail the run too\n' +
      '  --rules       print the rule catalog and exit\n' +
      'Exit codes: 0 clean, 1 findings, 2 usage or IO error\n',
    );
    return 0;
  }

  if (args.includes('--rules')) {
    const rows = Object.entries(RULES).map(([rule, [severity, help]]) => ({ rule, severity, help }));
    if (args.includes('--json')) process.stdout.write(`${JSON.stringify({ version: SCHEMA_VERSION, rules: rows }, null, 2)}\n`);
    else for (const r of rows) process.stdout.write(`${r.severity.padEnd(7)} ${r.rule.padEnd(34)} ${r.help}\n`);
    return 0;
  }

  const json = args.includes('--json');
  const strict = args.includes('--strict');
  const targets = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--dir') {
      i += 1;
      if (!args[i]) {
        process.stderr.write('--dir needs a path\n');
        return 2;
      }
      targets.push(args[i]);
      continue;
    }
    if (!args[i].startsWith('--')) targets.push(args[i]);
  }

  if (!targets.length) {
    process.stderr.write('Nothing to validate. Pass a file or a directory, or --help.\n');
    return 2;
  }

  const files = [];
  for (const target of targets) {
    if (!fs.existsSync(target)) {
      process.stderr.write(`No such file or directory: ${target}\n`);
      return 2;
    }
    files.push(...collectFiles(target));
  }

  if (!files.length) {
    process.stderr.write('No offering README.md files found.\n');
    return 2;
  }

  const results = [];
  for (const file of files.sort()) {
    let raw;
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch (error) {
      results.push({
        file,
        findings: [{ file, line: null, rule: 'file/unreadable', severity: 'error', message: error.message }],
      });
      continue;
    }
    const { findings, isTemplate } = validateOffering(raw, file);
    results.push({ file, isTemplate, findings });
  }

  const all = results.flatMap((r) => r.findings);
  const errors = all.filter((f) => f.severity === 'error').length;
  const warnings = all.length - errors;
  const ok = errors === 0 && (!strict || warnings === 0);

  if (json) {
    process.stdout.write(`${JSON.stringify({
      version: SCHEMA_VERSION,
      ok,
      strict,
      summary: { files: results.length, errors, warnings },
      findings: all,
    }, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatText(results, strict).text}\n`);
  }

  return ok ? 0 : 1;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) process.exit(main(process.argv));
