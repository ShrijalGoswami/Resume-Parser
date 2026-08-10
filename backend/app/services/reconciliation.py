"""
Reconcile LLM output against what the parser actually extracted (M-4).

THE PROBLEM
-----------
The audit found the model asserting absences that its own input contradicted:

    skills:         [... "React", "Typescript" ...]
    missing_skills: ["React and TypeScript for internal tooling"]

    résumé:     "payment reconciliation engine processing 4M transactions per day"
    weaknesses: ["No mention of experience with high-throughput transaction
                 processing at scale"]

For a product that decides who gets interviewed, this is not a cosmetic defect.
`missing_skills` is an input to `compute_candidate_score`, so a phantom absence
does not merely display wrong — it lowers the candidate's rank.

WHY THIS IS CODE AND NOT A PROMPT
---------------------------------
A prompt lowers the probability of a contradiction. It cannot remove it. The
parser is already the source of truth for what the résumé contains, so whether a
skill is present is a question with a deterministic answer and does not need to
be asked of a model at all. Prompts are left untouched: the model reasons as it
always did, and this layer only deletes claims that its own input refutes.

WHAT THIS DELIBERATELY DOES NOT DO
----------------------------------
* It never adds anything. No invented strengths, no rewritten sentences.
* It never edits text. A contradicted entry is dropped whole — partial rewriting
  would put words in the model's mouth, and a half-edited sentence reads worse
  than either version.
* It only removes STRONG absence claims ("no", "lacks", "missing", "not
  mentioned"). "Limited experience with GraphQL" survives even when GraphQL was
  extracted: that is a judgement about depth, not a claim of absence, and the
  model is entitled to it.
* It reconciles a category only when the parser actually produced facts for that
  category. An empty extraction is uncertainty, not evidence of absence, so the
  model's output is left alone.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Iterable, Optional

from app.nlp.skill_normalizer import CANONICAL_MAPPING
from app.nlp.skills_vocab import SKILL_VOCAB

logger = logging.getLogger(__name__)

# ── Canonical matching keys ─────────────────────────────────────────────────
# `skill_normalizer.CANONICAL_MAPPING` exists for DISPLAY — it title-cases and
# sorts. Equality needs something stricter, because "React.js", "reactjs" and
# "React" are the same skill and must not read as three. So punctuation and
# spacing are erased entirely and a small alias table folds the remaining
# spellings together.
#
# Aliases only, never fuzzy matching: an edit-distance match would eventually
# equate "Java" with "JavaScript" and silently suppress a real gap, which is the
# failure this whole module exists to prevent — just pointing the other way.
_EXTRA_ALIASES = {
    "reactjs": "react",
    "react js": "react",
    "nodejs": "node",
    "node js": "node",
    "js": "javascript",
    "ts": "typescript",
    "postgres": "postgresql",
    "psql": "postgresql",
    "c plus plus": "c++",
    "cpp": "c++",
    "golang": "go",
    "k8s": "kubernetes",
    "gql": "graphql",
    "dotnet": ".net",
    "objective c": "objectivec",
    "restful": "rest",
    "rest api": "rest",
    "rest apis": "rest",
}

#: Built once from the display mapping so the two never drift apart.
_ALIASES: dict[str, str] = {
    **{k.lower(): v.lower() for k, v in CANONICAL_MAPPING.items()},
    **_EXTRA_ALIASES,
}

_PUNCT_RE = re.compile(r"[^a-z0-9+#]+")


def canonical_skill_key(value: str) -> str:
    """A comparison key: case-, spacing- and punctuation-insensitive.

    "React.js", " react js ", "REACTJS" and "React" all collapse to "react".
    `+` and `#` survive so C++ and C# stay distinct from C.
    """
    if not value:
        return ""
    lowered = value.strip().lower()
    # Alias lookup happens before AND after punctuation stripping: the table has
    # both spaced ("c plus plus") and compact ("cpp") spellings.
    lowered = _ALIASES.get(lowered, lowered)
    stripped = _PUNCT_RE.sub("", lowered)
    return _PUNCT_RE.sub("", _ALIASES.get(stripped, stripped))


def _keys(values: Iterable[str]) -> set[str]:
    return {k for k in (canonical_skill_key(v) for v in values or []) if k}


#: Every skill spelling we recognise, as comparison keys. Used to tell a
#: slash/"or"-joined claim that lists DISTINCT alternatives ("PyTorch/TensorFlow",
#: "JavaScript/TypeScript") apart from a single token that merely contains a
#: slash ("CI/CD", "TCP/IP", "A/B testing"). Built from the shared vocabulary and
#: the display mapping so it tracks them automatically.
KNOWN_SKILL_KEYS: set[str] = (
    {canonical_skill_key(s) for s in SKILL_VOCAB}
    | {canonical_skill_key(v) for v in CANONICAL_MAPPING.values()}
    | {canonical_skill_key(k) for k in CANONICAL_MAPPING.keys()}
) - {""}

_OR_SEPARATOR_RE = re.compile(r"/|\bor\b", re.IGNORECASE)


def _is_or_alternatives(claim: str, named_keys: set[str]) -> bool:
    """True when the claim joins DISTINCT alternative skills with a slash or
    "or" — so satisfying ANY one refutes the whole claim. False for a single
    skill that just happens to contain a slash (CI/CD, TCP/IP), which stays an
    all-tokens-required claim and is matched whole."""
    if not _OR_SEPARATOR_RE.search(claim or ""):
        return False
    # Only OR when every part is independently a recognised skill; that is what
    # separates "PyTorch/TensorFlow" (both real) from "CI/CD" (fragments).
    return len(named_keys) >= 2 and named_keys.issubset(KNOWN_SKILL_KEYS)


# ── Absence claims ──────────────────────────────────────────────────────────
# Only phrases that assert a fact is ABSENT. Degree judgements ("limited",
# "basic", "could be stronger") are opinions the model may hold about something
# that is demonstrably present, and are left alone.
_ABSENCE_RE = re.compile(
    r"\b("
    r"no\s+(?:clear\s+|direct\s+|explicit\s+|demonstrated\s+|significant\s+)?"
    r"(?:mention|evidence|experience|exposure|background|history|record)"
    r"|not\s+mentioned|no\s+mention"
    r"|lacks?\b|lack\s+of"
    r"|missing\b|absent\b"
    r"|does\s+not\s+(?:have|mention|demonstrate|show)"
    r"|doesn't\s+(?:have|mention|demonstrate|show)"
    r"|never\s+(?:mentions|demonstrates)"
    r"|without\s+any"
    r")",
    re.IGNORECASE,
)

#: Facts shorter than this are not matched inside free text. "C", "R" and "Go"
#: appear inside ordinary words and would make almost any sentence look like a
#: contradiction. They are still matched exactly in `missing_skills`, where the
#: comparison is key equality rather than a text search.
_MIN_TEXT_MATCH_LEN = 3


#: Prepositions that begin a qualifier rather than another skill. The model
#: writes "TypeScript for internal tooling" and "Docker in production"; the
#: qualifier is commentary and must not become part of the skill's identity, or
#: the name never matches what the parser extracted.
_QUALIFIER_RE = re.compile(r"\s+(?:for|in|with|at|on|to|across|during|within)\s+.*$", re.I)
#: Leading framing the model adds around the skill name itself.
_CLAIM_PREFIX_RE = re.compile(
    r"^\s*(?:no|clear|direct|explicit|demonstrated|significant|any)?\s*"
    r"(?:experience|exposure|background|knowledge|familiarity|skills?)\s+"
    r"(?:with|in|of|using)\s+",
    re.I,
)


def _claim_skill_tokens(claim: str) -> list[str]:
    """The skill names a `missing_skills` entry actually asserts are absent.

    Splitting is conservative and syntactic — conjunctions and list punctuation
    only. Deliberately not fuzzy: an approximate match would eventually equate
    "Java" with "JavaScript" and delete a real gap.
    """
    text = _CLAIM_PREFIX_RE.sub("", claim or "")
    tokens = []
    for part in re.split(r"\band\b|\bor\b|[,/;]", text):
        part = _QUALIFIER_RE.sub("", part).strip(" .-()")
        if part:
            tokens.append(part)
    return tokens


@dataclass
class ReconciliationReport:
    """What was removed, for the log. Empty means the model agreed with itself."""

    removed_missing_skills: list[str] = field(default_factory=list)
    removed_weaknesses: list[str] = field(default_factory=list)

    @property
    def changed(self) -> bool:
        return bool(self.removed_missing_skills or self.removed_weaknesses)


def _extracted_facts(resume_data: Any) -> dict[str, list[str]]:
    """Structured facts the parser is confident enough to have emitted.

    A category the parser left empty is omitted entirely — that is uncertainty,
    and reconciling against it would be asserting absence on no evidence.
    """
    facts: dict[str, list[str]] = {}

    skills = [s for s in (getattr(resume_data, "skills", None) or []) if s]
    if skills:
        facts["skills"] = skills

    certs = [c for c in (getattr(resume_data, "certifications", None) or []) if c]
    if certs:
        facts["certifications"] = certs

    companies, roles = [], []
    for e in getattr(resume_data, "experience", None) or []:
        company = (getattr(e, "company", "") or "").strip()
        role = (getattr(e, "role", "") or "").strip()
        if company:
            companies.append(company)
        if role:
            roles.append(role)
    if companies:
        facts["companies"] = companies
    if roles:
        facts["roles"] = roles

    degrees, institutions = [], []
    for ed in getattr(resume_data, "education", None) or []:
        degree = (getattr(ed, "degree", "") or "").strip()
        inst = (getattr(ed, "institution", "") or "").strip()
        if degree:
            degrees.append(degree)
        if inst:
            institutions.append(inst)
    if degrees:
        facts["degrees"] = degrees
    if institutions:
        facts["institutions"] = institutions

    projects = [
        (getattr(p, "title", "") or "").strip()
        for p in getattr(resume_data, "projects", None) or []
    ]
    projects = [p for p in projects if p]
    if projects:
        facts["projects"] = projects

    return facts


def _text_mentions(text: str, fact: str) -> bool:
    """Whether `text` names `fact`, on a word boundary and alias-aware."""
    fact = (fact or "").strip()
    if len(fact) < _MIN_TEXT_MATCH_LEN:
        return False
    # Compare on canonical keys so "React.js" in the résumé matches "ReactJS" in
    # the sentence; the boundary check runs on the raw spelling so "Go" cannot
    # match inside "Google".
    key = canonical_skill_key(fact)
    if not key or len(key) < _MIN_TEXT_MATCH_LEN:
        return False
    for token in {fact, key}:
        if re.search(rf"(?<![\w+#]){re.escape(token)}(?![\w+#])", text, re.IGNORECASE):
            return True
    # Alias spellings of the same fact (react → reactjs, react.js).
    for alias, target in _ALIASES.items():
        if target == key and len(alias) >= _MIN_TEXT_MATCH_LEN:
            if re.search(rf"(?<![\w+#]){re.escape(alias)}(?![\w+#])", text, re.IGNORECASE):
                return True
    return False


def reconcile_analysis(
    *,
    resume_data: Any,
    missing_skills: Optional[list[str]],
    weaknesses: Optional[list[str]],
) -> tuple[list[str], list[str], ReconciliationReport]:
    """Drop model claims that the parser's own extraction refutes.

    Returns `(missing_skills, weaknesses, report)`. Both lists are new objects;
    nothing is mutated in place, and nothing is ever added.
    """
    report = ReconciliationReport()
    facts = _extracted_facts(resume_data)
    kept_missing = list(missing_skills or [])
    kept_weaknesses = list(weaknesses or [])

    if not facts:
        # The parser extracted nothing structured. No evidence either way, so the
        # model's output stands.
        return kept_missing, kept_weaknesses, report

    # ── missing_skills: exact key equality against extracted skills ──────────
    skill_keys = _keys(facts.get("skills", []))
    if skill_keys:
        surviving = []
        for claim in kept_missing:
            claim_key = canonical_skill_key(claim)
            # A claim may name several skills and trail a qualifier: "React and
            # TypeScript for internal tooling". For an AND-list (comma/"and") the
            # claim is refuted only if EVERY skill it names was extracted — a
            # partial list still carries a real gap. For OR-alternatives joined by
            # a slash/"or" ("PyTorch/TensorFlow"), having ANY one satisfies it, so
            # it must not be treated as needing every token.
            named_keys = _keys(_claim_skill_tokens(claim))
            if _is_or_alternatives(claim, named_keys):
                satisfied = bool(named_keys & skill_keys)
            else:
                satisfied = bool(named_keys) and named_keys.issubset(skill_keys)
            refuted = (claim_key and claim_key in skill_keys) or satisfied
            if refuted:
                report.removed_missing_skills.append(claim)
            else:
                surviving.append(claim)
        kept_missing = surviving

    # ── weaknesses: only sentences that ASSERT absence of an extracted fact ──
    all_facts = [f for values in facts.values() for f in values]
    surviving_w = []
    for weakness in kept_weaknesses:
        if _ABSENCE_RE.search(weakness) and any(
            _text_mentions(weakness, fact) for fact in all_facts
        ):
            report.removed_weaknesses.append(weakness)
        else:
            surviving_w.append(weakness)
    kept_weaknesses = surviving_w

    if report.changed:
        logger.info(
            "Reconciliation: dropped %d missing-skill claim(s) and %d weakness(es) "
            "contradicted by the parser output.",
            len(report.removed_missing_skills),
            len(report.removed_weaknesses),
        )
    return kept_missing, kept_weaknesses, report
