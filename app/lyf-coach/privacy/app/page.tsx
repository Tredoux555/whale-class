import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Lyf Coach (iPhone app)',
  description:
    'How the Lyf Coach iPhone app protects your data. Your journal, planner, projects, and coach history are encrypted on your device — we store only ciphertext we cannot read.',
};

const UPDATED = 'June 19, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0B2D2A', margin: '0 0 10px' }}>{title}</h2>
      <div style={{ fontSize: 16, lineHeight: 1.7, color: '#1f2937' }}>{children}</div>
    </section>
  );
}

export default function LyfCoachAppPrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '48px 24px 80px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0B2D2A', margin: 0 }}>Lyf Coach (iPhone app) — Privacy Policy</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>Last updated: {UPDATED}</p>

      <Section title="The short version">
        Lyf Coach is a private, on-device-encrypted journal, planner, projects tracker, and life coach.
        Your password derives an encryption key <strong>on your iPhone</strong>. Everything you write is
        encrypted on the device before it leaves it, and our servers only ever store ciphertext that we
        cannot read. We can&rsquo;t recover your journal if you forget your password &mdash; that is the point.
      </Section>

      <Section title="What we can and cannot see">
        <strong>We cannot read your content.</strong> Your journal entries, planner, projects, and coach
        history are end-to-end encrypted on your device; the server holds only an opaque encrypted blob.<br />
        <strong>What is visible to us (metadata, not content):</strong> that an account exists, that it has
        signed in and when, and that encrypted entries exist (their number, size, and timing). This is not
        &ldquo;zero-knowledge&rdquo; &mdash; we are telling you the honest limits rather than overclaiming.
      </Section>

      <Section title="Information we collect">
        <strong>Account:</strong> a username you choose, and the material needed to verify your password
        without ever seeing it (a salt and a one-way verifier). We never receive or store your password or
        your encryption key.<br />
        <strong>Your content:</strong> stored only as ciphertext we cannot decrypt (collected-but-encrypted).<br />
        <strong>No tracking:</strong> we do not track you across other companies&rsquo; apps or websites,
        and we use no third-party advertising.
      </Section>

      <Section title="The coach (AI)">
        By default, the coach runs <strong>entirely on your device</strong> using Apple&rsquo;s on-device
        models &mdash; nothing leaves your iPhone. When you explicitly tap to ask the &ldquo;deeper
        coach,&rdquo; that single message and recent context are sent over an encrypted connection to be
        answered by our AI provider (Anthropic). For end-to-end-encrypted accounts, that exchange is
        <strong> not stored in any readable form on our servers.</strong> The deeper coach is never used
        automatically &mdash; only when you choose it.
      </Section>

      <Section title="How we share information">
        We share information only with service providers who help us run Lyf Coach, under contracts that
        require them to protect it: <strong>Supabase</strong> (stores your encrypted blobs and account
        record) and <strong>Anthropic</strong> (processes only the explicit, opt-in deeper-coach messages).
        We do not sell personal information.
      </Section>

      <Section title="Deleting your account">
        You can permanently delete your account and all of its server-side data from inside the app:
        <strong> Settings &rarr; Delete my account.</strong> This erases your account record and your
        encrypted journal, planner, projects, and coach history from our servers. It cannot be undone.
      </Section>

      <Section title="What this can’t protect against (we’d rather tell you)">
        An <strong>unlocked phone</strong> can read everything &mdash; anyone past your lock screen and
        Face ID sees your content, so keep your phone locked. And a very <strong>weak password</strong>
        could, in the worst case of a fully compromised server, be attacked offline at login &mdash; so
        choose a strong passphrase. We never hide that your account exists or when you sign in.
      </Section>

      <Section title="Security">
        Content is encrypted on your device with a key derived from your password (Argon2id) and protected
        at rest by your device&rsquo;s Secure Enclave and Face ID. Data travels only over HTTPS. No system
        is perfectly secure, but the design means a breach of our servers exposes ciphertext, not your words.
      </Section>

      <Section title="Children’s privacy">
        Lyf Coach is intended for adults keeping a personal journal. It is not directed at children and we
        do not knowingly collect information from children.
      </Section>

      <Section title="Changes">
        We&rsquo;ll update this policy as needed and revise the date above.
      </Section>

      <Section title="Contact">
        Questions about this policy or your data:{' '}
        <a href="mailto:hello@lyfcoach.com" style={{ color: '#0F6E56' }}>hello@lyfcoach.com</a>.
      </Section>
    </main>
  );
}
