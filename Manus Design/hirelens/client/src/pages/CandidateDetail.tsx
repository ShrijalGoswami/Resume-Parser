// HireLens Candidate Detail — resume, AI summary, strengths/risks/evidence, timeline, notes, interview kit.
import { motion } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, GitCompare,
  CalendarClock, Mail, MapPin, MessageSquarePlus, Briefcase, Send, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
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

const stageStyle: Record<string, string> = {
  Applied: 'bg-slate-100 text-slate-700', Screening: 'bg-blue-50 text-blue-700',
  Interview: 'bg-violet-50 text-violet-700', Offer: 'bg-amber-50 text-amber-700',
  Hired: 'bg-emerald-50 text-emerald-700', Rejected: 'bg-rose-50 text-rose-600',
};

const interviewKit = [
  { area: 'System Design', q: 'Walk me through the distributed event pipeline you built. What failure modes did you design for, and which one bit you anyway?', why: 'Tests depth behind the strongest resume claim.' },
  { area: 'Tenure', q: 'Your most recent role lasted 11 months. What led to the change, and what would have made you stay?', why: 'Directly addresses the flagged risk with a neutral framing.' },
  { area: 'Leadership', q: 'Tell me about a disagreement within the 6-person team you led during the migration. How was it resolved?', why: 'Probes the leadership evidence beyond headline claims.' },
  { area: 'Frontend Gap', q: 'This role includes occasional React work. How have you approached picking up unfamiliar stacks before?', why: 'Assesses adaptability for the identified skill gap.' },
];

export default function CandidateDetail() {
  const [, params] = useRoute('/app/candidates/:id');
  const [, navigate] = useLocation();
  const candidate = candidates.find((c) => c.id === params?.id) ?? candidates[0];
  const [stage, setStage] = useState<string>(candidate.stage);
  const [notes, setNotes] = useState(candidate.notes);
  const [noteDraft, setNoteDraft] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState(`Next steps — ${candidate.role} at Acme Corp`);
  const [emailBody, setEmailBody] = useState(`Hi ${candidate.name.split(' ')[0]},\n\nThanks for your application. We'd love to move forward with the next step of the process.\n\nBest,\nSarah`);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [interviewType, setInterviewType] = useState('Technical Screen');
  const [interviewTime, setInterviewTime] = useState('');

  const addNote = () => {
    if (!noteDraft.trim()) return;
    setNotes((n) => [{ author: 'Sarah Kim', date: '2026-07-25', text: noteDraft.trim() }, ...n]);
    setNoteDraft('');
    toast.success('Note added');
  };

  const scoreRing = candidate.aiScore >= 88 ? 'text-emerald-600' : candidate.aiScore >= 75 ? 'text-amber-600' : 'text-foreground/50';

  return (
    <AppLayout title={candidate.name}>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        <div>
          <Link href="/app/candidates">
            <a className="inline-flex items-center gap-1.5 text-[13px] text-foreground/50 hover:text-foreground transition-colors mb-3">
              <ArrowLeft size={14} /> All candidates
            </a>
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full ${candidate.avatarColor} text-white text-lg font-semibold flex items-center justify-center shrink-0`}>
                {candidate.initials}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-0.5">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 0 }}>{candidate.name}</h2>
                  <Badge variant="secondary" className={`${stageStyle[stage]} border-0`}>{stage}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[13px] text-foreground/55">
                  <span className="font-mono text-foreground/40">{candidate.id}</span>
                  <span className="flex items-center gap-1"><Briefcase size={13} /> {candidate.role}</span>
                  <span className="flex items-center gap-1"><MapPin size={13} /> {candidate.location}</span>
                  <span className="flex items-center gap-1"><Mail size={13} /> {candidate.email}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={stage} onValueChange={(v) => { setStage(v); toast.success(`Moved to ${v}`); }}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
                <Mail size={14} className="mr-1.5" /> Email
              </Button>
              <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
                <CalendarClock size={14} className="mr-1.5" /> Schedule
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/app/compare')}>
                <GitCompare size={14} className="mr-1.5" /> Compare
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success('Profile export started — PDF will download shortly')}>
                <Download size={14} className="mr-1.5" /> Export
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Left: AI analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              className="rounded-xl border border-accent/30 bg-gradient-to-b from-accent/5 to-transparent p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-accent" />
                  <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>AI Analysis</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-foreground/50">Confidence: <span className="font-medium text-foreground/75">{candidate.confidence}</span></span>
                  <div className={`font-mono text-2xl font-bold ${scoreRing}`}>{candidate.aiScore}<span className="text-sm font-normal text-foreground/40">/100</span></div>
                </div>
              </div>
              <p className="text-sm text-foreground/75 leading-relaxed" style={{ marginBottom: 0 }}>{candidate.summary}</p>
            </motion.div>

            <Tabs defaultValue="evidence">
              <TabsList>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="resume">Resume</TabsTrigger>
                <TabsTrigger value="interview">Interview Kit</TabsTrigger>
              </TabsList>

              {/* Evidence: strengths + risks */}
              <TabsContent value="evidence" className="mt-4 space-y-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <h4 className="text-sm font-semibold text-foreground" style={{ marginBottom: 0 }}>Strengths</h4>
                  </div>
                  <div className="space-y-4">
                    {candidate.strengths.map((s) => (
                      <div key={s.title} className="pl-4 border-l-2 border-emerald-200">
                        <p className="text-sm font-medium text-foreground" style={{ marginBottom: 3 }}>{s.title}</p>
                        <p className="text-[13px] text-foreground/60 leading-relaxed" style={{ marginBottom: 0 }}>
                          <span className="text-foreground/40 font-mono text-[11px] uppercase mr-1.5">Evidence</span>
                          {s.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={15} className="text-amber-600" />
                    <h4 className="text-sm font-semibold text-foreground" style={{ marginBottom: 0 }}>Risks & Gaps</h4>
                  </div>
                  <div className="space-y-4">
                    {candidate.risks.map((r) => (
                      <div key={r.title} className="pl-4 border-l-2 border-amber-200">
                        <p className="text-sm font-medium text-foreground" style={{ marginBottom: 3 }}>{r.title}</p>
                        <p className="text-[13px] text-foreground/60 leading-relaxed" style={{ marginBottom: 0 }}>
                          <span className="text-foreground/40 font-mono text-[11px] uppercase mr-1.5">Evidence</span>
                          {r.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-3">
                  <ShieldCheck size={15} className="text-foreground/45 shrink-0" />
                  <p className="text-[12px] text-foreground/55" style={{ marginBottom: 0 }}>
                    AI provides evidence, not verdicts. The hiring decision is always yours.
                  </p>
                </div>
              </TabsContent>

              {/* Skills */}
              <TabsContent value="skills" className="mt-4">
                <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                  {candidate.skills.map((s, i) => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                        <span className="font-mono text-[13px] font-semibold text-foreground/70">{s.level}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden mb-1.5">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${s.level}%` }}
                          transition={{ duration: 0.6, delay: i * 0.07, ease: [0.23, 1, 0.32, 1] }}
                          className={`h-full rounded-full ${s.level >= 88 ? 'bg-emerald-500' : s.level >= 75 ? 'bg-accent' : 'bg-foreground/30'}`}
                        />
                      </div>
                      <p className="text-[12px] text-foreground/50" style={{ marginBottom: 0 }}>{s.evidence}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Resume viewer */}
              <TabsContent value="resume" className="mt-4">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-foreground/50" />
                      <span className="text-sm font-medium text-foreground">{candidate.name.replace(' ', '_')}_Resume.pdf</span>
                      <span className="font-mono text-[11px] text-foreground/40">2 pages · 184 KB</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast.success('Resume download started')}>
                      <Download size={13} className="mr-1.5" /> Download
                    </Button>
                  </div>
                  <div className="p-8 bg-secondary/20">
                    <div className="max-w-xl mx-auto bg-white rounded-md shadow-sm border border-border p-8 space-y-5">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-lg font-bold text-slate-900" style={{ marginBottom: 2 }}>{candidate.name}</h3>
                        <p className="text-[13px] text-slate-500" style={{ marginBottom: 0 }}>{candidate.role} · {candidate.location} · {candidate.email}</p>
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400" style={{ marginBottom: 8 }}>Experience</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between">
                              <p className="text-sm font-semibold text-slate-800" style={{ marginBottom: 1 }}>Principal Engineer — Nimbus Data</p>
                              <span className="font-mono text-[11px] text-slate-400">2024 – 2026</span>
                            </div>
                            <p className="text-[13px] text-slate-600 leading-relaxed" style={{ marginBottom: 0 }}>
                              <mark className="bg-teal-50 text-slate-800 px-0.5 rounded">Designed a distributed event pipeline handling 2M events/min</mark>, evaluating Kafka vs Kinesis trade-offs. Reduced infrastructure cost by <mark className="bg-teal-50 text-slate-800 px-0.5 rounded">34%</mark> and improved p99 latency from 800ms to 120ms.
                            </p>
                          </div>
                          <div>
                            <div className="flex justify-between">
                              <p className="text-sm font-semibold text-slate-800" style={{ marginBottom: 1 }}>Senior Engineer — Vantage Systems</p>
                              <span className="font-mono text-[11px] text-slate-400">2021 – 2024</span>
                            </div>
                            <p className="text-[13px] text-slate-600 leading-relaxed" style={{ marginBottom: 0 }}>
                              <mark className="bg-teal-50 text-slate-800 px-0.5 rounded">Led a team of 6 engineers</mark> through a 9-month platform migration, delivered 2 weeks early. Owned service reliability for a B2B SaaS platform with 40k daily users.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400" style={{ marginBottom: 8 }}>Skills</h4>
                        <p className="text-[13px] text-slate-600" style={{ marginBottom: 0 }}>{candidate.tags.join(' · ')} · Distributed Systems · CI/CD · Observability</p>
                      </div>
                      <p className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100" style={{ marginBottom: 0 }}>
                        Highlighted passages are cited as evidence in the AI analysis
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Interview kit */}
              <TabsContent value="interview" className="mt-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground" style={{ marginBottom: 2 }}>Suggested interview questions</h4>
                      <p className="text-xs text-foreground/50" style={{ marginBottom: 0 }}>Generated from this candidate's specific evidence and risks</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast.success('Interview kit copied to clipboard')}>Copy all</Button>
                  </div>
                  <div className="space-y-4">
                    {interviewKit.map((q, i) => (
                      <div key={i} className="rounded-lg border border-border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/50 uppercase tracking-wide">{q.area}</span>
                        </div>
                        <p className="text-sm text-foreground/85 leading-relaxed" style={{ marginBottom: 6 }}>{q.q}</p>
                        <p className="text-[12px] text-foreground/45" style={{ marginBottom: 0 }}>
                          <span className="font-medium">Why:</span> {q.why}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: timeline + notes */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 16 }}>Timeline</h3>
              <div className="relative pl-5 space-y-5 before:absolute before:left-1 before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
                {candidate.timeline.map((t, i) => (
                  <div key={i} className="relative">
                    <span className={`absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full border-2 border-background ${t.type === 'ai' ? 'bg-accent' : t.type === 'interview' ? 'bg-violet-400' : 'bg-foreground/30'}`} />
                    <p className="text-[13px] text-foreground/80 leading-snug" style={{ marginBottom: 2 }}>{t.event}</p>
                    <p className="font-mono text-[11px] text-foreground/40" style={{ marginBottom: 0 }}>{t.date}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquarePlus size={15} className="text-foreground/50" />
                <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Notes</h3>
              </div>
              <div className="mb-4">
                <Textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a note for your team..."
                  rows={2}
                  className="mb-2 text-sm"
                />
                <Button size="sm" className="bg-primary w-full" onClick={addNote} disabled={!noteDraft.trim()}>
                  <Send size={13} className="mr-1.5" /> Add note
                </Button>
              </div>
              <div className="space-y-4">
                {notes.map((n, i) => (
                  <div key={i} className="rounded-lg bg-secondary/40 p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-foreground">{n.author}</span>
                      <span className="font-mono text-[11px] text-foreground/40">{n.date}</span>
                    </div>
                    <p className="text-[13px] text-foreground/70 leading-relaxed" style={{ marginBottom: 0 }}>{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Email {candidate.name}</DialogTitle>
            <DialogDescription>To: <span className="font-mono text-xs">{candidate.email}</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="esubj">Subject</Label>
              <Input id="esubj" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ebody">Message</Label>
              <Textarea id="ebody" rows={7} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button className="bg-primary" disabled={!emailSubject.trim() || !emailBody.trim()} onClick={() => { setEmailOpen(false); toast.success(`Email sent to ${candidate.name}`); }}>
              <Send size={14} className="mr-1.5" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule interview dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule interview</DialogTitle>
            <DialogDescription>{candidate.name} · {candidate.role}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Interview type</Label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Technical Screen', 'System Design', 'Portfolio Review', 'Leadership', 'Final Round'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="itime">Date & time</Label>
              <Input id="itime" type="datetime-local" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} />
            </div>
            <p className="text-xs text-foreground/50" style={{ marginBottom: 0 }}>
              A calendar invite with a Zoom link is sent automatically to the candidate and interviewer.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button className="bg-primary" disabled={!interviewTime} onClick={() => { setScheduleOpen(false); toast.success(`${interviewType} scheduled with ${candidate.name}`, { description: 'Invites sent to all participants.' }); }}>
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
