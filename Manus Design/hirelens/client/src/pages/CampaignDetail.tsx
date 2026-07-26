// HireLens Campaign Detail — overview, kanban pipeline, candidate table, upload, settings.
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRightLeft, CalendarDays, FileUp, MapPin, MoreHorizontal, Pause, Play, Settings2, Upload, User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useRoute, useSearch } from 'wouter';
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { campaigns, candidates } from '@/lib/mockData';
import { toast } from 'sonner';

const stages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'] as const;
const stageAccent: Record<string, string> = {
  Applied: 'border-t-slate-400', Screening: 'border-t-blue-400', Interview: 'border-t-violet-400',
  Offer: 'border-t-amber-400', Hired: 'border-t-emerald-400',
};

export default function CampaignDetail() {
  const [, params] = useRoute('/app/campaigns/:id');
  const [, navigate] = useLocation();
  const search = useSearch();
  const campaign = campaigns.find((c) => c.id === params?.id) ?? campaigns[0];
  const [uploadOpen, setUploadOpen] = useState(false);
  const [paused, setPaused] = useState(campaign.status === 'Paused');
  const [uploading, setUploading] = useState(false);
  const [aiScreening, setAiScreening] = useState(true);
  const [autoReject, setAutoReject] = useState(false);
  const [notifyOnMatch, setNotifyOnMatch] = useState(true);
  const [closeOpen, setCloseOpen] = useState(false);
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    if (new URLSearchParams(search).get('upload') === '1') setUploadOpen(true);
  }, [search]);

  const campaignCandidates = useMemo(
    () => candidates.filter((c) => c.campaignId === campaign.id),
    [campaign.id],
  );

  const byStage = useMemo(() => {
    const map: Record<string, typeof candidates> = {};
    const effectiveStage = (c: (typeof candidates)[number]) => stageOverrides[c.id] ?? c.stage;
    stages.forEach((s) => { map[s] = campaignCandidates.filter((c) => effectiveStage(c) === s); });
    return map;
  }, [campaignCandidates, stageOverrides]);

  const moveStage = (candidateId: string, name: string, to: string) => {
    setStageOverrides((m) => ({ ...m, [candidateId]: to }));
    toast.success(`${name} moved to ${to}`);
  };

  const simulateUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploadOpen(false);
      toast.success('3 resumes uploaded — AI analysis queued', {
        description: 'You will be notified when analysis completes.',
      });
    }, 1400);
  };

  return (
    <AppLayout title={campaign.name}>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        {/* Breadcrumb + header */}
        <div>
          <Link href="/app/campaigns">
            <a className="inline-flex items-center gap-1.5 text-[13px] text-foreground/50 hover:text-foreground transition-colors mb-3">
              <ArrowLeft size={14} /> All campaigns
            </a>
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 0 }}>{campaign.name}</h2>
                <Badge variant="outline" className={paused ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
                  {paused ? 'Paused' : 'Active'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[13px] text-foreground/55">
                <span className="font-mono text-foreground/40">{campaign.id}</span>
                <span className="flex items-center gap-1"><MapPin size={13} /> {campaign.location}</span>
                <span className="flex items-center gap-1"><User size={13} /> {campaign.hiringManager}</span>
                <span className="flex items-center gap-1"><CalendarDays size={13} /> Created {campaign.createdDate}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => { setPaused(!paused); toast.success(paused ? 'Campaign resumed' : 'Campaign paused'); }}
              >
                {paused ? <><Play size={14} className="mr-1.5" /> Resume</> : <><Pause size={14} className="mr-1.5" /> Pause</>}
              </Button>
              <Button size="sm" className="bg-primary" onClick={() => setUploadOpen(true)}>
                <FileUp size={14} className="mr-1.5" /> Upload resumes
              </Button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Candidates', value: campaign.candidates },
            { label: 'AI Matched', value: campaign.matched },
            { label: 'In Interview', value: campaign.interviews },
            { label: 'Offers Out', value: campaign.offers },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card px-5 py-4">
              <p className="font-mono text-xl font-semibold text-foreground" style={{ marginBottom: 2 }}>{s.value}</p>
              <p className="text-xs text-foreground/50" style={{ marginBottom: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="pipeline">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 size={13} className="mr-1" /> Settings</TabsTrigger>
          </TabsList>

          {/* Kanban pipeline */}
          <TabsContent value="pipeline" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-start">
              {stages.map((stage) => (
                <div key={stage} className={`rounded-lg bg-secondary/40 border-t-2 ${stageAccent[stage]}`}>
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                    <span className="text-xs font-semibold text-foreground/70">{stage}</span>
                    <span className="font-mono text-[11px] text-foreground/40">{byStage[stage].length}</span>
                  </div>
                  <div className="p-2 space-y-2 min-h-16">
                    {byStage[stage].length === 0 ? (
                      <p className="text-[11px] text-foreground/35 text-center py-4" style={{ marginBottom: 0 }}>No candidates</p>
                    ) : (
                      byStage[stage].map((c) => (
                        <div
                          key={c.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/app/candidates/${c.id}`)}
                          onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/app/candidates/${c.id}`); }}
                          className="w-full rounded-md bg-background border border-border p-2.5 text-left hover:border-accent/60 hover:shadow-sm transition-all cursor-pointer group/card"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-5 h-5 rounded-full ${c.avatarColor} text-white text-[9px] font-semibold flex items-center justify-center shrink-0`}>{c.initials}</div>
                            <span className="text-xs font-medium text-foreground truncate flex-1">{c.name}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-0.5 rounded text-foreground/30 hover:text-foreground hover:bg-secondary opacity-0 group-hover/card:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                                  aria-label={`Move ${c.name}`}
                                >
                                  <MoreHorizontal size={13} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuLabel className="text-xs flex items-center gap-1.5"><ArrowRightLeft size={11} /> Move to stage</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {stages.filter((s) => s !== stage).map((s) => (
                                  <DropdownMenuItem key={s} onClick={() => moveStage(c.id, c.name, s)}>{s}</DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-foreground/40">{c.id}</span>
                            <span className={`font-mono text-[11px] font-semibold ${c.aiScore >= 88 ? 'text-emerald-600' : c.aiScore >= 75 ? 'text-amber-600' : 'text-foreground/50'}`}>{c.aiScore}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* About */}
          <TabsContent value="about" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-6 max-w-2xl">
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 10 }}>Role description</h3>
              <p className="text-sm text-foreground/70 leading-relaxed" style={{ marginBottom: 20 }}>{campaign.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-foreground/45 uppercase tracking-wide" style={{ marginBottom: 3 }}>Department</p>
                  <p className="text-foreground/80" style={{ marginBottom: 0 }}>{campaign.department}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/45 uppercase tracking-wide" style={{ marginBottom: 3 }}>Hiring manager</p>
                  <p className="text-foreground/80" style={{ marginBottom: 0 }}>{campaign.hiringManager}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/45 uppercase tracking-wide" style={{ marginBottom: 3 }}>Location</p>
                  <p className="text-foreground/80" style={{ marginBottom: 0 }}>{campaign.location}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/45 uppercase tracking-wide" style={{ marginBottom: 3 }}>Created</p>
                  <p className="font-mono text-foreground/80" style={{ marginBottom: 0 }}>{campaign.createdDate}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="mt-4">
            <div className="rounded-xl border border-border bg-card divide-y divide-border/60 max-w-2xl">
              {[
                { title: 'AI screening', desc: 'Automatically analyze new resumes with evidence-based scoring', state: aiScreening, set: setAiScreening },
                { title: 'Auto-advance high matches', desc: 'Move candidates scoring 90+ directly to recruiter review', state: notifyOnMatch, set: setNotifyOnMatch },
                { title: 'Auto-reject below threshold', desc: 'Reject candidates scoring under 40 — always reviewable in the Rejected list', state: autoReject, set: setAutoReject },
              ].map((s) => (
                <div key={s.title} className="flex items-center justify-between gap-6 p-5">
                  <div>
                    <Label className="text-sm font-medium text-foreground">{s.title}</Label>
                    <p className="text-[13px] text-foreground/55 mt-0.5" style={{ marginBottom: 0 }}>{s.desc}</p>
                  </div>
                  <Switch checked={s.state} onCheckedChange={(v) => { s.set(v); toast.success(`${s.title} ${v ? 'enabled' : 'disabled'}`); }} />
                </div>
              ))}
              <div className="flex items-center justify-between gap-6 p-5">
                <div>
                  <Label className="text-sm font-medium text-destructive">Close campaign</Label>
                  <p className="text-[13px] text-foreground/55 mt-0.5" style={{ marginBottom: 0 }}>Stops all activity. Candidates remain accessible in read-only mode.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setCloseOpen(true)}>
                  Close
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload resumes</DialogTitle>
            <DialogDescription>PDF, DOCX, or TXT — up to 50 files. AI analysis begins immediately after upload.</DialogDescription>
          </DialogHeader>
          <button
            className="rounded-xl border-2 border-dashed border-border hover:border-accent/60 transition-colors py-12 flex flex-col items-center gap-3 w-full"
            onClick={simulateUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Upload size={22} className="text-accent" />
                </motion.div>
                <p className="text-sm text-foreground/60" style={{ marginBottom: 0 }}>Uploading and queueing analysis...</p>
              </>
            ) : (
              <>
                <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
                  <Upload size={19} className="text-foreground/50" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground" style={{ marginBottom: 2 }}>Click to browse files</p>
                  <p className="text-xs text-foreground/45" style={{ marginBottom: 0 }}>or drag and drop resumes here</p>
                </div>
              </>
            )}
          </button>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close campaign confirmation */}
      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close "{campaign.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              All pipeline activity stops and applicants can no longer apply. Candidate data stays accessible in read-only mode, and you can reopen the campaign within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep open</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setCloseOpen(false); toast.success('Campaign closed', { description: 'Reopen it anytime from the campaigns list.' }); navigate('/app/campaigns'); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Close campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
