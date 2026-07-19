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

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Interview Pack — ${esc(pack.candidate_name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 32px; line-height: 1.45; }
    h1 { font-size: 22px; margin: 0 0 2px; }
    h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 2px solid #eee; padding-bottom: 4px; color: #111; }
    .sub { color: #666; font-size: 13px; margin: 0 0 8px; }
    p { margin: 4px 0; font-size: 13px; }
    ul { margin: 4px 0 8px 18px; padding: 0; font-size: 13px; }
    .q { border-left: 3px solid #e5e7eb; padding: 4px 0 4px 10px; margin: 8px 0; }
    .qh { font-size: 13.5px; }
    .tag { display: inline-block; background: #eef2ff; color: #4338ca; border-radius: 4px; padding: 1px 6px; font-size: 11px; margin-left: 4px; }
    .tag.alt { background: #ecfdf5; color: #047857; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 6px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f9fafb; }
    td.score { width: 80px; }
    .rec { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 6px; padding: 4px 10px; font-weight: 600; font-size: 13px; }
    @media print { body { margin: 12mm; } h2 { break-after: avoid; } .q, tr { break-inside: avoid; } }
  </style></head><body>
    <h1>Interview Pack — ${esc(pack.candidate_name)}</h1>
    <p class="sub">HireLens Interview Intelligence${pack.degraded ? ' · deterministic fallback' : ''}</p>

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

    <h2>Final Recommendation</h2>
    ${fr.recommendation ? `<p><span class="rec">${esc(fr.recommendation)}</span></p>` : ''}
    ${fr.reasoning ? `<p>${esc(fr.reasoning)}</p>` : ''}
    ${fr.uncertainty ? `<p><i>Uncertainty:</i> ${esc(fr.uncertainty)}</p>` : ''}
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  // Give the new document a tick to lay out before printing.
  setTimeout(() => w.print(), 350);
}
