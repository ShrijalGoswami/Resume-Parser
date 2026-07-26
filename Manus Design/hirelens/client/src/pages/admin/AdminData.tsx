// Data operations — Backups, Storage, Data Residency, Exports & Imports (route-aware).
import { Database, Download, Globe2, HardDrive, Play, UploadCloud } from 'lucide-react';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/AdminLayout';
import { PageHeader, StatCard, StatusBadge } from '@/components/admin/Shared';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { backups, exportJobs, importJobs, orgs } from '@/lib/adminData';
import { toast } from 'sonner';

const regions = [
  { region: 'us-east-1 (N. Virginia)', orgs: 6, primary: true, services: 'App, DB, AI inference, storage' },
  { region: 'eu-central-1 (Frankfurt)', orgs: 3, primary: false, services: 'App, DB, AI inference, storage — GDPR pinned' },
  { region: 'ap-southeast-2 (Sydney)', orgs: 1, primary: false, services: 'App, DB, storage (AI routed to us-east-1)' },
];

export default function AdminData() {
  const [location] = useLocation();
  const view = location.includes('backups') ? 'backups' : location.includes('storage') ? 'storage' : location.includes('residency') ? 'residency' : 'jobs';

  const titles: Record<string, [string, string]> = {
    backups: ['Backups', 'Automated snapshots with 35-day retention and weekly fulls'],
    storage: ['Storage', 'Object storage consumption by organization'],
    residency: ['Data Residency', 'Regional pinning for compliance-sensitive customers'],
    jobs: ['Exports & Imports', 'Bulk data movement in and out of the platform'],
  };

  const totalStorage = orgs.reduce((s, o) => s + o.storageGb, 0);

  return (
    <AdminLayout title={titles[view][0]}>
      <div className="p-5 lg:p-7 max-w-[1200px] mx-auto space-y-6">
        <PageHeader
          title={titles[view][0]}
          desc={titles[view][1]}
          actions={
            view === 'backups' ? (
              <Button size="sm" className="bg-primary" onClick={() => toast.success('Manual snapshot started', { description: 'ETA ~12 minutes. You will be notified on completion.' })}>
                <Play size={14} className="mr-1.5" /> Snapshot now
              </Button>
            ) : undefined
          }
        />

        {view === 'backups' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Last snapshot" value="13:00" sub="today · 11m 32s · verified" />
              <StatCard label="Retention" value="35 days" sub="+ 12 weekly fulls" delay={0.05} />
              <StatCard label="Total backup size" value="1.9 TB" sub="compressed, encrypted" delay={0.1} />
              <StatCard label="Restore test" value="Passed" sub="last drill: Jul 14" delay={0.15} />
            </div>
            <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
              {backups.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                  <Database size={15} className="text-foreground/40 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 1 }}>{b.type} · {b.target}</p>
                    <p className="font-mono text-[11px] text-foreground/45" style={{ marginBottom: 0 }}>{b.id} · {b.started} · {b.duration}</p>
                  </div>
                  <span className="font-mono text-[12px] text-foreground/55">{b.size}</span>
                  <StatusBadge value={b.status} />
                  <Button variant="outline" size="sm" className="h-7" onClick={() => toast.success(`Restore preview for ${b.id}`, { description: 'Restores to an isolated staging instance first — never directly to production.' })}>Restore…</Button>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'storage' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total used" value={`${totalStorage.toFixed(0)} GB`} sub="of 2 TB provisioned" />
              <StatCard label="Resumes stored" value="184K" sub="PDF/DOCX originals + parsed text" delay={0.05} />
              <StatCard label="Growth (30d)" value="+22 GB" delta="+6.8%" sub="within forecast" delay={0.1} />
              <StatCard label="Cold storage" value="61%" sub="files idle > 12 months" delay={0.15} />
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 14 }}>By organization</h3>
              <div className="space-y-3.5">
                {[...orgs].sort((a, b) => b.storageGb - a.storageGb).map((o) => (
                  <div key={o.id}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="font-medium text-foreground">{o.name}</span>
                      <span className="font-mono text-[12px] text-foreground/50">{o.storageGb} GB</span>
                    </div>
                    <Progress value={(o.storageGb / 140) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.success('Cold-storage archival started', { description: 'Idle files move to Glacier-class storage; ~$180/mo saved.' })}>Archive idle files</Button>
            </div>
          </>
        )}

        {view === 'residency' && (
          <div className="space-y-4">
            {regions.map((r) => (
              <div key={r.region} className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Globe2 size={17} className="text-foreground/55" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[13px] font-semibold text-foreground" style={{ marginBottom: 1 }}>{r.region}</p>
                    {r.primary && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary text-primary-foreground">PRIMARY</span>}
                  </div>
                  <p className="text-[12px] text-foreground/55" style={{ marginBottom: 0 }}>{r.services}</p>
                </div>
                <span className="font-mono text-[12px] text-foreground/55">{r.orgs} orgs</span>
                <Button variant="outline" size="sm" className="h-7" onClick={() => toast.success(`${r.region} configuration opened`, { description: 'Region moves require customer consent and a scheduled migration window.' })}>Configure</Button>
              </div>
            ))}
            <p className="text-[12px] text-foreground/50" style={{ marginBottom: 0 }}>
              Residency pinning guarantees data-at-rest and AI inference stay in-region. Cross-region moves are audited and require the org owner's signed consent.
            </p>
          </div>
        )}

        {view === 'jobs' && (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Export jobs</h3>
                <Button variant="outline" size="sm" onClick={() => toast.success('Export builder opened', { description: 'Choose entity, filters, and format. Large exports require approval.' })}>
                  <Download size={14} className="mr-1.5" /> New export
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
                {exportJobs.map((j) => (
                  <div key={j.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <Download size={14} className="text-foreground/40 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 1 }}>{j.name}</p>
                      <p className="font-mono text-[11px] text-foreground/45" style={{ marginBottom: 0 }}>{j.id} · {j.format} · {j.rows.toLocaleString()} rows · by {j.by}</p>
                    </div>
                    <span className="font-mono text-[12px] text-foreground/55">{j.size}</span>
                    <StatusBadge value={j.status} />
                    {j.status === 'Completed' && (
                      <Button variant="outline" size="sm" className="h-7" onClick={() => toast.success(`${j.id} download started`)}>Download</Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Import jobs</h3>
                <Button variant="outline" size="sm" onClick={() => toast.success('Import wizard opened', { description: 'Supported sources: Greenhouse, Lever, CSV, S3 bucket.' })}>
                  <UploadCloud size={14} className="mr-1.5" /> New import
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
                {importJobs.map((j) => (
                  <div key={j.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <UploadCloud size={14} className="text-foreground/40 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground" style={{ marginBottom: 1 }}>{j.name}</p>
                      <p className="font-mono text-[11px] text-foreground/45" style={{ marginBottom: 0 }}>{j.id} · {j.source} · {j.records.toLocaleString()} records · {j.started}</p>
                    </div>
                    {j.status === 'Processing' ? (
                      <div className="flex items-center gap-2 w-36">
                        <Progress value={j.progress} className="h-1.5 flex-1" />
                        <span className="font-mono text-[11px] text-foreground/50">{j.progress}%</span>
                      </div>
                    ) : (
                      <StatusBadge value={j.status} />
                    )}
                  </div>
                ))}
              </div>
            </section>
            <div className="flex items-center gap-2">
              <HardDrive size={13} className="text-foreground/40" />
              <p className="text-[12px] text-foreground/50" style={{ marginBottom: 0 }}>Exports above 10,000 records require second-admin approval (Security Center → Data export approval).</p>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
