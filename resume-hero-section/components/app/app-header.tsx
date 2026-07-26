'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Bot, Brain, Building2, FileBarChart, LineChart, LogOut, PieChart, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { useOrg } from '@/components/org/org-provider';
import { Button } from '@/components/ui/button';

/**
 * Navigation for the remaining Classic (v1.0) surfaces.
 *
 * Only routes that still exist are listed. Dashboard, Campaigns, Search,
 * Integrations and Admin were migrated to V4 — their pages are gone and the
 * paths now redirect — so linking to them from here advertised surfaces that no
 * longer render and silently ejected the user into the V4 shell mid-session.
 * Their V4 equivalents are reached from the V4 rail and Settings instead.
 */
const PRIMARY_NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: '/insights', label: 'Insights', icon: PieChart },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
  { href: '/agent', label: 'Agent', icon: Bot },
  { href: '/knowledge', label: 'Knowledge', icon: Brain },
  { href: '/predictions', label: 'Predictions', icon: LineChart },
];

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { context, workspaces, switchTo } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/home" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <span className="font-semibold text-foreground">HireLens</span>
        </Link>
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Button
                key={href}
                asChild
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                className={active ? 'text-primary' : undefined}
              >
                <Link href={href} aria-current={active ? 'page' : undefined}>
                  <Icon className="mr-1.5 h-4 w-4" /> {label}
                </Link>
              </Button>
            );
          })}
          {context && (
            <div className="ml-2 hidden items-center gap-1.5 border-l border-border/60 pl-3 md:flex">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/80" title={`Plan: ${context.plan} · Role: ${context.role}`}>
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {context.organization.name}
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">{context.plan}</span>
              </span>
              {workspaces.length > 1 && (
                <select
                  value={context.workspace_id ?? ''}
                  onChange={(e) => switchTo(e.target.value)}
                  className="rounded-md border border-border/60 bg-card px-1.5 py-1 text-xs outline-none"
                  aria-label="Switch workspace"
                >
                  {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              )}
            </div>
          )}
          <div className="ml-2 hidden text-xs text-muted-foreground lg:block">{user?.email}</div>
          <Button variant="ghost" size="icon-sm" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
