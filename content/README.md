---
title: Static Page Template
description: Create a polished documentation website from Markdown folders while keeping a professional Microsoft-inspired look and feel.
weight: 1
---

Use this repository as a starting point for static documentation that stays close to the content layout of the consuming repository. Create folders under `content/` and the left navigation will mirror that folder hierarchy automatically, always linking each entry to its folder's `README.md`.

## What this template provides

- A sticky Microsoft-inspired header with source links and a light/dark theme toggle.
- A collapsible, multi-level left navigation tree built from the `content/` folder structure.
- Clean cards, readable typography, breadcrumbs, and responsive layouts.
- A minimal configuration suitable for publishing with GitHub Pages.

## Content model

Every folder under `content/` becomes a navigation entry, and its `README.md` is always the page shown when that entry is selected. Add regular Markdown files alongside `README.md` for individual pages, and nested folders for sub-entries. Use `weight` in front matter to control ordering.
