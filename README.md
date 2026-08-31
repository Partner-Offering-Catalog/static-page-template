# static-page-template

A template for rendering clean, professional static pages from Markdown content
without adding presentation clutter to consuming repositories.

The template is inspired by the Microsoft-style look and feel: it uses a Segoe UI
font stack, Fluent blue accents, a polished hero area, card surfaces, a
Microsoft tile mark, and light/dark theme support.

## Features

- A small Node.js generator that renders a home page, section pages, and
  content pages from Markdown.
- A collapsible, multi-level left navigation tree generated from the folder
  structure under `content/`. Every folder entry always links to that
  folder's `README.md`.
- Breadcrumbs and section cards for easy exploration.
- Responsive layout that keeps the sidebar readable on desktop and stacks it on
  smaller screens.
- An offering catalog: every offering is described against a shared five-stage
  delivery framework and rendered as a timeline, with a build-generated browse
  page — keyword search, facets, and a card per offering.
- No client-side JavaScript framework required.

## Content structure

This repository ships the generator, not the content. The repository using the
template provides `content/`: create folders under it and add a `README.md`
file to each one for navigation entries. Any other Markdown file in a folder
becomes a regular page. A `weight` value in front matter controls ordering.

```text
content/
  README.md
  getting-started/
    README.md
    overview.md
  reference/
    README.md
    architecture/
      README.md
      folder-structure.md
```

`content/README.md` is the site home page and is required; the build fails
without it.

Every folder's `README.md` is always the page shown when its navigation entry
is selected, so the menu never points to an empty or auto-generated page.

Example page front matter:

```yaml
---
title: Folder Structure
description: Recommended repository layout for content-driven navigation.
weight: 10
---
```

Front matter values are flat `key: value` pairs. A value written as a YAML flow
sequence, such as `audience: [Partner developers, Customer developers]`, is
parsed as a list; quote an item that contains a comma.

A folder named `assets/` is not scanned for pages, so it needs no `README.md`.
Its files are copied to the published site as-is, which is where decks,
spreadsheets, and images belong. Relative links to other Markdown pages and to
files under `assets/` are rewritten to their published URLs at build time, but
only when the target file exists, so a typo stays visibly broken instead of
becoming a plausible wrong URL.

## Offerings

Each folder under `content/offerings/` is an offering: a hackathon, training,
workshop, or similar engagement. Its `README.md` describes the engagement
against a shared five-stage delivery framework, from first conversation to
realized value.

```text
content/offerings/
  README.md                     the catalog page, holding <!-- offering-catalog -->
  framework.md                  the framework page, holding <!-- framework-stages -->
  my-offering/
    README.md                   the offering
    assets/                     decks, PDFs, spreadsheets, images
```

The stages, in the order they must appear:

| # | Stage | Core |
| --- | --- | --- |
| 1 | Engage | Core |
| 2 | Scope | Optional |
| 3 | Prepare | Core |
| 4 | Execute | Core |
| 5 | Wrap | Core |

The framework names the stages and nothing else. Timing is the offering's own:
each stage's `Timing` field sets the anchor shown on that offering's timeline,
and a stage without one simply shows no anchor. There is no framework default,
so the timeline never displays a date range nobody chose.

Stages are declared as `###` headings under a single `## Delivery framework`
heading, with bold-label fields beneath each one:

```markdown
## Delivery framework

### Engage

- **Timing:** T-90d → T-30d
- **Owner:** Partner Development Manager
- **Purpose:** Establish that this engagement is the right answer, and turn
  interest into named participants and locked dates.
```

The fields are `Timing`, `Owner`, `Purpose`, and `Status`. A stage may then use
the `####` subsections `Entry criteria`, `Activities`, `Outputs`,
`Exit criteria`, and `Resources`. `Timing` uses a fixed vocabulary: `T-<n>d|w|m`
before delivery, `D0`, `D+<n>` and `D+n` during it, `T+<n>d|w|m` after it,
either alone or as a `from → to` range. A `Resources` table has the columns
`Resource | Type | Audience | Link`, and `Audience` is one of `Internal`,
`Partner`, `Customer`, `Participant`, or `Public`, so internal-only material
stays recognisable where somebody is about to forward it.

An offering declares only the stages it uses. On the offering page, a declared
stage with no content renders as "not yet documented" and a stage marked
`- **Status:** Not applicable` renders as such, so a reader can tell the
difference between an engagement that skips a stage deliberately and one
nobody has written up yet. The catalog overview does not repeat that detail: it
marks a stage as represented only when the offering wrote something under it,
and leaves the reasons to the offering page.

The build fails on an unknown stage heading, an unknown field name, an
unparseable timing anchor, a duplicate stage, or an unknown resource audience,
so the timeline can never silently lose a stage to a typo. A heading from the
earlier eight-stage framework — `Discover & Qualify`, `Engage & Commit`,
`Scope & Design`, `Readiness / Go–No-Go`, `Wrap & Close-out`, or
`Follow-up & Value realization` — fails with the stage that absorbed it named
in the message.

Two comment markers are replaced with generated HTML at build time:
`<!-- offering-catalog -->` in `content/offerings/README.md` becomes the browse
experience — keyword search, facets for type, level, audience, stage, and
status, and a card per offering — and `<!-- framework-stages -->` becomes the
stage reference table. Both are derived from the offerings themselves, so
neither can drift.

Offering pages render as readable Markdown on GitHub and as a timeline on the
generated site.

## Local development

Install dependencies, then build the static site:

```bash
npm install
npm run build
```

The build renders the `content/` folder of the repository using this template.
Running it here, where there is no `content/`, fails with
`content/README.md is required as the site home page`, which is the same
message a consuming repository gets when its home page is missing.

The generated output is written to `public/`, which is intentionally ignored
by Git.

Preview the build locally with:

```bash
npm run serve
```

## Customization

Update `site.config.json` to set the site title, brand, repository URL,
footer note, and hero summary cards:

```json
{
  "title": "My Static Site",
  "baseUrl": "/",
  "brand": "My Team",
  "description": "Static documentation for my repository.",
  "repositoryLabel": "Source",
  "repositoryUrl": "https://github.com/example/repository"
}
```

## Deployment base path

Every generated link and asset URL is prefixed with `baseUrl`. Keep it as `/`
for local previews and for user or organization sites served from the domain
root. A GitHub Pages *project* site is served from `/<repository>/`, so set the
base path for that deployment, either in `site.config.json`:

```json
{
  "baseUrl": "/static-page-template/"
}
```

or by deriving it during deployment with the `BASE_URL` environment variable,
which overrides the configured value:

```bash
BASE_URL="/${GITHUB_REPOSITORY#*/}/" npm run build
```

Leaving the base path at `/` for a project site makes assets and navigation
links resolve at the account root and return 404.
