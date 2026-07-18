'use client';

/**
 * Auth screen — email/password sign in & sign up via Supabase.
 * Designed so OAuth buttons can slot in later with no structural change.
 */
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

function AuthCard() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const next = params.get('next') || '/dashboard';
  const configured = isSupabaseConfigured();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      toast({ title: 'Auth not configured', description: 'Set Supabase env vars to enable sign in.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        toast({ title: 'Account created', description: 'You are signed in.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      toast({
        title: mode === 'signup' ? 'Sign up failed' : 'Sign in failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome to HireLens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage your hiring campaigns.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')}>
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4">
            <TabsContent value="signup" className="m-0 space-y-4 p-0">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  placeholder="Jane Recruiter"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </TabsContent>

            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </form>
        </Tabs>
      </div>

      {!configured && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-primary" />}>
        <AuthCard />
      </Suspense>
    </main>
  );
}
