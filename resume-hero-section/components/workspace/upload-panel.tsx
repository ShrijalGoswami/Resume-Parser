'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  FileText,
  Loader2,
  RotateCw,
  X,
  XCircle,
} from 'lucide-react';
import { analyzeBatchWithProgress } from '@/services/api';
import { persistBatch } from '@/services/campaigns-api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_MB = 10;
const ALLOWED = ['.pdf', '.docx'];
const CONCURRENCY = 3;
// Sub-stages surfaced while the (single) batch call runs server-side. Timing is
// indicative; the terminal Completed/Failed state is the real API outcome.
const AI_STAGES = [
  'Parsing resume',
  'Extracting skills',
  'Computing ATS score',
  'Matching against job description',
  'Running AI analysis',
];
const STAGE_MS = 1300;

type Phase =
  | 'queued'
  | 'duplicate'
  | 'uploading'
  | 'analyzing'
  | 'saving'
  | 'completed'
  | 'failed';

interface Item {
  id: string;
  file: File;
  phase: Phase;
  progress: number; // upload %
  analyzeStart?: number;
  error?: string;
  candidateName?: string;
}

let _seq = 0;
const uid = () => `u${Date.now()}_${_seq++}`;

function validate(file: File, existing: Set<string>): Phase | null {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED.includes(ext)) return 'failed';
  if (file.size > MAX_MB * 1024 * 1024) return 'failed';
  if (existing.has(file.name.toLowerCase())) return 'duplicate';
  return null;
}
function validationError(file: File): string | undefined {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED.includes(ext)) return `Unsupported type (${ext || 'none'}). Use PDF or DOCX.`;
  if (file.size > MAX_MB * 1024 * 1024) return `Too large (max ${MAX_MB}MB).`;
  return undefined;
}

export function UploadPanel({
  campaignId,
  jobDescription,
  existingFilenames,
  onCandidateAdded,
  onClose,
}: {
  campaignId: string;
  jobDescription: string;
  existingFilenames: string[];
  onCandidateAdded: () => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [, force] = useState(0);
  const inFlight = useRef(0);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const existing = new Set(existingFilenames.map((f) => f.toLowerCase()));

  // ticking clock so analyzing sub-stage advances per item
  useEffect(() => {
    const anyAnalyzing = items.some((i) => i.phase === 'analyzing');
    if (!anyAnalyzing) return;
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [items]);

  const patch = useCallback((id: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));
  }, []);

  const processItem = useCallback(
    async (item: Item) => {
      const controller = new AbortController();
      try {
        patch(item.id, { phase: 'uploading', progress: 0, error: undefined });
        const batch = await analyzeBatchWithProgress(
          jobDescription,
          [item.file],
          (pct) => {
            patch(item.id, { progress: pct });
            if (pct >= 100) patch(item.id, { phase: 'analyzing', analyzeStart: Date.now() });
          },
          controller.signal
        );
        const cand = batch.candidates?.[0];
        if (!cand || cand.status === 'failed') {
          patch(item.id, { phase: 'failed', error: cand?.error || 'Analysis failed' });
          return;
        }
        patch(item.id, { phase: 'saving' });
        await persistBatch(campaignId, batch);
        patch(item.id, { phase: 'completed', candidateName: cand.name || item.file.name });
        onCandidateAdded(); // auto-insert into table
      } catch (e) {
        patch(item.id, {
          phase: 'failed',
          error: e instanceof Error ? e.message : 'Upload failed',
        });
      }
    },
    [campaignId, jobDescription, onCandidateAdded, patch]
  );

  // pump: keep CONCURRENCY items processing
  const pump = useCallback(() => {
    if (!jobDescription.trim()) return;
    while (inFlight.current < CONCURRENCY) {
      const next = itemsRef.current.find((i) => i.phase === 'queued');
      if (!next) break;
      inFlight.current += 1;
      patch(next.id, { phase: 'uploading' });
      processItem(next).finally(() => {
        inFlight.current -= 1;
        setTimeout(pump, 0);
      });
    }
  }, [jobDescription, patch, processItem]);

  useEffect(() => {
    pump();
  }, [items, pump]);

  function addFiles(files: FileList | File[]) {
    const next: Item[] = Array.from(files).map((file) => {
      const bad = validate(file, existing);
      return {
        id: uid(),
        file,
        phase: bad ?? 'queued',
        progress: 0,
        error: bad === 'failed' ? validationError(file) : bad === 'duplicate' ? 'Already in this campaign' : undefined,
      };
    });
    setItems((prev) => [...prev, ...next]);
  }

  function retry(id: string) {
    patch(id, { phase: 'queued', error: undefined, progress: 0 });
  }
  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }
  function includeDuplicate(id: string) {
    patch(id, { phase: 'queued', error: undefined });
  }

  const total = items.length;
  const done = items.filter((i) => i.phase === 'completed').length;
  const failed = items.filter((i) => i.phase === 'failed').length;
  const active = items.filter((i) => ['uploading', 'analyzing', 'saving'].includes(i.phase)).length;
  const queued = items.filter((i) => i.phase === 'queued').length;
  const allDone = total > 0 && active === 0 && queued === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h2 className="font-semibold text-foreground">Upload & analyze resumes</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(85vh-56px)] overflow-y-auto p-5">
          {!jobDescription.trim() && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Add a job description to the campaign before uploading — candidates are ranked against it.
            </div>
          )}

          {/* dropzone */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition',
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            )}
          >
            <CloudUpload className={cn('h-8 w-8', dragOver ? 'text-primary' : 'text-muted-foreground')} />
            <div className="text-sm font-medium text-foreground">Drag & drop resumes here</div>
            <div className="text-xs text-muted-foreground">PDF or DOCX · up to {MAX_MB}MB each · multiple files</div>
            <input type="file" accept=".pdf,.docx" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
          </label>

          {/* summary */}
          {total > 0 && (
            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{total} file{total > 1 ? 's' : ''}</span>
              {active > 0 && <span className="text-primary">{active} processing</span>}
              {queued > 0 && <span>{queued} queued</span>}
              {done > 0 && <span className="text-emerald-600">{done} completed</span>}
              {failed > 0 && <span className="text-rose-600">{failed} failed</span>}
            </div>
          )}

          {/* queue */}
          <div className="mt-3 space-y-2">
            {items.map((it, idx) => (
              <QueueRow
                key={it.id}
                item={it}
                position={it.phase === 'queued' ? items.filter((x, i) => i < idx && x.phase === 'queued').length + 1 : undefined}
                onRetry={() => retry(it.id)}
                onRemove={() => remove(it.id)}
                onIncludeDuplicate={() => includeDuplicate(it.id)}
              />
            ))}
          </div>

          {allDone && (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center animate-in fade-in">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div className="text-sm font-medium text-emerald-800">
                {done} candidate{done !== 1 ? 's' : ''} added{failed > 0 ? ` · ${failed} failed` : ''}
              </div>
              <Button size="sm" onClick={onClose}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  item,
  position,
  onRetry,
  onRemove,
  onIncludeDuplicate,
}: {
  item: Item;
  position?: number;
  onRetry: () => void;
  onRemove: () => void;
  onIncludeDuplicate: () => void;
}) {
  const subStage =
    item.phase === 'analyzing' && item.analyzeStart
      ? AI_STAGES[Math.min(Math.floor((Date.now() - item.analyzeStart) / STAGE_MS), AI_STAGES.length - 1)]
      : null;

  const label: Record<Phase, string> = {
    queued: position ? `Queued · #${position}` : 'Queued',
    duplicate: 'Duplicate',
    uploading: `Uploading ${item.progress}%`,
    analyzing: subStage ?? 'Analyzing',
    saving: 'Saving results',
    completed: 'Completed',
    failed: 'Failed',
  };

  const active = ['uploading', 'analyzing', 'saving'].includes(item.phase);

  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">
            {item.candidateName || item.file.name}
          </div>
          <div className={cn(
            'text-xs',
            item.phase === 'completed' ? 'text-emerald-600'
              : item.phase === 'failed' ? 'text-rose-600'
              : item.phase === 'duplicate' ? 'text-amber-600'
              : 'text-muted-foreground'
          )}>
            {label[item.phase]}{item.error ? ` · ${item.error}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {active && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {item.phase === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          {item.phase === 'failed' && (
            <button onClick={onRetry} className="text-muted-foreground hover:text-primary" title="Retry">
              <RotateCw className="h-4 w-4" />
            </button>
          )}
          {item.phase === 'duplicate' && (
            <button onClick={onIncludeDuplicate} className="text-xs text-primary hover:underline" title="Upload anyway">
              Include
            </button>
          )}
          {!active && (
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* progress bar (upload) or indeterminate (processing) */}
      {active && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          {item.phase === 'uploading' ? (
            <div className="h-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
          ) : (
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          )}
        </div>
      )}
      {item.phase === 'duplicate' && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
          <AlertTriangle className="h-3 w-3" /> A resume with this filename is already in the campaign.
        </div>
      )}
    </div>
  );
}
