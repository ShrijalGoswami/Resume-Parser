# Hirevo — Design Review Checklist

**Version 1.0 · Status: Frozen · Change policy: Amendments only**
Owner: Product Design & Design Operations
Authority: Binding. Supersedes individual preference.
Companion document: [`MARKETING_DESIGN_BIBLE.md`](./MARKETING_DESIGN_BIBLE.md) — referenced throughout as **the Bible**.
Version history: see the end of this document.

---

# 1. Purpose

## Why this document exists

Design quality does not degrade through bad decisions. It degrades through **locally reasonable decisions made without reference to each other.**

Every one of them has a defensible justification at the moment it's made. A designer adds a filter because a user asked. An engineer adds a modal because it was faster than restructuring the page. A marketer adds a badge because the campaign needed a hook. A model generates a card component because cards are what it has seen. None of these people did anything wrong in isolation. Two years later the product has four navigation patterns, three definitions of "candidate," and a homepage nobody can explain.

The Bible defines what we believe. This document is the mechanism that makes belief survive contact with a shipping schedule. **It exists to make the cost of drift payable up front, in a review, rather than later, in a rebuild.**

## What kind of document this is

It is not a list of things to confirm are present. A checklist that can be completed by inspection produces reviewers who inspect, and inspection catches only the failures that are visible on the surface. Most real design failures are failures of *justification* — the element is present, correctly styled, accessible, and should not exist.

**Therefore every checkpoint in this document is phrased as a question the author must answer, not a box the reviewer must tick.** The reviewer's job is to evaluate the answer. "Yes" is not an answer. "Yes, because ___" is.

If you find yourself able to complete a section of this document in under a minute without reading the artifact carefully, you are not reviewing. You are approving.

## Terminology

Used precisely and consistently throughout. Where a review conversation uses these words loosely, it is usually about to conflate two different things.

| Term | Meaning |
|---|---|
| **Decision Intelligence** | Our category (Bible Ch. 2). Not ATS, not AI recruiting, not resume screening. Used verbatim; never softened to "AI hiring." |
| **Checkpoint** | A numbered question in this document (e.g. §8.2). The unit of review. |
| **Finding** | A reviewer's claim that a checkpoint is unmet, with evidence. |
| **Evidence** | Material supporting a finding or a submission, graded by class (§17). |
| **Gate** | A blocking condition that overrides scoring entirely (§15). Five exist. Marked **[GATE]** at source. |
| **Veto** | A role's authority to block within its stage (§16). Narrower than a gate and role-bound. |
| **Stage** | One of the eight sequenced review passes (§2). |
| **Approval** | The Approver's recorded verdict (§15). Not consensus, and not the absence of objection. |
| **Reviewer** | Anyone assigned to a stage. **Author** is whoever produced the artifact, human or agent. |
| **Smell** | A catalogued anti-pattern (§14). A signal to investigate, not a violation in itself. |

## Who uses it

**Authors** — designers, engineers, writers, and AI agents producing an artifact. Self-review against the relevant sections *before* requesting review. A submission that has obviously not been self-reviewed should be returned unread; reviewing on the author's behalf is how review culture dies.

**Reviewers** — anyone assigned to a stage in §2. A reviewer's authority comes from this document, not from seniority. A junior designer citing a principle outranks a senior designer citing taste.

**Approvers** — whoever holds sign-off for the artifact class. They own the §15 scoring and the final recommendation. Role defined in §16.

**AI agents** (Claude Code, Stitch, or any future generative tool) — this document is the specification an agent should self-review against before presenting output, and the rubric a human should use to evaluate that output. Sections marked **[AGENT]** contain checks that are specifically prone to machine failure modes.

## When it applies

| Artifact | Required stages |
|---|---|
| New product surface (screen, flow) | All stages, §2 |
| Modification to an existing surface | Concept → UX → Visual → Motion → A11y → Eng |
| New component | UX → Visual → Motion → A11y → Eng → Scalability |
| Marketing page | Concept → IA → Visual → Motion → Marketing → A11y → Eng |
| Copy change (substantive) | Marketing (§10) only |
| AI-facing feature | All stages, plus §8 as a **blocking** gate |
| Bug fix, no visual change | None |

**The rule of proportion:** review effort scales with reversibility, not with size. A one-line copy change on the homepage hero is a bigger review than a 400-line refactor behind an existing surface, because the hero is seen by everyone and the refactor is seen by no one.

## How to use it well

**Review the artifact against the principle, not against your own version of the artifact.** The most common failure in design critique is a reviewer describing what they would have made. That is not review; it is a competing submission. The question is never "is this what I'd do," it is "does this satisfy the principle, and is the reasoning sound."

**Separate the three verdicts.** *This is wrong* (violates a principle — blocking). *This is arguably suboptimal* (a judgment call the author owns — comment, don't block). *I would have done it differently* (say nothing). Conflating these makes reviews long and authors defensive.

**Write the reason, always.** A rejection without a cited principle is an opinion with power behind it, and it teaches the author nothing except who to please.

**Escalate premises, not instances.** If you and the author disagree about whether a principle is right, that argument does not belong in a design review. Ship under the current principle and open the amendment separately (Bible, Ch. 15).

---

# 2. Review Process

Eight stages. They are **sequenced deliberately**, and the sequence is the most valuable property of the process.

The reason: **cheap questions must be asked before expensive ones.** Every stage costs more to redo than the one before it. Reviewing the visual design of a screen that should not exist wastes the visual review *and* creates sunk-cost pressure to keep the screen — because by the time it's beautiful, killing it feels wasteful. That pressure is real, it is irrational, and the sequence is designed to prevent it from ever forming.

```
  Concept  →  UX  →  IA  →  Visual  →  Motion  →  A11y  →  Eng  →  Approval
   §3         §5     §4      §6         §7        §11      §12      §15
     ↑                                                                │
     └────────────── kill here, cheaply ──────────────────────────────┘
                     (§8 Trust/AI and §10 Marketing attach where relevant)
```

## Stage 1 — Concept Review (§3)

**Question:** should this exist at all?

**Why first:** the only stage that can produce the highest-value outcome in design, which is *not building something*. Every later stage can only improve an artifact; this one can eliminate it. Skipping it is how products acquire features nobody uses and nobody can remove.

**Inputs:** a written problem statement, the decision it improves, and the alternative of doing nothing.
**Output:** proceed / reshape / kill.
**Reviewer:** product + design lead.

**The discipline:** this stage must be able to say no, and must have said no recently. A concept gate with a 100% pass rate is not a gate. If everything proceeds, the stage is theatre and the real filter has moved somewhere more expensive.

## Stage 2 — UX Review (§5)

**Question:** does this actually get the job done, with the least user effort?

**Why second, before IA:** the flow determines the structure. Teams that design navigation first end up bending tasks to fit a hierarchy they invented before they understood the work. Structure is downstream of behavior.

**Inputs:** the task flow, including failure and empty paths.
**Output:** flow approved / revised.

## Stage 3 — Information Architecture Review (§4)

**Question:** does this fit the mental model users already have, and does it fit our existing structure?

**Why third:** now that the flow is settled, we can ask where it lives. This is also the stage that catches duplication — the single largest source of long-term product decay — because it's the first point where the artifact is evaluated against the whole product rather than on its own.

## Stage 4 — Visual Review (§6)

**Question:** does the surface make the structure legible, and does it hold the standard?

**Why fourth:** visual design is the expression of a resolved structure. Applied earlier, it decorates an unresolved one, and the decoration then argues for keeping the structure.

## Stage 5 — Motion Review (§7)

**Question:** does every animation explain something?

**Why separate from Visual:** motion is reviewed in isolation because it is nearly invisible in static review and nearly impossible to evaluate while also evaluating layout. It gets its own pass, at real speed, on real hardware, or it doesn't get reviewed at all.

## Stage 6 — Accessibility Review (§11)

**Question:** does this work for everyone who needs it?

**Why here and not last:** late enough that the design is stable, early enough that fixes are still design changes rather than engineering patches. Accessibility reviewed after implementation produces workarounds; reviewed here it produces better designs.

**This stage is blocking. There is no "ship now, fix a11y later" path.** That path has never once been completed in the history of software.

## Stage 7 — Engineering Review (§12)

**Question:** can this be built well, maintained, and reused?

**Why last among the working stages:** engineering feasibility is a real constraint but a poor design input. Raised too early it truncates exploration; raised too late it produces designs that ship as compromised approximations. Here, it produces an informed trade: *this costs 3× and buys us X — is X worth it?*

## Stage 8 — Final Approval (§15)

Scoring, recommendation, and the written record of what we decided and why.

## Cross-cutting gates

**§8 AI Experience** attaches to Stage 1 and Stage 5, and is **blocking** for any surface where a model output reaches a user.
**§9 Trust** attaches to Stages 1, 4, and 8.
**§10 Marketing** replaces Stage 3 for marketing artifacts and attaches to Stage 8 for all others (does the surface say what we say we say?).
**§13 Scalability** and **§14 Smells** are lenses applied at every stage, not stages themselves.

## Process rules

**Stages can be compressed, not skipped.** A small change might complete stages 1–3 in a single ten-minute conversation. That is compression. Declaring "this doesn't need a concept review" is a skip, and skips are where the drift enters.

**A stage can send work backwards.** Discovering at Visual review that the structure is wrong sends it to IA. This is a success of the process, not a failure — though repeated backward sends indicate the earlier stage isn't doing its job.

**Every stage produces a written record.** Not for bureaucracy: for the future contributor who wants to know why something is the way it is. Undocumented decisions get re-litigated every eighteen months, forever.

**Governance for these stages is defined separately.** Who owns each stage and who may block: **§16**. What a reviewer must produce to support a verdict: **§17**. How disagreements resolve: **§18**. Those three sections are what make the stages above binding rather than advisory.

---

# 3. Product Principles Review

**Stage 1. The most valuable and most-skipped review in this document.**

## What this stage is protecting against

The accumulation of features that are individually justified and collectively incoherent. Every product that became bloated got there one reasonable request at a time. The only defense is a stage whose explicit purpose is to reject reasonable requests.

## The checkpoints

### 3.1 What decision does this improve, and how?

**Why this is question one:** the Bible's Chapter 1 makes decision confidence the product's entire reason for existing. A feature that does not touch a decision is, by definition, off-mission — however much someone wants it.

**Answer required:** name the decision. Name the person making it. Name what they know before and after.

> **Good:** "A hiring manager deciding whether to run a fourth interview. Before: they have three scorecards with conflicting readings and no way to tell which disagreement matters. After: they see the specific dimension where the panel diverged and what evidence supports each side."
>
> **Bad:** "Improves the candidate review experience." No decision named. This answer is compatible with literally any feature, which is what makes it useless.

**Common mistake:** answering with a user request rather than a decision. "Three customers asked for bulk tagging" is evidence of demand, not evidence of value. The follow-up question is always *what were they trying to decide, and is tagging the best way to help them decide it?*

### 3.2 Does this increase decision confidence, or only decision speed?

**Why it matters:** speed and confidence usually correlate, but where they conflict, confidence wins (Bible, Ch. 1 & 5.1). A feature that helps someone decide faster with the same evidence has made them more efficient at being uncertain — which, in hiring, means more confident wrong answers.

> **Good:** a comparison view that surfaces where two candidates' evidence actually differs, reducing a 20-minute manual comparison to 3 minutes *and* making the basis of the difference explicit.
>
> **Bad:** a one-click "auto-advance top 5." Faster, and it removes the reasoning step entirely. This is the shape of feature that demos best and damages the product's core claim most.

**The trade-off, stated honestly:** speed features win deals. Confidence features win renewals. When you must ship a speed feature, ship it with its evidence visible — that is the compromise, not abandoning the principle.

### 3.3 Does this reduce cognitive load, or relocate it?

**Why:** relocation is the most common disguised failure. A "simplified" screen that pushes complexity into a settings panel, an onboarding flow, or the user's memory has not reduced load; it has moved it somewhere the reviewer isn't looking.

**Test:** trace the total work required to complete the job, including configuration, learning, and recovery. If total work went up while screen density went down, the change is a regression sold as a simplification.

> **Bad, and very common:** replacing a dense but scannable table with a series of cards. The screen looks calmer. The user now scrolls four times to see what they used to see at once, and can no longer compare rows. This is Bible 5.4 — density as respect — violated in the name of cleanliness.

### 3.4 Could this be solved by removing something instead?

**Why:** removal is under-considered because it is unrewarded. Nobody gets credit for the feature that didn't ship. This checkpoint exists to force the consideration that organizational incentives suppress.

**Required:** name the subtractive alternative that was considered and why it was rejected. "None was considered" sends the item back.

### 3.5 What does this make worse?

**Why:** every addition has a cost — screen space, a concept the user must learn, a code path, a support case, a thing that can be wrong. An author who cannot name the cost has not understood the change. This is not a rhetorical trap; it is the single best predictor of whether a proposal has been thought through.

**Reviewer note:** treat "nothing" as a failed answer, not a good one.

### 3.6 Does this align with the Bible, and where specifically?

**Why:** forces the connection to be traced rather than assumed. Cite a chapter. If nothing applies, that's a signal: either the item is off-mission or the Bible has a gap worth naming.

### 3.7 Does this keep the human as the decider?

**Why:** Bible Ch. 2 differentiator 4 and Ch. 14. The moment Hirevo decides rather than informs, we have taken on liability we cannot carry, made a claim we cannot support, and become the thing the market is right to distrust.

**Test:** can a recruiter reach the opposite conclusion from the system's, easily, without friction, and without the product treating them as having made an error? If disagreeing is harder than agreeing, we have built a decision-maker with a consent flow.

### 3.8 What happens if we don't build this?

**Why last:** it reframes everything above. Often the honest answer is "nothing much, for another two quarters" — and that is a legitimate reason to defer, which frees capacity for something where the answer is worse.

## Stage 1 exit criteria

Proceed only when: the decision is named, confidence (not just speed) is improved, total cognitive load is flat or down, subtraction was genuinely considered, costs are named, a Bible chapter is cited, and the human remains the decider.

---

# 4. Information Architecture Review

**Stage 3. The stage that determines whether the product still makes sense in three years.**

## What this stage is protecting against

Structural entropy. IA failures are uniquely damaging because they are the most expensive class of problem to fix later — a visual mistake is a restyle, an IA mistake is a migration with URL changes, retraining, and support load. **IA debt compounds; visual debt does not.**

## The checkpoints

### 4.1 Does this fit a mental model the user already has?

**Why:** users arrive with a model of hiring — roles, candidates, stages, interviews, decisions. Every place our structure contradicts that model is a place they must maintain a translation layer, and translation layers are where errors and abandonment happen.

**Test:** can a recruiter who has never seen this predict where a thing lives before looking?

> **Good:** interview feedback lives on the candidate, because that is where the user thinks it lives.
> **Bad:** interview feedback lives in an "Interviews" section because that's how the data model is shaped. Structuring the UI around the schema is the most common IA error made by engineering-led teams, and it is invisible to the people who made it.

### 4.2 Is there exactly one place this belongs?

**Why:** two homes for one concept is the beginning of divergence. They drift in behavior, then in data, then in meaning, and by the time anyone notices, both have users.

**Permitted:** the same content surfaced in multiple contexts through one canonical source. **Not permitted:** two implementations of the same job.

### 4.3 Does this duplicate an existing workflow?

**Why:** duplication is how a product becomes unlearnable. Two ways to do a thing means every user must discover both, choose, and be wrong sometimes. It also doubles maintenance forever.

**Required:** if it duplicates, either unify or explicitly deprecate the old path with a removal date. **"We'll remove the old one later" without a date is a decision to keep both.**

> **Live example class:** legacy→V4 migration bridges. Every bridge is temporary duplication with a debt attached. A bridge without a written removal condition has become permanent architecture, and should be reviewed as such.

### 4.4 Is navigation depth justified?

**Why:** each level of depth costs discoverability, and things users cannot find do not exist. But flat structures with thirty peers are equally unusable. The failure is not depth or flatness — it's depth that doesn't correspond to how users actually chunk the work.

**Test:** does each level answer a question the user is actually asking, in the order they ask it?

### 4.5 Is progressive disclosure used correctly?

**Why:** Bible Ch. 7 — the resolution metaphor licenses overview-then-detail. But progressive disclosure is frequently misapplied as *hiding*, and the difference is whether the user knows something is there.

> **Correct:** a candidate summary with expandable evidence. The user knows depth exists and chooses to enter it.
> **Incorrect:** a critical filter buried behind a "More options" link because the toolbar looked busy. That's not disclosure, it's concealment, and the user's experience is that the feature doesn't exist.

**Test:** at every level, can the user tell what they're not seeing?

### 4.6 Does this screen need to exist?

**Why:** screens are the most expensive unit in a product — each needs navigation, empty states, loading states, errors, responsive behavior, permissions, and a place in the user's model. A screen that could be a panel should be a panel.

**Escalating test:** could this be a section of an existing screen? A panel? An inline expansion? A state? If yes at any level, justify the screen or don't build it.

### 4.7 Is the naming consistent and singular?

**Why:** the fastest way to make a product feel incoherent is to call one thing three names. If the UI says "role," the API says "job," and marketing says "opening," users learn all three and trust none.

**Required:** every noun in the artifact maps to a term in the product lexicon. New nouns require an explicit addition to it — which should be hard, because most new nouns are synonyms for existing ones.

### 4.8 Does this create legacy migration debt? **[GATE 5]**

**Why:** shipping alongside something old, with no plan to converge, is how you get two products. Every parallel path needs: who moves, when, what triggers removal, and who owns it.

## Stage 3 exit criteria

Fits an existing mental model; single canonical home; no unplanned duplication; depth justified; disclosure signals its own existence; the screen is necessary; naming matches the lexicon; migration debt is dated and owned.

---

# 5. UX Review

**Stage 2. Evaluates the work, not the interface.**

## What this stage is protecting against

Designs that are pleasant to look at and expensive to use. The gap opens because reviewers evaluate screens (which they see) rather than tasks (which they don't). This stage forces evaluation of the whole path, including the parts nobody screenshots.

## The checkpoints

### 5.1 Can the primary task be completed without instruction?

**Why:** documentation is a tax on every future user, and most never pay it — they guess, fail, and form an opinion about the product's quality.

**Test:** watch someone who knows recruiting but not our product. Where they hesitate, the design is unclear — regardless of how obvious it seems to the person who designed it. Designer certainty about clarity is worthless evidence; every confusing interface was clear to its author.

### 5.2 Is the number of steps minimal *and* honest?

**Why the second half:** step reduction is easy to game by combining unrelated decisions into one screen, which reduces the count and increases the effort. The metric to protect is **effort**, not clicks.

> **Good:** removing a confirmation step on a reversible action (Bible Ch. 13 — prefer undo).
> **Bad:** merging four unrelated settings into one dense modal to claim a one-step flow. Fewer steps, more cognitive load, worse.

### 5.3 How many decisions does this ask the user to make, and are they all necessary?

**Why:** decision fatigue is real and cumulative. Every choice we surface spends a limited resource, and by the tenth candidate on a Friday afternoon, that resource determines whether our product improves or degrades hiring quality. **We are, uniquely, a product whose value depends on the user's judgment being intact when they reach the important decision.** Spending it on layout preferences and export formats is not a neutral act.

**Test:** which decisions can be defaulted well? A good default is a decision made once, by us, with more information than the user has in the moment.

### 5.4 Does this force a context switch?

**Why:** context reconstruction is the hidden cost of most workflow design. Sending a user to another screen to retrieve one fact, then back, costs far more than the two clicks suggest — they return having lost the thread of what they were evaluating.

**Test:** does the user need information not present at the point of decision? If so, bring the information to the decision, not the user to the information.

### 5.5 Are errors prevented rather than reported?

**Why:** a validated error is a failure that was allowed to occur. The best error message is the one for a mistake we made impossible.

**Hierarchy, in order of preference:** make it impossible → make it obvious before commitment → make it reversible after → report it clearly. Most teams start at the fourth and stop.

### 5.6 Is recovery always available, and is destruction always deliberate?

**Why:** in our domain, some actions affect people's livelihoods. A misfired rejection is not a UX inconvenience.

**Rules:** reversible actions get undo, not confirmation. Irreversible actions get explicit confirmation naming the consequence. **Confirmations on safe actions are harmful** — they train reflexive dismissal, which disarms the confirmations that matter.

### 5.7 What do the empty, loading, partial, error, and permission-denied states look like?

**Why:** these are the majority of a user's early experience and they are systematically under-designed because they don't appear in the happy-path mockup that got approved.

**A submission without these states is incomplete and should be returned, not reviewed.** Empty states in particular are the highest-leverage surface in the product: seen at the moment of maximum intent and minimum information (Bible Ch. 12).

### 5.8 Does this behave consistently with the rest of the product?

**Why:** consistency is what converts learning one screen into learning the product. Every inconsistency resets that.

**Standard:** a novel pattern requires evidence that the existing pattern genuinely fails here, plus a plan to apply the new one everywhere it belongs. **A novel pattern used once is not innovation, it is an inconsistency with a good story.**

### 5.9 Does it work at real scale, with real data?

**Why:** designs are made with three tidy rows and meet three hundred messy ones. Long names, missing fields, twelve candidates at the same stage, a resume with no dates.

**Required:** the review must see realistic worst-case data. Reviewing against demo data is reviewing a different product.

## Stage 2 exit criteria

Task completable unaided; effort minimized honestly; unnecessary decisions defaulted; no avoidable context switching; errors prevented; recovery available; all states designed; patterns consistent; verified against realistic data.

---

# 6. Visual Design Review

**Stage 4. The surface is judged on whether it makes the structure legible — not on whether it is attractive.**

## What this stage is protecting against

Two opposite failures. **Decoration** — visual interest added to fill space or signal effort, which competes with content (Bible 5.3, 5.6). And **dilution** — the reflexive spreading-out of substantive content until a page of information becomes three screens of atmosphere (Bible 5.4).

The second is more common in teams that have read a design book, and it is more damaging, because it is easy to defend as taste.

## The checkpoints

### 6.1 Is there exactly one focal point per viewport?

**Why:** two competing focal points don't double attention; they produce a moment of arbitration in which the reader loses the thread (Bible Ch. 6).

**Test — the squint test:** blur until text is illegible. What draws the eye first? Is it the most important thing? If two things tie, the hierarchy has failed.

### 6.2 Does visual weight match actual importance?

**Why:** users extract priority from the scan before reading a word. When structure and content disagree about what matters, structure wins, and we've shipped a message we didn't write.

**Common failure:** a section heading styled at hero scale because the section felt underweight visually. That has told the reader this section is as important as the product's central claim. It isn't.

### 6.3 Is spacing grouping things correctly?

**Why:** proximity is the strongest grouping signal available, stronger than borders or color, and it operates pre-attentively.

**Rule (Bible Ch. 6 & 9):** the gap between groups exceeds every gap within a group. Uniform padding everywhere flattens structure and forces users to do grouping work we should have done.

> **Bad, extremely common:** a heading with equal space above and below. It now belongs to neither the section above nor the one below, and the page reads as a stack of unrelated blocks.

### 6.4 Is the type system minimal and is hierarchy obvious?

**Why:** too many styles produces the double failure of nothing standing out and nothing feeling intentional (Bible Ch. 9).

**Test:** count distinct type styles. More than about six on a surface needs justification. Two levels distinguishable only by a small size delta are not distinguished — collapse them or separate them properly.

### 6.5 Is line length within a comfortable measure?

**Why:** the most under-attended variable in web typography, and one of the largest determinants of whether long-form content is actually read.

**Consequence:** full-width body text on wide screens is a defect, however architectural it looks.

### 6.6 Is density appropriate to the content's job?

**Why:** Bible 5.4. Emotional passages run sparse; evidentiary passages run dense. Uniform density means one of the two is wrong.

**Specific rule for product screenshots in any context:** they are shown at real density with real data. A simplified mockup communicates "toy" and, worse, sets an expectation the actual product will violate on first login (Bible 5.7).

### 6.7 Does every element earn its place?

**Why:** Bible 5.3. Additive design is the default failure mode of collaborative work, and its cost is invisible per-item and severe in aggregate.

**Test:** for each element — what breaks if it's removed? "Nothing" means remove it. Apply hardest to: decorative dividers, icons that repeat their adjacent label, badges, and the third example in any set of three.

### 6.8 Is depth semantic?

**Why:** elevation answers "what is on top of what, and why" (Bible Ch. 6). Used decoratively, it stops answering that, and the user loses a reliable signal.

**Rules:** three elevation levels — ground, raised, overlay. A shadow you consciously notice is too strong. Cards are grouped, not elevated. A fourth level means a structural problem being papered over.

### 6.9 Is translucency justified?

**Why:** permitted only when the layered content is meant to be seen through — a sticky header over scrolling content, essentially. Everything else costs legibility and performance to buy a texture that will date (Bible Ch. 6).

**Reviewer note:** glass signals *floating, ephemeral, ungrounded*. Our brand is *grounded, evidenced, solid*. Decorative glass is borrowing a competitor's signal at the cost of our own.

### 6.10 Is color carrying meaning only?

**Why:** Bible Ch. 8. A color used decoratively anywhere weakens it everywhere, because the user can no longer tell whether a colored element is significant or merely styled. In a product where color may indicate confidence, that ambiguity is a functional failure.

**Checks:** the action accent appears once per view, on the action. Every color-carried meaning is also carried by shape, label, position, or weight. The surface survives grayscale — test it, because our screenshots will be printed, projected, and pasted into decks.

### 6.11 Is alignment disciplined?

**Why:** misalignment is perceived as carelessness before it is identified as misalignment. It is one of the few things that reliably makes users doubt a product's rigor, which for us is the attribute we're selling.

### 6.12 Does it hold up in both themes, at multiple viewports, and at 200% zoom?

**Why:** we build both themes to the same standard (Bible Ch. 8). A design verified in one is verified for some users.

### 6.13 [AGENT] Is this the generic solution or the right one?

**Why this exists:** generative tools converge on the most-represented pattern in their training data — three-column feature grids, icon-heading-paragraph cards, hero-with-gradient. These are statistically likely and, by Bible 5.6, exactly what we've chosen not to be.

**Test:** could this layout be dropped onto any B2B SaaS site with only a copy swap? If yes, it expresses nothing about Hirevo and should be rejected regardless of execution quality.

## Stage 4 exit criteria

Single focal point; weight matches importance; grouping correct; type minimal; measure controlled; density appropriate; every element justified; depth semantic; translucency justified or absent; color semantic and grayscale-safe; alignment clean; both themes and zoom verified; not generic.

---

# 7. Motion Review

**Stage 5. Reviewed separately, at real speed, on real hardware.**

## What this stage is protecting against

Motion is the easiest thing to add and the hardest to evaluate. It's invisible in static review, delightful on first exposure, and irritating by the twentieth — which means it is systematically over-approved by reviewers who see it twice.

**Therefore the governing question for every animation is: how does this feel on the two-hundredth viewing?** Not the first.

## The checkpoints

### 7.1 What would the user misunderstand without this?

**Why:** motion explains or it goes (Bible Ch. 10). If nothing is misunderstood without it, it's decoration, and decoration in motion costs attention every single time.

**"It feels better with it" is not an answer.** It feels better to you, on your fifth viewing, having built it.

### 7.2 Is it fast enough to be unnoticed?

**Why:** motion should register as responsiveness, not as an event you watched. If a reviewer can describe the animation, it is too long.

**Reviewer discipline:** judge at 1× on the slowest hardware we support. Motion tuned on a fast machine ships as sluggish everywhere else.

### 7.3 Does it end?

**Why:** nothing loops, pulses, or breathes (Bible Ch. 10). A continuously animating element in a decision tool is an interruption on a timer, and it will still be interrupting in six months.

**Only exception:** an honest indeterminate progress indicator, which ends when the operation does.

### 7.4 Does it decelerate into place?

**Why:** things arrive and settle. Bounce and overshoot imply playfulness and physical exuberance; we are an instrument (Bible Ch. 7).

### 7.5 Is it spatially honest?

**Why:** something that opens from a point returns to it. Direction encodes relationship. Motion contradicting the layout's spatial logic makes the interface feel arbitrary, which erodes the sense of a system behaving predictably.

### 7.6 Is it interruptible?

**Why:** a user who acts during an animation must be obeyed immediately. Motion that blocks or queues input makes the product feel slow *and* unresponsive — the worst combination, and it's always the animation's fault, never the system's.

**Test:** click through the animation. Click twice. Navigate away mid-transition.

### 7.7 Does it delay content?

**Why:** anything making a reader wait to read is a net negative regardless of appearance. Staggered scroll reveals across a whole page are prohibited (Bible Ch. 10); one subtle section entrance, once or twice on a long page, is the ceiling.

### 7.8 Is it honest about the system's state? **[GATE 4]**

**Why — and this is the most important checkpoint in the section:** we do not fake progress, and **we do not add artificial delay to make AI feel more thoughtful.** This pattern is spreading in our category. It is a lie the interface tells about the product, and our entire positioning is that our outputs are honest. A user who discovers it has correctly concluded that our confidence displays might also be theatre.

**This is a blocking, non-negotiable check.**

### 7.9 Does `prefers-reduced-motion` preserve meaning?

**Why:** the correct implementation removes movement while preserving the information the motion carried — cross-fade instead of transition, instant change instead of animated. Disabling the animation and leaving a discontinuity is a worse experience, not an accessible one.

**Test:** with all motion removed, is the interface still comprehensible? If not, the motion was carrying meaning the layout should carry. Fix the layout.

### 7.10 Does it perform?

**Why:** janky motion is worse than no motion, and it disproportionately hits lower-end devices — a population that overlaps with the users least able to work around it.

## Stage 5 exit criteria

Every animation explains something; imperceptibly fast; ends; decelerates; spatially honest; interruptible; doesn't delay content; honest about system state; reduced-motion preserves meaning; performs on target hardware.

---

# 8. AI Experience Review **[GATE 2 — all 16 checkpoints]**

**Blocking for any surface where model output reaches a user. Attaches to Stages 1 and 5.**

## Why this section has its own gate

This is where our differentiation lives and where our liability lives, and they are the same surface. Bible Ch. 2 stakes the company on evidence over verdicts and calibrated confidence. Every one of those claims is either honored or broken at the pixel level, in this section.

A single screen that presents a confident-looking score with no provenance has, on its own, converted us into the category we said we weren't.

## The checkpoints

### 8.1 Is every output traceable to its source?

**Why:** Bible Ch. 2, differentiator 1 and Ch. 14. Traceability is the architecture, not a feature. An untraceable output asks the user to trust the model, which is precisely the ask we've built the product to avoid making.

**Required:** the path from conclusion to evidence is reachable in the interface, from the conclusion, in one step. Not in an export. Not in a tooltip that summarizes. **The actual source.**

> **Good:** a skill assessment where each claimed capability links to the sentence in the resume or the answer in the interview that produced it.
> **Bad:** "Strong Python experience — based on resume analysis." That's an assertion with a citation-shaped decoration attached.

### 8.2 Is confidence visible, and is the system willing to be unsure?

**Why:** Bible Ch. 2, differentiator 2. Calibration is our strongest trust signal precisely because it is expensive to make. A system that is always confident is either lying or not measuring, and experienced recruiters test for this in the first five minutes.

**Required:** confidence is displayed alongside the output, and low-confidence states exist and are reachable in normal use.

**Reviewer test:** ask the author to show you the low-confidence rendering. If it doesn't exist, or was never designed, the feature is not complete — it's the happy path with a claim attached.

### 8.3 When confidence is low, does it say what would raise it?

**Why:** this is the sentence that most distinguishes us from everything on the market (Bible Ch. 12). "Limited evidence — no technical interview on file" is *actionable*; a low score with no explanation is just a worse score.

### 8.4 Can the user disagree, easily, without penalty?

**Why:** Bible Ch. 2, differentiator 4 and §3.7. If disagreeing costs more friction than agreeing, we have built a decision-maker with a consent flow, whatever the marketing says.

**Checks:** override is available at the point of decision, not buried. Overriding does not trigger a warning treating the human as mistaken. The override persists and is respected downstream. The system does not silently re-assert its view later.

### 8.5 Does the interface distinguish what the model produced from what a human recorded?

**Why:** users must always know whose statement they're reading. Blending model-generated text with human notes into one undifferentiated view destroys the user's ability to weight evidence — and quietly launders model output into the historical record, where six months later nobody can tell what was inferred and what was observed.

### 8.6 Does the language stay within our claim boundaries?

**Why:** Bible Ch. 2, "what we will not claim." The interface makes claims more forcefully than marketing does, because it makes them in context and at the moment of decision.

**Prohibited in-product:** predicting job performance; ranking candidates as better people rather than better-evidenced against a stated bar; any assessment referencing protected characteristics; language implying the system knows who is good in the abstract.

**Test:** read every model-facing string as though it were being quoted in a discrimination complaint. This is not a hypothetical framing.

### 8.7 Are failure and refusal states designed?

**Why:** the model will produce nothing, produce garbage, or decline. If those paths are undesigned, the user's first experience of our limits is a broken screen — which is the worst possible context in which to learn that we have limits.

**Required:** a designed state for insufficient evidence, unavailable service, and out-of-scope requests. Each says what happened, why, and what the user can do.

### 8.8 Would this still make sense if the model got noticeably better or worse?

**Why:** models change under us. An interface whose usefulness depends on a specific quality level is a maintenance liability. Interfaces built around *evidence and confidence* degrade gracefully; interfaces built around *authoritative verdicts* fail catastrophically when the verdict is wrong.

### 8.9 [AGENT] Does the surface market the model?

**Why:** Bible Ch. 1 — AI is our supply chain, not our product. Vendor names, model versions, and "AI-powered" labels in the interface tell the user to evaluate our supplier rather than our reasoning.

**Prohibited:** model vendor names as quality signals; "AI" as a label where a verb would do; sparkle iconography as a category marker.

### 8.10 Is the confidence signal calibrated, or merely displayed?

**Why:** displaying confidence and *having* confidence are different achievements, and only one of them is a product. A number derived from output length, token probability, or a fixed heuristic is a decoration in the exact place we promise honesty (§14 F7).

Calibration has a specific meaning and we should hold ourselves to it: **of the assessments we label high-confidence, the share that prove correct should approximate the label.** A system that says 90% and is right 60% of the time is not conservative or aggressive — it is uncalibrated, and every downstream decision built on it is mis-weighted.

**Required of the author:** name what produces the number, and name the evidence that it tracks reality. "The model returns it" is not an answer; models are known to be poorly calibrated on their own certainty.

**Where calibration cannot yet be validated,** the honest design is an *evidence-sufficiency* signal rather than a confidence one — "based on 2 of 5 expected signals" is defensible without validation, because it describes inputs rather than claiming accuracy. Prefer this to a fabricated percentage. It is also better product: it tells the user what to do about it.

### 8.11 How is confidence visualized, and does the visualization imply the right thing?

**Why:** this is the most consequential visual decision in the product, and it has a specific trap. Confidence is an axis of *certainty*, and almost every available visual vocabulary — color scales, progress bars, star ratings, percentage badges — reads as an axis of *quality*. A candidate shown with a red confidence indicator will be read as a bad candidate, not as a candidate we know little about. **The user's misreading is not their error; it is our design defect.**

**Design constraints that follow (Bible Ch. 8, tier 3):**

- Confidence is expressed primarily through **intensity, weight, or explicitness** — not hue — so it cannot collide with the state colors that do mean good and bad.
- The visual treatment must never place high-confidence-negative and low-confidence in the same visual bucket. "We are sure this person doesn't meet the bar" and "we don't know" are opposite epistemic states and must be visually opposite.
- Confidence appears **adjacent to the claim it qualifies**, never aggregated into a single screen-level score. A page-level "87% confident" tells the user nothing about which parts to trust.
- Precision in the display must match precision in the underlying signal. Rendering "73%" when the system distinguishes three tiers is a false claim expressed as a number. **If we have three tiers, show three tiers, in words.**

**Reviewer test:** show the low-confidence rendering to someone unfamiliar with the product and ask what it says about the candidate. If they say "weak candidate" rather than "not enough information," the visualization has failed regardless of the label attached to it.

### 8.12 Is the explanation causal, or a restatement?

**Why:** most "explainable AI" in shipped products explains nothing. It restates the conclusion in longer form, lists the inputs that were available, or narrates the process generically. None of these tell a user *why this conclusion rather than another*, which is the only question explanation exists to answer.

**The three grades, and only one is acceptable:**

> **Restatement (unacceptable):** "Ranked highly due to strong relevant experience." Says what the conclusion was, again.
> **Input listing (unacceptable):** "Based on resume, interview feedback, and screening notes." Names the ingredients, not the reasoning.
> **Causal (acceptable):** "Ranked above the other finalists on the systems-design dimension — the take-home showed distributed-systems ownership, which the other three addressed only in general terms." Names the dimension, the differentiating evidence, and the comparison.

**The counterfactual test — the strongest available:** does the explanation let the user predict what would change the conclusion? If a recruiter cannot tell from our explanation what a candidate would have needed to be assessed differently, we have not explained; we have narrated.

**Proportionality:** explanation depth scales with consequence (Bible Ch. 3). A routine, easily-reversed suggestion needs a line. A recommendation that shapes a hiring decision needs the full causal chain, and the user must not have to ask for it twice.

### 8.13 What happens when the model is confidently wrong?

**Why:** this is the failure mode that defines the category's risk, and designing only for "the model doesn't know" misses it entirely. The dangerous output is not the uncertain one — users treat that appropriately. It is the fluent, well-formed, high-confidence assertion that is false: a skill inferred from a word that appeared in a different context, a date misread, an employer confused with a similarly-named one, a claim attributed to the wrong candidate in a batch.

**Why the interface must carry this and not the model:** we cannot eliminate it upstream. Our defense is architectural, and it is the reason Bible Ch. 2 leads with evidence rather than accuracy — **a traceable wrong answer is a recoverable wrong answer.** A user who can see the source sentence catches the error in two seconds. A user given a verdict cannot catch it at all.

**Required of every AI surface:**

- **Verifiability at the point of consequence.** The higher the stakes of a claim, the closer its evidence must sit. Evidence one click away from a low-stakes summary is fine; evidence one click away from the assertion driving a rejection is not.
- **Extraction is visibly distinguished from inference.** "Worked at X, 2019–2022" (read from the document) and "likely has team leadership experience" (inferred) are different kinds of statement carrying different error profiles, and the interface must not present them identically.
- **A reporting path.** Users must be able to mark an output as wrong, in one action, at the point they notice it — and that signal must reach us. A product that cannot hear about its errors cannot improve, and its users learn that telling us is pointless.
- **Correction propagates.** A corrected fact must not reappear elsewhere in the product in its original form. Users lose faith faster from a correction that didn't stick than from the original error.

**Reviewer test:** inject a plausible-but-wrong output into the surface. How long until a competent user notices? If the answer is "they wouldn't," the surface fails this checkpoint regardless of how accurate the model currently is — because model behavior changes and the interface is what's left.

### 8.14 Does the override capture the human's reasoning?

**Why:** §8.4 establishes that overriding must be easy. This checkpoint asks for more: an override is the single most valuable signal in the product, and most systems discard it. The recruiter who disagrees knows something we don't — about the role, the team, the market, or the candidate. Capturing *that* is what turns a tool into a system that improves.

**The design tension, stated honestly:** we want the reasoning, and demanding it makes overriding expensive, which violates §8.4 and pushes users toward passive acceptance. **§8.4 wins.** Reasoning capture must be optional, offered at the moment of override, and never blocking.

**What follows:** the prompt is specific rather than generic — "what did we miss?" invites an answer where an empty comment box does not. And the reasoning, once captured, must appear in the decision record (Bible Ch. 2, differentiator 3), because a disagreement without its reason is as unusable six months later as a decision without its reason.

**Anti-pattern:** treating the override as an error report and asking the user to justify themselves. The system was wrong; the human is not filing an exception.

### 8.15 Does failure communication distinguish between kinds of failure?

**Why:** §8.7 requires that failure states exist. This requires that they be *honest about which failure occurred*, because the user's correct response differs entirely and a generic message forces them to guess.

**The kinds, each needing its own state:**

| Failure | What the user needs to know | Correct response |
|---|---|---|
| **Insufficient evidence** | We could run, but the inputs don't support a conclusion | What to add — this is a product success, not an error |
| **Service unavailable** | Nothing is wrong with the data; try later | Whether work is queued or lost |
| **Out of scope** | We won't assess this, by design | Which boundary applies and why |
| **Low quality input** | The document was unreadable or malformed | Which file, and what to do |
| **Partial completion** | Some outputs succeeded, some didn't | Exactly which are missing — never a silent partial |

**Why "insufficient evidence" is the most important row:** it is not a failure at all. It is the product working correctly and saying so, and it is the state that most distinguishes us (Bible Ch. 2, differentiator 2). Rendering it in an error treatment — red, apologetic, alarming — converts our strongest trust signal into a bug report. It should read as an informative, composed statement with an obvious next step.

**Prohibited:** "Something went wrong" when we know what went wrong. Apologetic tone on a system that behaved correctly. Silent partial results.

### 8.16 Does the surface build *calibrated* trust rather than maximum trust?

**Why:** the goal is not that users trust Hirevo as much as possible. It is that users trust it **exactly as much as it merits, in each specific instance** — and this reframing changes design decisions.

Two failure directions, and the industry only guards against one:

- **Over-trust** — the user accepts outputs without examination. Produced by confident presentation, hidden provenance, and frictionless acceptance. Its cost is invisible to us and lands on candidates, and it converts our product from a decision aid into an unaccountable decision-maker.
- **Under-trust** — the user ignores outputs and works around the product. Produced by unexplained errors, uncalibrated confidence, and explanations that don't explain. Its cost is visible to us as churn, which is why it receives all the attention.

**The asymmetry that should govern our defaults:** under-trust costs us revenue; over-trust costs someone else their career. **When designing under uncertainty, err toward under-trust.** This is one of the few places in this document where we deliberately accept a commercial cost, and it is stated here so that nobody has to re-derive it under pressure.

**Reviewer test:** does the surface make examination *easy* or merely *possible*? A product designed for calibrated trust makes checking the evidence the natural next gesture rather than an available one.

## Gate criteria

**All sixteen are blocking.** No AI-facing surface ships with any of them unmet. This is the one section of this document with no proportionality clause.

**Reviewing this section requires the artifact running, not depicted.** Checkpoints 8.10 through 8.16 cannot be assessed from a static mockup — calibration, hallucination handling, override cost, and failure differentiation are all behavioral. A static submission for an AI surface is not reviewable at this stage; see §17 for the evidence required.

---

# 9. Trust Review

**Attaches to Stages 1, 4, and 8.**

## What this stage is protecting against

The slow accumulation of small credibility withdrawals. Trust is not lost in one event; it is lost through a series of moments where the product was slightly less forthcoming than it could have been, until the user's model of us shifts from "careful" to "selling."

## The checkpoints

### 9.1 Does this state a limitation it could have omitted?

**Why:** Bible Ch. 14's engine — the strongest trust signals are the ones that cost us something. Anyone can claim accuracy; only a company confident in its product will show where it was uncertain.

**Applied to review:** when evaluating trust content, look for what we voluntarily gave up. If nothing, the content is marketing wearing a trust costume, and sophisticated readers detect this instantly.

### 9.2 Can the reader defend us to someone else without us present?

**Why:** the actual test of trust content (Bible Ch. 14). Our champion will be in a security review, a legal review, and a skeptical team meeting, alone, with only what they remember.

**Test:** could a non-technical recruiting leader repeat our data-handling story accurately after one read? If it requires our slide deck, it fails.

### 9.3 Is it specific?

**Why:** "enterprise-grade security" is a phrase that means the author didn't want to commit to anything. Name the standard, the region, the retention period, the access model.

### 9.4 Is trust content in the flow, or exiled to a footer?

**Why:** the reader's objection arrives at a specific moment; the answer must arrive there too. Relegation signals we consider it a formality — which is itself information about how seriously we take it.

### 9.5 Is the tone free of defensiveness?

**Why:** any hint that we find a hard question annoying confirms the suspicion behind it. Answer as though the question were reasonable, because it is.

### 9.6 Is the candidate treated as a stakeholder?

**Why:** Bible Ch. 14. The person being evaluated is a party to the decision though they never see our interface.

**Prohibited language, in product and marketing:** filtering out, weeding, culling, and any framing of people as volume to be reduced. This is partly ethics and partly commercial — the recruiters who will love this product are the ones who dislike how current tools talk.

### 9.7 Is social proof positioned after substance?

**Why:** proof placed before we've said anything worth believing makes the argument "believe us because others do," which is what a product makes when it can't make its own case. The strongest testimonial describes a specific decision that went differently; the weakest praises the interface.

### 9.8 Are all claims sourced?

**Why:** one unsourced statistic contaminates every sourced one. Cut it. The discipline of cutting is itself visible to readers, and it is a differentiator.

---

# 10. Marketing Review

**Replaces Stage 3 for marketing artifacts; attaches to Stage 8 for everything else.**

## What this stage is protecting against

Regression to the category mean. Marketing surfaces face constant pressure — from campaigns, from competitors, from conversion optimization — toward the exact language and layout the Bible rejects. Each individual regression is small and defensible on performance grounds. Collectively they undo the positioning.

## The checkpoints

### 10.1 What is the single thesis of this page?

**Why:** pages argue; they don't inventory (Bible Ch. 11). If the thesis can't be stated in one sentence, the page isn't ready to be designed.

**Test:** read the section headings in order, nothing else. Do they form an argument? If they form a list of nouns — Features, Benefits, Integrations — the page has no thesis and will not persuade.

### 10.2 Is the emotional sequence correct?

**Why:** Recognition → Relief → Comprehension → Confidence → Resolve (Bible Ch. 4). The order is a mechanism, not a preference. The dominant failure is running CTA-energy in the hero position — selling to a reader who hasn't yet recognized themselves.

**Per-movement checks:**
- **Recognition:** is the hero legible in one fixation? One claim, no competing focal points, nothing moving?
- **Relief:** does the section after the hero *demonstrate*? A feature grid at position two says we haven't decided what matters.
- **Comprehension:** does one capability go deep, rather than nine going shallow? Could the reader explain the product to a colleague afterwards? That's the real bar.
- **Confidence:** are objections voiced before the reader raises them?
- **Resolve:** one primary action, labelled by what happens, not what we want?

### 10.3 Is it specific enough to be unfamiliar?

**Why:** generic writing fails structurally, not stylistically — the reader has already read it, and the brain skips familiar patterns (Bible Ch. 11). Specificity is unfamiliar by definition, so it gets read.

> **Reject:** "Streamline your hiring process with AI-powered insights."
> **Accept:** "You have four finalists, two conflicting interview reports, and a hiring manager who wants an answer today."

**Reviewer test:** replace "Hirevo" with a competitor's name. If the sentence is still true, it says nothing about us.

### 10.4 Does it show before it claims?

**Why:** Bible 5.2. Our differentiators are all about verifiability; a page that *asserts* traceability while showing a stock illustration has contradicted itself in its own layout.

**Blocking:** abstract AI imagery of any kind — glowing orbs, neural meshes, particle fields, gradient brains. This is the visual language of companies with nothing to show.

### 10.5 Is the vocabulary clean?

**Why:** Bible Ch. 12's banned list exists because each term is either a claim the reader must grant us, a promise we can't keep, or category noise.

**Scan for:** revolutionary, game-changing, transform, seamless, effortless, magical, leverage, utilize, empower, unlock, cutting-edge, next-gen, AI-powered, simply, just, easy, robust, powerful, comprehensive, top talent, rockstar, 10x, supercharge, unleash, reimagine, "the future of hiring."

**Also check:** sentence case headings; no exclamation points anywhere; numerals for numbers; no emoji.

### 10.6 Are we selling clarity, not speed?

**Why:** Bible Ch. 1. Leading with speed invites a competitor to beat our number next quarter and implicitly concedes that volume is the point.

**Check:** is the first claim about decision quality? Speed may appear, second.

### 10.7 Are we within the claim boundaries? **[GATE 3]**

**Why:** Bible Ch. 2, "what we will not claim." These are legal and ethical limits, not stylistic ones.

**Blocking:** eliminating bias; predicting performance; replacing recruiters; unsourced time-saved or cost-per-hire numbers; model vendors as quality signals.

### 10.8 Are we willing to show an imperfect state?

**Why:** Bible 5.7 and Ch. 2, differentiator 2. A page showing only the happy path is making the competitor's claim, not ours.

**Strong signal to look for:** does any marketing surface show a low-confidence read? If none does, our most distinctive claim is being made only in words.

### 10.9 Does the CTA reduce the cost of the next step?

**Why:** enterprise readers convert on resolve, not excitement — they still have to convince three colleagues on Monday (Bible Ch. 4).

**Prohibited:** manufactured urgency, countdowns, exit-intent modals. These convert a few people and permanently cost the seriousness the rest of the page built.

### 10.10 Does this page sound like the same company as every other surface?

**Why:** one voice across error states, sales email, docs, and homepage. Inconsistency is how a brand tells you it was assembled by committee.

---

# 11. Accessibility Review **[GATE 1]**

**Stage 6. Blocking. No deferral path.**

## Why this is not a compliance section

Two reasons, and the second is the one that changes behavior.

First: our users work at volume, for hours, often under time pressure, on whatever hardware their company issued. The conditions that accessibility work addresses — fatigue, low contrast environments, keyboard-only work, motion sensitivity — are not edge conditions in our audience. They are Tuesday afternoon.

Second: **accessibility failures are almost always hierarchy failures wearing a different hat.** An interface with a coherent structure, honest semantics, and real focus management is easier to make accessible because it was already clearer. When this section is hard to pass, the usual cause is not missing ARIA — it's that the structure was never resolved and markup is being asked to describe something incoherent.

## The checkpoints

### 11.1 Is everything operable by keyboard?

**Why:** beyond the accessibility requirement, our specific audience lives on the keyboard when working at volume. Keyboard support is one of the few things that distinguishes tools built by people who use them from tools built by people who demo them.

**Test:** complete the entire primary task without touching the pointer. Every interactive element reachable, activatable, and escapable.

### 11.2 Is focus order logical and focus visible?

**Why:** focus order is the structure, experienced serially. An illogical order usually means the DOM and the visual layout disagree — which is a design problem surfacing as an accessibility problem.

**Standard:** the focus indicator must be genuinely visible to a person, not merely present enough to satisfy a specification.

### 11.3 Is focus managed across state changes?

**Why:** the most common serious keyboard failure. A dialog opens and focus stays behind it; it closes and focus is lost to the document root, stranding the user.

**Required:** focus moves into new contexts, is trapped where appropriate, and returns to its origin on dismissal.

### 11.4 Does the structure make sense without visual layout?

**Why:** the screen-reader experience is the document's semantic structure read aloud. It is also a rigorous test of whether the hierarchy is real or merely visual.

**Test:** read the heading outline alone. Does it describe the page correctly? If the outline is incoherent, the page's structure is incoherent and sighted users are compensating with visual cues.

### 11.5 Is meaning ever carried by color alone?

**Why:** Bible Ch. 8. Also a robustness requirement — our surfaces get printed, projected, and screenshotted in grayscale.

### 11.6 Does contrast support comfortable extended reading?

**Why:** meeting the minimum is the entry condition, not the achievement. The real test is comfort at hour three.

**Don't forget:** borders, disabled states, placeholder text, focus indicators, and chart elements. These fail most often because they're evaluated as decoration.

### 11.7 Is `prefers-reduced-motion` honored with meaning preserved?

See §7.9. Vestibular sensitivity is common and invisible — you will never get the complaint, only the bounce.

### 11.8 Does it work at 200% zoom and at narrow viewports?

**Why:** zoom is the most-used accessibility feature in existence, and it's usually tested last or not at all. Content must reflow without horizontal scrolling or loss of function.

### 11.9 Are touch targets adequate and are hover-only affordances absent?

**Why:** information that exists only on hover doesn't exist on touch, and doesn't exist for keyboard users. Hover reveals affordance, never content (Bible Ch. 13).

### 11.10 Are form controls properly labelled and errors properly associated?

**Why:** a visually-adjacent label is not a label. An error message that isn't programmatically associated is invisible to the user who most needs it.

---

# 12. Engineering Review

**Stage 7. Evaluates buildability and the debt being created — not whether the design is convenient to implement.**

## Why this is last among the working stages

Feasibility is a real constraint and a poor design input. Raised too early it truncates exploration before the problem is understood; raised too late it forces shipping a compromised approximation. Here it produces the right conversation: *this costs 3× and buys X — is X worth it?*

**A design is never rejected at this stage for being hard.** It is flagged, costed, and traded. The trade is a product decision, not an engineering one.

## The checkpoints

### 12.1 Does this reuse existing components, and if not, why?

**Why:** every one-off is permanent maintenance and a permanent inconsistency. The design system is not a constraint on creativity; it's the mechanism by which the product feels like one product.

**Standard:** a new component requires evidence that no existing one fits, plus a commitment to generalize it. **A new component built for one screen is design debt with a delivery date attached.**

### 12.2 Does it comply with design tokens?

**Why:** hard-coded values are how theming, density, and rebrand work become impossible. A single hard-coded color is trivial; four hundred are a rewrite.

**Standard:** no raw values for color, spacing, type, radius, elevation, or duration. If a needed value doesn't exist as a token, **the correct response is to add the token, not to hard-code the value** — the design system serves the design, and a token gap is a system gap to be fixed, never a mismatch to be tolerated as an "intentional deviation."

### 12.3 Is the complexity proportional to the value?

**Why:** complexity is paid forever by everyone who touches the code afterwards, including us. A feature worth 3 points of value and 10 points of permanent complexity is a bad trade even when the feature is good.

### 12.4 Does it perform under realistic conditions?

**Why:** performance is a design property, not an optimization phase. Users don't distinguish "slow" from "bad."

**Check:** realistic data volumes, realistic network, target hardware. Layout shift on load is a first-second quality destroyer and is treated as a defect, not a nit.

### 12.5 Is it maintainable by someone who wasn't here?

**Why:** the person maintaining this has no context and will not find the Slack thread. Clarity in code is the same virtue as clarity in interface, applied to a different reader.

### 12.6 What technical debt does this create, and is it dated? **[GATE 5]**

**Why:** debt is acceptable; undeclared debt is not. Undeclared debt becomes architecture through nothing but the passage of time.

**Required:** name the debt, name the condition for removal, name the owner. "Temporary" without a date means permanent.

### 12.7 Does it degrade gracefully?

**Why:** slow networks, failed requests, missing data, expired sessions, denied permissions. A design that only works when everything works is a demo.

### 12.8 [AGENT] Was existing code understood before new code was written?

**Why:** the characteristic failure of generated implementations is re-solving a solved problem in a parallel style, because reading the codebase is harder than writing from scratch. This produces working code that makes the product worse — the exact profile of a change that passes tests and fails review.

**Test:** does the change match the surrounding code's conventions, naming, and structure? Does it use the existing utilities?

---

# 13. Future Scalability Review

**A lens applied at every stage, not a stage of its own.**

## Why it's a lens rather than a stage

Scalability failures are not detected by asking "does this scale?" at the end — everyone answers yes. They're detected by noticing, at the moment of a specific decision, that the decision only works at the current size.

## The checkpoints

### 13.1 Does this work at ten times the current scale?

**Why:** ten candidates, a hundred roles, a thousand users, three years of history. Designs made against today's data volumes fail quietly as customers grow — and the failure lands on our largest, most valuable accounts first.

### 13.2 Can the next three features fit without restructuring?

**Why:** name them. If the adjacent roadmap requires reworking this, do the rework now while nothing depends on it.

**Specific test:** does this pattern extend to interviewing, calibration, offers, and post-hire loops — the known directions of growth (Bible Ch. 15)?

### 13.3 Does this fragment the language?

**Why:** the strongest scalability failure mode we face. As the product grows, every new area will want its own identity, and each request will be locally reasonable.

**Rule (Bible Ch. 15):** new capabilities extend the existing language; they do not get their own. **Sub-brands are how design systems die.**

### 13.4 Does it survive internationalization?

**Why:** 30–40% text expansion, RTL layouts, different date and numeral conventions. Retrofitting is a rebuild. Layouts built on structure rather than composition survive translation; ones tuned to specific string lengths don't.

### 13.5 Will this look deliberate in five years?

**Why:** not "will it be fashionable" — will someone be able to see why we chose it? Trend-forward choices have a half-life of about eighteen months and cost more to rebuild than the attention they bought (Bible 5.6).

### 13.6 Which layer does this decision belong to?

**Why:** Bible Ch. 15's core distinction. Philosophy (5–10 years), system (evolves), expression (changes continuously). **Most teams fail by defending expression decisions as philosophy and revising philosophy for a campaign.**

**Test:** if this decision is later reversed, what has changed — our beliefs, our system, or just a page? Answering tells you how hard to defend it.

### 13.7 Does this survive "AI" becoming uninteresting?

**Why:** within a few years AI will be assumed, like a database. Our positioning is already built for that world because we never sold the model (Bible Ch. 1). Every surface that leans on AI-as-differentiator is borrowing against a currency that is being devalued on a known schedule.

---

# 14. Design Smells — Anti-Pattern Catalog

A catalog of patterns that are *usually* symptoms of an underlying problem. **A smell is not a violation — it's a signal to look harder.** Some have legitimate instances. The presence of one obliges investigation, not rejection.

## How to use this catalog

Each entry carries five fields, and the middle two are the ones that make it useful:

- **Looks like** — the observable surface of the problem.
- **Why it happens** — the incentive or pressure that produces it. Smells are rarely carelessness; they are usually a rational response to a local incentive.
- **Why teams miss it** — the reason it survives review. **This is the most important field.** A smell that were easy to catch would not need cataloguing; every entry here is one that passes ordinary review, and the field names the specific blind spot.
- **Long-term consequence** — what it costs at 12–36 months, which is where the real damage sits and where nobody is looking during a sprint review.
- **Detection** — a concrete test a reviewer can run.

**The organizing insight:** almost every smell below is *cheaper to add than to remove*, and most of them look like improvements at the moment of introduction. That asymmetry — not incompetence — is the mechanism by which good products decay. This catalog exists to make the asymmetry visible while the decision is still cheap.

Groups: **A** Product & Strategy · **B** Information Architecture · **C** UX · **D** Visual · **E** Motion · **F** AI · **G** Marketing · **H** Accessibility · **I** Engineering · **J** AI-authored work.

---

## Group A — Product & Strategy smells

*The most expensive group, because these failures make every downstream stage's work worthless. They are also the least often caught, because Stage 1 is the stage most likely to be compressed under deadline.*

### A1. The feature with no decision behind it

**Looks like:** a capability the team can describe fluently but cannot attach to a decision any named person makes.
**Why it happens:** requests arrive from customers, sales, and support attached to urgency but not to reasoning. "Three customers asked for it" is real evidence of demand and is routinely mistaken for evidence of value.
**Why teams miss it:** the justification sounds like customer-centricity, and rejecting it feels like arrogance. Nobody wants to be the person who tells sales that a customer request doesn't matter — so the question that would expose it (*what were they trying to decide?*) is never asked.
**Long-term consequence:** it survives forever. Nobody removes a feature with three users, so it accrues maintenance, screen space, documentation, support load, and conceptual weight indefinitely. **Additions are cheap and removals are politically expensive; the ratchet turns one way only.**
**Detection:** §3.1. Ask for the decision, the person, and what they know before and after. If the answer is a request rather than a decision, go one level deeper — the underlying decision is often served better by something else entirely.

### A2. Cleanliness achieved by relocation

**Looks like:** a simplified screen where the complexity has moved into settings, onboarding, documentation, or the user's memory.
**Why it happens:** "reduce clutter" is a legitimate goal with an illegitimate shortcut. Moving complexity is far easier than resolving it, and it produces an artifact that photographs better.
**Why teams miss it:** the artifact under review genuinely looks better, and review evaluates the artifact. The cost lands outside the frame — in a settings panel nobody reviewed, or in a user's head, which nobody can see. **This is the hardest smell in the document to catch, because the evidence of the problem is definitionally not in the submission.**
**Long-term consequence:** total task effort rises while every individual screen looks improved. Products in this state feel simultaneously "clean" and "hard to use," which is a diagnosis teams struggle to make because the two seem contradictory.
**Detection:** §3.3. Trace total work end-to-end including configuration, learning, and recovery — not screen density. If density fell and total steps rose, it's a regression wearing a redesign.

### A3. The dashboard that answers no question

**Looks like:** a grid of metrics, present because dashboards have metrics.
**Why it happens:** dashboards are the most requested and least specified artifact in enterprise software. "We need visibility" is a demand with no acceptance criteria, so it gets satisfied with volume.
**Why teams miss it:** it demos extremely well and reviews well, because reviewers evaluate whether each number is correct rather than whether any number changes behavior. Correctness is easy to check; consequence is not.
**Long-term consequence:** users learn the page is ignorable, and that learning generalizes — it costs us the two widgets that *would* have mattered, plus every future attempt to put something important there.
**Detection:** for each element, name the decision that changes based on it. Elements with no answer are removed, not resized. If nothing survives, the page shouldn't exist.

### A4. Roadmap-shaped product

**Looks like:** navigation and surfaces organized around the teams or quarters that built them rather than the work users do.
**Why it happens:** Conway's law applied to interfaces. Each team ships into its own area because that's the unit of ownership, and ownership boundaries become IA boundaries by default rather than by decision.
**Why teams miss it:** everyone inside the company navigates it correctly, because they share the org chart that produced it. Internal usability is perfect and completely unrepresentative.
**Long-term consequence:** the product becomes a portfolio of tools rather than a system, and it becomes structurally unable to support workflows that cross team boundaries — which is most of the valuable ones.
**Detection:** ask someone outside the company to predict where a thing lives (§4.1). Separately, compare the nav to the org chart; resemblance is the finding.

### A5. Speed sold as the value

**Looks like:** a feature, headline, or metric whose primary claim is throughput.
**Why it happens:** speed is measurable, demoable, and immediately legible to a buyer. Confidence is none of those things. Under quota pressure, the measurable claim wins every argument.
**Why teams miss it:** it isn't wrong, it's *misordered*, and misordering doesn't trip any checkpoint that asks whether a statement is true.
**Long-term consequence:** a competitor beats the number next quarter and we have no second argument. Worse, we've taught the market that volume is the axis — the axis on which we are structurally disadvantaged and on which our actual advantage is invisible (Bible Ch. 1, Ch. 2).
**Detection:** §10.6. Is the first claim about decision quality? Speed may appear — second.

---

## Group B — Information Architecture smells

*The group with the worst repair economics. Visual debt is a restyle; IA debt is a migration with URL changes, retraining, and support load.*

### B1. Duplicate workflows

**Looks like:** two live paths to the same outcome, usually one legacy and one new.
**Why it happens:** shipping the new path is a feature; removing the old one is a project with migration risk and no visible reward. The rational local move is always to ship and defer.
**Why teams miss it:** the review only sees the new path. The old one isn't in the diff, isn't in the mockup, and isn't anyone's assigned concern — it is nobody's job to notice that a thing now exists twice.
**Long-term consequence:** the most expensive smell in this catalog. The product becomes unlearnable (every user must discover both, choose, and sometimes be wrong), every future change costs double, and support answers become conditional on which path the user found.
**Legitimate instance:** a deprecation window **with a dated removal condition and a named owner**. Without those two fields it is not a deprecation, it is a permanent second product.
**Detection:** §4.3. Ask what the old path does now and when it dies. "We'll remove it later" is a decision to keep it.

### B2. The screen that should have been a panel

**Looks like:** a new route for something that needed a small amount of context.
**Why it happens:** a screen is the default unit of design work. It's how tickets are scoped, how mockups are framed, and how progress is demonstrated. Producing a screen feels like producing something; producing a panel inside someone else's screen feels like editing.
**Why teams miss it:** the screen is reviewed on its own merits and is usually fine on its own merits. Its cost is paid by the product's total surface area, which no single review is responsible for.
**Long-term consequence:** screen count is the best available proxy for how hard a product is to learn. Each screen also multiplies out into states, permissions, responsive variants, and a slot in the user's mental model.
**Detection:** §4.6. Could this be a section, a panel, an inline expansion, or a state? Answer all four before accepting the screen.

### B3. Schema-shaped navigation

**Looks like:** structure that mirrors the data model — an "Interviews" section because interviews are a table.
**Why it happens:** the data model is the most legible artifact available when structure is being decided, and it's usually settled first. Mirroring it requires no additional thought and produces something defensibly consistent.
**Why teams miss it:** it is internally coherent, and coherence reads as correctness. Everyone building it already knows the schema, so the navigation feels obvious to precisely the people who cannot evaluate it.
**Long-term consequence:** users maintain a permanent translation layer between how they think and how we're organized. Translation layers are where errors, hesitation, and abandonment happen — and the cost is invisible because users blame themselves.
**Detection:** §4.1. Where does the *user* think this lives? Interview feedback belongs on the candidate.

### B4. The synonym

**Looks like:** the UI says "role," the API says "job," marketing says "opening," and a tooltip says "position."
**Why it happens:** vocabulary is decided independently in four places at four times, by people optimizing for their own surface's clarity.
**Why teams miss it:** each term is correct in isolation, and no single review sees more than one surface. Lexicon drift is the canonical failure that only whole-product review catches.
**Long-term consequence:** users learn all four terms and trust none. Search fails. Documentation becomes ambiguous. The product reads as assembled rather than designed — which, for a company selling precision, is a positioning failure and not merely a copy one.
**Detection:** §4.7. Every noun maps to the product lexicon. New nouns require an explicit addition, and that should be hard, because most new nouns are synonyms.

### B5. The undated bridge

**Looks like:** a compatibility layer, a legacy adapter, a "temporary" parallel implementation.
**Why it happens:** bridges are genuinely the right call during migration. The failure is never the bridge; it is the missing removal condition.
**Why teams miss it:** at the moment of creation everyone knows it's temporary, so writing that down feels redundant. Eighteen months later the people who knew have moved on and the bridge has dependents.
**Long-term consequence:** temporary becomes architecture through nothing but the passage of time. Removing it now requires archaeology to determine what it was for.
**Detection:** §4.8, §12.6. Name the removal condition, the date, and the owner. Three fields. Missing any one means it is permanent.

---

## Group C — UX smells

*These are caught late because they live in the flow, and review looks at screens.*

### C1. Confirmation on safe actions

**Looks like:** "Are you sure?" on something reversible.
**Why it happens:** confirmations are the cheapest available response to any report of an accidental action, and they always look like diligence.
**Why teams miss it:** adding one is a positive-signalling act — it demonstrates care about user error. The cost is distributed across every *other* confirmation in the product, and nobody attributes it back.
**Long-term consequence:** users learn to dismiss dialogs reflexively. That learned reflex then disarms the confirmations guarding genuinely irreversible actions, which in our domain means actions affecting someone's livelihood. **Each safe-action dialog makes the dangerous ones less effective.**
**Detection:** §5.6. Reversible gets undo, not confirmation. Irreversible gets confirmation that names the consequence.

### C2. Over-explanation

**Looks like:** tooltips, help text, empty-state paragraphs, and coach marks layered onto an unclear interface.
**Why it happens:** explanation costs an hour; restructuring costs a week. When usability testing surfaces confusion late in a cycle, explanation is the only affordable response.
**Why teams miss it:** it directly addresses the reported problem, so it closes the ticket. Reviewers see a responsive fix rather than a patched failure.
**Long-term consequence:** the interface stays confusing and now has more on it. Help text also becomes stale independently of the UI it describes, so the patch decays into active misinformation.
**Detection:** §14 companion test — remove the help text. If the interface becomes unusable, the help text was carrying meaning the design should carry. Explanation is proportional to consequence, not to how unclear we left something (Bible Ch. 3).

### C3. Demo data

**Looks like:** three tidy rows, short names, complete fields, a plausible-perfect candidate.
**Why it happens:** realistic data is genuinely laborious to produce, and mockup tools make placeholder content frictionless. It is also more legible in a design review, which creates an active incentive.
**Why teams miss it:** **this is the smell most likely to be present in an artifact that passes every other check** — because every other check is being run against the tidy version. The review is technically valid and evaluates a product that doesn't exist.
**Long-term consequence:** every layout failure that real data produces ships undetected — overflow, wrapping, empty fields, twelve items at the same stage, a name in a script the font doesn't cover. It also sets an expectation the product violates at first login (Bible 5.7).
**Detection:** §5.9, §6.6. Require worst-case realistic data in the submission. Reviewing against demo data is reviewing a different product; return it rather than reviewing it.

### C4. The novel pattern used once

**Looks like:** a new interaction model on one screen, because that screen was special.
**Why it happens:** the existing pattern genuinely fits poorly, and designing a local solution is faster than negotiating a system-wide change.
**Why teams miss it:** it is usually *better* in the local case, and reviewers evaluate locally. The argument "this screen is different" is always available and rarely falsifiable in a single review.
**Long-term consequence:** it's an inconsistency with a good story. Users' learning stops compounding — every screen becomes something to learn rather than something to recognize.
**Detection:** §5.8. Either the pattern is better, in which case it belongs everywhere and that is a project to be scoped now, or it isn't, in which case it's noise. There is no third option, and "we'll roll it out later" is the third option in disguise.

### C5. The unhandled state

**Looks like:** a submission with a happy path and nothing else — no empty, loading, partial, error, or permission-denied design.
**Why it happens:** the happy path is what the feature is *for*, and it's what stakeholders ask to see. Other states feel like implementation detail.
**Why teams miss it:** they're not in the mockup, so they're not in the review. Absence is the hardest thing for a reviewer to notice, because nothing on the screen prompts the question.
**Long-term consequence:** these states become engineering improvisation, which means they are inconsistent across the product and carry none of the brand's voice — and they constitute the majority of a new user's early experience.
**Detection:** §5.7. A submission missing states is incomplete. **Return it; don't review it.** Reviewing an incomplete submission teaches that incomplete submissions get reviewed.

### C6. Click-count optimization

**Looks like:** a flow compressed into fewer steps by merging unrelated decisions onto one dense screen.
**Why it happens:** click count is the only UX metric that is trivially measurable, so it becomes the target. Effort is what matters and is much harder to observe.
**Why teams miss it:** the improvement is quantified and the regression isn't. A number that went down beats a feeling that got worse in every review conversation.
**Long-term consequence:** users face compound decisions they aren't equipped to make at once, so they either default blindly or leave and return — which shows up as an *increase* in the metric being optimized, usually attributed to something else.
**Detection:** §5.2. Count decisions, not clicks. Ask which decisions could be well-defaulted instead of surfaced.

---

## Group D — Visual smells

*The group most often defended as taste. Every entry here has a principle behind it, which is what makes the defense answerable.*

### D1. Decoration standing in for information

**Looks like:** illustrations, gradients, abstract graphics, icons that restate their adjacent label.
**Why it happens:** empty space reads as unfinished to stakeholders, and adding visual matter is the fastest way to make a surface look worked-on.
**Why teams miss it:** it appears precisely where we have nothing specific to say — so it *conceals the content problem that motivated it*. Removing it exposes an emptiness the team would then have to fix, which creates a quiet incentive to leave it.
**Long-term consequence:** attention is spent on elements that return nothing, permanently, on every view. And the underlying content gap never gets addressed because the symptom is covered.
**Signature instance for us:** abstract AI imagery — orbs, meshes, particle fields, gradient brains. Banned outright (Bible 5.2).
**Detection:** §6.7. What breaks if it's removed? Then actually remove it and look at what's exposed.

### D2. The three-column feature grid

**Looks like:** icon, two-word heading, one sentence of filler. Three times.
**Why it happens:** it's the default output of every page-building tool, every template, and every generative model, because it's the most common structure in the training set and the easiest to fill.
**Why teams miss it:** it looks like a designed section. It has hierarchy, alignment, and balance — it passes §6.1 through §6.3 cleanly while failing the page entirely.
**Long-term consequence:** readers skip it automatically, so the content in it may as well not exist. It also *flattens*: three items presented identically asserts that none is more important, which is almost never true and is a claim we didn't intend to make.
**Detection:** §10.4, §14 J1. Could the three cells be reordered without loss? If yes, there is no argument here, only an inventory.

### D3. Hierarchy by color

**Looks like:** importance signalled primarily through hue.
**Why it happens:** color is the fastest way to make something look more important without restructuring anything, and it requires no negotiation about what should actually be prominent.
**Why teams miss it:** it works perfectly in the exact conditions of the review — one theme, a good monitor, full color vision, no zoom.
**Long-term consequence:** the hierarchy collapses in dark mode, grayscale, print, projection, and for a meaningful share of readers. It also spends the accent that should exclusively mean "this is the action," which degrades every call to action in the product (Bible Ch. 8).
**Detection:** §6.10. Screenshot in grayscale. If the priority order changes, the hierarchy was never real.

### D4. Depth used decoratively

**Looks like:** shadows tuned for richness, four or five elevation levels, glass on a flat page.
**Why it happens:** depth effects are the most immediately gratifying tool available — they make a flat surface look expensive with one property change.
**Why teams miss it:** each individual shadow looks good. The degradation is systemic: elevation stops being a reliable answer to "what is on top of what," and no single review can observe a system-level property.
**Long-term consequence:** users lose a signal they were depending on unconsciously, and modality becomes ambiguous. Glass specifically also dates hard and contradicts our brand's *grounded* register (Bible Ch. 6).
**Detection:** §6.8, §6.9. Three levels only. A shadow you consciously notice is too strong. Translucency requires content genuinely meant to be seen through.

### D5. Uniform spacing

**Looks like:** the same padding everywhere; a heading with equal space above and below.
**Why it happens:** uniformity is what a spacing system looks like when applied without judgment, and it is what most tooling makes easiest.
**Why teams miss it:** it looks *tidy*, and tidy is easily mistaken for structured. It also passes any check phrased as "is spacing consistent" — which is the wrong question.
**Long-term consequence:** structure is invisible, so users perform the grouping work we should have done. The page reads as a stack of unrelated blocks and scanning fails, which disproportionately harms exactly the volume workflows our product exists to support.
**Detection:** §6.3. Is every gap between groups larger than every gap within a group? Check the heading first — it is the most common failure.

### D6. Type-style sprawl

**Looks like:** eight, ten, fourteen distinct text styles on one surface.
**Why it happens:** each style was added to solve one local emphasis problem, correctly, in isolation.
**Why teams miss it:** no single addition is wrong, and the count is never taken. It's an accumulation smell, invisible to any review of a change rather than of a state.
**Long-term consequence:** nothing stands out and nothing feels intentional — the double failure. Hierarchy stops functioning because the reader can no longer infer meaning from difference.
**Detection:** §6.4. Count them. More than about six needs justification. Two levels distinguishable only by a small size delta are not distinguished.

---

## Group E — Motion smells

*Systematically over-approved, because reviewers see motion twice and users see it two hundred times.*

### E1. Motion without meaning

**Looks like:** an animation that exists because the change felt abrupt.
**Why it happens:** abruptness is a real perceptual problem, and animation is the obvious fix. Often the actual problem is that the change was unexpected — a hierarchy or feedback issue that motion covers rather than solves.
**Why teams miss it:** it demonstrably improves the first experience, and the first experience is what review measures.
**Long-term consequence:** strictly negative economics after roughly the tenth exposure. The delight was spent once; the attention cost recurs forever. And nobody re-reviews motion that already shipped.
**Detection:** §7.1. What would the user misunderstand without it? "It feels better" is not an answer — it feels better to you, on your fifth viewing, having built it.

### E2. The ambient loop

**Looks like:** a pulsing indicator, a breathing gradient, a shimmer that never resolves.
**Why it happens:** it signals liveness and is the standard vocabulary for "AI is here" — which is precisely why it's so available and so wrong for us.
**Why teams miss it:** in a static review it doesn't exist at all, and in a live review it reads as polish for the first few seconds.
**Long-term consequence:** it is an interruption on a timer, running in the peripheral vision of someone trying to make a careful judgment about a person. Users eventually describe such products as "busy" or "tiring" without being able to locate why.
**Detection:** §7.3. Does it end? If not, it goes. The only exception is an honest indeterminate progress indicator, which ends when the operation does.

### E3. Motion tuned on fast hardware

**Looks like:** timing that feels crisp on a developer machine and sluggish on an issued corporate laptop.
**Why it happens:** everyone building and reviewing the product is on better hardware than most users, always.
**Why teams miss it:** the review environment is the problem, and the review environment is invisible from inside it.
**Long-term consequence:** the product is perceived as slow by the majority of its users, and the perception is attributed to the system rather than to animation duration — so it is diagnosed as a performance problem and optimized in the wrong place, expensively.
**Detection:** §7.2, §7.10. Review at 1× on the slowest supported hardware. If a reviewer can describe the animation, it's too long.

### E4. The staggered page reveal

**Looks like:** every element floating up in sequence as the reader scrolls.
**Why it happens:** it's a single library call, it looks sophisticated in a first-visit demo, and it makes a sparse page feel eventful.
**Why teams miss it:** review is a first visit. The second visit — where the reader wants to re-find something and must wait for it to appear — is never tested.
**Long-term consequence:** the page feels unstable, and on return visits it is actively slow. It also fights the reader's scroll intent, which is the one interaction they are most confident in (Bible Ch. 13).
**Detection:** §7.7. One subtle section entrance, once or twice on a long page, is the ceiling. Scroll the page a second time and ask whether it helped.

---

## Group F — AI smells

*The group with the worst consequence-per-instance. Every entry here can singlehandedly convert us into the category we positioned against.*

### F1. AI presented as verdict

**Looks like:** a score, a rank, or a recommendation without visible provenance or confidence.
**Why it happens:** verdicts are more compact, more decisive, and demo dramatically better than evidence. Every incentive in a sales cycle points here.
**Why teams miss it:** it is the *most impressive* version of the feature, so it survives review on enthusiasm. Reviewers assess whether the output is good rather than whether it is accountable.
**Long-term consequence:** it breaks the product's central claim at the one moment it matters, creates real legal exposure, and trains users toward exactly the uncritical acceptance our positioning says we prevent.
**Detection:** §8.1. From the conclusion, in one step, can you reach the source that produced it? Not a summary of the source — the source.

### F2. Confident AI with no unsure state

**Looks like:** every example, screenshot, demo, and test fixture shows a high-confidence read.
**Why it happens:** confident output is what the team builds first, tests with, and shows. Uncertainty states require deliberate design work with no visible payoff in a demo.
**Why teams miss it:** absence again — nothing on screen prompts the question "where's the version where we don't know?"
**Long-term consequence:** the calibration claim (Bible Ch. 2, differentiator 2) becomes marketing rather than architecture. The first user with a thin candidate profile discovers this, and they are precisely the sophisticated user whose opinion propagates.
**Detection:** §8.2. **Ask the author to show you the low-confidence rendering.** If it doesn't exist, the feature isn't complete.

### F3. Fake progress and artificial thinking delay

**Looks like:** a progress bar unconnected to progress; a deliberate pause so the AI feels considered.
**Why it happens:** instant output is perceived as shallow, and there is real research showing that visible effort increases perceived value. The pattern is spreading through the category for exactly this reason.
**Why teams miss it:** it improves a measurable perception metric, and the person who added it can articulate a user-research justification. It presents as sophistication about human factors.
**Long-term consequence:** it is a lie told by the interface about the product, in a product whose entire positioning is honest output. Discovery is catastrophic and permanent — a user who finds it correctly concludes our confidence displays may also be theatre.
**Detection:** §7.8. **Blocking, always, no exceptions.**

### F4. Provenance theatre

**Looks like:** "based on resume analysis," a source label that doesn't resolve, a citation that points at the document rather than the passage.
**Why it happens:** real traceability is architecturally expensive; the appearance of it is a string. When traceability is a stated requirement, the string satisfies the requirement.
**Why teams miss it:** the checkpoint reads as met. There *is* a citation. Reviewers verify presence rather than following the link and checking that it lands somewhere that justifies the claim.
**Long-term consequence:** worse than no citation, because it manufactures unearned confidence. It also makes the eventual real implementation harder, since users have already learned the affordance means nothing.
**Detection:** §8.1. Follow three citations at random to their source. If any lands on a document rather than the specific evidence, the feature fails.

### F5. The costly override

**Looks like:** disagreeing with the system requires more steps than accepting it, or triggers a warning treating the human as mistaken.
**Why it happens:** the accept path is the designed path; override is added afterward as an escape hatch, and escape hatches get escape-hatch effort.
**Why teams miss it:** override exists, so the checkbox is satisfied. Nobody times the two paths against each other, and reviewers test the flow they were shown.
**Long-term consequence:** we have built a decision-maker with a consent flow, whatever the marketing says (§3.7, Bible Ch. 2). Over time users stop overriding, our data stops reflecting human judgment, and the system's errors become invisible to us.
**Detection:** §8.4. Complete both paths and compare steps and friction. Then check whether the override persists downstream or is silently re-asserted.

### F6. Laundered inference

**Looks like:** model-generated text and human-recorded notes rendered identically in one timeline or summary.
**Why it happens:** unified views are cleaner, and distinguishing sources requires a visual treatment that complicates a layout for a reason that seems abstract.
**Why teams miss it:** the view looks better unified, and the problem is epistemic rather than visual — it doesn't announce itself in a mockup.
**Long-term consequence:** the most insidious entry in this catalog. Model output enters the permanent record indistinguishable from observation. Six months later nobody can tell what was inferred from what was seen — which destroys the decision continuity we sell (Bible Ch. 2, differentiator 3) and creates an evidentiary problem in any dispute.
**Detection:** §8.5. Can a user tell, at a glance, who said each thing? Test on a record that mixes both.

### F7. Confidence as decoration

**Looks like:** a confidence percentage or bar that is not derived from anything measurable — a proxy for output length, model temperature, or a fixed value.
**Why it happens:** the design requires a confidence display before the calibration work is finished, and a plausible number unblocks the UI.
**Why teams miss it:** it is a number, and numbers are assumed to mean something. Reviewers check that confidence is *displayed*, which is the checkpoint as written, and not that it is *earned*.
**Long-term consequence:** the most damaging possible version of F3 — a dishonest signal in the exact place we claim honesty. It also poisons the real implementation, because users will have calibrated against noise.
**Detection:** ask what produces the number and whether it has ever been validated against outcomes. If the answer is a heuristic, it may not be displayed as a confidence level.

---

## Group G — Marketing smells

*Incremental by nature. Each instance is defensible; the aggregate is a repositioning nobody approved.*

### G1. Marketing vocabulary drift

**Looks like:** one "seamless." Then a "transform." Then a "10x."
**Why it happens:** conversion pressure. Category language exists because it tests well in the short term, and the person proposing it usually has data.
**Why teams miss it:** it arrives one word at a time, and blocking a single word over a principle feels disproportionate. There is no review at which the cumulative change is visible.
**Long-term consequence:** within a year the voice is indistinguishable from the category we positioned against, and nobody can identify the moment it happened. The positioning was not abandoned; it was spent.
**Detection:** §10.5. Scan against the banned list every time. Treat the first instance as the finding, not the fifth.

### G2. Trust content in the footer

**Looks like:** security, privacy, and limitations relegated below the fold or to a separate page.
**Why it happens:** trust content doesn't convert on its own, so conversion-optimized page structures push it down. It also isn't anyone's growth metric.
**Why teams miss it:** the content exists and is accurate, so a completeness check passes. Placement is not usually reviewed as a claim.
**Long-term consequence:** placement *is* a statement about importance. Exiling trust content tells the reader we consider it a formality — and it is read by the exact stakeholder who can kill the deal, at the exact moment they are looking for a reason to.
**Detection:** §9.4. Does the answer arrive where the objection arises?

### G3. The inventory page

**Looks like:** section headings that form a list of nouns — Features, Benefits, Integrations, Pricing.
**Why it happens:** it's the fair outcome of internal negotiation. Every team wants their area represented, and a list is the structure that satisfies everyone.
**Why teams miss it:** each section is individually well-made, and the failure is only visible at the level of the whole page — which nobody is assigned to evaluate.
**Long-term consequence:** the reader must assemble the argument themselves, and won't. The page has no thesis, so nothing is remembered.
**Detection:** §10.1. Read only the headings, in order. Do they form an argument or an index?

### G4. Proof before substance

**Looks like:** a logo wall or testimonial band above anything worth believing.
**Why it happens:** social proof is known to lift conversion, and it's the easiest asset to obtain, so it migrates upward on the page over successive optimizations.
**Why teams miss it:** it does lift the measured metric in isolation. The cost — arguing "believe us because others do" before we've made our own case — isn't in any dashboard.
**Long-term consequence:** we sound like a product that can't make its own argument, to exactly the sophisticated buyer whose skepticism we most need to lower.
**Detection:** §9.7. Has the page said something worth trusting before it asks the reader to trust others?

### G5. The interchangeable sentence

**Looks like:** copy that remains true if you substitute a competitor's name.
**Why it happens:** generality is what you write when you haven't decided precisely what you mean, and it's safer — no specific claim can be wrong.
**Why teams miss it:** it is grammatically clean, on-message, and offends nothing in a stakeholder review. Vagueness fails no explicit checkpoint.
**Long-term consequence:** the reader has read it forty times this year, and familiar patterns are skipped rather than read. **Familiarity is invisibility.** The page consumed attention and delivered nothing.
**Detection:** §10.3. Swap in a competitor's name. If it's still true, cut it.

---

## Group H — Accessibility smells

*Usually structural failures wearing an accessibility costume. When this group is hard to fix, the cause is normally an unresolved hierarchy, not missing markup.*

### H1. Compliance-shaped accessibility

**Looks like:** contrast ratios exactly at the threshold, ARIA added to make a scanner pass, alt text that describes nothing.
**Why it happens:** accessibility arrives as a requirement with an automated test, and automated tests are optimized against rather than satisfied.
**Why teams miss it:** the scanner is green, and green is the strongest possible signal in a review. Automated coverage catches roughly a third of real barriers and produces total confidence.
**Long-term consequence:** the product is legally defensible and practically unusable for the people the requirement exists to protect — and we will never receive the complaint, only the silent abandonment.
**Detection:** §11. Use the artifact by keyboard and by screen reader for one full task. No scanner substitutes for this.

### H2. Hover-only affordance

**Looks like:** an action, a label, or a piece of information that appears only on hover.
**Why it happens:** hover reveals are the standard solution to a crowded interface, and they genuinely reduce visual noise.
**Why teams miss it:** the reviewer has a pointer. Everything works.
**Long-term consequence:** the feature does not exist on touch devices, does not exist for keyboard users, and is undiscoverable for everyone — including pointer users who never happened to hover there.
**Detection:** §11.9, Bible Ch. 13. Hover reveals affordance, never content. Complete the task with keyboard only, then on touch.

### H3. The faint focus ring

**Looks like:** a focus indicator that technically exists and cannot be found on a real screen in real conditions.
**Why it happens:** visible focus rings are aesthetically intrusive, and there's constant quiet pressure to reduce them. The requirement says "visible," which is satisfiable at the margin.
**Why teams miss it:** it passes because it's present, and reviewers verify presence at 100% zoom on a good monitor while not actually navigating by keyboard.
**Long-term consequence:** keyboard navigation becomes guesswork — for assistive-tech users and equally for the power users working at volume who are our best customers (§11.1).
**Detection:** tab through the entire surface on a laptop screen at normal brightness. If you lose your position once, it fails.

### H4. Reduced motion as deletion

**Looks like:** `prefers-reduced-motion` implemented by disabling animations, leaving abrupt discontinuities.
**Why it happens:** it's a one-line implementation and it satisfies the literal instruction.
**Why teams miss it:** the media query is present, so the checkpoint reads as met. Almost nobody reviews the resulting experience.
**Long-term consequence:** the users who most need the accommodation get a *more* confusing interface than everyone else — the motion was carrying meaning, and only they lose it.
**Detection:** §7.9, §11.7. Turn reduced motion on and complete a task. Meaning must be preserved by cross-fade or instant state change, never simply removed.

---

## Group I — Engineering smells

*Low weight in scoring, real teeth via the debt gate. These are trades, not defects — but undeclared trades are defects.*

### I1. The one-off component

**Looks like:** a new component built for a single screen because nothing existing fit.
**Why it happens:** generalizing costs three times as much and delivers on a later date, and the pressure is always on this date.
**Why teams miss it:** the screen is good, the code is clean, and the review is of the screen. Systemic cost is nobody's line item.
**Long-term consequence:** permanent maintenance plus a permanent inconsistency. At scale, this is the mechanism by which a design system becomes a suggestion.
**Detection:** §12.1. Require evidence no existing component fits, plus a commitment to generalize. A component built for one screen is design debt with a delivery date attached.

### I2. The hard-coded value

**Looks like:** a raw color, spacing, or duration, because the token didn't exist.
**Why it happens:** the token gap is discovered mid-implementation, and adding a token requires touching a shared system — slower, and it needs someone else's review.
**Why teams miss it:** invisible in any visual review, and each instance is trivially small.
**Long-term consequence:** one is nothing; four hundred are a rewrite. Theming, density modes, and any future rebrand become impossible incrementally and nobody can point to when it happened.
**Detection:** §12.2. **A token gap is a system gap to be fixed, never a mismatch to tolerate.** Add the token.

### I3. Undeclared debt

**Looks like:** a shortcut everyone knows about and nobody wrote down.
**Why it happens:** at the moment it's taken, the whole team knows, so recording it feels like ceremony.
**Why teams miss it:** it's shared context, and shared context is exactly what a review cannot see and what turnover erases.
**Long-term consequence:** becomes architecture by default. Future contributors treat it as intentional and build on it.
**Detection:** §12.6. Debt is acceptable; undeclared debt is not. Name it, date it, own it.

### I4. Works-on-my-machine performance

**Looks like:** acceptable performance under development conditions and a realistic dataset nobody tested.
**Why it happens:** realistic-scale test data is work, and performance problems are invisible until they aren't.
**Why teams miss it:** every reviewer's environment is faster and smaller than production.
**Long-term consequence:** the failure lands on our largest, most valuable accounts first, because scale arrives there first (§13.1).
**Detection:** §12.4. Realistic volumes, realistic network, target hardware. Layout shift on load is a defect, not a nit.

---

## Group J — AI-authored work smells

*These do not appear in traditional design catalogs because they are new. They are also the fastest-growing source of quality erosion, because generated work arrives complete, confident, and syntactically clean.*

### J1. The statistically likely layout

**Looks like:** competent, conventional, interchangeable with any B2B SaaS product.
**Why it happens:** a generative model reproduces the center of its training distribution. The most common pattern is the most probable output, and probability is not quality.
**Why teams miss it:** it passes nearly every checkpoint individually. Hierarchy is fine, spacing is fine, contrast is fine. It fails only the one criterion no automated check encodes: **the average is precisely what we chose not to be** (Bible 5.6).
**Long-term consequence:** the product becomes indistinguishable from its category at exactly the moment differentiation matters most, and each generic surface makes the next one easier to approve.
**Detection:** §6.13. Could this be dropped onto a competitor's product with a copy swap? If yes, reject regardless of execution quality.

### J2. Requirements satisfied literally

**Looks like:** every stated requirement met; the underlying goal missed.
**Why it happens:** models optimize against the stated specification, and specifications are always incomplete. Unstated intent is invisible to them.
**Why teams miss it:** **it is very hard to reject work you asked for and received.** The reviewer's own brief is the evidence for the defense.
**Long-term consequence:** a body of work that is technically compliant and directionally wrong — the specific failure this entire document exists to catch, arriving at higher volume than human authorship ever produced.
**Detection:** ignore the brief. Evaluate against the goal (§3.1). If the artifact satisfies the words and not the purpose, the brief was wrong and the artifact is still wrong.

### J3. Parallel reimplementation

**Looks like:** a working new implementation of something the codebase already does, in a different style.
**Why it happens:** reading an unfamiliar codebase is harder for a model than writing fresh code, and fresh code always works in isolation.
**Why teams miss it:** it passes tests, it's clean, and the duplication is only visible to someone who knows the existing utility exists.
**Long-term consequence:** B1 (duplicate workflows) at the code layer, arriving continuously. Two implementations diverge, and bug fixes land in one.
**Detection:** §12.8. Does the change use existing utilities and match surrounding conventions? Search for the capability before accepting a new implementation of it.

### J4. Confident invention

**Looks like:** a reference to a token, component, prop, endpoint, or design rule that does not exist, stated with full assurance.
**Why it happens:** models generate plausible names for things that *should* exist. Plausibility is the failure mode, not randomness.
**Why teams miss it:** it is stated in the same register as everything correct in the submission, and it is usually *reasonable* — the invented token is often one we should have.
**Long-term consequence:** silent breakage, or worse, a shadow vocabulary that partially works and never gets reconciled.
**Detection:** verify every named token, component, and API reference against the source of truth. Do not accept the assertion, including when it is right — especially then, because that's when the habit lapses.

### J5. Polish without resolution

**Looks like:** a beautifully executed surface for a flow that was never worked out.
**Why it happens:** generated output starts at high visual fidelity. There is no rough stage to signal that the thinking is rough.
**Why teams miss it:** fidelity is read as maturity. A polished artifact triggers Stage 4 review instincts and skips Stages 1–3 entirely — which is precisely the sequence inversion §2 exists to prevent.
**Long-term consequence:** unexamined concepts ship because they looked finished, and by the time the flow's problems surface, the surface is built and the sunk-cost pressure §2 warns about has already formed.
**Detection:** **fidelity is not evidence of stage.** When receiving generated work, explicitly re-run Stage 1 and Stage 2 before looking at the surface. If necessary, review it as a description rather than an image.

---

# 15. Final Approval Framework

## Why scoring at all

Numbers here are not a measurement. **They are a forcing function for explicit disagreement.**

Unstructured reviews resolve by seniority and social dynamics: the loudest concern wins, quiet concerns evaporate, and nobody records what was traded. Scoring makes each dimension a separate, recorded judgment — so "the visual work is excellent but the concept is weak" survives as a finding instead of being averaged away in a conversation.

**The score does not decide anything. It documents what was decided and why.** Anyone treating the number as the verdict has misunderstood the instrument.

## The dimensions and their weights

| # | Dimension | Weight | Rationale |
|---|---|---|---|
| 1 | **Product & Principles** (§3) | 25% | The only dimension that can make everything else worthless. Perfect execution of the wrong thing is a net negative — it's cost plus permanent maintenance. |
| 2 | **UX** (§5) | 20% | Where the product's value is actually delivered or lost. Users experience the flow, not the mockup. |
| 3 | **Trust & AI Experience** (§8, §9) | 15% | Our differentiation and our liability, on the same surface. Weighted high because it's the dimension where a single failure is disproportionate. |
| 4 | **Information Architecture** (§4) | 10% | Weighted for its *decay* cost rather than immediate impact — IA debt compounds and is the most expensive class to repair. |
| 5 | **Visual** (§6) | 10% | Matters enormously for perceived quality; weighted below UX because a good structure poorly styled is fixable, and the reverse is not. |
| 6 | **Accessibility** (§11) | 10% | Weighted *and* gated. The weight reflects craft quality; the gate (below) handles the floor. |
| 7 | **Engineering** (§12) | 6% | Low weight, real teeth via the debt gate. Most engineering concerns are trades, not defects. |
| 8 | **Motion** (§7) | 4% | Lowest weight because the correct amount is often zero. A high motion score on an artifact with no motion is normal, not a gap. |

**On the weights themselves:** they encode a specific opinion — that *what we build* and *whether it works* dominate *how it looks*, and that trust is weighted above visual craft because it is where this particular company lives or dies. If a future team disagrees, amend the weights explicitly and record why. Silently reweighting through practice is how standards erode.

## Scoring scale

Per dimension, 0–5:

| Score | Meaning |
|---|---|
| **5** | Exemplary. Should be cited as a reference for future work. |
| **4** | Strong. Meets every checkpoint; no reservations worth blocking on. |
| **3** | Acceptable. Meets checkpoints; some judgment calls are debatable but defensible. |
| **2** | Deficient. One or more checkpoints unmet without adequate reasoning. |
| **1** | Failing. Multiple unmet checkpoints or one principle violation. |
| **0** | Not evaluable. Insufficient material to review — return, don't score. |

**A dimension score of 2 or below requires a written finding citing the specific checkpoint.** A score without a citation is an opinion with a number attached, and it is inadmissible.

## Blocking gates — independent of score

**Gates are evaluated before scoring. A gate failure terminates the review; the artifact does not receive a score, and no weighted total can substitute for a passed gate.**

This ordering is what prevents the scoring model from contradicting itself. Accessibility and Trust/AI carry percentage weights *and* sit behind gates — the weight measures craft above the floor; the gate is the floor. A dimension can never be traded down to zero by strength elsewhere, because a failed gate means there is no arithmetic to perform.

| # | Gate | Source | Scope |
|---|---|---|---|
| **1** | Accessibility floor | §11 | Keyboard operability, focus management, contrast, reduced motion. No deferral path — that path has never once been completed. |
| **2** | AI Experience | §8, all 16 checkpoints | Traceability, calibration, confidence visualization, explanation, hallucination handling, override cost, failure states, claim boundaries. |
| **3** | Claim boundaries | §10.7 (Bible Ch. 2) | No claim we have committed not to make — in marketing or in interface strings. |
| **4** | Interface honesty | §7.8, §14 F3 | No fake progress, no artificial thinking delay, no marketing mockup presented as product. |
| **5** | Undeclared debt | §12.6, §4.8 | No duplication or temporary path without a dated removal condition and a named owner. |

Gates 1 and 2 are additionally protected by absolute role vetoes (§16) and by precedence ranks 1 and 2 (§18); the Approver cannot trade them.

The gates exist because these five failures are the ones scoring would let through — each can coexist with excellent work in every other dimension, and each is disproportionately costly relative to its size.

## Recommendations

**APPROVE** — weighted score ≥ 4.0, no dimension below 3, all gates passed. Ships as reviewed. Comments are optional improvements and do not block.

**APPROVE WITH CHANGES** — weighted score ≥ 3.5, no dimension below 3, all gates passed, and every required change is *specific, small, and unambiguous*. Ships after changes without re-review. **The discipline: if a change requires judgment, it requires re-review.** This verdict is for "fix the spacing in the third section," not "improve the hierarchy." Misusing it is the single most common way a review process becomes decorative.

**NEEDS REVISION** — anything scoring below 3.5, any dimension at 2 or below, or **any gate failed** (in which case the artifact is unscored). Returns to the earliest stage that produced the problem — not to the last one. A visual review that uncovers a concept failure returns to §3, not §6.

**REJECT** — the artifact should not exist, or is so misaligned that revision costs more than restarting. Rare, and it should stay rare, but a process that has never used it has an over-permissive Stage 1. **A reject at Stage 1 is a success; a reject at Stage 7 is a process failure to examine.**

## The review record

Every approval produces a durable record — not for compliance, but because **undocumented decisions get re-litigated every eighteen months, forever**, and each re-litigation costs more than writing this down would have.

Required fields:

- Artifact and version
- Stages completed, with reviewers
- Dimension scores with findings for anything ≤ 2
- Gate results
- Recommendation and rationale
- **Trade-offs accepted** — what we knowingly gave up, and why
- **Debt created** — with removal condition and owner
- Open questions deferred to a future review

The trade-offs field is the most valuable one. A future contributor asking "why is this like this?" is almost always asking about a trade-off, and the difference between a good answer and a shrug is whether someone spent ninety seconds writing it down.

## Using this document without ruining the team

Three failure modes to actively guard against:

**Weaponization.** This document can be used to block anything by anyone with the patience to find an unmet checkpoint. Reviewers who systematically block on minor findings are misusing it. The remedy is the §1 verdict separation: *wrong* blocks, *suboptimal* comments, *I'd have done it differently* stays silent.

**Ritualization.** A checklist run without thought produces a passed checklist and a bad product. The tell is speed — a §6 review completed in ninety seconds was not performed. The remedy is that every checkpoint demands a *because*, and a reviewer's job is to evaluate reasoning, not presence.

**Ossification.** A rule followed after its reason expired is worse than no rule, because it costs effort and produces nothing. The remedy is the annual review (Bible Ch. 15): check not whether the document is current but whether we actually follow it. A principle consistently violated means either the practice is wrong or the principle is — decide, in writing, and amend.

---

# 16. Review Roles

## Why roles are defined at all

Two failures happen in every review process that lacks explicit ownership, and they are opposites.

**Diffusion:** everyone reviews everything, so nobody is accountable for anything. Reviews become long, findings become suggestions, and the artifact ships because no individual felt authorized to stop it. This is the more common failure, and it is invisible — it looks like a collaborative culture.

**Capture:** one person's judgment becomes the de facto standard for all dimensions, usually the most senior or most vocal. Quality then tracks that person's attention and blind spots, and the review stops being a system.

Defined roles solve both by making each dimension **someone's job to be wrong about**. The point is not bureaucracy; it is that a finding raised by the accountable owner has a different status than the same finding raised in passing, and everyone needs to know which they're hearing.

## Roles are functions, not headcount

**One person may hold several roles. Nobody may hold a role on their own work.**

That second clause is the load-bearing one. A designer who authored the flow cannot be the Design owner for its review — not because their judgment is poor, but because authorship makes certain problems structurally invisible (see §14 C5, J2). On a small team, the honest arrangement is that some roles are held part-time by people who mostly do something else. That is fine. **What is not fine is a role held by the author, or a role left unassigned so that its checkpoints are nobody's responsibility.**

## The seven roles

### Product Owner

**Owns:** Stage 1 (§3), and §13 Scalability.
**Answers:** should this exist, does it serve a decision, what does it make worse, what happens if we don't build it.
**Veto:** yes, at Stage 1 only. **This is the most valuable veto in the process and the least used.** A Product Owner who has not killed anything this quarter should examine whether the concept gate is functioning or has become a formality (§2, Stage 1).
**Does not decide:** how it looks, how it's built, or what it's called. Ownership of *whether* does not extend to *how*.

### Design Owner

**Owns:** Stage 4 (§6), and §14 as a whole — the catalog is the Design Owner's instrument.
**Answers:** hierarchy, spacing, type, surface language, density, and whether the artifact expresses Hirevo or the category average.
**Veto:** yes, on Bible violations. **Not on preference** — this is the distinction that determines whether the role is respected or resented. A Design Owner blocking on §6.3 with the gap measurements cited is exercising the role. A Design Owner blocking because the layout isn't what they'd have made is exceeding it, and the Approver should say so.
**Also owns:** the design system and the lexicon. Requests to add a token, component, or noun route here.

### UX Owner

**Owns:** Stages 2 and 3 (§5, §4).
**Answers:** task completion, effort, decision load, context switching, states, consistency, and structure.
**Veto:** yes, on unhandled states (§5.7) and on IA duplication (§4.2, §4.3). These two are absolute because both are cheap now and enormously expensive later.
**Distinct from Design Owner deliberately:** flow and surface fail in different ways and reward different attention. Where one person holds both, they should run the two stages as separate passes on separate days — reviewing structure and surface simultaneously reliably produces a good-looking screen with an unexamined flow.

### Engineering Owner

**Owns:** Stage 7 (§12).
**Answers:** feasibility, cost, reuse, token compliance, performance, maintainability, and debt.
**Veto:** **no veto on design decisions.** Engineering raises cost; the Approver decides whether the cost is worth paying. An engineering veto on grounds of difficulty converts every design ambition into a negotiation with the person who has to build it, which systematically biases the product toward whatever is easy.
**Veto: yes** — on undeclared debt (§12.6) and on token violations (§12.2). Both are gates, not opinions.
**Obligation:** cost estimates must be honest in both directions. "That's hard" without a number is a preference wearing an engineering badge.

### AI Owner

**Owns:** §8 in full, and §9 jointly with Marketing.
**Answers:** traceability, calibration, confidence visualization, explanation quality, hallucination handling, override cost, failure communication, claim boundaries.
**Veto:** **yes, absolute, on all sixteen checkpoints in §8.** This is the strongest veto in the document and it is deliberately not overridable by the Approver — see §18, precedence rank 2. The reasoning: these are the checkpoints where a single shipped failure damages the company's central claim, and where commercial pressure to ship anyway is strongest and most articulate.
**Requirement of the role:** the AI Owner must be someone who understands both model behavior and the product's positioning. Held by a pure engineer, it becomes a capability review. Held by a pure designer, it becomes a presentation review. It is neither.

### Marketing Owner

**Owns:** §10, and §9 jointly with AI.
**Answers:** thesis, emotional sequence, specificity, vocabulary, claim boundaries, proof placement, CTA.
**Veto:** yes, on claim boundaries (§10.7) and vocabulary (§10.5) — **including inside the product.** Interface strings are brand surface, and they make claims more forcefully than marketing does because they make them in context at the moment of decision (§8.6). The Marketing Owner reviews product copy; this is not scope creep, it is the only way one voice survives.
**Does not own:** whether a feature exists, or how it works.

### Accessibility Owner

**Owns:** Stage 6 (§11).
**Answers:** keyboard operability, focus management, semantics, contrast, motion sensitivity, zoom, touch.
**Veto:** **yes, absolute and non-negotiable.** No deferral path exists (§2, Stage 6). The Approver cannot override this and should never be placed in the position of trying — see §18, precedence rank 1.
**Why it must be a named role rather than a shared responsibility:** shared accessibility responsibility means automated-scanner accessibility (§14 H1), because that is what happens when nobody's name is on the manual verification. The role exists to guarantee someone completes a task by keyboard and by screen reader.

### Approver

**Owns:** §15 — scoring, recommendation, trade-off documentation, and the record.
**Not a super-reviewer.** The Approver's job is to weigh recorded findings and decide, not to add an eighth opinion. An Approver who introduces new findings at sign-off has broken the process, because those findings never went through a stage and the author has no route to answer them.
**May override:** any non-gate finding, in writing, with the reasoning recorded as an accepted trade-off (§15).
**May not override:** the five gates in §15, the Accessibility veto, or the AI Experience veto.
**Accountable for:** the trade-offs field in the record. If it is empty on a non-trivial artifact, the Approver did not do the job — every real artifact trades something.

## Ownership at a glance

| Stage | Owner | Veto scope |
|---|---|---|
| 1 · Concept (§3) | Product | Full, at this stage |
| 2 · UX (§5) | UX | Unhandled states |
| 3 · IA (§4) | UX | Duplication, canonical home |
| 4 · Visual (§6) | Design | Bible violations only |
| 5 · Motion (§7) | Design | Honesty (§7.8) |
| 6 · Accessibility (§11) | Accessibility | **Absolute** |
| 7 · Engineering (§12) | Engineering | Debt, tokens |
| — · AI Experience (§8) | AI | **Absolute** |
| — · Trust (§9) | AI + Marketing | Claim boundaries |
| — · Marketing (§10) | Marketing | Claims, vocabulary |
| 8 · Approval (§15) | Approver | Non-gate findings |

## Rules that keep roles honest

**A role that never blocks is not being held.** If a reviewer has approved everything for two quarters, either the submissions are exceptional or the role is ceremonial. Check which.

**A role that blocks everything is being misheld.** Almost always a reviewer conflating *wrong* with *I'd have done it differently* (§1). The Approver should name this directly rather than routing around it, because routing around a reviewer is how a role quietly dies.

**Silence is not approval.** A stage without a recorded verdict is incomplete, and the artifact does not proceed. This prevents the most common process decay: reviewers who are busy, don't respond, and are treated as having consented.

**Reviewers may reassign upward, never downward.** A reviewer who feels unqualified on a specific point escalates it (§18). They do not approve it and hope.

---

# 17. Review Evidence

## Why evidence is required

**A review verdict without evidence is an opinion with procedural authority attached**, and a process built on those degrades in a predictable way: verdicts start tracking seniority rather than merit, authors learn to persuade rather than to verify, and the checklist becomes a vocabulary for expressing preferences rather than an instrument for finding problems.

The requirement is symmetric and this matters more than it sounds. **Authors provide evidence that a checkpoint is met. Reviewers provide evidence that it isn't.** A reviewer who cannot produce evidence for a finding has a hypothesis, and hypotheses are recorded as comments, not blocks.

There is a second reason, less obvious and more important over time: **most checkpoints in this document cannot be assessed from a static image.** Task effort, motion, keyboard operability, real-data behavior, calibration, override cost, failure states — all behavioral. A process that accepts screenshots as evidence for these is reviewing a depiction and recording a verdict about a product. That gap is where the majority of shipped defects in this catalog live.

## Evidence classes

Eight kinds, ordered by strength. **Higher classes displace lower ones for the same claim** — where Class 1 evidence exists, Class 7 is not an acceptable substitute.

**Class 1 — Observed use.** A recording or live session of someone completing the real task in the real artifact. The strongest evidence available for anything in §3, §5, or §11, because it is the only class that reveals what a user does rather than what we predict.

**Class 2 — Instrumented behavior.** Analytics, funnels, error rates, timing distributions from production. Strong for questions of scale and frequency; weak for *why*, which is why it pairs with Class 1 rather than replacing it.

**Class 3 — Working artifact.** The thing itself, running, on target hardware, with realistic data. Required for §7 (motion), §11 (accessibility), §8.10–8.16 (AI behavior), and §12.4 (performance). **A static submission for any of these is not reviewable and should be returned, not scored.**

**Class 4 — Realistic-data rendering.** Static, but populated with worst-case real content: long names, missing fields, twelve items at one stage, unreadable documents, non-Latin scripts. Acceptable for most of §6. Sufficient for §4 and much of §5.

**Class 5 — Research finding.** Interview notes, usability findings, support-ticket patterns, sales-call objections. Strong for §3 (what decision), §9 (what objection), §10 (what language lands).

**Class 6 — Engineering constraint.** A measured number: bundle cost, query count, render time, migration scope. Required for any Stage 7 finding. **"That's expensive" without a figure is not Class 6 evidence; it is Class 8.**

**Class 7 — Prior decision.** A cited Bible chapter, a checkpoint in this document, a recorded prior review. Sufficient on its own for consistency and principle findings, and the correct evidence class for most §6 and §10 blocks.

**Class 8 — Reasoned argument.** A written case with no artifact behind it. **The weakest class, and legitimate only where higher classes cannot exist** — concept-stage questions about things not yet built, or judgments about the future (§13). Class 8 supports comments and trade-off notes. It does not support a block on anything that could have been observed.

## What each stage requires

| Stage | Author must supply | Reviewer must supply to block |
|---|---|---|
| **1 · Concept** (§3) | Written problem statement; the named decision; the subtractive alternative considered; what this makes worse | Class 5 or 8 — a competing reading of the problem, stated |
| **2 · UX** (§5) | The full flow including empty, loading, partial, error, denied; realistic data | Class 1, 3, or 4 — the specific step where effort appears |
| **3 · IA** (§4) | Placement within existing structure; naming against the lexicon; what the old path does now | Class 4 or 7 — the duplicate, or the conflicting term, named |
| **4 · Visual** (§6) | Class 4 rendering, both themes, realistic content | Class 4 or 7 — the measurement or the cited principle |
| **5 · Motion** (§7) | Class 3, running, at 1×, on target hardware | Class 3 — observed, not described |
| **6 · A11y** (§11) | Class 3, plus a completed keyboard-only task and screen-reader pass | Class 3 — the specific step where you were blocked |
| **7 · Engineering** (§12) | Reuse assessment; token compliance; named debt with removal condition | Class 6 — a number |
| **— · AI** (§8) | Class 3 with: a low-confidence case, a failure case, an override path, and three citations that resolve | Class 3 — the output, the trace, the timing |
| **— · Marketing** (§10) | The one-sentence thesis; the heading outline alone; the competitor-swap test result | Class 5 or 7 |

## Evidence discipline

**Realistic data is the author's obligation, not the reviewer's request.** A submission with demo data (§14 C3) is returned as incomplete. Making this the author's job rather than a recurring review finding is what stops the same conversation from happening every sprint forever.

**"I tested it" is not evidence; the recording is.** Not distrust — reproducibility. The recording is what a future contributor consults when asking why we chose this, and what a re-review compares against.

**Absence of evidence is a finding.** When a checkpoint cannot be evidenced, that is itself informative and gets recorded: *"§8.10 — calibration unverifiable; author confirms the confidence signal is heuristic."* This converts an unknown into a dated, owned open question rather than a silent assumption. Several of the worst entries in §14 survive precisely because nobody wrote down that they hadn't checked.

**Evidence expires.** A Class 1 or 2 finding from a materially different version of the product is Class 8 now. Cite the version alongside the evidence.

**Evidence lives with the record.** Recordings, screenshots, and measurements attach to the review record (§15). Evidence that exists only in a chat thread has not been captured; it has been mentioned, and it will be gone in a year.

## The proportionality clause

Evidence requirements scale with reversibility, not size (§1).

- A copy tweak behind a feature flag: Class 7 or 8 is fine.
- A new flow in the primary workflow: Class 1 or 3, no exceptions.
- Anything touching §8: **Class 3 always.** This is the one row with no proportionality, for the same reason §8 has no proportionality clause.

---

# 18. Escalation

## Why this section exists

Most design processes have no defined conflict resolution, so conflicts resolve by the mechanisms that operate in the absence of rules: seniority, persistence, proximity to the deadline, and who is in the room. Each of those produces decisions that are locally survivable and collectively incoherent — which is the exact failure this document was written to prevent.

An escalation path is also what makes the reviewer roles safe to hold. **A reviewer who knows their block will be adjudicated rather than resented will raise it.** A reviewer who expects to be worn down will start letting things pass, and their role will decay into a formality long before anyone notices.

## The precedence order

When two valid findings conflict and both cannot be satisfied, resolve by rank. **Lower rank wins. This ordering is binding and is not subject to the Approver's discretion.**

**Rank 1 — Safety, legality, and accessibility.**
Claim boundaries (Bible Ch. 2), protected-characteristic handling, data stewardship, and the §11 accessibility floor. *Why first:* these are not trade-offs. Each represents a harm to someone outside the company, incurred to benefit someone inside it. No amount of product value on the other side of the scale changes the answer, and pretending to weigh it wastes the discussion.

**Rank 2 — Interface honesty and AI accountability.**
The §8 gates, §7.8, and §14 F1–F7. *Why second:* these are the claims the company is built on (Bible Ch. 1, Ch. 2). A single shipped violation converts us into the category we positioned against, and the damage is not proportional to the size of the violation. Commercial pressure here is strongest and best-argued, which is exactly why it needs to sit above the Approver.

**Rank 3 — Clarity.**
Bible principle 5.1. *Why third:* the top principle of the Bible, subordinate here only to harms and to the honesty claims that constitute the product. Where clarity conflicts with consistency, beauty, effort, or schedule, clarity wins.

**Rank 4 — Correct product decision.**
§3. Does it serve a decision, reduce total load, keep the human deciding. *Why above craft:* perfect execution of the wrong thing is a net negative — cost plus permanent maintenance (§15, weighting rationale).

**Rank 5 — User effort.**
§5. The realized value of the product, subordinate only to whether the thing should exist.

**Rank 6 — Structural integrity.**
§4 and §13. Ranked here for compounding cost rather than immediate impact: IA and scalability failures are cheap now and expensive at every later point.

**Rank 7 — Craft.**
§6, §7. Enormously important to perceived quality and genuinely subordinate to everything above it — a sound structure poorly styled is fixable; the reverse is not.

**Rank 8 — Implementation cost.**
§12. A real constraint and the last one to win an argument. Cost changes *what we can afford this quarter*; it does not change *what is right*, and conflating the two is how products become the shape of their sprint capacity.

**Two things this ordering does not license.** It is not a ladder to climb for advantage — invoking Rank 1 on a taste disagreement is a misuse serious enough to warrant naming. And it applies only to genuine conflicts between *valid* findings; it never converts an unevidenced opinion into a winner.

## The resolution path

**Level 0 — Author and reviewer, directly.**
Where nearly everything resolves, and it usually resolves because one party learns something. The reviewer's obligation: cite the checkpoint and produce evidence (§17). The author's obligation: answer the checkpoint, not the person.
**Time limit: one exchange.** A disagreement that survives one round of clarification is a real disagreement and gets escalated rather than repeated. Extended back-and-forth is how disputes get settled by exhaustion, which selects for stamina rather than correctness.

**Level 1 — Stage owner (§16).**
The owner of the stage the finding sits in decides. If the finding sits in their own stage and they are a party to it, skip to Level 2.
Most escalations end here, and the decision is recorded with its evidence.

**Level 2 — Precedence, applied.**
Where two stage owners conflict — a §6 finding against a §5 finding, a §12 cost against a §3 requirement — apply the precedence order above. **This is usually mechanical and requires no adjudicator**, which is the entire point of writing the order down in advance rather than discovering it under deadline.

**Level 3 — Approver.**
For conflicts precedence doesn't settle: two findings at the same rank, or a genuine judgment call about cost versus value. The Approver decides and **records the decision as an accepted trade-off**, naming what was given up.
The Approver may not resolve a Rank 1 or Rank 2 conflict in favor of the higher rank. Those are gates; they are not available to be traded, and an Approver being lobbied to trade one should say so out loud.

**Level 4 — Premise dispute.**
Sometimes the disagreement is not about the artifact but about whether a principle is right. **This does not belong in a design review, and attempting to settle it there will produce a bad decision on both questions.**
Resolution: ship under the current principle, and open an amendment (Bible Ch. 15) as separate work with written reasoning and a date. The person who lost the review may be right about the principle; that is a different conversation, and it deserves to be had properly rather than at the end of a sprint.

## Documenting a trade-off

Every escalation resolved above Level 0 produces a trade-off entry in the review record (§15). Six fields:

1. **The conflict** — the two findings, each with its checkpoint.
2. **The evidence** — what each side produced, with class (§17).
3. **The resolution** — what we chose.
4. **The rationale** — why, referencing precedence rank or the judgment made.
5. **What we gave up** — stated plainly. **The field most often left vague and the one that carries all the future value.** "Accepted higher scan cost on the candidate list" is useful; "balanced the trade-offs" is not.
6. **Revisit condition** — what would make us reconsider. Often "none." When it isn't, this is the field that prevents a temporary compromise from silently becoming permanent (§14 B5, I3).

## Failure modes of escalation itself

**Escalation as a threat.** Using the path to apply pressure rather than to resolve. The remedy is that escalation is *normal and expected* — a process with zero escalations is not harmonious, it is one where people have learned not to raise things.

**Escalating to exhaust.** Re-raising a settled question hoping for a different answer at a worse moment. A resolved trade-off is closed absent new evidence, and "new evidence" means Class 1–6 (§17), not renewed conviction.

**Never escalating.** The most damaging and the least visible. Findings get quietly dropped near a deadline, the record says approved, and the defect ships with no trace of anyone having noticed. **A withdrawn finding should be recorded as withdrawn, with the reason.** This costs one line and is the single cheapest protection against the version of this process that looks healthy and isn't.

---

## Appendix A — The short form

For a fast self-review or a live critique. Not a substitute for the full document.

1. **Should this exist?** Name the decision it improves. Name what it makes worse.
2. **Does it increase confidence, not just speed?**
3. **Is the cognitive load actually lower, or just relocated?**
4. **Does it fit the mental model — and is there exactly one of it?**
5. **Are all the states designed?** Empty, loading, partial, error, denied.
6. **One focal point. Weight matches importance. Every element earns its place.**
7. **Does every animation explain something? Does it end?**
8. **Is every AI output traceable? Is confidence visible? Can the user disagree easily?**
9. **What limitation did we volunteer?**
10. **Keyboard, focus, contrast, reduced motion — all four, no exceptions.**
11. **Real data, real density, both themes, 200% zoom.**
12. **Would this look deliberate in five years, or just current?**
13. **Could this be dropped onto a competitor's product unchanged?** If yes, it says nothing about us.
14. **What evidence backs each verdict?** (§17) A block without evidence is a comment.
15. **What did we give up, and would we reconsider?** (§18) Write it down or it will be re-argued in a year.

## Appendix B — Reviewer's phrasebook

Language that keeps reviews about the work rather than the person. Small thing; it determines whether people submit work early or hide it until it's too late to change.

| Instead of | Say |
|---|---|
| "This is confusing." | "I lost the thread at ___ — what's the intended reading order?" |
| "I'd have used a table here." | "What did the table option cost that made cards better?" |
| "This animation is annoying." | "What does this explain? §7.1." |
| "Needs more whitespace." | "The grouping isn't reading — the gaps within the group match the gaps between groups. §6.3." |
| "This doesn't feel premium." | "Which principle is it missing?" — and if you can't name one, say nothing. |
| "Add a tooltip." | "The tooltip is patching a clarity failure. §14 C2." |
| "Not sure about this." | Either find the principle or drop it. Unattributed doubt is noise with authority behind it. |

---

## Appendix C — How to Review AI-Generated Design Work

*One page. Applies to output from Claude Code, Stitch, Cursor, Lovable, v0, Figma Make, and whatever replaces them. The tools will change; the failure modes are properties of how these systems work, and will not.*

### The one thing to internalize

**Generated work arrives at high fidelity regardless of how much thinking went into it.**

Human work carries an honest signal of its own maturity. A rough sketch looks rough, and reviewers correctly respond to it with structural questions. A polished mockup looks resolved, and reviewers correctly respond with craft questions. That correlation between appearance and depth is something reviewers have relied on for their entire careers, unconsciously, and **generated work severs it completely.** A model produces a pixel-perfect, well-spaced, correctly-contrasted screen for a flow nobody has thought about.

The consequence is a systematic misroute: polished output triggers Stage 4 instincts and silently skips Stages 1–3 — the exact sequence inversion §2 exists to prevent, arriving at ten times the previous volume (§14 J5).

**The rule that follows: fidelity is not evidence of stage.** When reviewing generated work, run Stages 1–3 explicitly, out loud, before looking at the surface. Where possible, review the *description* of the work before the image of it.

### The six failure modes

**1. The statistically likely layout.** (§14 J1)
Models emit the center of their training distribution. For UI, that center is the B2B SaaS template — hero, three-column feature grid, card list, accent-colored CTA. It is competent, conventional, and interchangeable.
*Detect:* could this be dropped onto a competitor's product with only a copy swap? Reject on yes, regardless of execution quality. Also check §14 D2 specifically — the three-column grid is the single most over-generated pattern in existence.

**2. Requirements satisfied literally.** (§14 J2)
The specification is met; the purpose is missed. Uniquely hard to reject, because you asked for it and received it — your own brief is the defense.
*Detect:* set the brief aside. Evaluate against §3.1: what decision does this improve? If the artifact satisfies the words and not the goal, the brief was incomplete and the artifact is still wrong.

**3. Confident invention.** (§14 J4)
A token, component, prop, endpoint, or design rule that doesn't exist, asserted in exactly the register as everything correct. Usually *plausible* — often something we arguably should have — which is what makes it slip through.
*Detect:* verify every named token, component, and API reference against the source of truth. Every time, including when the model has been right all session. Especially then.

**4. Parallel reimplementation.** (§14 J3)
A clean new implementation of something the codebase already has. Reading unfamiliar code is harder for a model than writing fresh code, and fresh code works in isolation.
*Detect:* search for the capability before accepting a new implementation. Does the change use existing utilities and match surrounding conventions (§12.8)?

**5. Happy-path completeness.**
Generated flows are complete along the path described and absent everywhere else — no empty, partial, error, denied, or low-confidence states, because those weren't in the prompt.
*Detect:* §5.7 and §8.2. Ask for the five states by name. Absence is the finding, and absence is what reviewers are worst at noticing (§14 C5).

**6. Demo data by default.**
Three tidy rows, short names, complete fields. Models generate exemplary content because exemplary content is what illustrates a concept.
*Detect:* §14 C3. Return for realistic worst-case data before reviewing anything else. Every §6 finding made against tidy data is a finding about a product that doesn't exist.

### What generated work is genuinely good at

Not a disclaimer — reviewer calibration. Blanket suspicion wastes the tool and blanket trust wastes the process.

**Reliable:** mechanical consistency (spacing scales, token application, naming conventions), breadth (states and variants, once explicitly asked for), first-draft structure to react to, and catching its own violations when handed a specific checkpoint.

**Unreliable:** deciding what should exist, knowing what it doesn't know, resisting the conventional solution, and judging its own output's originality.

**The productive division:** use generated work for *coverage*, use human judgment for *selection*. A model producing five options is useful; a model producing the recommended one is a coin flip presented as a conclusion.

### Reviewing the prompt, not just the output

A distinctive move available only with generated work, and often the highest-leverage one. When output is wrong, the fault is usually upstream — an underspecified brief produced a statistically average answer, correctly.

Before rejecting, ask: **did the brief state the decision being improved, the constraints from the Bible, the states required, and the data conditions?** If not, the fix is a better brief, and rejecting the output without fixing the brief guarantees the next attempt fails identically.

**Record briefs that worked.** A brief that reliably produces reviewable output is reusable infrastructure and belongs alongside the design system, not in someone's history.

### Self-review instruction for agents

Any agent producing design work for Hirevo should verify, before presenting output:

1. **Stage 1 (§3):** the decision this improves is named. If it can't be, say so instead of proceeding.
2. **Generic check (§6.13):** would this be interchangeable with any B2B SaaS product? If yes, discard and try again from the principles, not from the pattern.
3. **States (§5.7):** empty, loading, partial, error, denied — present or explicitly flagged as out of scope.
4. **AI surfaces (§8):** traceability, a low-confidence rendering, a cheap override path, differentiated failure states. All present or the work is incomplete.
5. **Invention (§14 J4):** every token, component, and API reference verified to exist. **Uncertainty stated, not smoothed over** — this is the same standard §8 sets for the product, applied to the agent's own output, and it is not optional for a company whose entire positioning is calibrated confidence.
6. **Data (§14 C3):** realistic worst-case content, not exemplary content.
7. **Vocabulary (§10.5):** scanned against the banned list, including in interface strings.

**And the honesty clause:** an agent presenting work should state what it did not verify. A submission claiming completeness it can't support is the same defect as F7, committed by the tool instead of the product — and it will be caught the same way, by someone following a citation that doesn't resolve.

### The reviewer's posture

Not harsher than for human work. **Differently aimed.**

Human submissions most often fail on craft and are reviewed for concept adequately, because roughness prompts the question. Generated submissions most often fail on concept and are reviewed for craft, because polish suppresses it.

So: **spend your attention where the failures actually are.** For generated work, that means the first three stages, the states nobody asked for, and the question of whether this is the right thing at all — long before you look at the spacing, which is probably fine.

---

## Version History

| Version | Date | Status | Summary |
|---|---|---|---|
| **1.0** | 2026-07-25 | **Frozen** | Initial release. Sections 1–18, Appendices A–C. Establishes the eight-stage review sequence, five blocking gates, weighted scoring, the §14 anti-pattern catalog, role ownership and veto scope, evidence classes, and the escalation precedence order. |

### Status definitions

**Frozen** — the document is complete and binding as written. It is not a draft, and it is not revised in the course of using it.

**Change policy: amendments only.** No section is edited in place, and no section is silently rewritten. A change to this document is an *amendment*: an appended entry stating what changed, what it replaces, the reasoning, and the date. The superseded text remains legible.

**Why amendments rather than revisions.** The reasoning trail is worth more than a clean document. A future contributor needs to know not only what we require but what we used to require and why we stopped — otherwise the same argument is had again, from scratch, without the benefit of the first time it was settled (Bible Ch. 15).

### How to amend

1. **Establish that the disagreement is about a premise, not an artifact.** Escalation Level 4 (§18) is the route in. A review disagreement is not an amendment request.
2. **Write the case.** What is being changed, what replaces it, what the current text got wrong, and what evidence supports the change (§17 classes apply — an amendment argued from Class 8 alone is a preference).
3. **Name the consequences.** Which checkpoints, gates, weights, or roles are affected downstream. An amendment that touches a gate or a precedence rank requires explicit approval from the role holding that veto (§16).
4. **Version and record.** Minor version for clarifications and additions that change no verdict; major version for anything that would change how a past artifact was scored.

### Annual adherence review

Once a year, checked for **adherence, not currency** — the question is not whether the document is up to date but whether we actually follow it.

A principle consistently violated in practice means one of two things, and the review must decide which in writing: the practice is wrong and should be corrected, or the principle is wrong and should be amended. **What is not permitted is leaving it unresolved.** A rule everyone breaks is worse than no rule, because it makes cynics of the people who read the document and expected it to mean something (§15).

---

*Hirevo Design Review Checklist v1.0 — Frozen.*
*Amendments only. Every amendment carries written reasoning and a date.*
