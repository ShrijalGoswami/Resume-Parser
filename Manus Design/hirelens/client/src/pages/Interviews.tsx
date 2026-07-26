// HireLens Interview Workspace — schedule, AI question kits, scorecards, decisions.
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock, CalendarPlus, CheckCircle2, ClipboardList, Sparkles, Star, Video, XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { candidates } from '@/lib/mockData';
import { toast } from 'sonner';

interface InterviewItem {
  id: number;
  candidate: string;
  candidateId: string;
  initials: string;
  color: string;
  role: string;
  type: string;
  time: string;
  interviewer: string;
  status: 'upcoming' | 'completed' | 'awaiting_scorecard';
}

const seed: InterviewItem[] = [
  { id: 1, candidate: 'Sofia Rossi', candidateId: 'CND-1005', initials: 'SR', color: 'bg-amber-500', role: 'Staff Product Designer', type: 'Portfolio Review', time: 'Today, 2:00 PM', interviewer: 'Marcus Chen', status: 'upcoming' },
  { id: 2, candidate: 'James Chen', candidateId: 'CND-1002', initials: 'JC', color: 'bg-teal-500', role: 'Senior Backend Engineer', type: 'System Design', time: 'Today, 4:30 PM', interviewer: 'Sarah Kim', status: 'upcoming' },
  { id: 3, candidate: 'Yuki Tanaka', candidateId: 'CND-1007', initials: 'YT', color: 'bg-cyan-600', role: 'Engineering Manager, ML', type: 'Leadership', time: 'Tomorrow, 10:00 AM', interviewer: 'Priya Sharma', status: 'upcoming' },
  { id: 4, candidate: 'Nina Kovac', candidateId: 'CND-1009', initials: 'NK', color: 'bg-violet-500', role: 'Senior Backend Engineer', type: 'Technical Screen', time: 'Tomorrow, 3:00 PM', interviewer: 'Sarah Kim', status: 'upcoming' },
  { id: 5, candidate: 'Elena Vasquez', candidateId: 'CND-1001', initials: 'EV', color: 'bg-blue-500', role: 'Senior Backend Engineer', type: 'System Design', time: 'Jul 23, 11:00 AM', interviewer: 'Sarah Kim', status: 'awaiting_scorecard' },
  { id: 6, candidate: 'Grace Liu', candidateId: 'CND-1011', initials: 'GL', color: 'bg-emerald-500', role: 'Engineering Manager, ML', type: 'Technical Screen', time: 'Jul 22, 2:00 PM', interviewer: 'Priya Sharma', status: 'completed' },
];

const scorecardDims = ['Technical Depth', 'Problem Solving', 'Communication', 'Leadership Signals', 'Role Fit'];

const questionKit = [
  { area: 'System Design', q: 'Walk me through the distributed event pipeline you built. What failure modes did you design for?' },
  { area: 'Trade-offs', q: 'You chose Kafka over Kinesis — what would have to change about the problem for you to reverse that decision?' },
  { area: 'Leadership', q: 'Describe a disagreement within your team during the migration. How was it resolved?' },
  { area: 'Growth', q: 'What is a technical belief you held two years ago that you no longer hold?' },
];

export default function Interviews() {
  const [, navigate] = useLocation();
  const [items, setItems] = useState(seed);
  const [scorecardFor, setScorecardFor] = useState<InterviewItem | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [verdict, setVerdict] = useState<'advance' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedCandidate, setSchedCandidate] = useState(candidates[0].id);
  const [schedType, setSchedType] = useState('Technical Screen');
  const [schedTime, setSchedTime] = useState('');

  const scheduleNew = () => {
    const c = candidates.find((x) => x.id === schedCandidate)!;
    setItems((list) => [
      { id: Date.now(), candidate: c.name, candidateId: c.id, initials: c.initials, color: c.avatarColor, role: c.role, type: schedType, time: schedTime ? new Date(schedTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'TBD', interviewer: 'Sarah Kim', status: 'upcoming' },
      ...list,
    ]);
    setScheduleOpen(false);
    setSchedTime('');
    toast.success(`${schedType} scheduled with ${c.name}`, { description: 'Calendar invites sent to all participants.' });
  };

  const upcoming = items.filter((i) => i.status === 'upcoming');
  const awaiting = items.filter((i) => i.status === 'awaiting_scorecard');
  const completed = items.filter((i) => i.status === 'completed');

  const openScorecard = (iv: InterviewItem) => {
    setScorecardFor(iv);
    setRatings({});
    setVerdict(null);
    setNotes('');
  };

  const submitScorecard = () => {
    if (Object.keys(ratings).length < scorecardDims.length) {
      toast.error('Please rate all dimensions before submitting');
      return;
    }
    if (!verdict) {
      toast.error('Please select a recommendation');
      return;
    }
    setItems((list) => list.map((x) => (x.id === scorecardFor!.id ? { ...x, status: 'completed' as const } : x)));
    setScorecardFor(null);
    toast.success(`Scorecard submitted for ${scorecardFor!.candidate}`, {
      description: `Recommendation: ${verdict === 'advance' ? 'Advance to next stage' : 'Do not advance'}`,
    });
  };

  const InterviewCard = ({ iv, action }: { iv: InterviewItem; action: 'join' | 'scorecard' | 'view' }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start gap-3.5">
        <div className={`w-10 h-10 rounded-full ${iv.color} text-white text-sm font-semibold flex items-center justify-center shrink-0`}>{iv.initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <button onClick={() => navigate(`/app/candidates/${iv.candidateId}`)} className="text-sm font-semibold text-foreground hover:text-accent transition-colors">
              {iv.candidate}
            </button>
            <Badge variant="secondary" className="text-[10px] bg-secondary border-0">{iv.type}</Badge>
          </div>
          <p className="text-xs text-foreground/50" style={{ marginBottom: 6 }}>{iv.role} · with {iv.interviewer}</p>
          <p className="font-mono text-[12px] text-foreground/65 flex items-center gap-1.5" style={{ marginBottom: 0 }}>
            <CalendarClock size={12} /> {iv.time}
          </p>
        </div>
        <div className="shrink-0">
          {action === 'join' && (
            <Button size="sm" variant="outline" onClick={() => toast.success('Opening meeting link', { description: 'Zoom integration generates links automatically.' })}>
              <Video size={13} className="mr-1.5" /> Join
            </Button>
          )}
          {action === 'scorecard' && (
            <Button size="sm" className="bg-primary" onClick={() => openScorecard(iv)}>
              <ClipboardList size={13} className="mr-1.5" /> Fill scorecard
            </Button>
          )}
          {action === 'view' && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/app/candidates/${iv.candidateId}`)}>
              View profile
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <AppLayout title="Interviews">
      <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 4 }}>Interview Workspace</h2>
            <p className="text-sm text-foreground/60" style={{ marginBottom: 0 }}>
              <span className="font-mono">{upcoming.length}</span> upcoming · <span className="font-mono">{awaiting.length}</span> awaiting scorecard
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success('Calendar sync active', { description: 'Interviews sync with Google Calendar automatically.' })}>
              <CalendarClock size={14} className="mr-1.5" /> Sync calendar
            </Button>
            <Button size="sm" className="bg-primary" onClick={() => setScheduleOpen(true)}>
              <CalendarPlus size={14} className="mr-1.5" /> Schedule interview
            </Button>
          </div>
        </div>

        {awaiting.length > 0 && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50/50 p-4 flex items-center gap-3">
            <ClipboardList size={16} className="text-amber-600 shrink-0" />
            <p className="text-[13px] text-foreground/75 flex-1" style={{ marginBottom: 0 }}>
              <span className="font-semibold">{awaiting.length} scorecard{awaiting.length > 1 ? 's' : ''} pending.</span> Feedback submitted within 24 hours is 40% more detailed — capture your judgment while it's fresh.
            </p>
          </div>
        )}

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="awaiting">Awaiting scorecard ({awaiting.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <p className="text-sm text-foreground/50" style={{ marginBottom: 0 }}>No upcoming interviews scheduled.</p>
              </div>
            ) : (
              upcoming.map((iv) => <InterviewCard key={iv.id} iv={iv} action="join" />)
            )}
          </TabsContent>
          <TabsContent value="awaiting" className="mt-4 space-y-3">
            {awaiting.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <p className="text-sm text-foreground/50" style={{ marginBottom: 0 }}>All scorecards are submitted. Nice work.</p>
              </div>
            ) : (
              awaiting.map((iv) => <InterviewCard key={iv.id} iv={iv} action="scorecard" />)
            )}
          </TabsContent>
          <TabsContent value="completed" className="mt-4 space-y-3">
            {completed.map((iv) => <InterviewCard key={iv.id} iv={iv} action="view" />)}
          </TabsContent>
        </Tabs>

        {/* AI question kit teaser */}
        <div className="rounded-xl border border-accent/30 bg-gradient-to-b from-accent/5 to-transparent p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-accent" />
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>AI question kit — next interview</h3>
          </div>
          <p className="text-[13px] text-foreground/60" style={{ marginBottom: 16 }}>
            Generated for <span className="font-medium text-foreground">James Chen · System Design</span>, based on his specific resume evidence and flagged risks.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {questionKit.map((q, i) => (
              <div key={i} className="rounded-lg bg-background border border-border/70 p-4">
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/50 uppercase tracking-wide">{q.area}</span>
                <p className="text-[13px] text-foreground/80 leading-relaxed mt-2" style={{ marginBottom: 0 }}>{q.q}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scorecard dialog */}
      <Dialog open={!!scorecardFor} onOpenChange={(o) => !o && setScorecardFor(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scorecard — {scorecardFor?.candidate}</DialogTitle>
            <DialogDescription>{scorecardFor?.type} · {scorecardFor?.time}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {scorecardDims.map((dim) => (
              <div key={dim}>
                <p className="text-sm font-medium text-foreground" style={{ marginBottom: 6 }}>{dim}</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRatings((r) => ({ ...r, [dim]: n }))}
                      className={`w-9 h-9 rounded-md border transition-all flex items-center justify-center ${
                        (ratings[dim] ?? 0) >= n ? 'bg-accent border-accent text-white' : 'border-border text-foreground/40 hover:border-accent/50'
                      }`}
                      aria-label={`${dim}: ${n} of 5`}
                    >
                      <Star size={14} fill={(ratings[dim] ?? 0) >= n ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-sm font-medium text-foreground" style={{ marginBottom: 6 }}>Evidence & observations</p>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What did you observe? Cite specific answers, not impressions." />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground" style={{ marginBottom: 6 }}>Recommendation</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVerdict('advance')}
                  className={`rounded-lg border p-3 flex items-center gap-2 transition-all ${verdict === 'advance' ? 'border-emerald-500 bg-emerald-50' : 'border-border hover:border-emerald-300'}`}
                >
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="text-sm font-medium text-foreground">Advance</span>
                </button>
                <button
                  onClick={() => setVerdict('reject')}
                  className={`rounded-lg border p-3 flex items-center gap-2 transition-all ${verdict === 'reject' ? 'border-rose-500 bg-rose-50' : 'border-border hover:border-rose-300'}`}
                >
                  <XCircle size={16} className="text-rose-600" />
                  <span className="text-sm font-medium text-foreground">Do not advance</span>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScorecardFor(null)}>Cancel</Button>
            <Button className="bg-primary" onClick={submitScorecard}>Submit scorecard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule interview dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule interview</DialogTitle>
            <DialogDescription>A calendar invite with a Zoom link is sent automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Candidate</Label>
              <Select value={schedCandidate} onValueChange={setSchedCandidate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {candidates.slice(0, 12).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} · {c.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interview type</Label>
              <Select value={schedType} onValueChange={setSchedType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Technical Screen', 'System Design', 'Portfolio Review', 'Leadership', 'Final Round'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedtime">Date & time</Label>
              <Input id="schedtime" type="datetime-local" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button className="bg-primary" disabled={!schedTime} onClick={scheduleNew}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
