'use client';

/**
 * Public marketing-site top bar for the landing page (`/`).
 *
 * Auth-aware: signed-out visitors get obvious "Log in" / "Get started" actions,
 * signed-in users get a direct "Go to Dashboard" jump. This is the primary entry
 * point into the product — no one should have to know or type a route.
 */
import Link from 'next/link';
import { ArrowRight, LayoutDashboard, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';

export function LandingNav() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">HireLens</span>
        </Link>

        <nav className="flex items-center gap-2">
          {loading ? null : user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">
                <LayoutDashboard className="mr-1.5 h-4 w-4" /> Go to Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login?mode=signup">
                  Get started <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
