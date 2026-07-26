// HireLens Campaigns — list, search, filters, create dialog.
import { motion } from 'framer-motion';
import { Archive, Briefcase, Copy, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { campaigns as seedCampaigns, Campaign } from '@/lib/mockData';
import { toast } from 'sonner';

const statusStyle: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Draft: 'bg-slate-100 text-slate-600 border-slate-200',
  Paused: 'bg-amber-50 text-amber-700 border-amber-200',
  Closed: 'bg-rose-50 text-rose-600 border-rose-200',
};

export default function Campaigns() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [items, setItems] = useState<Campaign[]>(seedCampaigns);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', department: 'Engineering', location: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({ name: '', location: '', description: '' });
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  useEffect(() => {
    if (new URLSearchParams(search).get('new') === '1') setCreateOpen(true);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (c) =>
          (status === 'all' || c.status === status) &&
          (query === '' || c.name.toLowerCase().includes(query.toLowerCase()) || c.department.toLowerCase().includes(query.toLowerCase())),
      ),
    [items, query, status],
  );

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    const newCampaign: Campaign = {
      id: `CMP-${String(items.length + 1).padStart(3, '0')}`,
      name: form.name,
      department: form.department,
      location: form.location || 'Remote (US)',
      status: 'Draft',
      candidates: 0, matched: 0, interviews: 0, offers: 0,
      createdDate: '2026-07-25',
      hiringManager: 'Sarah Kim',
      description: form.description,
    };
    setItems((prev) => [newCampaign, ...prev]);
    setCreateOpen(false);
    setForm({ name: '', department: 'Engineering', location: '', description: '' });
    toast.success(`Campaign "${newCampaign.name}" created as draft`);
  };

  const openEdit = (cmp: Campaign) => {
    setEditTarget(cmp);
    setEditForm({ name: cmp.name, location: cmp.location, description: cmp.description });
  };

  const saveEdit = () => {
    if (!editForm.name.trim()) { toast.error('Campaign name is required'); return; }
    setItems((prev) => prev.map((c) => (c.id === editTarget!.id ? { ...c, ...editForm } : c)));
    setEditTarget(null);
    toast.success('Campaign updated');
  };

  const duplicate = (cmp: Campaign) => {
    const copy: Campaign = { ...cmp, id: `CMP-${String(items.length + 1).padStart(3, '0')}`, name: `${cmp.name} (copy)`, status: 'Draft', candidates: 0, matched: 0, interviews: 0, offers: 0 };
    setItems((prev) => [copy, ...prev]);
    toast.success(`Duplicated as "${copy.name}"`);
  };

  const archive = (cmp: Campaign) => {
    setItems((prev) => prev.map((c) => (c.id === cmp.id ? { ...c, status: 'Closed' as const } : c)));
    toast.success(`"${cmp.name}" archived`, { description: 'Archived campaigns keep their data and can be reopened.' });
  };

  const confirmDelete = () => {
    setItems((prev) => prev.filter((c) => c.id !== deleteTarget!.id));
    toast.success(`"${deleteTarget!.name}" deleted`);
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <AppLayout title="Campaigns">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5" aria-busy="true" aria-label="Loading campaigns">
          <div className="space-y-2">
            <div className="h-7 w-44 rounded-md bg-secondary animate-pulse" />
            <div className="h-4 w-64 rounded-md bg-secondary/70 animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 flex-1 rounded-md bg-secondary animate-pulse" />
            <div className="h-9 w-36 rounded-md bg-secondary animate-pulse" />
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Campaigns">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 4 }}>Campaigns</h2>
            <p className="text-sm text-foreground/60" style={{ marginBottom: 0 }}>
              <span className="font-mono">{items.filter((c) => c.status === 'Active').length}</span> active pipelines · <span className="font-mono">{items.reduce((s, c) => s + c.candidates, 0)}</span> total candidates
            </p>
          </div>
          <Button size="sm" className="bg-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={15} className="mr-1.5" /> New Campaign
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search campaigns by name or department..." className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Paused">Paused</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Briefcase size={20} className="text-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground" style={{ marginBottom: 4 }}>No campaigns found</p>
            <p className="text-sm text-foreground/50" style={{ marginBottom: 16 }}>Try a different search, or create a new campaign.</p>
            <Button size="sm" variant="outline" onClick={() => { setQuery(''); setStatus('all'); }}>Clear filters</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((cmp, i) => (
              <motion.div
                key={cmp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                onClick={() => navigate(`/app/campaigns/${cmp.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/app/campaigns/${cmp.id}`); }}
                className="rounded-xl border border-border bg-card p-5 text-left hover:border-accent/50 hover:shadow-md transition-all group cursor-pointer relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-[11px] text-foreground/40">{cmp.id}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`${statusStyle[cmp.status]} text-[11px]`}>{cmp.status}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-md text-foreground/40 hover:text-foreground hover:bg-secondary transition-colors"
                          aria-label="Campaign actions"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => openEdit(cmp)}><Pencil size={13} className="mr-1.5" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate(cmp)}><Copy size={13} className="mr-1.5" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => archive(cmp)} disabled={cmp.status === 'Closed'}><Archive size={13} className="mr-1.5" /> Archive</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteTarget(cmp)} className="text-destructive"><Trash2 size={13} className="mr-1.5" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <h3 className="text-[15px] font-semibold text-foreground leading-snug group-hover:text-accent transition-colors" style={{ marginBottom: 4 }}>{cmp.name}</h3>
                <p className="text-xs text-foreground/50" style={{ marginBottom: 14 }}>{cmp.department} · {cmp.location} · {cmp.hiringManager}</p>
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border/60">
                  {[
                    { label: 'Candidates', value: cmp.candidates },
                    { label: 'Matched', value: cmp.matched },
                    { label: 'Interviews', value: cmp.interviews },
                    { label: 'Offers', value: cmp.offers },
                  ].map((m) => (
                    <div key={m.label}>
                      <p className="font-mono text-sm font-semibold text-foreground" style={{ marginBottom: 0 }}>{m.value}</p>
                      <p className="text-[10px] uppercase tracking-wide text-foreground/40" style={{ marginBottom: 0 }}>{m.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit campaign</DialogTitle>
            <DialogDescription>Update the role details. Changes recalibrate AI screening for new applicants.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ename">Role title</Label>
              <Input id="ename" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eloc">Location</Label>
              <Input id="eloc" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edesc">Description</Label>
              <Textarea id="edesc" rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button className="bg-primary" onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the campaign and its pipeline configuration. Candidate profiles are preserved and remain searchable. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create campaign</DialogTitle>
            <DialogDescription>Set up a new hiring pipeline. You can add candidates and configure AI screening after creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cname">Role title</Label>
              <Input id="cname" placeholder="e.g. Senior Frontend Engineer" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Engineering', 'Design', 'Sales', 'People', 'Marketing', 'Finance'].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cloc">Location</Label>
                <Input id="cloc" placeholder="e.g. Remote (US)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cdesc">Description</Label>
              <Textarea id="cdesc" rows={3} placeholder="What is this role about? The AI uses this to calibrate screening." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-primary" onClick={handleCreate}>Create campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
