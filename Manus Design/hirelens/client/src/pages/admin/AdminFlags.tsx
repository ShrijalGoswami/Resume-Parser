// Feature Flags & API Keys — toggles with environment and rollout, key management with revoke.
import { Flag, KeyRound, Plus } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/AdminLayout';
import { AdminTable, PageHeader, StatusBadge, type Column } from '@/components/admin/Shared';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { apiKeys, featureFlags, type ApiKey, type FeatureFlag } from '@/lib/adminData';
import { toast } from 'sonner';

const envStyles: Record<string, string> = {
  Production: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Staging: 'bg-amber-50 text-amber-700 border-amber-200',
  Development: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function AdminFlags() {
  const [location] = useLocation();
  const isKeys = location.includes('api-keys');
  const [flags, setFlags] = useState<FeatureFlag[]>(featureFlags);
  const [envFilter, setEnvFilter] = useState('all');
  const [editFlag, setEditFlag] = useState<FeatureFlag | null>(null);
  const [rollout, setRollout] = useState(0);
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [keyName, setKeyName] = useState('');

  const filteredFlags = flags.filter((f) => envFilter === 'all' || f.env === envFilter);

  const toggleFlag = (id: string) => {
    setFlags((fs) => fs.map((f) => (f.id === id ? { ...f, enabled: !f.enabled, rollout: !f.enabled ? (f.rollout || 100) : f.rollout } : f)));
    const f = flags.find((x) => x.id === id);
    toast.success(`${f?.name} ${f?.enabled ? 'disabled' : 'enabled'}`, { description: `Environment: ${f?.env}. Logged to the audit trail.` });
  };

  const keyColumns: Column<ApiKey>[] = [
    {
      key: 'name', header: 'Key', sortable: true, sortValue: (k) => k.name,
      render: (k) => (
        <div>
          <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 0 }}>{k.name}</p>
          <p className="font-mono text-[11px] text-foreground/45" style={{ marginBottom: 0 }}>{k.prefix}</p>
        </div>
      ),
    },
    { key: 'org', header: 'Organization', sortable: true, sortValue: (k) => k.org, render: (k) => <span className="text-[13px] text-foreground/70">{k.org}</span> },
    { key: 'scope', header: 'Scope', render: (k) => <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-secondary text-foreground/60">{k.scope}</span> },
    { key: 'lastUsed', header: 'Last used', render: (k) => <span className="font-mono text-[12px] text-foreground/50">{k.lastUsed}</span> },
    { key: 'status', header: 'Status', sortable: true, sortValue: (k) => k.status, render: (k) => <StatusBadge value={k.status} /> },
    {
      key: 'actions', header: '', className: 'w-24',
      render: (k) => k.status === 'Active' ? (
        <Button
          variant="outline" size="sm" className="h-7 text-rose-600 border-rose-200 hover:bg-rose-50"
          onClick={(e) => { e.stopPropagation(); toast.success(`Key ${k.prefix} revoked`, { description: 'Requests with this key now return 401. Irreversible.' }); }}
        >
          Revoke
        </Button>
      ) : null,
    },
  ];

  return (
    <AdminLayout title={isKeys ? 'API Keys' : 'Feature Flags'}>
      <div className="p-5 lg:p-7 max-w-[1360px] mx-auto space-y-6">
        {!isKeys ? (
          <>
            <PageHeader
              title="Feature Flags"
              desc={`${flags.filter((f) => f.enabled).length} of ${flags.length} flags enabled`}
              actions={
                <Select value={envFilter} onValueChange={setEnvFilter}>
                  <SelectTrigger className="h-8 w-[150px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All environments</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Staging">Staging</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
            <div className="space-y-3">
              {filteredFlags.map((f) => (
                <div key={f.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-4 hover:border-accent/40 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Flag size={15} className={f.enabled ? 'text-accent' : 'text-foreground/35'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-foreground" style={{ marginBottom: 0 }}>{f.name}</p>
                      <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-medium ${envStyles[f.env]}`}>{f.env}</span>
                      <span className="font-mono text-[10px] text-foreground/40">{f.key}</span>
                    </div>
                    <p className="text-[12px] text-foreground/55 truncate" style={{ marginBottom: 0 }}>{f.description}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <button
                      className="text-left"
                      onClick={() => { setEditFlag(f); setRollout(f.rollout); }}
                      aria-label={`Edit rollout for ${f.name}`}
                    >
                      <p className="font-mono text-[13px] font-semibold text-foreground" style={{ marginBottom: 0 }}>{f.rollout}%</p>
                      <p className="text-[10px] text-foreground/40 hover:text-accent transition-colors" style={{ marginBottom: 0 }}>rollout →</p>
                    </button>
                    <Switch checked={f.enabled} onCheckedChange={() => toggleFlag(f.id)} aria-label={`Toggle ${f.name}`} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <PageHeader
              title="API Keys"
              desc={`${apiKeys.filter((k) => k.status === 'Active').length} active keys across all organizations`}
              actions={<Button size="sm" className="bg-primary" onClick={() => setCreateKeyOpen(true)}><Plus size={14} className="mr-1.5" /> Issue key</Button>}
            />
            <AdminTable
              rows={apiKeys}
              columns={keyColumns}
              searchKeys={(k) => `${k.name} ${k.org} ${k.prefix} ${k.scope}`}
              searchPlaceholder="Search keys..."
            />
          </>
        )}
      </div>

      {/* Rollout editor */}
      <Dialog open={!!editFlag} onOpenChange={(o) => !o && setEditFlag(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rollout: {editFlag?.name}</DialogTitle>
            <DialogDescription>Percentage of organizations that receive this feature in {editFlag?.env}.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-semibold text-foreground">{rollout}%</span>
              <span className="text-[12px] text-foreground/50">≈ {Math.round((rollout / 100) * 10)} of 10 orgs</span>
            </div>
            <Slider value={[rollout]} onValueChange={(v) => setRollout(v[0])} max={100} step={5} aria-label="Rollout percentage" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFlag(null)}>Cancel</Button>
            <Button
              className="bg-primary"
              onClick={() => {
                setFlags((fs) => fs.map((f) => (f.id === editFlag?.id ? { ...f, rollout } : f)));
                toast.success(`${editFlag?.name} rollout set to ${rollout}%`);
                setEditFlag(null);
              }}
            >
              Save rollout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue key */}
      <Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue API key</DialogTitle>
            <DialogDescription>The full key is shown once and can never be retrieved again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Key name</Label>
            <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. Careers page embed" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateKeyOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary" disabled={!keyName.trim()}
              onClick={() => { toast.success(`Key "${keyName}" issued`, { description: 'hl_live_9f3k...d82m — copy it now; it will not be shown again.' }); setCreateKeyOpen(false); setKeyName(''); }}
            >
              <KeyRound size={14} className="mr-1.5" /> Issue key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
