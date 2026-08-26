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
  "brand": "My Team",
  "description": "Static documentation for my repository.",
  "repositoryLabel": "Source",
  "repositoryUrl": "https://github.com/example/repository"
}
```
