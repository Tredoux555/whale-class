'use client';

// /montree/security/page.tsx
//
// Public security disclosure page. Linked from the landing nav.
//
// Marketing posture (Session 121): "Your school's data is encrypted with
// AES-256-GCM, the same algorithm banks and governments use to protect
// classified data." That claim is defensible because Session 121 shipped
// application-layer AES-256-GCM on parent-school messages + meeting notes +
// call transcripts. Photos remain encrypted-at-rest by Supabase Storage
// (not by our application layer — disclosed honestly below).
//
// Tone follows the landing page: deep forest palette, Lora serif headings,
// editorial blocks, no marketing fluff that overstates what we do.

import Link from 'next/link';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';

export default function SecurityPage() {
  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        html, body { min-height: 100%; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-weight: 400;
          color: #ECEFE6;
          background: #0a1a0f;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(circle at 18% 12%, rgba(52, 211, 153, 0.10), transparent 55%),
            radial-gradient(circle at 82% 88%, rgba(232, 201, 106, 0.05), transparent 55%),
            linear-gradient(180deg, #06140a 0%, #0a1a0f 50%, #06140a 100%);
        }
        .m-serif { font-family: 'Lora', Georgia, serif; }
        .m-nav { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(20px) saturate(180%); background: rgba(10, 26, 15, 0.72); border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        .m-nav-inner { max-width: 1180px; margin: 0 auto; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .m-nav-link { color: rgba(236, 239, 230, 0.65); text-decoration: none; font-size: 14px; padding: 8px 12px; border-radius: 8px; transition: color 0.2s, background 0.2s; }
        .m-nav-link:hover { color: #ECEFE6; background: rgba(255, 255, 255, 0.04); }
        .m-pill { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 999px; font-weight: 600; font-size: 14px; background: linear-gradient(135deg, #34d399 0%, #1D6B48 100%); color: #06281a; text-decoration: none; box-shadow: 0 4px 14px rgba(52, 211, 153, 0.30); transition: transform 0.2s, box-shadow 0.2s; }
        .m-pill:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(52, 211, 153, 0.40); }
        .m-hero { padding: 100px 24px 60px; text-align: center; }
        .m-hero-inner { max-width: 740px; margin: 0 auto; }
        .m-hero h1 { font-family: 'Lora', Georgia, serif; font-size: clamp(34px, 6vw, 54px); line-height: 1.15; color: #ECEFE6; margin-bottom: 18px; letter-spacing: -0.5px; }
        .m-hero-sub { font-size: 17px; color: rgba(236, 239, 230, 0.65); max-width: 580px; margin: 0 auto; }
        .m-block { padding: 60px 24px; }
        .m-block-inner { max-width: 740px; margin: 0 auto; }
        .m-block h2 { font-family: 'Lora', Georgia, serif; font-size: clamp(24px, 3.4vw, 30px); color: #ECEFE6; margin-bottom: 18px; letter-spacing: -0.3px; }
        .m-block p { font-size: 16px; color: rgba(236, 239, 230, 0.78); margin-bottom: 14px; }
        .m-block p strong { color: #ECEFE6; font-weight: 600; }
        .m-block code { padding: 1px 6px; background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.20); border-radius: 5px; font-family: ui-monospace, SF Mono, monospace; font-size: 13px; color: #34d399; }
        .m-claim { padding: 28px 30px; border-radius: 14px; background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.20); margin: 30px 0; }
        .m-claim p { color: rgba(236, 239, 230, 0.92); font-size: 17px; margin-bottom: 0; line-height: 1.6; }
        .m-honest { padding: 22px 28px; border-radius: 14px; background: rgba(232, 201, 106, 0.05); border: 1px solid rgba(232, 201, 106, 0.18); margin: 20px 0; }
        .m-honest p { color: rgba(236, 239, 230, 0.75); font-size: 14px; margin-bottom: 8px; }
        .m-honest p:last-child { margin-bottom: 0; }
        .m-table { width: 100%; border-collapse: collapse; margin: 18px 0; }
        .m-table th, .m-table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-size: 14px; }
        .m-table th { color: rgba(236, 239, 230, 0.55); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .m-table td { color: rgba(236, 239, 230, 0.85); }
        .m-table td code { background: rgba(255, 255, 255, 0.05); color: #ECEFE6; border-color: rgba(255, 255, 255, 0.1); }
        .m-footer { padding: 60px 24px 80px; text-align: center; color: rgba(236, 239, 230, 0.45); font-size: 13px; }
        @media (max-width: 640px) {
          .m-hero { padding: 60px 20px 40px; }
          .m-block { padding: 40px 20px; }
        }
      `}</style>

      <nav className="m-nav">
        <div className="m-nav-inner">
          <Link href="/montree" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <MontreeLogo size={32} />
            <span className="m-serif" style={{ color: '#ECEFE6', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px' }}>
              Montree
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Link href="/montree" className="m-nav-link">Home</Link>
            <LanguageToggle />
            <Link href="/montree/login-select" className="m-pill" style={{ marginLeft: 8 }}>Log in</Link>
          </div>
        </div>
      </nav>

      <section className="m-hero">
        <div className="m-hero-inner">
          <h1>Your school&rsquo;s data is encrypted.</h1>
          <p className="m-hero-sub">
            We take privacy seriously, and we say what we actually do — not what sounds good.
          </p>
        </div>
      </section>

      <section className="m-block">
        <div className="m-block-inner">
          <h2 className="m-serif">What we encrypt</h2>
          <p>
            Every parent ↔ school message, every meeting summary, every transcript of a recorded
            parent meeting is encrypted at rest with <strong>AES-256-GCM</strong> — the same
            algorithm banks and governments use to protect classified data.
          </p>

          <div className="m-claim">
            <p>
              <strong>Even if an attacker stole our database, they&rsquo;d see scrambled bytes.</strong>{' '}
              Authentication tags on every ciphertext mean tampering is detected instantly.
            </p>
          </div>

          <table className="m-table">
            <thead>
              <tr>
                <th>What</th>
                <th>How</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Messages between parents and teachers</td>
                <td>AES-256-GCM, application layer</td>
              </tr>
              <tr>
                <td>Meeting notes (Whisper transcript + Sonnet summary)</td>
                <td>AES-256-GCM, application layer</td>
              </tr>
              <tr>
                <td>Video call transcripts</td>
                <td>AES-256-GCM, application layer</td>
              </tr>
              <tr>
                <td>Photos and media uploads</td>
                <td>Encrypted at rest by Supabase Storage</td>
              </tr>
              <tr>
                <td>Database backups</td>
                <td>Encrypted at rest by Supabase</td>
              </tr>
              <tr>
                <td>Network traffic (browser ↔ server)</td>
                <td>HTTPS / TLS 1.3</td>
              </tr>
              <tr>
                <td>Video calls (audio + video streams)</td>
                <td>DTLS-SRTP via Agora</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="m-block">
        <div className="m-block-inner">
          <h2 className="m-serif">What we don&rsquo;t pretend to do</h2>

          <p>
            We&rsquo;re not going to say &ldquo;we can&rsquo;t read your data.&rdquo; That would be
            untrue. We hold the encryption key — we have to, so Astra (our AI chief-of-staff) can
            scan parent messages and draft responses for the principal. True
            zero-knowledge end-to-end encryption would break every AI feature we ship.
          </p>

          <p>
            What we <strong>can</strong> say is this: the data on disk is unreadable without the
            key. Our key sits in our hosting environment, not in our database. A database leak
            doesn&rsquo;t leak content.
          </p>

          <div className="m-honest">
            <p>
              <strong>Honest disclosures.</strong> When our AI features process content — like
              transcribing a meeting audio file or summarizing a parent thread — that content
              briefly passes through our service providers:
            </p>
            <p>
              · OpenAI sees audio bytes for Whisper transcription (~30 seconds in flight, never
              persisted on our side).
            </p>
            <p>
              · Anthropic sees plaintext transcripts when Sonnet writes a summary (per their API
              contract — 30-day retention, no model training).
            </p>
            <p>
              · Agora handles WebRTC media for video calls (encrypted in transit via DTLS-SRTP).
            </p>
            <p>
              · Supabase manages our database and storage (encrypted at rest by them, not by us).
            </p>
          </div>
        </div>
      </section>

      <section className="m-block">
        <div className="m-block-inner">
          <h2 className="m-serif">What this protects you from</h2>
          <p>
            <strong>Database dump leaks.</strong> If somebody pulled our database — through a
            misconfigured backup, a stolen disk image, or an insider at our hosting provider —
            they&rsquo;d see scrambled ciphertext. Useless without the key.
          </p>
          <p>
            <strong>Tampering.</strong> Every encrypted message carries an authentication tag. If
            anyone modifies the stored ciphertext, our system detects it and refuses to render
            tampered content.
          </p>
          <p>
            <strong>Backup theft.</strong> The same encryption protects rows in any database
            backup. Stolen backup tapes are scrambled bytes.
          </p>
        </div>
      </section>

      <section className="m-block">
        <div className="m-block-inner">
          <h2 className="m-serif">Where we&rsquo;re still working</h2>
          <p>
            Photos and videos sit in Supabase Storage, encrypted at rest by Supabase but not by
            us at the application layer. We chose this because encrypting every photo on upload
            would break thumbnails, gallery loads, and AI photo identification — features that
            make Montree worth using.
          </p>
          <p>
            If your school requires application-layer encryption on photos too, talk to us. We
            can build it, but it&rsquo;s a deliberate tradeoff.
          </p>
        </div>
      </section>

      <section className="m-footer">
        <p>
          Questions? Email{' '}
          <a href="mailto:tredoux@montree.xyz" style={{ color: '#34d399', textDecoration: 'none' }}>
            tredoux@montree.xyz
          </a>
        </p>
      </section>
    </>
  );
}
