// Organizations — list with plan/status filters + detail drawer (profile, members, usage, subscription, activity).
import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { AdminTable, EmptyState, PageHeader, StatusBadge, type Column } from '@/components/admin/Shared';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminUsers, auditEvents, invoices, orgs, type Org } from '@/lib/adminData';
import { toast } from 'sonner';

export default function AdminOrganizations() {
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const filtered = orgs.filter(
    (o) => (planFilter === 'all' || o.plan === planFilter) && (statusFilter === 'all' || o.status === statusFilter),
  );

  const columns: Column<Org>[] = [
    {
      key: 'name', header: 'Organization', sortable: true, sortValue: (o) => o.name,
      render: (o) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
            <Building2 size={13} className="text-foreground/50" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 0 }}>{o.name}</p>
            <p className="font-mono text-[11px] text-foreground/45" style={{ marginBottom: 0 }}>{o.domain}</p>
          </div>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', sortable: true, sortValue: (o) => o.plan, render: (o) => <span className="text-[13px] text-foreground/70">{o.plan}</span> },
    { key: 'seats', header: 'Seats', sortable: true, sortValue: (o) => o.seatsUsed, render: (o) => <span className="font-mono text-[12px] text-foreground/60">{o.seatsUsed}/{o.seats}</span> },
    { key: 'mrr', header: 'MRR', sortable: true, sortValue: (o) => o.mrr, render: (o) => <span className="font-mono text-[13px] text-foreground">${o.mrr.toLocaleString()}</span> },
    { key: 'status', header: 'Status', sortable: true, sortValue: (o) => o.status, render: (o) => <StatusBadge value={o.status} /> },
    { key: 'created', header: 'Created', sortable: true, sortValue: (o) => o.created, render: (o) => <span className="font-mono text-[12px] text-foreground/50">{o.created}</span> },
  ];

  const orgMembers = selectedOrg ? adminUsers.filter((u) => u.org === selectedOrg.name) : [];
  const orgInvoices = selectedOrg ? invoices.filter((i) => i.org === selectedOrg.name) : [];
  const orgActivity = selectedOrg ? auditEvents.filter((e) => e.org === selectedOrg.name) : [];

  return (
    <AdminLayout title="Organizations">
      <div className="p-5 lg:p-7 max-w-[1360px] mx-auto">
        <PageHeader
          title="Organizations"
          desc={`${orgs.length} organizations · $${orgs.filter((o) => o.status !== 'Churned').reduce((s, o) => s + o.mrr, 0).toLocaleString()} MRR`}
          actions={<Button size="sm" className="bg-primary" onClick={() => setCreateOpen(true)}><Plus size={14} className="mr-1.5" /> New organization</Button>}
        />
        {filtered.length === 0 && planFilter === 'all' && statusFilter === 'all' ? (
          <EmptyState title="No organizations yet" desc="Organizations appear here once customers sign up or you create one manually." />
        ) : (
          <AdminTable
            rows={filtered}
            columns={columns}
            searchKeys={(o) => `${o.name} ${o.domain} ${o.owner} ${o.industry}`}
            searchPlaceholder="Search organizations..."
            onRowClick={(o) => setSelectedOrg(o)}
            filters={
              <>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All plans</SelectItem>
                    <SelectItem value="Starter">Starter</SelectItem>
                    <SelectItem value="Growth">Growth</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Trial">Trial</SelectItem>
                    <SelectItem value="Past due">Past due</SelectItem>
                    <SelectItem value="Churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            bulkActions={(selected, clear) => (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-foreground/50">{selected.length} selected</span>
                <Button variant="outline" size="sm" className="h-7" onClick={() => { toast.success(`Exported ${selected.length} organizations to CSV`); clear(); }}>Export</Button>
                <Button variant="outline" size="sm" className="h-7 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => { toast.success(`${selected.length} organizations flagged for review`); clear(); }}>Flag</Button>
              </div>
            )}
          />
        )}
      </div>

      {/* Org detail drawer */}
      <Sheet open={!!selectedOrg} onOpenChange={(o) => !o && setSelectedOrg(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-5">
          {selectedOrg && (
            <>
              <SheetHeader className="p-0 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center">
                    <Building2 size={19} className="text-primary-foreground" />
                  </div>
                  <div>
                    <SheetTitle className="text-lg">{selectedOrg.name}</SheetTitle>
                    <SheetDescription className="font-mono text-[12px]">{selectedOrg.id} · {selectedOrg.domain}</SheetDescription>
                  </div>
                  <div className="ml-auto"><StatusBadge value={selectedOrg.status} /></div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="profile">
                <TabsList className="w-full">
                  <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
                  <TabsTrigger value="members" className="flex-1">Members</TabsTrigger>
                  <TabsTrigger value="usage" className="flex-1">Usage</TabsTrigger>
                  <TabsTrigger value="billing" className="flex-1">Billing</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-3 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Plan', selectedOrg.plan], ['Industry', selectedOrg.industry],
                      ['Owner', selectedOrg.owner], ['Owner email', selectedOrg.ownerEmail],
                      ['Created', selectedOrg.created], ['MRR', `$${selectedOrg.mrr.toLocaleString()}`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-border bg-card p-3">
                        <p className="text-[10px] uppercase tracking-wide text-foreground/40 font-medium" style={{ marginBottom: 3 }}>{k}</p>
                        <p className="text-[13px] text-foreground font-medium truncate" style={{ marginBottom: 0 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => toast.success(`Impersonation session started for ${selectedOrg.name}`, { description: 'All actions are logged to the audit trail.' })}>Impersonate</Button>
                    <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => toast.success(`${selectedOrg.name} suspended`, { description: 'Members can no longer sign in. Reversible from this panel.' })}>Suspend org</Button>
                  </div>
                </TabsContent>

                <TabsContent value="members" className="space-y-2 pt-3">
                  {orgMembers.length === 0 ? (
                    <EmptyState title="No members found" desc="This organization has no members in the current dataset." />
                  ) : orgMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <div className={`w-8 h-8 rounded-full ${m.color} text-white text-[11px] font-semibold flex items-center justify-center shrink-0`}>{m.initials}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground truncate" style={{ marginBottom: 0 }}>{m.name}</p>
                        <p className="font-mono text-[11px] text-foreground/45 truncate" style={{ marginBottom: 0 }}>{m.email}</p>
                      </div>
                      <span className="text-[12px] text-foreground/55 shrink-0">{m.role}</span>
                      <StatusBadge value={m.status} />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => toast.success('Invitation dialog — use the Users page to invite members')}>Invite member</Button>
                </TabsContent>

                <TabsContent value="usage" className="space-y-4 pt-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex justify-between text-[13px] mb-1.5">
                      <span className="font-medium text-foreground">AI credits</span>
                      <span className="font-mono text-[12px] text-foreground/55">{selectedOrg.aiCreditsUsed.toLocaleString()} / {selectedOrg.aiCreditsTotal.toLocaleString()}</span>
                    </div>
                    <Progress value={(selectedOrg.aiCreditsUsed / selectedOrg.aiCreditsTotal) * 100} className="h-2" />
                    {selectedOrg.aiCreditsUsed / selectedOrg.aiCreditsTotal > 0.9 && (
                      <p className="text-[12px] text-amber-700 mt-2" style={{ marginBottom: 0 }}>Above 90% — consider a credit top-up or plan upgrade.</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex justify-between text-[13px] mb-1.5">
                      <span className="font-medium text-foreground">Seats</span>
                      <span className="font-mono text-[12px] text-foreground/55">{selectedOrg.seatsUsed} / {selectedOrg.seats}</span>
                    </div>
                    <Progress value={(selectedOrg.seatsUsed / selectedOrg.seats) * 100} className="h-2" />
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex justify-between text-[13px]">
                      <span className="font-medium text-foreground">Storage</span>
                      <span className="font-mono text-[12px] text-foreground/55">{selectedOrg.storageGb} GB</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.success(`+10,000 credits granted to ${selectedOrg.name}`, { description: 'Logged as credits.granted in the audit trail.' })}>Grant credits</Button>
                </TabsContent>

                <TabsContent value="billing" className="space-y-2 pt-3">
                  {orgInvoices.length === 0 ? (
                    <EmptyState title="No invoices" desc="No invoices found for this organization in the current period." />
                  ) : orgInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[12px] font-medium text-foreground" style={{ marginBottom: 0 }}>{inv.id}</p>
                        <p className="text-[11px] text-foreground/45" style={{ marginBottom: 0 }}>Issued {inv.issued} · due {inv.due}</p>
                      </div>
                      <span className="font-mono text-[13px] text-foreground shrink-0">${inv.amount.toLocaleString()}</span>
                      <StatusBadge value={inv.status} />
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="activity" className="space-y-2 pt-3">
                  {orgActivity.length === 0 ? (
                    <EmptyState title="No recent activity" desc="Audit events for this organization will appear here." />
                  ) : orgActivity.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <StatusBadge value={e.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[12px] text-foreground/80 truncate" style={{ marginBottom: 0 }}>{e.action}</p>
                        <p className="text-[11px] text-foreground/45 truncate" style={{ marginBottom: 0 }}>{e.target}</p>
                      </div>
                      <span className="font-mono text-[10px] text-foreground/40 shrink-0">{e.time.slice(5, 16)}</span>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create org dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New organization</DialogTitle>
            <DialogDescription>Provision a new customer organization. An owner invitation is sent immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Organization name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Meridian Labs" />
            </div>
            <div className="space-y-1.5">
              <Label>Primary domain</Label>
              <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="e.g. meridianlabs.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary" disabled={!newName.trim() || !newDomain.trim()}
              onClick={() => { toast.success(`Organization "${newName}" created`, { description: 'Owner invitation sent. Starts on a 14-day trial.' }); setCreateOpen(false); setNewName(''); setNewDomain(''); }}
            >
              Create organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

