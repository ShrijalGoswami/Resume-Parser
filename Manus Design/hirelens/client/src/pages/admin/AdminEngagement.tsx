// Engagement hub — Activity Feed, Integrations, Notifications, Email Templates, Release Notes, Brand & General Settings (route-aware).
import { Activity, Bell, Mail, Palette, Rocket, Settings2, Webhook } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/AdminLayout';
import { EmptyState, PageHeader, StatusBadge } from '@/components/admin/Shared';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { auditEvents, emailTemplates, integrations } from '@/lib/adminData';
import { toast } from 'sonner';

const releaseNotes = [
  { version: 'v2.4', date: 'Jul 21, 2026', highlights: ['Comparison workspace explains every dimension difference', 'Per-candidate interview kits', 'Webhook v2 payloads with campaign context'] },
  { version: 'v2.3', date: 'Jul 8, 2026', highlights: ['Department comparison analytics', 'Offer-acceptance tracking', 'Median resume parse time down to 2.1s'] },
  { version: 'v2.2', date: 'Jun 24, 2026', highlights: ['Bulk actions on candidate tables', 'Slack notifications for high-match candidates', 'EU data residency GA'] },
];

const adminNotifs = [
  { id: 'AN-1', title: 'Payment failed — Brightpath Financial', desc: 'INV-2026-0707 ($1,185) declined: insufficient funds. Dunning sequence started.', time: '6 hrs ago', kind: 'Critical', unread: true },
  { id: 'AN-2', title: 'AI inference degraded', desc: 'P50 latency 2.9s (target 1.2s). OCR backlog from Quantum Retail batch.', time: '2 hrs ago', kind: 'Warning', unread: true },
  { id: 'AN-3', title: 'New enterprise trial started', desc: 'Vertex Studios (5 seats) — assigned to sales pod B.', time: 'Yesterday', kind: 'Info', unread: false },
  { id: 'AN-4', title: 'Security finding resolved', desc: 'SEC-117: unused admin-scope API key revoked (Northwind).', time: '2 days ago', kind: 'Info', unread: false },
];

export default function AdminEngagement() {
  const [location] = useLocation();
  const view = location.includes('activity') ? 'activity'
    : location.includes('integrations') ? 'integrations'
    : location.includes('notifications') ? 'notifications'
    : location.includes('emails') ? 'emails'
    : location.includes('releases') ? 'releases'
    : location.includes('brand') ? 'brand'
    : 'settings';
  const [notifs, setNotifs] = useState(adminNotifs);
  const [editTemplate, setEditTemplate] = useState<(typeof emailTemplates)[number] | null>(null);
  const [subject, setSubject] = useState('');

  const titles: Record<string, [string, string]> = {
    activity: ['Activity Feed', 'Everything happening across the platform, newest first'],
    integrations: ['Integrations', 'Third-party connections available to customer organizations'],
    notifications: ['Notifications', 'Operational alerts for the platform team'],
    emails: ['Email Templates', 'Transactional emails sent on behalf of customer organizations'],
    releases: ['Release Notes', 'What shipped, by version'],
    brand: ['Brand Settings', 'White-label controls for customer-facing surfaces'],
    settings: ['General Settings', 'Platform-wide configuration'],
  };

  return (
    <AdminLayout title={titles[view][0]}>
      <div className="p-5 lg:p-7 max-w-[1100px] mx-auto space-y-6">
        <PageHeader title={titles[view][0]} desc={titles[view][1]} />

        {view === 'activity' && (
          <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
            {auditEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                <Activity size={14} className={e.severity === 'Critical' ? 'text-rose-500 shrink-0' : e.severity === 'Warning' ? 'text-amber-500 shrink-0' : 'text-foreground/35 shrink-0'} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-foreground" style={{ marginBottom: 0 }}>
                    <span className="font-medium">{e.actor}</span>
                    <span className="text-foreground/55"> · {e.action.replace(/[._]/g, ' ')} — {e.target}</span>
                  </p>
                  <p className="font-mono text-[11px] text-foreground/40" style={{ marginBottom: 0 }}>{e.org} · {e.time}</p>
                </div>
                <StatusBadge value={e.severity} />
              </div>
            ))}
          </div>
        )}

        {view === 'integrations' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {integrations.map((i) => (
              <div key={i.name} className="rounded-xl border border-border bg-card p-4 hover:border-accent/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                    <Rocket size={15} className="text-foreground/55" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground" style={{ marginBottom: 0 }}>{i.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-foreground/40" style={{ marginBottom: 0 }}>{i.category}</p>
                  </div>
                  <div className="ml-auto"><StatusBadge value={i.status} /></div>
                </div>
                <p className="text-[12px] text-foreground/60" style={{ marginBottom: 10 }}>{i.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-foreground/45">{i.orgs} orgs using</span>
                  <Button
                    variant="outline" size="sm" className="h-7"
                    onClick={() => toast.success(i.status === 'Connected' ? `${i.name} configuration opened` : `${i.name} setup started`, { description: i.status === 'Connected' ? 'Scopes, webhooks, and org-level availability.' : 'OAuth flow and scope selection.' })}
                  >
                    {i.status === 'Connected' ? 'Configure' : 'Connect'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'notifications' && (
          notifs.length === 0 ? (
            <EmptyState title="All clear" desc="No operational alerts right now. New alerts appear here and in Slack #platform-alerts." />
          ) : (
            <>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => { setNotifs((n) => n.map((x) => ({ ...x, unread: false }))); toast.success('All notifications marked read'); }}>Mark all read</Button>
              </div>
              <div className="space-y-2">
                {notifs.map((n) => (
                  <div key={n.id} className={`rounded-xl border p-4 flex items-start gap-3 transition-colors ${n.unread ? 'border-accent/40 bg-accent/[0.03]' : 'border-border bg-card'}`}>
                    <Bell size={15} className={n.kind === 'Critical' ? 'text-rose-500 mt-0.5' : n.kind === 'Warning' ? 'text-amber-500 mt-0.5' : 'text-foreground/40 mt-0.5'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-foreground" style={{ marginBottom: 1 }}>{n.title}</p>
                        {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                      </div>
                      <p className="text-[12px] text-foreground/60" style={{ marginBottom: 2 }}>{n.desc}</p>
                      <p className="font-mono text-[10px] text-foreground/40" style={{ marginBottom: 0 }}>{n.time}</p>
                    </div>
                    <StatusBadge value={n.kind} />
                  </div>
                ))}
              </div>
            </>
          )
        )}

        {view === 'emails' && (
          <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
            {emailTemplates.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <Mail size={15} className="text-foreground/40 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 1 }}>{t.name}</p>
                  <p className="font-mono text-[11px] text-foreground/45 truncate" style={{ marginBottom: 0 }}>{t.subject}</p>
                </div>
                <span className="font-mono text-[11px] text-foreground/45">opens {t.opens}</span>
                <StatusBadge value={t.status} />
                <Button variant="outline" size="sm" className="h-7" onClick={() => { setEditTemplate(t); setSubject(t.subject); }}>Edit</Button>
              </div>
            ))}
          </div>
        )}

        {view === 'releases' && (
          <div className="space-y-4">
            {releaseNotes.map((r) => (
              <div key={r.version} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-[14px] font-semibold text-accent">{r.version}</span>
                  <span className="font-mono text-[11px] text-foreground/40">{r.date}</span>
                  <Button variant="outline" size="sm" className="h-7 ml-auto" onClick={() => toast.success(`${r.version} changelog copied to clipboard`)}>Copy link</Button>
                </div>
                <ul className="space-y-1 text-[13px] text-foreground/70 list-none pl-0" style={{ marginBottom: 0 }}>
                  {r.highlights.map((h) => <li key={h} className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" />{h}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {(view === 'brand' || view === 'settings') && (
          <div className="space-y-5 max-w-2xl">
            {view === 'brand' ? (
              <>
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1"><Palette size={15} className="text-foreground/50" /><h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>White-label</h3></div>
                  {[
                    ['Custom logo on candidate emails', true], ['Custom domain for careers pages', true],
                    ['Remove "Powered by HireLens" footer (Enterprise)', false], ['Custom accent color per org', true],
                  ].map(([label, on]) => (
                    <div key={String(label)} className="flex items-center justify-between">
                      <span className="text-[13px] text-foreground/70">{label}</span>
                      <Switch defaultChecked={Boolean(on)} onCheckedChange={(c) => toast.success(`"${label}" ${c ? 'enabled' : 'disabled'}`)} aria-label={String(label)} />
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Default accent color</h3>
                  <div className="flex gap-2">
                    {['#0d9488', '#2563eb', '#7c3aed', '#dc2626', '#d97706'].map((c) => (
                      <button key={c} className="w-8 h-8 rounded-full border-2 border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} onClick={() => toast.success(`Default accent set to ${c}`)} aria-label={`Set accent ${c}`} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1"><Settings2 size={15} className="text-foreground/50" /><h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Platform defaults</h3></div>
                  {[
                    ['New signups start on 14-day trial', true], ['Require email verification', true],
                    ['Auto-suspend orgs 30 days past due', true], ['Allow public API access for Starter plan', false],
                    ['Beta features opt-in banner', true],
                  ].map(([label, on]) => (
                    <div key={String(label)} className="flex items-center justify-between">
                      <span className="text-[13px] text-foreground/70">{label}</span>
                      <Switch defaultChecked={Boolean(on)} onCheckedChange={(c) => toast.success(`"${label}" ${c ? 'enabled' : 'disabled'}`)} aria-label={String(label)} />
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2 mb-1"><Webhook size={15} className="text-foreground/50" /><h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Webhooks</h3></div>
                  <div className="space-y-1.5">
                    <Label>Platform events endpoint</Label>
                    <Input defaultValue="https://ops.hirelens.io/hooks/platform" className="font-mono text-[13px]" />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" className="bg-primary" onClick={() => toast.success('Webhook endpoint saved', { description: 'Test event delivered successfully (200 OK, 84ms).' })}>Save & test</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Email template editor */}
      <Dialog open={!!editTemplate} onOpenChange={(o) => !o && setEditTemplate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit: {editTemplate?.name}</DialogTitle>
            <DialogDescription>Variables: {'{{company}}, {{role}}, {{candidate_name}}, {{interviewer}}'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Subject line</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="font-mono text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Body preview</Label>
              <Textarea rows={5} defaultValue={`Hi {{candidate_name}},\n\nThank you for your interest in the {{role}} position at {{company}}. ...`} className="font-mono text-[12px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => toast.success('Test email sent to mira@hirelens.io')}>Send test</Button>
            <Button className="bg-primary" onClick={() => { toast.success(`"${editTemplate?.name}" saved`, { description: 'Changes apply to all future sends.' }); setEditTemplate(null); }}>Save template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

