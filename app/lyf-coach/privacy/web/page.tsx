import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Lyf Coach (web)',
  description:
    'How Lyf Coach handles your data on the web: stored securely, never sold, never used to train AI, and deletable anytime in one tap.',
};

const UPDATED = 'June 23, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0B2D2A', margin: '0 0 10px' }}>{title}</h2>
      <div style={{ fontSize: 16, lineHeight: 1.7, color: '#1f2937' }}>{children}</div>
    </section>
  );
}

export default function LyfCoachWebPrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '48px 24px 80px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0B2D2A', margin: 0 }}>Lyf Coach (web) — Privacy Policy</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>Last updated: {UPDATED}</p>

      <p style={{ fontSize: 16, lineHeight: 1.7, color: '#1f2937', marginTop: 20 }}>
        Lyf Coach is a private space to think, reflect, and work through what&rsquo;s on your mind. We built
        it to be trustworthy &mdash; so here&rsquo;s a plain account of what we collect, why, and what we
        will and won&rsquo;t do with it. No fine-print games.
      </p>

      <Section title="The short version">
        Your conversations are private. We don&rsquo;t sell your data, we don&rsquo;t show ads, and we
        <strong> never</strong> use your conversations to train AI models.<br />
        We only share data with the services that keep the app running &mdash; never with advertisers or
        data brokers.<br />
        You can delete your account and everything in it at any time, from inside the app. It&rsquo;s
        permanent and immediate.
      </Section>

      <Section title="If you’re in crisis">
        Lyf Coach is not a crisis service. If you&rsquo;re in danger, please contact emergency services in
        your country.
      </Section>

      <Section title="What we collect">
        <strong>Your account details:</strong> your email address and a password &mdash; which we store
        scrambled (hashed), so we can&rsquo;t see it.<br />
        <strong>What you share with your coach:</strong> your conversations, notes, and anything you write
        or record in the app. This is the heart of Lyf Coach, and we treat it that way.<br />
        <strong>Payment details:</strong> when you subscribe, payment is handled by PayFast. They process
        your card &mdash; we never see or store your card number.<br />
        <strong>Basic technical data:</strong> like most apps, our servers keep limited logs (for example,
        when something errors) to keep the service running and secure. We keep this minimal.
      </Section>

      <Section title="How we use what we collect">
        To run your coach &mdash; to respond to you and remember the context of your conversations so it
        feels continuous. To manage your account and process your subscription. To keep the service working,
        safe, and reliable.<br />
        That&rsquo;s it. We don&rsquo;t build advertising profiles, and we don&rsquo;t sell or rent your
        information to anyone.
      </Section>

      <Section title="Your conversations and AI">
        To generate responses, your messages are sent securely to Anthropic&rsquo;s API (the company behind
        the Claude AI model). This is what makes the coach work.<br />
        <strong>Your conversations are never used to train AI models</strong> &mdash; not ours, not
        Anthropic&rsquo;s. They&rsquo;re processed only to reply to you in the moment, and then stored in
        your account so your history is there when you come back.
      </Section>

      <Section title="Who can see your data">
        <strong>You.</strong> Always.<br />
        <strong>The services that run Lyf Coach:</strong> our hosting provider (Railway), our database
        provider (Supabase), and Anthropic (for AI responses). They handle your data only to deliver the
        service, under their own privacy and security commitments.<br />
        <strong>No one else.</strong> No advertisers. No data brokers. We don&rsquo;t sell your data, and we
        don&rsquo;t share it with third parties beyond the infrastructure above.<br /><br />
        One honest note: because Lyf Coach (web) runs in the cloud rather than only on your device, it
        isn&rsquo;t &ldquo;zero-knowledge&rdquo; &mdash; the people who operate it can technically reach
        stored data. We don&rsquo;t read your conversations as a matter of course. We&rsquo;d only ever
        access them in narrow situations: if you ask us for help with a problem, if there&rsquo;s a genuine
        safety or security reason, or if the law requires it. (If you want fully on-device privacy, our
        iPhone app keeps everything local.) We&rsquo;d rather tell you that plainly than pretend it&rsquo;s
        impossible.
      </Section>

      <Section title="How your data is stored">
        Your data lives in a secure PostgreSQL database (Supabase) on cloud infrastructure (Railway).
        It&rsquo;s encrypted in transit &mdash; when it travels between your device and our servers &mdash;
        and encrypted at rest, when it&rsquo;s stored.
      </Section>

      <Section title="How long we keep it, and deleting your data">
        We keep your data until you delete it. Inactive accounts are not automatically purged.<br /><br />
        You&rsquo;re in control. Open the app and you can delete your account and everything in it in one
        step. When you do, it&rsquo;s <strong>permanent</strong> (there&rsquo;s no &ldquo;undo&rdquo;) and
        <strong> immediate</strong> &mdash; your conversations, notes, and account details are removed from
        our database. If you&rsquo;d rather we did it for you, email us (below) and we&rsquo;ll take care of it.
      </Section>

      <Section title="Your region">
        <strong>South Africa.</strong> We aim to handle your personal information in line with POPIA (the
        Protection of Personal Information Act). You have the right to access, correct, or delete your
        information &mdash; most of which you can do yourself, right in the app.<br />
        <strong>EU / UK.</strong> If you&rsquo;re in the EU or UK and have questions about your data rights,
        email us and we&rsquo;ll help.
      </Section>

      <Section title="This is a space for adults">
        Lyf Coach is intended for people 18 and over. It isn&rsquo;t designed for children, and we
        don&rsquo;t knowingly collect data from anyone under 18.
      </Section>

      <Section title="Changes to this policy">
        If we change anything meaningful here, we&rsquo;ll update this page and the date at the top. If
        it&rsquo;s a big change, we&rsquo;ll let you know in the app or by email.
      </Section>

      <Section title="Talk to us">
        Questions about your privacy, or anything in this policy? We&rsquo;d genuinely like to hear from
        you.<br />
        <a href="mailto:hello@lyfcoach.com" style={{ color: '#0F6E56' }}>hello@lyfcoach.com</a>
      </Section>
    </main>
  );
}
