---
title: GitHub Copilot Enablement Hackathon
description: A three-day hands-on hackathon that takes a delivery team from their first Copilot prompt to reviewed, merged pull requests in their own codebase.
weight: 10
type: Hackathon
audience: [Partner developers, Customer developers, Engineering leads]
duration: 3 days on site
level: Intermediate
owner: Partner delivery lead
status: Published
updated: 2026-08-27
tags: [GitHub Copilot, Developer productivity, Adoption]
---

Most Copilot pilots stall in the same place: licences are assigned, a demo is given, and
three months later nobody can say whether anything changed. This hackathon is built to
produce evidence instead of enthusiasm. Teams work in **their own repository**, on **their
own backlog**, and the engagement is only finished when reviewed pull requests have been
merged and a small set of agreed measures have a before and after value.

It is deliberately not an introduction to Copilot. Participants should already have written
code with an assistant at least once; the three days are spent on the parts that decide
adoption — prompting against a real codebase, review discipline, tests, and the team
conventions that make any of it stick.

## Who this is for

- Delivery teams of 4–8 developers who share a codebase and a backlog.
- An engineering lead who can approve changes to the team's way of working.
- A sponsor who cares about a measurable outcome, not about a licence count.

## Delivery framework

The stages below are the shared [delivery framework](../framework.md). All eight apply to
this offering.

### Discover & Qualify

- **Timing:** T-90d → T-45d
- **Owner:** Partner account lead
- **Purpose:** Establish that there is a real backlog, a real sponsor, and a real reason to
  measure, and qualify out early if any of the three is missing.

#### Entry criteria

- An identified sponsor who owns an engineering productivity or delivery-throughput goal.
- At least one team with an active codebase and a backlog they control.

#### Activities

- Run the pitch conversation with the sponsor and the engineering lead together. Holding it
  with only one of them is the single most common cause of a hackathon that later cannot
  find participants.
- Confirm licensing: whether Copilot is already enabled, and if not, who would approve it.
- Establish which repository the teams will actually work in. "We will decide later" at this
  stage reliably becomes a sample application on day one, which invalidates the outcomes.
- Test the qualification questions below. Any "no" is a reason to propose something else
  rather than to proceed hopefully.

#### Outputs

- A qualification note recording sponsor, target teams, candidate repository, and licence
  position.
- A go or no-go recommendation with a named alternative if the answer is no.

#### Exit criteria

- Sponsor identified by name and willing to attend the close-out.
- A candidate repository named, and the teams that own it identified.
- Both sides agree the hackathon is the right instrument.

#### Resources

| Resource | Type | Audience | Link |
| --- | --- | --- | --- |
| What is GitHub Copilot | Reference | Public | [docs.github.com](https://docs.github.com/en/copilot/get-started/what-is-github-copilot) |
| Copilot feature overview | Reference | Customer | [github.com/features/copilot](https://github.com/features/copilot) |
| Qualification questions | Checklist | Internal | See "Qualification" below |

### Engage & Commit

- **Timing:** T-45d → T-30d
- **Owner:** Partner delivery lead
- **Purpose:** Convert interest into a written joint commitment: named people, locked dates,
  and outcomes that can be checked afterwards.

#### Entry criteria

- Qualification passed and a sponsor confirmed.

#### Activities

- Agree two to four target outcomes, each with a measure and a baseline. An outcome without a
  baseline cannot be reported on at stage 8, so capture the baseline **now** rather than
  reconstructing it later.
- Name the participants individually. A headcount is not a commitment; four named developers
  who have cleared their calendar is.
- Lock the dates and get them into calendars, including the close-out session at T+7d and the
  value review at T+90d. Booking the follow-ups at the end never happens.
- Agree who owns the environment, who owns the repository, and who can approve a merge.
- Confirm the data handling position: whether the repository can be used as-is, and any NDA
  or code-access constraints for the delivery team.

#### Outputs

- A signed outcome charter: outcomes, measures, baselines, participants, dates, owners.
- Calendar invitations for the delivery days, the close-out, and the T+90d review.

#### Exit criteria

- Charter agreed by the sponsor and the engineering lead.
- Named participants, with their managers aware of the time commitment.
- Delivery, close-out, and follow-up dates all in calendars.

#### Resources

| Resource | Type | Audience | Link |
| --- | --- | --- | --- |
| Outcome charter | Template | Partner | Request from the offering owner |
| Administering Copilot | Reference | Customer | [docs.github.com](https://docs.github.com/en/copilot/how-tos/administer-copilot) |

### Scope & Design

- **Timing:** T-30d → T-21d
- **Owner:** Partner delivery lead, with the engineering lead
- **Purpose:** Choose the actual backlog items the teams will work on, so day one starts with
  code rather than with a discussion about what to build.

#### Entry criteria

- Charter agreed and the working repository confirmed.

#### Activities

- Select 6–10 candidate backlog items with the engineering lead. Good candidates are real,
  independently mergeable, and small enough to finish inside a day.
- Reject items that need architectural decisions or cross-team sign-off; they will consume the
  hackathon and produce nothing merged.
- Map each target outcome to at least one candidate item, so the agenda demonstrably serves
  the charter.
- Decide the review model up front: who reviews, how fast, and what the merge bar is.
- Tailor the agenda: which sessions to keep, which to cut, and where the team's own conventions
  need discussion time.

#### Outputs

- A shortlist of candidate items, labelled in the team's own tracker.
- A tailored agenda for the three days.

#### Exit criteria

- Every target outcome maps to at least one candidate item.
- Reviewers named and available during the delivery days.

### Prepare

- **Timing:** T-30d → T-7d
- **Owner:** Participant readiness — partner delivery lead. Environment readiness — customer
  platform owner.
- **Purpose:** Run participant readiness and environment readiness as two parallel tracks.
  They have different owners and different lead times, and treating them as one task is what
  makes the long-lead items start late.

#### Entry criteria

- Participants named, dates locked, agenda tailored.

#### Activities

**Environment readiness — start at T-30d**

- Provision the training organization and confirm the licence position for every participant.
  If a trial or golden-ticket organization is being used, request it at T-30d: approval is not
  same-day, and it gates everything else on this track.
- Assign Copilot seats and verify each one resolves to a person who is actually attending.
- Confirm repository access, branch protection, and that participants can open a pull request
  in the working repository.
- Check network and proxy access from the delivery location, on the network participants will
  actually be on. Guest Wi-Fi that blocks the endpoints is discovered on day one otherwise.
- Agree and document the deprovisioning plan now, while the person who created the environment
  is still in the conversation.

**Participant readiness — start at T-14d**

- Send joining instructions with prerequisites and the pre-work.
- Collect the baseline measures agreed in the charter. This is the last practical moment.
- Confirm each participant has completed the pre-work; chase individually at T-7d.

#### Outputs

- A provisioned organization with verified seats and repository access.
- Joining instructions sent, pre-work confirmed, baselines captured.
- A written deprovisioning plan with a named owner and a date.

#### Exit criteria

- Every named participant has signed in to Copilot successfully at least once.
- Every participant can open a pull request in the working repository.
- Baseline values recorded for every measure in the charter.

#### Resources

| Resource | Type | Audience | Link |
| --- | --- | --- | --- |
| Joining instructions | Email template | Participant | [joining-instructions.md](./joining-instructions.md) |
| Environment readiness checklist | Checklist | Internal | [environment-readiness-checklist.csv](./assets/environment-readiness-checklist.csv) |
| Copilot administration | Reference | Customer | [docs.github.com](https://docs.github.com/en/copilot/how-tos/administer-copilot) |

### Readiness / Go–No-Go

- **Timing:** T-7d → T-3d
- **Owner:** Partner delivery lead
- **Purpose:** Prove the environment works by using it, then take an explicit decision while
  there is still time to act on the answer.

#### Entry criteria

- Environment provisioned and joining instructions sent.

#### Activities

- Run a dry run on the real environment, from the delivery location's network, with a real
  participant account rather than an administrator account. Administrator accounts routinely
  succeed where participant accounts fail.
- Walk one candidate backlog item end to end: prompt, change, test, pull request, review.
- Confirm reviewer availability for each delivery day.
- Take the go/no-go decision with the engineering lead and record it. "Probably fine" is a
  no-go: the point of this stage is that postponing at T-5d is cheap and failing at D0 is not.

#### Outputs

- A dry-run record listing what worked and what was fixed.
- A recorded go/no-go decision with a named decision-maker.

#### Exit criteria

- A participant-level account has completed the full loop successfully.
- Go decision recorded, or a new date agreed.

### Execute

- **Timing:** D0 → D+n
- **Owner:** Partner delivery lead
- **Purpose:** Deliver the three days and capture evidence as it is produced, not afterwards
  from memory.

#### Activities

**Day 1 — working in the real codebase**

- Short framing session, then straight into a candidate item. The first merged pull request
  should happen on day one; it changes the tone of the remaining two days.
- Prompting against an existing codebase: context, conventions, and why generic prompts
  produce generic results here.
- Review discipline: what to check in generated code, and what the team's merge bar is.

**Day 2 — depth**

- Tests and refactoring against real code.
- Team conventions: agreeing what the team will actually do differently, in writing.
- Mid-point check against the charter outcomes; adjust the remaining agenda if an outcome is
  not being served.

**Day 3 — evidence**

- Finish and merge the remaining work.
- Teams prepare a short demo of what shipped and what it cost them.
- Capture measures against the charter baselines while everyone is still present.

#### Outputs

- Merged pull requests in the team's own repository.
- A written set of team conventions, owned by the engineering lead.
- Post-values for each charter measure.

#### Exit criteria

- At least one merged pull request per team.
- Every charter measure has a post-value recorded.

#### Resources

| Resource | Type | Audience | Link |
| --- | --- | --- | --- |
| Facilitator run sheet | Deck | Internal | Request from the offering owner |
| Copilot documentation | Reference | Participant | [docs.github.com](https://docs.github.com/en/copilot) |

### Wrap & Close-out

- **Timing:** D0 → T+7d
- **Owner:** Partner delivery lead
- **Purpose:** Capture outcomes and feedback while participants are still in the room, and
  deprovision the environment before it becomes a cost and a security liability.

#### Entry criteria

- Delivery days complete.

#### Activities

- Run the demos with the sponsor present. A sponsor who watches their own team demo their own
  merged code is the entire follow-up conversation.
- Collect feedback before people leave the room. Response rates collapse the moment the session
  ends; a survey sent the next morning is a survey nobody answers.
- Write the outcome summary against the charter: measure, baseline, post-value, and an honest
  note where an outcome was not met.
- Execute the deprovisioning plan: remove temporary seats, close the trial organization, revoke
  access granted for the engagement, and confirm in writing that it is done.
- Agree the follow-up commitments and who owns each one.

#### Outputs

- An outcome summary shared with the sponsor.
- Feedback collected and summarised.
- Written confirmation that the environment has been deprovisioned.
- A commitment list with named owners and dates.

#### Exit criteria

- Sponsor has received the outcome summary.
- Deprovisioning confirmed in writing.
- Every follow-up commitment has an owner and a date.

### Follow-up & Value realization

- **Timing:** T+7d → T+90d
- **Owner:** Partner account lead
- **Purpose:** Make sure the commitments are kept, the value shows up in the team's normal
  work, and what was learned improves this offering.

#### Entry criteria

- Outcome summary delivered and commitments agreed.

#### Activities

- Check in at T+30d against the commitment list. Commitments not checked at 30 days are rarely
  kept at 90.
- Confirm at T+30d that the team conventions from day two are still in use, and find out why
  if they are not. This is usually where the real adoption blocker surfaces.
- Run the T+90d value review with the sponsor: charter measures re-taken, against the same
  baselines.
- Progress the next step agreed with the sponsor, whether that is a wider rollout, another
  team, or a different offering.
- Run the internal retrospective and change this offering. A retrospective that does not edit
  this page has not happened.

#### Outputs

- A T+30d commitment status note.
- A T+90d value review with re-measured outcomes.
- Edits to this offering, or a recorded decision that no change is needed.

#### Exit criteria

- T+90d review held with the sponsor.
- Retrospective actions applied to this offering, and the `updated` date changed.

## Qualification

Ask these before proposing dates. Any "no" is a reason to propose something else.

- Is there a named sponsor who owns a delivery or productivity goal, and will they attend the
  close-out?
- Will teams work in a repository they own, with a backlog they control?
- Can pull requests actually be merged during the three days, or does review sit outside the
  team?
- Are the participants able to clear three consecutive days?
- Can a baseline be captured before delivery?

## What this offering does not cover

- Licence procurement and commercial negotiation.
- Organisation-wide rollout planning, which is a separate engagement.
- Security review of generated code beyond the team's existing review process.
