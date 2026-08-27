#!/usr/bin/env node
/**
 * test-kit-conformance.mjs — checks the kit's own files against the published
 * Agent Skills and custom-agent formats, so a kit that installs into a target
 * repository and is silently ignored fails here instead.
 *
 * Exit codes: 0 all passed, 1 a check failed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    process.stdout.write(`pass  ${label}${detail ? ` — ${detail}` : ''}\n`);
    passed += 1;
  } else {
    process.stdout.write(`FAIL  ${label}${detail ? ` — ${detail}` : ''}\n`);
    failed += 1;
  }
}

/** Reads the leading `---` block as flat key/value pairs. */
function frontMatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || /^\s/.test(line)) continue;
    const i = line.indexOf(':');
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return { data, body: match[2] };
}

/* ----------------------------- the skill ------------------------------- */

const skillDir = path.join(root, 'skills', 'offering-format');
const skillPath = path.join(skillDir, 'SKILL.md');

check('skill file is named SKILL.md', fs.existsSync(skillPath));

const skill = frontMatter(fs.readFileSync(skillPath, 'utf8'));
check('skill has front matter', skill !== null);

if (skill) {
  const { name, description } = skill.data;
  check('skill has a name', Boolean(name));
  check('skill name matches its directory', name === path.basename(skillDir), `${name} vs ${path.basename(skillDir)}`);
  check('skill name is <= 64 chars', (name ?? '').length <= 64, `${(name ?? '').length}`);
  check(
    'skill name is lowercase letters, numbers and single hyphens',
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name ?? ''),
    name,
  );
  check('skill has a description', Boolean(description));
  check('skill description is <= 1024 chars', (description ?? '').length <= 1024, `${(description ?? '').length}`);

  const known = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
  const unknown = Object.keys(skill.data).filter((k) => !known.has(k));
  check('skill front matter has no unknown keys', unknown.length === 0, unknown.join(', '));

  // Progressive disclosure: the spec recommends keeping SKILL.md short and
  // pushing detail into reference files.
  const lines = skill.body.split('\n').length;
  check('SKILL.md body is under 500 lines', lines < 500, `${lines} lines`);

  // Every relative link in the skill must resolve, or the agent follows a dead
  // path. Links inside fenced examples are illustrative, so they are skipped.
  const prose = [];
  let fenced = false;
  for (const line of skill.body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    if (!fenced) prose.push(line);
  }
  const links = [...prose.join('\n').matchAll(/\]\(([^)#:]+)\)/g)].map((m) => m[1]);
  const missing = links.filter((href) => !fs.existsSync(path.join(skillDir, href)));
  check('every relative link in SKILL.md resolves', missing.length === 0, missing.join(', '));
  check('SKILL.md links to at least one reference file', links.length > 0, `${links.length} link(s)`);
}

/* ----------------------------- the agent ------------------------------- */

const agentDir = path.join(root, 'agents');
const agentFiles = fs.readdirSync(agentDir).filter((f) => f.endsWith('.md'));
check('kit ships at least one agent', agentFiles.length > 0);

for (const file of agentFiles) {
  check(`${file} uses the .agent.md suffix`, file.endsWith('.agent.md'));
  check(`${file} uses only safe filename characters`, /^[.\-_a-zA-Z0-9]+$/.test(file));

  const agent = frontMatter(fs.readFileSync(path.join(agentDir, file), 'utf8'));
  check(`${file} has front matter`, agent !== null);
  if (!agent) continue;

  check(`${file} has the required description`, Boolean(agent.data.description));
  check(`${file} body is under 30000 chars`, agent.body.length < 30000, `${agent.body.length}`);

  const known = new Set([
    'name', 'description', 'tools', 'model', 'target',
    'disable-model-invocation', 'user-invocable', 'mcp-servers', 'metadata',
  ]);
  const unknown = Object.keys(agent.data).filter((k) => !known.has(k));
  check(`${file} front matter has no unknown keys`, unknown.length === 0, unknown.join(', '));

  // There is no front-matter field for requiring a skill, so the agent must
  // name the skill in its prose or the skill will never be reached for.
  check(`${file} names the offering-format skill in its body`, agent.body.includes('offering-format'));

  // The agent tells the user to run the validator; the path it prints must be
  // the one the install instructions actually create.
  check(
    `${file} references the validator at its installed path`,
    agent.body.includes('.github/skills/offering-format/scripts/validate-offering.mjs'),
  );
}

/* --------------------------- the validator ----------------------------- */

const validator = path.join(skillDir, 'scripts', 'validate-offering.mjs');
check('validator script is present', fs.existsSync(validator));
check(
  'validator has no third-party imports',
  !/^import[\s\S]*?from\s+['"](?!node:|\.)/m.test(fs.readFileSync(validator, 'utf8')),
);

/* ------------------------ the shipped skeleton ------------------------- */

// reference/template.md is what the agent copies to start a new offering. If it
// is not itself a valid offering, every draft begins broken. It is validated
// under the name it will be given, since an offering must be a README.md.
const templatePath = path.join(skillDir, 'reference', 'template.md');
check('reference template is present', fs.existsSync(templatePath));

if (fs.existsSync(templatePath) && fs.existsSync(validator)) {
  const { validateOffering } = await import(`file://${validator}`);
  const { findings } = validateOffering(
    fs.readFileSync(templatePath, 'utf8'),
    'offering-template/README.md',
  );
  const errors = findings.filter((f) => f.severity === 'error');
  check(
    'reference template validates as an offering',
    errors.length === 0,
    errors.map((f) => f.rule).join(', '),
  );
}

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
