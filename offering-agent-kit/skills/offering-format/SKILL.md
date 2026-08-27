---
name: offering-format
description: Use this skill when drafting, editing, reviewing, or validating an offering page (a hackathon, training, workshop, or similar engagement) for the Partner Offering Catalog. It defines the eight-stage delivery framework, the exact Markdown and front matter an offering README.md must use, and a validator script that checks a draft deterministically. Trigger on requests like "add a new offering", "draft a hackathon page", "why does the offering build fail", or "check this offering against the framework".
license: MIT
compatibility: Cross-platform. Requires Node.js 18 or later to run scripts/validate-offering.mjs. No network access and no package installation needed.
---

# Offering format

Every offering in the catalog is one folder containing a `README.md` that describes the
engagement against a shared eight-stage delivery framework. The site generator turns that
file into a timeline and a row in the catalog table.

The format is a contract, not a style guide: the build **fails** on a mistyped stage title,
an unknown field, or an unparseable timing anchor. Never guess at the syntax. Check it with
the validator.

## Always validate before claiming a draft is finished

```bash
node scripts/validate-offering.mjs <path-to-offering>/README.md
node scripts/validate-offering.mjs --dir content/offerings   # every offering
node scripts/validate-offering.mjs --json <path>             # machine-readable
```

Exit code `0` means clean, `1` means findings, `2` means a usage or IO error. Every finding
carries a stable rule id such as `stage/timing-invalid`, a line number, and a `fix` hint.

Work the findings until the exit code is `0`. Do not describe a draft as complete on the
strength of the printed summary alone — **check the exit code**, because a run that fails to
start prints no findings either.

`--strict` also fails on warnings. Use it for anything intended for publication.

Run `node scripts/validate-offering.mjs --rules` for the full rule catalog.

## File layout

```text
content/offerings/<offering-slug>/
  README.md                  the offering itself
  joining-instructions.md    optional companion pages
  assets/                    decks, spreadsheets, images
```

`assets/` is reserved: it is not scanned for pages, so it needs no `README.md`, and its
files are copied to the published site. Put binaries there, never at the folder root.

Relative links to companion pages and to files under `assets/` are rewritten to their
published URLs at build time, but **only when the target file exists**. A link to a file
that is not there stays broken rather than becoming a plausible wrong URL, so create the
file or drop the link.

## Front matter

```yaml
---
title: GitHub Copilot Enablement Hackathon
description: One sentence, shown in the catalog table and in page cards.
weight: 10
type: Hackathon
audience: [Partner developers, Engineering leads]
duration: 3 days on site
level: Intermediate
owner: Partner delivery lead
status: Published
updated: 2026-08-27
tags: [GitHub Copilot, Developer productivity]
---
```

All of `title`, `description`, `type`, `audience`, `duration`, `level`, `owner`, `status`
and `updated` are required. The site build does **not** enforce this — it renders a missing
value as an em-dash — so the validator is the only thing standing between a half-filled
front matter and a catalog row full of blanks.

The parser reads flat `key: value` pairs only. Multi-value fields must use a flow sequence
(`[one, two]`); a YAML block sequence is silently dropped. `updated` must be a real calendar
date in `YYYY-MM-DD` form.

`status: Template` marks a scaffold: it is kept out of the catalog table but still validated.

## Stage blocks

Stages live under a single `## Delivery framework` heading. Each stage is an `###` heading
whose title must match a framework stage exactly, and stages must appear in framework order.

```markdown
## Delivery framework

### Prepare

- **Timing:** T-30d → T-7d
- **Owner:** Delivery lead
- **Purpose:** Get participants and the environment ready in parallel.

#### Entry criteria

- Participants are named.

#### Activities

- Send joining instructions.

#### Outputs

- A readiness checklist.

#### Exit criteria

- Every participant can sign in.

#### Resources

| Resource | Type | Audience | Link |
| --- | --- | --- | --- |
| Joining instructions | Doc | Participant | [joining-instructions.md](./joining-instructions.md) |
```

- Fields are bold-label bullets directly beneath the `###` heading: `Timing`, `Owner`,
  `Purpose`, `Status`. Nothing else is accepted.
- Subsections are `####` headings: `Entry criteria`, `Activities`, `Outputs`,
  `Exit criteria`, `Resources`. Nothing else is accepted.
- The Resources table header must be exactly `| Resource | Type | Audience | Link |`.
- Audience must be one of `Internal`, `Partner`, `Customer`, `Participant`, `Public`, so
  internal-only material is visibly marked.

An offering declares only the stages it uses. To record that a stage was considered and
does not apply, declare it and give a reason:

```markdown
### Scope & Design

- **Status:** Not applicable — fixed curriculum, nothing to tailor.
```

That renders differently from a stage nobody has written yet, which is the point.

## The eight stages

| # | Stage | Default anchor | Core |
|---|-------|----------------|------|
| 1 | Discover & Qualify | `T-90d → T-45d` | yes |
| 2 | Engage & Commit | `T-45d → T-30d` | yes |
| 3 | Scope & Design | `T-30d → T-21d` | no |
| 4 | Prepare | `T-30d → T-7d` | yes |
| 5 | Readiness / Go–No-Go | `T-7d → T-3d` | no |
| 6 | Execute | `D0 → D+n` | yes |
| 7 | Wrap & Close-out | `D0 → T+7d` | yes |
| 8 | Follow-up & Value realization | `T+7d → T+90d` | yes |

See [reference/framework.md](reference/framework.md) for what each stage is for and what
good content looks like in it.

## Timing anchors

| Form | Meaning | Examples |
|------|---------|----------|
| `T-<n>d` \| `w` \| `m` | before delivery | `T-90d`, `T-6w`, `T-3m` |
| `D0`, `D+<n>`, `D+n` | during delivery | `D0`, `D+2`, `D+n` |
| `T+<n>d` \| `w` \| `m` | after delivery | `T+7d`, `T+90d` |

A range is `from → to`. Anything else fails the build. `D+n` means "the last day", for an
engagement whose length varies.

## Writing guidance

Copy [reference/template.md](reference/template.md) as the starting skeleton.

- Anchor timings to the work, not to the calendar. Quota and capacity requests for AI
  workloads belong at `T-30d`, not `T-7d`; putting them late is the single most common
  cause of a delivery that cannot run.
- Give every stage an accountable **role**, not a person's name.
- Prefer evidence over adjectives: "reviewed pull requests merged" beats "great engagement".
- Keep `description` under about 200 characters — it is rendered inside a table cell.
- Deprovisioning belongs in Wrap & Close-out. It is a cost and security obligation with a
  hard deadline, not a nicety.
- Never invent a stage, field, subsection, audience, or timing token. The vocabulary above
  is closed. If something genuinely does not fit, say so rather than bending the format.
