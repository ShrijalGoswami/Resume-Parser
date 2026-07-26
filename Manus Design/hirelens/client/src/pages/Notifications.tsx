// HireLens Notifications — full center with read/unread, filters, mark all.
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, CheckCheck, Sparkles, CalendarClock, UserPlus, Award, Newspaper } from 'lucide-react';
import { useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { notifications as seed } from '@/lib/mockData';
import { toast } from 'sonner';

const typeIcon: Record<string, { icon: typeof Bell; cls: string }> = {
  ai: { icon: Sparkles, cls: 'bg-teal-50 text-teal-600' },
  interview: { icon: CalendarClock, cls: 'bg-violet-50 text-violet-600' },
  candidate: { icon: UserPlus, cls: 'bg-blue-50 text-blue-600' },
  offer: { icon: Award, cls: 'bg-emerald-50 text-emerald-600' },
  digest: { icon: Newspaper, cls: 'bg-slate-100 text-slate-600' },
};

const filters = ['All', 'Unread', 'AI', 'Interviews', 'Offers'];

export default function Notifications() {
  const [items, setItems] = useState(seed);
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'Unread': return items.filter((n) => n.unread);
      case 'AI': return items.filter((n) => n.type === 'ai');
      case 'Interviews': return items.filter((n) => n.type === 'interview');
      case 'Offers': return items.filter((n) => n.type === 'offer');
      default: return items;
    }
  }, [items, filter]);

  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <AppLayout title="Notifications">
      <div className="p-6 lg:p-8 max-w-[760px] mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 4 }}>Notifications</h2>
            <p className="text-sm text-foreground/60" style={{ marginBottom: 0 }}>
              <span className="font-mono">{unreadCount}</span> unread
            </p>
          </div>
          <Button
            variant="outline" size="sm"
            disabled={unreadCount === 0}
            onClick={() => { setItems((l) => l.map((n) => ({ ...n, unread: false }))); toast.success('All notifications marked as read'); }}
          >
            <CheckCheck size={14} className="mr-1.5" /> Mark all read
          </Button>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/60 hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bell size={20} className="text-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground" style={{ marginBottom: 4 }}>You're all caught up</p>
            <p className="text-sm text-foreground/50" style={{ marginBottom: 0 }}>No notifications match this filter.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
            <AnimatePresence initial={false}>
              {filtered.map((n) => {
                const meta = typeIcon[n.type] ?? typeIcon.digest;
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`flex items-start gap-3.5 px-5 py-4 ${n.unread ? 'bg-accent/[0.04]' : ''}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${n.unread ? 'font-semibold' : 'font-medium'} text-foreground`} style={{ marginBottom: 1 }}>{n.title}</p>
                        {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                      </div>
                      <p className="text-[13px] text-foreground/60" style={{ marginBottom: 2 }}>{n.body}</p>
                      <p className="font-mono text-[11px] text-foreground/40" style={{ marginBottom: 0 }}>{n.time}</p>
                    </div>
                    {n.unread && (
                      <button
                        onClick={() => setItems((l) => l.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))}
                        className="p-1.5 hover:bg-secondary rounded-md transition-colors shrink-0"
                        aria-label="Mark read"
                      >
                        <Check size={14} className="text-foreground/50" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
