/**
 * Export an executive report as a recruiter-ready PDF (dependency-free print doc).
 */
import type { ExecutiveReport } from '@/types/report';

function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function list(items: string[]): string {
  return items?.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
}

export function exportReportPdf(report: ExecutiveReport) {
  const es = report.executive_summary;
  const m = report.metrics;
  const p = report.productivity;

  const kpis = `
    <div class="kpis">
      ${[
        ['Campaigns', `${m.total_campaigns} (${m.active_campaigns} active)`],
        ['Candidates', `${m.total_candidates}`],
        ['Analyzed', `${m.analyzed_candidates}`],
        ['Awaiting', `${m.awaiting_analysis}`],
        ['Avg match', `${m.average_match_score ?? '—'}`],
        ['High quality', `${m.high_quality_candidates}`],
      ].map(([k, v]) => `<div class="kpi"><div class="kl">${k}</div><div class="kv">${esc(String(v))}</div></div>`).join('')}
    </div>`;

  const campaigns = report.campaign_insights
    .map((c) => `<div class="q"><p><b>${esc(c.title)}</b> — ${esc(c.headline)}</p>${c.explanation ? `<p>${esc(c.explanation)}</p>` : ''}${list(c.concerns)}</div>`)
    .join('');

  const risks = report.hiring_risks
    .map((r) => `<div class="q"><p><b>${esc(r.category)}</b></p><p><i>Evidence:</i> ${esc(r.evidence)}</p><p><i>Impact:</i> ${esc(r.impact)}</p><p><i>Action:</i> ${esc(r.suggested_action)}</p></div>`)
    .join('');

  const recs = report.recommendations
    .map((r) => `<div class="q"><p><span class="tag">${esc(r.priority)}</span> <b>${esc(r.title)}</b></p>${r.rationale ? `<p>${esc(r.rationale)}</p>` : ''}${r.evidence ? `<p><i>Evidence:</i> ${esc(r.evidence)}</p>` : ''}</div>`)
    .join('');

  const tech = report.talent_snapshot.top_technologies.map((t) => `${esc(t.skill)} (${t.count})`).join(', ');
  const gaps = report.talent_snapshot.common_missing_skills.map((t) => `${esc(t.skill)} (${t.count})`).join(', ');

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Executive Hiring Report</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#1a1a1a; margin:32px; line-height:1.45; }
    h1 { font-size:22px; margin:0 0 2px; } h2 { font-size:15px; margin:22px 0 8px; border-bottom:2px solid #eee; padding-bottom:4px; }
    .sub { color:#666; font-size:13px; margin:0 0 10px; }
    .health { display:inline-block; border-radius:6px; padding:3px 10px; font-weight:600; font-size:13px; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; }
    p { margin:4px 0; font-size:13px; } ul { margin:4px 0 8px 18px; font-size:13px; }
    .q { border-left:3px solid #e5e7eb; padding:4px 0 4px 10px; margin:8px 0; }
    .tag { display:inline-block; background:#eef2ff; color:#4338ca; border-radius:4px; padding:1px 6px; font-size:11px; }
    .kpis { display:flex; flex-wrap:wrap; gap:8px; margin:8px 0; }
    .kpi { border:1px solid #e5e7eb; border-radius:8px; padding:6px 12px; min-width:110px; }
    .kl { font-size:11px; color:#666; text-transform:uppercase; } .kv { font-size:16px; font-weight:700; }
    @media print { body { margin:12mm; } .q, .kpi { break-inside:avoid; } }
  </style></head><body>
    <h1>Executive Hiring Intelligence</h1>
    <p class="sub">HireLens${report.degraded ? ' · metrics-only (AI narrative unavailable)' : ''}</p>

    <h2>Executive Summary</h2>
    ${es.headline ? `<p><b>${esc(es.headline)}</b></p>` : ''}
    ${es.pipeline_health ? `<p><span class="health">Pipeline: ${esc(es.pipeline_health)}</span></p>` : ''}
    ${kpis}
    ${es.whats_changed?.length ? `<p><i>What changed:</i></p>${list(es.whats_changed)}` : ''}
    ${es.blockers?.length ? `<p><i>Blockers:</i></p>${list(es.blockers)}` : ''}
    ${es.immediate_attention?.length ? `<p><i>Immediate attention:</i></p>${list(es.immediate_attention)}` : ''}

    ${campaigns ? `<h2>Campaign Intelligence</h2>${campaigns}` : ''}

    <h2>Recruiter Productivity</h2>
    <p>Resumes uploaded ${p.resumes_uploaded} · Analyzed ${p.candidates_analyzed} · Comparisons ${p.comparisons_run} · Interview packs ${p.interview_packs_generated} · Copilot ${p.copilot_messages} · Stage changes ${p.stage_changes} · Notes ${p.notes_added}</p>
    ${list(report.productivity_recommendations)}

    <h2>Skill Gap Intelligence</h2>
    ${report.skill_gap_analysis.summary ? `<p>${esc(report.skill_gap_analysis.summary)}</p>` : ''}
    ${report.skill_gap_analysis.emerging_demand?.length ? `<p><i>Emerging demand:</i></p>${list(report.skill_gap_analysis.emerging_demand)}` : ''}
    ${report.skill_gap_analysis.hard_to_fill_roles?.length ? `<p><i>Hard to fill:</i></p>${list(report.skill_gap_analysis.hard_to_fill_roles)}` : ''}

    ${risks ? `<h2>Hiring Risks</h2>${risks}` : ''}
    ${recs ? `<h2>AI Recommendations</h2>${recs}` : ''}

    <h2>Talent Snapshot (internal data)</h2>
    ${tech ? `<p><i>Most common technologies:</i> ${tech}</p>` : ''}
    ${gaps ? `<p><i>Most common gaps:</i> ${gaps}</p>` : ''}
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}
