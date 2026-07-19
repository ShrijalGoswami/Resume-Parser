'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CloudUpload,
  FileText,
  Loader2,
  RotateCw,
  X,
  XCircle,
} from 'lucide-react';
import { analyzeBatchWithProgress } from '@/services/api';
import { persistBatch } from '@/services/campaigns-api';
import { reindexCampaign } from '@/services/search-api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_MB = 10;
const ALLOWED = ['.pdf', '.docx'];
const CONCURRENCY = 3;

// The real upload → ready pipeline, surfaced stage-by-stage so a recruiter can
// see exactly how far each resume got (and precisely where it failed).
type StageKey = 'upload' | 'parse' | 'analyze' | 'index' | 'ready';
type StageStatus = 'pending' | 'active' | 'done' | 'failed';
const PIPELINE: { key: StageKey; label: string; active: string }[] = [
  { key: 'upload', label: 'Uploaded', active: 'Uploading…' },
  { key: 'parse', label: 'Parsed', active: 'Parsing resume…' },
  { key: 'analyze', label: 'AI Analysis Complete', active: 'Running AI analysis…' },
  { key: 'index', label: 'Indexed for Semantic Search', active: 'Indexing…' },
  { key: 'ready', label: 'Ready', active: 'Finalizing…' },
];
const STAGE_LABEL: Record<StageKey, string> = Object.fromEntries(
  PIPELINE.map((s) => [s.key, s.label])
) as Record<StageKey, string>;

const initStages = (): Record<StageKey, StageStatus> => ({
  upload: 'pending', parse: 'pending', analyze: 'pending', index: 'pending', ready: 'pending',
});

type Phase = 'queued' | 'duplicate' | 'active' | 'completed' | 'failed';

interface Item {
  id: string;
  file: File;
  phase: Phase;
  progress: number; // upload %
  stages: Record<StageKey, StageStatus>;
  error?: string;
  failedStage?: StageKey;
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
  const inFlight = useRef(0);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  // Ids already claimed for processing. `patch()` is async, so within pump()'s
  // synchronous while-loop `itemsRef.current` still shows just-claimed items as
  // 'queued' — without this guard the same file would be picked (and uploaded)
  // up to CONCURRENCY times, creating duplicate candidates.
  const startedRef = useRef<Set<string>>(new Set());
  const existing = new Set(existingFilenames.map((f) => f.toLowerCase()));

  const patch = useCallback((id: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));
  }, []);

  const patchStage = useCallback((id: string, updates: Partial<Record<StageKey, StageStatus>>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, stages: { ...it.stages, ...updates } } : it))
    );
  }, []);

  const processItem = useCallback(
    async (item: Item) => {
      const controller = new AbortController();
      const fail = (stage: StageKey, msg: string) =>
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, phase: 'failed', failedStage: stage, error: msg, stages: { ...it.stages, [stage]: 'failed' } }
              : it
          )
        );
      try {
        patch(item.id, { phase: 'active', error: undefined, failedStage: undefined, progress: 0, stages: { ...initStages(), upload: 'active' } });

        // 1) Upload + 2) Parse + 3) AI Analysis — one server call; upload
        // progress drives the first stage, the response resolves parse+analysis.
        const batch = await analyzeBatchWithProgress(
          jobDescription,
          [item.file],
          (pct) => {
            patch(item.id, { progress: pct });
            if (pct >= 100) patchStage(item.id, { upload: 'done', parse: 'active' });
          },
          controller.signal
        );
        const cand = batch.candidates?.[0];
        if (!cand || cand.status === 'failed') {
          const err = cand?.error || 'Analysis failed';
          const parseStage = /pars|read|extract|could not parse|unsupported/i.test(err);
          return fail(parseStage ? 'parse' : 'analyze', err);
        }
        patchStage(item.id, { parse: 'done', analyze: 'done', index: 'active' });
        patch(item.id, { candidateName: cand.name || item.file.name });

        // 4) Persist (idempotent by content hash) then make it searchable.
        try {
          await persistBatch(campaignId, batch);
        } catch (e) {
          return fail('index', `Save failed: ${e instanceof Error ? e.message : 'unknown error'}`);
        }
        onCandidateAdded(); // candidate now exists in the table
        try {
          await reindexCampaign(campaignId);
        } catch (e) {
          return fail('index', `Indexing failed: ${e instanceof Error ? e.message : 'unknown error'}`);
        }

        // 5) Ready
        patchStage(item.id, { index: 'done', ready: 'done' });
        patch(item.id, { phase: 'completed' });
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        const cur = itemsRef.current.find((x) => x.id === item.id);
        const stage: StageKey = cur?.stages.upload === 'done' ? 'analyze' : 'upload';
        fail(stage, e instanceof Error ? e.message : 'Upload failed');
      }
    },
    [campaignId, jobDescription, onCandidateAdded, patch, patchStage]
  );

  // pump: keep CONCURRENCY items processing
  const pump = useCallback(() => {
    if (!jobDescription.trim()) return;
    while (inFlight.current < CONCURRENCY) {
      const next = itemsRef.current.find(
        (i) => i.phase === 'queued' && !startedRef.current.has(i.id)
      );
      if (!next) break;
      startedRef.current.add(next.id); // claim synchronously — processed exactly once
      inFlight.current += 1;
      patch(next.id, { phase: 'active' });
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
        stages: initStages(),
        error: bad === 'failed' ? validationError(file) : bad === 'duplicate' ? 'Already in this campaign' : undefined,
      };
    });
    setItems((prev) => [...prev, ...next]);
  }

  function retry(id: string) {
    startedRef.current.delete(id); // allow re-processing
    patch(id, { phase: 'queued', error: undefined, failedStage: undefined, progress: 0, stages: initStages() });
  }
  function remove(id: string) {
    startedRef.current.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }
  function includeDuplicate(id: string) {
    startedRef.current.delete(id); // allow re-processing
    patch(id, { phase: 'queued', error: undefined });
  }

  const total = items.length;
  const done = items.filter((i) => i.phase === 'completed').length;
  const failed = items.filter((i) => i.phase === 'failed').length;
  const active = items.filter((i) => i.phase === 'active').length;
  const queued = items.filter((i) => i.phase === 'queued').length;
  const allDone = total > 0 && active === 0 && queued === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h2 className="font-semibold text-foreground">Upload &amp; analyze resumes</h2>
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
            <div className="text-sm font-medium text-foreground">Drag &amp; drop resumes here</div>
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

function StageRow({ label, status, activeLabel, progress }: { label: string; status: StageStatus; activeLabel: string; progress?: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {status === 'done' ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : status === 'active' ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
      ) : status === 'failed' ? (
        <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
      ) : (
        <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
      )}
      <span
        className={cn(
          status === 'done' ? 'text-foreground' :
          status === 'active' ? 'font-medium text-primary' :
          status === 'failed' ? 'text-rose-600' :
          'text-muted-foreground/60'
        )}
      >
        {status === 'active' ? activeLabel : label}
        {status === 'active' && progress != null && progress < 100 ? ` ${progress}%` : ''}
      </span>
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
  const isActive = item.phase === 'active';
  const showPipeline = isActive || item.phase === 'completed' || item.phase === 'failed';

  const headline =
    item.phase === 'queued' ? (position ? `Queued · #${position}` : 'Queued')
      : item.phase === 'duplicate' ? 'Duplicate'
      : item.phase === 'completed' ? 'Ready'
      : item.phase === 'failed' ? `Failed at “${STAGE_LABEL[item.failedStage ?? 'upload']}”`
      : 'Processing…';

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
            {headline}{item.error ? ` · ${item.error}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
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
          {!isActive && (
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pipeline stage checklist */}
      {showPipeline && (
        <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2.5 pl-1">
          {PIPELINE.map((s) => (
            <StageRow
              key={s.key}
              label={s.label}
              activeLabel={s.active}
              status={item.stages[s.key]}
              progress={s.key === 'upload' ? item.progress : undefined}
            />
          ))}
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
