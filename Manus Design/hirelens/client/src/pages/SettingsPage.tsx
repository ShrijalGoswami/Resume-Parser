// HireLens Settings — profile, team, organization, API keys, billing, notifications, appearance, integrations, audit.
import {
  Bell, Building2, CreditCard, KeyRound, Palette, Plug, ScrollText, User, Users2, Copy, Plus, Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearch } from 'wouter';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiKeys, auditLogs, currentUser, integrations, teamMembers } from '@/lib/mockData';
import { toast } from 'sonner';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'team', label: 'Team & Roles', icon: Users2 },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'apikeys', label: 'API Keys', icon: KeyRound },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
];

export default function SettingsPage() {
  const search = useSearch();
  const [active, setActive] = useState('profile');
  const [connected, setConnected] = useState(integrations);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Recruiter');

  useEffect(() => {
    const t = new URLSearchParams(search).get('tab');
    if (t && tabs.some((tab) => tab.id === t)) setActive(t);
  }, [search]);

  const [notifPrefs, setNotifPrefs] = useState({
    aiComplete: true, highMatch: true, interviews: true, offers: true, digest: false, marketing: false,
  });

  return (
    <AppLayout title="Settings">
      <div className="p-6 lg:p-8 max-w-[1100px] mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 24 }}>Settings</h2>
        <div className="flex gap-8 items-start">
          {/* Tab nav */}
          <nav className="w-52 shrink-0 space-y-0.5 sticky top-6">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                    active === t.id ? 'bg-secondary text-foreground font-medium' : 'text-foreground/60 hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon size={15} strokeWidth={1.8} />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* Panels */}
          <div className="flex-1 min-w-0">
            {active === 'profile' && (
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 18 }}>Your profile</h3>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-teal-500 text-white text-xl font-semibold flex items-center justify-center">{currentUser.avatar}</div>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => {
                        const inp = document.createElement('input');
                        inp.type = 'file';
                        inp.accept = 'image/*';
                        inp.onchange = () => {
                          const f = inp.files?.[0];
                          if (f) toast.success(`Avatar updated to "${f.name}"`);
                        };
                        inp.click();
                      }}
                    >Change avatar</Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Full name</Label>
                      <Input defaultValue={currentUser.name} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input defaultValue={currentUser.email} type="email" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Job title</Label>
                      <Input defaultValue="Head of Talent" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Timezone</Label>
                      <Select defaultValue="pt">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pt">Pacific Time (US)</SelectItem>
                          <SelectItem value="et">Eastern Time (US)</SelectItem>
                          <SelectItem value="gmt">GMT</SelectItem>
                          <SelectItem value="ist">India Standard Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button className="bg-primary" size="sm" onClick={() => toast.success('Profile saved')}>Save changes</Button>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 4 }}>Password</h3>
                  <p className="text-[13px] text-foreground/55" style={{ marginBottom: 16 }}>Last changed 3 months ago</p>
                  <Button variant="outline" size="sm" onClick={() => toast.success('Password reset email sent to ' + currentUser.email)}>Send reset email</Button>
                </div>
              </div>
            )}

            {active === 'team' && (
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between p-6 pb-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Team members</h3>
                    <p className="text-[13px] text-foreground/55" style={{ marginBottom: 0 }}>{teamMembers.length} members · 3 roles</p>
                  </div>
                  <Button size="sm" className="bg-primary" onClick={() => setInviteOpen(true)}>
                    <Plus size={14} className="mr-1.5" /> Invite member
                  </Button>
                </div>
                <div className="divide-y divide-border/60">
                  {teamMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-6 py-3.5">
                      <div className={`w-8 h-8 rounded-full ${m.color} text-white text-xs font-semibold flex items-center justify-center shrink-0`}>{m.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" style={{ marginBottom: 0 }}>{m.name}</p>
                        <p className="text-xs text-foreground/50 truncate" style={{ marginBottom: 0 }}>{m.email}</p>
                      </div>
                      <span className="text-xs text-foreground/40 hidden sm:block">Active {m.lastActive}</span>
                      <Select defaultValue={m.role} onValueChange={(v) => toast.success(`${m.name} is now ${v}`)}>
                        <SelectTrigger className="w-36 h-8 text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Recruiter">Recruiter</SelectItem>
                          <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                          <SelectItem value="Viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="p-6 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-foreground" style={{ marginBottom: 10 }}>Role permissions</h4>
                  <div className="grid sm:grid-cols-2 gap-3 text-[13px]">
                    {[
                      { role: 'Admin', desc: 'Full access including billing, API keys, and member management' },
                      { role: 'Recruiter', desc: 'Manage campaigns, candidates, and AI analysis' },
                      { role: 'Hiring Manager', desc: 'Review assigned candidates and leave structured feedback' },
                      { role: 'Viewer', desc: 'Read-only access to campaigns and anonymized analytics' },
                    ].map((r) => (
                      <div key={r.role} className="rounded-lg bg-secondary/40 p-3">
                        <p className="font-medium text-foreground" style={{ marginBottom: 2 }}>{r.role}</p>
                        <p className="text-foreground/55" style={{ marginBottom: 0 }}>{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {active === 'organization' && (
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Organization</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Organization name</Label>
                    <Input defaultValue={currentUser.organization} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Workspace URL</Label>
                    <div className="flex">
                      <Input defaultValue="acme" className="rounded-r-none" />
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-secondary text-sm text-foreground/50">.hirelens.io</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Industry</Label>
                    <Select defaultValue="tech">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tech">Technology</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="health">Healthcare</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Company size</Label>
                    <Select defaultValue="51-200">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10</SelectItem>
                        <SelectItem value="11-50">11-50</SelectItem>
                        <SelectItem value="51-200">51-200</SelectItem>
                        <SelectItem value="200+">200+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground" style={{ marginBottom: 2 }}>Data retention</p>
                    <p className="text-[13px] text-foreground/55" style={{ marginBottom: 0 }}>Rejected candidate data is anonymized after 12 months (GDPR-aligned)</p>
                  </div>
                  <Select defaultValue="12">
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                      <SelectItem value="24">24 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-primary" size="sm" onClick={() => toast.success('Organization settings saved')}>Save changes</Button>
                </div>
              </div>
            )}

            {active === 'billing' && (
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Current plan</h3>
                      <p className="text-[13px] text-foreground/55" style={{ marginBottom: 0 }}>Billed monthly · Renews Aug 25, 2026</p>
                    </div>
                    <Badge className="bg-accent text-accent-foreground border-0">Professional</Badge>
                  </div>
                  <p className="font-mono text-3xl font-semibold text-foreground" style={{ marginBottom: 4 }}>$299<span className="text-sm font-normal text-foreground/50">/month</span></p>
                  <p className="text-[13px] text-foreground/55" style={{ marginBottom: 20 }}>Unlimited campaigns · 500 AI analyses/month · Up to 15 seats</p>
                  <div className="space-y-3 mb-5">
                    {[
                      { label: 'AI analyses', used: 342, total: 500 },
                      { label: 'Team seats', used: 5, total: 15 },
                      { label: 'Storage', used: 2.1, total: 25, unit: 'GB' },
                    ].map((u) => (
                      <div key={u.label}>
                        <div className="flex justify-between text-[13px] mb-1">
                          <span className="text-foreground/60">{u.label}</span>
                          <span className="font-mono text-foreground/70">{u.used}{u.unit ?? ''} / {u.total}{u.unit ?? ''}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${(u.used / u.total) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-primary" onClick={() => toast.success('Upgrade request sent', { description: 'Our sales team will reach out within one business day to finalize Enterprise pricing.' })}>Upgrade to Enterprise</Button>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => {
                        const rows = [['Invoice', 'Date', 'Amount', 'Status'], ['INV-2026-007', '2026-07-01', '$1,188.00', 'Paid'], ['INV-2026-006', '2026-06-01', '$1,188.00', 'Paid'], ['INV-2026-005', '2026-05-01', '$1,188.00', 'Paid']];
                        const csv = rows.map((r) => r.join(',')).join('\n');
                        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                        const a = document.createElement('a');
                        a.href = url; a.download = 'hirelens-invoices.csv'; a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Invoice history downloaded');
                      }}
                    >Download invoices</Button>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 14 }}>Payment method</h3>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">VISA</div>
                      <div>
                        <p className="font-mono text-sm text-foreground" style={{ marginBottom: 0 }}>•••• 4242</p>
                        <p className="text-xs text-foreground/50" style={{ marginBottom: 0 }}>Expires 09/28</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast.success('Secure card update link sent', { description: 'Check billing@acme.com for a Stripe-hosted update link.' })}>Update</Button>
                  </div>
                </div>
              </div>
            )}

            {active === 'notifications' && (
              <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
                {[
                  { key: 'aiComplete' as const, title: 'AI analysis completed', desc: 'When resume analysis finishes for candidates in your campaigns' },
                  { key: 'highMatch' as const, title: 'High-match candidates', desc: 'When a candidate scores 90+ in any of your campaigns' },
                  { key: 'interviews' as const, title: 'Interview reminders', desc: '45 minutes before scheduled interviews' },
                  { key: 'offers' as const, title: 'Offer updates', desc: 'When offers are sent, accepted, or declined' },
                  { key: 'digest' as const, title: 'Weekly digest', desc: 'Summary of hiring activity every Monday morning' },
                  { key: 'marketing' as const, title: 'Product updates', desc: 'New features and improvement announcements' },
                ].map((n) => (
                  <div key={n.key} className="flex items-center justify-between gap-6 p-5">
                    <div>
                      <p className="text-sm font-medium text-foreground" style={{ marginBottom: 2 }}>{n.title}</p>
                      <p className="text-[13px] text-foreground/55" style={{ marginBottom: 0 }}>{n.desc}</p>
                    </div>
                    <Switch
                      checked={notifPrefs[n.key]}
                      onCheckedChange={(v) => { setNotifPrefs((p) => ({ ...p, [n.key]: v })); toast.success(`${n.title} ${v ? 'enabled' : 'disabled'}`); }}
                    />
                  </div>
                ))}
              </div>
            )}

            {active === 'appearance' && (
              <div className="rounded-xl border border-border bg-card p-6 space-y-6">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 4 }}>Theme</h3>
                  <p className="text-[13px] text-foreground/55" style={{ marginBottom: 14 }}>HireLens ships light-first. Dark mode arrives with the next release.</p>
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    {[
                      { id: 'light', label: 'Light', active: true, disabled: false },
                      { id: 'dark', label: 'Dark', active: false, disabled: true },
                      { id: 'system', label: 'System', active: false, disabled: true },
                    ].map((t) => (
                      <button
                        key={t.id}
                        disabled={t.disabled}
                        onClick={() => toast.success('Light theme active')}
                        className={`rounded-lg border p-3 text-center transition-all ${t.active ? 'border-accent ring-1 ring-accent' : 'border-border'} ${t.disabled ? 'opacity-45 cursor-not-allowed' : 'hover:border-accent/50'}`}
                      >
                        <div className={`h-12 rounded-md mb-2 border border-border/60 ${t.id === 'dark' ? 'bg-slate-800' : t.id === 'system' ? 'bg-gradient-to-r from-white to-slate-800' : 'bg-white'}`} />
                        <span className="text-[13px] font-medium text-foreground">{t.label}</span>
                        {t.disabled && <span className="block text-[10px] text-foreground/40">Soon</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 4 }}>Density</h3>
                  <p className="text-[13px] text-foreground/55" style={{ marginBottom: 14 }}>Adjust information density across tables and lists.</p>
                  <Select defaultValue="comfortable" onValueChange={(v) => toast.success(`Density set to ${v}`)}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {active === 'apikeys' && (
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between p-6 pb-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>API keys</h3>
                    <p className="text-[13px] text-foreground/55" style={{ marginBottom: 0 }}>Programmatic access for your integrations. Keys are shown once at creation.</p>
                  </div>
                  <Button size="sm" className="bg-primary" onClick={() => toast.success('New key created: hl_live_x9k2...f7a3', { description: 'Copy it now — it will not be shown again.' })}>
                    <Plus size={14} className="mr-1.5" /> Create key
                  </Button>
                </div>
                <div className="divide-y divide-border/60">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground" style={{ marginBottom: 2 }}>{k.name}</p>
                        <p className="font-mono text-xs text-foreground/50" style={{ marginBottom: 0 }}>{k.prefix}</p>
                      </div>
                      <div className="hidden sm:flex gap-1.5">
                        {k.scopes.map((s) => (
                          <span key={s} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/55 uppercase">{s}</span>
                        ))}
                      </div>
                      <span className="font-mono text-xs text-foreground/40 hidden md:block w-24">Used {k.lastUsed}</span>
                      <button className="p-1.5 hover:bg-secondary rounded-md transition-colors" onClick={() => toast.success('Key prefix copied')} aria-label="Copy">
                        <Copy size={14} className="text-foreground/50" />
                      </button>
                      <button className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors" onClick={() => toast.error(`"${k.name}" revoked`)} aria-label="Revoke">
                        <Trash2 size={14} className="text-destructive/70" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active === 'integrations' && (
              <div className="grid sm:grid-cols-2 gap-4">
                {connected.map((integ) => (
                  <div key={integ.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                        <Plug size={16} className="text-foreground/55" />
                      </div>
                      {integ.connected ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">Connected</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] text-foreground/50">Not connected</Badge>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground" style={{ marginBottom: 3 }}>{integ.name}</h4>
                    <p className="text-[13px] text-foreground/55 leading-snug" style={{ marginBottom: 14 }}>{integ.description}</p>
                    <Button
                      variant={integ.connected ? 'outline' : 'default'}
                      size="sm"
                      className={integ.connected ? 'w-full' : 'w-full bg-primary'}
                      onClick={() => {
                        setConnected((list) => list.map((x) => (x.id === integ.id ? { ...x, connected: !x.connected } : x)));
                        toast.success(`${integ.name} ${integ.connected ? 'disconnected' : 'connected'}`);
                      }}
                    >
                      {integ.connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {active === 'audit' && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-6 pb-4">
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 2 }}>Audit log</h3>
                  <p className="text-[13px] text-foreground/55" style={{ marginBottom: 0 }}>Every action in your workspace, immutable and exportable.</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border bg-secondary/40 text-left">
                      {['Actor', 'Action', 'Target', 'IP', 'Timestamp'].map((h) => (
                        <th key={h} className="px-6 py-2 text-[11px] uppercase tracking-wide font-medium text-foreground/50">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {auditLogs.map((l) => (
                      <tr key={l.id}>
                        <td className="px-6 py-3 text-foreground/75">{l.actor}</td>
                        <td className="px-6 py-3"><span className="font-mono text-xs text-foreground/70">{l.action}</span></td>
                        <td className="px-6 py-3"><span className="font-mono text-xs text-foreground/55">{l.target}</span></td>
                        <td className="px-6 py-3"><span className="font-mono text-xs text-foreground/45">{l.ip}</span></td>
                        <td className="px-6 py-3"><span className="font-mono text-xs text-foreground/45">{l.time}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite member dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>They'll receive an email invitation to join Acme Corp on HireLens.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="invemail">Email address</Label>
              <Input id="invemail" type="email" placeholder="colleague@acme.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Recruiter">Recruiter</SelectItem>
                  <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary"
              disabled={!inviteEmail.includes('@')}
              onClick={() => { setInviteOpen(false); toast.success(`Invitation sent to ${inviteEmail}`, { description: `Role: ${inviteRole}` }); setInviteEmail(''); }}
            >
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
