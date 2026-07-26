# HireLens — Design Decision Log

**Version 1.0 · Permanent · Internal**
**Structure: Frozen** (§1–§9 — schema, lifecycle, status model, required fields, cross-reference strategy, governance rules) · **Records: Active** (§10–§11)
**Change policy:** new records freely; structural change by amendment only.
Owner: Product Design & Design Operations
Authority: Record, not rule. This document does not govern; it explains. Governance lives in the Bible and the Checklist.
Governing documents: [`MARKETING_DESIGN_BIBLE.md`](./MARKETING_DESIGN_BIBLE.md) (**the Bible**) · [`DESIGN_REVIEW_CHECKLIST.md`](./DESIGN_REVIEW_CHECKLIST.md) (**the Checklist**)

---

## What this document is

**The permanent memory of HireLens.**

The Bible states what we believe. The Checklist enforces it. Neither of them records *how we arrived there* — which alternatives were live, what we gave up, what we were worried about, and what would make us reconsider. That reasoning is the most perishable asset a product team owns. It lives in the heads of the four people who were in the room, and it leaves when they do.

This log exists so that a person joining HireLens in 2028 can read a decision, disagree with it, and **disagree with it accurately** — arguing against the reasoning we actually used rather than the reasoning they assume we used. That is the entire purpose. A team that cannot reconstruct why it chose something will either defend it superstitiously or overturn it carelessly, and both failures are expensive in the same way.

## What this document is not

**Not meeting notes.** Meetings produce decisions; they also produce discussion, tangents, and half-formed positions. Only the decision is recorded, and only once it is a decision.

**Not a changelog.** A changelog records what changed. This records *why the change was the right one and what it cost.* A change with no reasoning behind it does not belong here — it belongs in git.

**Not documentation history.** Documents get versions; decisions get records. A document revision is only logged here when it encodes a decision, and then the record is about the decision, not the edit.

**Not a status board.** Nothing here tracks progress. A decision is not a task, and this log is not where work is coordinated.

**Not a governance document.** This log records decisions; it does not create obligations. **Nothing in this file can override the Bible or the Checklist**, and a record that appears to do so is a defect in the record (§7.4).

## How to read a record

Two fields carry disproportionate value and are worth reading before anything else:

**Why Alternatives Were Rejected** — this is what separates a decision from a preference. If the rejection reasoning is thin, the decision was probably not made so much as arrived at, and it should be held loosely.

**Trade-offs** — what we knowingly gave up. A record with an empty trade-offs field is either incomplete or describes a decision so obvious it did not need recording. Every real decision costs something; the field exists to make sure the cost was seen rather than discovered later.

---

# 1. Decision Lifecycle

## The five statuses

A decision moves through a defined sequence. The status is the single most important field in the record, because it tells a reader whether they are looking at current reality, history, or an open question.

### Proposed

The decision is written down and under consideration. **A proposal is a real record with a real ID, not a draft.** It carries every field, including the trade-offs and risks, because the point of writing them is to inform the decision rather than to document it afterward.

*Why proposals are logged at all:* rejected proposals are among the most valuable records in the log. A future contributor proposing something we already considered and rejected should find that reasoning immediately, and either accept it or bring new evidence against it. **The most expensive form of institutional forgetting is re-litigating a settled question with less information than the first time.**

*Exit:* → Accepted, or → Rejected. A proposal that has sat unresolved for more than one quarter is a signal — either the decision does not need to be made yet, or nobody owns it.

### Accepted

The decision is in force. It shapes work, it constrains review, and departing from it requires a new decision — not an exception.

*Entry requirement:* an owner (§5), a written rationale, and a review trigger. A record without a review trigger is not eligible for Accepted status, because a decision nobody will ever revisit is a decision that will silently become wrong.

### Rejected

Considered and declined. **Permanent — rejected records are never deleted and never edited into acceptance.** If we later decide the other way, that is a *new* decision that supersedes the rejection, and the trail shows we changed our minds. That trail is the useful part.

### Superseded

Replaced by a later decision. The record stays exactly as written, with a pointer to the record that replaced it.

*Why not just update the original:* because the original was correct in its context, and understanding why the context changed is usually more instructive than the new decision itself. Editing history to look consistent destroys the only evidence of how our thinking developed. See §7.

### Deprecated

Still technically in force but no longer recommended, and expected to be superseded. **The honest status for a decision we have lost confidence in but have not yet replaced.**

*Why this status exists:* without it, teams face a false binary — leave a decision Accepted (implying endorsement it no longer has) or supersede it before a replacement exists (leaving a vacuum). Deprecated states the truth: *this still applies, we no longer believe in it, don't build new things on it.*

*Every Deprecated record carries a reason and, where possible, a direction.* "Deprecated" with no explanation is worse than Accepted, because it withdraws guidance without providing any.

## Lifecycle diagram

```
                 ┌──────────┐
                 │ Proposed │
                 └────┬─────┘
             ┌────────┴────────┐
             ▼                 ▼
       ┌──────────┐      ┌──────────┐
       │ Accepted │      │ Rejected │  ← permanent, never edited
       └────┬─────┘      └──────────┘
            │                  ▲
            │                  │ (new record supersedes;
            │                  │  the rejection stands)
            ▼
     ┌────────────┐
     │ Deprecated │  ← in force, no longer recommended
     └─────┬──────┘
           ▼
     ┌────────────┐
     │ Superseded │ ──→ points forward to its replacement
     └────────────┘
```

**One-way only.** A record never moves backward. Superseded does not return to Accepted; a reversal is a new record superseding the superseder. The log grows; it does not rewind.

## Status transitions and who may make them

| Transition | Authority | Requirement |
|---|---|---|
| → Proposed | Anyone | Complete record, all fields |
| Proposed → Accepted | Decision owner (§5) | Rationale, trade-offs, review trigger |
| Proposed → Rejected | Decision owner | Rejection reasoning — the most-read field in a rejected record |
| Accepted → Deprecated | Decision owner | Stated loss of confidence and, where known, a direction |
| Accepted/Deprecated → Superseded | Owner of the *superseding* record | Forward pointer, and §7 superseding rules satisfied |
| Any → deleted | **Nobody** | Records are never deleted. See §8. |

---

# 2. Decision Categories

Categories exist for two reasons: they make the ID meaningful at a glance, and they determine ownership (§5). They are deliberately few — a taxonomy with twenty categories produces arguments about categorization rather than clarity.

| Code | Category | Scope | Default owner |
|---|---|---|---|
| **POS** | Positioning & Category | What we are, what we sell, what we claim and refuse to claim | Product Owner |
| **BRD** | Brand & Expression | Personality, voice, metaphor, emotional arc | Design Owner |
| **GOV** | Governance | Authority of documents, process, amendment rules, gates | Design Ops |
| **PRD** | Product Principles | What the product does and refuses to do; feature philosophy | Product Owner |
| **IA** | Information Architecture | Structure, navigation, lexicon, canonical homes | UX Owner |
| **UX** | Interaction & Flow | Task design, states, effort, feedback, error handling | UX Owner |
| **VIS** | Visual System | Surface language, color, type, depth, density, tokens | Design Owner |
| **MOT** | Motion | Motion purpose, timing character, restraint rules | Design Owner |
| **AIX** | AI Experience | Traceability, confidence, explanation, override, failure | AI Owner |
| **MKT** | Marketing | Page strategy, storytelling, proof, CTA philosophy | Marketing Owner |
| **ENG** | Engineering & Platform | Design-affecting technical decisions: tokens, performance budgets, component strategy | Engineering Owner |

**Owners are roles, not people** — defined in Checklist §16. On a small team one person holds several. That is expected; what is not permitted is a category with no owner, because an unowned category is one where decisions get made without records.

**A decision belongs to exactly one category.** Where it plausibly fits two, it belongs to the one whose owner would be *most damaged by getting it wrong* — that is the person who must be accountable for it. Cross-category impact is captured in **Related Product Areas**, not by dual-filing.

---

# 3. Decision ID Convention

```
DDL-<CAT>-<NNN>
 │     │     └── zero-padded sequence, per category, never reused
 │     └──────── three-letter category code (§2)
 └────────────── Design Decision Log
```

Examples: `DDL-POS-001` · `DDL-GOV-004` · `DDL-AIX-001`

## Rules

**Sequence is per category, not global.** `DDL-POS-003` and `DDL-VIS-003` coexist. Per-category numbering means a new decision can be filed without checking a global counter, which matters when several people are recording decisions in the same week.

**IDs are permanent and never reused.** A rejected `DDL-UX-007` leaves that number retired forever. Reuse would make every historical citation ambiguous, and citations are the entire value of an ID.

**IDs never change status-based prefixes.** A superseded record keeps its ID. Encoding status in the ID would break every prior reference the moment status changed — the exact failure this convention exists to prevent.

**Cite by ID, never by title.** Titles are edited for clarity; IDs are not. Any reference in code comments, review records, commit messages, or documents uses the ID, optionally with the title for readability: `DDL-POS-002 (AI is a supporting capability)`.

**Sub-decisions are not a thing.** There is no `DDL-POS-001.a`. A decision that needs subdivision is two decisions, and treating it as one is usually how a record ends up with an unclear owner.

---

# 4. Cross-Reference Strategy

A decision that cannot be traced in both directions is a decision that will be violated by someone who never knew it existed.

## Four reference axes

Every record carries all four. Each answers a different question a future reader will actually ask.

**1. Related Decisions** — *what other decisions does this depend on or constrain?*
Reciprocal by rule: if A cites B, B must cite A. One-directional links rot silently, and the rot is invisible until someone follows a chain that dead-ends. Relationship types:
- **Depends on** — this decision is only coherent if that one holds. If it is superseded, this record is automatically due for review.
- **Constrains** — this decision limits the option space for that one.
- **Supersedes / Superseded by** — see §7.
- **Related** — informative adjacency, no dependency.

**2. Related Governance Documents** — *what authority does this decision derive from, or feed into?*
Cited by chapter or section: `Bible Ch. 2` · `Checklist §8.11`. **The direction matters and must be explicit:**
- *Derives from* — governance already required this; the record explains the application. Most records.
- *Encoded in* — this decision was made first and the governance document records it. The governance text is authoritative; this record holds the reasoning behind it.
- *Would require amendment* — the decision cannot be implemented under current governance. **This is a conflict, not a note.** It cannot be Accepted until the amendment concludes (§6).

**3. Related Product Areas** — *who is affected?*
Named surfaces, not abstractions. This is the field that makes the log searchable in the way people actually search it: someone about to work on candidate review wants every decision touching candidate review, regardless of category.

**4. Review Trigger** — *what would make this decision wrong?*
The most forward-looking field in the record, and the one most often written lazily. A date is the weakest possible trigger — time does not make decisions wrong, changed conditions do. **Prefer a condition:** a competitor's move, a scale threshold, a research finding, the supersession of a dependency, a change in what models can do.

## The conflict rule

**A record may never contradict the Bible or the Checklist.**

Where a decision requires something governance forbids, the record is filed as **Proposed** with `Related Governance Documents: would require amendment`, and a GAP is opened (§6). It stays Proposed until the amendment resolves. **It is never Accepted "pending" an amendment**, because an accepted-pending record is an implementation-specific exception wearing a different label — precisely what Checklist §18 Level 4 exists to prevent.

---

# 5. Decision Ownership

## What an owner is

**The person accountable for the decision being right, and for noticing when it stops being right.**

Not the person who made it, not the person who wrote it down, and not the person with the most authority in the room. Ownership is about *maintenance* — decisions decay, and a decision with no owner decays unobserved.

## What the owner does

- **Decides the status.** Only the owner moves a record between statuses (§1).
- **Watches the review trigger.** The owner is the person who should notice when the condition fires. Nobody else is looking.
- **Answers "why is this like this?"** — and if they cannot, the record is inadequate and that is the owner's problem to fix.
- **Owns the trade-offs field.** Empty trade-offs on a non-trivial decision is an ownership failure, not a documentation one.

## What the owner does not do

**Owning a decision is not owning the area.** The owner of `DDL-VIS-001` does not control every visual choice; they are accountable for that specific decision holding up. Confusing the two turns a log into a permissions system.

**The owner does not have veto over work that touches the decision.** Vetoes live in Checklist §16 and belong to review roles. A decision owner who blocks work by invoking their own record has confused a record with governance — the record explains, the Checklist enforces.

## Default ownership and reassignment

Ownership defaults to the category owner (§2), which means every decision has an owner from the moment it is filed. It may be reassigned to a specific individual where that produces sharper accountability.

**Reassignment is recorded in Amendment History, with a date.** Ownership that changes silently is ownership that has lapsed — the most common way a review trigger goes unwatched is that everyone assumes someone else inherited it.

**When a person leaves, their decisions revert to the category owner,** who reviews them within a quarter. This is the moment institutional memory is most at risk and the moment nobody has time to think about it, which is why the rule is written down.

---

# 6. Amendment Workflow

## Two distinct things, deliberately kept separate

**Amending a record** — the record was wrong, incomplete, or unclear. The *decision* has not changed.
**Amending governance** — a Bible chapter or Checklist section must change. That is a **GAP** (Governance Amendment Proposal), and it is a heavier process because governance is more stable than everything it governs.

Conflating these is the failure this section prevents. A record edit must never become a backdoor into governance change.

## Amending a record

Permitted without ceremony, because record quality should improve freely:

- Clarifying language that does not alter meaning
- Adding evidence, context, or consequences observed since
- Correcting a factual error
- Adding a cross-reference
- Recording an ownership change

**Every amendment appends to Amendment History with date, author, and what changed.** The original text is not rewritten to look as though it always said the new thing.

**Not permitted as a record amendment:** changing the decision, reversing a rejection, or altering the reasoning to match a later view. **Those are new decisions.** The line is simple — *if a reader's understanding of what we decided would change, it is not an amendment.*

## Governance Amendment Proposal (GAP)

Triggered when work uncovers a gap, inconsistency, ambiguity, or missing principle in the Bible or the Checklist.

**The rule that makes this work: stop. A discovered gap is not permission to create an exception**, and the pressure to treat it as one is highest exactly when the schedule is tightest.

**The GAP sequence:**

1. **Stop.** Do not implement around it, and do not reinterpret the frozen text to accommodate the work.
2. **Document the issue.** What was being attempted, what governance says, and precisely where the collision is — by chapter or section.
3. **File the GAP** as a `DDL-GOV-nnn` record in **Proposed** status.
4. **Classify it** as exactly one of:
   - **Clarification** — governance is correct; the wording admits a reading it did not intend. Text changes, meaning does not.
   - **Correction** — governance is factually or logically wrong. Meaning changes.
   - **New principle** — governance is silent on something it should cover. Meaning is added.
   - **Deprecated principle** — governance requires something we no longer believe. Meaning is withdrawn.
5. **Assess impact across every governance document.** Both files, every affected chapter, section, checkpoint, gate, weight, and role. **A GAP that names only one document has almost certainly not been assessed** — the Bible and the Checklist are coupled by design.
6. **Recommend one of:**
   - **No amendment required** — the most common and most valuable outcome. Usually the governance was right and the proposal was wrong, which is the system working.
   - **Minor amendment (v1.0.x)** — clarification or addition that would not change how any past artifact was reviewed or scored.
   - **Major amendment (v2.0)** — anything that would change a past verdict: a gate, a weight, a precedence rank, a principle, or a claim boundary.
7. **Wait for approval.** Governance does not change until the process concludes. Work either proceeds within existing governance or waits.

**Approval authority:** Design Ops for clarifications. For corrections, new principles, and deprecations, the owner of the affected area *plus* the role holding any veto the change touches (Checklist §16). **Amendments touching blocking gates or the §18 precedence order require the veto holder's explicit approval and cannot be approved by the Approver alone.**

## The non-negotiables

Restated here because this is where they will be tested:

- **Never silently reinterpret a frozen document.** If the text does not say what you need, it does not say it.
- **Never create implementation-specific exceptions.** An exception granted once is a precedent, and precedent is how frozen documents thaw.
- **Never bypass a blocking gate.** The five gates (Checklist §15) are not subject to schedule.
- **Governance must remain more stable than implementation.** Implementation adapts to governance. Governance adapts only when the amendment process concludes governance itself is wrong.

---

# 7. Superseding Rules

## 7.1 Supersession is addition, never edit

A superseded record is left **exactly as written**. The new record points back; the old record points forward. Both remain readable in full.

*Why:* the old decision was usually correct in its context. What a future reader needs is not the conclusion but the *delta* — what changed such that a reasonable decision became an unreasonable one. Editing the old record to match current thinking destroys the only evidence of that, and produces a log that appears to have been right about everything, which is both false and useless.

## 7.2 A superseding record must explain the change in conditions

Naming the new decision is not sufficient. The record states **what changed** — new evidence, a shift in the market, a scale threshold crossed, a dependency superseded, a capability that did not previously exist.

*Why:* "we changed our minds" is not a reason, and a log full of unexplained reversals teaches future contributors that decisions here are arbitrary — which then licenses them to reverse things arbitrarily.

## 7.3 Partial supersession is not permitted

A record is superseded whole or not at all. Where only part of a decision changes, the correct move is to supersede the entire record and restate the surviving parts in the new one.

*Why:* partially-superseded records force every future reader to reconstruct which clauses still apply. The reconstruction is error-prone and is performed independently by every reader, forever. Restating costs the author ten minutes once.

## 7.4 A record cannot supersede governance

**Records never override the Bible or the Checklist.** A decision that would require a governance change is Proposed, blocked, and routed to a GAP (§6). A record found to contradict governance is a defect in the record — it is corrected or superseded, and the governance stands.

*Why this is stated as a rule rather than assumed:* a decision log accumulates authority through use. Over time, people cite records as though they were rules, and a sufficiently-cited record starts to function as one. This clause is what stops the log from quietly becoming a third governance document that nobody approved.

## 7.5 Dependents are reviewed when a dependency is superseded

Superseding a record obliges the owner to review every record that **depends on** it (§4). Each dependent is confirmed still valid, amended, or superseded in turn — and the review is recorded even when the answer is "still valid."

*Why:* this is the single most common way a decision log becomes misleading. The dependency is updated, the dependents are not, and a reader following a chain finds current reasoning resting on withdrawn foundations.

## 7.6 Rejections are never superseded into acceptance

Deciding the other way later produces a **new record** that supersedes the rejection. The rejection stands, in full, showing what we thought and when.

*Why:* the pair — a rejection followed by a reversal — is more informative than either alone. It shows the decision was genuinely difficult and tells a future contributor that the question has two defensible sides. Erasing the rejection would present a hard call as an obvious one.

---

# 8. Archiving Policy

## Nothing is deleted

**No record is ever removed from this log.** Not rejected ones, not superseded ones, not ones that turned out to be embarrassing.

*Why this is absolute:* the value of the log is proportional to its completeness. A log that has been curated is a log a reader cannot trust, because they cannot know what was removed or on what basis. **A decision log with survivorship bias is worse than no log** — it presents a history of good decisions and teaches false confidence.

## Archiving is presentation, not deletion

Once the log exceeds comfortable reading length, superseded and rejected records move to a dated archive file (`DESIGN_DECISION_LOG_ARCHIVE_<year>.md`) with:

- The full record, unchanged.
- Its ID, permanently resolvable.
- A one-line stub remaining in the main register pointing to the archive.

**IDs stay resolvable forever.** An archived record is still citable and still found by searching its ID. Archiving that breaks references is deletion with extra steps.

## What stays in the main file

- Every **Accepted** and **Deprecated** record, in full — these describe current reality.
- Every **Proposed** record — these are open questions and belong in front of people.
- A one-line register entry for every record ever created, whatever its status (§10).

## Archive review

At each archive event, the archivist checks that every superseded record has a resolvable forward pointer and every dependent was reviewed (§7.5). **This is the only routine integrity check the log receives**, so it is not skipped — a log whose links have rotted is a log people stop consulting, and a log people stop consulting stops being written to shortly after.

---

# 9. Record Template

Every record carries all nineteen fields. A field with nothing to say is marked `None` with a reason — **an omitted field is indistinguishable from an unconsidered one**, and the two have very different meanings to a future reader.

**This template is frozen at v1.0.** Fields are not added, removed, or renamed for a particular record's convenience; doing so is a structural change requiring a GAP (§6, Version History). A decision that does not fit the schema is a signal to file a GAP or to split the record (§3) — never to file it in a different shape.

```markdown
## DDL-<CAT>-<NNN> — <Title>

**Status:** Proposed | Accepted | Rejected | Superseded | Deprecated
**Date:** YYYY-MM-DD
**Owner:** <role or person>

**Decision Summary**
One sentence. What was decided.

**Context**
What was true at the time. The conditions a future reader will not have.

**Problem Statement**
The question this answers, stated as a question.

**Alternatives Considered**
Each real option, described fairly enough that its advocate would recognize it.

**Why Alternatives Were Rejected**
Per alternative. The most-read field in the record.

**Final Decision**
What we do, precisely enough to be checkable.

**Expected Benefits**
What we expect to gain, stated so it can later be judged true or false.

**Trade-offs**
What we knowingly gave up. Never empty on a real decision.

**Risks**
What could make this wrong, and how we would find out.

**Consequences**
What this forces to be true elsewhere. The obligations it creates.

**Related Decisions**
IDs with relationship type. Reciprocal.

**Related Governance Documents**
Chapter or section, with direction: derives from | encoded in | would require amendment.

**Related Product Areas**
Named surfaces affected.

**Review Trigger**
The condition that would make this decision worth revisiting.

**Amendment History**
Date · author · what changed. Appended only.
```

---

# 10. Decision Register

Every record ever created, current status, one line each. **The register is never pruned** — archived records keep their row with a pointer.

| ID | Title | Category | Status | Date |
|---|---|---|---|---|
| [DDL-POS-001](#ddl-pos-001--hirelens-is-positioned-in-the-decision-intelligence-category) | HireLens is positioned in the Decision Intelligence category | POS | **Accepted** | 2026-07-25 |
| [DDL-POS-002](#ddl-pos-002--decision-intelligence-is-the-product-ai-is-a-supporting-capability) | Decision Intelligence is the product; AI is a supporting capability | POS | **Accepted** | 2026-07-25 |
| [DDL-POS-003](#ddl-pos-003--explicit-claim-boundaries-what-hirelens-will-never-claim) | Explicit claim boundaries — what HireLens will never claim | POS | **Accepted** | 2026-07-25 |
| [DDL-BRD-001](#ddl-brd-001--resolution-is-the-organizing-visual-metaphor) | Resolution is the organizing visual metaphor | BRD | **Accepted** | 2026-07-25 |
| [DDL-GOV-001](#ddl-gov-001--the-marketing-design-bible-is-authoritative) | The Marketing Design Bible is authoritative | GOV | **Accepted** | 2026-07-25 |
| [DDL-GOV-002](#ddl-gov-002--the-design-review-checklist-is-authoritative-and-frozen) | The Design Review Checklist is authoritative and Frozen | GOV | **Accepted** | 2026-07-25 |
| [DDL-GOV-003](#ddl-gov-003--governance-changes-require-a-formal-amendment) | Governance changes require a formal amendment | GOV | **Accepted** | 2026-07-25 |
| [DDL-GOV-004](#ddl-gov-004--five-blocking-gates-override-the-scoring-model) | Five blocking gates override the scoring model | GOV | **Accepted** | 2026-07-25 |
| [DDL-GOV-005](#ddl-gov-005--structure-first-prompting-for-stitch) | Structure-first prompting for Stitch | GOV | **Accepted** | 2026-07-25 |
| [DDL-AIX-001](#ddl-aix-001--calibrated-confidence-with-an-under-trust-default) | Calibrated confidence, with an under-trust default | AIX | **Accepted** | 2026-07-25 |
| [DDL-VIS-001](#ddl-vis-001--border-first-near-monochrome-surface-language) | Border-first, near-monochrome surface language | VIS | **Accepted** | 2026-07-25 |
| [DDL-ENG-001](#ddl-eng-001--rename-the-repository-from-resume-parser) | Rename the repository from `Resume-Parser` | ENG | **Proposed** | 2026-07-25 |
| [DDL-VIS-002](#ddl-vis-002--4px-base-unit-with-a-three-register-spacing-system) | 4px base unit with a three-register spacing system | VIS | **Accepted** | 2026-07-25 |
| [DDL-VIS-003](#ddl-vis-003--two-type-families-no-display-face-tabular-figures-by-default) | Two type families, no display face, tabular figures by default | VIS | **Accepted** | 2026-07-25 |
| [DDL-VIS-004](#ddl-vis-004--confidence-rendered-on-a-non-hue-definition-channel) | Confidence rendered on a non-hue definition channel | VIS | **Accepted** | 2026-07-25 |
| [DDL-VIS-005](#ddl-vis-005--desktop-first-with-density-preserving-adaptation) | Desktop-first with density-preserving adaptation | VIS | **Accepted** | 2026-07-25 |
| [DDL-VIS-006](#ddl-vis-006--three-tier-token-architecture-components-consume-semantic-tokens-only) | Three-tier token architecture; components consume semantic tokens only | VIS | **Accepted** | 2026-07-25 |
| [DDL-VIS-007](#ddl-vis-007--no-candidate-photography-on-assessment-surfaces) | No candidate photography on assessment surfaces | VIS | **Accepted** | 2026-07-25 |
| [DDL-VIS-008](#ddl-vis-008--toasts-restricted-to-asynchronous-completion) | Toasts restricted to asynchronous completion | VIS | **Accepted** | 2026-07-25 |
| [DDL-VIS-009](#ddl-vis-009--table-and-data-grid-are-distinct-components) | Table and Data Grid are distinct components | VIS | **Accepted** | 2026-07-25 |
| [DDL-VIS-010](#ddl-vis-010--narrow-container-added-between-reading-and-working) | Narrow container added between Reading and Working | VIS | **Accepted** | 2026-07-25 |
| [DDL-MKT-001](#ddl-mkt-001--homepage-narrative-arc-nine-scenes-across-five-movements) | Homepage narrative arc: nine scenes across five movements | MKT | **Proposed** | 2026-07-25 |
| [DDL-MKT-002](#ddl-mkt-002--thinking-is-shown-through-structure-not-animation) | Thinking is shown through structure, not animation | MKT | **Proposed** | 2026-07-25 |
| [DDL-MKT-003](#ddl-mkt-003--scene-05-evidence-trail--three-column-case-file-pattern) | Scene 05 evidence trail — three-column case file pattern | MKT | **Accepted** | 2026-07-25 |
| [DDL-MKT-004](#ddl-mkt-004--scene-06-limits--exhibit-then-grouped-commitments) | Scene 06 limits — exhibit then grouped commitments | MKT | **Accepted** | 2026-07-25 |
| [DDL-MKT-005](#ddl-mkt-005--skeleton-v1-pacing-observations-held-as-hypotheses) | Skeleton v1 pacing observations held as hypotheses | MKT | **Accepted** | 2026-07-25 |
| [DDL-MKT-006](#ddl-mkt-006--scene-07-the-record--retrieval-framed-decision-register) | Scene 07 the record — retrieval-framed decision register | MKT | **Accepted** | 2026-07-25 |
| [DDL-MKT-007](#ddl-mkt-007--scenes-0809-the-closing-act) | Scenes 08–09 the closing act | MKT | **Accepted** | 2026-07-25 |
| [DDL-MKT-008](#ddl-mkt-008--scene-05-fixtures-frozen-as-single-source-of-truth) | Scene 05 fixtures frozen as single source of truth | MKT | **Accepted** | 2026-07-25 |
| [DDL-MKT-009](#ddl-mkt-009--the-homepage-is-rebuilt-as-a-faithful-composition-of-the-stitch-v4-marketing-frames) | The homepage is rebuilt as a faithful composition of the Stitch V4 marketing frames | MKT | **Proposed** | 2026-07-25 |

---

# 11. Decision Records

---

## DDL-POS-001 — HireLens is positioned in the Decision Intelligence category

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Product Owner

**Decision Summary**
HireLens is positioned as a **Decision Intelligence platform for hiring** — a category with no established leader — rather than entering ATS, AI recruiting, or resume screening.

**Context**
Backend architecture was largely production-ready; the full product redesign had not started. The AI recruiting category was in active commoditization, with entrants making near-identical claims. The ATS category had entrenched incumbents, a known feature checklist, and buying committees evaluating on compliance and integrations. Nothing had yet been committed to externally, so the category was genuinely open.

**Problem Statement**
Which category should HireLens compete in, given that the choice determines the competitive axis, the buying committee, the price ceiling, and every downstream design and marketing decision?

**Alternatives Considered**

1. **Applicant Tracking System.** Mature, well-understood, with a defined buyer and budget line.
2. **AI Recruiting Tool.** Currently funded, currently fashionable, immediately legible to buyers.
3. **Resume Screening / Parsing.** Accurate as a description of a real capability we have.
4. **Decision Intelligence for hiring.** No incumbent, and no existing buyer awareness.

**Why Alternatives Were Rejected**

1. **ATS** — competing on the incumbents' axis, where we are structurally disadvantaged and where our actual advantage is illegible. The evaluation criteria are compliance and integration breadth, neither of which we win.
2. **AI Recruiting Tool** — its defining property is that every entrant makes identical claims, so positioning there means permanent comparison on features that become table stakes within roughly four quarters. It also ties our identity to a technology whose differentiating power is on a known decay curve.
3. **Resume Screening** — a component category. Accurate but fatal: it caps the company at the value of a preprocessing step and makes every larger capability read as scope creep.
4. **Decision Intelligence** — accepted despite being the hardest, because it has three properties none of the others has. It is **true** to what was actually built; it **survives** AI commoditization (when models are free, deciding well remains hard); and it **extends** into interviewing, calibration, offers, and post-hire loops without repositioning.

**Final Decision**
Decision Intelligence is the category, used verbatim. The category test: a reader of the homepage should complete *"HireLens is the thing you use to ___"* with **"decide who to hire, and know why"** — not "screen resumes" and not "use AI in recruiting."

**Expected Benefits**
A defensible position with no incumbent to displace. Immunity to the commoditization of AI capability. Room to grow across the hiring lifecycle without a repositioning event. A competitive axis on which our architecture is the advantage rather than an implementation detail.

**Trade-offs**
We must **teach the market a frame before we can sell into it**, which lengthens the sales cycle and raises the cost of every marketing surface. We give up the immediate legibility of a known category and the inbound demand attached to established search behavior. We are also unable to lead with speed or volume claims — the fastest-converting messages in this space (see DDL-POS-002).

**Risks**
The category fails to take hold and we are illegible to buyers rather than differentiated — detectable through sales-call transcripts where prospects consistently re-categorize us as an ATS or an AI screening tool. A well-funded competitor adopts the same frame and out-markets us in it. Internal drift: under quota pressure, our own material slides back toward category-standard language (Checklist §14 G1).

**Consequences**
Marketing may not lead with speed (Checklist §10.6). Product decisions are evaluated against decision confidence rather than throughput (Checklist §3.2). Every surface inherits the obligation to teach the frame. The term is used verbatim and never softened to "AI hiring" (Checklist §1, Terminology).

**Related Decisions**
Constrains `DDL-POS-002` (product/AI framing), `DDL-POS-003` (claim boundaries), `DDL-BRD-001` (metaphor). Related: `DDL-GOV-001`.

**Related Governance Documents**
*Encoded in:* Bible Ch. 2 (Category), Ch. 1 (Vision). *Enforced by:* Checklist §10.6, §3.2.

**Related Product Areas**
All marketing surfaces · homepage · sales enablement · product naming and lexicon.

**Review Trigger**
A second serious entrant adopts Decision Intelligence positioning, **or** four consecutive quarters of sales evidence that prospects cannot place us, **or** an incumbent ATS credibly repositions around decision quality.

**Amendment History**
2026-07-25 · Design Ops · Record created from Bible v1.0 Ch. 2.

---

## DDL-POS-002 — Decision Intelligence is the product; AI is a supporting capability

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Product Owner

**Decision Summary**
AI is treated as supply chain, not product — never the headline, never a differentiator in its own right, never marketed as a capability, in marketing surfaces or in the interface. The governing sentence: *"AI is our supply chain, not our product."*

**Context**
Every competitor in adjacent categories was leading with AI capability, model partnerships, and vendor names as quality signals. This was the default and lowest-friction positioning available, and it was demonstrably converting for others at the time the decision was made.

**Problem Statement**
Should AI capability be a headline claim, given that it is currently a differentiator in some rooms and a liability in others, and that it is on a visible path to becoming assumed infrastructure?

**Alternatives Considered**

1. **Lead with AI.** Match the category, capture existing demand.
2. **Lead with AI, hedge with outcomes.** AI headline, decision-quality support.
3. **AI as supply chain.** Never the headline; decisions are the product.

**Why Alternatives Were Rejected**

1. **Lead with AI** — rejected on a durability argument. Within a few years AI will be assumed, like a database. A position built on it must be rebuilt on a known schedule, and the rebuild costs more than the demand it captured. It also makes our supplier the subject: naming a model vendor invites the buyer to evaluate our supply chain rather than our reasoning.
2. **Hedge** — rejected as the worst of both. A hedged message is legible as neither, and in practice the AI half dominates because it is more concrete. Hedging also guarantees the eventual repositioning without capturing the full short-term benefit.
3. **Supply chain** — accepted. When the market stops caring about AI, our story is unchanged. This is the single largest strategic advantage of the framing.

**Final Decision**
AI is never the subject. Marketing leads with clarity and decision quality; the interface does not label capabilities as "AI," does not name model vendors, and does not use sparkle iconography as a category marker. Enforced as a blocking checkpoint (Checklist §8.9).

**Expected Benefits**
Positioning that survives AI commoditization without a repositioning event. Differentiation in a market where every competitor sounds identical. Buyer attention directed at reasoning quality — the axis on which we actually win.

**Trade-offs**
We forgo inbound demand attached to AI search behavior and AI-budget line items. We are harder to categorize in a first conversation. We give up the easiest available demo hook.

**Risks**
The most likely failure is internal, not external: every quarter where growth is soft, "add more AI to the homepage" will look like the obvious move, and it will be argued by someone with data. Named explicitly in Bible Ch. 15 as a pressure to defend against. Secondary risk: a buyer with an AI mandate cannot find us because we do not use their vocabulary.

**Consequences**
Model vendor names are prohibited as quality signals in-product and in marketing (Checklist §8.9, §10.7). Feature naming may not use "AI" where a verb would do. Every AI capability must be justified by the decision it improves rather than by its existence (Checklist §3.1).

**Related Decisions**
Depends on `DDL-POS-001`. Constrains `DDL-AIX-001`. Related: `DDL-POS-003`.

**Related Governance Documents**
*Encoded in:* Bible Ch. 1, Ch. 15. *Enforced by:* Checklist §8.9 (gate), §10.6, §14 F1.

**Related Product Areas**
Homepage · all marketing surfaces · feature naming · in-product strings · iconography.

**Review Trigger**
AI becomes assumed infrastructure and the term disappears from competitor marketing — at which point this decision has succeeded and the record should be confirmed rather than changed. **Or:** evidence that a specific buyer segment is structurally unreachable without AI vocabulary, quantified from lost-deal analysis rather than anecdote.

**Amendment History**
2026-07-25 · Design Ops · Record created from Bible v1.0 Ch. 1.

---

## DDL-POS-003 — Explicit claim boundaries: what HireLens will never claim

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Product Owner · co-owner: Marketing Owner

**Decision Summary**
Five claims are permanently prohibited in all marketing and in-product language, regardless of conversion performance.

**Context**
Hiring is legally regulated and ethically fraught. The highest-converting claims available in the category — bias elimination and quantified time savings — are respectively unprovable and unfalsifiable, and both are made routinely by competitors.

**Problem Statement**
Which claims will we refuse to make, and will that refusal survive commercial pressure if it is not written down in advance?

**Alternatives Considered**

1. **No stated boundaries;** evaluate claims case by case as they arise.
2. **Legal-minimum boundaries** — prohibit only what creates direct legal exposure.
3. **Explicit written boundaries** covering legal, ethical, and credibility risk.

**Why Alternatives Were Rejected**

1. **Case by case** — rejected because case-by-case evaluation under deadline reliably produces the aggressive claim. The decision gets made by whoever is writing the page, at the moment they most need it to convert.
2. **Legal minimum** — rejected because the credibility risk exceeds the legal risk. An unsourced time-saved number is legally safe and contaminates every sourced claim beside it.
3. **Explicit boundaries** — accepted, and made a blocking gate so that the boundary cannot be eroded incrementally (Checklist §14 G1).

**Final Decision**
We will never claim to: eliminate bias; predict job performance; replace recruiters or interviewers; publish an unsourced time-saved or cost-per-hire figure; or use model vendor names as quality signals. Enforced as **Gate 3** (Checklist §15) and as precedence Rank 1 (Checklist §18).

**Expected Benefits**
Legal defensibility. Credibility with the sophisticated buyer, who tests for exactly these claims. And a trust asset that compounds — the discipline of cutting unsourced claims is itself visible to readers (Bible Ch. 14).

**Trade-offs**
**We give up two of the highest-converting claims in the category.** This is a real and quantifiable revenue cost, accepted deliberately. We will lose some deals to competitors making claims we could match and choose not to.

**Risks**
Erosion by increment — one hedged phrasing, then another (Checklist §14 G1). A competitor's bias-elimination claim becomes a de facto RFP requirement, making our refusal a procurement disqualifier. Detection: watch for claim-shaped language entering drafts, and treat the first instance as the finding rather than the fifth.

**Consequences**
Marketing Owner holds veto over in-product strings, not only marketing copy (Checklist §16) — interface language makes claims more forcefully than marketing does. Any performance-prediction feature is blocked at concept regardless of technical feasibility. Statistics without sources are cut rather than softened.

**Related Decisions**
Depends on `DDL-POS-001`, `DDL-POS-002`. Constrains `DDL-AIX-001`. Related: `DDL-GOV-004`.

**Related Governance Documents**
*Encoded in:* Bible Ch. 2 ("What we will not claim"), Ch. 14. *Enforced by:* Checklist §15 Gate 3, §10.7, §8.6, §18 Rank 1.

**Related Product Areas**
All marketing surfaces · in-product strings · sales enablement · RFP responses · assessment feature scope.

**Review Trigger**
A regulatory change that makes a currently-prohibited claim verifiable, **or** validated research that would let us make a bounded version of one honestly. **Neither commercial pressure nor competitor behavior is a valid trigger** — stated explicitly because both will be argued.

**Amendment History**
2026-07-25 · Design Ops · Record created from Bible v1.0 Ch. 2.

---

## DDL-BRD-001 — Resolution is the organizing visual metaphor

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner

**Decision Summary**
The organizing metaphor is **Resolution** — in both senses: the optical ability to distinguish things that are close together, and the state of having decided.

**Context**
The design language was being defined before any implementation. Without an organizing metaphor, every new design decision is unconstrained, and a system with no constraining idea drifts as it grows.

**Problem Statement**
What single mental model should make future design decisions decidable, rather than leaving each one to be argued on taste?

**Alternatives Considered**

1. **The lens** — present in the product name.
2. **The filter / funnel** — the industry's default.
3. **The signal / beacon / light.**
4. **The brain / neural network.**
5. **Resolution.**

**Why Alternatives Were Rejected**

1. **Lens** — passive (a piece of glass, not an action), and it invites the surveillance reading, which is the connotation most worth avoiding in a product that examines people.
2. **Filter / funnel** — encodes the industry's error: hiring as subtraction, candidates as volume to be reduced. It also casts us as gatekeeper, the least sympathetic available role.
3. **Signal / light** — vague, overused, and it implies we supply the truth. We do not; the evidence was already there.
4. **Brain / neural network** — puts the model at the center of the story, contradicting `DDL-POS-002`.
5. **Resolution** — accepted because it makes the honest claim: *we do not add information, we make existing information distinguishable.* The double meaning — gain resolution, reach resolution — is the product in one word, and it correctly locates the human as the decider.

**Final Decision**
Resolution governs design decisions. It yields specific constraints: clarity is achieved by removing what blurs, never by adding emphasis; layout's job is separation; progressive disclosure is licensed as focus adjustment; motion is brief focus adjustment ending in a settled state; deliberate blur as decoration is prohibited, because under this metaphor blur is a statement of failure.

**Expected Benefits**
Design arguments become decidable by reference rather than by seniority. New features get a one-question test: *does this increase resolution?* The metaphor is original to us and difficult to copy without the product to back it.

**Trade-offs**
A metaphor constrains — it rules out visual directions that might be locally attractive, including most of the current AI-product visual vocabulary. It also requires explanation to newcomers, where a more literal metaphor would not.

**Risks**
Misreading as "high resolution" in the display sense, producing literal interpretations (sharpness effects, pixel motifs). Mitigation: the record and Bible Ch. 7 both state the optical-plus-decision reading explicitly.

**Consequences**
Decorative blur, fog, haze, and bokeh are prohibited. Motion is focus adjustment: brief, purposeful, ending settled (Bible Ch. 10). Overview-then-detail is the licensed disclosure pattern, with a stated reason rather than mere convention. Every future capability is testable against *does this increase resolution?*

**Related Decisions**
Depends on `DDL-POS-001`, `DDL-POS-002`. Constrains `DDL-VIS-001`. Related: `DDL-AIX-001`.

**Related Governance Documents**
*Encoded in:* Bible Ch. 7. *Influences:* Bible Ch. 6, Ch. 10. *Enforced by:* Checklist §6, §7.

**Related Product Areas**
Design system · all product surfaces · marketing visual direction · motion.

**Review Trigger**
The metaphor stops resolving design arguments — observable as recurring §6 or §7 disputes that reference it and still deadlock. **Or** the product's core function changes such that "distinguishing" is no longer what it does.

**Amendment History**
2026-07-25 · Design Ops · Record created from Bible v1.0 Ch. 7.

---

## DDL-GOV-001 — The Marketing Design Bible is authoritative

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Ops

**Decision Summary**
`MARKETING_DESIGN_BIBLE.md` v1.0 is the authoritative statement of design philosophy for HireLens. It supersedes taste, trend, and individual preference.

**Context**
Written before implementation started, deliberately — the purpose was to prevent inconsistent decisions rather than to rationalize existing ones. Product architecture was still being finalized, so no existing work constrained the philosophy.

**Problem Statement**
Should design philosophy be documented as binding, or held as shared understanding among the current team?

**Alternatives Considered**

1. **Shared understanding**, no document.
2. **A style guide** — component specs, values, usage rules.
3. **A philosophy document with binding authority.**

**Why Alternatives Were Rejected**

1. **Shared understanding** — rejected because it does not survive team growth or turnover, and because it makes every decision re-arguable by anyone who was not in the original conversation. Variance is managed by shared reasoning, and reasoning that is not written is not shared.
2. **Style guide** — rejected as necessary but insufficient. Style guides expire; they answer *what* and not *why*, so they cannot resolve a case they did not anticipate — which is most cases.
3. **Philosophy with authority** — accepted. Principles that do not bind are adjectives.

**Final Decision**
The Bible is binding. Its principles are **ordered** (5.1–5.7), so that conflicts resolve by rank rather than by argument. Its reasoning is arguable; its consequences are binding until an amendment concludes otherwise.

**Expected Benefits**
Design decisions traceable to stated principle. New contributors learn the *why* before the components. Arguments resolve by reference rather than by seniority.

**Trade-offs**
Authority creates friction — some good ideas will be blocked by principles that turn out to be imperfectly stated, and the amendment process is slower than a conversation. Accepted deliberately: **a principle that yields to a good argument in the moment is not a principle**.

**Risks**
Ossification — a rule outliving its reason. Mitigated by the annual adherence review (Bible Ch. 15). Weaponization — using the document to block work by finding an unmet clause. Mitigated by the Checklist's verdict separation (§1) and by the rule that Design Owner veto covers violations, never preference (§16).

**Consequences**
Every design review cites principles rather than opinions. The ordering (5.1–5.7) is the conflict-resolution mechanism, so it cannot be treated as a list. Amendments require written reasoning and a date.

**Related Decisions**
Related: `DDL-GOV-002`, `DDL-GOV-003`. Constrains every POS, BRD, VIS, MOT, UX, IA, and MKT record.

**Related Governance Documents**
*This record is about:* the Bible, in full. *Paired with:* the Checklist (`DDL-GOV-002`).

**Related Product Areas**
All design work · all marketing surfaces · onboarding of new designers and agents.

**Review Trigger**
Annual adherence review finds a principle consistently violated in practice — which forces a written decision on whether the practice or the principle is wrong (Bible Ch. 15).

**Amendment History**
2026-07-25 · Design Ops · Record created on freeze of Bible v1.0.

---

## DDL-GOV-002 — The Design Review Checklist is authoritative and Frozen

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Ops

**Decision Summary**
`DESIGN_REVIEW_CHECKLIST.md` v1.0 is the authoritative quality gate for all HireLens artifacts. Status: **Frozen**. Change policy: **amendments only**.

**Context**
Implementation had not started. The Checklist was written to enforce the Bible operationally — an eight-stage sequence, five blocking gates, weighted scoring, an anti-pattern catalog, role ownership, evidence classes, and an escalation precedence order.

**Problem Statement**
Should the Checklist be frozen before the first sprint, or held provisional so that the first real implementation can shape it?

**Alternatives Considered**

1. **Provisional (v1.0-provisional)** — freeze after Sprint 1 validates it against real work.
2. **Frozen immediately**, amendments only.
3. **Living document** — revised freely as the team learns.

**Why Alternatives Were Rejected**

1. **Provisional** — considered seriously and explicitly rejected by the document owner. A governance document that can move under implementation pressure will move under implementation pressure, and the first sprint is precisely when the pressure is highest and the reasoning weakest. The value of a gate is that it does not negotiate.
2. **Living document** — rejected for the same reason at greater magnitude. Silent revision destroys the reasoning trail, which is the asset. A document everyone edits is a document nobody can rely on.
3. **Frozen** — accepted. Governance must be more stable than the thing it governs; implementation adapts to governance, not the reverse.

**Final Decision**
Frozen at v1.0. Amendments only, appended with reasoning and date; no section edited in place; superseded text remains legible. Discovered gaps route to a GAP (`DDL-GOV-003`) and wait for approval. **Never silently reinterpret; never create implementation-specific exceptions; never bypass a blocking gate.**

**Expected Benefits**
Gates that actually hold when a deadline argues against them. A reasoning trail future contributors can consult. Reviewers who can hold a role without expecting to be worn down (Checklist §18).

**Trade-offs**
**Sprint 1 will almost certainly surface a gap the document did not anticipate, and the correct response will be slower than an exception would be.** Accepted knowingly: the cost is real, and it is smaller than the cost of a governance document that bends the first time it is inconvenient.

**Risks**
Process theatre — the document is followed nominally while real decisions happen elsewhere. Detection: a review stage with a 100% pass rate, or a §6 review completed in ninety seconds (Checklist §15). Second risk: the amendment process is slow enough that people route around it, which is the failure this decision exists to prevent and must be monitored rather than assumed away.

**Consequences**
No exceptions may be granted at implementation time. Every gap stops work and produces a GAP. The five gates are not subject to schedule. A reviewer's finding is answerable only with evidence or an amendment.

**Related Decisions**
Depends on `DDL-GOV-001`. Constrains `DDL-GOV-003`, `DDL-GOV-004`. Related: all records.

**Related Governance Documents**
*This record is about:* the Checklist, in full — Version History, status Frozen.

**Related Product Areas**
All design and engineering work · all review activity · agent-generated work.

**Review Trigger**
Three or more GAPs in a single quarter classified as *correction* rather than *clarification* — which would indicate the document is wrong in substance rather than merely incomplete, and warrants a v2.0 assessment rather than accumulating patches.

**Amendment History**
2026-07-25 · Design Ops · Record created on freeze of Checklist v1.0. Provisional status explicitly considered and rejected the same day.

---

## DDL-GOV-003 — Governance changes require a formal amendment

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Ops

**Decision Summary**
No governance document changes except through a Governance Amendment Proposal (GAP): stop, document, classify, assess impact across all governance, recommend, and wait for approval.

**Context**
Established at the point of freezing both governance documents, in anticipation of implementation pressure rather than in response to it. **This is the decision most likely to be tested, and it was made before there was anything to test it.**

**Problem Statement**
When implementation uncovers a gap, inconsistency, ambiguity, or missing principle in frozen governance, what happens?

**Alternatives Considered**

1. **Case-by-case exceptions**, granted by the document owner.
2. **Interpretation** — read the frozen text flexibly to accommodate the case.
3. **Formal amendment process**, with work blocked until it concludes.

**Why Alternatives Were Rejected**

1. **Exceptions** — an exception granted once is a precedent, and precedent is how frozen documents thaw. The second exception is easier than the first and is argued by citing it.
2. **Interpretation** — rejected as the most dangerous option because it leaves no trace. Silent reinterpretation produces divergent readings across the team with no record of when the meaning changed, and it is indistinguishable from the document simply meaning less over time.
3. **Formal amendment** — accepted, including the cost of blocked work.

**Final Decision**
The seven-step GAP process (§6). Classification into clarification, correction, new principle, or deprecated principle. Impact assessed across **all** governance documents, not only the one that surfaced the issue. Recommendation of no amendment, minor (v1.0.x), or major (v2.0). Amendments touching a gate or a precedence rank require the veto holder's approval and cannot be approved by the Approver alone.

**Expected Benefits**
Governance that means the same thing in month twelve as in month one. A reasoning trail for every change. Work that is blocked visibly rather than proceeding on a private reinterpretation.

**Trade-offs**
**Work stops.** Sometimes for days, at inconvenient moments, on a question that will ultimately resolve as "no amendment required." That outcome is the most common one and is not a wasted process — it is the system confirming the governance was right and the proposal was wrong.

**Risks**
The process is slow enough that people route around it silently — the failure that would be invisible until its effects accumulated. Detection is behavioral: zero GAPs filed over a sustained period is not evidence of perfect governance, it is evidence of unreported reinterpretation.

**Consequences**
Sprint planning must accommodate the possibility of a governance block. A discovered gap is documented and escalated rather than absorbed. Records that would require a governance change stay **Proposed**, never "Accepted pending" (§4).

**Related Decisions**
Depends on `DDL-GOV-001`, `DDL-GOV-002`. Constrains all future records.

**Related Governance Documents**
*Encoded in:* Checklist Version History (amendment procedure), §18 Level 4. *Derives from:* Bible Ch. 15.

**Related Product Areas**
All work · sprint planning · agent-generated work.

**Review Trigger**
Evidence that the process is being routed around — a governance interpretation appearing in shipped work with no corresponding GAP. **Or** an amendment backlog that consistently blocks delivery, which would indicate the governance is wrong rather than the process.

**Amendment History**
2026-07-25 · Design Ops · Record created. Non-negotiables restated: never silently reinterpret; never create implementation-specific exceptions; never bypass a blocking gate.

---

## DDL-GOV-004 — Five blocking gates override the scoring model

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Ops · co-owners: Accessibility Owner, AI Owner

**Decision Summary**
Five conditions block approval regardless of score: accessibility floor, all sixteen AI Experience checkpoints, claim boundaries, interface honesty, and undeclared debt. Gates are evaluated **before** scoring, and a gate failure terminates the review unscored.

**Context**
The Checklist uses a weighted scoring model across eight dimensions. Weighted scoring has a structural flaw: strong performance in one dimension can mathematically offset a failure in another, which is correct for craft and catastrophic for floors.

**Problem Statement**
How do we prevent the scoring model from permitting an artifact that fails an unacceptable condition, given that Accessibility (10%) and Trust/AI (15%) carry weights that imply tradeability?

**Alternatives Considered**

1. **Weight the critical dimensions very heavily** so failure mathematically prevents approval.
2. **Minimum per-dimension thresholds** — no dimension below a floor.
3. **Separate gates evaluated before scoring.**

**Why Alternatives Were Rejected**

1. **Heavy weighting** — rejected because it is still arithmetic. Sufficiently exceptional work elsewhere can offset it, and more importantly it frames an accessibility failure as *expensive* rather than *unacceptable*, which is the wrong signal to everyone reading the rubric.
2. **Per-dimension thresholds** — better, but still expresses the floor as a score, which invites negotiation about whether a given failure is really a 2 or a 3.
3. **Separate gates** — accepted. A gate is not a low score; it is the absence of a score.

**Final Decision**
Gates are evaluated first, marked `[GATE n]` at source, and listed canonically in Checklist §15. A gate failure means there is no arithmetic to perform. Gates 1 and 2 are additionally protected by absolute role vetoes (§16) and precedence ranks 1 and 2 (§18), so the Approver cannot trade them.

**Expected Benefits**
Floors that cannot be argued down. A rubric whose structure communicates that some things are not trade-offs. Clarity for reviewers about which findings are negotiable.

**Trade-offs**
Rigidity. Some artifact will be blocked by a gate in a case where a reasonable person would have shipped it, and the only remedy will be a GAP. Accepted: **the value of a gate is precisely that it does not make exceptions for reasonable cases**, since every case is reasonable to the person making it.

**Risks**
Gate inflation — pressure to add more gates until everything is blocking and nothing is. Mitigated by the count being fixed at five and any addition requiring a major amendment. Opposite risk: a gate quietly reinterpreted to narrow its scope, which a GAP would catch and an interpretation would not.

**Consequences**
No "ship now, fix accessibility later" path exists. AI-facing surfaces cannot ship with any of the sixteen §8 checkpoints unmet. Gate failure returns the artifact unscored to the earliest stage that produced the problem.

**Related Decisions**
Depends on `DDL-GOV-002`. Related: `DDL-POS-003` (Gate 3), `DDL-AIX-001` (Gate 2).

**Related Governance Documents**
*Encoded in:* Checklist §15 (gate table), §7.8, §8, §10.7, §11, §12.6, §4.8, §16, §18.

**Related Product Areas**
All reviewed work · every AI-facing surface · all marketing surfaces.

**Review Trigger**
A gate blocks work in a case the team judges was correct to ship — file a GAP rather than granting an exception, and let the classification determine whether the gate's scope was wrong.

**Amendment History**
2026-07-25 · Design Ops · Record created. Gate evaluation ordered before scoring to close the weighted-offset contradiction.

---

## DDL-GOV-005 — Structure-first prompting for Stitch

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Ops · co-owner: Design Owner

**Decision Summary**
When generating complex interfaces with Stitch: specify structural layout explicitly, keep semantic content minimal, and never combine layout generation with heavy narrative generation. **Generate structure first; populate content later.**

**Context**
Established from direct observation across two rounds of homepage exploration on 2026-07-25.

Round one asked Stitch for four complete nine-scene homepages. All four truncated — none produced more than four of nine sections, and each jumped from an early section straight to the footer. The evidence trail, the limits turn, the decision record and the trust section were absent from every one.

Round two, scene level, asked for four structural directions for a single scene. Three of the four failed to apply the design system entirely and returned unstyled HTML. The one that rendered — direction C — was the only prompt describing a **symmetrical** structure with explicit row-for-row alignment. The three failures all described **asymmetric multi-panel layouts with margin apparatus** in prose.

Round three re-ran the approved concept with one variable changed: prompt shape. Same concept, same design system, same constraints, roughly half the words, and an explicit column grid stated as percentages instead of panels described in prose. **It rendered correctly on the first attempt.**

**Problem Statement**
What prompt structure reliably produces usable output from Stitch for interfaces of real complexity?

**Alternatives Considered**

1. **Single comprehensive prompt** — full structure, copy and narrative in one pass.
2. **Retry and iterate** — same prompt shape, repeated attempts until one succeeds.
3. **Reduce ambition** — design simpler layouts that generate reliably.
4. **Structure first, content second** — explicit grid, minimal semantics, copy supplied afterwards.

**Why Alternatives Were Rejected**

1. **Comprehensive prompt** — empirically fails. Three separate failure modes were observed: narrative truncation, design-system non-application, and copy invention. All three correlate with semantic load rather than with layout difficulty.
2. **Retry** — rejected as expensive and non-diagnostic. Nothing in the three failed renders suggested randomness; the failures tracked prompt shape consistently.
3. **Reduce ambition** — rejected outright. Letting a tool's limitation determine the design is the tail wagging the dog, and the asymmetric three-panel layout is the correct answer for the scene regardless of what generates easily.
4. **Structure first** — accepted. It isolates the variable the tool actually struggles with.

**Final Decision**
As summarized. Concretely: state the grid explicitly, in percentages or named columns, rather than describing panels in prose. Cap semantic content at labels and short statements. Supply long-form copy at implementation, never in the generation prompt. Where a scene needs both, run two passes.

**Expected Benefits**
First-attempt renders instead of retry cycles. A cleaner separation between structural decisions, which belong to design review, and copy, which belongs to the Marketing Owner and to the claim boundaries in `DDL-POS-003`.

**Trade-offs**
Two passes where a team would prefer one, and a generation output that looks less finished because it carries placeholder rather than final copy. Accepted: a beautiful render carrying invented copy is worse than a plain render carrying correct structure, because the invented copy is the part that breaches governance.

**Risks**
The rule is read as "keep prompts short" and structural specificity is lost along with the semantic load — the opposite of the finding. Structure-first means *more* structural detail, not less prompt. Second risk: invented copy passes review because the render is otherwise good, which silently promotes a generation defect into an approved fixture. Observed in round three and caught; will recur.

**Consequences**
Every Stitch prompt states its grid explicitly. Long-form copy is never supplied to Stitch. Generated copy is treated as placeholder by default and is replaced from approved fixtures at implementation — never accepted because it reads well. Applies to Scenes 06 through 09 and to all future exploration.

**Related Decisions**
Related: `DDL-MKT-001`, `DDL-POS-003`.

**Related Governance Documents**
*Derives from:* Checklist §14 J1 (statistically likely layout), §14 J2 (requirements satisfied literally), §14 J4 (confident invention), §14 J5 (polish without resolution); Creative Brief, "How to brief Stitch". *Enforced by:* Checklist Appendix C.

**Related Product Areas**
All Stitch exploration · homepage scenes 06–09 · future marketing surfaces · design-tool workflow.

**Review Trigger**
A materially more capable version of Stitch, or a reproducible case where a semantically dense prompt renders correctly on first attempt at comparable complexity. **Not a trigger:** a single lucky render.

**Amendment History**
2026-07-25 · Design Ops · Record created and accepted at the Product Owner's instruction, from three rounds of observed generation behaviour.

---

## DDL-AIX-001 — Calibrated confidence, with an under-trust default

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** AI Owner

**Decision Summary**
HireLens reports its own certainty, is willing to be unsure, and — where the design must choose — errs toward the user trusting the system **less** rather than more.

**Context**
Competitors are structurally incentivized to project certainty, because certainty demos better. Meanwhile, calibration is exactly what experienced recruiters test for in the first five minutes, and confident-but-wrong output is the category's defining risk.

**Problem Statement**
How much should the interface encourage users to trust its outputs, and what does it do when it does not know?

**Alternatives Considered**

1. **Maximize trust** — confident presentation, frictionless acceptance, uncertainty minimized.
2. **Neutral presentation** — show outputs, let users calibrate themselves.
3. **Calibrated confidence with an under-trust default.**

**Why Alternatives Were Rejected**

1. **Maximize trust** — rejected on both ethics and durability. It converts a decision aid into an unaccountable decision-maker, and its cost lands on candidates rather than on us. It also fails the first sophisticated user who tests it with a thin profile.
2. **Neutral** — rejected because it is not actually neutral. Users calibrate from presentation, and a well-formed fluent output reads as confident whether or not we intended it to. Declining to state confidence is a decision to imply high confidence.
3. **Calibrated, under-trust default** — accepted, including its commercial cost.

**Final Decision**
Confidence is displayed adjacent to each claim, low-confidence states exist and are reachable in normal use, and low confidence is accompanied by what would raise it. Where confidence cannot yet be validated, an *evidence-sufficiency* signal is used instead of a fabricated percentage. Where the design must choose a direction, it errs toward under-trust.

**Expected Benefits**
The strongest available trust signal, precisely because it is expensive to make (Bible Ch. 14). Differentiation on the axis competitors cannot easily follow. Users who examine evidence rather than accept outputs — which is the product working as designed.

**Trade-offs**
**Under-trust costs us revenue; over-trust costs someone else their career.** We accept the revenue cost deliberately. Concretely: worse demos, users who take longer to rely on the product, and a harder time competing against a confident-sounding alternative in a side-by-side evaluation.

**Risks**
Under-trust overshoots and users work around the product entirely — visible as churn, which is why it receives disproportionate internal attention and must be judged against the invisible cost on the other side. Second risk: confidence displayed without being calibrated, which is the worst outcome — a dishonest signal in the exact place we claim honesty (Checklist §14 F7).

**Consequences**
Marketing must be willing to show a low-confidence read (Checklist §10.8). Every confidence display must state what produces it and whether it has been validated (§8.10). Confidence is expressed through intensity and explicitness rather than hue, so it cannot be misread as a quality judgment (§8.11). Override must be no harder than acceptance (§8.4).

**Related Decisions**
Depends on `DDL-POS-002`, `DDL-POS-003`. Related: `DDL-BRD-001`, `DDL-GOV-004`.

**Related Governance Documents**
*Encoded in:* Bible Ch. 2 (differentiator 2), Ch. 14. *Enforced by:* Checklist §8 (Gate 2), §8.10, §8.11, §8.16, §10.8.

**Related Product Areas**
Candidate assessment · comparison · search ranking · interview intelligence · every surface where model output reaches a user · marketing demonstrations.

**Review Trigger**
Calibration is validated against real outcome data — at which point the evidence-sufficiency fallback may be replaced with genuine confidence figures. **Or** evidence that under-trust is causing users to abandon the product's outputs entirely, measured rather than assumed.

**Amendment History**
2026-07-25 · Design Ops · Record created from Bible v1.0 Ch. 2 and Checklist §8.16.

---

## DDL-VIS-001 — Border-first, near-monochrome surface language

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner

**Decision Summary**
The surface system is **border-first** rather than shadow-first, on a near-monochrome foundation where color carries meaning only. Depth is limited to three semantic levels; translucency is permitted only where layered content is meant to be seen through.

**Context**
Defined before implementation, in a market where the prevailing visual vocabulary for "advanced technology" is gradient meshes, glassmorphism, glow, and dark-mode-as-identity. Adopting none of it was available as a differentiating move.

**Problem Statement**
What surface language expresses precision and evidence, and will still look deliberate in five years?

**Alternatives Considered**

1. **Contemporary AI aesthetic** — glass, gradient, glow, dark by default.
2. **Shadow-first elevation** — the mainstream product-design default.
3. **Border-first, near-monochrome, three elevation levels.**

**Why Alternatives Were Rejected**

1. **Contemporary AI aesthetic** — rejected on two grounds. It dates: trend-forward pages have a half-life of roughly eighteen months, and rebuilding costs more than the attention gained. And it borrows a competitor's signal — glass reads as *ephemeral, floating, ungrounded*, where our brand is *grounded, evidenced, solid* (`DDL-BRD-001`).
2. **Shadow-first** — rejected because shadows imply a boundary and lose precision as context changes: zoom, theme, projection, screenshot. **For a product about precision and traceability, the surface language should be precise** — the medium agreeing with the message.
3. **Border-first** — accepted. Borders state a boundary exactly, at any scale, in any theme.

**Final Decision**
Borders separate; shadows indicate elevation only, in three semantic levels (ground, raised, overlay). The foundation is a neutral scale; color is reserved for action, state, confidence, and data. Translucency is permitted only over content meant to be seen through. Both themes are built to the same standard; neither is the "real" one.

**Expected Benefits**
Differentiation through restraint in a market where everyone reaches for the same vocabulary. Longevity — a neutral foundation looks deliberate in 2031. Content becomes the subject: real screenshots, faces, and documents carry chroma, and a neutral frame lets them read.

**Trade-offs**
Less immediately impressive in a first-impression comparison. It will be argued as "plain" internally, repeatedly, and defending it will cost energy every time. We also give up the fastest available way to make a surface look expensive.

**Risks**
Reads as austere or unfinished to buyers accustomed to the category's visual richness. Mitigation is typographic and structural quality, which is where perceived quality actually lives (Bible Ch. 9) — but it means the execution bar is higher, since there is no decoration to hide behind.

**Consequences**
Prohibited: gradient meshes, aurora backgrounds, noise textures, glowing borders, 3D renders, decorative glass, abstract AI imagery (Bible Ch. 6). Color hierarchy is prohibited as a primary mechanism (Checklist §6.10), so surfaces must survive grayscale. A fourth elevation level indicates a structural problem to fix, not a token to add.

**Related Decisions**
Depends on `DDL-BRD-001`, `DDL-POS-002`. Related: `DDL-GOV-001`.

**Related Governance Documents**
*Encoded in:* Bible Ch. 6, Ch. 8. *Enforced by:* Checklist §6.8, §6.9, §6.10, §14 D3, D4.

**Related Product Areas**
Design system and tokens · all product surfaces · marketing surfaces · screenshots used in marketing.

**Review Trigger**
The design system cannot express a genuine product need within three elevation levels or the neutral foundation — filed as a GAP, since both are encoded in the Bible. **Not** a trigger: the language being described as plain.

**Amendment History**
2026-07-25 · Design Ops · Record created from Bible v1.0 Ch. 6 and Ch. 8.

---

## DDL-ENG-001 — Rename the repository from `Resume-Parser`

**Status:** Proposed
**Date:** 2026-07-25
**Owner:** Engineering Owner

**Decision Summary**
Proposed: rename the repository from `Resume-Parser` to a name consistent with the accepted category positioning. **Filed for future review. Neither accepted nor rejected.**

**Context**
Surfaced by the Governance Drift Report (2026-07-25) against baseline `65ac71e`. The repository is named `Resume-Parser`; the string appears in roughly 2,000 files as a path fragment, in the git remote, in every absolute path a contributor sees, in CI logs, and in `package.json` as `"name": "resume-hero-section"`.

The name predates the governance baseline by a wide margin — it describes what the project was when it started, and it was accurate then. It was not chosen in conflict with governance; governance arrived afterward.

**Problem Statement**
Should the repository be renamed to match the accepted category, given that the conflict is real but almost entirely internal, and the change is broad and mechanically risky?

**Alternatives Considered**

1. **Rename now.** Repository, remote, and the `resume-hero-section` package name, with CI, deploy configuration, and local clones updated together.
2. **Rename at a natural boundary.** Defer to a moment when the repository is already being restructured — a monorepo reorganization, a deploy-target change, or an open-source release.
3. **Never rename.** Accept the name as an internal artifact and rely on documentation to carry positioning.
4. **Rename the package only,** leaving the repository name unchanged — a partial move addressing the more visible half.

**Why Alternatives Were Rejected**

*No alternative has been rejected. This record is Proposed and the analysis below is preliminary — it exists so that whoever decides is not starting from nothing.*

Observations for the eventual decision:

1. **Rename now** — resolves the conflict cleanly, at the cost of coordinated changes across CI, deploy configuration, and every existing clone. The risk is not the rename itself but the long tail of hardcoded paths, which the current 2,000-file footprint suggests is substantial.
2. **Rename at a boundary** — cheapest total cost, because the coordination is already being paid for. Its weakness is that the boundary may not arrive, and "defer to a natural moment" is how a decision becomes permanent through inaction. If chosen, it needs a dated review trigger rather than a hope.
3. **Never rename** — defensible on the argument that `DDL-POS-001` governs external positioning and this is internal. The counter-argument is that the name is visible in every clone URL, CI log, and contributor path, and that the component-category framing is exactly what Bible Ch. 2 warns caps the company's self-conception.
4. **Package only** — addresses the string most likely to be published while leaving the repository name. Possibly the best cost-to-benefit ratio; needs checking against whether the package is ever externally visible.

**Final Decision**
**None. Status: Proposed.** No action is taken and no work is scheduled until this record is resolved.

**Expected Benefits**
Internal coherence between what the repository is called and what the company is. Removal of the last significant artifact of the pre-governance framing. Elimination of a small, repeated friction: every contributor reads "Resume-Parser" many times a day, and naming shapes self-conception more than it appears to.

**Trade-offs**
A rename is broad and mechanically risky, touching CI, deploy configuration, imports, documentation, and every existing clone. It delivers no user-visible benefit and no revenue. **It is the kind of work that is easy to justify and hard to schedule**, which is precisely why it is filed as a decision rather than a backlog item — a backlog would let it be deferred indefinitely by nobody owning it.

**Risks**
*If renamed:* broken CI, broken deploy targets, broken absolute imports, stale local clones, and a long tail of hardcoded paths discovered over weeks. Mitigated by doing it at a boundary where the surrounding coordination is already happening.

*If not renamed:* the component-category framing persists in the most-repeated string in the codebase. Low external risk, non-zero internal one — Bible Ch. 2's argument is that the naming caps how the team conceives of the product, and that argument does not stop applying because the audience is internal.

**Consequences**
*If accepted:* a coordinated change across repository, remote, CI, deploy configuration, and documentation, plus a communication to anyone holding a clone. *If rejected:* the drift is recorded as knowingly accepted, and future audits reference this record rather than re-raising it — which is most of the value of filing it either way.

**Related Decisions**
Depends on `DDL-POS-001` (the positioning that creates the conflict). Related: `DDL-POS-002`.

**Related Governance Documents**
*Derives from:* Bible Ch. 2 (Resume Screening / Parsing rejected as a component category). *Would require amendment:* none — this record is consistent with governance whichever way it resolves. The conflict is in the artifact, not the governance.

**Related Product Areas**
Repository name · git remote · CI configuration · deploy targets · `resume-hero-section` package name · absolute import paths · contributor onboarding.

**Review Trigger**
A repository restructuring event of any kind — monorepo reorganization, deploy-target change, or an open-source or public release. **Any of these makes the rename substantially cheaper and should force this record to Accepted or Rejected rather than leaving it Proposed.**

Independently: if this record is still Proposed in twelve months, that is itself the trigger. A proposal open past a year is not under consideration; it is being avoided (§1).

**Amendment History**
2026-07-25 · Design Ops · Record created from the approved Governance Drift Report. Filed as Proposed at the instruction of the Product Owner; explicitly not accepted or rejected.

---

## DDL-VIS-002 — 4px base unit with a three-register spacing system

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner

**Decision Summary**
Spacing uses a 4px base with a non-linear scale, governed by three registers — Intra (2–8), Inter (12–32), Section (48–128) — under the law that the smallest Section gap exceeds the largest Inter gap, which exceeds the largest Intra gap.

**Context**
Filed with Visual Design System Book I. Checklist §14 D5 catalogues uniform spacing as a smell: it looks tidy, passes any check phrased as "is spacing consistent," and makes structure invisible. A flat scale does not prevent it — a flat scale says what values exist, not which to use, so teams default to using one everywhere.

**Problem Statement**
What spacing structure makes non-uniform, meaning-bearing spacing the default rather than an act of individual judgment?

**Alternatives Considered**

1. **8px base, flat scale.** The industry default.
2. **4px base, flat scale.** Finer control, same governance problem.
3. **4px base, three registers with an ordering law.**
4. **Strict baseline grid.** Typographically rigorous.

**Why Alternatives Were Rejected**

1. **8px flat** — too coarse for our density. It forces a choice between 8 (too tight) and 16 (too loose) at exactly the scale where Index and Inspector panels live, and it leaves §14 D5 unaddressed.
2. **4px flat** — fixes granularity, not uniformity. Still leaves every spacing decision to taste.
3. **Registers** — accepted. The ordering law is directly checkable in review (Checklist §6.3) and catches more structural problems than any other single test in Book I.
4. **Baseline grid** — rejected on survival grounds. It is beautiful and does not survive contact with mixed content — tables, form controls, images, embedded data. We take the useful half: consistent values applied consistently to the same relationships.

**Final Decision**
As summarized. Component spacing is fixed by the component and not overridable by consumers. Two density modes (Comfortable, Compact) apply per surface, chosen by task, not by user preference — and Section spacing does not change between them.

**Expected Benefits**
Structure that is visible pre-attentively. A review test that is objective rather than a matter of taste. Two designers producing spacing that matches without coordination.

**Trade-offs**
More to learn than a flat scale. The ordering law will occasionally be inconvenient and will be argued as pedantry. Rejecting a per-user density toggle gives up a frequently-requested preference — deliberately, because it lets users mask a badly structured screen by loosening it, hiding the defect from us.

**Risks**
Registers erode through component-level overrides, one reasonable exception at a time. Detection: any component accepting a padding or spacing prop is the leading indicator.

**Consequences**
No component exposes spacing configuration. Heading spacing is asymmetric by rule. Compact mode reduces Intra and Inter only. A surface uncomfortable at Compact is a structural problem, not a spacing one.

**Related Decisions**
Depends on `DDL-VIS-001`. Related: `DDL-VIS-003`, `DDL-VIS-005`.

**Related Governance Documents**
*Derives from:* Bible Ch. 6 (space as punctuation), Ch. 9. *Enforced by:* Checklist §6.3, §14 D5.

**Related Product Areas**
Design system · every product and marketing surface · Book II tokens.

**Review Trigger**
Evidence that the register law is systematically unworkable on a real surface class — filed as a versioned change to Book I with the failing case, not as a local exception.

**Amendment History**
2026-07-25 · Design Owner · Record created with Visual Design System Book I. Proposed pending approval of that book.
2026-07-25 · Product Owner · **Accepted** on approval of the book.

---

## DDL-VIS-003 — Two type families, no display face, tabular figures by default

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner

**Decision Summary**
One sans family for everything and one mono for machine identifiers only. No display face. Tabular figures are the default everywhere; proportional figures are permitted only in flowing prose.

**Context**
Filed with Book I. HireLens is text-dense and number-dense: scores, counts, dates, evidence tallies, comparison tables. Bible Ch. 9 requires complete numerals and small-size excellence and warns against monospace used as a credibility costume.

**Problem Statement**
What typographic family structure supports a product that is simultaneously long-form reading and dense tabular data, without introducing styling decisions that will diverge across teams?

**Alternatives Considered**

1. **Display + text + mono** — three families, the standard "premium" configuration.
2. **Single family for everything**, including machine values.
3. **Two families: sans + mono.**

**Why Alternatives Were Rejected**

1. **Three families** — rejected on two grounds. A display face has personality, and personality competes with content on a screen someone reads for four minutes. It also dates visibly, and it creates a permanent consistency question ("does the display face apply here?") that will be answered differently by different people.
2. **Single family** — rejected because machine values genuinely need character-exact, disambiguated rendering. An ID or hash in proportional sans is harder to verify and harder to transcribe, and verification is our product.
3. **Two families** — accepted. Headings are *large*, not *different*; scale carries the emphasis.

**Final Decision**
Sans for all UI, prose, headings, and data. Mono strictly for machine identifiers — never as texture, never for metrics, never for names. Tabular figures default. Face selection follows six criteria (Book I Ch. 5) so the choice is remakeable without abandoning the system.

**Expected Benefits**
One less axis of inconsistency. Numeric columns comparable by scanning rather than reading. Longevity — a neutral pairing does not date the way a display face does.

**Trade-offs**
We give up the most reliable route to an immediately distinctive typographic identity. Our type will read as unremarkable to a designer evaluating a screenshot, which is a real cost against a category where display type is common.

**Risks**
Mono creep — it is the most likely rule here to be broken, because mono reads as technical and that is tempting. Detection: mono anywhere other than an ID, hash, path, or code value.

**Consequences**
No third family may be introduced (Book I never 15). Headings differentiate by scale, weight, and space only. Any face adopted must ship true tabular figures and disambiguated glyphs — this is a hard selection filter, not a preference.

**Related Decisions**
Depends on `DDL-VIS-001`. Related: `DDL-VIS-002`, `DDL-VIS-004`.

**Related Governance Documents**
*Derives from:* Bible Ch. 9. *Enforced by:* Checklist §6.4, §14 D6.

**Related Product Areas**
Design system · all tables and data surfaces · marketing typography · Book II tokens.

**Review Trigger**
A brand identity decision that requires a display face for the wordmark or marketing headline — which would be a scoped exception for brand assets, not a change to product typography, and must be recorded as such.

**Amendment History**
2026-07-25 · Design Owner · Record created with Book I. Proposed pending approval.
2026-07-25 · Product Owner · **Accepted** on approval of the book.

---

## DDL-VIS-004 — Confidence rendered on a non-hue definition channel

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner · co-owner: AI Owner

**Decision Summary**
Confidence is expressed through **definition, explicitness, and words** — never hue. Low confidence renders as *less resolved*, not as *worse*.

**Context**
Filed with Book I. Checklist §8.11 identifies the trap: every conventional vocabulary for certainty — red-amber-green, progress bars, star ratings, percentage badges — reads as an axis of *quality*. A candidate shown with a red confidence indicator is read as a bad candidate rather than as one we know little about, and §8.11 states plainly that the misreading is our defect, not the user's error.

Governance names the constraint (non-hue, intensity-based) but does not specify the mechanism. This record supplies it.

**Problem Statement**
What visual channel expresses degree of certainty without colliding with the semantic state palette and without being read as a judgment of the person?

**Alternatives Considered**

1. **A dedicated confidence hue**, distinct from the four semantic colors.
2. **Opacity applied to the whole component** at lower confidence.
3. **A neutral bar or meter**, uncolored.
4. **Definition channel** — the claim rendered at reduced contrast and completeness, with an explicit qualifier and a resolution mark.

**Why Alternatives Were Rejected**

1. **Dedicated hue** — rejected. Any hue placed beside the state palette gets read against it, and a fifth semantic color makes the whole palette harder to learn. It also spends color on something Bible Ch. 8 assigns to intensity.
2. **Component opacity** — rejected. It reduces contrast indiscriminately, breaking the Ch. 12 floors, and it makes low-confidence content *harder to read* precisely when the user most needs to read it carefully.
3. **Neutral meter** — rejected as the most dangerous option. Anything shaped like a bar is read as a score regardless of its color, so it reintroduces the quality misreading through form rather than hue.
4. **Definition channel** — accepted. It is honest to the epistemics (*we see this less clearly*), it makes the misreading structurally unavailable because reduced definition does not resemble a warning, and it is the Resolution metaphor doing structural work rather than decorating.

**Final Decision**
Confidence carries: the tier stated in words; the claim rendered at full or reduced definition; an explicit qualifier naming what is missing at lower tiers; and a resolution mark whose completeness encodes tier. Three tiers, never four. Where calibration is unvalidated, evidence sufficiency replaces confidence. Applies identically in charts (Book I Ch. 11).

**Expected Benefits**
The product's central differentiator becomes visually unmistakable and hard to copy without the architecture behind it. The good/bad misreading is designed out rather than warned against. Immune to grayscale, color-vision deficiency, and projection by construction.

**Trade-offs**
Less immediately legible than a red-amber-green badge, which every user already knows how to read. It requires a short learning step, and it will be argued as insufficiently obvious. Accepted: the obvious version communicates the wrong thing, and a fast wrong read is worse than a slightly slower correct one.

**Risks**
Reduced definition drifts far enough to breach contrast floors — mitigated by Ch. 12 minimums applying without exception, including to low-confidence text. Second risk: a future surface reintroduces a percentage or a bar under delivery pressure, which is a §8.10/§8.11 gate failure and should be caught at review.

**Consequences**
No confidence display uses hue, anywhere. Charts express uncertainty as extent or reduced definition (Ch. 11). Marketing must show a low-confidence state (Checklist §10.8). The resolution mark becomes a Book II component with its own specification.

**Related Decisions**
Depends on `DDL-AIX-001`, `DDL-BRD-001`, `DDL-VIS-001`. Related: `DDL-GOV-004` (Gate 2).

**Related Governance Documents**
*Derives from:* Bible Ch. 8 (tier 3), Ch. 7. *Enforced by:* Checklist §8.11 (**Gate 2**), §8.10, §10.8.

**Related Product Areas**
Every surface where model output reaches a user · candidate assessment · comparison · search ranking · analytics · marketing imagery.

**Review Trigger**
Calibration validated against outcome data, which would permit genuine numeric confidence and require revisiting how precision is displayed. **Or** usability evidence that the definition channel is not being read as certainty — which would be a real failure and must be tested rather than assumed.

**Amendment History**
2026-07-25 · Design Owner · Record created with Book I. Proposed pending approval.
2026-07-25 · Product Owner · **Accepted** on approval of the book.

---

## DDL-VIS-005 — Desktop-first with density-preserving adaptation

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner · co-owner: UX Owner

**Decision Summary**
Product surfaces are designed desktop-first at a 1280–1535px reference viewport. Narrow viewports adapt by **removing panels, never by reducing density**. Marketing surfaces are designed responsive-first.

**Context**
Filed with Book I. The primary user works at volume, on a laptop, in a browser, alongside other tools, for hours. The workspace derives its value from seeing evidence and subject simultaneously, which has no meaningful mobile analogue.

**Problem Statement**
What responsive posture serves a dense, multi-panel workspace without producing either an unusable mobile experience or a loose, under-informative desktop one?

**Alternatives Considered**

1. **Mobile-first**, the prevailing default.
2. **Desktop-first with proportional scaling** — same panels, everything smaller.
3. **Desktop-first with panel removal**, density preserved.
4. **Separate mobile application** with its own design language.

**Why Alternatives Were Rejected**

1. **Mobile-first** — rejected because it means designing the least important experience first and expanding into the important one, which reliably produces loose, oversized desktop screens. Correct for most products; wrong for a dense workspace.
2. **Proportional scaling** — rejected as the worst option. It preserves all information at unusable size and breaks the Ch. 12 contrast and hit-target floors to do it.
3. **Panel removal** — accepted. Fewer regions, each at full density.
4. **Separate mobile app** — rejected as sub-branding, which Bible Ch. 15 prohibits and which Book I Ch. 15 names as the largest five-year risk.

**Final Decision**
Five breakpoints, authored at Standard (1280–1535). Panels collapse in fixed priority: Inspector, then Navigation, then Index. **Subject is never collapsed.** Type sizes, border weight, radius, contrast targets, and hit-target minimums do not change across viewports. Below 768px the workspace becomes a reading-and-triage surface, and tasks unavailable there are stated as unavailable rather than degraded.

**Expected Benefits**
A desktop experience designed for the viewport where the work actually happens. A mobile experience that is honest about its scope instead of offering a version that would produce worse decisions.

**Trade-offs**
**Mobile requires deliberate, separate design work rather than falling out of the process.** Some product surfaces will not have a mobile version — a real limitation, accepted knowingly, and one that must be stated plainly rather than concealed.

**Risks**
Mobile is deferred indefinitely because it is never the sprint's priority — the predictable failure of desktop-first. Detection: analytics showing mobile attempts on surfaces with no mobile design. Second risk: authoring drifts to wide monitors, producing layouts that feel correct nowhere.

**Consequences**
Design files are authored at the Standard reference viewport. Every collapse step is a designed state, not a media-query fallback. Checklist §11.8 (200% zoom, narrow viewport) is satisfied by the same panel-removal mechanism, so accessibility and responsive share one implementation rather than competing.

**Related Decisions**
Depends on `DDL-VIS-001`. Related: `DDL-VIS-002`.

**Related Governance Documents**
*Derives from:* Bible Ch. 6 (density as respect). *Enforced by:* Checklist §11.8, §6.12. Governance is silent on responsive posture; this decision fills that space without contradicting it.

**Related Product Areas**
All product surfaces · workspace panel architecture · marketing (responsive-first, separate) · design file conventions.

**Review Trigger**
Evidence that a meaningful share of primary workflow occurs on tablet or mobile, measured rather than assumed — which would make the workspace's mobile scope a product question rather than a layout one.

**Amendment History**
2026-07-25 · Design Owner · Record created with Book I. Proposed pending approval.
2026-07-25 · Product Owner · **Accepted** on approval of the book.

---

## DDL-VIS-006 — Three-tier token architecture; components consume semantic tokens only

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner · co-owner: Engineering Owner

**Decision Summary**
Design tokens are structured in three tiers — primitive, semantic, component. **Components reference semantic tokens exclusively**; primitives and raw values are prohibited at the component layer. Spacing tokens are named by register, not by pixel value.

**Context**
Filed with Book II. Book I established rules — the register law, three elevation levels, four colour tiers, confidence-without-hue — that live in a document and are therefore followed by people who have read it recently. Checklist §12.2 already requires token compliance and states that a token gap is fixed by adding the token, never by hard-coding.

**Problem Statement**
What token architecture makes Book I's rules structural rather than advisory — so that the correct choice is the available one and an incorrect choice is visible in review?

**Alternatives Considered**

1. **Flat token set** — one layer of named values.
2. **Two tiers** — primitive and semantic, with components free to use either.
3. **Three tiers with a strict semantic-only rule at the component layer.**
4. **Pixel-named spacing** (`space-16`) rather than register-named (`space-inter-2`).

**Why Alternatives Were Rejected**

1. **Flat** — every reference becomes a claim that the *value* is right rather than the *meaning*, which breaks the first time the ramp is retuned or a theme is added.
2. **Two tiers, permissive** — rejected because permission is the whole problem. A component referencing `neutral-7` is asserting a specific grey; dark theme immediately proves it wrong, and nothing catches it.
3. **Three tiers, strict** — accepted. The semantic layer becomes the theme boundary, and nothing above it is theme-aware.
4. **Pixel-named spacing** — rejected, and this is the substantive part of the decision. Book I Ch. 4 makes the register law (Section > Inter > Intra) the mechanism preventing uniform spacing, which Checklist §14 D5 catalogues as a smell that passes every check phrased as "is spacing consistent." **Encoding the register in the name makes a violation legible in a diff**: `space-section-1` between a label and its value is visibly wrong, where `space-48` is just a number.

**Final Decision**
As summarized. Elevation is a composite token (surface + border + shadow) because dark theme carries depth through a lightness step rather than shadow, and composing it per-component would produce a dark theme with no perceptible elevation. Components accept no spacing or colour overrides.

**Expected Benefits**
Book I's rules become enforceable in code review rather than in memory. Theming resolves in one place. Two designers produce matching output without coordination.

**Trade-offs**
More indirection than a flat set, and a real learning cost — a contributor must learn the semantic vocabulary before they can build anything. Naming by register is unfamiliar and will be argued as needlessly abstract by anyone who has not read Book I Ch. 4.

**Risks**
Erosion through component-level overrides, one reasonable exception at a time. **Leading indicator: any component accepting a padding, spacing, or colour prop.** Second risk: semantic tokens proliferate until the layer is as unmanageable as primitives — mitigated by Tier 3 admitting a token only when it is genuinely local to one component.

**Consequences**
No component may reference a primitive. No component exposes spacing configuration. A token gap is fixed by adding the token (Checklist §12.2, **Gate 5** adjacency). Confidence gets named tokens that resolve to non-hue values, which makes reaching for `color-state-warning-fg` to express uncertainty visibly wrong to a reviewer.

**Related Decisions**
Depends on `DDL-VIS-001`, `DDL-VIS-002`, `DDL-VIS-004`. Related: `DDL-VIS-003`.

**Related Governance Documents**
*Derives from:* Bible Ch. 8; Book I Ch. 1–8. *Enforced by:* Checklist §12.2, §6.10.

**Related Product Areas**
Design system implementation · every component · theming · Book III motion hooks.

**Review Trigger**
A platform change altering how theming resolves, or evidence that the semantic layer has grown past the point of being learnable — measured by contributors reaching for primitives, not by token count.

**Amendment History**
2026-07-25 · Design Owner · Record created with Book II. Proposed pending approval.
2026-07-25 · Product Owner · **Accepted** on approval of the book.

---

## DDL-VIS-007 — No candidate photography on assessment surfaces

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner · co-owner: AI Owner

**Decision Summary**
Candidate photographs do not appear on assessment surfaces — candidate rows, cards, comparison, ranking, or review. Recruiter and interviewer avatars are unaffected. Initials are the default candidate identity rendering.

**Context**
Filed with Book II (C-17 Avatar). **This is an interpretation of governance, not a rule governance states**, and it is filed precisely so that the interpretation is visible and reviewable rather than embedded silently in a component spec.

Bible Ch. 2 commits us to never assessing protected characteristics. Checklist §8.6 prohibits any assessment *referencing* them. A rendered photograph does neither — it makes inferences about age, ethnicity, gender, and appearance *available* at the moment of judgement, through a channel that never enters the evidence trail.

**Problem Statement**
Should candidate photographs appear adjacent to assessments, given that governance does not prohibit them and that photographs are a documented bias vector in exactly this context?

**Alternatives Considered**

1. **Show photographs** where available, as most hiring tools do.
2. **Show photographs with an option to hide them.**
3. **Do not show photographs on assessment surfaces**; initials as default.
4. **Hide by default, reveal on explicit request.**

**Why Alternatives Were Rejected**

1. **Show** — rejected. It sits directly against the product's central claim: that reasoning is traceable. A face beside a score influences the decision through a channel that is unlogged and unauditable, in a product built to make influence auditable.
2. **Optional hide** — rejected because defaults are what actually ship. An option nobody changes is a decision made by inaction, and it puts the burden on the recruiter to protect against a bias we introduced.
3. **Do not show** — accepted.
4. **Reveal on request** — considered seriously and rejected as worse than either. It makes viewing a face a deliberate act adjacent to an assessment, which is a stranger artifact than simply not showing it, and it creates an audit question we would then have to answer.

**Final Decision**
As summarized. The distinction is *who is being evaluated*: recruiter, interviewer, and note-author avatars are unaffected because they are not the subject of assessment.

**Expected Benefits**
Removes a bias vector from the moment of decision at no cost to the recruiter's task — a photograph does not help anyone decide who to hire. Consistent with the traceability claim. Defensible in a security, legal, or procurement review, where it is a differentiator rather than a limitation.

**Trade-offs**
Recruiters accustomed to photographs will find candidates harder to recognise at a glance in a queue, which is a genuine ergonomic cost in high-volume workflows. Some customers will ask for photographs and we will decline. **Neither cost is imaginary and both are accepted.**

**Risks**
A future workflow legitimately requires candidate imagery — identity verification, for instance — and this decision is treated as blocking it. Mitigation: that would be a scoped decision with its own record, not a relaxation of this default. Second risk: the interpretation is judged to exceed governance, in which case this record is rejected and C-17 changes — which is why it is a record rather than a rule.

**Consequences**
C-17 renders initials as a first-class state, not a degraded fallback. D-04, D-07 carry no imagery. Book I Ch. 10 already prohibits real candidate data in marketing imagery; this extends the same reasoning into the running product.

**Related Decisions**
Depends on `DDL-POS-003` (claim boundaries), `DDL-AIX-001`. Related: `DDL-VIS-004`.

**Related Governance Documents**
*Derives from:* Bible Ch. 2, Ch. 14. *Adjacent to:* Checklist §8.6 (**Gate 2**) — this decision is consistent with it but is **not required by it**, and that distinction is deliberate.

**Related Product Areas**
Candidate rows · candidate cards · comparison · ranking · review · search results.

**Review Trigger**
A product requirement that genuinely needs candidate imagery, **or** a determination by the Product Owner that this interpretation exceeds what governance supports — in which case reject this record rather than amending governance, since governance never required it.

**Amendment History**
2026-07-25 · Design Owner · Record created with Book II. Filed explicitly as an interpretation, not as a governance requirement.

---

## DDL-VIS-008 — Toasts restricted to asynchronous completion

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner · co-owner: UX Owner

**Decision Summary**
Toasts notify only that an **asynchronous** operation completed or failed. Feedback for a direct user action is **inline, at the site of the action**. Errors requiring action never use a toast.

**Context**
Filed with Book II (C-22). Toasts are the default success-feedback pattern across the industry, which is why this needs a record: we are departing from a near-universal convention, and without a written reason the convention will reassert itself.

**Problem Statement**
Where should feedback appear, given that the transient-corner-notification pattern is what every contributor will reach for by default?

**Alternatives Considered**

1. **Conventional toasts** for all feedback.
2. **Inline only**, no toast component.
3. **Toasts restricted to async completion; inline as the default.**

**Why Alternatives Were Rejected**

1. **Conventional** — rejected on Bible Ch. 13: feedback is proportional to consequence and belongs at the point of consequence. A toast appears away from where the user is looking, disappears on a timer, stacks, and is frequently missed. A saved field should say "saved" where the field is.
2. **Inline only** — rejected because background work genuinely completes when the user is elsewhere, and inline feedback has nowhere to appear. A batch analysis finishing needs a channel.
3. **Restricted** — accepted.

**Final Decision**
As summarized. Error toasts do not auto-dismiss. Maximum three stacked, then collapse to a count. Never the only notification of an important event.

**Expected Benefits**
Feedback where the user is looking. A notification channel that retains meaning because it is rare. Fewer missed confirmations.

**Trade-offs**
Inline feedback requires design work per surface, where a toast is one shared component — this is more expensive and it is the reason the convention exists. Contributors will need the reason explained repeatedly, since the pattern is deeply habitual.

**Risks**
Erosion: one toast for a direct action, then another. Each is defensible in isolation and the aggregate is notification noise, which then costs us the toast that mattered. Detection: any toast fired synchronously from a user gesture.

**Consequences**
Every surface with mutations designs its inline feedback. C-24 Alert handles persistent conditions. The toast component exists but is rarely correct.

**Related Decisions**
Related: `DDL-VIS-006`.

**Related Governance Documents**
*Derives from:* Bible Ch. 13 (feedback proportional to consequence). *Enforced by:* Checklist §5.7 (all states designed).

**Related Product Areas**
All mutation surfaces · batch operations · import and export · bulk actions.

**Review Trigger**
Evidence that inline feedback is being missed at a higher rate than toasts were — measured, not assumed.

**Amendment History**
2026-07-25 · Design Owner · Record created with Book II. Proposed pending approval.
2026-07-25 · Product Owner · **Accepted** on approval of the book.

---

## DDL-VIS-009 — Table and Data Grid are distinct components

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner · co-owner: Engineering Owner

**Decision Summary**
Table (C-31, read and compare) and Data Grid (C-32, edit in place) are separate components with separate contracts. Neither is a mode of the other.

**Context**
Filed with Book II. Most design systems ship one tabular component with an editing mode, because they share a visual structure. Book I Ch. 11 establishes the table as our primary data visualisation, which raises the cost of getting it wrong.

**Problem Statement**
Should reading and editing tabular data be one component with modes, or two components?

**Alternatives Considered**

1. **One component with an edit mode.** Shared code, shared styling.
2. **Two components** with distinct contracts.
3. **One component, edit delegated to a cell-renderer plugin.**

**Why Alternatives Were Rejected**

1. **One with modes** — rejected because the affordances directly conflict. A read table wants minimal chrome, truncation, and row-level selection. An edit grid needs visible cell boundaries, cell-level focus, an editing state, per-cell validation, conflict handling, and undo. **Merging them produces a table that is noisy to read and a grid that is unsafe to edit** — and the read table is our primary visualisation, so the cost lands on the more important surface.
2. **Two components** — accepted.
3. **Plugin** — rejected as option 1 with indirection. The conflicting requirements remain; they are just harder to see.

**Final Decision**
Two components. Table inherits Book I's typography, alignment, and no-zebra rules. Data Grid adds visible cell boundaries — the one place `color-border-subtle` appears on every cell — plus two-dimensional keyboard navigation, per-cell validation, and a mandatory `conflicted` state.

**Expected Benefits**
Each is optimised for its actual job. The read table stays quiet, which matters because it is where most user time is spent. The grid can be as explicit as safe editing requires without polluting the read case.

**Trade-offs**
Two components to build and maintain where most systems have one. Some duplicated implementation. Contributors will ask why, which is what this record answers.

**Risks**
Divergence — the two drift in typography or alignment until they no longer look related. Mitigation: Data Grid inherits Table's type and alignment tokens rather than defining its own. Second risk: someone builds editing into Table under deadline pressure, which is a system change made by accident.

**Consequences**
Editing requirements route to C-32. Data Grid requires a `conflicted` cell state — concurrent editing is real, and silently overwriting a colleague's change is a data-integrity failure presented as a UI convenience. Grid keyboard navigation is among the most demanding patterns in the system and is not optional (Checklist §11, **Gate 1**).

**Related Decisions**
Depends on `DDL-VIS-006`. Related: `DDL-VIS-002`.

**Related Governance Documents**
*Derives from:* Book I Ch. 5, Ch. 11. *Enforced by:* Checklist §11, §5.8.

**Related Product Areas**
All Index panels · bulk correction surfaces · structured annotation · analytics tables.

**Review Trigger**
Evidence that the two have diverged visually, or a surface that genuinely needs both behaviours simultaneously — which would be a real finding worth a versioned change to Book II rather than a local merge.

**Amendment History**
2026-07-25 · Design Owner · Record created with Book II. Proposed pending approval.
2026-07-25 · Product Owner · **Accepted** on approval of the book.

---

## DDL-VIS-010 — Narrow container added between Reading and Working

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner · co-owner: Engineering Owner

**Decision Summary**
A fourth named container, **Narrow (1000px)**, is added between Reading (680px) and Working (1280px). It is a **system refinement to be folded into the next amendment of Book I Ch. 2** — not an implementation exception.

**Context**
Surfaced during Engineering Phase 2, Scene 08. Book I Ch. 2 names three containers: Reading 680, Working 1120–1440 (optimum 1280), Field fluid. Three frozen scene specs call for widths in the 940–1000 band: Scene 06 at 1000px, Scene 07 at 940px, Scene 08 at 1000px. **All three fall below Working's 1120 floor and above Reading's maximum.**

Neither frozen document is wrong. Book I's three containers were derived from the product's panel system; the scene widths were derived from composition. The gap is between them, and it only became visible when something was built.

**Problem Statement**
What is the correct response when a frozen scene specification requires a container width the frozen container system does not name?

**Alternatives Considered**

1. **Hard-code the pixel value** in each scene.
2. **Round to Working (1280px)** and treat the scene specs as approximate.
3. **Round to Reading (680px)** and let the scenes run narrower than specified.
4. **Add a fourth container token**, applied consistently.

**Why Alternatives Were Rejected**

1. **Hard-code** — prohibited. Book II Ch. 1 admits no raw values, and Checklist §12.2 is explicit: a token gap is a system gap to be fixed by adding the token, never tolerated as a mismatch. One hard-coded value is trivial; four hundred are a rewrite, and nobody can point to when it happened.
2. **Round up to Working** — rejected. It would silently widen three scenes past their approved composition, and Scene 06's commitments table in particular was frozen with a specific measure after a recorded length problem.
3. **Round down to Reading** — rejected for the same reason in the other direction: Scene 08's two-by-two grid and Scene 06's two-column table do not work at prose measure.
4. **Fourth container** — accepted, and deliberately **not** as a local exception.

**Final Decision**
`--container-hp-narrow: 1000px`, exposed as the `narrow` option on the Container primitive alongside reading, working and field. Applied to Scenes 06, 07 and 08.

**Recorded as a system refinement.** The next amendment of Book I Ch. 2 should name four containers rather than three. Until that amendment, the token exists and is used; it is not an outstanding deviation.

**Expected Benefits**
Closes a real gap between two frozen documents rather than papering over it per-scene. Three scenes share one token, so the measure stays consistent and changeable in one place.

**Trade-offs**
A fourth container is one more thing to learn and one more decision at authoring time. Book I chose three deliberately — more containers means more opportunity to pick the wrong one. Accepted because the alternative was three scenes each hard-coding a value, which is worse on every axis.

**Risks**
Container proliferation: a fifth is now easier to justify than the fourth was. **Mitigation: Narrow is the last addition without an explicit Book I amendment.** Any further container requires the amendment first, not after.

**Consequences**
Book I Ch. 2 requires amendment at its next revision to name four containers. Scenes 06, 07, 08 consume `narrow`. The three original container widths were converted from arbitrary values to generated utilities in the same change — behaviourally identical, and it removes the last arbitrary-value usage from the container primitive.

**Related Decisions**
Depends on `DDL-VIS-006` (three-tier token architecture). Related: `DDL-MKT-004`, `DDL-MKT-006`, `DDL-MKT-007`.

**Related Governance Documents**
*Derives from:* Book I Ch. 2 (containers), Ch. 15 (a token gap is a system gap). *Enforced by:* Checklist §12.2. **Requires amendment of:** Book I Ch. 2.

**Related Product Areas**
Design token layer · Container primitive · Homepage Scenes 06, 07, 08.

**Review Trigger**
The next amendment of Book I, at which point Ch. 2 names four containers and this record is discharged. **Or** a request for a fifth container, which requires the amendment first.

**Amendment History**
2026-07-25 · Engineering Owner · Gap discovered implementing Scene 08; token added as the governed response under Checklist §12.2 and reported rather than absorbed.
2026-07-25 · Product Owner · **Accepted** as a system refinement, explicitly not as an implementation exception.

---

## DDL-MKT-001 — Homepage narrative arc: nine scenes across five movements

**Status:** Proposed
**Date:** 2026-07-25
**Owner:** Marketing Owner · co-owner: Design Owner

**Decision Summary**
The homepage follows nine scenes mapped to Bible Ch. 4's five movements — Recognition, Relief, Comprehension, Confidence, Resolve — with one candidate carried continuously through the five Comprehension scenes.

**Context**
Filed with the Homepage Storyboard. The creative brief proposed an eight-beat arc (Chaos → Focus → Understanding → Evidence → Confidence → Decision → Trust → CTA) and explicitly invited challenge. Bible Ch. 4 is frozen and describes its sequence as "a mechanism, not a suggestion."

**Problem Statement**
What narrative sequence satisfies the frozen emotional arc while delivering what the proposed arc was reaching for?

**Alternatives Considered**

1. **The proposed arc as briefed**, eight beats opening on Chaos.
2. **The proposed arc with a Relief beat inserted** after Chaos.
3. **Nine scenes rebuilt on the five movements**, with a single candidate threaded through Comprehension.
4. **A feature-led structure** — capability sections in priority order.

**Why Alternatives Were Rejected**

1. **As briefed** — conflicts with Bible Ch. 4 in three places. Opening on Chaos cannot satisfy Movement I, which requires one claim, one focal point, and nothing moving; a chaos scene invites the opposite. It contains no Relief beat, so the first capability claim lands on unbroken skepticism. And Trust at position seven arrives after the reader already needed it (Movement IV precedes Resolve).
2. **Patched arc** — fixes the missing beat and leaves the opening and the Trust placement wrong. Half-compliance with a frozen mechanism is not compliance.
3. **Nine scenes on five movements** — accepted.
4. **Feature-led** — rejected as the inventory shape Bible Ch. 11 prohibits and Checklist §14 G3 catalogues. It has no thesis, so nothing is remembered.

**Final Decision**
Nine scenes: The Sentence · The Admission · The Pile · Resolution · The Trail · What We Don't Know · The Record · The Room · The Close. Movement III is not a feature tour but one decision followed from an overloaded queue to a defensible record, with the same candidate present in Scenes 03–07. Every scene boundary is a hard cut, a match cut, or an answer cut; the logical transition is always a question the previous scene raised.

**Expected Benefits**
Satisfies the frozen arc without losing what the brief wanted. The single-candidate thread makes five scenes read as one continuous thought rather than five feature sections, and it is the shape Bible Ch. 11 identifies as hardest for a competitor to copy — they would need the product to back it. The reader finishes able to explain HireLens to a colleague, which is the actual §10.2 comprehension test.

**Trade-offs**
Optimised for the engaged reader, not the scanner. A scanner-optimised page would front-load claims and thin the middle — cheaper to build and better on bounce metrics, and it produces a reader who can recite our benefits and could not describe what we do. **Scene 02 must therefore work standalone**, since it is the only scene a scanner reliably reads.

Second trade: the chaos the brief wanted as a spectacle appears instead as real content at real density in Scene 03. Less immediately dramatic; considerably more credible.

**Risks**
The single-candidate thread breaks if any scene substitutes a different example — the continuity is invisible when present and glaring when absent. Second risk: Scene 06 (the limitations turn) will be argued as momentum-killing by anyone optimising conversion, and removing it would strip the page of the beat that makes Scenes 03–05 credible retroactively.

**Consequences**
Scenes 02, 04, and 05 render model output and are therefore subject to **Gate 2** in full — sixteen checkpoints, no marketing exemption. Scene 02 satisfies the §10.8 obligation to show an imperfect state, and its position at number two is load-bearing rather than incidental. Scene 09 carries the only primary CTA.

**Related Decisions**
Depends on `DDL-POS-001`, `DDL-POS-002`, `DDL-BRD-001`. Related: `DDL-MKT-002`, `DDL-VIS-004`.

**Related Governance Documents**
*Derives from:* Bible Ch. 4 (five movements), Ch. 11 (storytelling shapes). *Enforced by:* Checklist §10.1, §10.2, §10.8, §8 (**Gate 2**), §10.7 (**Gate 3**).

**Related Product Areas**
Homepage · marketing site structure · Stitch prototyping briefs · marketing screenshot fixtures.

**Review Trigger**
Evidence that the Comprehension block loses readers before Scene 05 — measured by scroll depth and interaction rate, not assumed. **Not a trigger:** a request to front-load claims for conversion, which is the pressure this record exists to resist.

**Amendment History**
2026-07-25 · Marketing Owner · Record created with the Homepage Storyboard. The briefed arc was explicitly challenged and revised to follow frozen governance; no amendment to Bible Ch. 4 was sought or warranted.

---

## DDL-MKT-002 — Thinking is shown through structure, not animation

**Status:** Proposed
**Date:** 2026-07-25
**Owner:** Marketing Owner · co-owner: AI Owner

**Decision Summary**
The homepage conveys reasoning through **sequence and structure** — evidence before conclusion, uncertainty stated, one decision followed end to end — never through animated cognition. Page-wide motion budget: **three user-triggered moments.**

**Context**
Filed with the Homepage Storyboard. The creative brief asked that the reader feel they are "watching HireLens think." That instinct is right and has one obvious execution that is prohibited: a pulsing indicator, a typing cursor, a scanning sweep, or a deliberate pause simulating cognition.

**Problem Statement**
How does a page convey reasoning under a motion regime that prohibits loops, ambient motion, scroll-jacking, and any implication of computation duration?

**Alternatives Considered**

1. **Animated thinking** — the conventional execution.
2. **Scroll-driven choreography** — reasoning revealed as the reader scrolls.
3. **Structural** — the page organised the way reasoning is organised, near-zero motion.
4. **Restrained animation** — a small number of tasteful cognition cues.

**Why Alternatives Were Rejected**

1. **Animated thinking** — **prohibited.** Checklist §7.8 is **Gate 4**: no fake progress, no artificial thinking delay. §14 F3 explains the specific damage: it is a lie the interface tells about a product whose entire positioning is honest output, and discovery is catastrophic and permanent.
2. **Scroll choreography** — rejected. Scroll-jacking, pinning, and staggered reveals are prohibited (Bible Ch. 10), and each delays reading, which is Book II Ch. 9's second motion commitment.
3. **Structural** — accepted. Harder, and the only defensible option.
4. **Restrained animation** — rejected because the boundary is not one of degree. A brief cognition cue is still a cue about duration we are inventing. Once the principle is that some simulated thinking is acceptable, the amount becomes a negotiation.

**Final Decision**
Three motion moments page-wide, all user-triggered: a confidence state change (Scene 02), the separation (Scene 04), and primary-action feedback (Scene 09). Six of nine scenes are completely still. Nothing animates on load or on scroll. Every motion moment resolves and stops.

**Expected Benefits**
A page that is composed rather than anxious — which is the register Book I Ch. 1 commits to, and which differentiates immediately in a category where every hero is animated. Reduced-motion parity by construction rather than by remediation: because no motion carries meaning the layout does not already carry, nothing is lost (§14 H4). And it is the more impressive execution — anyone can animate a shimmer.

**Trade-offs**
Gives up the most immediately arresting version of the brief. A still hero will be argued as unfinished at least once, likely by someone comparing it side by side with an animated competitor. The structural approach is also more expensive: it requires the *content* to actually be organised as reasoning, where an animation could have implied it.

**Risks**
**The primary risk is downstream reinterpretation.** A Stitch brief or an implementation ticket carrying the phrase "watching HireLens think" without this constraint will produce animated cognition, and it will look good enough that it survives casual review. Mitigation: the storyboard states the prohibition in its Director's Note rather than in a footnote, and Scenes 02, 04, and 05 name it individually.

**Consequences**
No scroll-triggered reveals, parallax, pinned sections, ambient loops, shimmer, counting numbers, chart load animations, or scanning lines anywhere on the homepage. Any scene proposing motion must name what the reader would misunderstand without it (§7.1). Book III (Motion) may set the three durations; it may not add a fourth moment to this page without a versioned change.

**Related Decisions**
Depends on `DDL-POS-002`, `DDL-BRD-001`. Related: `DDL-MKT-001`, `DDL-VIS-004`.

**Related Governance Documents**
*Derives from:* Bible Ch. 10, Ch. 13; Book I Ch. 1. *Enforced by:* Checklist §7.8 (**Gate 4**), §7.1, §7.3, §7.7, §14 F3, §14 E1–E4.

**Related Product Areas**
Homepage · all marketing surfaces · Stitch prototyping briefs · Book III motion specification.

**Review Trigger**
Book III concluding that a fourth motion moment carries information the layout cannot — filed as a versioned change with the specific misunderstanding it prevents. **Not a trigger:** a judgement that the page feels static, which is the intended reading.

**Amendment History**
2026-07-25 · Marketing Owner · Record created with the Homepage Storyboard. Gate 4 risk in the brief's phrasing identified and resolved structurally.

---

## DDL-MKT-003 — Scene 05 evidence trail — three-column case file pattern

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Design Owner · co-owner: Marketing Owner

**Decision Summary**
Homepage Scene 05 uses a three-column case file pattern at 22 / 52 / 26: a conclusion navigator, the source document shown in situ, and an evidence inspector. **Structure is frozen; content is deferred to implementation.**

**Context**
Established through four structural explorations and two render passes on 2026-07-25. Scene 05 is the storyboard's load-bearing scene — the point at which the reader personally verifies that a conclusion resolves to the sentence that produced it (Bible Ch. 2, differentiator 1).

**Problem Statement**
What structure proves traceability rather than asserting it?

**Alternatives Considered**

1. **Institutional evidence** — three stacked exhibits, each a quotation with a provenance note in the margin.
2. **Interactive investigation** — a selectable list of conclusions with the evidence for the selected one opened in a tab strip.
3. **Comparative resolution** — the same candidate at two evidence levels side by side.
4. **Case file** — a source rail, the document itself with a highlighted passage and margin reference, and an inspector showing what was drawn from it.

**Why Alternatives Were Rejected**

1. **Stacked exhibits** — the quotations float, detached from the documents they came from. A floating quotation is indistinguishable from a fabricated one, which is the provenance-theatre failure at Checklist §14 F4. It is also entirely passive, where the storyboard makes this the most interactive scene on the page.
2. **Interactive investigation** — right interaction model, same floating-excerpt defect. Strictly dominated by option 4, which has the same source rail and selection state plus a real document.
3. **Comparative resolution** — **the best-executed artefact of the round and the wrong scene.** It demonstrates evidence accumulation, not provenance: nothing traverses from claim to source, and read is never distinguished from inferred. Reassigned to Scene 02, where it is stronger than anything the earlier round produced.
4. **Case file** — accepted. The only option that shows the passage **in situ**, with real surrounding paragraphs above and below it.

**Final Decision**
Frozen implementation baseline: three columns at 22 / 52 / 26 with 1px hairline separation; a five-row conclusion navigator with a neutral selected state (solid left edge bar, faint field, no shadow); the source document shown in place with a highlighted passage and a margin reference numeral; a six-field evidence inspector (passage reference, source, location, evidence type, verification state, dimension); a provenance note; a "report this as wrong" action; and neutral rendering of unsupported conclusions.

**Expected Benefits**
Provenance theatre is defeated structurally rather than by assertion — a reader who sees the surrounding paragraphs knows the quotation was not assembled for the demo. Satisfies §8.1 one-step traceability and §8.13 extraction-versus-inference at the pixel level.

**Trade-offs**
Three columns is the most demanding layout on the homepage and the least forgiving at narrow viewports. It also requires genuine document fixtures rather than excerpt strings, which is more work to prepare and to keep synthetic.

**Risks**
The two calm-absence states — "reference check — not received" in the rail and "not supported by this document" in the inspector — are the scene's costliest elements and the most likely to be "improved" into warnings during implementation (§14 F2, §8.15). Second risk: the margin numeral's tie to the inspector is currently asserted rather than shown, and will be dropped if not specified.

**Consequences**
Implementation tasks, not design questions: replace generated document text with approved fixtures; add a second highlighted passage; strengthen the margin-reference-to-inspector connection; verify bottom-anchored inspector actions. The scene is subject to **Gate 2** in full despite being a marketing surface, because it renders model output to a user.

**Related Decisions**
Depends on `DDL-MKT-001`, `DDL-AIX-001`, `DDL-VIS-004`. Related: `DDL-GOV-005`, `DDL-VIS-007`.

**Related Governance Documents**
*Derives from:* Homepage Storyboard, Scene 05; Bible Ch. 2, Ch. 14. *Enforced by:* Checklist §8.1, §8.13, §8.15 (**Gate 2**); Book I Ch. 2, Ch. 10.

**Related Product Areas**
Homepage Scene 05 · marketing fixtures · evidence panel pattern (Book II A-04) · candidate review surfaces.

**Review Trigger**
Implementation uncovers a structural problem the pattern cannot absorb. **Not a trigger:** content, copy, or fixture changes, which are explicitly deferred.

**Amendment History**
2026-07-25 · Design Owner · Structure frozen at the Product Owner's approval. Content explicitly not frozen — generated document text was invented by the tool against instruction and must not become the fixture by default.

---

## DDL-MKT-004 — Scene 06 limits — exhibit then grouped commitments

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Marketing Owner · co-owner: Design Owner

**Decision Summary**
Homepage Scene 06 is composed of three parts: a four-dimension evidence exhibit showing one gap in position, a single commitments table split into two labelled groups (three refusals, five limitations, each paired with its operational consequence), and a closing statement. **Structure and copy are both frozen.**

**Context**
Established through four structural explorations and one execution pass on 2026-07-25. Scene 06 is the storyboard's turn — the point at which the page deliberately breaks its own momentum to state limits, and the beat that makes Scenes 03 to 05 credible retroactively.

Unlike Scene 05, the copy here **is** frozen: it carries Gate 3 claim boundaries, and boundary language is not a fixture to be supplied later.

**Problem Statement**
What structure presents limitations as commitments rather than as caveats, while carrying the claim boundaries this scene is responsible for?

**Alternatives Considered**

1. **Declarative ledger** — eight numbered statements in a single column.
2. **Absence in position** — a dimension table with one row showing a gap, plus three commitment lines.
3. **Two taxonomies** — refusals and limitations as two side-by-side columns.
4. **Limit and consequence** — a two-column table pairing each limit with what we do about it.
5. **Composite** — option 2 as an opening exhibit, then option 4's structure carrying option 1's refusal content, grouped by option 3's distinction.

**Why Alternatives Were Rejected**

1. **Declarative ledger** — conflates two different things under one heading. Rows one to four are refusals; rows five to seven are limitations. Presenting them identically under "what we will not do" tells the reader we are *choosing* not to see an unrecorded conversation. A claim defect the layout makes invisible. Eight near-identical declaratives also read as terms of service.
2. **Absence in position** — the only direction that demonstrates rather than asserts, and the storyboard's literal metaphor. But it carries one limit type only and none of the Gate 3 refusals. Retained as the opening exhibit rather than rejected.
3. **Two taxonomies** — the sharpest thinking in the round: *"the left column is a choice. the right column is a limit."* That distinction answers the question a legal or security reviewer actually asks. But it states limits without consequences, and its two-column form broke alignment when left-column rows wrapped. **The insight was kept; the layout was not.**
4. **Limit and consequence** — strongest structure and best copy, missing the Gate 3 refusals.
5. **Composite** — accepted. The only arrangement in which the reader sees the gap, learns the difference between a choice and a ceiling, and reads every limit beside what we do about it.

**Final Decision**
Frozen baseline: centred container at 1000px. Part 1 — a four-row, three-column exhibit (30/45/25) with one dimension showing "Nothing on file" at identical weight to the others. Part 2 — a two-column table (42/58) with a vertical hairline and header labels "The limit" and "What we do", containing two peer-labelled groups of exactly three and exactly five rows. Part 3 — the closing statement, verbatim: *"None of these are things we intend to fix. They are the shape of honest work."*

**Expected Benefits**
Converts caveats into commitments mechanically — the reader cannot encounter a limitation without encountering the behaviour it produces. Row 2.3 restates Scene 05 as a commitment, locking the two scenes together so the turn reads as the argument's hinge rather than a detour. Carries all three Gate 3 boundaries in a form that explains their operational consequence rather than merely asserting them.

**Trade-offs**
Eight rows plus two group labels is a lot of vertical space for a scene the storyboard budgets at roughly 25 seconds. The execution pass rendered at 4354px, more than twice Scene 05's height, and the monotony risk identified before the render did materialise. Accepted because the alternative — cutting rows — would mean dropping either a claim boundary or a limitation, and neither is discretionary.

**Risks**
The neutral rendering of "Nothing on file" and the equal weight of the two columns are the scene's most fragile properties and the most likely to be adjusted during implementation. Second risk: at reduced padding the two group labels may begin to read as a heading hierarchy rather than as peers, which would reintroduce the ledger's category confusion.

**Consequences**
Implementation tasks, not design questions: tighten Part 2 row padding to roughly 60% of current section height; close the gap before the closing statement so it lands as conclusion; verify group labels remain peers at reduced padding. If the table still flattens at reduced height, the refusal group moves out as its own three-row block above the table. **Copy may not be altered without Marketing Owner approval** — it carries Gate 3 boundaries.

**Related Decisions**
Depends on `DDL-MKT-001`, `DDL-POS-003`, `DDL-GOV-005`. Related: `DDL-MKT-003`, `DDL-VIS-007`, `DDL-AIX-001`.

**Related Governance Documents**
*Derives from:* Homepage Storyboard, Scene 06; Bible Ch. 2, Ch. 14. *Enforced by:* Checklist §10.7 (**Gate 3**), §8.3, §8.15; Book I Ch. 5, Ch. 14.

**Related Product Areas**
Homepage Scene 06 · claim boundary language · trust surfaces · sales enablement.

**Review Trigger**
A change to the claim boundaries in Bible Ch. 2, which would require the three refusal rows to be rewritten. **Not a trigger:** a judgement that the section is long, which is a spacing task already recorded.

**Amendment History**
2026-07-25 · Marketing Owner · Structure and copy frozen at the Product Owner's approval, following a faithful execution pass. Sentence-case drift introduced in earlier generation prompts identified and corrected in this pass — all-lowercase is not sentence case and was never sanctioned by Book I Ch. 5.

---

## DDL-MKT-005 — Skeleton v1 pacing observations held as hypotheses

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Marketing Owner

**Decision Summary**
Pacing observations from Homepage Skeleton v1 are recorded as **hypotheses to be tested at V2 assembly**, not as defects to be fixed now. Scenes 01–04 are not revisited, and the roadmap continues to Scene 07.

**Context**
Homepage Skeleton v1 was assembled on 2026-07-25 from two frozen scenes (05, 06), four provisional bands (01–04), and three reserved placeholders. It surfaced several pacing observations, and the reviewing Creative Director recommended redirecting the next pass to Scenes 01–04 rather than proceeding to 07.

**Problem Statement**
Should pacing observations drawn from a page that is two-thirds unbuilt drive design work now, or be held until the page is complete?

**Alternatives Considered**

1. **Treat the observations as defects** and redesign Scenes 01–04 immediately.
2. **Hold them as hypotheses** and continue the roadmap to Scene 07.
3. **Partially act** — fix only the observations resting on rendered evidence rather than estimate.

**Why Alternatives Were Rejected**

1. **Redesign now** — rejected by the Product Owner on the grounds that Scenes 01–04 are still incomplete explorations, and optimising them against an unfinished page risks tuning to a shape that does not yet exist. Four of the nine scenes were absent from the skeleton entirely; the pacing they will produce is unknown.
2. **Hold as hypotheses** — accepted.
3. **Partial action** — rejected as the worst of both. Only two of the observations rest on rendered heights, and acting on those in isolation would tune the relationship between Scenes 05 and 06 without knowing what sits either side of them.

**Final Decision**
The following are recorded as **hypotheses**, to be tested against evidence at V2 assembly once all nine scenes are designed and frozen:

- **H1.** Scenes 03 and 04 are visually near-identical at page scale — both dense row stacks — so the resolution beat may read as repetition rather than as change. *(Rests on round-one concepts, not on a built scene.)*
- **H2.** Scene 06 is 2.1× the height of Scene 05, and roughly 1.27× after the tightening already recorded in `DDL-MKT-004`. The turn may therefore out-weigh the peak, inverting the storyboard's intended hierarchy. *(Rests on rendered heights — the strongest-evidenced hypothesis.)*
- **H3.** Scene 01 may be proportionally too short for a hero whose job is a held moment. *(Rests on estimate only.)*
- **H4.** The 02 → 03 transition may not answer the question Scene 02 raises. *(Rests on narrative reading, not on built scenes.)*
- **H5.** Interaction is concentrated entirely in the first half; the second half is read-only and also the densest. *(Correct per storyboard intent; flagged as a fatigue risk to confirm.)*
- **H6.** The 05 → 06 transition may strengthen if Scene 06's opening exhibit contracts in width after the page's widest moment. *(Spacing hypothesis.)*

**Expected Benefits**
Prevents four scenes being designed against pacing constraints derived from placeholder estimates. Preserves the observations so they are not lost, and gives V2 a written list to test rather than a fresh review from nothing.

**Trade-offs**
If any hypothesis is correct, the correction is more expensive at V2 than it would be now, because more scenes will depend on the affected geometry. H2 in particular touches a frozen scene. Accepted deliberately: the cost of a late correction is smaller than the cost of tuning an unbuilt page to imagined proportions.

**Risks**
Hypotheses accumulate and are never tested — the standard failure of deferred findings. Mitigated by V2 assembly being an explicit roadmap step with these six items as its agenda. Second risk: by V2, enough work depends on Scene 06's geometry that H2 becomes politically expensive to act on.

**Consequences**
Scenes 01–04 are not revisited. `DDL-MKT-004`'s tightening target stands unchanged; the Creative Director's proposed revision to 1600–1800px is **not** adopted, per the standing rule that frozen scenes change only when the completed homepage demonstrates a genuine structural conflict. Work proceeds to Scene 07. **V2 assembly must test all six hypotheses explicitly and record the outcome of each.**

**Related Decisions**
Related: `DDL-MKT-001`, `DDL-MKT-003`, `DDL-MKT-004`, `DDL-GOV-005`.

**Related Governance Documents**
*Derives from:* Homepage Storyboard (scroll journey map, emotional curve, motion density map). *Enforced by:* Checklist §17 (evidence classes) — the hypotheses are Class 8 reasoned argument except H2, which is Class 3.

**Related Product Areas**
Homepage assembly · Scenes 01–06 · V2 editorial review.

**Review Trigger**
V2 assembly, once all nine scenes are designed and frozen. **Each hypothesis is confirmed or discharged in writing at that point.**

**Amendment History**
2026-07-25 · Marketing Owner · Recorded at the Product Owner's decision, which overrode the Creative Director's recommendation to redirect to Scenes 01–04. The reasoning — that pacing cannot be evaluated against a two-thirds-unbuilt page — is accepted and recorded here rather than re-argued.

---

## DDL-MKT-006 — Scene 07 the record — retrieval-framed decision register

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Marketing Owner · co-owner: Design Owner

**Decision Summary**
Homepage Scene 07 is a single thirteen-row decision register, framed above by one question in the recruiter's voice and closed below by one sentence. **Structure frozen. Copy frozen except for four values shortened during the corrective render, which require confirmation at implementation.**

**Context**
Established through three structural explorations and two render passes on 2026-07-25. Scene 07 is the storyboard's arrival — the point at which the metaphor closes and the reader receives the artifact the product produces.

**Problem Statement**
What structure hands the reader a decision record as an object, in a scene whose job is the page's exhale?

**Alternatives Considered**

1. **The document** — single column, header block, three labelled sections with numbered sub-rows.
2. **The ledger entry** — one compact two-column register, audit-like.
3. **The record and its retrieval** — the register shown twice, October and April, with the recruiter's question between.
4. **Composite** — option 2's register, framed by option 3's question and closing line, without the duplication.

**Why Alternatives Were Rejected**

1. **The document** — renders as a form rather than a record. 2908px to carry thirteen lines, and numbered sub-rows produce a list of one under the final section, which reads as an error.
2. **The ledger entry** — strongest structure, weakest framing. It hands over the artifact without saying why the artifact matters.
3. **The record and its retrieval** — the best idea generated for this scene and the worst economy. Seven rows followed by eight near-identical rows costs 3048px and reads at page scale as the same table twice — intentional repetition that presents as a rendering fault. **More fundamentally, the duplication proves something that does not need proving:** record permanence is a property, not a differentiating claim. The scene's actual claim is that the output is a defensible decision rather than a score, and that is demonstrated by the register's content, not by showing it twice.
4. **Composite** — accepted.

**Final Decision**
Frozen baseline: centred container at 940px. One line of small grey text — *"April. Someone asks: why did we choose Vance over the other three?"* — then a hairline. A thirteen-row table at 32/68 with a vertical hairline, horizontal hairlines between every row, compact rows, and every label on a single line. Then a hairline, the closing line *"Nothing was reconstructed. The record was already written."*, and one plain text link.

**Must be built as a real table with paired cells per row.** The first render failed because the two columns were emitted as independent stacks; a wrapped value desynchronised label from value for the final four rows.

**Expected Benefits**
Hands the reader an artifact rather than a description of one. `Record status | Closed. Not editable.` carries permanence as a field, which is more economical than either prose or demonstration. The question frames the register as an answer to a real recruiter concern rather than as a display.

**Trade-offs**
Loses Direction C's demonstration of permanence. Accepted: the demonstration cost 50% more height for a claim the scene does not need to make, in the one scene whose job is to be quiet.

**Risks**
**The label/value desynchronisation will recur if the register is rebuilt as two flex columns rather than as paired table rows.** The first render inverted the `Not known at the time` value — a §8.15 statement rendered as its own opposite. This is recorded as a known failure mode, not a one-off. Second risk: the four shortened copy values are treated as approved rather than as artefacts of a structural fix.

**Consequences**
Implementation must pair each label and value in a single row. Four copy values were shortened during the corrective pass to prevent wrapping — `Bar applied`, `Reasoning 1`, `Reasoning 2`, `Not known at the time` — and **each must be confirmed or reverted against the approved wording at implementation.** Scene 07's content extent sits below Scene 05's, which keeps hypothesis H2 (`DDL-MKT-005`) from worsening.

**Related Decisions**
Depends on `DDL-MKT-001`, `DDL-GOV-005`. Related: `DDL-MKT-003`, `DDL-MKT-004`, `DDL-MKT-005`.

**Related Governance Documents**
*Derives from:* Homepage Storyboard, Scene 07; Bible Ch. 2 (differentiator 3, decision continuity), Ch. 7 (the metaphor closing). *Enforced by:* Checklist §8.15, §14 C5; Book I Ch. 5.

**Related Product Areas**
Homepage Scene 07 · decision record pattern · Book II D-08 score presentation · candidate review surfaces.

**Review Trigger**
V2 assembly, where Scene 07's role as the page's exhale is tested against the scenes either side of it. **Not a trigger:** a request to reinstate the retrieval duplication, which was considered and rejected on economy.

**Amendment History**
2026-07-25 · Marketing Owner · Structure frozen following a corrective render. The first execution pass failed on a structural defect that inverted a governance statement; the failure and its cause are recorded above so the rebuild does not repeat it.

---

## DDL-MKT-007 — Scenes 08–09 the closing act

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Marketing Owner · co-owner: Design Owner

**Decision Summary**
Scenes 08 and 09 are designed and frozen as one continuous closing act. **Scene 08** is a four-block prose grid plus a five-row specifics table, carrying organisational trust without enterprise-marketing devices. **Scene 09** is an editorial close of three short paragraphs that returns to Scene 01's opening sentence, followed by one primary action. Structure and copy both frozen.

**Context**
Designed together on 2026-07-25 with one Scene 08 treatment and three Scene 09 endings.

The brief for Scene 08 asked that trust emerge from product philosophy rather than enterprise marketing, and listed themes — transparency, explainability, auditability, human decision ownership, honest limitations. **Those themes are already carried by Scenes 05 and 06**, and building Scene 08 on them would reproduce hypothesis H1 at the level of meaning: two scenes making the same argument. The storyboard's Scene 08 is Movement IV — organisational trust — and Checklist §9.2 sets its test: can the reader defend us to someone else without us present? Nothing else on the page does that job.

**Problem Statement**
What closes the page: how does trust get stated without becoming enterprise marketing, and what ending makes the call to action feel inevitable rather than transactional?

**Alternatives Considered**

*Scene 08:* product-philosophy themes as briefed, versus organisational specifics in a product-philosophy register.
*Scene 09:* **A** quiet confidence — *"That is the whole product."* **B** invitation — *"Bring one open role… no integration required to start."* **C** editorial close — three paragraphs returning to the opening sentence.

**Why Alternatives Were Rejected**

*Scene 08 as briefed* — rejected as duplication. The themes listed are Scenes 05 and 06. Resolved by keeping Movement IV's substance and dropping the costume: no logos, badges, shields, padlocks, seals or compliance marks, and concrete values rather than adjectives (§9.3).

*Ending A* — restates a claim the page has already made. It summarises where it should resolve, and is the only ending that adds nothing.

*Ending B* — the most concrete reduction of next-step cost, which is what Movement V asks for. Rejected on two counts: a second action dilutes the single-primary rule, and *"we will show you what the evidence says"* promises the evidence will say something, which sits adjacent to §10.7.

*Ending C* — accepted. **The only ending that closes the argument rather than ending the page.**

**Final Decision**
Scene 08: centred 1000px container, a small grey lead line, a two-by-two prose grid on hairlines with headings *Your data*, *What the system may decide*, *What is auditable*, *Where a person is required*, then a five-row specifics table with concrete values for residency, retention, model training, access and export.

Scene 09: separated by a large gap and a hairline. Three short paragraphs at reading size on a 620px measure — the first reproducing Scene 01's opening sentence verbatim, the second conceding that software will not change the difficulty, the third naming what does change. One dark button, *"See it on your own roles"*. No secondary link, no urgency, no countdown, no newsletter field.

**Expected Benefits**
Scene 08 gives a champion something they can repeat accurately in a security or legal review (§9.2). Scene 09's loop closure is the mechanism that makes the CTA inevitable: the reader recognises their own opening problem returned to them, altered. Its second paragraph — *"no software will make it otherwise"* — is a voluntary constraint at the exact moment competitors over-promise, which is Bible Ch. 14's engine deployed where it costs most.

**Trade-offs**
Ending C is the longest of the three; the reader passes three paragraphs before the action. Accepted: the paragraphs are the resolution, not a preamble to it. Scene 09 also forgoes ending B's concrete next-step reduction, which measurably lowers friction. That line belongs on the destination page — **a logistics reassurance placed after "you will be able to say why" would deflate the close**, and it was deliberately not grafted in.

**Risks**
Scene 08's specifics table will be read as a compliance section and attract badges, seals or logos during implementation. The absence of those devices is the decision, not an omission. Second risk: Scene 09's second paragraph will be read as underselling and softened — *"no software will make it otherwise"* is the most likely sentence on the page to be edited out, and it is the one carrying the most trust.

**Consequences**
Scene 08 carries the only organisational-trust content on the page; if it is cut or thinned, §9.2 is unmet and no other scene covers it. Scene 09's first paragraph is bound to Scene 01's opening sentence — **if Scene 01's copy changes, Scene 09 must change with it**, or the loop breaks silently. One primary action, no secondary.

**Related Decisions**
Depends on `DDL-MKT-001`, `DDL-POS-003`, `DDL-GOV-005`. Related: `DDL-MKT-004`, `DDL-MKT-005`, `DDL-MKT-006`.

**Related Governance Documents**
*Derives from:* Homepage Storyboard, Scenes 08–09; Bible Ch. 4 (Movements IV and V), Ch. 14. *Enforced by:* Checklist §9.2, §9.3, §9.7, §10.7 (**Gate 3**), §10.9.

**Related Product Areas**
Homepage Scenes 08–09 · trust and security messaging · sales enablement · destination page after the primary action.

**Review Trigger**
A change to Scene 01's opening sentence, which breaks the loop closure. **Or** a security or legal review that the specifics table fails to answer, which would mean §9.2 is unmet.

**Amendment History**
2026-07-25 · Marketing Owner · Both scenes frozen. Scene 08's brief conflicted with the frozen storyboard and with Scene 06; resolved by keeping Movement IV's substance in the requested register, reported rather than silently reconciled.

---

## DDL-MKT-008 — Scene 05 fixtures frozen as single source of truth

**Status:** Accepted
**Date:** 2026-07-25
**Owner:** Marketing Owner · co-owner: Design Ops

**Decision Summary**
`FIXTURES_SCENE_05.md` **v1.0.0** is frozen as the single source of truth for Scene 05. It carries a Fixture Stability Contract (§12) defining twenty-one invariants that may not change without a major version increment and Marketing Owner approval.

**Context**
Scene 05 was blocked on fixtures. Implementation Package §8 required a take-home document with two citable passages, a conclusion set, a dimension set and a decision register — none of which existed. Generated content from the exploration passes was explicitly **not** the fixture (`DDL-MKT-003`, `DDL-MKT-006`).

Scenes 06 and 07 were implemented before the fixture existed, and their frozen copy already asserts specific counts: *three passages across two documents*, *four passages across three documents*, *referenced three times, never stated directly*, *nothing on file*. **Those numbers only reconcile because the fixture says what it says.**

**Problem Statement**
How is fixture content governed once two frozen scenes depend on its internal relationships?

**Alternatives Considered**

1. **Treat fixtures as content** — editable freely, like marketing copy.
2. **Treat fixtures as code** — versioned in the implementation module, changed by engineering.
3. **Freeze with an explicit stability contract** naming which relationships are load-bearing.

**Why Alternatives Were Rejected**

1. **Content** — rejected. A fixture edit is a **cross-scene change**, not a tweak. Editing "three passages" to "four" silently falsifies a Gate 3 register two scenes away, and nothing in the build would catch it. The failure is invisible precisely because each edit looks local.
2. **Code** — rejected. It would put Gate 3 copy behind an engineering change and make the reconciliation invisible to the Marketing Owner, who is accountable for the claim boundaries the counts support.
3. **Frozen with a stability contract** — accepted. It distinguishes prose that may improve freely from relationships that may not move.

**Final Decision**
Frozen at v1.0.0. §12 defines three tiers: patch (prose, no invariant touched), minor (additive only), major (**any** invariant changes — a governance event requiring re-approval of Scene 06 and Scene 07 registers).

Twenty-one invariants across identity and chronology, sources, passages and citation, counts, conclusions, disagreement, and character of the data. §12.3 sets precedence: **where the fixture and a frozen scene register disagree, the register wins and the fixture is corrected** — the sole exception being the take-home text itself, which exists nowhere else.

**Expected Benefits**
Makes a class of silent breakage impossible to introduce accidentally. A contributor improving prose can do so freely; one changing a count now hits an explicit gate. The §10 consistency check gives twelve reconciling rows that must be re-run on every edit.

**Trade-offs**
Editing fixtures is now heavier than editing content, which will feel disproportionate to whoever first wants to change a number. Accepted: the alternative is a page whose internal truth degrades one reasonable edit at a time, with no failing test to catch it.

**Risks**
The contract is treated as advisory and a count is edited without the increment — the exact failure it exists to prevent, now merely documented rather than enforced. **Mitigation: Scene 05's test suite asserts the counts, so a fixture edit that breaks reconciliation fails the build.** Second risk: the fixture drifts from the implementation module derived from it. Mitigation: the module cites this document and its version.

**Consequences**
Scene 05 implementation uses this document as its **only** content source — no invented copy, no abbreviation, no simplification. Any invariant change requires re-verification of Scenes 05, 06 and 07 and re-approval of two Gate 3 registers. The deliberate near-miss in §20 (~40k hypothetical against ~35k actual) is an invariant: a fixture where every figure aligned would read as fabricated.

**Related Decisions**
Depends on `DDL-MKT-003`, `DDL-MKT-004`, `DDL-MKT-006`. Related: `DDL-MKT-007`.

**Related Governance Documents**
*Derives from:* Implementation Package §8; Book I Ch. 10 (real data). *Enforced by:* Checklist §14 C3 (demo data), §8.1, §8.13, §8.15 (**Gate 2**), §10.7 (**Gate 3**).

**Related Product Areas**
Homepage Scene 05 · Scenes 06 and 07 registers · marketing fixture policy · future scene fixtures.

**Review Trigger**
Any proposed change to a §12.2 invariant. **Or** a second scene requiring its own fixture set, at which point this contract becomes the template rather than a one-off.

**Amendment History**
2026-07-25 · Design Ops · Fixture authored and frozen at v1.0.0 with the Stability Contract added at the Product Owner's instruction.

---

# Version History

| Version | Date | Status | Summary |
|---|---|---|---|
| **1.0** | 2026-07-25 | Structure Frozen · Records Active | Initial release, approved. Establishes lifecycle, categories, ID convention, cross-reference strategy, ownership model, amendment workflow, superseding rules, archiving policy, and record template. Ten founding records covering positioning, brand, governance, AI experience, and visual system. Structure (§1–§9) frozen on approval; records remain open for addition. |

## Status: dual

This document carries two statuses at once. The distinction is the point, and conflating them is the failure this clause prevents.

| Part | Scope | Status | Change policy |
|---|---|---|---|
| **Structure** | §1–§9 — schema, decision lifecycle, status model, categories, ID convention, required fields, cross-reference strategy, ownership model, amendment workflow, superseding rules, archiving policy, record template | **Frozen at v1.0** | Amendment only — same GAP process as the Bible and the Checklist (§6) |
| **Records** | §10 register · §11 records | **Active** | New records added as normal work, no ceremony |

### Why the structure is frozen

**A decision log's value is entirely a function of its consistency.**

The log is read by search and by scan — someone looking for every decision touching candidate review, or checking what a record's trade-offs field says. Both depend on every record having the same nineteen fields, the same lifecycle vocabulary, and the same reference semantics. **A log where the format drifted over two years is not a log with some inconsistency in it; it is a log that cannot be queried**, because a reader can no longer tell whether a missing field means "nothing to say" or "this record predates the field."

Format drift also arrives the same way every governance failure does: one record that needed an extra field, one that skipped a section under deadline, one written to a slightly different template by someone who hadn't read this one. Each is locally reasonable. Freezing the schema is what makes each of them a visible deviation rather than a precedent.

### What this means in practice

- **Adding a record** — normal work. No approval, no ceremony. This is the document functioning.
- **Amending a record** — permitted within §6 limits: clarify, add evidence, correct a fact, add a cross-reference, record an ownership change. **Never to change what was decided.**
- **Changing §1–§9** — a governance change. Stop, file a GAP, classify, assess impact across the Bible and the Checklist as well, recommend, and wait for approval (§6). Adding, removing, or renaming a required field is a structural change and gets no exception for being small.
- **A record that does not fit the schema** — is not a reason to extend the schema. It is either two decisions filed as one (§3), or a signal to file a GAP. It is never a reason to file a record in a different shape.

### Why the records stay Active

A frozen decision log would be a contradiction. Governance documents are frozen because their job is to hold still; this document's job is to accumulate. Freezing the container and leaving the contents open is what lets both be true.


---

## DDL-MKT-009 — The homepage is rebuilt as a faithful composition of the Stitch V4 marketing frames

**Status:** Proposed
**Date:** 2026-07-25
**Owner:** Marketing Owner

**Decision Summary**
The production homepage at `/` is rebuilt as a direct, verified reproduction of the five approved HireLens V4 Stitch marketing frames, replacing the nine-scene narrative homepage.

**Context**
The homepage shipped as v1.0.0 on 2026-07-25 was built from the nine-scene storyboard recorded in DDL-MKT-001 through DDL-MKT-008. Separately, the HireLens V4 Stitch project contains five approved marketing frames (`hirelens_marketing_hero_frame_1` through `..._the_conclusion_frame_5`), each exported as both `code.html` and a rendered `screen.png`. These two artefacts describe materially different pages: different copy, different section order, different palette, and a different type system (Newsreader/Inter/Public Sans/JetBrains Mono versus the shipped Fraunces-based stack). Only the shipped implementation existed in code; the Stitch frames had never been implemented.

**Problem Statement**
When the shipped homepage and the approved Stitch V4 frames disagree, which is the source of truth for what `/` renders?

**Alternatives Considered**
1. *Keep the nine-scene homepage.* It is implemented, tested, released, and governed by eight Accepted records.
2. *Reconcile the two — keep the nine-scene structure, restyle it toward Stitch.* Preserves the narrative work while moving the surface closer to the approved visual direction.
3. *Rebuild from the Stitch frames.* Treat the frames as the design and reproduce them, discarding the nine-scene implementation.

**Why Alternatives Were Rejected**
1. Rejected because it leaves the approved V4 design unimplemented indefinitely, and leaves two contradictory descriptions of the same surface both nominally in force.
2. Rejected because the two do not differ only in styling. They differ in copy, section count, section order, and narrative arc; restyling one into the other would produce a third artefact matching neither, which is the specific failure mode a design source of truth exists to prevent.
3. Selected. The frames are the later and more complete artefact, they carry rendered reference images that make fidelity checkable, and reproducing them removes the contradiction rather than managing it.

**Final Decision**
`/` is served from `app/(marketing)/` and composes the five frames in order: frame 1 (hero, compression preview), frame 2 (social proof, the stakes, philosophy, ATS contrast), frame 3 (decision pipeline, triage, deep review, decide), frame 4 (regret analysis, AI tenets, enterprise trust), frame 5 (customer story, pricing, FAQ, closing). Each frame's own tailwind config is transcribed into `--mkt-*` tokens scoped to `.mkt`; per-frame values that differ between frames (container width, ink shade, type scale) are preserved per frame rather than harmonised. The nine-scene implementation and its tokens are removed.

**Expected Benefits**
One description of the homepage rather than two. Fidelity becomes checkable against a rendered artefact instead of argued. The public surface stops inheriting product-shell tokens that were never designed for it.

**Trade-offs**
The nine-scene narrative work — including the evidence-trail, limits, and record scenes recorded in DDL-MKT-003, -004, -006 and -007 — is removed from the shipped page. That work was Accepted on its own merits and is not being discarded because it was judged weak; it is being discarded because it describes a different page. Homepage v1.0.0 is superseded roughly the same day it released.

**Risks**
The Stitch frames may themselves be intermediate rather than final; if so this replaces a considered narrative with a draft. Detection: the Marketing Owner confirms the five frames are the approved V4 marketing set before this record moves to Accepted. A second risk is that the frames were authored as five independent screens and were never composed, so page-level continuity (a single nav, a single footer, one continuous scroll) is not something any frame specifies.

**Consequences**
DDL-MKT-001 through DDL-MKT-008 describe a page that no longer exists and require review under §7.5 once this record is resolved. The frozen Homepage v1.0.0 release is superseded and its governance status needs restating. `docs/HOMEPAGE_STORYBOARD.md`, `docs/HOMEPAGE_RELEASE.md`, and the untracked `tests/homepage-scene-0*.test.tsx` files refer to the removed implementation. The marketing surface now owns its own radius, type, and color scales, which must not be folded back into the product tokens.

**Related Decisions**
Would supersede DDL-MKT-001 (nine-scene arc) and DDL-MKT-002 (thinking shown through structure). Requires review of DDL-MKT-003, -004, -005, -006, -007, -008 as dependents. Constrained by DDL-VIS-006 (three-tier token architecture) — the `--mkt-*` scale is a fourth, deliberately isolated tier for the public surface and may require that record to be revisited.

**Related Governance Documents**
Marketing Design Bible — would require amendment (it encodes the nine-scene arc). Design Review Checklist — derives from. DDL-GOV-005 (structure-first prompting for Stitch) — derives from.

**Related Product Areas**
Public marketing homepage (`/`), marketing nav and footer, `app/(marketing)` route group, `.mkt` token scope in `app/globals.css`.

**Review Trigger**
Any new Stitch marketing frame is approved, or the Marketing Owner determines the five V4 frames are no longer the approved marketing design.

**Amendment History**
2026-07-25 · Claude · Record created as Proposed. Implementation completed and verified against all five frames; status left Proposed because only the owner may accept (§5).

---

*HireLens Design Decision Log v1.0 — Structure Frozen · Records Active.*
*Records are permanent. Nothing is deleted. Governance is not overridden here.*
