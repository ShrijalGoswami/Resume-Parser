# V4 Sprint 7 — AI Hiring Workbench & Interview Intelligence (V5)

> A complete AI interview workbench for any candidate — strategy, annotated
> technical & behavioral questions, skill verification, risk analysis, an
> interviewer scorecard, and a hiring recommendation — grounded in platform data
> and reused by the Copilot and Comparison. Decision record:
> [ADR-010](../decisions/ADR-010-interview-intelligence-engine.md).

## Goal

Open any candidate and receive an interview workbench that helps evaluate,
prepare, interview, and decide — not a generic question list.

## Architecture

One engine, many callers — no duplicated prompt logic:

```
Candidate Detail (Interview tab) ─┐
Comparison "Interview pack →" ─────┤   run_interview(candidate_id, focus, instruction, sections)
Recruiter Copilot ("generate ─────┘        │  (services/interview_service)
  interview", "how to verify X")            │
   RLS-scoped repos → InterviewContextBuilder (reuses candidate context + campaign + comparison)
        → generate_interview_pack → AIOrchestrator.run(INTERVIEW_GENERATION, schema=InterviewLLMOutput)
        → InterviewPack (+ server-attached Sources Used)  →  PDF export (client print)
```

### Backend — AI layer (`app/ai/`)
- `prompts/interview.py` — versioned Interview Prompt `v1.0` + per-focus task
  instructions (blueprint, technical, behavioral, leadership, manager, culture_fit,
  scorecard, followup). Registered for `Capability.INTERVIEW_GENERATION`.
- `context/interview_context.py` — pure composition (campaign requirements +
  candidate block + comparison/semantic findings).
- `services/interview_service.py` — thin `generate_interview_pack` seam
  (orchestrator → `InterviewPack`, 4096-token budget, graceful fallback).

### Backend — product layer
- `services/interview_service.py` — `run_interview(...)`: RLS-scoped fetch,
  reuses `build_candidate_context`, composes interview context, supports
  focus/instruction/sections (interactive mode), returns a deterministic pack when
  the LLM is down (409 if the candidate isn't analysed yet).
- `services/copilot_interview.py` — Copilot bridge reusing the engine (page
  candidate, named roster candidate, or top-N for "packs for the top two").
- `routes/campaigns.py` — `POST /{id}/candidates/{cid}/interview`.
- `schemas/interview.py` — `InterviewPack` + section models.

### Frontend (`resume-hero-section/`)
- `components/interview/interview-intelligence.tsx` — Interview tab with every
  section (summary, plan, technical, behavioral, verification, risk, scorecard,
  recommendation), interactive controls (Full pack / Harder / Only behavioral /
  System design / Coding round), and merge-on-refine.
- `lib/interview-pdf.ts` — recruiter-ready **PDF export** (dependency-free print
  document).
- Candidate detail → new **Interview** tab; Comparison ranking → **Interview pack →**
  links; `services/interview-api.ts`, `types/interview.ts`.

## Interview pack sections

| Section | Contents |
|---------|----------|
| Executive Summary | who, why shortlisted, key differentiators |
| Interview Strategy | recommended duration, stages, priority focus, interviewer profile |
| Technical Questions | question, difficulty (Easy→Expert), reason, expected answer, red flags, follow-ups, evaluation criteria |
| Behavioral Questions | competency, reason, expected answer, warning signs |
| Skill Verification | method, hands-on exercise, discussion topic, current confidence |
| Risk Assessment | grounded, categorised concerns + how to investigate |
| Scorecard | seven categories, weights, focus, score column |
| Final Recommendation | Strong Hire / Hire / Borderline / No Hire + reasoning + uncertainty |

## Context composition

`InterviewContextBuilder` composes campaign requirements + the reusable
multi-source candidate context (resume, analysis, ATS, match, ranking, JD, notes)
+ optional comparison/semantic findings. Composition lives in the AI/context layer;
routes never concatenate.

## Evaluation methodology

Questions tie to the candidate's real projects/experience and the JD's requirements
and missing skills; each carries its rationale, a strong-answer rubric, red flags,
and evaluation criteria. Risks are evidence-based (gaps, inconsistencies, inflated
responsibilities, limited production exposure, missing architecture experience). The
scorecard spans Technical, Problem Solving, Communication, Leadership, Learning
Ability, Culture Fit, Ownership with weights summing to ~100.

## Export design

Client-side, dependency-free: a print-optimised HTML document (inline styles,
break-inside protection) rendered into a new window and printed (Save as PDF) —
clean for printing or internal sharing.

## Security model

Auth + RLS + explicit `recruiter_id` scoping. Interview packs are generated only
for candidates the recruiter owns. Internal prompts/system instructions are never
returned.

## Performance considerations

- Reuses the candidate context builder and (when passed) comparison context.
- Interactive follow-ups regenerate ONLY requested sections (focus/sections),
  merged into the existing pack — no full rebuild.
- Generation runs off the event loop (`run_in_threadpool`); notes/context fetched
  without N+1.

## Future extensibility

The pack is the substrate for Executive Reports, Hiring Decisions, and Autonomous
Recruiting. Natural next steps: persisted interview packs (the `interview_packs`
table already exists), server-rendered PDF templates, and scorecard capture.

## Verification

- ✅ Interview generation uses the AIOrchestrator (`INTERVIEW_GENERATION`); no
  provider calls outside `app/ai`.
- ✅ Candidate Detail uses the engine; Copilot reuses it; Comparison links to it.
- ✅ End-to-end test: LLM path maps correctly; deterministic fallback yields a full
  seven-category scorecard + grounded risks; copilot bridge reuses the engine.
- ✅ 44 API routes; frontend `tsc` zero errors; `next build` green; PDF export works.
- ✅ Sprint 2–6 functionality intact.
