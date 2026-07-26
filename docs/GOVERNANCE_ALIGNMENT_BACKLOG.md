# HireLens — Governance Alignment Backlog

**Version 1.0 · Execution document · Not governance**
Source: Governance Drift Report, 2026-07-25 · Baseline commit `65ac71e`
Owner: Design Ops (coordination) · per-item owners below
Status: Open

---

## What this is

An execution backlog. It converts the approved Governance Drift Report into work items.

**It carries no authority.** It creates no rules, defines no principles, and cannot be cited in a design review. Where an item's description and a governance document disagree, the governance document is correct and the item is wrong — file the correction against this file, not against the Bible or the Checklist.

**It is disposable.** When every item is Done or Closed, this document is archived. Governance documents are permanent; execution documents are not, and conflating the two is how a repository accumulates six files that all claim to be authoritative.

## Scope

Twelve items from the approved report. Every one is **historical drift** — an artifact written before the governance baseline existed. **No item indicates a defect in governance, and no GAP is required.** This was confirmed on approval of the drift report.

Out of scope, deliberately:
- **The repository rename.** Filed instead as `DDL-ENG-001` (Proposed) in the Design Decision Log. It is a decision to be made, not work to be scheduled, and putting it in a backlog would imply it had been decided.
- Anything not in the approved report. New findings go through a fresh audit, not an append to this file.

## How to read an item

**Required Action** states what to do, not how. Implementation detail belongs in the change itself.

**Estimated Effort** is deliberately coarse — S (under an hour), M (half a day), L (more than a day). Precision here would be false; these are text changes whose real cost is the review, not the edit.

**Status** is one of: `Not Started` · `In Progress` · `Blocked` · `Done` · `Closed — No Action`.

---

## Execution order

**Sprints group items by kind, not by sequence.** Two things override the sprint order:

1. **`GAB-D1` runs first.** It is the only item in this backlog that fails a blocking gate (Checklist §8.9, Gate 2). Any review touching report generation terminates unscored until it is fixed, so it blocks review work regardless of its sprint.
2. **`GAB-C1` and `GAB-B1` need a decision before work starts.** Both touch frozen or historical material where the right action is a judgment call, not an edit. Neither should be picked up by someone looking for a quick win.

Everything else can proceed in any order.

---

# Sprint A — High Visibility

*The two files a person reads first. Highest external exposure, lowest implementation cost — this is the best ratio in the backlog.*

---

### GAB-A1 — README.md positioning line

| Field | Value |
|---|---|
| **Backlog ID** | GAB-A1 |
| **Severity** | Critical |
| **Repository Path** | `README.md` (line 2) |
| **Estimated Effort** | S |
| **Dependencies** | None |
| **Owner** | Marketing Owner |
| **Status** | Not Started |

**Problem Summary**
The repository's most-read line reads `**AI-Powered Resume Intelligence & ATS Compatibility Engine**`. It manages three separate governance conflicts in eleven words: it names the component category, positions us inside the ATS category, and uses banned vocabulary. Anyone applying the Bible's category test to this line gets all three wrong answers.

**Governance References**
Bible Ch. 2 (category; ATS and Resume Screening explicitly rejected) · Bible Ch. 12 (banned: *AI-powered*) · `DDL-POS-001` · `DDL-POS-002`

**Required Action**
Replace with a Decision Intelligence positioning line. Recommended: `**Decision Intelligence for hiring**`, optionally followed by the approved value proposition — *"Turns scattered hiring evidence into a decision you can defend."* Do not substitute a different but equally generic line; the replacement is reviewed against Checklist §10.3 (competitor-swap test).

---

### GAB-A2 — docs/README.md positioning and authority claim

| Field | Value |
|---|---|
| **Backlog ID** | GAB-A2 |
| **Severity** | Critical |
| **Repository Path** | `docs/README.md` (lines 3–4) |
| **Estimated Effort** | S |
| **Dependencies** | None |
| **Owner** | Design Ops |
| **Status** | Not Started |

**Problem Summary**
Two problems, and the second is the more serious. The line reads `> The single source of truth for HireLens — an AI-powered hiring intelligence platform.` The positioning is the pre-governance framing `DDL-POS-001` replaced. But it also claims to be the single source of truth, which is now false — governance is — and it does not link to either governing document. A contributor entering here is directed away from the documents that bind them.

**Governance References**
Bible Ch. 2 · Bible Ch. 12 (banned: *AI-powered*) · `DDL-POS-001` · `DDL-GOV-001` · `DDL-GOV-002`

**Required Action**
Correct the positioning and demote the authority claim. Add links to `MARKETING_DESIGN_BIBLE.md` and `DESIGN_REVIEW_CHECKLIST.md` as the governing documents, and to `DESIGN_DECISION_LOG.md` as the reasoning record.

---

# Sprint B — Marketing

*Outbound surfaces. Higher cost than Sprint A because the conflicts are narrative rather than lexical — the copy is built on the old category, so find-and-replace produces incoherence rather than compliance.*

---

### GAB-B1 — portfolio_kit.md rewrite-or-mark decision

| Field | Value |
|---|---|
| **Backlog ID** | GAB-B1 |
| **Severity** | Critical |
| **Repository Path** | `docs/portfolio_kit.md` (lines 2, 27, 46, 59, 80, 82, 103, 111, 120, 134) |
| **Estimated Effort** | L if rewritten · S if marked historical |
| **Dependencies** | **Blocked on a decision** — see Required Action |
| **Owner** | Marketing Owner |
| **Status** | Blocked |

**Problem Summary**
The densest concentration of rejected positioning in the repository, and it is outbound by design — the file contains LinkedIn post drafts, résumé bullets, and a demo script written to be published. `AI Resume Intelligence Platform` appears nine times. Line 80 goes further and markets resume screening as the product itself: *"How can we make resume screening fast, fair, and highly structured?"*

**Governance References**
Bible Ch. 2 (Resume Screening rejected as a component category) · Bible Ch. 11–12 (storytelling, vocabulary) · `DDL-POS-001` · `DDL-POS-002`

**Required Action**
**Decide first, then execute.** Two valid paths and they are not interchangeable:

- **If the file is still needed** — rewrite against Bible Ch. 11–12. Find-and-replace will not work; the narrative is built on the rejected category and swapping nouns produces copy that argues for a position it no longer states.
- **If it is a historical artifact** of an earlier project phase — add a dated note at the top marking it as superseded, and leave the content unchanged. This mirrors the Decision Log's own §7.1 principle: superseded material stays legible rather than being retconned.

**Do not pick this up without the decision.** Choosing the cheap path by default is how a public-facing file quietly stays wrong.

---

### GAB-B2 — Hero AI capability badge

| Field | Value |
|---|---|
| **Backlog ID** | GAB-B2 |
| **Severity** | Major |
| **Repository Path** | `resume-hero-section/components/hero/hero-section.tsx` (line 83) |
| **Estimated Effort** | S |
| **Dependencies** | None |
| **Owner** | Design Owner · review with Marketing Owner |
| **Status** | Not Started |

**Problem Summary**
A badge reading `AI-Powered Resume Analysis` sits in the hero — Movement I position, where the reader should feel recognition of their own problem. It instead leads with the technology and the component capability, in banned vocabulary. It is separately a §14 D1 decoration smell: a badge whose content restates nothing the reader needs.

**Governance References**
Bible Ch. 4 (Movement I — Recognition) · Bible Ch. 12 · Checklist §14 D1 · `DDL-POS-002`

**Required Action**
Remove the badge. If an eyebrow element is wanted in that position, it names the decision the product improves, never the technology — and it is reviewed against Checklist §10.2 (Movement I) rather than added back as a styling choice.

---

# Sprint C — Legacy Cleanup

*Frozen surfaces. The governing constraint is that editing frozen code needs a deliberate decision, so the cheapest compliant action is usually not an edit.*

---

### GAB-C1 — Legacy app indexable metadata

| Field | Value |
|---|---|
| **Backlog ID** | GAB-C1 |
| **Severity** | Critical |
| **Repository Path** | `resume-hero-section/app/(legacy)/layout.tsx` (lines 16–18) |
| **Estimated Effort** | S for `noindex` · M if copy is rewritten |
| **Dependencies** | **Blocked on a decision** — see Required Action |
| **Owner** | Design Ops · with Engineering Owner |
| **Status** | Blocked |

**Problem Summary**
Ships as `<title>` and meta description, so it is indexable and appears in search results. `Transform your resume with AI-powered analysis. Get ATS compatibility scores…` uses two banned terms, but the more serious conflict is framing: `Career Insights` and `your resume` position the product as **candidate-facing**, contradicting the recruiter-decision framing the entire company rests on.

This is the **frozen HireLens v1.0 legacy app**, which is why the obvious fix is not the recommended one.

**Governance References**
Bible Ch. 1 (recruiter as user) · Bible Ch. 2 · Bible Ch. 12 (banned: *transform*, *AI-powered*) · `DDL-POS-001`

**Required Action**
**Recommended: add `noindex` to the legacy route rather than rewriting its copy.** This removes the external conflict — the only part that actually matters — without editing a frozen surface. Rewriting the copy would mean touching frozen code to fix text nobody should be reading.

If the legacy app is intended to stay publicly discoverable, that is a different decision and the copy must be rewritten instead. Confirm which before starting.

---

# Sprint D — Engineering Metadata

*Machine-generated and machine-served strings. Individually small, and collectively the category most likely to be missed, because none of it appears in a design review.*

---

### GAB-D1 — Generated report attribution ⚠ **GATE**

| Field | Value |
|---|---|
| **Backlog ID** | GAB-D1 |
| **Severity** | Major — **blocking gate failure** |
| **Repository Path** | `backend/app/services/report_generator.py` (lines 218, 359, 409, 563) |
| **Estimated Effort** | S |
| **Dependencies** | None |
| **Owner** | AI Owner · with Engineering Owner |
| **Status** | Not Started |

**Problem Summary**
Generated PDFs carry `author="AI Resume Intelligence Platform"` and the footer `"Generated by AI Resume Intelligence Platform • Powered by Groq LLM • Confidential"`. These documents leave the building.

Two conflicts. The category naming is the same drift as elsewhere. **`Powered by Groq LLM` is different in kind** — it names a model vendor as a quality signal, which is a Checklist §8.9 violation and therefore a **Gate 2 failure**. Under §15 a gate failure is unscorable, not low-scoring: any review touching report generation terminates until this is fixed.

**Governance References**
Checklist §8.9 (**Gate 2**) · Checklist §15 (gate table) · Bible Ch. 1 (AI as supply chain) · `DDL-POS-002` · `DDL-GOV-004`

**Required Action**
Set `author="HireLens"`. Change the footer to `"Generated by HireLens • Confidential"`. **Remove the vendor attribution entirely** — do not relocate it to a metadata field, a settings page, or an about screen. The prohibition is on naming the supplier as a quality signal anywhere a user sees it, not on its position.

**Run this item first.** It is the only gate failure in the backlog.

---

### GAB-D2 — Backend API metadata

| Field | Value |
|---|---|
| **Backlog ID** | GAB-D2 |
| **Severity** | Major |
| **Repository Path** | `backend/app/main.py` (lines 41–42) |
| **Estimated Effort** | S |
| **Dependencies** | None — verify no client generation depends on the title string |
| **Owner** | Engineering Owner |
| **Status** | Not Started |

**Problem Summary**
`title="AI Resume Parser API"` and `description="Backend API for AI-powered Resume Parsing and Analysis"`. Both name the rejected component category; the description also uses banned vocabulary. `docs_url=None` limits browser exposure, but the OpenAPI schema is still served and flows into any generated client or integration document.

**Governance References**
Bible Ch. 2 · Bible Ch. 12 · `DDL-POS-001` · `DDL-POS-002`

**Required Action**
`title="HireLens API"` · `description="Backend API for HireLens — Decision Intelligence for hiring."` Confirm nothing downstream pins the current title string before changing it.

---

# Sprint E — Historical Documentation

*The sprint most likely to be done wrong, because the instinct is to correct the text and that instinct is incorrect here.*

**The governing principle for this entire sprint:** these documents were accurate when written. Editing them to match current positioning destroys the record of how our thinking developed, which is the same failure `DESIGN_DECISION_LOG.md` §7.1 prohibits for superseded decisions. **The action is to annotate, not to amend.**

A single dated note is sufficient. Recommended form, used consistently across all four items:

> *Note (2026-07-25): positioning language in this document predates the v1.0 governance baseline. Current positioning is Decision Intelligence — see `DESIGN_DECISION_LOG.md` `DDL-POS-001`.*

---

### GAB-E1 — Release notes theme line

| Field | Value |
|---|---|
| **Backlog ID** | GAB-E1 |
| **Severity** | Major |
| **Repository Path** | `docs/RELEASE_NOTES.md` (line 4) |
| **Estimated Effort** | S |
| **Dependencies** | None |
| **Owner** | Design Ops |
| **Status** | Not Started |

**Problem Summary**
`**Theme:** the AI recruiting platform, fully stabilized, hardened, and frozen.` — names the category Bible Ch. 2 rejects explicitly. Rated Major rather than Minor because release notes are read by people orienting themselves to the product, who will reasonably take the line as current.

**Governance References**
Bible Ch. 2 · `DDL-POS-001` · `DESIGN_DECISION_LOG.md` §7.1 (supersession is addition, not edit)

**Required Action**
Prepend the dated governance note. **Do not edit the entry.**

---

### GAB-E2 — Changelog entries

| Field | Value |
|---|---|
| **Backlog ID** | GAB-E2 |
| **Severity** | Minor |
| **Repository Path** | `CHANGELOG.md` (lines 159, 234) |
| **Estimated Effort** | S |
| **Dependencies** | None |
| **Owner** | Design Ops |
| **Status** | Not Started |

**Problem Summary**
`AI recruiting application` and `AI-powered executive decision system`. Historical entries, accurate at time of writing.

**Governance References**
Bible Ch. 2 · Bible Ch. 12 · `DESIGN_DECISION_LOG.md` §7.1

**Required Action**
Prepend the dated governance note at the top of the file. Entries unchanged.

---

### GAB-E3 — Sprint documents

| Field | Value |
|---|---|
| **Backlog ID** | GAB-E3 |
| **Severity** | Minor |
| **Repository Path** | `docs/sprints/V6_SPRINT10.md` (line 3) · `docs/sprints/V4_SPRINT8.md` (line 3) |
| **Estimated Effort** | S |
| **Dependencies** | None |
| **Owner** | Design Ops |
| **Status** | Not Started |

**Problem Summary**
`an AI recruiting application to an enterprise AI recruiting` and `An AI-powered executive decision system`. Sprint records describing intent at the time.

**Governance References**
Bible Ch. 2 · `DESIGN_DECISION_LOG.md` §7.1

**Required Action**
Prepend the dated governance note to each. Content unchanged.

---

### GAB-E4 — ADR-012

| Field | Value |
|---|---|
| **Backlog ID** | GAB-E4 |
| **Severity** | Minor |
| **Repository Path** | `docs/decisions/ADR-012-executive-intelligence-architecture.md` (line 12) |
| **Estimated Effort** | S |
| **Dependencies** | None |
| **Owner** | Design Ops |
| **Status** | Not Started |

**Problem Summary**
`AI-powered decision system` — banned vocabulary in a superseded architecture decision record.

**Governance References**
Bible Ch. 12 · `DESIGN_DECISION_LOG.md` §7.1

**Required Action**
Prepend the dated governance note. **Do not edit an ADR** — the same supersession logic applies, and ADRs are specifically a format built on immutability.

---

# Closed — No Action Required

Recorded so a future audit does not re-raise them. **These are findings, not oversights.**

### GAB-X1 — ATS reference in upload dialog

| Field | Value |
|---|---|
| **Backlog ID** | GAB-X1 |
| **Severity** | — |
| **Repository Path** | `resume-hero-section/components/hero/upload-dialog.tsx` (line 134) |
| **Owner** | Design Owner |
| **Status** | **Closed — No Action** |

**Problem Summary**
`"…against standard Applicant Tracking Systems."` — flagged by term match, examined, and found compliant.

**Rationale**
ATS is named here as an **external system we are compatible with**, which is factually accurate and does not position HireLens as one. Bible Ch. 2 rejects ATS as *our category*; it does not prohibit referring to ATSs as things that exist in the world. Removing the reference would make the copy less clear for no governance benefit — a Checklist 5.1 regression traded for nothing.

---

# Backlog Register

| ID | Sprint | Severity | Path | Effort | Owner | Status |
|---|---|---|---|---|---|---|
| GAB-A1 | A | Critical | `README.md` | S | Marketing | Not Started |
| GAB-A2 | A | Critical | `docs/README.md` | S | Design Ops | Not Started |
| GAB-B1 | B | Critical | `docs/portfolio_kit.md` | L / S | Marketing | **Blocked** |
| GAB-B2 | B | Major | `hero-section.tsx` | S | Design | Not Started |
| GAB-C1 | C | Critical | `(legacy)/layout.tsx` | S / M | Design Ops | **Blocked** |
| GAB-D1 | D | Major **⚠ GATE** | `report_generator.py` | S | AI Owner | Not Started |
| GAB-D2 | D | Major | `backend/app/main.py` | S | Engineering | Not Started |
| GAB-E1 | E | Major | `docs/RELEASE_NOTES.md` | S | Design Ops | Not Started |
| GAB-E2 | E | Minor | `CHANGELOG.md` | S | Design Ops | Not Started |
| GAB-E3 | E | Minor | `docs/sprints/*` | S | Design Ops | Not Started |
| GAB-E4 | E | Minor | `ADR-012` | S | Design Ops | Not Started |
| GAB-X1 | — | — | `upload-dialog.tsx` | — | Design | **Closed — No Action** |

**Totals:** 11 actionable · 2 blocked on decisions · 1 gate failure · 1 closed.
**Aggregate effort:** ten S items and one L-or-S. **The whole backlog is roughly a day's work except `GAB-B1`,** which is either an hour or two days depending on a decision nobody has made yet.

---

## Closing conditions

This document is archived when every item is `Done` or `Closed — No Action`.

**Two things that would mean the backlog was worked incorrectly**, worth stating because both are the path of least resistance:

- **Sprint E items edited rather than annotated.** The instinct is to fix the wording. Doing so destroys the historical record and violates the same principle the Decision Log applies to superseded decisions.
- **`GAB-B1` or `GAB-C1` executed on the cheap path without the decision.** Both have a fast option and a correct option, and they are not always the same. An item marked Blocked is blocked on judgment, not on capacity.

**Governance is not amended by completing this backlog.** These items bring the repository into line with governance that was already correct. If working an item surfaces something that looks like a governance gap, that is a GAP (`DESIGN_DECISION_LOG.md` §6) — stop, and do not resolve it inside a backlog item.

---

*HireLens Governance Alignment Backlog v1.0 — execution document, disposable, non-authoritative.*
