---
title: Authoring an offering
description: The front matter, stage blocks, and resource tables that make an offering render as a timeline and appear in the catalog.
weight: 20
---

An offering is one folder under `content/offerings/` containing a `README.md`. That single
file holds all of the offering's content: the build renders it as a timeline on this site,
and GitHub renders the same file as plain Markdown in the repository. Nothing here requires
raw HTML, so both views stay readable.

```text
content/offerings/
  README.md                     the catalog page (table is generated)
  framework.md                  the shared framework
  authoring.md                  this page
  my-offering/
    README.md                   the offering
    assets/                     decks, PDFs, images (copied verbatim)
```

## Front matter

```yaml
---
title: GitHub Copilot Enablement Hackathon
description: One sentence, shown on the catalog card and in page cards.
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

`title`, `description`, and `weight` drive navigation and ordering, as they do for any page.
The remaining fields populate the offering header, the catalog card, and the catalog filters. Multi-value fields
use a YAML flow sequence (`[one, two]`), which keeps the front matter valid YAML for anything
else that reads it.

`status` is free text. The one value the build treats specially is `Template`: an offering
with that status is a scaffold, so it is kept out of the catalog listing while still being
validated on every build.

## Stage blocks

Stages live under a single `## Delivery framework` heading. Each stage is an `###` heading
whose title must be one of the eight framework stages, and stages must appear in framework
order.

```markdown
## Delivery framework

### Prepare

- **Timing:** T-30d → T-7d
- **Owner:** Partner delivery lead
- **Purpose:** Get participants and environments ready on two parallel tracks.

#### Entry criteria

- Dates and participant list are locked.

#### Activities

- Request AI capacity quota. Start at T-30d; approval is not same-day.
- Send joining instructions with prerequisites.

#### Outputs

- Provisioned environment, one per team.

#### Exit criteria

- Every participant has signed in successfully at least once.

#### Resources

| Resource | Type | Audience | Link |
| --- | --- | --- | --- |
| Joining instructions | Email template | Participant | [joining-instructions.md](./assets/joining-instructions.md) |
```

The bullets directly under a stage heading are its fields. Only `Timing`, `Owner`, `Purpose`,
and `Status` are accepted, and they must be written as `- **Label:** value`. Any other bold
bullet in that position fails the build rather than being silently ignored, which is what
catches a mistyped field name.

The `####` subsections are `Entry criteria`, `Activities`, `Outputs`, `Exit criteria`, and
`Resources`. Each is optional. Anything you write inside them is ordinary Markdown.

Content before `## Delivery framework`, and any `##` section after the stages, is rendered as
normal page content. Use the space before the framework for the pitch and the space after it
for reference material.

## Timing anchors

`Timing` uses the fixed vocabulary described in the
[delivery framework](./framework.md): `T-<n>d|w|m` before delivery, `D0` and `D+<n>` or `D+n`
during it, `T+<n>d|w|m` after it, either alone or as a `from → to` range. An unrecognised
token fails the build with the token quoted back at you.

## Stages that do not apply

Declare the stage anyway and say so:

```markdown
### Scope & Design

- **Status:** Not applicable — the curriculum is fixed and is not tailored per customer.
```

The stage then renders in the timeline as explicitly not applicable. A stage heading with no
fields and no content renders as "declared, but no content has been captured yet", so an
unfinished offering looks unfinished instead of looking deliberate.

## Resources

The `Resources` table always has the same four columns, in this order:

| Resource | Type | Audience | Link |
| --- | --- | --- | --- |
| Offering pitch deck | Deck | Partner | `[pitch.pptx](./assets/pitch.pptx)` |

`Audience` must be one of `Internal`, `Partner`, `Customer`, `Participant`, or `Public`, and
is rendered as a visible tag next to the resource, so internal-only material stays recognisable
at the point where somebody is about to send it on. A wrong header or an unknown audience
fails the build.

## Links and files

Put decks, PDFs, and images in the offering's `assets/` folder. That folder is copied to the
site verbatim and is not turned into a navigation entry, so it needs no `README.md`.

Write links the way you would for the repository — `./assets/pitch.pptx`,
`./participant-guide.md`, `../framework.md` — and the build rewrites them to the URL this site
serves. The same link therefore works both in GitHub and on the published page. Links are only
rewritten when the target file actually exists, so a typo stays visible as a broken link
instead of becoming a plausible-looking wrong URL.

## What the build checks

`npm run build` fails, listing every problem at once, when an offering:

- uses a `###` heading under `## Delivery framework` that is not a framework stage;
- declares stages out of framework order, or declares one twice;
- uses an unknown stage field or an unknown `####` subsection;
- uses a timing token outside the vocabulary;
- has a `Resources` table with the wrong header, a short row, or an unknown audience.

Start from the [offering template](./offering-template/README.md), which contains every stage
with its fields already in place.
