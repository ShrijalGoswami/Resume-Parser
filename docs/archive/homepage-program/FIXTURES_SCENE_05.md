# Scene 05 — Canonical Fixtures

**Version 1.0.0 · Status: Frozen · Approved 2026-07-25**
Owner: Design Ops
For: Homepage Scene 05 (The trail) · `DDL-MKT-003` · Implementation Package §8
**Single source of truth for Scene 05.** Content only — no implementation.
Change policy: see §12, Fixture Stability Contract. Invariant changes require a major increment and Marketing Owner approval.

---

## Scope and rules

This is **content, not code**. Scene 05's implementation derives its data module from this document; nothing here is a component, a layout, or a type definition.

**All data is synthetic.** No real person, employer, or document is represented. Fixture quality is a governance matter rather than a content chore — demo data (four tidy rows, short names, complete fields) is a catalogued smell (§14 C3) and would undercut Scene 05's entire argument, which is that the evidence is real enough to check.

**Internal consistency is the hard requirement.** Every count, date, and cross-reference below reconciles with the frozen registers in Scenes 06 and 07. Where a number appears in more than one place, it is the same number.

### One interpretation, reported

The brief asks for *"one realistic engineering resume excerpt"*. The frozen Scene 05 structure (`DDL-MKT-003`) renders a **source document of five-plus paragraphs of prose with two citable passages** — a shape a resume does not have, because resumes are bullet-structured.

**Resolved by producing both.** §3 is the take-home submission, which is what Scene 05's centre column renders. §4 is the resume excerpt, which is one of the four sources on file and appears in the inspector and register. Neither displaces the other; the frozen structure is followed.

---

# 1 · Case

| | |
|---|---|
| Candidate | Eleanor Vance |
| Short form | E. Vance |
| Role | Staff engineer, infrastructure |
| Requisition | INF-2026-114 |
| Bar set | 28 September 2026, by the hiring manager |
| Decision recorded | 13 October 2026 |
| Panel | Hiring manager, plus two interviewers |

## Chronology

| Date | Event |
|---|---|
| 2026-09-28 | Bar set for the requisition |
| 2026-09-29 | Resume received |
| 2026-10-02 | Screening call |
| 2026-10-06 | Take-home submitted |
| 2026-10-09 | Technical interview (two interviewers) |
| 2026-10-09 | Reference check requested |
| 2026-10-13 | Decision recorded |
| — | Reference check **never received** |

---

# 2 · Sources on file

Five rows for Scene 05's left-hand navigator. **Four read, one not received.**

| # | Source | Filename | Date | Conclusions drawn |
|---|---|---|---|---|
| 1 | Take-home submission | `evance_takehome_2026-10-06.pdf` | 2026-10-06 | 3 |
| 2 | Technical interview transcript | `evance_tech_interview_2026-10-09.md` | 2026-10-09 | 3 |
| 3 | Screening call notes | `evance_screen_2026-10-02.md` | 2026-10-02 | 2 |
| 4 | Resume | `evance_resume_2026-09-29.pdf` | 2026-09-29 | 1 |
| 5 | **Reference check — not received** | — | Requested 2026-10-09 | **0** |

**Row 5 renders as an ordinary row.** Not dimmed, not flagged, not an error state (§8.15, A-07). Absence is ordinary information.

---

# 3 · Take-home submission — the source document

`evance_takehome_2026-10-06.pdf`

The document Scene 05's centre column renders. **Page 3 is the page shown.** Two passages on this page are independently citable and support **different** conclusions in **different** dimensions — which is `DDL-MKT-003` condition 2, and what proves the citation is passage-level rather than document-level.

> **Take-home prompt (given to the candidate):** *Design an event ingestion service for order and fulfilment events. Roughly 40,000 events per second at peak, at-least-once delivery. Describe the design, one significant trade-off you would make, and one you would reverse in hindsight. Two pages maximum.*

### Page 3 — full text, in order

**¶1**
> The brief asks for at-least-once delivery at roughly 40,000 events per second at peak. I read that as a durability problem before it is a throughput problem: the downstream reconciliation job can tolerate out-of-order arrival and duplicate delivery, but it cannot tolerate loss. So where the two conflict I have chosen durability, and I have tried to be explicit below about what that costs.

**¶2**
> The first version I would ship is deliberately unambitious — a single-region Kafka cluster with three brokers, replication factor three, and producers configured for acks=all. That is enough to validate the schema, establish a latency baseline, and find out what the real peak looks like rather than the peak in the brief. I would expect to run it for a quarter before changing anything structural.

**¶3 — PASSAGE A · citable**
> This is not a hypothetical for me. In my previous role I owned the migration of our event pipeline from a single-region Kafka cluster to a multi-region setup after a regional outage in March took us below our availability target. I wrote the failover runbook, I ran the two game-days we used to test it, and I carried the on-call rotation that supported it for eleven months afterwards. The design was mine and so were the pages at three in the morning.

**¶4**
> The cost of that migration was latency. Cross-region replication moved p99 producer acknowledgement from 14ms to roughly 31ms, and it moved consumer lag from something we never looked at to something we alerted on. I built out partition-lag and replication-throughput dashboards because without them we were guessing, and I would build the same instrumentation again before the migration rather than after it.

**¶5 — PASSAGE B · citable**
> The trade-off I would reverse is the reconciliation job. We kept it manual for two quarters longer than we should have, on the argument that automating it would encode assumptions we were not yet confident in. That argument was correct in month one and wrong by month four, and I did not revisit it because it was not failing loudly — it was just costing an engineer a day a week. I now treat "no one is complaining" as a weak signal rather than an absence of cost, and I would set a review date on any deliberate manual step rather than waiting for it to hurt.

**¶6**
> If I were starting again with what I know now, I would run single-region for one quarter as above, instrument before migrating rather than during, and write the reconciliation automation in the same sprint as the failover runbook. The order matters more than the individual decisions.

### Citable passages

| Ref | Location | Passage | Dimension | Type |
|---|---|---|---|---|
| **1** | Page 3, paragraph 3 | Passage A — ownership of the multi-region migration | Systems design | Read from document |
| **2** | Page 3, paragraph 5 | Passage B — the trade-off she would reverse | Written communication | Read from document |

**Highlight spans** — the phrase carrying the claim, for passage-level rather than paragraph-level citation:

- **Passage A:** *"I owned the migration of our event pipeline from a single-region Kafka cluster to a multi-region setup"*
- **Passage B:** *"That argument was correct in month one and wrong by month four, and I did not revisit it because it was not failing loudly"*

**Both passages sit inside genuine surrounding context** (¶1, ¶2, ¶4, ¶6). A reader who sees the paragraphs either side knows the quotation was not assembled for a demo — which is the structural defence against provenance theatre (§14 F4) and the reason Scene 05's centre column shows a document rather than an excerpt.

---

# 4 · Resume excerpt

`evance_resume_2026-09-29.pdf` · page 1

> **Eleanor Vance** — Infrastructure engineer
> Nine years, distributed systems and data platform.
>
> **Senior engineer, platform** · Ardenway Logistics · 2022–2026
> Owned the order-events pipeline (Kafka, ~35k events/sec peak). Led the single-region to multi-region migration following the March 2025 outage; authored the failover runbook and ran the supporting on-call rotation. Built partition-lag and replication monitoring on Prometheus and Grafana. Onboarded four engineers to the platform team.
>
> **Engineer, data infrastructure** · Ardenway Logistics · 2020–2022
> Schema registry, consumer group rebalancing, exactly-once semantics for the billing consumer.
>
> **Engineer** · Kestrel Freight Systems · 2017–2020
> Batch ETL to streaming migration. First on-call rotation.

**Conclusion drawn:** systems design — corroborating, not primary. The resume *asserts* ownership; the take-home *demonstrates* it. The distinction matters and is preserved in the inspector: this is the weaker of the two sources for the same claim, and it is listed second.

---

# 5 · Technical interview transcript — the disagreement

`evance_tech_interview_2026-10-09.md` · 2026-10-09 · two interviewers

**This is the disagreement fixture.** Two reviewers reached opposite readings of the same evidence on the same dimension. Both are quoted, both are attributed, and the disagreement is **preserved rather than averaged** — which is the commitment Scene 06 makes in the row *"Two interviewers can reach opposite conclusions | We show you both. We do not average them into a single number."*

### Interviewer A — J. Okonkwo, staff engineer · page 2

> She walked the multi-region design without prompting and got to the failover semantics before I asked. When I pushed on the split-brain case she had already thought about it — she described the fencing approach they used and was candid that it had a gap for a bounded window. That is design ownership. You do not hold that shape of detail eleven months later unless you built it.

**Reading:** meets the bar on systems design.

### Interviewer B — S. Adeyemi, principal engineer · page 4

> My concern is that most of what she described was operational rather than architectural. She ran the migration well — the runbook and the game-days are real work — but when I asked why multi-region rather than a second availability zone she gave the availability target as the answer, not the analysis behind it. I could not tell from the conversation whether she chose the topology or inherited it.

**Reading:** does not clearly meet the bar on systems design.

### Debrief resolution — 2026-10-13, recorded

> The panel reviewed take-home page 3, paragraph 3 together. The written account states authorship of the design, not only of the migration. Interviewer B accepted this as sufficient on the dimension and noted the interview question had been ambiguous. **The divergence is recorded rather than removed** — both readings stand in the record, and the resolution states what changed the second reading.

**Both readings remain in the evidence trail after resolution.** A resolved disagreement is not a deleted one.

---

# 6 · Screening call notes

`evance_screen_2026-10-02.md` · 2026-10-02 · recruiter

> Nine years, all infrastructure. Currently senior at Ardenway, looking for staff scope — specifically wants the design authority rather than the title. Spent most of the call on the events pipeline; comfortable being interrupted, answers the question asked.
>
> Mentioned twice that the part of the last role she would miss is bringing the two juniors up on the platform. Not asked about it either time — she raised it.
>
> Notice period four weeks. No competing offer at time of call.

---

# 7 · Conclusions — Scene 05 navigator

Five rows. **The fifth is the unsupported conclusion**, and it renders in identical neutral text to the four above it.

| # | Conclusion | Type | Sources | Dimension |
|---|---|---|---|---|
| 1 | Has owned distributed systems in production, not only contributed to them | **Read from document** | 2 | Systems design |
| 2 | Communicates trade-offs in writing clearly | **Read from document** | 4 | Written communication |
| 3 | Comfortable mentoring engineers earlier in their career | **Inferred** | 3 references, never stated directly | Mentoring |
| 4 | The panel diverged on system design | **Read from document** | 2 · conflicting | Systems design |
| 5 | **No evidence either way on incident response** | **No sources** | 0 | Incident response |

### Row 5 — the unsupported conclusion

> **No evidence either way on incident response.**
> No source on file addresses how the candidate behaves during an active incident. The take-home describes a migration and its instrumentation; the interview covered design; the screening call did not reach it. **This is an absence of evidence, not evidence of absence** — nothing here suggests the candidate is weak on incident response, and nothing suggests they are strong.
>
> **What would resolve it:** a technical interview segment on incident handling, or a reference who worked an outage with them. The reference check requested on 9 October was not received.

**Row 5 is rendered exactly as calmly as rows 1–4.** Same size, same weight, same grey, full row height. No icon, no amber, no dimming, no italics. This is the scene's costliest element and the most likely to be "improved" into a warning (§8.15, A-07).

### Evidence counts — reconciliation

These reconcile with Scene 06's frozen exhibit and Scene 07's frozen register.

| Dimension | Passages | Documents | Scene 06 states |
|---|---|---|---|
| Systems design | 3 | 2 — take-home, interview transcript | *"Three passages across two documents"* ✓ |
| Written communication | 4 | 3 — take-home, interview transcript, screening notes | *"Four passages across three documents"* ✓ |
| Mentoring | 3 references | 2 — screening notes, interview transcript | *"Referenced three times, never stated directly"* ✓ |
| Incident response | 0 | 0 | *"Nothing on file"* ✓ |

**Systems design, 3 passages:** take-home ¶3 (Passage A); interview transcript p2 (Okonkwo); interview transcript p4 (Adeyemi).
**Written communication, 4 passages:** take-home ¶5 (Passage B); take-home ¶4; interview transcript p2 ("answers the question asked" corroboration); screening notes ("comfortable being interrupted, answers the question asked").
**Mentoring, 3 references:** screening notes ("bringing the two juniors up"); screening notes ("mentioned twice"); interview transcript p2 (onboarding reference). Never stated as a claim by the candidate — hence **inferred**.

---

# 8 · Provenance inspector dataset

Six fields per `DDL-MKT-003`. One record per citable passage.

### Passage reference 1

| Field | Value |
|---|---|
| Passage reference | 1 |
| Source | `evance_takehome_2026-10-06.pdf` |
| Location | Page 3, paragraph 3 |
| Evidence type | Read from document |
| Verification state | Verified against source |
| Dimension | Systems design |

**Provenance note:**
> Direct quotation. No inference applied. The surrounding paragraphs are shown so the passage can be read in context.

**Drawn from this passage:**
- Has owned distributed systems in production, not only contributed to them — *read from document*

**Also drawn from this document:**
- Communicates trade-offs in writing clearly — *see passage 2*

**Not supported by this document:**
- Incident response. No sources on file.

### Passage reference 2

| Field | Value |
|---|---|
| Passage reference | 2 |
| Source | `evance_takehome_2026-10-06.pdf` |
| Location | Page 3, paragraph 5 |
| Evidence type | Read from document |
| Verification state | Verified against source |
| Dimension | Written communication |

**Provenance note:**
> Direct quotation. No inference applied. The candidate states the reversal herself; we have not characterised it for her.

**Drawn from this passage:**
- Communicates trade-offs in writing clearly — *read from document*

**Also drawn from this document:**
- Has owned distributed systems in production — *see passage 1*

**Not supported by this document:**
- Incident response. No sources on file.

### Inferred conclusion — provenance

Mentoring carries no passage reference because **no passage asserts it**. The inspector must state this rather than manufacture a citation — a citation that resolves to a document rather than a claim is provenance theatre (§14 F4).

| Field | Value |
|---|---|
| Passage reference | — |
| Source | Screening call notes; technical interview transcript |
| Location | 3 references across 2 documents |
| Evidence type | **Inferred** |
| Verification state | **Not directly stated** |
| Dimension | Mentoring |

**Provenance note:**
> Inference. Drawn from repeated mention across two documents. Never asserted by the candidate, and never claimed as a strength by her.

### Conflicting conclusion — provenance

| Field | Value |
|---|---|
| Passage reference | — |
| Source | `evance_tech_interview_2026-10-09.md` |
| Location | Page 2 (Okonkwo); page 4 (Adeyemi) |
| Evidence type | Read from document · **conflicting** |
| Verification state | Verified against source · **resolved in debrief 2026-10-13** |
| Dimension | Systems design |

**Provenance note:**
> Sources disagree. The disagreement is preserved, not averaged. Both readings and the resolution are shown.

---

# 9 · Decision register

Thirteen rows. **This is the frozen Scene 07 register** (`DDL-MKT-006`), reproduced here so the two scenes can be verified against one dataset. It is authoritative in Scene 07; this copy exists for consistency checking only.

| Field | Value |
|---|---|
| Decision | Proceed to offer |
| Role | Staff engineer, infrastructure |
| Candidate | E. Vance |
| Recorded | 13 October 2026 |
| Recorded by | Hiring manager, with the panel |
| Bar applied | Staff level, infrastructure. Set by the hiring manager on 28 September. |
| Reasoning 1 | Met the bar on systems design. Three passages across two documents. |
| Reasoning 2 | Met the bar on written communication. Four passages across three documents. |
| Reasoning 3 | The panel diverged on system design. Reviewed in the debrief and resolved. |
| Evidence references | Take-home, interview transcript, screening notes, resume. |
| Known at the time | Systems design, written communication, mentoring. |
| Not known at the time | Incident response. No sources on file. The panel accepted this and recorded it. |
| Record status | Closed. Not editable. |

---

# 10 · Consistency check

Every assertion below is verifiable against the sections above.

| Claim | Where stated | Reconciles with |
|---|---|---|
| Four sources read, one not received | §2 | Scene 07 *"Evidence references"* — four named |
| Systems design: 3 passages, 2 documents | §7 | Scene 06 exhibit; Scene 07 Reasoning 1 |
| Written communication: 4 passages, 3 documents | §7 | Scene 06 exhibit; Scene 07 Reasoning 2 |
| Mentoring inferred, 3 references, never stated | §6, §7, §8 | Scene 06 exhibit *"Referenced three times, never stated directly"* |
| Incident response: nothing on file | §7 | Scene 06 exhibit; Scene 07 *"Not known at the time"* |
| Panel diverged on system design, resolved in debrief | §5 | Scene 07 Reasoning 3 |
| Reference check not received | §2, §7 | Scene 06 *"We cannot know whether a reference was candid"* |
| Bar set 28 September by hiring manager | §1 | Scene 07 *"Bar applied"* |
| Decision recorded 13 October 2026 | §1 | Scene 07 *"Recorded"* |
| Two citable passages in one document | §3 | `DDL-MKT-003` condition 2 |
| p99 14ms → 31ms; eleven months on-call; March outage | §3 ¶3, ¶4 | Resume §4 — same outage, same rotation |
| ~35k events/sec on the resume vs ~40k in the brief | §3 ¶1, §4 | Deliberate: the brief's figure is hypothetical, the resume's is her actual system |

**One deliberate near-miss.** The take-home brief specifies *roughly 40,000 events per second*; the resume states *~35k events/sec peak* for her real system. These are different numbers because they describe different things — a hypothetical requirement and a lived one. Real evidence does not line up perfectly, and a fixture where every number matched would read as fabricated.

---

# 11 · Rendering obligations

Not implementation instructions — governance constraints that this content carries.

1. **Row 5 of the navigator and every "no sources" state render as ordinary rows.** Identical size, weight, colour, and row height to their neighbours. No icon, no colour, no dimming (§8.15, A-07).
2. **`Inferred` is not styled worse than `Read from document`.** Same size, same weight, same colour.
3. **Citations resolve to the passage, not the document.** A reviewer will follow three at random; each must land on the named paragraph.
4. **Extraction and inference are visibly distinguished** (§8.13).
5. **Surrounding paragraphs are shown.** ¶1, ¶2, ¶4 and ¶6 exist to give the highlighted passages context; omitting them reintroduces the floating-quotation defect.
6. **The disagreement is not averaged.** Both readings render; the resolution is stated; neither is deleted.
7. **No candidate photograph** (`DDL-VIS-007`).
8. **No monospace except filenames, dates and passage numerals** (`DDL-VIS-003`).

---

# 12 · Fixture Stability Contract

## Why this section exists

This document is now the **single source of truth for Scene 05**. Scenes 06 and 07 already render numbers that only reconcile because this dataset says what it says — *three passages across two documents*, *nothing on file*, *the panel diverged*.

**A fixture edit is therefore a cross-scene change, not a content tweak.** Editing "three passages" to "four" here silently falsifies a frozen register two scenes away, and nothing in the build would catch it. This section names the relationships that may not move without a version increment, so that a well-meant improvement cannot quietly break the page's internal truth.

## Version scheme

| Increment | When | Consequence |
|---|---|---|
| **Patch** — 1.0.**x** | Prose improved with no invariant touched | No re-verification required |
| **Minor** — 1.**x**.0 | Additive only: a new source, conclusion or passage that changes no existing count or relationship | Scenes 05–07 re-verified |
| **Major** — **x**.0.0 | **Any invariant in §12.2 changes** | Scenes 05, 06, 07 re-verified *and* their frozen registers re-approved |

**A major increment is a governance event, not an engineering one.** It requires Marketing Owner approval because Scene 06's and Scene 07's copy is Gate 3.

## 12.1 · What may change freely — patch

- Wording of the surrounding paragraphs ¶1, ¶2, ¶4, ¶6, **provided they contradict nothing** and remain genuine technical prose
- Wording of the screening notes and resume, subject to the same constraint
- Formatting, ordering and presentation of this document itself

## 12.2 · Invariants — may not change without a major increment

**Identity and chronology**

1. Candidate is **E. Vance**, role **staff engineer, infrastructure**, requisition **INF-2026-114**.
2. Bar set **28 September 2026** by the hiring manager. Decision recorded **13 October 2026**. Both appear verbatim in Scene 07's frozen register.
3. Every source date falls between the bar being set and the decision being recorded. The reference check is **requested 9 October and never received**.

**Sources**

4. There are **five sources**: four read, one not received.
5. The **reference check is the one not received**. It is what makes Scene 06's *"We cannot know whether a reference was candid"* concrete rather than abstract.

**Passages and citation**

6. The take-home contains exactly **two independently citable passages**, at **page 3 ¶3** and **page 3 ¶5**.
7. The two passages support **different conclusions in different dimensions** — systems design and written communication respectively. Collapsing them into one dimension destroys the demonstration that citation is passage-level rather than document-level (`DDL-MKT-003` condition 2).
8. Each passage has a **named highlight span**. A citation that resolves to a paragraph rather than a phrase is a weaker claim than the one Scene 05 makes.
9. **Surrounding paragraphs exist and are shown.** ¶1, ¶2, ¶4 and ¶6 are not optional padding — removing them reintroduces the floating-quotation defect (§14 F4).

**Counts — these reconcile with frozen registers**

10. Systems design: **3 passages across 2 documents**.
11. Written communication: **4 passages across 3 documents**.
12. Mentoring: **3 references across 2 documents, never stated directly** — therefore **inferred**.
13. Incident response: **0 sources**.

> Invariants 10–13 appear verbatim in Scene 06's frozen exhibit and 10–12 in Scene 07's frozen reasoning rows. **Changing any one of them requires re-approval of Gate 3 copy in two other scenes.**

**Conclusions**

14. There are **five conclusions**. Exactly one is **inferred**, exactly one is **conflicting**, exactly one has **no sources**.
15. The unsupported conclusion is **incident response**, and it **names what would resolve it**. A limitation stated without a route to resolving it is a worse product claim (§8.3).
16. **Absence of evidence is never presented as evidence of absence.** The incident-response text says so explicitly and that sentence is load-bearing.

**Disagreement**

17. The divergence is on **systems design**, between **two named interviewers**, with **both readings quoted and attributed**.
18. The disagreement is **resolved in the debrief and preserved afterwards**. Scene 06 commits to *"We show you both. We do not average them into a single number."* A fixture in which the losing reading is deleted breaks that commitment.
19. The resolution **states what changed the second reading**. "The panel discussed it" would not satisfy this.

**Character of the data**

20. Names are long, titles are real, and **not every number aligns** — the take-home's hypothetical ~40k/sec and the resume's actual ~35k/sec are deliberately different (§10). A fixture in which every figure matched would read as fabricated, and Scene 05's whole argument is that the evidence is real enough to check.
21. **All data is synthetic.** No real person, employer or document. This is not a stylistic preference and it does not relax with consent or redaction.

## 12.3 · Ownership on conflict

Where this document and a frozen scene register disagree, **the scene register wins and this document is corrected** — Scenes 06 and 07 are frozen and their copy is Gate 3; this fixture is downstream of both.

The one exception is §3, the take-home text itself, which exists nowhere else and is authoritative here.

## 12.4 · Obligation on every edit

Re-run the §10 consistency check. **Twelve rows; all twelve must reconcile.** If one does not, either the edit is wrong or a frozen register needs amending — and the second of those is a governance decision, not an engineering one.

---

*Scene 05 canonical fixtures — content only. Synthetic throughout.*
*Version 1.0.0 · Frozen 2026-07-25 · Single source of truth for Scene 05.*
*Changes to §12.2 invariants require a major increment and Marketing Owner approval.*
