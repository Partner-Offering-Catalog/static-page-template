# Offering agent kit

A portable custom agent, custom skill, and validator that let another repository author
offerings in the Partner Offering Catalog format.

Nothing here is wired into this repository. This folder is the **source** of the kit; it is
meant to be copied into the repository where offerings are actually written.

## Install

Copy two trees into the target repository:

| From this kit | To the target repository |
| --- | --- |
| `agents/offering-author.agent.md` | `.github/agents/offering-author.agent.md` |
| `skills/offering-format/` | `.github/skills/offering-format/` |

That is the whole install. Both locations are discovered automatically — there is no
registry file to update, and no front-matter field by which an agent declares a skill
dependency, which is why the agent names `offering-format` in its prose instead.

Optionally copy `tests/` as well if the target repository should keep proving the validator
works. The tests are not needed for the agent to function.

```
.github/
  agents/
    offering-author.agent.md
  skills/
    offering-format/
      SKILL.md
      reference/
        framework.md
        template.md
      scripts/
        validate-offering.mjs
```

## What each piece does

**`skills/offering-format/SKILL.md`** — the format contract: front matter schema, the
eight-stage vocabulary, stage-block syntax, the timing grammar, and the validate-first
workflow. Any agent, in this repository or another, picks this up automatically.

**`reference/framework.md`** — what each stage is for and what belongs in it.
**`reference/template.md`** — the blank skeleton to copy for a new offering.

**`scripts/validate-offering.mjs`** — the deterministic check. Zero dependencies, Node 18+.

**`agents/offering-author.agent.md`** — the agent that interviews the user, drafts the
offering, then runs the validator and iterates until it exits `0`.

## Using the validator

```bash
node .github/skills/offering-format/scripts/validate-offering.mjs content/offerings/my-offering/README.md
node .github/skills/offering-format/scripts/validate-offering.mjs --dir content/offerings
node .github/skills/offering-format/scripts/validate-offering.mjs --dir content/offerings --strict --json
node .github/skills/offering-format/scripts/validate-offering.mjs --rules
```

| Flag | Effect |
| --- | --- |
| `--dir <path>` | Validate every offering folder beneath a directory. |
| `--strict` | Treat warnings as failures. Use this in CI. |
| `--json` | Machine-readable findings on stdout. |
| `--rules` | Print the rule catalog and exit. |

| Exit code | Meaning |
| --- | --- |
| `0` | No findings (or warnings only, without `--strict`). |
| `1` | At least one finding. |
| `2` | Bad usage, or a path that could not be read. |

**Judge a run by its exit code, not its printed summary.** A run that never started also
prints no findings.

Every finding carries a stable rule id — `stage/timing-missing`, `frontmatter/date-format`
— so output can be asserted against, diffed between runs, and cited in review. Rule ids are
part of the contract; the prose around them is not.

### In CI

```yaml
- run: node .github/skills/offering-format/scripts/validate-offering.mjs --dir content/offerings --strict
```

## Why a separate validator

The site generator rejects malformed stage blocks, but it was measured to **silently accept**
several things that produce a broken page:

- front matter missing entirely — the catalog row renders as a line of em-dashes
- no `## Delivery framework` heading — the page renders no timeline at all
- a stage with no `Timing` — nothing places it on the timeline
- `Replace me` placeholder text left in a published offering

A build that exits `0` therefore does not mean an offering is complete. The validator closes
exactly those gaps, and it is standalone so it travels to a repository that has no build.

## Tests

```bash
cd offering-agent-kit
node tests/test-validator.mjs                          # every rule fires
node tests/test-validator.mjs --compare ../lib/offerings.js   # and is never laxer than the generator
node tests/test-kit-conformance.mjs                    # agent and skill files match their published formats
```

`test-validator.mjs` derives one mutation per rule from a known-clean fixture and asserts
that rule fires. It refuses to run if the fixture is not clean, because every case would
then pass vacuously. It also asserts that every rule in the catalog has a case, so a rule
added without a control fails the suite.

`--compare` points at the site generator's parser and asserts the validator rejects
everything the generator rejects. It is the guard against the two drifting apart, and it
skips cleanly when the flag is absent, so the suite still runs in a repository that has no
generator.

`test-kit-conformance.mjs` checks the kit's own files against the Agent Skills and custom
agent formats — skill name matching its directory, description length, unknown front-matter
keys, dead reference links — so a kit that would install and then be silently ignored fails
here instead.
