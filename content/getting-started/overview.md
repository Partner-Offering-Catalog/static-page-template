+++
title = 'Overview'
description = 'Understand how pages and sections become navigation entries.'
weight = 10
+++

Hugo treats folders with `_index.md` files as sections. The sidebar template recursively walks those sections and pages, so nested folders become nested navigation.

```text
content/
  getting-started/
    _index.md
    overview.md
  reference/
    _index.md
    architecture/
      _index.md
      folder-structure.md
```
