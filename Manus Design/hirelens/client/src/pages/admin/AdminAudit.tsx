// Audit Logs — searchable timeline with actor, action, target, IP, severity filters, and CSV export.
import { Download, ScrollText } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { PageHeader, StatusBadge } from '@/components/admin/Shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auditEvents } from '@/lib/adminData';
import { toast } from 'sonner';

export default function AdminAudit() {
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState('all');

  const filtered = auditEvents.filter((e) => {
    const matchQ = q === '' || `${e.actor} ${e.action} ${e.target} ${e.org} ${e.ip}`.toLowerCase().includes(q.toLowerCase());
    return matchQ && (severity === 'all' || e.severity === severity);
  });

  return (
    <AdminLayout title="Audit Logs">
      <div className="p-5 lg:p-7 max-w-[1100px] mx-auto">
        <PageHeader
          title="Audit Logs"
          desc="Immutable record of every privileged action across the platform"
          actions={
            <Button
              variant="outline" size="sm"
              onClick={() => {
                const csv = [['ID', 'Actor', 'Action', 'Target', 'Org', 'IP', 'Time', 'Severity'], ...filtered.map((e) => [e.id, e.actor, e.action, e.target, e.org, e.ip, e.time, e.severity])]
                  .map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                const a = document.createElement('a');
                a.href = url; a.download = 'hirelens-audit-log.csv'; a.click();
                URL.revokeObjectURL(url);
                toast.success(`${filtered.length} events exported`);
              }}
            >
              <Download size={14} className="mr-1.5" /> Export
            </Button>
          }
        />

        <div className="flex flex-wrap gap-2 mb-5">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, action, target, IP..." className="h-9 max-w-sm text-[13px]" />
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-9 w-[140px] text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="Info">Info</SelectItem>
              <SelectItem value="Warning">Warning</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center bg-card/50">
            <ScrollText size={20} className="text-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-foreground/50" style={{ marginBottom: 8 }}>No events match your filters.</p>
            <Button variant="outline" size="sm" onClick={() => { setQ(''); setSeverity('all'); }}>Reset filters</Button>
          </div>
        ) : (
          <div className="relative pl-6 space-y-0">
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
            {filtered.map((e) => (
              <div key={e.id} className="relative pb-4">
                <span className={`absolute -left-6 top-1.5 w-[19px] h-[19px] rounded-full border-4 border-background ${
                  e.severity === 'Critical' ? 'bg-rose-500' : e.severity === 'Warning' ? 'bg-amber-500' : 'bg-sky-400'
                }`} />
                <div className="rounded-xl border border-border bg-card p-4 hover:border-accent/40 transition-colors">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-[12px] font-semibold text-foreground">{e.action}</span>
                    <StatusBadge value={e.severity} />
                    <span className="font-mono text-[11px] text-foreground/40 ml-auto">{e.time}</span>
                  </div>
                  <p className="text-[13px] text-foreground/70" style={{ marginBottom: 6 }}>{e.target}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground/45 font-mono">
                    <span>actor: {e.actor} ({e.actorEmail})</span>
                    <span>org: {e.org}</span>
                    <span>ip: {e.ip}</span>
                    <span>{e.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

