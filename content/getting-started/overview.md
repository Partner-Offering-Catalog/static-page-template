---
title: Overview
description: Understand how folders and pages become navigation entries.
weight: 10
---

Folders with a `README.md` file become navigation entries. The sidebar recursively walks those folders and pages, so nested folders become nested, collapsible navigation, and each entry always links to its folder's `README.md`.

```text
content/
  getting-started/
    README.md
    overview.md
  reference/
    README.md
    architecture/
      README.md
      folder-structure.md
```
