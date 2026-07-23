# HireLens — Truthful AI Philosophy

The governing principle of HireLens V4: **truth before appearance.** Every AI-derived
surface represents what the platform can actually do — no more. This document is the
contract the V4 migration was held to, and the standard for all future AI work.

## What we intentionally do

- **Derive every figure from real backend data.** Fit scores, confidence, evidence,
  sources, decision latency, agreement — all real, or absent.
- **Show confidence honestly.** Low confidence renders **neutral gray, never red**; it is
  displayed, never hidden behind false certainty.
- **Lead with evidence.** Deep Review reads a candidate as evidence with openable sources,
  not a bare score. Decision Intelligence states the recommendation, its evidence, and its
  confidence.
- **Keep the human in control.** The AI recommends; a person approves or overrides; every
  decision is reversible and recorded (see Human-in-the-loop below).
- **Preserve immutable history.** The Decision Ledger records what was known *at the time of
  the decision* and never reinterprets it with information learned later.
- **Use real product names everywhere**, including marketing, so the public story and the
  authenticated product share one mental model.

## What we intentionally do NOT do

- **No fabricated intelligence.** If a mockup implies a capability the backend lacks, we do
  not fake it.
- **No invented metrics or performance claims** (quality-of-hire lift, ranking accuracy,
  ROI, "0 regretted hires").
- **No fabricated social proof** — no invented customer names, companies, logos, or
  testimonials. Generic role attribution only ("Head of Talent") until real proof exists.
- **No uncertified compliance claims** (e.g. SOC 2 Type II) — the trust surface states only
  verifiable facts (RLS isolation, immutable audit trail, per-workspace data).
- **No fabricated confidence decomposition or corroboration counts** ("5 of 7 signals
  corroborated"). We show the real confidence scalar and the evidence behind it.
- **No claim of learning from outcomes** unless a model actually exists.

## Deferred intelligence (honest absence)

Capabilities that require backend intelligence we don't have are **deferred, not faked**:

| Capability | Surface | Handling |
|---|---|---|
| Calibration / learning from outcomes | Learning | Honest "future release" placeholder |
| Outcome tracking (quality-of-hire, 90-day, regret) | Ledger, Decision Intelligence | Omitted entirely |
| Source-conflict detection | Deep Review | `EvidenceConflict[]` renderer, empty today |
| Signal-level confidence verification | Decision Intelligence | Conditional panel from real `score.components` only |

## Conditional-rendering philosophy

For capabilities that *belong* on a screen and will plausibly gain a backend, we build the
UI **future-ready and conditional**: define a typed model (`EvidenceConflict[]`,
`RecommendationSignal[]`), render only from real data, and **collapse gracefully to nothing**
when data is absent — never a placeholder row or estimated value. The UI is ready before the
intelligence exists; the moment real data arrives, it populates without a redesign.

For capabilities that are a *separate product* (outcome analytics, the Ledger's future
performance data), we do **not** scaffold empty interfaces — they are introduced only when
their real backend and data model exist.

## Human-in-the-loop principles

1. **AI offers; humans decide.** Recommendations are surfaced, never auto-applied.
2. **Ambiguity goes to the human.** Triage auto-handles the obvious calls; contradictions and
   uncertainty are routed to "NEEDS YOU."
3. **Everything is reversible.** Stage moves and decisions carry Undo; approvals can be
   overridden.
4. **Everything is logged.** Decisions land in the immutable Decision Ledger.
5. **The candidate is the document; the AI assists around it.** The AI render (`AIAnswer`)
   informs the decision without visually dominating the evidence.
