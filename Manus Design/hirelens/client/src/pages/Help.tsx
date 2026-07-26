// HireLens Help Center — docs, support, feedback, release notes.
import { BookOpen, ExternalLink, LifeBuoy, MessageSquareHeart, Rocket, Search } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const docs = [
  {
    title: 'Getting started with campaigns',
    desc: 'Create your first hiring pipeline and configure AI screening in under 10 minutes.',
    category: 'Basics',
    body: `A campaign is a hiring pipeline for a single role. To create one, open Campaigns and click "New Campaign". Give it a role title, department, and a description — the description matters, because the AI calibrates its screening against it.\n\nOnce created, upload resumes from the campaign page or the Upload wizard. Each resume is parsed, analyzed, and scored within about 2 seconds. Candidates land in the Applied stage; you can move them through Screening, Interview, Offer, and Hired from the pipeline board.\n\nTips:\n• Write role descriptions with concrete requirements — "5+ years Python, event-driven systems" beats "strong engineer".\n• Enable auto-advance in campaign settings to fast-track candidates scoring 90+.\n• Pause a campaign anytime; nothing is deleted.`,
  },
  {
    title: 'Understanding AI evidence',
    desc: 'How HireLens extracts, cites, and scores resume evidence — and what confidence levels mean.',
    category: 'AI',
    body: `Every claim in a HireLens analysis is backed by a citation to the source resume passage. We never show a score without the evidence behind it.\n\nHow it works:\n1. The parser extracts structured facts (roles, dates, skills, outcomes) from the resume.\n2. Each fact is matched against the campaign's requirements.\n3. Strengths and risks are generated with direct quotes as evidence.\n\nConfidence levels:\n• High — claims are specific, quantified, and internally consistent.\n• Medium — claims are plausible but lack detail or verification signals.\n• Low — vague claims, inconsistencies, or very short work histories.\n\nA low-confidence 90 is worth less than a high-confidence 82. Always read the evidence, not just the number.`,
  },
  {
    title: 'Interview scorecards',
    desc: 'Run structured interviews with evidence-based scorecards and calibrated ratings.',
    category: 'Workflow',
    body: `Structured interviews beat unstructured ones on every predictive-validity study we know of. HireLens scorecards keep your panel honest.\n\nEach interview gets an AI-generated question kit targeting the candidate's specific evidence and flagged risks. After the interview, the interviewer fills a scorecard: per-dimension star ratings plus written observations.\n\nBest practices:\n• Submit scorecards within 24 hours — feedback quality drops measurably after that.\n• Rate dimensions independently; don't let one strong answer halo the rest.\n• Use the "advance / reject" decision only after the scorecard is complete.`,
  },
  {
    title: 'Team roles & permissions',
    desc: 'Admin, Recruiter, Hiring Manager, and Viewer — who can do what.',
    category: 'Admin',
    body: `HireLens has four roles:\n\n• Admin — full access: billing, API keys, member management, all campaigns.\n• Recruiter — create and manage campaigns, candidates, and AI analyses.\n• Hiring Manager — review assigned candidates, leave scorecards and structured feedback.\n• Viewer — read-only access to campaigns and anonymized analytics.\n\nChange roles from Settings → Team & Roles. Role changes take effect immediately. Every permission-relevant action is recorded in the audit log (Settings → Audit Log).`,
  },
  {
    title: 'API reference',
    desc: 'REST endpoints for candidates, campaigns, analyses, and webhooks.',
    category: 'Developers',
    body: `The HireLens REST API lets you integrate screening into your own systems.\n\nBase URL: https://api.hirelens.io/v1\n\nKey endpoints:\n• POST /candidates — create a candidate and queue analysis\n• GET /candidates/:id/analysis — retrieve evidence-based analysis\n• GET /campaigns — list campaigns with pipeline stats\n• POST /webhooks — subscribe to analysis.completed, candidate.stage_changed\n\nAuthenticate with a Bearer token from Settings → API Keys. Rate limit: 120 requests/min. All endpoints return JSON with cited evidence included.`,
  },
  {
    title: 'GDPR & data retention',
    desc: 'How candidate data is stored, anonymized, and deleted.',
    category: 'Security',
    body: `HireLens is GDPR and CCPA compliant by design.\n\n• Storage — candidate data is encrypted at rest (AES-256) and in transit (TLS 1.3).\n• Retention — default retention is 24 months after last activity; configurable per organization.\n• Right to erasure — deleting a candidate purges all derived analyses within 30 days, including backups.\n• Anonymized analytics — aggregate reports never contain personally identifiable information.\n• Sub-processors — a current list is available at hirelens.io/legal/subprocessors.\n\nFor a signed DPA, contact legal@hirelens.io.`,
  },
];

const releaseNotes = [
  { version: 'v2.4', date: 'Jul 21, 2026', notes: 'Comparison workspace now explains every dimension difference. Interview kits are generated per-candidate.' },
  { version: 'v2.3', date: 'Jul 8, 2026', notes: 'New analytics: department comparison and offer-acceptance tracking. Faster resume parsing (2.1s median).' },
  { version: 'v2.2', date: 'Jun 24, 2026', notes: 'Bulk actions on candidate table. Slack notifications for high-match candidates.' },
];

export default function Help() {
  const [query, setQuery] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [article, setArticle] = useState<(typeof docs)[number] | null>(null);

  const filteredDocs = docs.filter(
    (d) => query === '' || d.title.toLowerCase().includes(query.toLowerCase()) || d.desc.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppLayout title="Help Center">
      <div className="p-6 lg:p-8 max-w-[980px] mx-auto space-y-6">
        <div className="text-center py-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 6 }}>How can we help?</h2>
          <p className="text-sm text-foreground/60" style={{ marginBottom: 20 }}>Search the docs, contact support, or tell us what to build next.</p>
          <div className="relative max-w-md mx-auto">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documentation..." className="pl-9" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: BookOpen, title: 'Documentation', desc: 'Guides and reference', action: () => document.getElementById('docs-list')?.scrollIntoView({ behavior: 'smooth' }) },
            { icon: LifeBuoy, title: 'Contact support', desc: 'Median response: 2 hrs', action: () => toast.success('Support ticket started', { description: 'support@hirelens.io — we reply within 2 hours on business days.' }) },
            { icon: MessageSquareHeart, title: 'Share feedback', desc: 'Shape the roadmap', action: () => setFeedbackOpen(true) },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.title} onClick={c.action} className="rounded-xl border border-border bg-card p-5 text-left hover:border-accent/50 hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center mb-3">
                  <Icon size={17} className="text-foreground/60" />
                </div>
                <p className="text-sm font-semibold text-foreground" style={{ marginBottom: 2 }}>{c.title}</p>
                <p className="text-[13px] text-foreground/55" style={{ marginBottom: 0 }}>{c.desc}</p>
              </button>
            );
          })}
        </div>

        <div id="docs-list">
          <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 12 }}>Popular articles</h3>
          {filteredDocs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-14 text-center">
              <p className="text-sm text-foreground/50" style={{ marginBottom: 8 }}>No articles match "{query}".</p>
              <Button variant="outline" size="sm" onClick={() => setQuery('')}>Clear search</Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filteredDocs.map((d) => (
                <button
                  key={d.title}
                  onClick={() => setArticle(d)}
                  className="rounded-lg border border-border bg-card p-4 text-left hover:border-accent/50 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/50 uppercase tracking-wide">{d.category}</span>
                    <ExternalLink size={12} className="text-foreground/30 group-hover:text-accent transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-foreground" style={{ marginBottom: 3 }}>{d.title}</p>
                  <p className="text-[13px] text-foreground/55 leading-snug" style={{ marginBottom: 0 }}>{d.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Rocket size={15} className="text-foreground/50" />
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Release notes</h3>
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
            {releaseNotes.map((r) => (
              <div key={r.version} className="p-5 flex gap-4">
                <span className="font-mono text-[13px] font-semibold text-accent shrink-0 w-12">{r.version}</span>
                <div>
                  <p className="font-mono text-[11px] text-foreground/40" style={{ marginBottom: 3 }}>{r.date}</p>
                  <p className="text-[13px] text-foreground/70 leading-relaxed" style={{ marginBottom: 0 }}>{r.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share feedback</DialogTitle>
            <DialogDescription>Your input goes directly to the product team. Feature requests are triaged weekly.</DialogDescription>
          </DialogHeader>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="What would make HireLens better for you?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary"
              disabled={!feedback.trim()}
              onClick={() => { setFeedbackOpen(false); setFeedback(''); toast.success('Feedback sent — thank you!'); }}
            >
              Send feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article reader */}
      <Dialog open={!!article} onOpenChange={(o) => !o && setArticle(null)}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/50 uppercase tracking-wide w-fit">{article?.category}</span>
            <DialogTitle className="text-lg">{article?.title}</DialogTitle>
            <DialogDescription>{article?.desc}</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-foreground/75 leading-relaxed whitespace-pre-line pt-1">
            {article?.body}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setArticle(null)}>Close</Button>
            <Button size="sm" className="bg-primary" onClick={() => { toast.success('Article link copied'); }}>Copy link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
