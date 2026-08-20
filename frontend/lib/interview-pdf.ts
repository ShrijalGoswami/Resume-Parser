/**
 * Export an interview pack as a recruiter-ready PDF.
 *
 * Dependency-free: renders a clean, print-optimised HTML document into a new
 * window and triggers the browser's print dialog (Save as PDF). Suitable for
 * printing or sharing internally.
 */
import type { InterviewPack } from '@/types/interview';

function esc(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function list(items: string[]): string {
  if (!items?.length) return '';
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
}

export function exportInterviewPdf(pack: InterviewPack) {
  const es = pack.executive_summary;
  const st = pack.interview_strategy;
  const fr = pack.final_recommendation;

  const technical = pack.technical_questions
    .map(
      (q, i) => `
      <div class="q">
        <p class="qh"><b>T${i + 1}. ${esc(q.question)}</b> <span class="tag">${esc(q.difficulty)}</span>${q.skill ? ` <span class="tag alt">${esc(q.skill)}</span>` : ''}</p>
        ${q.reason ? `<p><i>Why:</i> ${esc(q.reason)}</p>` : ''}
        ${q.expected_answer ? `<p><i>Strong answer:</i> ${esc(q.expected_answer)}</p>` : ''}
        ${q.red_flags?.length ? `<p><i>Red flags:</i></p>${list(q.red_flags)}` : ''}
        ${q.evaluation_criteria?.length ? `<p><i>Evaluation:</i></p>${list(q.evaluation_criteria)}` : ''}
        ${q.followups?.length ? `<p><i>Follow-ups:</i></p>${list(q.followups)}` : ''}
      </div>`,
    )
    .join('');

  const behavioral = pack.behavioral_questions
    .map(
      (q, i) => `
      <div class="q">
        <p class="qh"><b>B${i + 1}. ${esc(q.question)}</b>${q.competency ? ` <span class="tag">${esc(q.competency)}</span>` : ''}</p>
        ${q.reason ? `<p><i>Why:</i> ${esc(q.reason)}</p>` : ''}
        ${q.expected_answer ? `<p><i>Strong answer:</i> ${esc(q.expected_answer)}</p>` : ''}
        ${q.warning_signs?.length ? `<p><i>Warning signs:</i></p>${list(q.warning_signs)}` : ''}
      </div>`,
    )
    .join('');

  const verification = pack.skill_verifications
    .map(
      (v) => `<tr><td><b>${esc(v.skill)}</b></td><td>${esc(v.verification_method)}${v.hands_on_exercise ? `<br/><i>Exercise:</i> ${esc(v.hands_on_exercise)}` : ''}</td><td>${esc(v.confidence_level)}</td></tr>`,
    )
    .join('');

  const risks = pack.risks
    .map((r) => `<div class="q"><p><b>${esc(r.category)}</b> — ${esc(r.detail)}</p>${r.how_to_investigate ? `<p><i>Investigate:</i> ${esc(r.how_to_investigate)}</p>` : ''}</div>`)
    .join('');

  const scorecard = pack.scorecard
    .map((c) => `<tr><td>${esc(c.category)}</td><td>${c.weight}</td><td>${esc(c.suggested_focus || c.notes || '')}</td><td class="score"></td></tr>`)
    .join('');

  const stages = st.stages
    .map((s) => `<li><b>${esc(s.name)}</b>${s.duration_minutes ? ` (${s.duration_minutes} min)` : ''}${s.focus ? ` — ${esc(s.focus)}` : ''}</li>`)
    .join('');

  const exportedOn = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Interview Pack — ${esc(pack.candidate_name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 32px auto; max-width: 780px; line-height: 1.5; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    /* Hirevo export identity: fixed elements repeat on every printed page, and
       z-index -1 keeps the watermark behind the content, never over it. Kept
       deliberately faint — recognizable branding, not a design element. */
    body::before { content: 'HIREVO'; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 84px; font-weight: 700; letter-spacing: 0.18em; color: rgba(37, 99, 235, 0.035); z-index: -1; pointer-events: none; }

    /* ── Document hierarchy ─────────────────────────────────────────── */
    .doc-head { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 18px; }
    h1 { font-size: 23px; margin: 0 0 4px; letter-spacing: -0.01em; }
    .sub { color: #64748b; font-size: 11.5px; margin: 0; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; color: #0f172a; }
    p { margin: 4px 0; }
    ul { margin: 4px 0 8px 18px; padding: 0; }
    .q { border-left: 3px solid #e5e7eb; padding: 4px 0 4px 10px; margin: 10px 0; }
    .qh { font-size: 13.5px; }
    .tag { display: inline-block; background: #eef2ff; color: #4338ca; border-radius: 4px; padding: 1px 6px; font-size: 11px; margin-left: 4px; }
    .tag.alt { background: #ecfdf5; color: #047857; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 6px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f9fafb; }
    thead { display: table-header-group; } /* column headers repeat after a table splits across pages */
    td.score { width: 80px; }
    .rec { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 6px; padding: 4px 10px; font-weight: 600; font-size: 13px; }

    /* ── Print composition ──────────────────────────────────────────── */
    /* A4 page box owns ALL page margins; the body contributes none in print,
       so content can never reach a physical edge and the footer margin box
       always sits inside the printable area. (Margin boxes are Chromium;
       other engines fall back to the watermark + dated header attribution.) */
    @page {
      size: A4;
      margin: 18mm 16mm 22mm;
      @bottom-center { content: 'Generated by Hirevo · hirevo.in · Page ' counter(page); font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 9px; color: #64748b; }
    }
    @media print {
      body { margin: 0; max-width: none; }
      /* Headings never strand at the bottom of a page without their content. */
      h1, h2, .doc-head { break-after: avoid; }
      h2 { break-before: auto; }
      /* Question blocks, table rows and the recommendation move whole to the
         next page instead of being sliced; long sections and long tables still
         paginate naturally because nothing forbids breaks BETWEEN blocks. */
      .q, tr, .rec-block, .doc-head { break-inside: avoid; }
      p, li { orphans: 3; widows: 3; }
    }
  </style></head><body>
    <header class="doc-head">
      <h1>Interview Pack — ${esc(pack.candidate_name)}</h1>
      <p class="sub">Hirevo Interview Intelligence · hirevo.in · Exported ${esc(exportedOn)}${pack.degraded ? ' · deterministic fallback' : ''}</p>
    </header>

    <h2>Executive Summary</h2>
    ${es.who ? `<p>${esc(es.who)}</p>` : ''}
    ${es.why_shortlisted ? `<p><i>Why shortlisted:</i> ${esc(es.why_shortlisted)}</p>` : ''}
    ${es.key_differentiators?.length ? `<p><i>Key differentiators:</i></p>${list(es.key_differentiators)}` : ''}

    <h2>Interview Strategy</h2>
    ${st.recommended_duration_minutes ? `<p><i>Recommended duration:</i> ${st.recommended_duration_minutes} min</p>` : ''}
    ${st.suggested_interviewer_profile ? `<p><i>Interviewer:</i> ${esc(st.suggested_interviewer_profile)}</p>` : ''}
    ${stages ? `<p><i>Stages:</i></p><ul>${stages}</ul>` : ''}
    ${st.priority_focus_areas?.length ? `<p><i>Priority focus:</i></p>${list(st.priority_focus_areas)}` : ''}

    ${technical ? `<h2>Technical Questions</h2>${technical}` : ''}
    ${behavioral ? `<h2>Behavioral Questions</h2>${behavioral}` : ''}
    ${verification ? `<h2>Skill Verification</h2><table><thead><tr><th>Skill</th><th>How to verify</th><th>Confidence</th></tr></thead><tbody>${verification}</tbody></table>` : ''}
    ${risks ? `<h2>Risk Assessment</h2>${risks}` : ''}
    ${scorecard ? `<h2>Interviewer Scorecard</h2><table><thead><tr><th>Category</th><th>Weight</th><th>Focus</th><th>Score</th></tr></thead><tbody>${scorecard}</tbody></table>` : ''}

    <div class="rec-block">
      <h2>Final Recommendation</h2>
      ${fr.recommendation ? `<p><span class="rec">${esc(fr.recommendation)}</span></p>` : ''}
      ${fr.reasoning ? `<p>${esc(fr.reasoning)}</p>` : ''}
      ${fr.uncertainty ? `<p><i>Uncertainty:</i> ${esc(fr.uncertainty)}</p>` : ''}
    </div>
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  // Give the new document a tick to lay out before printing.
  setTimeout(() => w.print(), 350);
}
