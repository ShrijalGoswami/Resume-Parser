# HireLens Homepage — Storyboard

**Version 1.0 · Creative direction**
Owner: Marketing Owner · Creative Direction: CXO
Authority: **Subordinate to governance and to Books I–II.** Where this document and any of them disagree, they are correct and this is wrong.
References: `MARKETING_DESIGN_BIBLE.md` · `DESIGN_REVIEW_CHECKLIST.md` · `DESIGN_DECISION_LOG.md` · `VISUAL_DESIGN_SYSTEM_FOUNDATIONS.md` (Book I) · `VISUAL_DESIGN_SYSTEM_COMPONENTS.md` (Book II)

---

# Director's Note

## Three reframes before anything else

The brief asks for a cinematic homepage where the user feels like they are *watching HireLens think*. That instinct is right and it is worth protecting from the two ways it usually gets executed badly. Three reframes govern everything below.

### 1. Cinema here means editing, not animation

Governance is unusually restrictive about motion, and correctly so: motion explains or it goes, nothing loops, no scroll-jacking, no parallax, no staggered page reveals (Bible Ch. 10). A naive reading concludes that a cinematic homepage is therefore impossible.

That reading confuses film with animation. **The most cinematic thing about film is the cut** — the decision about what follows what, how long a shot holds, and what the audience is made to want before they are given it. Kubrick's match cut is not an animation. It is a sequence decision.

**So: this homepage is edited, not animated.** The scroll *is* the cut. Pacing comes from density change, from how long a scene holds before it releases, and from the discipline of ending each scene on a question the next one answers. A page that is composed this way feels inevitable at any motion budget — including near zero.

**The motion budget for the entire homepage is three moments.** Named in the Motion Density Map. Everything else is still.

### 2. "Watching it think" must not become thinking theatre

There is a specific way this brief goes wrong, and it is prohibited: rendering a pulsing orb, a typing cursor, a progress bar, or an artificial delay to simulate cognition. Checklist §7.8 makes this **Gate 4** — no fake progress, no artificial thinking delay — and §14 F3 explains why it is fatal for us specifically: our entire positioning is that our outputs are honest. A page that theatrically pretends to think has contradicted the product before the reader has finished the first sentence.

**The page shows thinking by being organised the way thinking is organised.**

Evidence before conclusion. Uncertainty stated rather than hidden. One decision followed all the way to its end instead of nine features gestured at. The reader experiences reasoning because they are *walked through* reasoning — not because something on screen is animated to look pensive.

This is the harder version and the only defensible one. It is also, incidentally, the more impressive one: anyone can animate a shimmer.

### 3. The chaos is named, not shown

The proposed arc opens on Chaos. The instinct is sound — the reader's world *is* chaotic — but as a **scene one** it fails governance directly.

Bible Ch. 4, Movement I requires the hero to be legible in a single fixation: one claim, no competing focal points, **nothing that moves**. A chaos scene invites exactly the opposite — a storm of resumes, a visually busy composition, motion. It also violates Book I Ch. 1's central emotional premise: our user is already under pressure, and **the interface's job is to be the one thing in their afternoon that is not adding to it.** Opening on visualised chaos adds to it.

**Chaos belongs in the writing, not in the picture.** One sentence that names their Tuesday better than they would name it does more than any animation of falling paper. And the chaos appears later, in Scene 03, as *real content at real density* — a genuinely overloaded queue — which is evidence rather than depiction (Bible 5.2).

---

# The Narrative — challenged and revised

## The proposed arc

> Chaos → Focus → Understanding → Evidence → Confidence → Decision → Trust → CTA

**It is close, and it is wrong in three specific places.** All three are governance failures rather than matters of taste, which is why I am changing it rather than debating it.

### Problem 1 — It opens on spectacle instead of recognition

Covered above. Chaos-as-scene-one produces a hero that cannot pass Movement I.

**More fundamentally:** chaos is *our* framing of the reader's problem. Recognition is the reader's own experience handed back to them more precisely than they could state it. The difference is the difference between "hiring is broken!" — which every competitor says, and which the reader has learned to skip — and a sentence that describes their actual afternoon.

### Problem 2 — Relief is missing entirely, and it is the most important beat

Bible Ch. 4, Movement II: **the reader arrives carrying skepticism accumulated from every AI hiring pitch they have seen this year. That skepticism is a wall, and it must come down before any capability claim can be absorbed.**

The proposed arc goes Chaos → Focus. Focus is a capability claim. It is being made to someone who has not yet decided to believe us, which means it lands as noise — the reader's internal response is *sure, everyone says that.*

Relief is produced by showing the thing no one else shows. For us that is specific and available: **a low-confidence read.** A system admitting it does not know enough. That is a costly signal, it is the thing our competitors are structurally unable to show, and it is the fastest possible way to get a skeptical senior recruiter to grant us the next thirty seconds (Bible Ch. 14 — trust is bought with voluntary constraint).

### Problem 3 — Trust sits too late

The proposed arc places Trust at position seven, after Decision. But Bible Ch. 4's Movement IV is *"this would survive contact with my organization"* — security, legal, the hostile hiring manager, the 400 candidates in the old system — and that question arrives **before** the reader will take a next step, not after they are convinced the product is good.

There is also a second trust obligation the linear arc misses: **product-level trust must be woven from Scene 02 onward**, because it is what produces Relief in the first place. Organisational trust is a scene. Product trust is a thread.

### One thing the proposed arc gets exactly right

**Evidence sits between Understanding and Confidence.** That ordering is correct and it is the spine of the page. Confidence that does not arrive *through* evidence is just a mood, and a reader who feels confident without having seen why will not be able to defend the product to a colleague on Monday — which is the actual test (Bible Ch. 14).

## The revised arc

```
  RECOGNITION      →  RELIEF        →  COMPREHENSION                    →  CONFIDENCE  →  RESOLVE
  Movement I          Movement II      Movement III                        Movement IV    Movement V

  01 The Sentence     02 The Admission  03 The Pile                        08 The Room    09 The Close
                                        04 Resolution
                                        05 The Trail
                                        06 What We Don't Know
                                        07 The Record
```

**Nine scenes. Five movements. One candidate carried from Scene 03 to Scene 07.**

The structural change worth noticing: Movement III is not a feature tour. It is **one decision, followed from an overloaded queue to a defensible record**, with the same candidate present throughout. Bible Ch. 11 names this the shape most distinctive to us and nearly impossible for a competitor to copy convincingly — because they would need the product to back it.

**Why this arc is inevitable rather than assembled:** each scene ends on a question the reader is now actually asking, and the next scene opens on its answer. That is the whole transition mechanism, and it is why the page cannot be reordered without breaking.

| After scene | The reader is asking | Answered by |
|---|---|---|
| 01 | "Fine — but what makes you different from the last four of these?" | 02 |
| 02 | "That's a nice gesture. What do you actually do?" | 03 |
| 03 | "So how do you get from that to something I can use?" | 04 |
| 04 | "How do I know the sorting is right?" | 05 |
| 05 | "What about the parts you got wrong?" | 06 |
| 06 | "So what do I end up with?" | 07 |
| 07 | "Could I actually get this into my company?" | 08 |
| 08 | "What would I have to do next?" | 09 |

---

# Transition grammar

Three transition types. Every scene boundary is one of them. Nothing else is permitted, and none of them animate.

**HARD CUT** — an abrupt density change. Sparse to dense, or dense to sparse. The reader feels a gear change. This is the strongest tool on the page and it is used four times. Book I Ch. 2: *the transition between density registers is itself a design tool — moving sparse to dense signals "now I am showing you the real thing."*

**MATCH CUT** — the same object persists across the boundary in a different context. Our candidate appears in the queue in Scene 03, is separated in 04, has her evidence opened in 05, her gaps named in 06, and her decision recorded in 07. **The match cut is what makes five scenes feel like one continuous thought** rather than five feature sections.

**ANSWER CUT** — the scene ends on a stated question and the next opens on its answer. Used at every boundary as the *logical* transition, layered underneath whichever visual transition applies.

**Prohibited:** scroll-jacking, parallax, pinned sections, scroll-driven scrubbing, staggered element reveals, and any transition that delays reading (Bible Ch. 10; Book I Ch. 14 nevers). If a transition requires the reader to wait, it is not a transition — it is an obstacle.

---

# THE SCENES

---

## Scene 01 — The Sentence

**Movement:** I · Recognition
**Duration held:** ~8 seconds before the reader moves

**Narrative Goal**
Make the reader recognise their own Tuesday in a sentence they did not write. Nothing else. **This scene is not selling; it is earning the next thirty seconds.**

**User Emotion**
*Recognition.* The specific jolt of seeing an unarticulated problem stated better than you would have stated it. Not curiosity, not excitement — a reader who is merely intrigued grants three seconds; one who recognises themselves grants thirty.

**Recruiter Question Being Answered**
*"Is this for me, or is this another one of these?"*

**Core Message**
The problem is not that you have too little information. It is that at the moment you have to decide, you cannot see clearly.

**Visual Metaphor**
**Stillness.** The metaphor here operates by absence — this is the one page on the internet about AI hiring that is not shouting. The composure *is* the argument, and it is legible before a single word is read.

**Interaction Opportunity**
**None.** Deliberately. The first interactive element on this page appears in Scene 02, and its absence here is what makes the sentence land. Anything clickable in Scene 01 competes with reading it.

**Motion Intent**
**Zero.** Nothing moves, nothing fades in, nothing reveals on load. Bible Ch. 4: *nothing that moves.* This is also the single most differentiating decision on the page — every competitor's hero is animated, and a still one reads as confidence rather than as an unfinished build.

**Transition In**
Page load. The scene is fully present at first paint. **No entrance animation of any kind** — an entrance animation on a hero delays the one sentence the page exists to deliver, which is Ch. 9's second motion commitment.

**Transition Out**
**HARD CUT into 02.** The reader has read one sentence in a very quiet room and scrolls expecting the pitch. They get an admission instead. The gear change is the point.

**CTA**
One primary, present but subordinate — it must not compete for the single focal point. Labelled by what happens, never "Get started" (Bible Ch. 4, Movement V). Its job here is to exist for the small number of readers who are already convinced, not to convert anyone.

**Governance notes**
One claim, one focal point, legible in a single fixation. Sparse register (Book I Ch. 2). No abstract AI imagery (§10.4). Speed is not the claim (§10.6).

---

## Scene 02 — The Admission

**Movement:** II · Relief
**Duration held:** ~20 seconds

**Narrative Goal**
Take down the wall. Show the one thing no competitor shows, before making a single capability claim.

**User Emotion**
*Relief, then surprise.* The sound of skepticism being set down. The reader's internal sentence should be **"oh — this is different from the others,"** and it should arrive as a small shock rather than a conclusion.

**Recruiter Question Being Answered**
*"What happens when your AI doesn't actually know?"* — the question every experienced recruiter asks in the first five minutes, and which no competitor's marketing answers.

**Core Message**
When we do not have enough to be sure, we say so — and we tell you exactly what is missing.

**Visual Metaphor**
**A partially resolved image.** The Resolution metaphor doing its most important work (`DDL-BRD-001`, `DDL-VIS-004`). A low-confidence assessment rendered as *less resolved* — not as a warning, not as a red flag, not as a failure. Something out of focus, which is exactly what it is.

**This is the most consequential visual on the entire homepage.** If the reader interprets the low-confidence state as "bad candidate" rather than "not enough information," the scene has inverted its own meaning and the page has failed at its most important beat (Checklist §8.11).

**Interaction Opportunity**
**The first interaction on the page, and it should be irresistible.** The reader can see what *would* raise the confidence — the missing signal named, and what changes when it arrives. Not a toy: a two-state demonstration of the product's central epistemic claim, controlled by the reader.

The interaction is the argument. A reader who moves it themselves has verified the claim rather than been told it.

**Motion Intent**
**Motion moment 1 of 3.** The state change when the reader adds the missing evidence. Brief, decelerating, ending settled — focus adjustment, exactly as Bible Ch. 10 and Book I Ch. 1 define it. Under 200ms. **Nothing loops, nothing pulses, nothing waits.** The scene is completely still until the reader acts.

**Transition In**
**HARD CUT from 01.** Sparse to medium. The reader arrived expecting a claim and receives a limitation.

**Transition Out**
**ANSWER CUT into 03.** The reader now believes we are honest. They do not yet know what we do. The unspoken question — *"that's a nice gesture, but what does this thing actually do?"* — is what Scene 03 opens on.

**CTA**
None. **A CTA here would be the single worst placement on the page** — we have just spent credibility buying trust, and asking for something immediately reads as the gesture having been transactional.

**Governance notes**
Satisfies §10.8 (marketing must show an imperfect state) — this scene is where that obligation is met, and it is deliberately placed at position two rather than buried. Confidence rendered per A-05/A-06: no hue, no bar, no percentage, no state palette. Demonstration before assertion (5.2).

---

## Scene 03 — The Pile

**Movement:** III · Comprehension (opening)
**Duration held:** ~25 seconds

**Narrative Goal**
Show the real problem at real scale, as evidence rather than as depiction. **This is where the chaos lives** — and it lives as a genuinely overloaded queue, not as a visual effect.

**User Emotion**
*Familiarity, tinged with dread.* The reader should feel their own Monday morning. Not overwhelmed by our graphics — recognising their own backlog.

**Recruiter Question Being Answered**
*"Do you understand what my actual volume looks like?"*

**Core Message**
347 applications. Four you should be talking to. Nothing in your current stack can tell you which four.

**Visual Metaphor**
**Undifferentiated density.** A real Index panel at full compact density, with real-length names, missing fields, and hundreds of rows — the point being that everything looks the same. This is *low resolution* in the optical sense: all the information is present, and nothing is distinguishable.

**The metaphor and the product screenshot are the same object here.** That is the strongest possible position for a visual to be in.

**Interaction Opportunity**
**Scroll within the pile.** The reader can move through the queue and feel that it does not end. A small, honest interaction that makes the volume tangible without any effect being applied to it.

**Motion Intent**
**Zero.** The pile is still. **Any motion here would be the falling-resumes cliché** and would convert evidence back into depiction. Its stillness is what makes it read as a real screen rather than an illustration of one.

**Transition In**
**HARD CUT from 02.** Medium to dense — the strongest density change on the page. Book I Ch. 2: this transition signals *now I am showing you the real thing.* It is placed exactly here for that reason.

**Transition Out**
**MATCH CUT into 04.** One candidate in this queue is about to become the thread that runs through the next four scenes. She is present here, indistinguishable from 346 others, which is the entire point.

**CTA**
None.

**Governance notes**
Real data at real density — worst-case realistic, per Book I Ch. 10 and §14 C3. Synthetic, never real candidate data. No photographs (`DDL-VIS-007`). Dense register. Density as respect (5.4) — a simplified pile would communicate *toy* and would undercut the scene's only job.

---

## Scene 04 — Resolution

**Movement:** III · Comprehension
**Duration held:** ~25 seconds

**Narrative Goal**
Show separation happening. The product's core action, performed once, on the pile the reader just felt.

**User Emotion**
*Release.* The specific relief of a blur coming into focus. This is the page's most satisfying moment and it should be earned rather than announced.

**Recruiter Question Being Answered**
*"How do you get from 347 to something I can actually work with — and is it just keyword matching?"*

**Core Message**
We do not add information. We make the information you already have distinguishable.

**Visual Metaphor**
**Resolution itself, literally.** The same queue, separated. Not filtered — *resolved*. The distinction matters and the copy must carry it: filtering removes, resolving distinguishes. Nothing was discarded; the four that matter became visible.

This is the scene where the brand metaphor and the product function are demonstrably the same thing (`DDL-BRD-001`), and it is why the metaphor was chosen over lens, funnel, or signal.

**Interaction Opportunity**
**Change the bar and watch the resolution change.** The reader adjusts what they are looking for — seniority, a specific capability — and the separation reorganises. This demonstrates the differentiator that disarms the deepest objection: **the bar is yours; we do not have an opinion about who is good in the abstract** (Bible Ch. 2, differentiator 4).

A reader who moves the bar and sees the answer change has personally verified that we are not a black box with opinions.

**Motion Intent**
**Motion moment 2 of 3.** The separation, when the reader triggers it. Decelerating into a settled state that is sharper than the one before — the metaphor's exact definition of motion (Book I Ch. 1). Under 400ms. It happens once per reader action and then stops completely.

**Explicitly prohibited here:** a continuous "sorting" animation, a scanning line, a progress sweep, or any implication of computation duration. That is thinking theatre and it is Gate 4 (§7.8).

**Transition In**
**MATCH CUT from 03.** Same queue, same candidates, same screen. The reader must recognise it as the identical object — if it reads as a different screenshot, the scene's argument evaporates.

**Transition Out**
**ANSWER CUT into 05.** The reader has just watched a ranking appear. The immediate, correct, skeptical question is *"how do I know that's right?"* — and a page that does not answer it here has produced a verdict, which is the one thing we have committed never to do.

**CTA**
None.

**Governance notes**
Never claims to predict performance or eliminate bias (§10.7, **Gate 3**). Ranking shown without podium, medal, size-scaling, or colour ramp (D-05). Confidence visible on every entry — **a ranked list without confidence is a verdict list** (Gate 2).

---

## Scene 05 — The Trail

**Movement:** III · Comprehension (the spine)
**Duration held:** ~40 seconds — the longest hold on the page

**Narrative Goal**
Prove traceability by letting the reader use it. **This is the load-bearing scene of the entire homepage.** Every claim we make elsewhere rests on the reader having personally followed one conclusion to its source.

**User Emotion**
*Verification.* The satisfaction of checking something and finding it holds. Quieter than delight and considerably more durable.

**Recruiter Question Being Answered**
*"Where did that come from? And can I defend it to my hiring manager?"*

**Core Message**
Every conclusion has a path back to the sentence that produced it. Follow it yourself.

**Visual Metaphor**
**A thread pulled taut.** Conclusion → dimension → the specific line in the specific document. Not a summary of the source. **The source.**

**Interaction Opportunity**
**The most important interaction on the page. Give it room.**

The reader clicks a claim about our candidate and lands on the exact sentence in the take-home submission that produced it. Then the next claim. Then one that came from an interview transcript.

Two design obligations, both from §8.1 and §14 F4:
- **The citation resolves to the passage, not the document.** A link to a four-page resume is provenance theatre and a sophisticated reader will catch it in one click.
- **Extraction is visibly distinguished from inference.** *"Worked at X, 2019–2022"* (read from the document) and *"likely has team leadership experience"* (inferred) carry different error profiles, and showing the difference is a costly signal in exactly the way Bible Ch. 14 describes.

**Motion Intent**
**Zero animated motion.** State changes are instant — the evidence is either shown or not. Governance permits a brief transition here; I am choosing not to spend one. **A conclusion resolving to its source should feel like turning to a page, not like a reveal.** Any animation would frame verification as a flourish, and verification is the product.

**Transition In**
**MATCH CUT from 04.** The candidate ranked first in Scene 04 is the candidate whose evidence opens here. One person, followed.

**Transition Out**
**ANSWER CUT into 06 — and this is the page's boldest edit.** The reader is now convinced by what we can show. The honest next beat is not another capability. It is: *"what about the parts you got wrong, or don't have?"* We ask it on their behalf, before they do.

**CTA**
None. **The reader is mid-verification and interrupting it would be the page's worst possible instinct.**

**Governance notes**
§8.1 traceability (**Gate 2**). §8.13 extraction vs inference. §14 F4 no provenance theatre. Dense register — Book I Ch. 2: air here would read as evasion. Real screenshot, cropped to the evidence, legible at rendered size (Book I Ch. 10).

---

## Scene 06 — What We Don't Know

**Movement:** III · Comprehension (the turn)
**Duration held:** ~25 seconds

**Narrative Goal**
Voice the objection before the reader does, and answer it with a limitation rather than a capability. **The scene that most distinguishes this page from every competitor's.**

**User Emotion**
*Trust, arriving as a small shock.* The reader expected a feature and received a boundary. Bible Ch. 11 calls this the objection-first shape: high-risk, high-return, and legitimate only when the answer is genuinely good. Ours is.

**Recruiter Question Being Answered**
*"What are the limits? What will this get wrong? And will it tell me?"*

**Core Message**
Here is what we cannot see, what we will not decide, and what we do when the evidence runs out.

**Visual Metaphor**
**A named gap.** Absence rendered *in position* — where the evidence would be — rather than as a blank or a zero. Book I Ch. 11 and A-07: absence of evidence and evidence of absence are opposite findings and must look opposite. *No technical interview conducted* is not *technical interview conducted, no signal found.*

**Interaction Opportunity**
Light. The reader can see the stated boundaries — what we never claim, what we never decide, where a human must be in the loop (Bible Ch. 2, Ch. 14). **Presented as commitments, not as caveats.** The register is a company stating its constraints, not a company apologising.

**Motion Intent**
**Zero.** This scene earns its weight by being completely still. Motion would soften a beat whose entire power is that it does not flinch.

**Transition In**
**ANSWER CUT from 05.** The turn. Momentum was building toward "this is impressive" and the page deliberately breaks it to say "and here is where it stops." That break is what makes everything before it credible retroactively.

**Transition Out**
**ANSWER CUT into 07.** Having been told the limits, the reader's question becomes practical for the first time: *"alright — so what do I actually end up with?"*

**CTA**
None.

**Governance notes**
The clearest instance on the page of Bible Ch. 14's engine: **trust is bought with voluntary constraint.** Claim boundaries stated (§10.7, **Gate 3**). Missing information never styled as an error (§8.15, A-07). Low confidence says what would raise it (§8.3).

---

## Scene 07 — The Record

**Movement:** III · Comprehension (resolution)
**Duration held:** ~20 seconds

**Narrative Goal**
Deliver the artifact. The output of this product is not a score, a shortlist, or a summary — it is **a decision you can defend six months from now.**

**User Emotion**
*Arrival.* The double meaning of the metaphor closing: the reader gained resolution and has now reached resolution (`DDL-BRD-001`). This should feel like the end of a thought, not the end of a feature list.

**Recruiter Question Being Answered**
*"What do I actually walk away with — and what happens when someone asks me about this in six months?"*

**Core Message**
Not a score. A record of what was decided, on what evidence, with what we were unsure about — still legible next year.

**Visual Metaphor**
**A closed document.** The decision record as a real object with real content: the choice, the reasoning, the evidence, the uncertainty that existed at the time, and who decided. Bible Ch. 2, differentiator 3 — decision continuity — made tangible.

**Interaction Opportunity**
Minimal. The reader can read the record. **Nothing more.** This is the page's exhale, and the restraint is deliberate — after Scene 05's dense verification, an interactive scene here would prevent the arrival from landing.

**Motion Intent**
**Zero.**

**Transition In**
**MATCH CUT from 06 — closing the five-scene thread.** The same candidate who was indistinguishable in Scene 03 now has a defensible decision attached to her, including the gap Scene 06 named. **If the reader notices it is the same person, the page has done its most important structural work.**

**Transition Out**
**HARD CUT into 08.** Dense to medium, and a register change from product to organisation. The reader has stopped asking *is this good* and started asking *could I bring this in* — a different question asked by a different part of the brain, and the most common place good products lose deals.

**CTA**
Optional secondary — read a full decision record. Never primary.

**Governance notes**
Real record, real content, synthetic data. Confidence at the time of decision preserved — a record that hides what we did not know would contradict the previous two scenes.

---

## Scene 08 — The Room

**Movement:** IV · Confidence
**Duration held:** ~30 seconds

**Narrative Goal**
Answer the organisational objections before they are raised, in a form the reader can repeat to someone else without us present.

**User Emotion**
*Reassurance, verging on relief.* The reader is imagining a security review, a legal review, and the hiring manager who hates new tools. Every objection we voice first is an objection we control the framing of.

**Recruiter Question Being Answered**
*"Would this survive my company? What does security say? What about the 400 candidates already in our old system?"*

**Core Message**
Here is exactly how your data is handled, what the system will and will not decide, and what adoption actually involves.

**Visual Metaphor**
**A clear window.** Nothing obscured, nothing in legal register. Plain sentences a non-technical recruiting leader can read once and repeat correctly — which is Bible Ch. 14's actual test, because our champion will be in that room alone with only what they remember.

**Interaction Opportunity**
Light and utilitarian: expand a specific commitment. **Trust content is a first-class section here, not a footer** (§9.4, §14 G2) — placement is a statement about importance, and exiling it tells the reader we consider it a formality.

**Motion Intent**
**Zero.**

**Transition In**
**HARD CUT from 07.** Register change from product to organisation.

**Transition Out**
**ANSWER CUT into 09.** Every objection the reader can currently articulate has been answered. The only remaining question is *"what would I have to do next?"*

**CTA**
None. **The close is Scene 09's job**, and putting one here would trade a small conversion for the composure the whole page has been building.

**Governance notes**
Specific, not "enterprise-grade" (§9.3). Leads with what we will *not* do (§9.1). No defensiveness (§9.5). Candidate treated as a stakeholder (§9.6). Social proof, if present, appears **here and not earlier** — proof before substance argues "believe us because others do," which is the argument of a product that cannot make its own case (§9.7, §14 G4).

---

## Scene 09 — The Close

**Movement:** V · Resolve
**Duration held:** ~10 seconds

**Narrative Goal**
Make the next step obvious and small. **Not exciting — small.**

**User Emotion**
*Resolve.* The quiet state of having decided. Deliberately not excitement: excitement is a poor predictor of action in enterprise software, because the excited reader still has to convince three colleagues on Monday (Bible Ch. 4, Movement V). Resolve is produced by reducing the cost of the next step, not by raising enthusiasm.

**Recruiter Question Being Answered**
*"What happens if I click this?"*

**Core Message**
See it on your own roles.

**Visual Metaphor**
**An open door.** Return to Scene 01's stillness — the page closes in the same register it opened in, which is what makes it feel composed rather than escalating. The reader should feel the room is quiet again.

**Interaction Opportunity**
One primary action. One secondary for the reader not ready to commit.

**Motion Intent**
**Motion moment 3 of 3, and only if it earns itself:** the primary action's own state feedback. Nothing else.

**Transition In**
**HARD CUT from 08.** Medium to sparse. The page empties out. The last thing on screen is one sentence and one action.

**Transition Out**
End of page.

**CTA**
**One primary. Labelled by what happens, not by what we want** — "See it on your own roles," never "Get started," never "Book a demo" as the primary.

**Prohibited absolutely:** manufactured urgency, countdowns, exit-intent modals, limited-time framing, "join 500+ teams" pressure. These convert a small number of readers and permanently cost the seriousness the previous eight scenes spent four minutes building (§10.9). **A page that argues for careful judgement and then closes with a countdown has refuted itself.**

**Governance notes**
One primary action per page. No urgency manufacturing. Sparse register.

---

# APPENDICES

---

## 1. Scroll Journey Map

| # | Scene | Movement | Density | Cumulative time | Exit transition |
|---|---|---|---|---|---|
| 01 | The Sentence | I — Recognition | Sparse | 0:00 – 0:08 | HARD CUT |
| 02 | The Admission | II — Relief | Medium | 0:08 – 0:28 | ANSWER CUT |
| 03 | The Pile | III — Comprehension | **Dense** | 0:28 – 0:53 | MATCH CUT |
| 04 | Resolution | III | **Dense** | 0:53 – 1:18 | ANSWER CUT |
| 05 | The Trail | III | **Dense** | 1:18 – 1:58 | ANSWER CUT |
| 06 | What We Don't Know | III | Medium | 1:58 – 2:23 | ANSWER CUT |
| 07 | The Record | III | Medium | 2:23 – 2:43 | HARD CUT |
| 08 | The Room | IV — Confidence | Medium | 2:43 – 3:13 | ANSWER CUT |
| 09 | The Close | V — Resolve | Sparse | 3:13 – 3:23 | — |

**Density rhythm:** `Sparse → Medium → DENSE → DENSE → DENSE → Medium → Medium → Medium → Sparse`

A single sustained dense passage in the middle, bracketed by sparse ends. **The page breathes in, holds, and breathes out.** Book I Ch. 2: emotional passages run sparse, evidentiary passages run dense — and the three-scene dense block is where the reader is meant to be convinced rather than moved.

---

## 2. Emotional Curve

```
  intensity
     │                              ╭──────╮
 high│                        ╭─────╯      ╰─╮
     │                   ╭────╯              ╰──╮
  mid│         ╭────╮╭───╯                      ╰────╮
     │    ╭────╯    ╰╯                               ╰────╮
  low│────╯                                               ╰───
     └──────────────────────────────────────────────────────────
       01    02    03    04    05    06    07    08    09
     recog  relief dread focus verify  turn arrive reassure resolve
```

**Two deliberate breaks in the curve, and both matter more than the peaks:**

**The dip at 03.** Dread is a *lower* emotional state than the relief of Scene 02, and putting it there is intentional. The reader must feel the problem's weight immediately before seeing it resolved, or Scene 04 is a capability demonstration rather than a release. **A page that only ascends is a page nobody believes.**

**The break at 06.** Momentum is building toward "this is impressive" and the page deliberately interrupts to say "and here is where it stops." That interruption is what makes Scenes 03–05 credible retroactively — it converts an impressive demo into an honest one.

**The curve does not peak at the CTA.** Scene 05 is the emotional and structural high point; Scene 09 lands lower, on resolve. This is the correct shape for enterprise software and the opposite of the standard escalating-to-conversion arc.

---

## 3. Motion Density Map

**Total motion budget for the homepage: three moments.**

| # | Scene | Moment | Duration | Trigger |
|---|---|---|---|---|
| 1 | 02 | Confidence state change when reader supplies missing evidence | <200ms | User |
| 2 | 04 | Separation, when reader sets the bar | <400ms | User |
| 3 | 09 | Primary action state feedback | <150ms | User |

**Every motion moment is user-triggered. Nothing on this page animates on its own, on load, or on scroll.**

| Scene | Motion |
|---|---|
| 01 · 03 · 05 · 06 · 07 · 08 | **Zero** |

**Prohibited page-wide:** scroll-triggered reveals, staggered entrances, parallax, scroll-jacking, pinned sections, ambient loops, shimmer, pulse, breathing gradients, animated backgrounds, scanning lines, typing effects, counting-up numbers, chart load animations, and **any motion implying computation duration** (§7.8, **Gate 4**).

**Why the budget is this small.** Bible Ch. 10: motion explains or it goes. Only three moments on this page carry information the layout cannot. A homepage with three animations and eight still scenes reads as *composed*; the same page with thirty reads as *anxious* — and anxiety is the exact register Book I Ch. 1 commits us against.

**Reduced motion:** all three become instant state changes. Because motion carries no meaning the layout does not already carry, nothing is lost — which is the test §14 H4 sets, passed by construction rather than by remediation.

---

## 4. Interaction Density Map

| Scene | Interaction | Weight | What it proves |
|---|---|---|---|
| 01 | None | — | Nothing competes with the sentence |
| 02 | Supply the missing evidence | **High** | We report our own uncertainty honestly |
| 03 | Scroll the pile | Low | The volume is real |
| 04 | Set the bar | **High** | The bar is yours; we have no opinion in the abstract |
| 05 | Follow the evidence trail | **Highest** | Every conclusion resolves to its source |
| 06 | Expand a stated boundary | Low | The limits are commitments, not caveats |
| 07 | Read the record | Minimal | The output is a defensible decision |
| 08 | Expand a commitment | Low | Specifics, not assurances |
| 09 | One primary action | — | The next step is small |

**The governing rule: every interaction is a demonstration, never a toy.**

Bible 5.2 — show, then claim. Each of the three high-weight interactions lets the reader **personally verify a claim we would otherwise be asserting.** A reader who has followed an evidence trail themselves does not need to be told we are traceable, and cannot be talked out of it by a competitor's counter-claim.

**Interaction density peaks at Scene 05** and falls away completely by Scene 07. The last third of the page is read, not operated — because a reader mid-interaction is not a reader forming resolve.

---

## 5. Attention Heatmap

Where a reader's attention actually lands, and what it should find there.

| Scene | Primary fixation | Secondary | Deliberately quiet |
|---|---|---|---|
| 01 | **The sentence** | — | CTA, navigation |
| 02 | **The unresolved claim** | What would raise it | Everything else |
| 03 | **Row density as a mass** | The count | Individual rows |
| 04 | **The four that separated** | The bar control | The 343 that did not |
| 05 | **The source passage** | The claim it supports | Surrounding chrome |
| 06 | **The named gap** | Stated boundaries | — |
| 07 | **The reasoning** | The decision itself | Metadata |
| 08 | **The plain-language commitment** | Specifics | Logos, if present |
| 09 | **The one action** | — | Everything else |

**Three attention rules govern the page:**

**One focal point per viewport.** Two competing focal points do not double attention; they produce a moment of arbitration in which the reader loses the thread (Book I Ch. 2).

**In Scene 07, the reasoning outranks the decision.** Visual weight maps to actual importance (§6.2), and in this product the reasoning *is* the value. A record where the outcome dominates its reasoning would contradict everything before it.

**The accent appears roughly once per viewport, on the action.** Nine scenes, nine accent instances maximum, page-wide (Book I Ch. 6; Book II composition rule 4). If a section needs the accent to feel important, its hierarchy is wrong.

---

## 6. Estimated Scroll Duration

| Reader | Behaviour | Duration |
|---|---|---|
| **Scanner** | Headings, Scene 02, one screenshot, exit | **0:35 – 1:10** |
| **Engaged reader** | Full pass, no interaction | **3:20 – 4:00** |
| **Verifier** *(target)* | Full pass with the three high-weight interactions | **5:30 – 7:00** |
| **Evaluator** | Verifier, plus Scene 08 in detail | **8:00 – 10:00** |

**The page is optimised for the Verifier, and this trade is worth stating.** A page optimised for the Scanner would front-load claims and thin the middle — which is precisely the shape Bible Ch. 11 rejects, because it produces a reader who can recite our benefits and could not describe what we do.

**The comprehension test** (§10.2, Movement III): could this reader explain HireLens to a colleague afterwards? A Verifier can. A Scanner cannot, and no amount of front-loading would change that — it would only cost us the Verifier.

**Design consequence:** Scene 02 must work standalone, because it is the only scene a Scanner reliably reads. It is the one place where a partial reader still receives the differentiating claim.

---

## 7. Sections Stitch should prototype

Scenes where the value is compositional — layout, hierarchy, density, and pacing — and where rapid variant generation beats hand-building.

| Scene | Why Stitch | What to explore |
|---|---|---|
| **01 · The Sentence** | Pure typographic composition. High variant value at near-zero build cost. | Scale, measure, vertical position, CTA subordination. **Every variant must be completely still.** |
| **06 · What We Don't Know** | Static, editorial, structure-driven. | How boundaries read as commitments rather than caveats — a tone problem solvable by layout. |
| **07 · The Record** | A document rendered as a designed object. | Reasoning-over-outcome hierarchy; how a record reads as an artifact rather than a receipt. |
| **08 · The Room** | Conventional in form, hard in tone. | Trust content as a first-class section, not a footer. Specificity made scannable. |
| **09 · The Close** | Minimal composition. | How little can be on screen while the action stays obvious. |

**Brief every Stitch generation with these constraints**, because they are the ones a generative tool will violate by default (§14 J1): border-first, no gradients, no glass, no glow, three elevation levels, one accent per view, sentence case, no abstract AI imagery, no illustration, no device frames, no rotation or perspective, tabular figures, real data.

**Reject any output that would work unchanged on a competitor's site.** That is the generic-solution test (§6.13), and it is the failure mode most likely to arrive looking competent.

---

## 8. Sections requiring custom implementation

Scenes where the product itself is the visual, and where a generated approximation would be worse than nothing — because approximating a real screen is exactly the marketing-mockup dishonesty §5.7 and §14 C3 prohibit.

| Scene | Why custom | Critical requirement |
|---|---|---|
| **02 · The Admission** | The confidence rendering is the product's central claim. A-05/A-06 must be exact. | **No hue, no bar, no percentage, no state palette.** Reduced definition, never a warning. If a viewer reads "bad candidate," it has inverted its own meaning. |
| **03 · The Pile** | Real Index at real density with realistic worst-case data. | Long names, missing fields, hundreds of rows. Synthetic, never real. No photographs (`DDL-VIS-007`). |
| **04 · Resolution** | Interactive re-separation against a reader-set bar. | Ranking without podium, medal, size-scaling, or colour ramp. Confidence on every entry. **No sorting animation** — Gate 4. |
| **05 · The Trail** | The load-bearing scene. Citations must genuinely resolve. | **Passage-level, not document-level** (§14 F4). Extraction visibly distinct from inference (§8.13). If a reviewer follows three citations and one lands on a document, the scene fails. |

**These four scenes are subject to the full §8 gate** — sixteen blocking checkpoints, no proportionality clause — even though they are marketing surfaces. **They render model output to a user, and Gate 2 does not have a marketing exemption.** A reviewer must be able to run §8.1 through §8.16 against Scenes 02, 04, and 05 as though they were product.

---

# Self-Review

## Against governance

| Source | Check | Result |
|---|---|---|
| Bible Ch. 1 | Leads with clarity, not speed; AI not the subject | Pass — Scenes 01, 04 |
| Bible Ch. 2 | Claim boundaries; evidence over verdicts | Pass — Scenes 05, 06; Gate 3 noted at 04, 06 |
| Bible Ch. 4 | Five movements, correct order | Pass — arc revised specifically to satisfy this |
| Bible Ch. 10 | Motion explains or goes; nothing loops | Pass — three moments, all user-triggered |
| Bible Ch. 11 | One thesis; one decision followed deep | Pass — Scenes 03–07, one candidate |
| Bible Ch. 12 | Vocabulary, sentence case, no exclamation | Pass |
| Bible Ch. 14 | Trust via voluntary constraint | Pass — Scenes 02, 06 |
| Checklist §10.1 | Headings form an argument, not an index | Pass — see the question table |
| Checklist §10.2 | Emotional sequence | Pass — mapped per scene |
| Checklist §10.4 | Show before claim; no abstract AI imagery | Pass |
| Checklist §10.6 | Clarity before speed | Pass — speed is never the claim |
| Checklist §10.7 **Gate 3** | Claim boundaries | Pass — Scene 06 states them |
| Checklist §10.8 | Shows an imperfect state | Pass — **Scene 02, at position two** |
| Checklist §10.9 | CTA reduces cost of next step | Pass — Scene 09, no urgency |
| Checklist §7.8 **Gate 4** | Interface honesty | Pass — thinking theatre prohibited explicitly |
| Checklist §8 **Gate 2** | AI surfaces | Pass — applied to Scenes 02, 04, 05 |
| Book I Ch. 1–2 | Composure; density registers | Pass — density map |
| Book I Ch. 10 | Plane-true, real data, no device frames | Pass — §8 constraints |
| Book II A-05/A-06/A-07 | Confidence and absence rendering | Pass — Scenes 02, 06 |

## Conflicts reported

**One, in the brief itself. It has been resolved by following governance, and it is reported rather than absorbed.**

### The proposed narrative arc conflicts with Bible Ch. 4 in three places

**The conflict.** The brief's arc — Chaos → Focus → Understanding → Evidence → Confidence → Decision → Trust → CTA — is not compatible with the frozen emotional sequence in Bible Ch. 4, which is stated there as *"a mechanism, not a suggestion."*

Specifically: (1) opening on Chaos cannot satisfy Movement I, which requires one claim, one focal point, and nothing moving; (2) the arc contains no Relief beat, so the first capability claim lands on unbroken skepticism; (3) Trust at position seven arrives after the reader has already needed it.

**Why it exists.** The proposed arc is a good *product* narrative — it describes what the system does, in order. Bible Ch. 4 sequences by *what the reader needs to feel to arrive somewhere they can act*, which is a different ordering and frequently an inverted one. This is a natural and common divergence, not an error in the brief.

**Recommendation: Follow existing governance.** The brief explicitly invited the challenge, and Bible Ch. 4 is frozen. I have revised the arc to the five-movement sequence and documented the reasoning above rather than reconciling the two silently. **No amendment is warranted** — governance is correct here, and the revised arc preserves everything the proposed one was reaching for while satisfying the mechanism.

### Two interpretations, recorded for transparency

**"Cinematic" under a near-zero motion budget.** Resolved as editing rather than animation — the cut, the hold, the density change. No new principle invented; Bible Ch. 10 and Book I Ch. 1 are followed exactly.

**"Watching HireLens think."** Resolved as structural rather than animated, because the animated reading is a **Gate 4** violation (§7.8, §14 F3). Stated explicitly in the Director's Note so that no downstream Stitch or implementation brief re-introduces it — this is the single most likely place this document gets misread into a governance failure.

## Decisions recorded

Two filed in `DESIGN_DECISION_LOG.md`, status **Proposed** pending approval of this storyboard:

- `DDL-MKT-001` — Homepage narrative arc: nine scenes across five movements, one candidate carried through Movement III
- `DDL-MKT-002` — Thinking is shown through structure, not animation; page-wide motion budget of three user-triggered moments

---

*HireLens Homepage Storyboard v1.0*
*Subordinate to governance and to Books I–II. Not a layout, not a wireframe, not an implementation.*
