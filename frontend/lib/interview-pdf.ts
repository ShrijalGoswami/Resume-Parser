/**
 * Export an interview pack as a recruiter-ready PDF.
 *
 * Dependency-free: renders a print-composed HTML document into a new window
 * and triggers the browser's print dialog (Save as PDF). Real selectable text,
 * never an image.
 *
 * This is designed as a DOCUMENT, not a printed webpage: a numbered-section
 * A4 report with a brand masthead, an at-a-glance decision band, question
 * cards with a fixed label column, working tables (write-in scorecard), a
 * running header from page 2, and a per-page attribution footer. Content is
 * everything `InterviewPack` carries — nothing is dropped for looks.
 */
import type { InterviewPack } from '@/types/interview';

function esc(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** For text placed inside CSS string literals (the running header). */
function cssString(s: string): string {
  return (s ?? '').replace(/[\\'"\n\r]/g, ' ');
}

function bullets(items: string[]): string {
  if (!items?.length) return '';
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
}

/** A label/value row inside a question card. Omitted entirely when empty. */
function row(label: string, valueHtml: string): string {
  return valueHtml ? `<div class="row"><div class="rl">${label}</div><div class="rv">${valueHtml}</div></div>` : '';
}

const FOCUS_LABELS: Record<string, string> = {
  blueprint: 'Full blueprint',
  technical: 'Technical focus',
  behavioral: 'Behavioral focus',
  leadership: 'Leadership focus',
  manager: 'Hiring-manager round',
  culture_fit: 'Culture fit',
  scorecard: 'Scorecard',
  followup: 'Follow-up',
};

export function exportInterviewPdf(pack: InterviewPack) {
  const es = pack.executive_summary;
  const st = pack.interview_strategy;
  const fr = pack.final_recommendation;
  const name = pack.candidate_name || 'Candidate';

  // ── Section bodies (only non-empty sections render; numbering is dynamic
  //    so the document never shows a gap like 01 → 03) ─────────────────────
  const technical = pack.technical_questions
    .map(
      (q, i) => `
      <article class="card">
        <div class="card-head">
          <span class="qn">T${i + 1}</span>
          <span class="qt">${esc(q.question)}</span>
          <span class="chips">${q.difficulty ? `<span class="chip">${esc(q.difficulty)}</span>` : ''}${q.skill ? `<span class="chip">${esc(q.skill)}</span>` : ''}</span>
        </div>
        ${row('Why ask', q.reason ? esc(q.reason) : '')}
        ${row('Strong answer', q.expected_answer ? esc(q.expected_answer) : '')}
        ${row('Red flags', bullets(q.red_flags))}
        ${row('Evaluate on', bullets(q.evaluation_criteria))}
        ${row('Follow-ups', bullets(q.followups))}
      </article>`,
    )
    .join('');

  const behavioral = pack.behavioral_questions
    .map(
      (q, i) => `
      <article class="card">
        <div class="card-head">
          <span class="qn">B${i + 1}</span>
          <span class="qt">${esc(q.question)}</span>
          <span class="chips">${q.competency ? `<span class="chip">${esc(q.competency)}</span>` : ''}</span>
        </div>
        ${row('Why ask', q.reason ? esc(q.reason) : '')}
        ${row('Strong answer', q.expected_answer ? esc(q.expected_answer) : '')}
        ${row('Warning signs', bullets(q.warning_signs))}
      </article>`,
    )
    .join('');

  const verification = pack.skill_verifications
    .map(
      (v) => `<tr>
        <td class="strong">${esc(v.skill)}</td>
        <td>${esc(v.verification_method)}${v.hands_on_exercise ? `<div class="cell-sub"><span class="cell-label">Exercise</span> ${esc(v.hands_on_exercise)}</div>` : ''}${v.discussion_topic ? `<div class="cell-sub"><span class="cell-label">Discuss</span> ${esc(v.discussion_topic)}</div>` : ''}</td>
        <td class="center">${esc(v.confidence_level)}</td>
      </tr>`,
    )
    .join('');

  const risks = pack.risks
    .map(
      (r) => `
      <article class="card">
        <div class="card-head"><span class="qt">${esc(r.category)}</span></div>
        ${row('Signal', r.detail ? esc(r.detail) : '')}
        ${row('Investigate', r.how_to_investigate ? esc(r.how_to_investigate) : '')}
      </article>`,
    )
    .join('');

  const scorecard = pack.scorecard
    .map((c) => {
      const w = Math.max(0, Math.min(100, c.weight || 0));
      const focus = [c.suggested_focus, c.notes].filter(Boolean).map(esc).join(' — ');
      return `<tr>
        <td class="strong">${esc(c.category)}</td>
        <td class="weight"><span class="bar" style="width:${w}%"></span><span class="wnum">${w}</span></td>
        <td>${focus}</td>
        <td class="write-in"></td>
      </tr>`;
    })
    .join('');

  const stages = st.stages
    .map(
      (s, i) => `<tr>
        <td class="center muted">${i + 1}</td>
        <td class="strong">${esc(s.name)}</td>
        <td class="center">${s.duration_minutes ? `${s.duration_minutes} min` : '—'}</td>
        <td>${esc(s.focus || '')}</td>
      </tr>`,
    )
    .join('');

  const exportedOn = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const focusLabel = FOCUS_LABELS[pack.focus] || pack.focus || '';

  // At-a-glance decision band — only cells with data render.
  const glance = [
    fr.recommendation ? `<div class="stat"><div class="stat-l">Recommendation</div><div class="stat-v"><span class="verdict v-${esc(fr.recommendation).toLowerCase().replace(/[^a-z]+/g, '-')}">${esc(fr.recommendation)}</span></div></div>` : '',
    st.recommended_duration_minutes ? `<div class="stat"><div class="stat-l">Duration</div><div class="stat-v">${st.recommended_duration_minutes} min</div></div>` : '',
    pack.technical_questions.length ? `<div class="stat"><div class="stat-l">Technical</div><div class="stat-v">${pack.technical_questions.length} questions</div></div>` : '',
    pack.behavioral_questions.length ? `<div class="stat"><div class="stat-l">Behavioral</div><div class="stat-v">${pack.behavioral_questions.length} questions</div></div>` : '',
    pack.risks.length ? `<div class="stat"><div class="stat-l">Risks flagged</div><div class="stat-v">${pack.risks.length}</div></div>` : '',
  ].filter(Boolean).join('');

  // Dynamic section numbering over non-empty sections.
  let n = 0;
  const sec = (title: string, bodyHtml: string, cls = ''): string => {
    if (!bodyHtml) return '';
    n += 1;
    return `
    <section class="${cls}">
      <div class="sec-head"><span class="sec-n">${String(n).padStart(2, '0')}</span><span class="sec-t">${title}</span></div>
      ${bodyHtml}
    </section>`;
  };

  const summaryBody = [
    es.who ? `<p class="lede">${esc(es.who)}</p>` : '',
    es.why_shortlisted ? row('Why shortlisted', esc(es.why_shortlisted)) : '',
    es.key_differentiators?.length ? row('Differentiators', bullets(es.key_differentiators)) : '',
  ].join('');

  const planBody = [
    st.suggested_interviewer_profile ? row('Interviewer', esc(st.suggested_interviewer_profile)) : '',
    stages ? `<table><thead><tr><th class="w-n">#</th><th>Stage</th><th class="w-time">Time</th><th>Focus</th></tr></thead><tbody>${stages}</tbody></table>` : '',
    st.priority_focus_areas?.length ? row('Priority focus', bullets(st.priority_focus_areas)) : '',
  ].join('');

  const recommendationBody = fr.recommendation || fr.reasoning || fr.uncertainty
    ? `<div class="panel">
        ${fr.recommendation ? `<p><span class="verdict v-${esc(fr.recommendation).toLowerCase().replace(/[^a-z]+/g, '-')}">${esc(fr.recommendation)}</span></p>` : ''}
        ${fr.reasoning ? `<p>${esc(fr.reasoning)}</p>` : ''}
        ${fr.uncertainty ? row('Uncertainty', esc(fr.uncertainty)) : ''}
      </div>`
    : '';

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Interview Pack — ${esc(name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    :root {
      --brand: #2563eb; --ink: #111827; --muted: #6b7280; --faint: #9ca3af;
      --line: #e5e7eb; --line-soft: #f1f5f9; --wash: #f8fafc;
    }
    body {
      font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      color: var(--ink); font-size: 10px; line-height: 1.5;
      margin: 40px auto; max-width: 720px; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      font-variant-numeric: tabular-nums;
    }
    /* Hirevo identity watermark: fixed elements repeat on every printed page;
       z-index -1 keeps it behind content. Deliberately near-invisible. */
    body::before {
      content: 'HIREVO'; position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 84px; font-weight: 700; letter-spacing: 0.18em;
      color: rgba(37, 99, 235, 0.035); z-index: -1; pointer-events: none;
    }

    /* ── Masthead ─────────────────────────────────────────────────────── */
    .brandbar { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
    .wordmark { font-size: 12px; font-weight: 800; letter-spacing: 0.22em; color: var(--brand); }
    .wordmark small { font-weight: 500; letter-spacing: 0.08em; color: var(--muted); text-transform: none; font-size: 9px; margin-left: 8px; }
    .brand-url { font-size: 8.5px; color: var(--faint); letter-spacing: 0.06em; }
    .titleblock { margin: 18px 0 0; }
    .kicker { font-size: 9px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--brand); }
    h1 { font-size: 24px; line-height: 1.12; letter-spacing: -0.015em; margin: 4px 0 6px; }
    .meta { font-size: 9px; color: var(--muted); letter-spacing: 0.02em; }
    .meta b { color: var(--ink); font-weight: 600; }

    /* ── At-a-glance decision band ────────────────────────────────────── */
    .glance { display: flex; border: 1px solid var(--line); border-radius: 4px; margin: 14px 0 0; background: var(--wash); }
    .stat { flex: 1 1 0; padding: 8px 10px; border-left: 1px solid var(--line); }
    .stat:first-child { border-left: 0; }
    .stat-l { font-size: 7.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }
    .stat-v { font-size: 11px; font-weight: 600; }

    /* ── Sections ─────────────────────────────────────────────────────── */
    section { margin-top: 16px; }
    .sec-head { display: flex; align-items: baseline; gap: 7px; border-bottom: 1px solid var(--line); padding-bottom: 4px; margin-bottom: 8px; }
    .sec-n { font-size: 10px; font-weight: 800; color: var(--brand); letter-spacing: 0.04em; }
    .sec-t { font-size: 10.5px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; }
    .lede { font-size: 10.5px; margin-bottom: 6px; }
    p { margin: 3px 0; }
    ul { margin: 1px 0 2px; padding-left: 14px; }
    li { margin: 1px 0; }

    /* Label-column rows: the document's core rhythm. */
    .row { display: grid; grid-template-columns: 74px 1fr; gap: 8px; padding: 3px 0; }
    .rl { font-size: 7.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); padding-top: 1.5px; }
    .rv { min-width: 0; }

    /* ── Question / risk cards ────────────────────────────────────────── */
    .card { border: 1px solid var(--line); border-radius: 4px; padding: 7px 10px 6px; margin: 6px 0; }
    .card .row { border-top: 1px solid var(--line-soft); }
    .card .row:first-of-type { border-top: 0; margin-top: 4px; }
    .card-head { display: flex; align-items: baseline; gap: 7px; }
    .qn { font-size: 9.5px; font-weight: 800; color: var(--brand); flex: none; }
    .qt { font-size: 10.5px; font-weight: 700; line-height: 1.35; min-width: 0; }
    /* Chips may WRAP as a group (long skill names must never push the card
       wider than the page); each individual chip stays on one line. */
    .chips { margin-left: auto; flex: 0 1 auto; padding-left: 8px; text-align: right; max-width: 42%; }
    .chip { display: inline-block; white-space: nowrap; border: 1px solid var(--line); border-radius: 3px; background: var(--wash); color: var(--muted); font-size: 7.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 1px 5px; margin-left: 3px; margin-bottom: 2px; vertical-align: 1px; }

    /* Horizontal-overflow guarantee: no un-breakable run (URL, model id,
       fenced token) may ever extend an element past the printable width. */
    .qt, .rv, .lede, .meta, .stat-v, td, th, li, p { overflow-wrap: anywhere; }

    /* ── Tables ───────────────────────────────────────────────────────── */
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin: 4px 0 2px; }
    thead { display: table-header-group; }
    th { font-size: 7.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--ink); background: #fff; }
    td { padding: 5px 8px; border-bottom: 1px solid var(--line-soft); vertical-align: top; }
    td.strong { font-weight: 600; }
    td.center, th.center { text-align: center; }
    td.muted { color: var(--muted); }
    th.w-n { width: 22px; } th.w-time { width: 52px; }
    .cell-sub { color: var(--muted); margin-top: 1px; }
    .cell-label { font-size: 7.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); margin-right: 3px; }
    td.weight { width: 96px; position: relative; }
    .bar { display: inline-block; height: 5px; background: var(--brand); opacity: 0.25; border-radius: 2px; max-width: 64px; vertical-align: middle; }
    .wnum { margin-left: 5px; font-weight: 600; }
    td.write-in { width: 70px; border-bottom: 1px solid var(--line-soft); background: repeating-linear-gradient(transparent, transparent 14px, var(--line) 14px, var(--line) 15px); }

    /* ── Verdicts / recommendation panel ─────────────────────────────── */
    .verdict { display: inline-block; border-radius: 3px; padding: 2.5px 9px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; border: 1px solid var(--line); background: var(--wash); }
    .v-strong-hire, .v-hire { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
    .v-borderline { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    .v-no-hire { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .panel { border: 1px solid var(--line); border-left: 3px solid var(--brand); border-radius: 4px; padding: 9px 12px; }
    .panel p { margin: 4px 0; }

    /* ── Print composition ────────────────────────────────────────────── */
    /* DETERMINISTIC MARGIN SAFEGUARD. The Chrome print dialog's Margins
       setting OVERRIDES the @page margins ("None" collapses them to 0 and
       drops the margin-box header/footer with them) — which is exactly how a
       real export shipped with content clipped on the physical left edge.
       So the safe area is split into two layers:
         1. @page margins — the polish layer: hosts the running header and the
            page-numbered footer when the dialog honours them ("Default").
         2. body PADDING — the guarantee layer: structural, part of content
            layout, untouchable by any dialog setting. Even at Margins: None
            every page keeps 8mm side / 4mm vertical insets, so nothing can
            ever sit on (or past) a physical edge.
       Under "Default" the layers stack: 14mm sides, 16mm top, 20mm bottom. */
    @page {
      size: A4;
      margin: 12mm 6mm 16mm;
      @top-left { content: 'Interview Pack — ${cssString(name)}'; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 8px; letter-spacing: 0.04em; color: #9ca3af; }
      @top-right { content: 'HIREVO'; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 8px; font-weight: 700; letter-spacing: 0.22em; color: #9ca3af; }
      @bottom-center { content: 'Generated by Hirevo · hirevo.in · Page ' counter(page); font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 8px; color: #9ca3af; }
    }
    @page :first {
      /* Page 1 carries the real masthead — no running header on top of it. */
      @top-left { content: none; }
      @top-right { content: none; }
    }
    @media print {
      body { margin: 0; max-width: none; padding: 4mm 8mm; }
      .brandbar, .titleblock, .sec-head, h1 { break-after: avoid; }
      .card, tr, .panel, .glance, .row { break-inside: avoid; }
      p, li { orphans: 3; widows: 3; }
      section { margin-top: 14px; }
    }
  </style></head><body>
    <header>
      <div class="brandbar">
        <span class="wordmark">HIREVO<small>Interview Intelligence</small></span>
        <span class="brand-url">hirevo.in</span>
      </div>
      <div class="titleblock">
        <div class="kicker">Interview Pack</div>
        <h1>${esc(name)}</h1>
        <p class="meta">Hirevo Interview Intelligence · hirevo.in · Exported ${esc(exportedOn)}${focusLabel ? ` · <b>${esc(focusLabel)}</b>` : ''} · Confidential${pack.degraded ? ' · deterministic fallback' : ''}</p>
      </div>
      ${glance ? `<div class="glance">${glance}</div>` : ''}
    </header>

    ${sec('Executive Summary', summaryBody)}
    ${sec('Interview Plan', planBody)}
    ${sec('Technical Questions', technical)}
    ${sec('Behavioral Questions', behavioral)}
    ${sec('Skill Verification', verification ? `<table><thead><tr><th>Skill</th><th>How to verify</th><th class="center">Confidence</th></tr></thead><tbody>${verification}</tbody></table>` : '')}
    ${sec('Risk Assessment', risks)}
    ${sec('Interviewer Scorecard', scorecard ? `<table><thead><tr><th>Category</th><th>Weight</th><th>Focus</th><th>Score</th></tr></thead><tbody>${scorecard}</tbody></table>` : '')}
    ${sec('Recommendation', recommendationBody)}
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  // Give the new document a tick to lay out before printing.
  setTimeout(() => w.print(), 350);
}
