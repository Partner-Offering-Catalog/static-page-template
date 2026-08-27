---
title: Delivery framework
description: The eight stages every offering is described against, from first conversation to realized value.
weight: 10
---

An offering is not a deck. It is a sequence of commitments that starts weeks before delivery
day and finishes weeks after it, and most failed engagements fail in the gaps between those
commitments rather than in the room on the day.

This framework names those gaps. Every offering in the catalog is described against the same
eight stages so that a reader can compare two offerings, spot what an offering is missing,
and know who owns what and when.

## The stages

<!-- framework-stages -->

Six stages are **core**: an offering that omits one is usually missing something rather than
deliberately skipping it. Two are **optional** and genuinely do not apply to every offering.

## Why these eight and not five

An earlier draft of this framework had five stages. Three of them were carrying two jobs at
once, with different owners and different clocks:

- **Discover** was doing both *positioning* and *qualification*. Merging them means unsuitable
  engagements are discovered during Prepare, when environments are already being provisioned
  and dates are already in calendars. Stage 1 makes qualification an explicit gate.
- **Preparation** was doing both *participant readiness* and *environment readiness*. These
  have different owners and, more importantly, different lead times: an AI quota request is a
  T-30d item while a joining instruction email is a T-7d item. Collapsing them into one stage
  is exactly what makes quota requests start late. Stage 4 runs them as two named tracks.
- **Wrap & Follow-up** was doing both *close-out* and *value realization*. Close-out has a hard
  deadline measured in hours: outcomes, demos, and feedback have to be captured while the
  participants are still in the room, and the environment has to be deprovisioned before it
  becomes a cost and security liability. Value realization runs for the next quarter. One
  stage cannot carry both clocks, so stages 7 and 8 split them.

**Scope & Design** (3) and **Readiness / Go–No-Go** (5) were added as optional stages. Scope
and design is real work for a hackathon and meaningless for fixed-curriculum training.
Readiness is where most delivery failures are still catchable: a dry run on the environment
participants will actually use, followed by an explicit go/no-go decision taken while there is
still time to act on it.

## Timing anchors

Every stage carries a timing anchor relative to delivery day, so an offering communicates
lead time rather than just sequence. Anchors use a fixed vocabulary:

| Token | Meaning |
| --- | --- |
| `T-90d`, `T-30d`, `T-6w` | Before delivery, in days (`d`), weeks (`w`), or months (`m`) |
| `D0` | Delivery day |
| `D+1`, `D+2` | Subsequent delivery days |
| `D+n` | The last delivery day, whenever that is |
| `T+7d`, `T+90d` | After delivery |

A stage may use a single token (`D0`) or a range (`T-30d → T-7d`). The build rejects anything
outside this vocabulary, so anchors stay comparable across offerings.

## What is deliberately not a stage

Roles and RACI, risks, compliance and legal (NDA, data handling, credit terms), the cost and
funding model, and accessibility and language are all cross-cutting. They apply to several
stages at once, so they belong in an offering's header or in a stage's own fields, not as
stages of their own. A "compliance stage" would only ever be a place where compliance is
forgotten for the other seven.

## Stage content

Each stage declares the same shape, and every field is optional:

| Field | Purpose |
| --- | --- |
| Timing | The anchor, from the vocabulary above |
| Owner | The one accountable role for the stage |
| Purpose | One or two lines on why the stage exists for this offering |
| Entry criteria | What must be true before the stage starts |
| Activities | The work itself |
| Outputs | What the stage produces |
| Exit criteria | The definition of done, and the gate into the next stage |
| Resources | Decks, docs, templates, and repositories, each tagged with its audience |

Resources are audience-tagged (`Internal`, `Partner`, `Customer`, `Participant`, `Public`) so
that material which must not be forwarded to a customer is visibly marked as such at the point
of use, rather than in a convention that a delivery lead has to remember.

An offering declares only the stages it uses. A stage that genuinely does not apply should
still be declared, marked `Not applicable`, and given a reason: a reader can then tell the
difference between "we thought about this and it does not apply" and "nobody has written this
yet". See [authoring an offering](./authoring.md) for the exact syntax.
