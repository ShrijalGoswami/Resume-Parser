// Support Tickets — list with priority/status filters + full conversation view with reply and internal notes.
import { LifeBuoy, Send } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { PageHeader, StatusBadge } from '@/components/admin/Shared';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { tickets, type Ticket } from '@/lib/adminData';
import { toast } from 'sonner';

export default function AdminSupport() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [active, setActive] = useState<Ticket>(tickets[0]);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);

  const filtered = tickets.filter(
    (t) => (statusFilter === 'all' || t.status === statusFilter) && (priorityFilter === 'all' || t.priority === priorityFilter),
  );

  return (
    <AdminLayout title="Support Tickets">
      <div className="p-5 lg:p-7 max-w-[1360px] mx-auto">
        <PageHeader
          title="Support Tickets"
          desc={`${tickets.filter((t) => t.status === 'Open').length} open · ${tickets.filter((t) => t.status === 'Pending').length} pending · median first response 42 min`}
          actions={
            <>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 w-[120px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priority</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[120px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />

        <div className="grid lg:grid-cols-[380px_1fr] gap-5">
          {/* Ticket list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/60 h-fit">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <LifeBuoy size={20} className="text-foreground/30 mx-auto mb-2" />
                <p className="text-[13px] text-foreground/50" style={{ marginBottom: 0 }}>No tickets match your filters.</p>
              </div>
            ) : filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t)}
                className={`w-full text-left p-3.5 transition-colors ${active.id === t.id ? 'bg-secondary/70' : 'hover:bg-secondary/40'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge value={t.priority} />
                  <StatusBadge value={t.status} />
                  <span className="font-mono text-[10px] text-foreground/40 ml-auto">{t.updated}</span>
                </div>
                <p className="text-[13px] font-medium text-foreground leading-snug" style={{ marginBottom: 2 }}>{t.subject}</p>
                <p className="font-mono text-[11px] text-foreground/45" style={{ marginBottom: 0 }}>{t.id} · {t.org} · {t.requester}</p>
              </button>
            ))}
          </div>

          {/* Conversation */}
          <div className="rounded-xl border border-border bg-card flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>{active.subject}</h3>
                <StatusBadge value={active.priority} />
                <StatusBadge value={active.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[12px] text-foreground/50">
                <span className="font-mono">{active.id}</span>
                <span>{active.org} · {active.requester}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  Assignee:
                  <Select defaultValue={active.assignee} onValueChange={(v) => toast.success(`${active.id} assigned to ${v}`)}>
                    <SelectTrigger className="h-7 w-[140px] text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jonah Reyes">Jonah Reyes</SelectItem>
                      <SelectItem value="Mira Volkova">Mira Volkova</SelectItem>
                      <SelectItem value="Unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </span>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px]">
              {active.messages.map((m, i) => (
                <div key={i} className={`rounded-lg p-3.5 ${m.internal ? 'bg-amber-50/70 border border-amber-200' : m.from.includes('Reyes') || m.from.includes('Volkova') ? 'bg-secondary/60 ml-6' : 'bg-card border border-border mr-6'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-semibold text-foreground">{m.from}</span>
                    {m.internal && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-800">INTERNAL NOTE</span>}
                    <span className="font-mono text-[10px] text-foreground/40 ml-auto">{m.time}</span>
                  </div>
                  <p className="text-[13px] text-foreground/75 leading-relaxed" style={{ marginBottom: 0 }}>{m.text}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border space-y-2">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder={internal ? 'Add an internal note (customer will not see this)...' : `Reply to ${active.requester}...`} className={internal ? 'bg-amber-50/50' : ''} />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[12px] text-foreground/60 cursor-pointer">
                  <Switch checked={internal} onCheckedChange={setInternal} aria-label="Internal note" /> Internal note
                </label>
                <div className="ml-auto flex gap-2">
                  {(active.status === 'Open' || active.status === 'Pending') && (
                    <Button variant="outline" size="sm" onClick={() => toast.success(`${active.id} marked resolved`, { description: 'Customer receives a satisfaction survey.' })}>Resolve</Button>
                  )}
                  <Button
                    size="sm" className="bg-primary" disabled={!reply.trim()}
                    onClick={() => { toast.success(internal ? 'Internal note added' : `Reply sent to ${active.requester}`); setReply(''); }}
                  >
                    <Send size={13} className="mr-1.5" /> {internal ? 'Add note' : 'Send reply'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
