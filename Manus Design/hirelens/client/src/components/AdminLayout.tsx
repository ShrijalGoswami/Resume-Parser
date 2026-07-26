// HireLens Admin Console shell — grouped sidebar, header, consistent with recruiter portal style.
// Style: institutional light, teal accent, Inter body, JetBrains Mono technical.
import { motion } from 'framer-motion';
import {
  Activity, BarChart3, Bell, Building2, CreditCard, Database, FileText, Flag, Globe2,
  HardDrive, KeyRound, LayoutDashboard, LifeBuoy, Mail, MonitorCheck, Package, Palette,
  Receipt, Rocket, ScrollText, Server, Settings2, Shield, ShieldAlert, Sparkles, Terminal,
  UploadCloud, UserCog, Users, Wallet, ArrowLeft, Search,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

const navGroups: { label: string; items: { label: string; path: string; icon: any }[] }[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      { label: 'Activity Feed', path: '/admin/activity', icon: Activity },
      { label: 'System Status', path: '/admin/status', icon: MonitorCheck },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Organizations', path: '/admin/organizations', icon: Building2 },
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Teams', path: '/admin/teams', icon: UserCog },
      { label: 'Roles & Permissions', path: '/admin/roles', icon: Shield },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { label: 'Subscriptions', path: '/admin/subscriptions', icon: Package },
      { label: 'Billing', path: '/admin/billing', icon: CreditCard },
      { label: 'Invoices', path: '/admin/invoices', icon: Receipt },
      { label: 'Customer Accounts', path: '/admin/accounts', icon: Wallet },
      { label: 'Usage Analytics', path: '/admin/usage', icon: BarChart3 },
      { label: 'AI Usage', path: '/admin/ai-usage', icon: Sparkles },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Feature Flags', path: '/admin/flags', icon: Flag },
      { label: 'API Keys', path: '/admin/api-keys', icon: KeyRound },
      { label: 'Audit Logs', path: '/admin/audit', icon: ScrollText },
      { label: 'Security Center', path: '/admin/security', icon: ShieldAlert },
      { label: 'Monitoring', path: '/admin/monitoring', icon: Server },
      { label: 'Error Logs', path: '/admin/errors', icon: Terminal },
      { label: 'Backups', path: '/admin/backups', icon: Database },
      { label: 'Storage', path: '/admin/storage', icon: HardDrive },
      { label: 'Data Residency', path: '/admin/residency', icon: Globe2 },
      { label: 'Exports & Imports', path: '/admin/data-jobs', icon: UploadCloud },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { label: 'Support Tickets', path: '/admin/support', icon: LifeBuoy },
      { label: 'Integrations', path: '/admin/integrations', icon: Rocket },
      { label: 'Notifications', path: '/admin/notifications', icon: Bell },
      { label: 'Email Templates', path: '/admin/emails', icon: Mail },
      { label: 'Release Notes', path: '/admin/releases', icon: FileText },
      { label: 'Brand Settings', path: '/admin/brand', icon: Palette },
      { label: 'Settings', path: '/admin/settings', icon: Settings2 },
    ],
  },
];

export default function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const [location] = useLocation();
  const [q, setQ] = useState('');

  const filteredGroups = q.trim()
    ? navGroups
        .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) }))
        .filter((g) => g.items.length > 0)
    : navGroups;

  return (
    <div className="min-h-screen flex bg-secondary/40">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-card sticky top-0 h-screen">
        <div className="px-4 pt-4 pb-2 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield size={16} className="text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight" style={{ marginBottom: 0 }}>HireLens</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-foreground/45 leading-tight" style={{ marginBottom: 0 }}>Admin Console</p>
            </div>
          </Link>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a page..." className="h-8 pl-8 text-[13px]" />
          </div>
        </div>
        <ScrollArea className="flex-1 px-2 pb-2">
          {filteredGroups.map((g) => (
            <div key={g.label} className="mt-3">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-foreground/40" style={{ marginBottom: 4 }}>{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const active = location === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                        active ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground/65 hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <Icon size={14} className="shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <p className="px-2 pt-4 text-[13px] text-foreground/45">No pages match "{q}".</p>
          )}
        </ScrollArea>
        <div className="p-3 border-t border-border shrink-0">
          <Link href="/app/dashboard" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-foreground/60 hover:bg-secondary hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> Back to Recruiter Portal
          </Link>
          <div className="flex items-center gap-2.5 px-2 pt-2 mt-1 border-t border-border/60">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">MV</div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate" style={{ marginBottom: 0 }}>Mira Volkova</p>
              <p className="font-mono text-[10px] text-foreground/45 truncate" style={{ marginBottom: 0 }}>Platform Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-5 sticky top-0 z-20">
          <h1 className="text-sm font-semibold text-foreground" style={{ marginBottom: 0 }}>{title}</h1>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-foreground/50 px-2 py-0.5 rounded-full border border-border bg-secondary/50">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> AI inference degraded
            </span>
            <Link href="/admin/status" className="text-[12px] text-accent hover:underline">Status</Link>
          </div>
        </header>
        <motion.main
          key={location}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="flex-1"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
