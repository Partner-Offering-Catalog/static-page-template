'use strict';

/**
 * The delivery framework shared by every offering in the catalog.
 *
 * Each offering README declares the stages it uses under a `## Delivery
 * framework` heading, one `###` section per stage. Stages are optional per
 * offering, but the ones that are declared must use these titles and must
 * appear in this order, so a reader always meets the same spine.
 */
const STAGES = [
  {
    id: 'discover-and-qualify',
    number: 1,
    title: 'Discover & Qualify',
    shortTitle: 'Discover',
    core: true,
    defaultAnchor: 'T-90d → T-45d',
    summary:
      'Position the offering with the stakeholders who can fund and staff it, and qualify the engagement out early if it does not fit.',
  },
  {
    id: 'engage-and-commit',
    number: 2,
    title: 'Engage & Commit',
    shortTitle: 'Engage',
    core: true,
    defaultAnchor: 'T-45d → T-30d',
    summary:
      'Turn interest into a joint commitment: named participants, locked dates, and target outcomes written down and agreed.',
  },
  {
    id: 'scope-and-design',
    number: 3,
    title: 'Scope & Design',
    shortTitle: 'Scope',
    core: false,
    defaultAnchor: 'T-30d → T-21d',
    summary:
      'Tailor the agenda, challenges, and scenarios to the committed outcomes. Skip for fixed-curriculum delivery.',
  },
  {
    id: 'prepare',
    number: 4,
    title: 'Prepare',
    shortTitle: 'Prepare',
    core: true,
    defaultAnchor: 'T-30d → T-7d',
    summary:
      'Run participant readiness and environment readiness as two parallel tracks with different owners and different lead times.',
  },
  {
    id: 'readiness-go-no-go',
    number: 5,
    title: 'Readiness / Go–No-Go',
    shortTitle: 'Readiness',
    core: false,
    defaultAnchor: 'T-7d → T-3d',
    summary:
      'Dry-run on the environment participants will actually use, then take an explicit go/no-go decision while there is still time to fix things.',
  },
  {
    id: 'execute',
    number: 6,
    title: 'Execute',
    shortTitle: 'Execute',
    core: true,
    defaultAnchor: 'D0 → D+n',
    summary: 'Deliver the engagement and capture evidence of progress as it happens.',
  },
  {
    id: 'wrap-and-close-out',
    number: 7,
    title: 'Wrap & Close-out',
    shortTitle: 'Wrap',
    core: true,
    defaultAnchor: 'D0 → T+7d',
    summary:
      'Capture outcomes, demos, and feedback while participants are still in the room, then deprovision the environment.',
  },
  {
    id: 'follow-up-and-value-realization',
    number: 8,
    title: 'Follow-up & Value realization',
    shortTitle: 'Follow-up',
    core: true,
    defaultAnchor: 'T+7d → T+90d',
    summary:
      'Track the commitments made, progress the opportunity, and feed the retrospective back into this catalog.',
  },
];

const FRAMEWORK_HEADING = 'Delivery framework';

/** Bold-label bullets allowed directly beneath a stage heading. */
const STAGE_FIELDS = ['Timing', 'Owner', 'Purpose', 'Status'];

/** `####` subsections allowed inside a stage. */
const STAGE_SECTIONS = [
  'Entry criteria',
  'Activities',
  'Outputs',
  'Exit criteria',
  'Resources',
];

/** Audience tags a resource may carry, so internal-only material is visible as such. */
const RESOURCE_AUDIENCES = ['Internal', 'Partner', 'Customer', 'Participant', 'Public'];

const RESOURCE_COLUMNS = ['Resource', 'Type', 'Audience', 'Link'];

const NOT_APPLICABLE = 'Not applicable';

const PHASE_LABELS = {
  before: 'Before',
  delivery: 'Delivery',
  after: 'After',
};

const STAGE_BY_ID = new Map(STAGES.map((stage) => [stage.id, stage]));

/**
 * Normalizes a heading or label into a comparable slug, so `Wrap & Close-out`,
 * `wrap and close-out`, and `wrap-and-close-out` all match the same stage.
 * @param {string} value
 * @returns {string}
 */
function normalizeKey(value) {
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

const SECTION_BY_KEY = new Map(
  STAGE_SECTIONS.map((section) => [normalizeKey(section), section]),
);
const FIELD_BY_KEY = new Map(STAGE_FIELDS.map((field) => [normalizeKey(field), field]));
const AUDIENCE_BY_KEY = new Map(
  RESOURCE_AUDIENCES.map((audience) => [normalizeKey(audience), audience]),
);

const UNIT_DAYS = { d: 1, w: 7, m: 30 };

/**
 * Parses one timing token from the fixed vocabulary. `T-<n>d|w|m` sits before
 * the engagement, `D0`/`D+<n>`/`D+n` inside it, and `T+<n>d|w|m` after it.
 *
 * @param {string} token
 * @returns {{raw: string, phase: string, days: number}|null}
 */
function parseTimingToken(token) {
  const raw = String(token ?? '').trim();

  if (/^D0$/i.test(raw)) {
    return { raw: 'D0', phase: 'delivery', days: 0 };
  }

  const during = /^D\+(\d+|n)$/i.exec(raw);
  if (during) {
    const value = during[1].toLowerCase();
    return {
      raw: `D+${value}`,
      phase: 'delivery',
      days: value === 'n' ? Number.MAX_SAFE_INTEGER : Number(value),
    };
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

/**
 * Parses a timing anchor, which is either a single token or a `from → to`
 * range. Returns `null` with a populated `errors` array when a token is not in
 * the vocabulary, so the build can fail with an actionable message.
 *
 * @param {string} value
 * @returns {{anchor: object|null, errors: string[]}}
 */
function parseTimingAnchor(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return { anchor: null, errors: [] };
  }

  const parts = raw
    .split(/\s*(?:→|-{1,2}>)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0 || parts.length > 2) {
    return {
      anchor: null,
      errors: [`timing "${raw}" must be a single token or a "from → to" range`],
    };
  }

  const tokens = [];
  const errors = [];
  for (const part of parts) {
    const token = parseTimingToken(part);
    if (!token) {
      errors.push(
        `timing token "${part}" is not recognised. Use T-<n>d|w|m, D0, D+<n>, D+n, or T+<n>d|w|m`,
      );
      continue;
    }
    tokens.push(token);
  }

  if (errors.length) {
    return { anchor: null, errors };
  }

  const [from, to = null] = tokens;
  return {
    anchor: {
      raw,
      from,
      to,
      label: to ? `${from.raw} → ${to.raw}` : from.raw,
      phase: from.phase,
      phaseLabel: PHASE_LABELS[from.phase],
      sortKey: from.days,
    },
    errors: [],
  };
}

/**
 * Splits Markdown into heading-delimited segments while ignoring headings that
 * appear inside fenced code blocks.
 *
 * @param {string} body
 * @returns {{level: number, title: string, line: number, lines: string[]}[]}
 */
function segmentByHeading(body) {
  const lines = String(body ?? '').split(/\r?\n/);
  const segments = [];
  let current = { level: 0, title: '', line: 0, lines: [] };
  let fence = null;

  lines.forEach((line, index) => {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) {
        fence = marker;
      } else if (fence === marker) {
        fence = null;
      }
      current.lines.push(line);
      return;
    }

    if (!fence) {
      const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
      if (heading) {
        segments.push(current);
        current = {
          level: heading[1].length,
          title: heading[2].trim(),
          line: index + 1,
          lines: [],
        };
        return;
      }
    }

    current.lines.push(line);
  });

  segments.push(current);
  return segments;
}

/**
 * Re-emits a segment as Markdown so untouched prose round-trips unchanged.
 * @param {object} segment
 * @returns {string}
 */
function segmentToMarkdown(segment) {
  const heading = segment.level > 0 ? `${'#'.repeat(segment.level)} ${segment.title}` : null;
  return [heading, ...segment.lines].filter((part) => part !== null).join('\n');
}

function joinSegments(segments) {
  return segments.map(segmentToMarkdown).join('\n').trim();
}

/**
 * Parses the `| Resource | Type | Audience | Link |` table used by the
 * Resources subsection into structured rows.
 *
 * @param {string[]} lines
 * @param {(message: string) => void} report
 * @returns {{resources: object[], notes: string}}
 */
function parseResourceTable(lines, report) {
  const tableLines = [];
  const noteLines = [];

  for (const line of lines) {
    if (/^\s*\|/.test(line)) {
      tableLines.push(line.trim());
    } else {
      noteLines.push(line);
    }
  }

  if (!tableLines.length) {
    return { resources: [], notes: noteLines.join('\n').trim() };
  }

  const rows = tableLines.map((line) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim()),
  );

  const header = rows.shift();
  const headerMatches =
    header.length === RESOURCE_COLUMNS.length &&
    header.every((cell, index) => normalizeKey(cell) === normalizeKey(RESOURCE_COLUMNS[index]));

  if (!headerMatches) {
    report(
      `the Resources table header must be exactly "| ${RESOURCE_COLUMNS.join(' | ')} |", found "| ${header.join(' | ')} |"`,
    );
    return { resources: [], notes: noteLines.join('\n').trim() };
  }

  if (rows.length && /^:?-{2,}:?$/.test(rows[0][0] ?? '')) {
    rows.shift();
  }

  const resources = [];
  for (const row of rows) {
    if (row.every((cell) => cell === '')) {
      continue;
    }
    if (row.length !== RESOURCE_COLUMNS.length) {
      report(
        `a Resources row has ${row.length} cell(s) but ${RESOURCE_COLUMNS.length} are required: "${row.join(' | ')}"`,
      );
      continue;
    }

    const [name, type, audience, link] = row;
    const audienceKey = normalizeKey(audience);
    const resolvedAudience = AUDIENCE_BY_KEY.get(audienceKey);
    if (audience && !resolvedAudience) {
      report(
        `resource "${name}" has audience "${audience}". Use one of: ${RESOURCE_AUDIENCES.join(', ')}`,
      );
    }

    resources.push({
      name,
      type,
      audience: resolvedAudience || audience,
      audienceKey: resolvedAudience ? audienceKey : '',
      link,
    });
  }

  return { resources, notes: noteLines.join('\n').trim() };
}

/**
 * Parses the bold-label bullets directly beneath a stage heading, plus any
 * free prose that follows them.
 *
 * @param {string[]} lines
 * @param {(message: string) => void} report
 * @returns {{fields: Record<string, string>, lede: string}}
 */
function parseStageFields(lines, report) {
  const fields = {};
  const ledeLines = [];

  for (const line of lines) {
    const bullet = /^\s*[-*]\s+\*\*\s*([^*]+?)\s*:?\s*\*\*\s*:?\s*(.*)$/.exec(line);
    if (bullet) {
      const label = bullet[1].trim();
      const field = FIELD_BY_KEY.get(normalizeKey(label));
      if (!field) {
        report(
          `"${label}" is not a stage field. Use one of: ${STAGE_FIELDS.join(', ')}`,
        );
        continue;
      }
      if (fields[field] !== undefined) {
        report(`the "${field}" field is declared more than once`);
      }
      fields[field] = bullet[2].trim();
      continue;
    }

    ledeLines.push(line);
  }

  return { fields, lede: ledeLines.join('\n').trim() };
}

/**
 * Parses one offering README body into an intro, the declared framework
 * stages, and any trailing content, validating every stage against the shared
 * framework as it goes.
 *
 * @param {string} body Markdown body with front matter already removed.
 * @param {{source?: string}} [options]
 * @returns {{hasFramework: boolean, intro: string, frameworkIntro: string, outro: string, stages: object[], errors: string[]}}
 */
function parseOffering(body, options = {}) {
  const source = options.source || 'offering';
  const errors = [];
  const segments = segmentByHeading(body);

  const frameworkIndex = segments.findIndex(
    (segment) => segment.level === 2 && normalizeKey(segment.title) === normalizeKey(FRAMEWORK_HEADING),
  );

  if (frameworkIndex === -1) {
    return {
      hasFramework: false,
      intro: joinSegments(segments),
      frameworkIntro: '',
      outro: '',
      stages: [],
      errors,
    };
  }

  let endIndex = segments.length;
  for (let index = frameworkIndex + 1; index < segments.length; index += 1) {
    if (segments[index].level > 0 && segments[index].level <= 2) {
      endIndex = index;
      break;
    }
  }

  const intro = joinSegments(segments.slice(0, frameworkIndex));
  const outro = joinSegments(segments.slice(endIndex));
  const frameworkSegments = segments.slice(frameworkIndex, endIndex);
  const frameworkIntro = frameworkSegments[0].lines.join('\n').trim();

  const stages = [];
  let currentStage = null;
  let currentSection = null;

  const reportStage = (stage, message) =>
    errors.push(`${source}: stage "${stage.title}" — ${message}`);

  for (const segment of frameworkSegments.slice(1)) {
    if (segment.level === 3) {
      const definition = STAGE_BY_KEY.get(normalizeKey(segment.title));
      if (!definition) {
        errors.push(
          `${source}: "${segment.title}" is not a framework stage. Use one of: ${STAGES.map((stage) => stage.title).join(', ')}`,
        );
        currentStage = null;
        currentSection = null;
        continue;
      }
      if (stages.some((stage) => stage.id === definition.id)) {
        errors.push(`${source}: stage "${definition.title}" is declared more than once`);
      }
      currentStage = {
        ...definition,
        headingTitle: segment.title,
        rawLines: segment.lines.slice(),
        sections: new Map(),
      };
      currentSection = null;
      stages.push(currentStage);
      continue;
    }

    if (!currentStage) {
      if (segment.lines.join('').trim() || segment.title) {
        errors.push(
          `${source}: "${segment.title}" appears under ${FRAMEWORK_HEADING} but not inside a stage. Stages are "###" headings; their subsections are "####".`,
        );
      }
      continue;
    }

    if (segment.level === 4) {
      const section = SECTION_BY_KEY.get(normalizeKey(segment.title));
      if (!section) {
        reportStage(
          currentStage,
          `"${segment.title}" is not a stage subsection. Use one of: ${STAGE_SECTIONS.join(', ')}`,
        );
        currentSection = null;
        continue;
      }
      if (currentStage.sections.has(section)) {
        reportStage(currentStage, `the "${section}" subsection is declared more than once`);
      }
      currentSection = { title: section, lines: segment.lines.slice() };
      currentStage.sections.set(section, currentSection);
      continue;
    }

    const markdown = segmentToMarkdown(segment);
    if (currentSection) {
      currentSection.lines.push(markdown);
    } else {
      currentStage.rawLines.push(markdown);
    }
  }

  for (const stage of stages) {
    const { fields, lede } = parseStageFields(stage.rawLines, (message) =>
      reportStage(stage, message),
    );

    const { anchor, errors: timingErrors } = parseTimingAnchor(fields.Timing);
    for (const message of timingErrors) {
      reportStage(stage, message);
    }

    stage.anchor = anchor;
    stage.owner = fields.Owner || '';
    stage.purpose = fields.Purpose || '';
    stage.statusNote = fields.Status || '';
    stage.lede = lede;

    const isNotApplicable = normalizeKey(stage.statusNote).startsWith(normalizeKey(NOT_APPLICABLE));
    const sections = [];
    for (const title of STAGE_SECTIONS) {
      const section = stage.sections.get(title);
      if (!section) {
        continue;
      }
      const content = section.lines.join('\n').trim();
      if (title === 'Resources') {
        const { resources, notes } = parseResourceTable(section.lines, (message) =>
          reportStage(stage, message),
        );
        if (resources.length || notes) {
          sections.push({ title, resources, markdown: notes });
        }
        continue;
      }
      if (content) {
        sections.push({ title, markdown: content });
      }
    }

    stage.sectionList = sections;
    delete stage.sections;
    delete stage.rawLines;

    const hasContent = Boolean(
      stage.purpose || stage.lede || stage.owner || sections.length,
    );

    if (isNotApplicable) {
      stage.state = 'not-applicable';
    } else if (hasContent) {
      stage.state = 'active';
    } else {
      stage.state = 'empty';
    }
  }

  const declaredOrder = stages.map((stage) => stage.number);
  const isOrdered = declaredOrder.every(
    (number, index) => index === 0 || number > declaredOrder[index - 1],
  );
  if (!isOrdered) {
    errors.push(
      `${source}: stages must appear in framework order (${STAGES.map((stage) => stage.number).join(', ')}), found ${declaredOrder.join(', ')}`,
    );
  }

  return { hasFramework: true, intro, frameworkIntro, outro, stages, errors };
}

/**
 * Reads the catalog metadata an offering contributes to the overview table.
 *
 * @param {object} node A content-tree folder node for one offering.
 * @param {object} offering The parsed offering returned by `parseOffering`.
 * @returns {object}
 */
function toCatalogEntry(node, offering) {
  const data = node.data || {};
  const toList = (value) => {
    if (Array.isArray(value)) {
      return value;
    }
    return String(value ?? '').trim() ? [String(value).trim()] : [];
  };

  const declared = new Map(offering.stages.map((stage) => [stage.id, stage]));

  return {
    title: node.title,
    urlPath: node.urlPath,
    description: node.description,
    type: String(data.type ?? '').trim(),
    audience: toList(data.audience),
    duration: String(data.duration ?? '').trim(),
    level: String(data.level ?? '').trim(),
    owner: String(data.owner ?? '').trim(),
    status: String(data.status ?? '').trim(),
    updated: String(data.updated ?? '').trim(),
    tags: toList(data.tags),
    stages: STAGES.map((stage) => {
      const declaredStage = declared.get(stage.id);
      return {
        ...stage,
        state: declaredStage ? declaredStage.state : 'absent',
      };
    }),
  };
}

/**
 * An offering whose `status` is `Template` is a scaffold, not something a
 * customer can be sold, so it is kept out of the catalog listing.
 * @param {object} entry
 * @returns {boolean}
 */
function isTemplateEntry(entry) {
  return normalizeKey(entry.status) === 'template';
}

module.exports = {
  STAGES,
  STAGE_FIELDS,
  STAGE_SECTIONS,
  RESOURCE_AUDIENCES,
  RESOURCE_COLUMNS,
  FRAMEWORK_HEADING,
  NOT_APPLICABLE,
  STAGE_BY_ID,
  normalizeKey,
  parseTimingToken,
  parseTimingAnchor,
  parseOffering,
  toCatalogEntry,
  isTemplateEntry,
};
