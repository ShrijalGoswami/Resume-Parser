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
| [DDL-AIX-001](#ddl-aix-001--calibrated-confidence-with-an-under-trust-default) | Calibrated confidence, with an under-trust default | AIX | **Accepted** | 2026-07-25 |
| [DDL-VIS-001](#ddl-vis-001--border-first-near-monochrome-surface-language) | Border-first, near-monochrome surface language | VIS | **Accepted** | 2026-07-25 |

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

*HireLens Design Decision Log v1.0 — Structure Frozen · Records Active.*
*Records are permanent. Nothing is deleted. Governance is not overridden here.*
