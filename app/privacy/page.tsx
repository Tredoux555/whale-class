import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Montree',
  description: 'How Montree collects, uses, and protects information, including children’s data entered by schools.',
};

const UPDATED = 'June 6, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0B2D2A', margin: '0 0 10px' }}>{title}</h2>
      <div style={{ fontSize: 16, lineHeight: 1.7, color: '#1f2937' }}>{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0B2D2A', margin: 0 }}>Privacy Policy</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>Last updated: {UPDATED}</p>

      <Section title="Who we are">
        Montree provides software that helps Montessori and preschool <strong>schools</strong> manage
        classrooms, record observations, track children&rsquo;s progress, and communicate with parents.
        Our users are teachers, principals, and parents &mdash; not children. Children do not create
        accounts or log in to Montree. For data that schools enter about their students, the school is
        the data controller and Montree acts as a data processor on the school&rsquo;s behalf.
      </Section>

      <Section title="Information we collect">
        <strong>Account information (adults):</strong> name, email, password (stored hashed), role, and
        school affiliation.<br />
        <strong>Information schools enter about children:</strong> a child&rsquo;s name or nickname,
        classroom, age group, photos of their work (and sometimes the child), observations, progress
        records, and reports &mdash; entered by teachers and principals, never by children.<br />
        <strong>Communications:</strong> messages between teachers and parents, voice notes, and meeting
        summaries created within the app.<br />
        <strong>Usage and device data:</strong> basic logs needed to operate and secure the service. We
        do not track you across other companies&rsquo; apps or websites, and we do not use third-party
        advertising.
      </Section>

      <Section title="How we use information">
        To provide and operate Montree, keep it secure, provide support, process the school&rsquo;s
        subscription, and improve the product. AI features (such as drafting reports or identifying work
        in a photo) process the relevant content only to produce that result.
      </Section>

      <Section title="Children&rsquo;s privacy">
        Montree is designed for use by adults in a school setting. We do not knowingly allow children to
        create accounts or provide information directly. Children&rsquo;s information is provided by the
        school under its authority and, where required, with parental consent obtained by the school. We
        handle children&rsquo;s information only to provide the service to the school &mdash; never to
        advertise to or profile children. Parents may contact their school, or us, to review or request
        deletion of their child&rsquo;s information.
      </Section>

      <Section title="How we share information">
        We share information only with service providers who help us run Montree, under contracts that
        require them to protect it: Supabase (database &amp; storage), Stripe (billing), Anthropic and
        OpenAI (AI features), Resend (email), and Agora (voice/video where used). We do not sell personal
        information, and we do not share children&rsquo;s personal information with third parties for
        their own purposes.
      </Section>

      <Section title="Data retention and deletion">
        We keep information for as long as the school&rsquo;s account is active or as needed to provide
        the service. You can delete your account and associated personal data from within the app, or by
        contacting us. Schools can request deletion of student data. We delete or anonymize data we are
        not legally required to keep.
      </Section>

      <Section title="Your rights">
        Depending on your location, you may have rights to access, correct, export, or delete your
        personal data, and to object to or restrict certain processing. Contact us and we&rsquo;ll respond
        as required by law. For student data, requests are handled with the school as controller.
      </Section>

      <Section title="Security">
        We protect data with encryption in transit, access controls, row-level database security, and
        least-privilege access. No system is perfectly secure, but we work to protect your information and
        to notify affected parties of incidents as required by law.
      </Section>

      <Section title="Changes">
        We&rsquo;ll update this policy as needed and revise the date above. Material changes will be
        communicated to schools.
      </Section>

      <Section title="Contact">
        Questions about this policy or your data: <a href="mailto:privacy@montree.xyz" style={{ color: '#0F6E56' }}>privacy@montree.xyz</a>.
      </Section>
    </main>
  );
}
