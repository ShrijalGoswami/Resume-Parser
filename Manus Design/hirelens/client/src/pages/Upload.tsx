// HireLens Resume Upload — wizard: choose campaign -> add files -> upload with progress -> results.
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle, ArrowRight, CheckCircle2, FileText, RotateCcw, Trash2, UploadCloud, X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { campaigns } from '@/lib/mockData';
import { toast } from 'sonner';

interface UploadFile {
  id: number;
  name: string;
  size: string;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
}

const sampleNames = [
  'Elena_Vasquez_Resume.pdf', 'Marcus_Webb_CV.docx', 'Priya_Nair_Resume.pdf',
  'Jonathan_Reid_Resume.pdf', 'Amara_Osei_CV.docx', 'Kenji_Sato_Resume.pdf',
];

let fileIdCounter = 1;

export default function Upload() {
  const [, navigate] = useLocation();
  const [campaignId, setCampaignId] = useState(campaigns[0].id);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const timersRef = useRef<number[]>([]);

  const addFiles = useCallback((count = 3) => {
    const newFiles: UploadFile[] = Array.from({ length: count }, () => {
      const name = sampleNames[Math.floor(Math.random() * sampleNames.length)];
      return {
        id: fileIdCounter++,
        name: name.replace('.', `_${Math.floor(Math.random() * 90 + 10)}.`),
        size: `${Math.floor(Math.random() * 300 + 80)} KB`,
        progress: 0,
        status: 'queued' as const,
      };
    });
    setFiles((f) => [...f, ...newFiles]);
  }, []);

  const startUpload = () => {
    const queued = files.filter((f) => f.status === 'queued' || f.status === 'error');
    if (queued.length === 0) {
      toast.error('Add files to upload first');
      return;
    }
    queued.forEach((file, qi) => {
      setFiles((fs) => fs.map((f) => (f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f)));
      const failThis = qi === 1 && file.status !== 'error'; // simulate one failure on first pass
      let p = 0;
      const timer = window.setInterval(() => {
        p += Math.random() * 22 + 8;
        if (failThis && p > 55) {
          window.clearInterval(timer);
          setFiles((fs) => fs.map((f) => (f.id === file.id ? { ...f, status: 'error', progress: 55 } : f)));
          return;
        }
        if (p >= 100) {
          window.clearInterval(timer);
          setFiles((fs) => fs.map((f) => (f.id === file.id ? { ...f, status: 'done', progress: 100 } : f)));
        } else {
          setFiles((fs) => fs.map((f) => (f.id === file.id ? { ...f, progress: Math.min(99, p) } : f)));
        }
      }, 180 + qi * 60);
      timersRef.current.push(timer);
    });
  };

  const retryFile = (id: number) => {
    setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, status: 'uploading', progress: 0 } : f)));
    let p = 0;
    const timer = window.setInterval(() => {
      p += Math.random() * 25 + 10;
      if (p >= 100) {
        window.clearInterval(timer);
        setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, status: 'done', progress: 100 } : f)));
      } else {
        setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, progress: Math.min(99, p) } : f)));
      }
    }, 150);
    timersRef.current.push(timer);
  };

  const removeFile = (id: number) => setFiles((fs) => fs.filter((f) => f.id !== id));

  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const uploading = files.some((f) => f.status === 'uploading');
  const allDone = files.length > 0 && doneCount === files.length;
  const campaign = campaigns.find((c) => c.id === campaignId)!;

  return (
    <AppLayout title="Upload Resumes">
      <div className="p-6 lg:p-8 max-w-[860px] mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground" style={{ marginBottom: 4 }}>Upload Resumes</h2>
          <p className="text-sm text-foreground/60" style={{ marginBottom: 0 }}>
            Add resumes to a campaign. AI analysis starts automatically after upload — evidence extraction, scoring, and risk flags.
          </p>
        </div>

        {/* Step 1: Campaign */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="font-mono w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">1</span>
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Choose campaign</h3>
          </div>
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger className="w-full sm:w-96"><SelectValue /></SelectTrigger>
            <SelectContent>
              {campaigns.filter((c) => c.status !== 'Closed').map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} · {c.department}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 2: Files */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="font-mono w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">2</span>
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Add files</h3>
            <span className="text-xs text-foreground/45">PDF · DOCX · up to 50 files</span>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(3); toast.success('3 files added from drop'); }}
            className={`rounded-xl border-2 border-dashed transition-all py-10 flex flex-col items-center gap-3 ${
              dragOver ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border'
            }`}
          >
            <motion.div animate={dragOver ? { y: -4 } : { y: 0 }}>
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <UploadCloud size={22} className={dragOver ? 'text-accent' : 'text-foreground/45'} />
              </div>
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground" style={{ marginBottom: 2 }}>Drag resumes here</p>
              <p className="text-xs text-foreground/45" style={{ marginBottom: 10 }}>or</p>
              <Button size="sm" variant="outline" onClick={() => { addFiles(3); toast.success('3 files selected'); }}>
                Browse files
              </Button>
            </div>
          </div>

          {/* File list */}
          <AnimatePresence initial={false}>
            {files.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-2">
                {files.map((f) => (
                  <motion.div
                    key={f.id}
                    layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
                  >
                    <FileText size={16} className={f.status === 'error' ? 'text-rose-500' : f.status === 'done' ? 'text-emerald-600' : 'text-foreground/45'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-mono text-[12px] text-foreground/80 truncate" style={{ marginBottom: 0 }}>{f.name}</p>
                        <span className="font-mono text-[11px] text-foreground/40 shrink-0 ml-2">{f.size}</span>
                      </div>
                      {f.status === 'uploading' && (
                        <div className="h-1 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-accent rounded-full transition-all duration-200" style={{ width: `${f.progress}%` }} />
                        </div>
                      )}
                      {f.status === 'error' && (
                        <p className="text-[11px] text-rose-600 flex items-center gap-1" style={{ marginBottom: 0 }}>
                          <AlertCircle size={11} /> Upload failed — network interrupted
                        </p>
                      )}
                      {f.status === 'done' && (
                        <p className="text-[11px] text-emerald-600 flex items-center gap-1" style={{ marginBottom: 0 }}>
                          <CheckCircle2 size={11} /> Uploaded · queued for AI analysis
                        </p>
                      )}
                      {f.status === 'queued' && (
                        <p className="text-[11px] text-foreground/40" style={{ marginBottom: 0 }}>Ready to upload</p>
                      )}
                    </div>
                    <div className="shrink-0 flex gap-1">
                      {f.status === 'error' && (
                        <button onClick={() => retryFile(f.id)} className="p-1.5 hover:bg-secondary rounded-md transition-colors" aria-label="Retry">
                          <RotateCcw size={14} className="text-foreground/55" />
                        </button>
                      )}
                      {f.status !== 'uploading' && (
                        <button onClick={() => removeFile(f.id)} className="p-1.5 hover:bg-secondary rounded-md transition-colors" aria-label="Remove">
                          <Trash2 size={14} className="text-foreground/45" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 3: Upload */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="font-mono w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">3</span>
            <h3 className="text-[15px] font-semibold text-foreground" style={{ marginBottom: 0 }}>Upload & analyze</h3>
          </div>
          {allDone ? (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg bg-emerald-50 border border-emerald-200 p-5 text-center">
              <CheckCircle2 size={26} className="text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground" style={{ marginBottom: 4 }}>
                {doneCount} resume{doneCount > 1 ? 's' : ''} uploaded to {campaign.name}
              </p>
              <p className="text-[13px] text-foreground/60" style={{ marginBottom: 14 }}>
                AI analysis is running. Results appear in the campaign pipeline within ~2 minutes.
              </p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" className="bg-primary" onClick={() => navigate(`/app/campaigns/${campaignId}`)}>
                  View campaign pipeline <ArrowRight size={14} className="ml-1" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setFiles([])}>Upload more</Button>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-foreground/55" style={{ marginBottom: 0 }}>
                {files.length === 0
                  ? 'Add files above to begin.'
                  : `${files.length} file${files.length > 1 ? 's' : ''} ready · target: ${campaign.name}${errorCount > 0 ? ` · ${errorCount} failed (retry available)` : ''}`}
              </p>
              <Button className="bg-primary shrink-0" onClick={startUpload} disabled={files.length === 0 || uploading}>
                {uploading ? 'Uploading...' : 'Start upload'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
