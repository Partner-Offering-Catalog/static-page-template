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
- An offering catalog: every offering is described against a shared delivery
  framework and rendered as a timeline, with a build-generated overview table.
- No client-side JavaScript framework required.

## Content structure

Create folders under `content/` and add a `README.md` file to each one for
navigation entries. Any other Markdown file in a folder becomes a regular
page. A `weight` value in front matter controls ordering.

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
against a shared eight-stage delivery framework, from first conversation to
realized value.

```text
content/offerings/
  README.md                     the catalog page
  framework.md                  the eight stages, in detail
  authoring.md                  how to write an offering
  offering-template/            copy this to start a new offering
  github-copilot-enablement-hackathon/
    README.md
    joining-instructions.md
    assets/
      environment-readiness-checklist.csv
```

Stages are declared as `###` headings under a single `## Delivery framework`
heading, with bold-label fields beneath each one:

```markdown
## Delivery framework

### Discover & Qualify

- **Timing:** T-90d → T-45d
- **Owner:** Partner Development Manager
- **Purpose:** Establish that this engagement is the right answer.
```

An offering declares only the stages it uses. A declared stage with no content
renders as "not yet documented" and a stage marked
`- **Status:** Not applicable` renders as such, so a reader can tell the
difference between an engagement that skips a stage deliberately and one
nobody has written up yet.

The build fails on an unknown stage heading, an unknown field name, an
unparseable timing anchor, a duplicate stage, or an unknown resource audience,
so the timeline can never silently lose a stage to a typo. The template folder
is validated on every run for the same reason.

Two comment markers are replaced with generated HTML at build time:
`<!-- offering-catalog -->` in `content/offerings/README.md` becomes the
overview table of every offering, and `<!-- framework-stages -->` in
`content/offerings/framework.md` becomes the stage reference table. Both are
derived from the offerings themselves, so neither can drift.

Offering pages render as readable Markdown on GitHub and as a timeline on the
generated site; see `content/offerings/authoring.md` for the full contract.

## Local development

Install dependencies, then build the static site:

```bash
npm install
npm run build
```

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
