'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { createCampaign } from '@/services/campaigns-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    company: '',
    role_title: '',
    location: '',
    employment_type: '',
    job_description: '',
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const campaign = await createCampaign({
        title: form.title,
        company: form.company || undefined,
        role_title: form.role_title || undefined,
        location: form.location || undefined,
        employment_type: form.employment_type || undefined,
        job_description: form.job_description || undefined,
        status: 'active',
      });
      toast({ title: 'Campaign created', description: campaign.title });
      router.replace(`/campaigns/${campaign.id}`);
    } catch (err) {
      toast({
        title: 'Could not create campaign',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold text-foreground">New hiring campaign</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          One campaign = one hiring process. Add the role and job description; candidates come next.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Campaign title *</Label>
            <Input
              id="title"
              required
              placeholder="Backend Engineer Hiring — Q3"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="Acme Corp"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role title</Label>
              <Input
                id="role"
                placeholder="Senior Backend Engineer"
                value={form.role_title}
                onChange={(e) => set('role_title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Remote · US"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="employment">Employment type</Label>
            <Input
              id="employment"
              placeholder="Full-time"
              value={form.employment_type}
              onChange={(e) => set('employment_type', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jd">Job description</Label>
            <Textarea
              id="jd"
              rows={8}
              placeholder="Paste the job description candidates will be ranked against…"
              value={form.job_description}
              onChange={(e) => set('job_description', e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create campaign
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
