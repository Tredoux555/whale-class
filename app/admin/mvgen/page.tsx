'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// ============================================================================
// MV Studio — control center for the LOCAL mvgen daemon (music-video renderer)
// ----------------------------------------------------------------------------
// The renderer runs on the operator's OWN Mac (127.0.0.1:8787), NOT on Railway.
// This page talks to it directly from the browser. Loopback is exempt from
// mixed-content blocking in Chrome; Safari blocks it (documented in the UI).
// See docs/handoffs/PLAN_MVGEN_STUDIO_JUL10.md for the LOCKED API contract.
// ============================================================================

const DAEMON = 'http://127.0.0.1:8787';
const START_COMMAND = 'cd ~/Desktop/Master\\ Brain/ACTIVE/montree && python3 scripts/mvgen/server.py';

// ── API payload types (per the contract) ───────────────────────────────────
interface HealthResponse {
  ok: boolean;
  version: string;
  ffmpeg: boolean;
  default_model: string;
}

interface BrowseDir {
  name: string;
  path: string;
  image_count?: number;
}

interface BrowseFile {
  name: string;
  path: string;
  size: number;
}

interface BrowseResponse {
  path: string;
  parent: string | null; // W1: daemon returns null at the jail top ($HOME)
  dirs: BrowseDir[];
  files: BrowseFile[];
}

type JobStatus = 'queued' | 'analyzing' | 'rendering' | 'done' | 'failed' | 'cancelled';

interface Job {
  job_id: string;
  song: string;
  status: JobStatus;
  progress: number;
  stage: string;
  created_at: string | number;
  out_path?: string;
  error?: string;
}

interface JobsResponse {
  jobs: Job[];
}

interface JobDetail extends Job {
  log_tail: string;
}

interface LibraryVideo {
  name: string;
  path: string;
  size: number;
  mtime: string | number;
  song: string;
  has_lyrics: boolean;
}

interface LibraryResponse {
  videos: LibraryVideo[];
}

interface LyricsResponse {
  lyrics_text: string | null;
}

type Theme = 'kids' | 'montree';
type CutEvery = 1 | 2 | 4;
type BrowseKind = 'audio' | 'images';

// ── V2: pulse / projects / uploads / plan (per the addendum) ────────────────
type Pulse = 'off' | 'anchor' | 'beat' | 'downbeat';
type UploadKind = 'audio' | 'image' | 'subs'; // NB: upload query uses singular 'image'

interface ProjectFile {
  name: string;
  path: string;
  size: number;
}

interface Project {
  name: string;
  slug: string;
  dir: string;
  audio: ProjectFile[];
  images: ProjectFile[];
  subs: ProjectFile[];
  image_count: number;
}

interface ProjectsResponse {
  projects: Project[];
}

interface UploadResult {
  saved: { name: string; path: string; size: number };
}

interface UploadItem {
  id: string;
  name: string;
  kind: UploadKind;
  pct: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

interface PlanSection {
  start: number;
  end: number;
  label: string;
}

interface PlanAnchor {
  word: string;
  time: number;
  image: string;
}

interface PlanMissing {
  word: string;
  count: number;
  first_time: number;
  suggested_filename: string;
  mj_prompt: string;
}

interface PlanResponse {
  sections: PlanSection[];
  anchors: PlanAnchor[];
  missing: PlanMissing[];
  fillers: string[];
}

// per-kind upload constraints (mirrors the daemon's own caps; UI-side hint only)
const UPLOAD_ACCEPT: Record<UploadKind, string> = {
  audio: '.mp3,.wav,.m4a,.flac',
  image: '.png,.jpg,.jpeg,.webp,.bmp',
  subs: '.srt,.vtt,.json,.txt',
};

const SECTION_COLORS = [
  'bg-cyan-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
  'bg-rose-600', 'bg-sky-600', 'bg-lime-600', 'bg-fuchsia-600',
];

// ── small helpers ───────────────────────────────────────────────────────────
function toMs(ts: string | number | undefined): number {
  if (ts === undefined || ts === null) return 0;
  if (typeof ts === 'number') {
    // Unix seconds (10 digits) vs ms (13 digits)
    return ts < 1e12 ? ts * 1000 : ts;
  }
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function humanSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function humanDate(ts: string | number): string {
  const ms = toMs(ts);
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
}

function joinPath(dir: string, sub: string): string {
  return `${dir.replace(/\/+$/, '')}/${sub}`;
}

function fmtSecs(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatElapsed(fromMs: number, nowMs: number): string {
  if (!fromMs) return '—';
  const secs = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function statusLabel(status: JobStatus): string {
  switch (status) {
    case 'queued': return '⏳ Queued';
    case 'analyzing': return '🔍 Analyzing';
    case 'rendering': return '🎬 Rendering';
    case 'done': return '✅ Done';
    case 'failed': return '❌ Failed';
    case 'cancelled': return '🚫 Cancelled';
    default: return status;
  }
}

function statusBarColor(status: JobStatus): string {
  switch (status) {
    case 'done': return 'bg-emerald-500';
    case 'failed': return 'bg-red-500';
    case 'cancelled': return 'bg-slate-500';
    default: return 'bg-cyan-500';
  }
}

const ACTIVE_STATUSES: JobStatus[] = ['queued', 'analyzing', 'rendering'];

export default function MvGenStudioPage() {
  // ── daemon health ─────────────────────────────────────────────────────────
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [daemonOnline, setDaemonOnline] = useState<boolean | null>(null); // null = unknown/first check
  const [copiedCmd, setCopiedCmd] = useState(false);

  // ── new render form ───────────────────────────────────────────────────────
  const [audioPath, setAudioPath] = useState('');
  const [imagesDir, setImagesDir] = useState('');
  const [imagesCount, setImagesCount] = useState<number | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>('kids');
  const [cutEvery, setCutEvery] = useState<CutEvery>(2);
  const [submitting, setSubmitting] = useState(false);
  const [renderError, setRenderError] = useState('');

  // ── file browser modal ────────────────────────────────────────────────────
  const [browseKind, setBrowseKind] = useState<BrowseKind | null>(null);
  const [browseData, setBrowseData] = useState<BrowseResponse | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState('');

  // ── queue ─────────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobLogs, setJobLogs] = useState<Record<string, string>>({});
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // ── render form: V2 additions ───────────────────────────────────────────────
  const [pulse, setPulse] = useState<Pulse>('anchor');
  const [subsPath, setSubsPath] = useState('');

  // ── projects ────────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [projectError, setProjectError] = useState('');

  // ── uploads (drag/drop + click-to-pick) ─────────────────────────────────────
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragKind, setDragKind] = useState<UploadKind | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const subsInputRef = useRef<HTMLInputElement>(null);

  // ── shot planner ─────────────────────────────────────────────────────────────
  const [planOpen, setPlanOpen] = useState(false);
  const [planData, setPlanData] = useState<PlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');
  const [planNoTimeline, setPlanNoTimeline] = useState(false);
  const [planAnalyzing, setPlanAnalyzing] = useState(false);
  const [analyzeJobId, setAnalyzeJobId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ── library ───────────────────────────────────────────────────────────────
  const [library, setLibrary] = useState<LibraryVideo[]>([]);
  const [libraryError, setLibraryError] = useState('');

  const prevActiveRef = useRef<number>(0);

  const selectedProject = projects.find((p) => p.slug === selectedSlug) || null;

  const hasActiveJob = jobs.some((j) => ACTIVE_STATUSES.includes(j.status));

  // ── health poll (every 5s) ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`${DAEMON}/api/health`, { signal: controller.signal });
        clearTimeout(to);
        if (cancelled) return;
        if (res.ok) {
          const data: HealthResponse = await res.json();
          setHealth(data);
          setDaemonOnline(true);
        } else {
          setDaemonOnline(false);
        }
      } catch {
        clearTimeout(to);
        if (!cancelled) setDaemonOnline(false);
      } finally {
        if (!cancelled) timer = setTimeout(poll, 5000);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // ── library fetch ───────────────────────────────────────────────────────────
  const fetchLibrary = useCallback(async () => {
    try {
      const res = await fetch(`${DAEMON}/api/library`);
      if (!res.ok) return;
      const data: LibraryResponse = await res.json();
      setLibrary(Array.isArray(data.videos) ? data.videos : []);
    } catch {
      // daemon offline — leave existing library as-is
    }
  }, []);

  // ── projects fetch ───────────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${DAEMON}/api/projects`);
      if (!res.ok) return;
      const data: ProjectsResponse = await res.json();
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch {
      // daemon offline — leave existing projects as-is
    }
  }, []);

  // ── jobs poll (adaptive: 1.5s while active, else 8s) ────────────────────────
  useEffect(() => {
    if (daemonOnline === false) return; // don't hammer an offline daemon
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      let interval = 8000;
      try {
        const res = await fetch(`${DAEMON}/api/jobs`);
        if (res.ok) {
          const data: JobsResponse = await res.json();
          if (!cancelled) {
            const list = Array.isArray(data.jobs) ? data.jobs : [];
            setJobs(list);
            const activeCount = list.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
            interval = activeCount > 0 ? 1500 : 8000;
            // when the active set drains to zero, a job just finished → refresh library
            if (prevActiveRef.current > 0 && activeCount === 0) {
              fetchLibrary();
            }
            prevActiveRef.current = activeCount;
          }
        }
      } catch {
        // offline; the health poll owns the offline banner
      } finally {
        if (!cancelled) timer = setTimeout(poll, interval);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [daemonOnline, fetchLibrary]);

  // ── initial library + projects load once the daemon reports online ──────────
  useEffect(() => {
    if (daemonOnline) {
      fetchLibrary();
      fetchProjects();
    }
  }, [daemonOnline, fetchLibrary, fetchProjects]);

  // ── keep the render form's images dir synced to the selected project ────────
  // (re-runs after uploads refresh the projects list, so new artwork shows up)
  useEffect(() => {
    if (!selectedSlug) return;
    const p = projects.find((x) => x.slug === selectedSlug);
    if (p) {
      setImagesDir(joinPath(p.dir, 'images'));
      setImagesCount(typeof p.image_count === 'number' ? p.image_count : p.images.length);
    }
  }, [projects, selectedSlug]);

  // ── 1s elapsed ticker (only while a job is active) ──────────────────────────
  useEffect(() => {
    if (!hasActiveJob) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasActiveJob]);

  // ── file browser ────────────────────────────────────────────────────────────
  const loadBrowse = useCallback(async (kind: BrowseKind, path?: string) => {
    setBrowseLoading(true);
    setBrowseError('');
    try {
      const qs = new URLSearchParams({ kind });
      if (path) qs.set('path', path);
      const res = await fetch(`${DAEMON}/api/browse?${qs.toString()}`);
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* not JSON */ }
        setBrowseError(msg);
        return;
      }
      const data: BrowseResponse = await res.json();
      setBrowseData(data);
    } catch {
      setBrowseError('Could not reach the daemon. Make sure it is running (see the status banner).');
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  const openBrowser = (kind: BrowseKind) => {
    setBrowseKind(kind);
    setBrowseData(null);
    setBrowseError('');
    loadBrowse(kind);
  };

  const closeBrowser = () => {
    setBrowseKind(null);
    setBrowseData(null);
    setBrowseError('');
  };

  // ── lyrics autoload on audio pick ───────────────────────────────────────────
  const loadLyrics = useCallback(async (path: string) => {
    setLyricsLoading(true);
    try {
      const res = await fetch(`${DAEMON}/api/lyrics?audio_path=${encodeURIComponent(path)}`);
      if (!res.ok) return;
      const data: LyricsResponse = await res.json();
      if (data.lyrics_text) setLyrics(data.lyrics_text);
    } catch {
      // ignore — lyrics stay whatever the operator typed
    } finally {
      setLyricsLoading(false);
    }
  }, []);

  const selectAudioFile = (file: BrowseFile) => {
    setAudioPath(file.path);
    setRenderError('');
    closeBrowser();
    loadLyrics(file.path);
  };

  const selectImagesDir = (path: string, count: number | null) => {
    setImagesDir(path);
    setImagesCount(count);
    setRenderError('');
    closeBrowser();
  };

  // ── copy helpers ────────────────────────────────────────────────────────────
  const copyToClipboard = async (text: string, onDone?: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      if (onDone) onDone();
    } catch {
      // clipboard blocked — no-op
    }
  };

  const copyWithKey = (text: string, key: string) => {
    copyToClipboard(text, () => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    });
  };

  // ── project select / create ──────────────────────────────────────────────────
  const selectProject = useCallback((slug: string) => {
    setProjectError('');
    setRenderError('');
    if (!slug) {
      // deselect → fall back to the file-browser (escape hatch) flow; keep paths
      setSelectedSlug(null);
      return;
    }
    setSelectedSlug(slug);
    const p = projects.find((x) => x.slug === slug);
    if (p) {
      setImagesDir(joinPath(p.dir, 'images'));
      setImagesCount(typeof p.image_count === 'number' ? p.image_count : p.images.length);
      // reset audio + subs so the operator picks from this project's files
      setAudioPath('');
      setSubsPath('');
    }
  }, [projects]);

  const createProject = async () => {
    const name = window.prompt('New project name:');
    if (!name || !name.trim()) return;
    setProjectError('');
    try {
      const res = await fetch(`${DAEMON}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* not JSON */ }
        setProjectError(res.status === 409 && !msg.startsWith('HTTP') ? msg : (res.status === 409 ? 'A project with that name already exists.' : msg));
        return;
      }
      const data: { project: Project } = await res.json();
      await fetchProjects();
      if (data.project?.slug) selectProject(data.project.slug);
    } catch {
      setProjectError('Could not reach the daemon. Make sure it is running (see the status banner).');
    }
  };

  // ── raw-body XHR upload (per addendum §B: X-Filename header, streaming write) ─
  const xhrUploadFile = (
    slug: string,
    kind: UploadKind,
    file: File,
    onProgress: (pct: number) => void,
  ): Promise<UploadResult> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${DAEMON}/api/upload?project=${encodeURIComponent(slug)}&kind=${kind}`;
      xhr.open('POST', url, true);
      // filename travels in a header; body is the RAW file bytes (not multipart)
      xhr.setRequestHeader('X-Filename', encodeURIComponent(file.name));
      xhr.timeout = 600_000;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as UploadResult);
          } catch {
            resolve({ saved: { name: file.name, path: '', size: file.size } });
          }
        } else {
          // surface the daemon's error text verbatim (incl. 413 over-cap / 415 bad ext)
          const body = (xhr.responseText || '').trim();
          let msg = body;
          try {
            const j = JSON.parse(body);
            if (j?.error) msg = j.error;
          } catch { /* plain-text or empty */ }
          reject(new Error(msg || `HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error — is the daemon running?'));
      xhr.ontimeout = () => reject(new Error('Upload timed out.'));
      xhr.send(file);
    });

  const handleFiles = async (kind: UploadKind, fileList: FileList | null) => {
    if (!selectedSlug || !fileList || fileList.length === 0) return;
    const slug = selectedSlug;
    const files = Array.from(fileList);
    // sequential queue — one file at a time is fine per the contract
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setUploads((prev) => [{ id, name: file.name, kind, pct: 0, status: 'uploading' }, ...prev]);
      try {
        await xhrUploadFile(slug, kind, file, (pct) => {
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, pct } : u)));
        });
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, pct: 100, status: 'done' } : u)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'error', error: msg } : u)));
      }
    }
    // refresh the project listing so the new files appear in the dropdowns
    fetchProjects();
  };

  const inputRefFor = (kind: UploadKind) =>
    kind === 'audio' ? audioInputRef : kind === 'image' ? imageInputRef : subsInputRef;

  const clearFinishedUploads = () =>
    setUploads((prev) => prev.filter((u) => u.status === 'uploading'));

  // ── shot planner ─────────────────────────────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    if (!audioPath || !imagesDir) {
      setPlanError('Pick an audio track and an images folder first.');
      return;
    }
    setPlanLoading(true);
    setPlanError('');
    setPlanNoTimeline(false);
    try {
      const qs = new URLSearchParams({ audio_path: audioPath, images_dir: imagesDir, theme });
      const res = await fetch(`${DAEMON}/api/plan?${qs.toString()}`);
      if (res.status === 404) {
        setPlanNoTimeline(true);
        setPlanData(null);
        return;
      }
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* not JSON */ }
        setPlanError(msg);
        return;
      }
      const data: PlanResponse = await res.json();
      setPlanData(data);
    } catch {
      setPlanError('Could not reach the daemon. Make sure it is running (see the status banner).');
    } finally {
      setPlanLoading(false);
    }
  }, [audioPath, imagesDir, theme]);

  const runAnalyze = async () => {
    if (!audioPath || planAnalyzing) return;
    setPlanError('');
    setPlanNoTimeline(false);
    setPlanAnalyzing(true);
    try {
      const res = await fetch(`${DAEMON}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'analyze',
          audio_path: audioPath,
          lyrics_text: lyrics.trim() ? lyrics : undefined,
          subs_path: subsPath || undefined,
        }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* not JSON */ }
        setPlanError(msg);
        setPlanAnalyzing(false);
        return;
      }
      const data: { job_id: string } = await res.json();
      setAnalyzeJobId(data.job_id || null);
      // refresh the queue immediately so the analyze job shows up
      const jobsRes = await fetch(`${DAEMON}/api/jobs`);
      if (jobsRes.ok) {
        const jd: JobsResponse = await jobsRes.json();
        setJobs(Array.isArray(jd.jobs) ? jd.jobs : []);
      }
    } catch {
      setPlanError('Could not reach the daemon. Make sure it is running (see the status banner).');
      setPlanAnalyzing(false);
    }
  };

  // watch the analyze job to completion, then auto-load the plan
  useEffect(() => {
    if (!analyzeJobId) return;
    const job = jobs.find((j) => j.job_id === analyzeJobId);
    if (!job) return;
    if (job.status === 'done') {
      setAnalyzeJobId(null);
      setPlanAnalyzing(false);
      fetchPlan();
    } else if (job.status === 'failed' || job.status === 'cancelled') {
      setAnalyzeJobId(null);
      setPlanAnalyzing(false);
      setPlanError(job.error || `Analysis ${job.status}.`);
    }
  }, [jobs, analyzeJobId, fetchPlan]);

  // ── submit render ───────────────────────────────────────────────────────────
  const submitRender = async () => {
    if (!audioPath || !imagesDir || submitting) return;
    setSubmitting(true);
    setRenderError('');
    try {
      const res = await fetch(`${DAEMON}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_path: audioPath,
          images_dir: imagesDir,
          lyrics_text: lyrics.trim() ? lyrics : undefined,
          subs_path: subsPath || undefined,
          theme,
          engine: 'slideshow',
          cut_every: cutEvery,
          pulse,
        }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* not JSON */ }
        setRenderError(msg);
        return;
      }
      // 202 accepted — refresh the queue immediately
      const jobsRes = await fetch(`${DAEMON}/api/jobs`);
      if (jobsRes.ok) {
        const data: JobsResponse = await jobsRes.json();
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      }
    } catch {
      setRenderError('Could not reach the daemon. Make sure it is running (see the status banner).');
    } finally {
      setSubmitting(false);
    }
  };

  // ── cancel a job ─────────────────────────────────────────────────────────────
  const cancelJob = async (jobId: string, song: string) => {
    if (!confirm(`Cancel the render for "${song}"? This stops ffmpeg immediately.`)) return;
    try {
      await fetch(`${DAEMON}/api/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });
      const res = await fetch(`${DAEMON}/api/jobs`);
      if (res.ok) {
        const data: JobsResponse = await res.json();
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      }
    } catch {
      // offline — banner covers it
    }
  };

  // ── expand a job to view its log tail ───────────────────────────────────────
  const toggleJobLog = async (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(jobId);
    try {
      const res = await fetch(`${DAEMON}/api/jobs/${encodeURIComponent(jobId)}`);
      if (!res.ok) return;
      const data: JobDetail = await res.json();
      setJobLogs((prev) => ({ ...prev, [jobId]: data.log_tail || '(no log output)' }));
    } catch {
      setJobLogs((prev) => ({ ...prev, [jobId]: '(could not load log — daemon offline)' }));
    }
  };

  // ── delete a library video ──────────────────────────────────────────────────
  const deleteVideo = async (video: LibraryVideo) => {
    if (!confirm(`Delete "${video.name}"? This removes the file from disk and cannot be undone.`)) return;
    setLibraryError('');
    try {
      const res = await fetch(`${DAEMON}/api/library/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: video.path }),
      });
      if (res.ok) {
        setLibrary((prev) => prev.filter((v) => v.path !== video.path));
      } else {
        // W2: surface the server's error text rather than silently refreshing
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* not JSON */ }
        setLibraryError(`Could not delete "${video.name}": ${msg}`);
        fetchLibrary();
      }
    } catch {
      setLibraryError(`Could not delete "${video.name}" — the daemon may be offline.`);
    }
  };

  const canRender = !!audioPath && !!imagesDir && !submitting && daemonOnline !== false;

  // ── breadcrumb from returned parent + path ──────────────────────────────────
  const currentBrowsePath = browseData?.path || '';

  // plan section strip total (guard against an empty sections array)
  const planTotal = planData && planData.sections.length > 0
    ? Math.max(...planData.sections.map((s) => s.end))
    : 0;

  // ── dropzone renderer (plain JSX builder — no hooks, safe to call inline) ────
  const renderDropzone = (kind: UploadKind, label: string, emoji: string, files: ProjectFile[]) => {
    const kindUploads = uploads.filter((u) => u.kind === kind);
    const active = dragKind === kind;
    return (
      <div className="flex flex-col">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragKind(kind); }}
          onDragLeave={(e) => { e.preventDefault(); setDragKind((k) => (k === kind ? null : k)); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragKind(null);
            handleFiles(kind, e.dataTransfer.files);
          }}
          onClick={() => inputRefFor(kind).current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
            active
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-slate-600 bg-slate-900 hover:border-slate-500'
          }`}
        >
          <div className="text-2xl mb-1">{emoji}</div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="text-xs text-slate-500 mt-0.5">Drop files or click · {files.length} in project</div>
        </div>
        <input
          ref={inputRefFor(kind)}
          type="file"
          multiple
          accept={UPLOAD_ACCEPT[kind]}
          className="hidden"
          onChange={(e) => {
            handleFiles(kind, e.target.files);
            e.target.value = '';
          }}
        />
        {/* in-flight / finished upload rows for this kind */}
        {kindUploads.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {kindUploads.map((u) => (
              <div key={u.id} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-300 min-w-0">{u.name}</span>
                  <span className={`shrink-0 ${
                    u.status === 'error' ? 'text-red-400' : u.status === 'done' ? 'text-emerald-400' : 'text-cyan-400'
                  }`}>
                    {u.status === 'uploading' ? `${u.pct}%` : u.status === 'done' ? '✓' : '✗'}
                  </span>
                </div>
                {u.status === 'uploading' && (
                  <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden mt-0.5">
                    <div className="h-1.5 rounded-full bg-cyan-500 transition-all duration-200" style={{ width: `${u.pct}%` }} />
                  </div>
                )}
                {u.status === 'error' && u.error && (
                  <div className="text-red-300 break-words whitespace-pre-wrap font-mono mt-0.5">{u.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* existing project files */}
        {files.length > 0 && (
          <div className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
            {files.map((f) => (
              <div key={f.path} className="flex items-center justify-between gap-2 text-xs text-slate-400">
                <span className="truncate min-w-0">{f.name}</span>
                <span className="shrink-0 text-slate-600">{humanSize(f.size)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">🎼 MV Studio</h1>
            <p className="text-gray-400 mt-1">Local music-video generator — beat-synced slideshows from your songs</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* ─────────────────────────────── Daemon status banner ─────────────── */}
        {daemonOnline === false || daemonOnline === null ? (
          <div className="bg-amber-900/40 border border-amber-600/60 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-amber-300 mb-2">
              {daemonOnline === null ? '🔌 Connecting to the renderer…' : '🔌 Renderer daemon is not running'}
            </h3>
            <p className="text-amber-100/80 text-sm mb-3">
              MV Studio renders on your own Mac — nothing runs on the server. Start the daemon in a
              terminal, then this panel connects automatically.
            </p>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 flex items-center gap-3 mb-3">
              <code className="flex-1 text-emerald-300 text-xs sm:text-sm font-mono break-all">{START_COMMAND}</code>
              <button
                onClick={() => copyToClipboard(START_COMMAND, () => {
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 1500);
                })}
                className="shrink-0 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-xs font-medium"
              >
                {copiedCmd ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <p className="text-amber-200/60 text-xs">
              Works in Chrome (Safari blocks localhost calls from HTTPS pages).
            </p>
          </div>
        ) : (
          <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="font-bold text-emerald-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Renderer online
            </span>
            {health && (
              <>
                <span className="text-emerald-200/70 text-sm">v{health.version}</span>
                <span className="text-emerald-200/70 text-sm">
                  ffmpeg {health.ffmpeg ? '✓' : '✗ missing'}
                </span>
                <span className="text-emerald-200/70 text-sm">model: {health.default_model}</span>
              </>
            )}
          </div>
        )}

        {/* ─────────────────────────────── Projects ───────────────────────────── */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold">🗂️ Project</h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedSlug || ''}
                onChange={(e) => selectProject(e.target.value)}
                disabled={daemonOnline === false}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none disabled:opacity-40"
              >
                <option value="">No project — browse files</option>
                {projects.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} ({p.image_count} img)
                  </option>
                ))}
              </select>
              <button
                onClick={createProject}
                disabled={daemonOnline === false}
                className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
              >
                ＋ New project
              </button>
            </div>
          </div>

          {projectError && (
            <div className="bg-red-900/40 border border-red-600/60 rounded-lg p-3 mb-4 text-sm text-red-200 break-words">
              {projectError}
            </div>
          )}

          {selectedProject ? (
            <>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs text-slate-500 break-all min-w-0">
                  <code>{selectedProject.dir}</code>
                </p>
                {uploads.some((u) => u.status !== 'uploading') && (
                  <button
                    onClick={clearFinishedUploads}
                    className="shrink-0 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                  >
                    Clear finished
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {renderDropzone('audio', 'Audio', '🎵', selectedProject.audio)}
                {renderDropzone('image', 'Images', '🖼️', selectedProject.images)}
                {renderDropzone('subs', 'Subtitles', '💬', selectedProject.subs)}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Dropped files become selectable in the render form below (audio + subtitle dropdowns; images
                folder is set automatically). Drop a MacWhisper <code>.srt</code>/<code>.vtt</code> into Subtitles for exact timing.
              </p>
            </>
          ) : (
            <p className="text-slate-500 text-sm py-2">
              Create or select a project to drag &amp; drop your song, artwork and subtitles — or use the
              file-browser pickers in the render form for one-off renders.
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─────────────────────────────── New Render ──────────────────────── */}
          <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h2 className="text-xl font-bold mb-4">🎬 New Render</h2>

            {/* Audio picker */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Audio track</label>
              {selectedProject ? (
                <>
                  <div className="flex gap-2">
                    <select
                      value={audioPath}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAudioPath(v);
                        setRenderError('');
                        if (v) loadLyrics(v);
                      }}
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Select project audio…</option>
                      {selectedProject.audio.map((f) => (
                        <option key={f.path} value={f.path}>{f.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => openBrowser('audio')}
                      disabled={daemonOnline === false}
                      className="shrink-0 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm"
                      title="Browse the filesystem instead"
                    >
                      📂 Browse
                    </button>
                  </div>
                  {audioPath && (
                    <p className="text-xs text-slate-500 mt-1 truncate" title={audioPath}>{audioPath}</p>
                  )}
                </>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm truncate min-w-0">
                    {audioPath ? <span className="text-white">{audioPath}</span> : <span className="text-slate-500">No file selected</span>}
                  </div>
                  <button
                    onClick={() => openBrowser('audio')}
                    disabled={daemonOnline === false}
                    className="shrink-0 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
                  >
                    📂 Pick audio
                  </button>
                </div>
              )}
            </div>

            {/* Images dir picker */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Images folder</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm truncate min-w-0">
                  {imagesDir ? (
                    <span className="text-white">
                      {imagesDir}
                      {imagesCount !== null && <span className="text-slate-400"> · {imagesCount} images</span>}
                    </span>
                  ) : (
                    <span className="text-slate-500">No folder selected</span>
                  )}
                </div>
                <button
                  onClick={() => openBrowser('images')}
                  disabled={daemonOnline === false}
                  className="shrink-0 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
                >
                  {selectedProject ? '📂 Browse' : '📂 Pick folder'}
                </button>
              </div>
              {selectedProject && (
                <p className="text-xs text-slate-500 mt-1">Auto-set to this project&apos;s images folder.</p>
              )}
            </div>

            {/* Subtitles */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Subtitles (optional)</label>
              {selectedProject ? (
                <select
                  value={subsPath}
                  onChange={(e) => setSubsPath(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">None — use lyrics / whisper</option>
                  {selectedProject.subs.map((f) => (
                    <option key={f.path} value={f.path}>{f.name}</option>
                  ))}
                </select>
              ) : subsPath ? (
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm truncate min-w-0 text-white">{subsPath}</div>
                  <button
                    onClick={() => setSubsPath('')}
                    className="shrink-0 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg">
                  Drop a MacWhisper <code>.srt</code>/<code>.vtt</code> into a project&apos;s Subtitles zone for exact timing.
                </p>
              )}
            </div>

            {/* Lyrics */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">
                Lyrics {lyricsLoading && <span className="text-cyan-400 text-xs">· loading saved lyrics…</span>}
              </label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={6}
                placeholder="Optional if you drop a MacWhisper SRT — paste lyrics anyway for perfect words"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-y font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Provided lyrics are ground truth — the quality lever. Whisper/subtitles only supply timing.
              </p>
            </div>

            {/* Theme + cut cadence + pulse + engine */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Theme</label>
                <div className="flex gap-1 bg-slate-900 rounded-lg p-1 border border-slate-700">
                  {(['kids', 'montree'] as Theme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        theme === t ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t === 'kids' ? '🧒 Kids' : '🌳 Montree'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Cut every N downbeats</label>
                <select
                  value={cutEvery}
                  onChange={(e) => setCutEvery(Number(e.target.value) as CutEvery)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value={1}>Every 1 (fast)</option>
                  <option value={2}>Every 2 (default)</option>
                  <option value={4}>Every 4 (slow)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Beat pulse</label>
                <select
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value as Pulse)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="off">Off</option>
                  <option value="anchor">Key words only (recommended)</option>
                  <option value="beat">Every beat</option>
                  <option value="downbeat">Downbeats only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Engine</label>
                <select
                  value="slideshow"
                  disabled
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white opacity-70 cursor-not-allowed"
                >
                  <option value="slideshow">Slideshow</option>
                  <option value="canvas" disabled>Canvas — phase 3</option>
                </select>
              </div>
            </div>

            {renderError && (
              <div className="bg-red-900/40 border border-red-600/60 rounded-lg p-3 mb-4 text-sm text-red-200 break-words">
                {renderError}
              </div>
            )}

            <button
              onClick={submitRender}
              disabled={!canRender}
              className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-bold transition-colors"
            >
              {submitting ? '⏳ Submitting…' : '🎼 Render music video'}
            </button>
          </section>

          {/* ─────────────────────────────── Queue ───────────────────────────── */}
          <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h2 className="text-xl font-bold mb-4">📋 Queue</h2>
            {jobs.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">No renders yet — submit one on the left.</p>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => {
                  const isActive = ACTIVE_STATUSES.includes(job.status);
                  return (
                    <div key={job.job_id} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-semibold text-white truncate">{job.song}</span>
                        <span className="shrink-0 text-xs text-slate-400">{statusLabel(job.status)}</span>
                      </div>

                      {/* progress bar */}
                      <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden mb-1.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${statusBarColor(job.status)}`}
                          style={{ width: `${Math.max(0, Math.min(100, job.progress || 0))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="truncate">{job.stage || '—'}</span>
                        <span className="shrink-0">
                          {isActive ? formatElapsed(toMs(job.created_at), nowMs) : humanDate(job.created_at)}
                        </span>
                      </div>

                      {/* failed → error verbatim */}
                      {job.status === 'failed' && job.error && (
                        <div className="mt-2 bg-red-950/60 border border-red-800/60 rounded p-2 text-xs text-red-300 break-words whitespace-pre-wrap font-mono">
                          {job.error}
                        </div>
                      )}

                      {/* actions */}
                      <div className="flex items-center gap-2 mt-2">
                        {isActive && (
                          <button
                            onClick={() => cancelJob(job.job_id, job.song)}
                            className="px-3 py-1 bg-red-900 hover:bg-red-800 rounded text-xs"
                          >
                            🚫 Cancel
                          </button>
                        )}
                        <button
                          onClick={() => toggleJobLog(job.job_id)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                        >
                          {expandedJobId === job.job_id ? 'Hide log' : 'View log'}
                        </button>
                      </div>

                      {/* expandable log tail */}
                      {expandedJobId === job.job_id && (
                        <pre className="mt-2 bg-slate-950 border border-slate-700 rounded p-2 text-[11px] text-slate-300 overflow-x-auto max-h-56 whitespace-pre-wrap break-words">
                          {jobLogs[job.job_id] ?? 'Loading…'}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ─────────────────────────────── Shot Planner ───────────────────────── */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mt-6">
          <button
            onClick={() => setPlanOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <h2 className="text-xl font-bold">🎯 Shot Planner</h2>
            <span className="text-slate-400 text-sm">{planOpen ? '▲ Hide' : '▼ Show'}</span>
          </button>

          {planOpen && (
            <div className="mt-4">
              <p className="text-sm text-slate-400 mb-3">
                Analyze the current song (audio + optional lyrics/subtitles) to see its structure, which
                sung words are anchored to artwork, and what artwork is still missing. Pick your audio and
                images above first.
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={runAnalyze}
                  disabled={!audioPath || planAnalyzing || daemonOnline === false}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
                >
                  {planAnalyzing ? '🔍 Analyzing…' : '🔍 Analyze song'}
                </button>
                <button
                  onClick={fetchPlan}
                  disabled={!audioPath || !imagesDir || planLoading || daemonOnline === false}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm"
                >
                  🔄 Refresh plan
                </button>
                {!audioPath && <span className="text-xs text-slate-500">Pick an audio track above.</span>}
              </div>

              {planError && (
                <div className="bg-red-900/40 border border-red-600/60 rounded-lg p-3 mb-4 text-sm text-red-200 break-words">
                  {planError}
                </div>
              )}

              {planNoTimeline && (
                <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4 mb-4">
                  <p className="text-amber-100/90 text-sm mb-3">
                    No cached timeline for this song yet. Run the analysis to generate one.
                  </p>
                  <button
                    onClick={runAnalyze}
                    disabled={!audioPath || planAnalyzing || daemonOnline === false}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg text-sm font-medium"
                  >
                    {planAnalyzing ? '🔍 Analyzing…' : '🔍 Analyze song'}
                  </button>
                </div>
              )}

              {planLoading && (
                <div className="text-center py-6 text-slate-400">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-slate-600 border-t-cyan-500 rounded-full mb-2" />
                  <p className="text-sm">Loading plan…</p>
                </div>
              )}

              {planData && !planLoading && (
                <div className="space-y-6">
                  {/* section strip */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Song structure</h3>
                    {planTotal > 0 ? (
                      <>
                        <div className="flex w-full h-8 rounded-lg overflow-hidden border border-slate-700">
                          {planData.sections.map((s, i) => {
                            const width = ((s.end - s.start) / planTotal) * 100;
                            return (
                              <div
                                key={`${s.label}-${s.start}-${i}`}
                                className={`${SECTION_COLORS[i % SECTION_COLORS.length]} flex items-center justify-center overflow-hidden`}
                                style={{ width: `${width}%` }}
                                title={`${s.label} · ${fmtSecs(s.start)}–${fmtSecs(s.end)}`}
                              >
                                <span className="text-[10px] text-white/90 truncate px-1">{s.label}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                          <span>0:00</span>
                          <span>{fmtSecs(planTotal)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-500 text-sm">No sections detected.</p>
                    )}
                  </div>

                  {/* anchors */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">
                      Anchored words <span className="text-slate-500 font-normal">({planData.anchors.length})</span>
                    </h3>
                    {planData.anchors.length > 0 ? (
                      <div className="space-y-1 max-h-56 overflow-y-auto">
                        {planData.anchors.map((a, i) => (
                          <div
                            key={`${a.word}-${a.time}-${i}`}
                            className="flex items-center gap-2 text-sm bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5"
                          >
                            <span className="text-emerald-400 shrink-0">✓</span>
                            <span className="font-medium text-white">{a.word}</span>
                            <span className="text-slate-500 text-xs shrink-0">@ {fmtSecs(a.time)}</span>
                            <span className="text-slate-600">→</span>
                            <span className="text-cyan-300 text-xs truncate min-w-0">{a.image}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">No sung words matched to artwork yet.</p>
                    )}
                  </div>

                  {/* missing artwork checklist */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">
                      Missing artwork <span className="text-slate-500 font-normal">({planData.missing.length})</span>
                    </h3>
                    {planData.missing.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {planData.missing.map((m) => (
                            <div key={m.word} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="font-semibold text-white">{m.word}</span>
                                <span className="text-xs text-slate-500">
                                  ×{m.count} · first @ {fmtSecs(m.first_time)}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <code className="text-xs text-emerald-300 bg-slate-950 border border-slate-700 rounded px-2 py-1 truncate min-w-0">
                                  {m.suggested_filename}
                                </code>
                                <button
                                  onClick={() => copyWithKey(m.suggested_filename, `fn-${m.word}`)}
                                  className="shrink-0 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                                >
                                  {copiedKey === `fn-${m.word}` ? '✓ Copied' : '📋 Filename'}
                                </button>
                                <button
                                  onClick={() => copyWithKey(m.mj_prompt, `mj-${m.word}`)}
                                  className="shrink-0 px-2.5 py-1 bg-violet-700 hover:bg-violet-600 rounded text-xs"
                                >
                                  {copiedKey === `mj-${m.word}` ? '✓ Copied' : '🎨 MJ prompt'}
                                </button>
                              </div>
                              <p className="text-xs text-slate-500 mt-1.5 break-words font-mono">{m.mj_prompt}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                          Generate each in Midjourney → drop the image into the project&apos;s Images zone → Refresh plan.
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500 text-sm">Every sung word has matching artwork. 🎉</p>
                    )}
                  </div>

                  {/* fillers */}
                  {planData.fillers.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-2">
                        Filler images <span className="text-slate-500 font-normal">({planData.fillers.length})</span>
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {planData.fillers.map((f, i) => (
                          <span key={`${f}-${i}`} className="text-xs bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-400">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─────────────────────────────── Library ─────────────────────────────── */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">🎞️ Library</h2>
            <button
              onClick={fetchLibrary}
              disabled={daemonOnline === false}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm"
            >
              🔄 Refresh
            </button>
          </div>
          {libraryError && (
            <div className="bg-red-900/40 border border-red-600/60 rounded-lg p-3 mb-4 text-sm text-red-200 break-words">
              {libraryError}
            </div>
          )}
          {library.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">
              No videos yet. Finished renders land in <code className="text-slate-400">~/Desktop/Music Videos</code>.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {library.map((video) => (
                <div key={video.path} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="aspect-video bg-black">
                    <video
                      controls
                      preload="metadata"
                      src={`${DAEMON}/api/media?path=${encodeURIComponent(video.path)}`}
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-white truncate mb-1" title={video.name}>{video.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 flex-wrap">
                      <span>{humanSize(video.size)}</span>
                      <span>·</span>
                      <span>{humanDate(video.mtime)}</span>
                      {video.has_lyrics && (
                        <span className="px-1.5 py-0.5 bg-emerald-900/60 text-emerald-300 rounded">📝 lyrics</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(video.path)}
                        className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                      >
                        📋 Copy path
                      </button>
                      <button
                        onClick={() => deleteVideo(video)}
                        className="px-3 py-1.5 bg-red-900 hover:bg-red-800 rounded text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ─────────────────────────────── File browser modal ──────────────────── */}
      {browseKind && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-bold">
                {browseKind === 'audio' ? '🎵 Pick an audio file' : '🖼️ Pick an images folder'}
              </h3>
              <button onClick={closeBrowser} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                ✕ Close
              </button>
            </div>

            {/* breadcrumb / current path + up */}
            <div className="p-3 border-b border-slate-700 flex items-center gap-2">
              <button
                onClick={() => { if (browseData?.parent) loadBrowse(browseKind, browseData.parent); }}
                disabled={browseLoading || !browseData || browseData.parent === null || browseData.parent === browseData.path}
                className="shrink-0 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm"
              >
                ⬆️ Up
              </button>
              <code className="flex-1 text-xs text-slate-400 truncate min-w-0" title={currentBrowsePath}>
                {currentBrowsePath || '…'}
              </code>
              {browseKind === 'images' && browseData && (
                <button
                  onClick={() => selectImagesDir(browseData.path, null)}
                  className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium"
                >
                  ✓ Use this folder
                </button>
              )}
            </div>

            {/* listing */}
            <div className="flex-1 overflow-y-auto p-3">
              {browseLoading ? (
                <div className="text-center py-10 text-slate-400">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-slate-600 border-t-cyan-500 rounded-full mb-2" />
                  <p className="text-sm">Loading…</p>
                </div>
              ) : browseError ? (
                <div className="bg-red-900/40 border border-red-600/60 rounded-lg p-3 text-sm text-red-200 break-words">
                  {browseError}
                </div>
              ) : browseData ? (
                <div className="space-y-1">
                  {/* directories */}
                  {browseData.dirs.map((dir) => (
                    <div
                      key={dir.path}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-700 rounded-lg"
                    >
                      <button
                        onClick={() => loadBrowse(browseKind, dir.path)}
                        className="flex-1 flex items-center gap-2 min-w-0 text-left"
                      >
                        <span>📁</span>
                        <span className="truncate text-sm text-white">{dir.name}</span>
                        {typeof dir.image_count === 'number' && (
                          <span className="shrink-0 px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                            {dir.image_count} img
                          </span>
                        )}
                      </button>
                      {browseKind === 'images' && (
                        <button
                          onClick={() => selectImagesDir(dir.path, dir.image_count ?? null)}
                          className="shrink-0 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs font-medium"
                        >
                          ✓ Use
                        </button>
                      )}
                    </div>
                  ))}

                  {/* files (audio kind → selectable; images kind → shown, not selectable) */}
                  {browseData.files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => browseKind === 'audio' && selectAudioFile(file)}
                      disabled={browseKind !== 'audio'}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left ${
                        browseKind === 'audio'
                          ? 'bg-slate-900 hover:bg-slate-700 cursor-pointer'
                          : 'bg-slate-900/50 cursor-default'
                      }`}
                    >
                      <span>{browseKind === 'audio' ? '🎵' : '🖼️'}</span>
                      <span className="flex-1 truncate text-sm text-slate-200 min-w-0">{file.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{humanSize(file.size)}</span>
                    </button>
                  ))}

                  {browseData.dirs.length === 0 && browseData.files.length === 0 && (
                    <p className="text-center text-slate-500 text-sm py-8">This folder is empty.</p>
                  )}
                </div>
              ) : (
                <p className="text-center text-slate-500 text-sm py-8">Nothing to show.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
