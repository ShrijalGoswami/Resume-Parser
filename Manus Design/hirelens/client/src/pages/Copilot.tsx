// HireLens AI Copilot — chat UI with simulated streaming, prompts, history, sources.
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Paperclip, Plus, Send, Sparkles, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  sources?: { label: string; ref: string }[];
  streaming?: boolean;
}

const suggestedPrompts = [
  'Who are the top 3 candidates for Senior Backend Engineer and why?',
  'Summarize the biggest risks across the Interview-stage candidates',
  'Draft screening questions for the Staff Product Designer role',
  'Which campaign has the healthiest pipeline right now?',
];

const historyItems = [
  { id: 1, title: 'Top backend candidates review', time: 'Today' },
  { id: 2, title: 'Designer portfolio rubric', time: 'Yesterday' },
  { id: 3, title: 'Q3 pipeline health check', time: 'Jul 22' },
  { id: 4, title: 'Offer letter tone review', time: 'Jul 20' },
];

const cannedResponses: Record<string, { text: string; sources: { label: string; ref: string }[] }> = {
  default: {
    text: "Based on the current Senior Backend Engineer pipeline, the three strongest candidates are:\n\n1. Elena Vasquez (94) — Strongest system-design evidence in the pool. Her resume documents a distributed event pipeline handling 2M events/min, with explicit trade-off analysis between Kafka and Kinesis. Confidence is high because claims are specific and verifiable.\n\n2. Nina Kovac (91) — Deep infrastructure background with 9 years of experience. Her Kubernetes migration work maps directly to the role's platform requirements. One flag: her most recent tenure was 11 months, worth exploring in the screen.\n\n3. James Chen (89) — Excellent cross-functional signals: led a team of 6 through a 9-month migration delivered early. Slightly lighter on distributed-systems depth than the top two.\n\nMy recommendation: fast-track Elena and Nina to technical interviews this week. James is a strong third — schedule his screen before Friday to keep momentum.",
    sources: [
      { label: 'Elena Vasquez — Resume analysis', ref: 'CND-1001' },
      { label: 'Nina Kovac — Resume analysis', ref: 'CND-1009' },
      { label: 'James Chen — Resume analysis', ref: 'CND-1002' },
      { label: 'Campaign: Senior Backend Engineer', ref: 'CMP-001' },
    ],
  },
  risks: {
    text: "Here are the biggest risks across the Interview-stage candidates right now:\n\n1. Tenure pattern — 3 of 8 Interview-stage candidates have most-recent roles under 12 months. None explain the moves in their resumes. Recommended: a neutral, direct question in each screen (\"What led to the change?\").\n\n2. Skill gap concentration — the Senior Backend pipeline is thin on frontend exposure. If the team expects occasional React work, only 2 of 6 backend candidates show any evidence of it.\n\n3. Single-source verification — for 2 candidates, key claims (team size, revenue impact) appear only in the resume with no public cross-reference. Confidence on those specific claims is Medium, not High.\n\n4. Timezone friction — one strong DevOps candidate is Lisbon-based with 4 hours of US-East overlap; worth confirming the team's collaboration windows before the final round.\n\nNone of these are disqualifying — they are interview topics. I've added suggested questions to each candidate's interview kit.",
    sources: [
      { label: 'Interview-stage cohort analysis', ref: 'CMP-001' },
      { label: 'Nina Kovac — Risk flags', ref: 'CND-1009' },
      { label: 'Carlos Hassan — Risk flags', ref: 'CND-1008' },
    ],
  },
  questions: {
    text: "Here's a structured question set for the Staff Product Designer screen, generated from the campaign requirements and typical evidence gaps:\n\nCraft & process\n1. Walk me through your most data-dense interface. What did you cut, and how did you decide?\n2. Show me a project where research changed your design direction. What was the before/after?\n\nSystems thinking\n3. Describe a design-system decision you made that other teams disagreed with. How did it resolve?\n\nCollaboration\n4. Tell me about a time engineering pushed back on a design for feasibility. What did you trade?\n\nRole-specific probes\n5. This role includes occasional marketing-site work — walk me through any brand-adjacent work you've done.\n6. How do you document accessibility requirements in your specs?\n\nEach question targets a requirement from the campaign description or a common evidence gap in the current applicant pool. Want me to tailor these for a specific candidate?",
    sources: [
      { label: 'Campaign: Staff Product Designer', ref: 'CMP-002' },
      { label: 'Applicant pool skill analysis', ref: 'CMP-002' },
    ],
  },
  pipeline: {
    text: "Pipeline health check across all active campaigns:\n\nHealthiest: Enterprise Account Executive (CMP-004) — 152 candidates, strong stage balance (40 matched, 15 in interview, 4 offers), and conversion rates above benchmark at every stage. Offer-acceptance is trending at 80%+.\n\nSolid: Senior Backend Engineer (CMP-001) — good volume (128) and matching (34), but interview throughput is the bottleneck: 12 candidates are interview-ready while only 4 slots are scheduled this week. Adding 2 more interviewers would clear the backlog in 8 days.\n\nNeeds attention: Engineering Manager, ML (CMP-003) — only 64 candidates and 1 offer out. Top-of-funnel is weak for a director-level search; recommend adding sourcing channels or a search partner. The one active offer has been out 6 days without response — a check-in is overdue.\n\nAt risk: Staff Product Designer (CMP-002) — screening conversion dropped 3 points this month. The AI flag pattern suggests the role description may be over-filtering portfolio-heavy candidates.",
    sources: [
      { label: 'Campaign: Enterprise Account Executive', ref: 'CMP-004' },
      { label: 'Campaign: Senior Backend Engineer', ref: 'CMP-001' },
      { label: 'Campaign: Engineering Manager, ML', ref: 'CMP-003' },
      { label: 'Analytics: conversion trends', ref: 'ANALYTICS' },
    ],
  },
};

const pickResponse = (content: string) => {
  const t = content.toLowerCase();
  if (/(risk|concern|flag|red)/.test(t)) return cannedResponses.risks;
  if (/(question|screen|draft|interview kit|scorecard)/.test(t)) return cannedResponses.questions;
  if (/(pipeline|campaign|healthiest|funnel|health)/.test(t)) return cannedResponses.pipeline;
  return cannedResponses.default;
};

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const send = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;
    setInput('');
    const userMsg: Message = { id: Date.now(), role: 'user', text: content };
    const resp = pickResponse(content);
    const asstId = Date.now() + 1;
    setMessages((m) => [...m, userMsg, { id: asstId, role: 'assistant', text: '', streaming: true }]);
    setIsStreaming(true);

    const words = resp.text.split(' ');
    let idx = 0;
    timerRef.current = setInterval(() => {
      idx += 3;
      const partial = words.slice(0, idx).join(' ');
      const done = idx >= words.length;
      setMessages((m) =>
        m.map((msg) =>
          msg.id === asstId
            ? { ...msg, text: partial, streaming: !done, sources: done ? resp.sources : undefined }
            : msg,
        ),
      );
      if (done && timerRef.current) {
        clearInterval(timerRef.current);
        setIsStreaming(false);
      }
    }, 40);
  };

  return (
    <AppLayout title="AI Copilot">
      <div className="flex h-full">
        {/* History sidebar */}
        <aside className="w-60 shrink-0 border-r border-border hidden lg:flex flex-col">
          <div className="p-3">
            <Button
              variant="outline" size="sm" className="w-full justify-start"
              onClick={() => { setMessages([]); toast.success('New conversation started'); }}
            >
              <Plus size={14} className="mr-1.5" /> New conversation
            </Button>
          </div>
          <div className="px-3 pb-1">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/40" style={{ marginBottom: 6 }}>Recent</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-4">
            {historyItems.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setIsStreaming(false);
                  const resp = cannedResponses.default;
                  setMessages([
                    { id: Date.now(), role: 'user', text: h.title },
                    { id: Date.now() + 1, role: 'assistant', text: resp.text, sources: resp.sources },
                  ]);
                  toast.success(`Restored "${h.title}"`);
                }}
                className="w-full text-left px-2.5 py-2 rounded-md hover:bg-secondary transition-colors"
              >
                <p className="text-[13px] text-foreground/80 truncate" style={{ marginBottom: 1 }}>{h.title}</p>
                <p className="font-mono text-[11px] text-foreground/40" style={{ marginBottom: 0 }}>{h.time}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center px-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-5">
                  <Sparkles size={22} className="text-white" />
                </div>
                <h2 className="text-xl font-semibold text-foreground" style={{ marginBottom: 6 }}>How can I help with hiring today?</h2>
                <p className="text-sm text-foreground/50 text-center max-w-md" style={{ marginBottom: 28 }}>
                  I can analyze candidates, compare profiles, draft interview questions, and explain every recommendation with evidence.
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
                  {suggestedPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="text-left text-[13px] text-foreground/75 rounded-lg border border-border bg-card px-4 py-3 hover:border-accent/50 hover:shadow-sm transition-all leading-snug"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex gap-3.5"
                    >
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${m.role === 'assistant' ? 'bg-gradient-to-br from-primary to-accent' : 'bg-secondary'}`}>
                        {m.role === 'assistant' ? <Sparkles size={15} className="text-white" /> : <User size={15} className="text-foreground/60" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide" style={{ marginBottom: 6 }}>
                          {m.role === 'assistant' ? 'HireLens AI' : 'You'}
                        </p>
                        <div className="text-[15px] text-foreground/85 leading-relaxed whitespace-pre-wrap" style={{ marginBottom: 0 }}>
                          {m.text}
                          {m.streaming && <span className="inline-block w-2 h-4 bg-accent/70 ml-0.5 animate-pulse rounded-sm align-text-bottom" />}
                        </div>
                        {m.sources && (
                          <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40" style={{ marginBottom: 8 }}>Sources</p>
                            <div className="grid sm:grid-cols-2 gap-1.5">
                              {m.sources.map((s) => (
                                <div key={s.ref} className="flex items-center gap-2 text-[13px] text-foreground/70">
                                  <FileText size={13} className="text-accent shrink-0" />
                                  <span className="truncate">{s.label}</span>
                                  <span className="font-mono text-[11px] text-foreground/40 shrink-0">{s.ref}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-4 shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-accent/50 transition-colors">
                <button
                  className="p-2 hover:bg-secondary rounded-lg transition-colors shrink-0"
                  onClick={() => {
                    const inp = document.createElement('input');
                    inp.type = 'file';
                    inp.accept = '.pdf,.docx,.txt';
                    inp.onchange = () => {
                      const f = inp.files?.[0];
                      if (f) toast.success(`"${f.name}" attached`, { description: 'The Copilot will reference this document in its next answer.' });
                    };
                    inp.click();
                  }}
                  aria-label="Attach file"
                >
                  <Paperclip size={16} className="text-foreground/50" />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  rows={1}
                  placeholder="Ask about candidates, campaigns, or hiring decisions..."
                  className="flex-1 resize-none bg-transparent text-[15px] text-foreground placeholder:text-foreground/40 outline-none py-2 max-h-40"
                />
                <Button size="icon-sm" className="bg-primary shrink-0 mb-0.5" onClick={() => send()} disabled={!input.trim() || isStreaming} aria-label="Send">
                  <Send size={14} />
                </Button>
              </div>
              <p className="text-[11px] text-foreground/35 text-center mt-2" style={{ marginBottom: 0 }}>
                AI can make mistakes. Every recommendation includes sources so you can verify.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
