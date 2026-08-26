# static-page-template

A Hugo template for rendering clean, professional static pages from Markdown content
without adding presentation clutter to consuming repositories.

The template is inspired by the Microsoft-style look and feel 
it uses a Segoe UI font stack, Fluent blue accents, a polished hero area, card
surfaces, a Microsoft tile mark, and light/dark theme support.

## Features

- Hugo layouts for home, section, and content pages.
- Multi-level left navigation generated from the folder structure under
  `content/`.
- Breadcrumbs and section cards for easy exploration.
- Responsive layout that keeps the sidebar readable on desktop and stacks it on
  smaller screens.
- No JavaScript framework or package manager required.

## Content structure

Create folders under `content/` and add `_index.md` files for navigation groups.
Regular Markdown files become pages. Hugo `weight` values control ordering.

```text
content/
  _index.md
  getting-started/
    _index.md
    overview.md
  reference/
    _index.md
    architecture/
      _index.md
      folder-structure.md
```

Example page front matter:

```toml
+++
title = 'Folder Structure'
description = 'Recommended repository layout for content-driven navigation.'
weight = 10
+++
```

## Local development

Install Hugo, then run:

```bash
hugo server
```

Build the static site with:

```bash
hugo --minify
```

The generated output is written to `public/`, which is intentionally ignored by
Git.

## Customization

Update `hugo.toml` to set the site title, brand, repository URL, footer note,
and hero summary cards:

```toml
title = 'My Static Site'

[params]
  brand = 'My Team'
  description = 'Static documentation for my repository.'
  repositoryLabel = 'Source'
  repositoryUrl = 'https://github.com/example/repository'
```
