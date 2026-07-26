// Teams & Roles — team cards plus a role/permission matrix with editable toggles.
import { Shield, UserCog, Users } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/AdminLayout';
import { PageHeader, StatusBadge } from '@/components/admin/Shared';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const teams = [
  { id: 'TM-01', name: 'Talent Acquisition — Acme', org: 'Acme Corp', members: 8, lead: 'Sarah Kim', campaigns: 4 },
  { id: 'TM-02', name: 'Clinical Hiring — Helios', org: 'Helios Health', members: 12, lead: 'Dr. Amara Osei', campaigns: 7 },
  { id: 'TM-03', name: 'Store Ops Recruiting — Quantum', org: 'Quantum Retail Group', members: 15, lead: 'Chen Wei', campaigns: 9 },
  { id: 'TM-04', name: 'Engineering Hiring — Ironclad', org: 'Ironclad Security', members: 4, lead: 'Omar Farouk', campaigns: 2 },
  { id: 'TM-05', name: 'Logistics Talent — Northwind', org: 'Northwind Logistics', members: 5, lead: 'Tom Eriksen', campaigns: 3 },
];

const permissions = [
  'View candidates', 'Edit candidates', 'Delete candidates (GDPR)', 'Create campaigns',
  'Manage billing', 'Manage members', 'View analytics', 'Manage API keys', 'View audit log',
];

const initialMatrix: Record<string, boolean[]> = {
  Admin: [true, true, true, true, true, true, true, true, true],
  Recruiter: [true, true, false, true, false, false, true, false, false],
  'Hiring Manager': [true, false, false, false, false, false, true, false, false],
  Viewer: [true, false, false, false, false, false, true, false, false],
};

export default function AdminTeamsRoles() {
  const [location] = useLocation();
  const isRoles = location.includes('roles');
  const [matrix, setMatrix] = useState(initialMatrix);
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState('');

  const toggle = (role: string, idx: number) => {
    if (role === 'Admin') { toast.error('Admin permissions cannot be reduced'); return; }
    setMatrix((m) => ({ ...m, [role]: m[role].map((v, i) => (i === idx ? !v : v)) }));
    toast.success(`${role} permissions updated`, { description: 'Change takes effect immediately for all orgs.' });
  };

  return (
    <AdminLayout title={isRoles ? 'Roles & Permissions' : 'Teams'}>
      <div className="p-5 lg:p-7 max-w-[1360px] mx-auto space-y-8">
        {!isRoles && (
          <section>
            <PageHeader
              title="Teams"
              desc={`${teams.length} teams across ${new Set(teams.map((t) => t.org)).size} organizations`}
              actions={<Button size="sm" className="bg-primary" onClick={() => setCreateOpen(true)}><Users size={14} className="mr-1.5" /> New team</Button>}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((t) => (
                <div key={t.id} className="rounded-xl border border-border bg-card p-4 hover:border-accent/50 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <UserCog size={15} className="text-foreground/55" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate" style={{ marginBottom: 0 }}>{t.name}</p>
                      <p className="text-[11px] text-foreground/45 truncate" style={{ marginBottom: 0 }}>{t.org}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-foreground/55">
                    <span>{t.members} members · {t.campaigns} campaigns</span>
                    <span className="font-mono text-[11px]">Lead: {t.lead.split(' ')[0]}</span>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
                    <Button variant="outline" size="sm" className="h-7 flex-1" onClick={() => toast.success(`Opened ${t.name}`, { description: 'Team detail view — members, campaigns, and workload.' })}>Manage</Button>
                    <Button variant="outline" size="sm" className="h-7 flex-1" onClick={() => toast.success(`Workload report for ${t.name} exported`)}>Report</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <PageHeader
            title="Roles & Permissions"
            desc="Platform-wide defaults. Organizations can restrict further but never expand beyond these."
          />
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left">
                  <th className="px-4 py-2.5 text-[11px] uppercase tracking-wide font-medium text-foreground/50">Permission</th>
                  {Object.keys(matrix).map((r) => (
                    <th key={r} className="px-4 py-2.5 text-[11px] uppercase tracking-wide font-medium text-foreground/50 text-center">
                      <span className="inline-flex items-center gap-1"><Shield size={11} /> {r}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {permissions.map((p, pi) => (
                  <tr key={p} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-2.5 text-[13px] text-foreground/75">{p}</td>
                    {Object.keys(matrix).map((r) => (
                      <td key={r} className="px-4 py-2.5 text-center">
                        <Switch
                          checked={matrix[r][pi]}
                          onCheckedChange={() => toggle(r, pi)}
                          aria-label={`${p} for ${r}`}
                          className="mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <StatusBadge value="Info" />
            <p className="text-[12px] text-foreground/50" style={{ marginBottom: 0 }}>Admin role is immutable by design. All permission changes are recorded in the audit log.</p>
          </div>
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New team</DialogTitle>
            <DialogDescription>Group recruiters and hiring managers for shared campaign access.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Team name</Label>
            <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. GTM Hiring — Acme" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-primary" disabled={!teamName.trim()} onClick={() => { toast.success(`Team "${teamName}" created`); setCreateOpen(false); setTeamName(''); }}>Create team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

