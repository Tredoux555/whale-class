// /montree/super-admin/phonics-videos/page.tsx
// Super-admin self-serve uploader for Dark Phonics song videos.
// Pick a lesson, drop the .mp4, it uploads DIRECTLY to Supabase storage
// (dark-phonics/videos/lesson-NN.mp4) via a one-time signed upload URL —
// so big ~60MB files don't go through the serverless API body limit.
// Once uploaded, the public Dark Phonics songs page shows the video.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-client';

const BUCKET = 'dark-phonics';

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

export default function PhonicsVideosPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<number[]>([]);
  const [lesson, setLesson] = useState<number>(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      setUploaded(Array.isArray(json.uploaded) ? json.uploaded : []);
    } catch { /* leave as-is */ }
  }, [router]);

  useEffect(() => { if (token) void loadUploaded(token); }, [token, loadUploaded]);

  async function handleUpload() {
    setError(null); setMsg(null);
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Choose a video file first.'); return; }
    if (!token) { setError('Not authenticated.'); return; }
    setBusy(true);
    const mb = (file.size / 1048576).toFixed(1);
    setMsg(`Uploading Lesson ${lesson} (${mb} MB)… keep this tab open.`);
    try {
      // 1) get a one-time signed upload URL token from the server
      const res = await fetch('/api/montree/super-admin/phonics-video-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': token },
        body: JSON.stringify({ lesson }),
      });
      if (res.status === 401) { sessionStorage.removeItem('sa_session'); router.push('/montree/super-admin'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not start upload.');

      // 2) upload the file DIRECTLY to Supabase storage (bypasses API body limit)
      const supabase = createBrowserClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(data.path, data.token, file, { contentType: file.type || 'video/mp4' });
      if (upErr) throw new Error(upErr.message);

      setMsg(`✅ Lesson ${lesson} uploaded. It will now show on the songs page.`);
      if (fileRef.current) fileRef.current.value = '';
      await loadUploaded(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
      setMsg(null);
    } finally {
      setBusy(false);
    }
  }

  const sel = SONGS.find((s) => s.n === lesson);
  const isUp = (n: number) => uploaded.includes(n);

  return (
    <div className="min-h-screen text-white" style={{ background: '#06140e' }}>
      <div className="max-w-2xl mx-auto px-5 py-8">
        <button onClick={() => router.push('/montree/super-admin')}
          className="text-emerald-300/60 hover:text-emerald-200 text-sm mb-4">← Super Admin</button>

        <h1 className="text-2xl font-light mb-1">🎬 Phonics Song Videos</h1>
        <p className="text-emerald-200/50 text-sm mb-6">
          Pick a lesson, drop its .mp4, and it uploads straight to storage. Once done it appears on
          the public Dark Phonics songs page. {uploaded.length} / {SONGS.length} uploaded.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <label className="block">
            <span className="text-sm text-emerald-200/70">Lesson</span>
            <select
              value={lesson}
              onChange={(e) => setLesson(Number(e.target.value))}
              className="mt-1 w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2.5 text-white"
            >
              {SONGS.map((s) => (
                <option key={s.n} value={s.n}>
                  {isUp(s.n) ? '✅ ' : '⬜ '}Lesson {s.n} — {s.sound} — “{s.catch}”
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-sm text-emerald-200/70">Video file (.mp4)</span>
            <input ref={fileRef} type="file" accept="video/mp4,video/*"
              className="mt-1 block w-full text-sm text-white/80 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-500/20 file:text-emerald-200 hover:file:bg-emerald-500/30" />
          </div>

          {sel && isUp(sel.n) && (
            <p className="text-amber-300/80 text-xs">⚠️ Lesson {sel.n} already has a video — uploading will replace it.</p>
          )}

          <button onClick={handleUpload} disabled={busy}
            className="w-full py-3 rounded-lg bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 font-medium hover:bg-emerald-500/45 transition-colors disabled:opacity-50">
            {busy ? 'Uploading…' : `Upload Lesson ${lesson}`}
          </button>

          {msg && <p className="text-emerald-300 text-sm">{msg}</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <h2 className="text-sm font-semibold text-emerald-200/50 uppercase tracking-wide mt-8 mb-3">All lessons</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SONGS.map((s) => (
            <button key={s.n} onClick={() => setLesson(s.n)}
              className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                isUp(s.n) ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100'
                          : 'bg-white/5 border-white/10 text-white/55 hover:bg-white/10'}`}>
              <span className="font-semibold">{isUp(s.n) ? '✅' : '⬜'} L{s.n}</span> {s.sound}
            </button>
          ))}
        </div>

        <p className="text-white/30 text-xs mt-6">
          Tip: vertical 9:16 .mp4 works best for Shorts/Reels. Large files (~60 MB) upload directly to
          storage — keep the tab open until it says done.
        </p>
      </div>
    </div>
  );
}
