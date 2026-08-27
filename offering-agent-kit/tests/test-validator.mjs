#!/usr/bin/env node
/**
 * test-validator.mjs — proves the validator can fail.
 *
 * Each case takes a known-good offering, applies one deliberate defect, and
 * asserts the expected rule id fires. A rule that never fires on a broken file
 * is worse than no rule at all, so the suite also asserts the unmodified
 * baseline is clean: without that, every case would "pass" against a validator
 * that simply reported everything.
 *
 *   node test-validator.mjs                        run the suite
 *   node test-validator.mjs --compare <lib path>   also check parity with the
 *                                                  site generator's parser
 *
 * Exit codes: 0 all passed, 1 a case failed, 2 harness error.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateOffering, RULES } from '../skills/offering-format/scripts/validate-offering.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const GOOD = fs.readFileSync(path.join(here, 'fixtures', 'good-offering.md'), 'utf8');

/** Replace the first occurrence, failing loudly if the anchor is not present. */
function sub(source, find, replace) {
  const index = source.indexOf(find);
  if (index === -1) throw new Error(`fixture anchor not found: ${JSON.stringify(find)}`);
  return source.slice(0, index) + replace + source.slice(index + find.length);
}

const cases = [
  ['file/name', (s) => s, 'offering.md'],
  ['frontmatter/missing', (s) => s.slice(s.indexOf('\n---\n', 4) + 5)],
  ['frontmatter/required-field', (s) => s.replace(/^duration:.*\n/m, '')],
  ['frontmatter/unknown-field', (s) => sub(s, 'title:', 'nonsense: value\ntitle:')],
  ['frontmatter/unsupported-syntax', (s) => sub(s, 'audience: [Partner developers]', 'audience:\n  - Partner developers')],
  ['frontmatter/list-format', (s) => sub(s, 'audience: [Partner developers]', 'audience: Partner developers')],
  ['frontmatter/date-format', (s) => sub(s, 'updated: 2026-08-27', 'updated: 27/08/2026')],
  ['frontmatter/date-format', (s) => sub(s, 'updated: 2026-08-27', 'updated: 2026-02-30')],
  ['frontmatter/description-length', (s) => sub(s, 'description: A short pitch.', `description: ${'x'.repeat(220)}`)],
  ['framework/missing', (s) => sub(s, '## Delivery framework', '## Something else')],
  ['framework/no-stages', (s) => s.slice(0, s.indexOf('### Discover & Qualify'))],
  ['framework/orphan-content', (s) => sub(s, '### Discover & Qualify', '#### Stray\n\nLoose text.\n\n### Discover & Qualify')],
  ['stage/unknown', (s) => sub(s, '### Discover & Qualify', '### Preperation')],
  ['stage/duplicate', (s) => sub(s, '## Delivery framework\n', '## Delivery framework\n\n### Execute\n\n- **Timing:** D0\n- **Owner:** A\n- **Purpose:** B.\n')],
  ['stage/order', (s) => sub(s, '### Discover & Qualify', '### Execute\n\n- **Timing:** D0\n- **Owner:** A\n- **Purpose:** B.\n\n### Discover & Qualify')],
  ['stage/missing-core', (s) => s.replace(/### Execute[\s\S]*?(?=### Wrap)/, '')],
  ['stage/field-unknown', (s) => sub(s, '- **Owner:** Partner lead', '- **Sponsor:** Partner lead')],
  ['stage/field-duplicate', (s) => sub(s, '- **Owner:** Partner lead', '- **Owner:** Partner lead\n- **Owner:** Someone else')],
  ['stage/timing-missing', (s) => sub(s, '- **Timing:** T-90d → T-45d\n', '')],
  ['stage/timing-invalid', (s) => sub(s, '- **Timing:** T-90d → T-45d', '- **Timing:** three months before')],
  ['stage/timing-invalid', (s) => sub(s, '- **Timing:** T-90d → T-45d', '- **Timing:** T-90x')],
  ['stage/owner-missing', (s) => sub(s, '- **Owner:** Partner lead\n', '')],
  ['stage/purpose-missing', (s) => sub(s, '- **Purpose:** Qualify the engagement.\n', '')],
  ['stage/section-unknown', (s) => sub(s, '#### Activities', '#### Agenda')],
  ['stage/section-duplicate', (s) => sub(s, '#### Activities', '#### Activities\n\n- One.\n\n#### Activities')],
  ['stage/empty', (s) => sub(s, '### Execute\n\n- **Timing:** D0\n- **Owner:** Delivery lead\n- **Purpose:** Run it.\n', '### Execute\n\n- **Timing:** D0\n')],
  ['stage/not-applicable-reason', (s) => sub(s, '- **Status:** Not applicable — fixed curriculum.', '- **Status:** Not applicable')],
  ['resource/table-header', (s) => sub(s, '| Resource | Type | Audience | Link |', '| Name | Kind | Who | URL |')],
  ['resource/cell-count', (s) => sub(s, '| Kickoff deck | Deck | Partner | [deck](./assets/kickoff.pptx) |', '| Kickoff deck | Deck | Partner |')],
  ['resource/audience-unknown', (s) => sub(s, '| Kickoff deck | Deck | Partner |', '| Kickoff deck | Deck | Everyone |')],
  ['resource/audience-missing', (s) => sub(s, '| Kickoff deck | Deck | Partner |', '| Kickoff deck | Deck |  |')],
  ['resource/link-missing', (s) => sub(s, '| Kickoff deck | Deck | Partner | [deck](./assets/kickoff.pptx) |', '| Kickoff deck | Deck | Partner |  |')],
  ['content/placeholder', (s) => sub(s, '- **Owner:** Partner lead', '- **Owner:** Replace me')],
  ['content/intro-missing', (s) => sub(s, 'A hackathon that produces evidence, not enthusiasm.\n\n', '')],
];

let passed = 0;
let failed = 0;
const seen = new Set();

const baseline = validateOffering(GOOD, 'README.md').findings;
if (baseline.length) {
  process.stderr.write('BASELINE IS NOT CLEAN — every case below would pass vacuously:\n');
  for (const f of baseline) process.stderr.write(`  [${f.rule}] ${f.message}\n`);
  process.exit(1);
}
process.stdout.write('pass  baseline fixture is clean (0 findings)\n');
passed += 1;

for (const [rule, mutate, name = 'README.md'] of cases) {
  seen.add(rule);
  let findings;
  try {
    findings = validateOffering(mutate(GOOD), name).findings;
  } catch (error) {
    process.stdout.write(`FAIL  ${rule} — harness error: ${error.message}\n`);
    failed += 1;
    continue;
  }
  const hit = findings.find((f) => f.rule === rule);
  if (hit) {
    process.stdout.write(`pass  ${rule.padEnd(34)} fires: ${hit.message.slice(0, 78)}\n`);
    passed += 1;
  } else {
    process.stdout.write(`FAIL  ${rule.padEnd(34)} did NOT fire. Got: ${findings.map((f) => f.rule).join(', ') || '(nothing)'}\n`);
    failed += 1;
  }
}

// A rule with no case is a rule nobody has watched fail.
const uncovered = Object.keys(RULES).filter((rule) => !seen.has(rule) && rule !== 'file/unreadable');
if (uncovered.length) {
  process.stdout.write(`FAIL  rules with no negative control: ${uncovered.join(', ')}\n`);
  failed += 1;
} else {
  process.stdout.write(`pass  every rule in the catalog has a negative control\n`);
  passed += 1;
}

const compareIndex = process.argv.indexOf('--compare');
if (compareIndex !== -1) {
  const libPath = process.argv[compareIndex + 1];
  if (!libPath) {
    process.stderr.write('--compare needs a path to the generator\'s offerings module\n');
    process.exit(2);
  }
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const generator = require(path.resolve(libPath));

  // Anything the site build rejects, this validator must also reject.
  // The reverse is allowed: the validator is deliberately stricter.
  let drift = 0;
  for (const [rule, mutate] of cases) {
    const source = mutate(GOOD);
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    const generatorErrors = generator.parseOffering(body, { source: 'compare' }).errors;
    if (!generatorErrors.length) continue;
    const mine = validateOffering(source, 'README.md').findings.filter((f) => f.severity === 'error');
    if (!mine.length) {
      process.stdout.write(`FAIL  parity: generator rejects "${rule}" mutation but the validator passes it\n`);
      drift += 1;
    }
  }
  if (drift) {
    failed += drift;
  } else {
    process.stdout.write('pass  parity: the validator rejects everything the site generator rejects\n');
    passed += 1;
  }
}

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
