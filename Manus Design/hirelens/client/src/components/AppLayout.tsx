// HireLens App Shell — Institutional Clarity design
// Inter only inside the app. JetBrains Mono for IDs/scores/timestamps.
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  BarChart3, Bell, Briefcase, CalendarClock, Check, ChevronsUpDown, GitCompare,
  HelpCircle, Home, LayoutGrid, LogOut, MessageSquare, Search, Settings,
  Sparkles, UploadCloud, Users, X,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { notifications as notifData, currentUser, candidates, campaigns } from '@/lib/mockData';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

const navSections = [
  {
    label: 'Workspace',
    items: [
      { icon: Home, label: 'Dashboard', href: '/app/dashboard' },
      { icon: Briefcase, label: 'Campaigns', href: '/app/campaigns' },
      { icon: Users, label: 'Candidates', href: '/app/candidates' },
      { icon: CalendarClock, label: 'Interviews', href: '/app/interviews' },
      { icon: UploadCloud, label: 'Upload', href: '/app/upload' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { icon: Sparkles, label: 'AI Copilot', href: '/app/copilot' },
      { icon: GitCompare, label: 'Compare', href: '/app/compare' },
      { icon: BarChart3, label: 'Analytics', href: '/app/analytics' },
    ],
  },
];

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [location, navigate] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifs, setNotifs] = useState(notifData);
  const unreadCount = notifs.filter((n) => n.unread).length;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const markAllRead = () => {
    setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })));
    toast.success('All notifications marked as read');
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="px-5 pt-5 pb-4">
          <Link href="/app/dashboard">
            <a className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <img src="/manus-storage/hirelens-logo_48bb43c6.png" alt="" className="w-5 h-5" />
              </div>
              <span className="font-semibold text-[15px] text-sidebar-foreground tracking-tight">HireLens</span>
            </a>
          </Link>
        </div>

        <div className="px-3 pb-3">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background/60 text-sm text-foreground/50 hover:text-foreground/80 hover:border-foreground/20 transition-colors"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/50">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-5 overflow-y-auto pb-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href}>
                      <a
                        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                        {item.label}
                      </a>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-0.5">
          <Link href="/app/help">
            <a className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors ${location.startsWith('/app/help') ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground/70 hover:bg-secondary hover:text-foreground'}`}>
              <HelpCircle size={16} strokeWidth={1.8} />
              Help
            </a>
          </Link>
          <Link href="/app/settings">
            <a className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors ${location.startsWith('/app/settings') ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground/70 hover:bg-secondary hover:text-foreground'}`}>
              <Settings size={16} strokeWidth={1.8} />
              Settings
            </a>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-secondary transition-colors">
                <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {currentUser.avatar}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">{currentUser.name}</p>
                  <p className="text-xs text-foreground/50 truncate leading-tight">{currentUser.organization}</p>
                </div>
                <ChevronsUpDown size={14} className="text-foreground/40 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/settings')}>Profile settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/settings?tab=billing')}>Billing</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/login')} className="text-destructive">
                <LogOut size={14} className="mr-1" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
          <h1 className="text-[15px] font-semibold text-foreground tracking-tight" style={{ fontSize: 15, marginBottom: 0 }}>{title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2 hover:bg-secondary rounded-md transition-colors"
              aria-label="Notifications"
            >
              <Bell size={17} className="text-foreground/60" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Notifications Drawer */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setNotifOpen(false)}
            />
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="fixed right-0 top-0 bottom-0 w-96 max-w-full bg-background border-l border-border z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
                <h2 className="font-semibold text-foreground" style={{ fontSize: 16, marginBottom: 0 }}>Notifications</h2>
                <div className="flex items-center gap-1">
                  <button onClick={markAllRead} className="text-xs text-accent hover:underline px-2 py-1">
                    Mark all read
                  </button>
                  <button onClick={() => setNotifOpen(false)} className="p-1.5 hover:bg-secondary rounded-md transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`px-5 py-4 border-b border-border/60 hover:bg-secondary/40 transition-colors cursor-default ${n.unread ? 'bg-accent/5' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {n.unread && <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />}
                      <div className={n.unread ? '' : 'pl-5'}>
                        <p className="text-sm font-medium text-foreground" style={{ marginBottom: 0 }}>{n.title}</p>
                        <p className="text-sm text-foreground/60 mt-0.5" style={{ marginBottom: 0 }}>{n.body}</p>
                        <p className="text-xs text-foreground/40 mt-1 font-mono" style={{ marginBottom: 0 }}>{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 shrink-0">
                <button
                  onClick={() => { setNotifOpen(false); navigate('/app/notifications'); }}
                  className="w-full text-center text-sm text-accent font-medium hover:underline py-1.5"
                >
                  View all notifications
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Command Palette */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search pages, candidates, campaigns..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Candidates">
            {candidates.slice(0, 8).map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name} ${c.role} ${c.id}`}
                onSelect={() => { setCmdOpen(false); navigate(`/app/candidates/${c.id}`); }}
              >
                <div className={`w-5 h-5 rounded-full ${c.avatarColor} text-white text-[9px] font-semibold flex items-center justify-center mr-2 shrink-0`}>{c.initials}</div>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="font-mono text-[11px] text-foreground/40 ml-2">{c.aiScore}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Campaigns">
            {campaigns.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name} ${c.department} ${c.id}`}
                onSelect={() => { setCmdOpen(false); navigate(`/app/campaigns/${c.id}`); }}
              >
                <Briefcase size={14} className="mr-2 text-foreground/50" />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="font-mono text-[11px] text-foreground/40 ml-2">{c.id}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Pages">
            {[
              { label: 'Dashboard', href: '/app/dashboard', icon: Home },
              { label: 'Campaigns', href: '/app/campaigns', icon: Briefcase },
              { label: 'Candidates', href: '/app/candidates', icon: Users },
              { label: 'Interviews', href: '/app/interviews', icon: CalendarClock },
              { label: 'Upload Resumes', href: '/app/upload', icon: UploadCloud },
              { label: 'AI Copilot', href: '/app/copilot', icon: Sparkles },
              { label: 'Compare', href: '/app/compare', icon: GitCompare },
              { label: 'Analytics', href: '/app/analytics', icon: BarChart3 },
              { label: 'Notifications', href: '/app/notifications', icon: Bell },
              { label: 'Help Center', href: '/app/help', icon: HelpCircle },
              { label: 'Settings', href: '/app/settings', icon: Settings },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <CommandItem
                  key={p.href}
                  onSelect={() => {
                    setCmdOpen(false);
                    navigate(p.href);
                  }}
                >
                  <Icon size={15} className="mr-2" />
                  {p.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading="Quick actions">
            <CommandItem onSelect={() => { setCmdOpen(false); navigate('/app/campaigns?new=1'); }}>
              <LayoutGrid size={15} className="mr-2" /> Create campaign
            </CommandItem>
            <CommandItem onSelect={() => { setCmdOpen(false); navigate('/app/candidates'); }}>
              <Check size={15} className="mr-2" /> Review pending candidates
            </CommandItem>
            <CommandItem onSelect={() => { setCmdOpen(false); navigate('/app/copilot'); }}>
              <MessageSquare size={15} className="mr-2" /> Ask AI Copilot
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
    </MotionConfig>
  );
}
