// /montree/super-admin/phonics-videos/page.tsx
// Super-admin BULK uploader for Dark Phonics song videos.
//
// Drop ALL the .mp4s at once. Each file is auto-matched to its lesson by the
// leading number in the filename ("20 - Red Rat Run.mp4" -> lesson 20); a
// per-file dropdown lets you fix or assign any that don't auto-match. Then it
// uploads them ONE BY ONE, directly to Supabase storage via one-time signed
// upload URLs (so big ~60MB files skip the serverless body limit), with 3x
// auto-retry per file so a flaky VPN drop doesn't lose the whole batch.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-client';

const BUCKET = 'dark-phonics';
const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 5 * 60 * 1000; // 5 min per attempt — big file, slow VPN

type Song = { n: number; sound: string; catch: string };

const SONGS: Song[] = [
  { n: 5, sound: '/s/', catch: 'snake in my sock!' }, { n: 6, sound: '/ă/', catch: 'ant on my apple!' },
  { n: 7, sound: '/t/', catch: 'tick-tock, stinky sock!' }, { n: 8, sound: '/p/', catch: 'pop, pop, puppy poop!' },
  { n: 9, sound: '/ĭ/', catch: 'icky, sticky pig!' }, { n: 10, sound: '/n/', catch: 'no-no, nanny goat!' },
  { n: 11, sound: '/m/', catch: 'mmm, muddy monkey!' }, { n: 12, sound: '/d/', catch: 'dirty dog, dig dig dig!' },
  { n: 13, sound: '/g/', catch: 'goat got my gum!' }, { n: 14, sound: '/ŏ/', catch: 'hot dog on a log!' },
  { n: 15, sound: '/k/', catch: 'cat ate my cookie!' }, { n: 16, sound: '/k/', catch: 'kooky king kicks!' },
  { n: 17, sound: '/k/', catch: 'kick the stinky sock!' }, { n: 18, sound: '/ĕ/', catch: 'ten messy hens!' },
  { n: 19, sound: '/ŭ/', catch: 'yummy bug in my cup!' }, { n: 20, sound: '/r/', catch: 'run, run, red rat!' },
  { n: 21, sound: '/h/', catch: 'ha-ha, hairy hippo!' }, { n: 22, sound: '/b/', catch: 'big baby burp!' },
  { n: 23, sound: '/f/', catch: 'funny fox in my fan!' }, { n: 24, sound: '/l/', catch: 'lazy lion licks!' },
  { n: 25, sound: '/j/', catch: 'jump in the jelly jam!' }, { n: 26, sound: '/v/', catch: 'vroom-vroom van!' },
  { n: 27, sound: '/w/', catch: 'wiggly wet worm!' }, { n: 28, sound: '/ks/', catch: 'six fox in a box!' },
  { n: 29, sound: '/y/', catch: 'yummy yellow yo-yo!' }, { n: 30, sound: '/z/', catch: 'zippy zebra, zzz!' },
  { n: 31, sound: '/kw/', catch: 'quick quacky duck!' }, { n: 32, sound: 'review', catch: 'cat, pig, dog - woof!' },
  { n: 33, sound: 'review', catch: 'a, e, i, o, u... achoo!' }, { n: 34, sound: 'review', catch: 'a to z, easy-peasy!' },
  { n: 35, sound: '/ă/', catch: 'fat cat in a hat!' }, { n: 36, sound: '/ĭ/', catch: 'big pig did a jig!' },
  { n: 37, sound: '/ŏ/', catch: 'hop on a hot log!' }, { n: 38, sound: '/ĕ/', catch: 'wet pet in my bed!' },
  { n: 39, sound: '/ŭ/', catch: 'big bug hug!' }, { n: 40, sound: 'minimal pairs', catch: 'cat? cot? cut?' },
  { n: 41, sound: 'FLSZ', catch: 'buzz off, fuzzy bee!' }, { n: 42, sound: '/sh/', catch: 'sheep go baba!' },
  { n: 43, sound: '/ch/', catch: 'cheeky little chick!' }, { n: 44, sound: '/th/', catch: 'moth in my bath!' },
  { n: 45, sound: '/wh/', catch: 'wheee, big fat whale!' }, { n: 46, sound: '/th/', catch: 'this, that, BOO!' },
  { n: 47, sound: 'end blends', catch: 'jump, jump, fast hands!' }, { n: 48, sound: 'end blends', catch: 'pink sock in the sink!' },
  { n: 49, sound: 's-blends', catch: 'slip, slip, slimy snail!' }, { n: 50, sound: 'l-blends', catch: 'clap, clap, silly clown!' },
  { n: 51, sound: 'r-blends', catch: 'green frog on a drum!' }, { n: 52, sound: 'tw/dw', catch: 'two twins twist!' },
  { n: 53, sound: 'triple', catch: 'big splash, scrub-a-dub!' },
];

const LESSON_NUMS = new Set(SONGS.map((s) => s.n));

type Status = 'queued' | 'uploading' | 'done' | 'failed' | 'needs-lesson';
type Item = {
  id: string;
  file: File;
  lesson: number | null;
  status: Status;
  attempt: number;
  error?: string;
};

// Pull the lesson number out of a filename. "20 - Red Rat Run.mp4" -> 20,
// "lesson-07.mp4" -> 7, "L5 snake.mp4" -> 5. Hardened against resolution /
// aspect-ratio tokens so "9x16_lesson20.mp4" doesn't grab the 9. Returns null
// (→ manual dropdown) if it can't find a confident lesson number.
function guessLesson(name: string): number | null {
  let base = name.replace(/\.[^.]+$/, '').replace(/_+/g, ' '); // _ is a separator

  // 1) Explicit "lesson N" / "L20" / "#20" wins outright.
  const explicit =
    base.match(/\blesson\s*[-_ ]?\s*(\d{1,2})\b/i) ||
    base.match(/\bL[-_ ]?(\d{1,2})\b/i) ||
    base.match(/#\s*(\d{1,2})\b/);
  if (explicit) {
    const n = Number(explicit[1]);
    if (LESSON_NUMS.has(n)) return n;
  }

  // 2) Strip resolution / aspect-ratio tokens that would otherwise mis-match
  //    (9x16, 16:9, 1080p, 720, 4k, 2160).
  base = base
    .replace(/\d+\s*[x:×]\s*\d+/gi, ' ')
    .replace(/\b\d{3,4}\s*p\b/gi, ' ')
    .replace(/\b(?:4k|2k|uhd|fhd|hd)\b/gi, ' ')
    .replace(/\b\d{3,4}\b/g, ' ');

  // 3) First remaining 1–2 digit number that's a real lesson.
  for (const tok of base.match(/\d{1,2}/g) || []) {
    const n = Number(tok);
    if (LESSON_NUMS.has(n)) return n;
  }
  return null;
}

const mb = (bytes: number) => (bytes / 1048576).toFixed(1);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Timed out — retrying')), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export default function PhonicsVideosPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [uploadedSet, setUploadedSet] = useState<number[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('sa_session');
    if (!stored) { router.push('/montree/super-admin'); return; }
    setToken(stored);
  }, [router]);

  const loadUploaded = useCallback(async (t: string) => {
    try {
      const res = await fetch('/api/montree/super-admin/phonics-video-upload-url', {
        headers: { 'x-super-admin-token': t }, cache: 'no-store',
      });
      if (res.status === 401) { sessionStorage.removeItem('sa_session'); router.push('/montree/super-admin'); return; }
      const json = await res.json();
      setUploadedSet(Array.isArray(json.uploaded) ? json.uploaded : []);
    } catch { /* leave as-is */ }
  }, [router]);

  useEffect(() => { if (token) void loadUploaded(token); }, [token, loadUploaded]);

  const patch = useCallback((id: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));
  }, []);

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => /\.(mp4|mov|m4v|webm)$/i.test(f.name) || f.type.startsWith('video/'));
    if (!files.length) return;
    setItems((prev) => {
      const existingKeys = new Set(prev.map((it) => it.file.name + it.file.size));
      const next = [...prev];
      for (const file of files) {
        const key = file.name + file.size;
        if (existingKeys.has(key)) continue; // dedupe a re-drop
        const lesson = guessLesson(file.name);
        next.push({
          id: `${key}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          lesson,
          status: lesson === null ? 'needs-lesson' : 'queued',
          attempt: 0,
        });
      }
      return next.sort((a, b) => (a.lesson ?? 999) - (b.lesson ?? 999));
    });
  }

  function setItemLesson(id: string, lesson: number | null) {
    patch(id, { lesson, status: lesson === null ? 'needs-lesson' : 'queued', error: undefined });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function clearAll() {
    if (running) return;
    setItems([]);
    if (fileRef.current) fileRef.current.value = '';
  }

  // Upload a single file with retry. Returns when done or throws after MAX_ATTEMPTS.
  async function uploadOne(item: Item): Promise<void> {
    const lesson = item.lesson;
    if (lesson === null || !token) throw new Error('No lesson assigned.');
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      patch(item.id, { status: 'uploading', attempt, error: undefined });
      try {
        // 1) fresh one-time signed upload URL (server removes+recreates the path)
        const res = await fetch('/api/montree/super-admin/phonics-video-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-super-admin-token': token },
          body: JSON.stringify({ lesson }),
        });
        if (res.status === 401) {
          sessionStorage.removeItem('sa_session');
          throw new Error('AUTH'); // bubble up to stop the whole run
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Could not start upload.');

        // 2) upload bytes straight to storage (bypasses API body limit)
        const supabase = createBrowserClient();
        const { error: upErr } = await withTimeout(
          supabase.storage.from(BUCKET).uploadToSignedUrl(
            data.path, data.token, item.file, { contentType: item.file.type || 'video/mp4' },
          ),
          ATTEMPT_TIMEOUT_MS,
        );
        if (upErr) throw new Error(upErr.message);
        return; // success
      } catch (e) {
        if (e instanceof Error && e.message === 'AUTH') throw e;
        lastErr = e;
        if (attempt < MAX_ATTEMPTS) await sleep(1500 * attempt); // backoff
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Upload failed.');
  }

  async function runQueue(onlyFailed = false) {
    if (running || !token) return;
    const queue = items.filter((it) =>
      it.lesson !== null && (onlyFailed ? it.status === 'failed' : it.status !== 'done'),
    );
    if (!queue.length) return;
    setRunning(true);
    cancelRef.current = false;
    for (const item of queue) {
      if (cancelRef.current) break;
      try {
        await uploadOne(item);
        patch(item.id, { status: 'done', error: undefined });
        await loadUploaded(token); // refresh the ✅ map as we go
      } catch (e) {
        if (e instanceof Error && e.message === 'AUTH') {
          setRunning(false);
          router.push('/montree/super-admin');
          return;
        }
        patch(item.id, { status: 'failed', error: e instanceof Error ? e.message : 'Upload failed.' });
      }
    }
    setRunning(false);
  }

  const isUp = (n: number) => uploadedSet.includes(n);
  const counts = {
    total: items.length,
    ready: items.filter((i) => i.lesson !== null && i.status !== 'done').length,
    done: items.filter((i) => i.status === 'done').length,
    failed: items.filter((i) => i.status === 'failed').length,
    needs: items.filter((i) => i.status === 'needs-lesson').length,
  };

  const statusChip = (it: Item) => {
    switch (it.status) {
      case 'done': return <span className="text-emerald-300">✅ done</span>;
      case 'uploading': return <span className="text-sky-300">⏳ uploading… (try {it.attempt}/{MAX_ATTEMPTS})</span>;
      case 'failed': return <span className="text-red-400" title={it.error}>⚠️ failed — {it.error}</span>;
      case 'needs-lesson': return <span className="text-amber-300">↧ pick a lesson</span>;
      default: return <span className="text-white/40">queued</span>;
    }
  };

  return (
    <div className="min-h-screen text-white" style={{ background: '#06140e' }}>
      <div className="max-w-2xl mx-auto px-5 py-8">
        <button onClick={() => router.push('/montree/super-admin')}
          className="text-emerald-300/60 hover:text-emerald-200 text-sm mb-4">← Super Admin</button>

        <h1 className="text-2xl font-light mb-1">🎬 Phonics Song Videos</h1>
        <p className="text-emerald-200/50 text-sm mb-6">
          Drop all your videos at once. Each one auto-matches to its lesson by the number in the
          filename — fix any with the dropdown — then they upload one-by-one and retry if your
          connection drops. {uploadedSet.length} / {SONGS.length} lessons have a video.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-emerald-400/70 bg-emerald-500/10' : 'border-white/15 bg-white/5 hover:bg-white/10'}`}
        >
          <div className="text-3xl mb-2">📥</div>
          <div className="text-emerald-100 font-medium">Drop your .mp4 files here</div>
          <div className="text-white/40 text-xs mt-1">or click to choose — you can select all of them at once</div>
          <input ref={fileRef} type="file" accept="video/mp4,video/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} />
        </div>

        {/* Queue */}
        {items.length > 0 && (
          <div className="mt-5 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-xs text-white/60">
              <span>
                {counts.total} file{counts.total !== 1 ? 's' : ''}
                {counts.done > 0 && <span className="text-emerald-300"> · {counts.done} done</span>}
                {counts.failed > 0 && <span className="text-red-400"> · {counts.failed} failed</span>}
                {counts.needs > 0 && <span className="text-amber-300"> · {counts.needs} need a lesson</span>}
              </span>
              <button onClick={clearAll} disabled={running} className="text-white/40 hover:text-white/70 disabled:opacity-30">clear</button>
            </div>

            <div className="divide-y divide-white/5 max-h-[46vh] overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-white/85" title={it.file.name}>{it.file.name}</div>
                    <div className="text-[11px] mt-0.5 flex items-center gap-2">
                      <span className="text-white/35">{mb(it.file.size)} MB</span>
                      {statusChip(it)}
                      {it.lesson !== null && isUp(it.lesson) && it.status !== 'done' && (
                        <span className="text-amber-300/70">· replaces existing</span>
                      )}
                    </div>
                  </div>
                  <select
                    value={it.lesson ?? ''}
                    disabled={running}
                    onChange={(e) => setItemLesson(it.id, e.target.value ? Number(e.target.value) : null)}
                    className="bg-black/40 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white max-w-[160px] disabled:opacity-50"
                  >
                    <option value="">— lesson —</option>
                    {SONGS.map((s) => (
                      <option key={s.n} value={s.n}>{isUp(s.n) ? '✅ ' : ''}L{s.n} · {s.sound}</option>
                    ))}
                  </select>
                  {!running && (
                    <button onClick={() => removeItem(it.id)} className="text-white/30 hover:text-red-400 text-lg leading-none">×</button>
                  )}
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-white/10 flex gap-2">
              <button
                onClick={() => runQueue(false)}
                disabled={running || counts.ready === 0}
                className="flex-1 py-2.5 rounded-lg bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 font-medium hover:bg-emerald-500/45 transition-colors disabled:opacity-40"
              >
                {running ? 'Uploading…' : `Upload ${counts.ready} video${counts.ready !== 1 ? 's' : ''}`}
              </button>
              {running ? (
                <button onClick={() => { cancelRef.current = true; }}
                  className="px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white/70 hover:bg-white/15">
                  stop after this one
                </button>
              ) : counts.failed > 0 ? (
                <button onClick={() => runQueue(true)}
                  className="px-4 py-2.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-100 hover:bg-amber-500/30">
                  retry {counts.failed} failed
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* At-a-glance lesson grid */}
        <h2 className="text-sm font-semibold text-emerald-200/50 uppercase tracking-wide mt-8 mb-3">All lessons</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SONGS.map((s) => (
            <div key={s.n}
              className={`text-left px-3 py-2 rounded-lg border text-xs ${
                isUp(s.n) ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100'
                          : 'bg-white/5 border-white/10 text-white/45'}`}>
              <span className="font-semibold">{isUp(s.n) ? '✅' : '⬜'} L{s.n}</span> {s.sound}
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs mt-6">
          Tip: vertical 9:16 .mp4 works best for Shorts/Reels. Files upload directly to storage one at
          a time and retry on a dropped connection — keep this tab open until every row says ✅.
        </p>
      </div>
    </div>
  );
}
