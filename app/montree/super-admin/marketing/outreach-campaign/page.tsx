// @ts-nocheck
'use client'
import { useState } from 'react'
import Link from 'next/link'

const TARGETS = [
  {
    id: 'etonkids',
    tier: 'S',
    name: 'Etonkids Educational Group',
    schools: '60+ campuses, 17 cities in China + Sydney',
    country: 'China',
    person: 'Vivien Wang (Chairman & CEO)',
    emails: ['lidoadmin@etonkids.com','psadmin@etonkids.com','cpadmin@etonkids.com','zhoudan@etonkids.com','wangxh@etonkids.com','bonnieqian@etonkids.com'],
    why: 'In China like us. AMS/MACTE. Harvard/Kellogg. Premium bilingual. 60+ campuses = massive.',
    subject: 'A quick look at something new for Montessori — built in Beijing',
    email: `Dear Etonkids Team,

I'm writing from Beijing, where I built Montree for my own Montessori classroom — a tool that helps teachers spend less time on admin and more time with children.

The idea is simple: a teacher takes a photo of a child working. The AI identifies the Montessori material from 329 works across the full AMI curriculum, updates the child's progress records, and prepares a parent update — all automatically.

What makes it different: it has 13 developmental psychologists built into its reasoning. If it ever gets something wrong, the teacher corrects it once — and it learns permanently. No other Montessori software does any of this. We checked every competitor.

As a fellow Beijing-based education organisation with the highest standards, I thought Etonkids would appreciate seeing what's possible. Your schools are already excellent. This is how you stay ahead — not just keeping up, but setting the pace.

Let me know if you would like more information and it would be my pleasure to answer any questions you may have.

Warm regards,
Tredoux
Montree — montree.xyz`,
  },
  {
    id: 'mst-tokyo',
    tier: 'S',
    name: 'Montessori School of Tokyo',
    schools: '1 school, ages 2-15',
    country: 'Japan',
    person: 'James Moore (Head of School)',
    emails: ['info@montessorijapan.com','mst@montessorijapan.com'],
    why: 'First AMI accredited in Asia. Western head = English speaker. Tech-forward. Direct email.',
    subject: 'Smart Capture — AI for Montessori observation records',
    email: `Dear James,

I'm a Montessori teacher in Beijing and I built something I think you'd find interesting.

Montree is an AI-powered classroom tool. A teacher photographs a child working — the system identifies the Montessori material, updates progress records, and generates parent reports automatically. It knows 329 works across the full AMI curriculum.

As head of the first AMI-accredited school in Asia, you set the standard. I built this because I wanted that standard to be easier to maintain day-to-day — less paperwork, more time observing children.

The system learns from corrections too. If a teacher fixes an identification, it never makes that mistake again. No other Montessori software has anything like this — we researched every competitor.

Your school is already setting the pace in Asia. This is how you keep it that way.

Let me know if you would like more information and it would be my pleasure to answer any questions you may have.

Warm regards,
Tredoux
Montree — montree.xyz`,
  },
  {
    id: 'guidepost',
    tier: 'S',
    name: 'Guidepost Montessori / Cosmic Education Group',
    schools: '100+ schools, US + Asia',
    country: 'USA + Asia',
    person: 'Steve Xu (Founder & Global CEO)',
    emails: ['steve@guidepostmontessori.com','steve.xu@guidepostmontessori.com','sxu@cosmicedugroup.com'],
    why: 'Largest global network. One conversation = 100+ schools. Steve Xu is accessible.',
    subject: 'Montree — AI-powered Montessori classroom tool',
    email: `Dear Steve,

I've followed what you've built with Guidepost and Cosmic Education Group — 100+ schools delivering authentic Montessori at scale is remarkable.

I'm a Montessori teacher in Beijing and I built Montree to solve a problem every teacher faces: the gap between observing children and recording what you see.

Here's how it works: photograph a child working. The AI identifies the Montessori material from 329 works, updates progress records, and generates parent reports — automatically. It has 13 developmental psychologists built into its reasoning, and it learns from every teacher correction so it gets smarter over time.

No other Montessori software does any of this. We checked Transparent Classroom, Montessori Compass, Brightwheel, and every other platform — zero AI photo recognition anywhere.

At your scale, the impact multiplies. One teacher saving 30 minutes a day across 100+ schools is thousands of hours back in classrooms with children.

Your network is already the largest in the world. This is how you make it the smartest too.

Let me know if you would like more information and it would be my pleasure to answer any questions you may have.

Warm regards,
Tredoux
Montree — montree.xyz`,
  },
  {
    id: 'qais',
    tier: 'A',
    name: 'Qingdao Amerasia International School',
    schools: '1 school',
    country: 'China',
    person: 'Rosemary Gosse (Montessori Coordinator)',
    emails: ['Info@QingdaoAmerasia.org'],
    why: 'First & only AMS accredited in Asia. Montessori coordinator = perfect decision-maker. Direct email.',
    subject: 'Fellow Montessori teacher in China — built something for us',
    email: `Dear Rosemary,

I saw that QAIS is the first and only AMS-accredited Montessori school in Asia — that's a serious achievement.

I'm a Montessori teacher here in China too, and I built Montree because I was drowning in observation records and parent reports. The core idea: photograph a child working, the AI identifies the material from 329 works, updates progress, and writes parent updates automatically.

As a Montessori coordinator, you know the daily tension between observing children and documenting what you see. This eliminates it. And if the AI ever gets a material wrong, correct it once — it learns and never repeats that mistake.

No other Montessori software anywhere in the world does this. We researched them all.

Your school is already the gold standard for Montessori in Asia. This is how you keep setting the pace.

Let me know if you would like more information and it would be my pleasure to answer any questions you may have.

Warm regards,
Tredoux
Montree — montree.xyz`,
  },
  {
    id: 'mmi-singapore',
    tier: 'A',
    name: 'Modern Montessori International',
    schools: 'Multiple campuses, franchisor since 1989',
    country: 'Singapore',
    person: 'Corporate HQ',
    emails: ['enquiry@modern-montessori.com'],
    why: 'Franchisor since 1989. London origins. Multiple campuses. Premium Singapore market.',
    subject: 'AI for Montessori classrooms — a world first',
    email: `Dear Modern Montessori Team,

MMI has been setting the bar for Montessori education in Singapore since 1989. I'm reaching out because I built something that doesn't exist anywhere else in the Montessori world.

Montree is an AI classroom tool. Teachers photograph children working — the system identifies the Montessori material from 329 works, tracks progress, and generates parent reports automatically. It learns from every correction and never repeats a mistake.

We researched every Montessori software platform globally: Transparent Classroom, Montessori Compass, Brightwheel, iCare, Montessorium, Onespot. Zero AI photo recognition. Montree is the only one.

For a franchisor managing quality across multiple campuses, this means consistent, accurate documentation at every school — without adding workload.

Your schools are already excellent. This is how you stay ahead — not just keeping up, but setting the pace.

Let me know if you would like more information and it would be my pleasure to answer any questions you may have.

Warm regards,
Tredoux
Montree — montree.xyz`,
  },
  {
    id: 'mabis-bangkok',
    tier: 'A',
    name: 'MABIS (Montessori Academy Bangkok)',
    schools: '1 school',
    country: 'Thailand',
    person: 'Ms. Serene Jiratanan (Principal)',
    emails: ['info@montessoribkk.com'],
    why: 'First Montessori outside US with WASC accreditation. MIT-educated principal. Direct email.',
    subject: 'AI-powered Montessori observation tool — built by a teacher',
    email: `Dear Serene,

As a fellow educator, I admire what you've built at MABIS — the first Montessori school outside the US to earn WASC accreditation is extraordinary.

I'm a Montessori teacher in Beijing and I built Montree to solve the observation bottleneck. A teacher photographs a child working — the AI identifies the material from 329 Montessori works, updates progress records, and writes parent reports. Automatically.

It has 13 developmental psychologists built into its reasoning and it self-improves: correct it once, it never makes that mistake again. No other Montessori software on Earth does this.

With your background in technology and education, I think you'd appreciate both the innovation and the practical classroom impact.

Your school already leads in Southeast Asia. This is how you keep setting the pace.

Let me know if you would like more information and it would be my pleasure to answer any questions you may have.

Warm regards,
Tredoux
Montree — montree.xyz`,
  },
  {
    id: 'maria-london',
    tier: 'S',
    name: 'Maria Montessori School London',
    schools: '3 sites across North & West London',
    country: 'UK',
    person: 'School Leadership',
    emails: ['info@mariamontessori.org'],
    why: '90%+ AMI-trained teachers. Ages 2.5-16. Also runs AMI training institute. Premium London.',
    subject: 'AI that knows Montessori — built for classrooms like yours',
    email: `Dear Maria Montessori School Team,

With 90% AMI-trained teachers across three London sites, your school represents the highest standard of Montessori practice in the UK.

I built Montree for my own classroom in Beijing — it's an AI tool that identifies Montessori materials from photos. A teacher photographs a child working, and the system recognises the material from 329 works across the full AMI curriculum, updates progress, and generates parent reports.

It reasons with 13 developmental psychologists. It learns from every teacher correction. And no other Montessori software anywhere in the world offers anything like it — we researched them all.

For a school that also trains the next generation of Montessori teachers, I think there's an interesting conversation here about what technology can look like when it genuinely respects the methodology.

Your school is already setting the standard. This is how you keep setting the pace.

Let me know if you would like more information and it would be my pleasure to answer any questions you may have.

Warm regards,
Tredoux
Montree — montree.xyz`,
  },
  {
    id: 'brainy-bunch',
    tier: 'S',
    name: 'Brainy Bunch Int\'l Islamic Montessori',
    schools: '120 campuses across 6 countries',
    country: 'Malaysia + 5',
    person: 'Coach Fadzil Hashim (CEO) / Efizah Rasali (Founder)',
    emails: ['bbisjohor@brainybunch.com'],
    why: 'Largest Islamic Montessori network. 120 campuses. 6 countries. Massive SE Asia footprint.',
    subject: 'AI for Montessori classrooms — 120 campuses, one system',
    email: `Dear Coach Fadzil and Efizah,

What you've built with Brainy Bunch is extraordinary — 120 Montessori campuses across 6 countries is a scale very few achieve.

I'm a Montessori teacher in Beijing and I built Montree to solve the biggest time drain in our classrooms: recording observations and writing parent reports. A teacher photographs a child working — the AI identifies the material from 329 works, updates progress, and generates reports. Automatically.

At 120 campuses, consistency is everything. Montree ensures every campus documents child progress to the same standard, without adding to teachers' workload. And it learns: correct an identification once, it never repeats that mistake across any classroom.

No other Montessori software does any of this. We checked every platform globally.

Your network is already the world leader in Islamic Montessori. This is how you stay ahead — not just keeping up, but setting the pace.

Let me know if you would like more information and it would be my pleasure to answer any questions you may have.

Warm regards,
Tredoux
Montree — montree.xyz`,
  },
  {
    id: 'indian-schools',
    tier: 'A-B',
    name: 'Indian Montessori Foundation Schools (Batch)',
    schools: '12+ flagship schools across India',
    country: 'India',
    person: 'Multiple principals (direct emails)',
    emails: ['monica.sagar@sns.edu.in','principal@tarainternationalschool.com','school@swevenedu.com','admin@ifs.school','hello@kriamontessorihouse.com','info@diyamontessori.in','preprimary_coordinator_nfc@theardeeschool.com'],
    why: 'Indian Montessori Foundation publishes principal emails openly. 7 direct contacts. Batch send.',
    subject: 'Something new for Montessori — AI that identifies materials from photos',
    email: `Dear [Principal Name],

I'm a Montessori teacher and I built Montree — an AI classroom tool that identifies Montessori materials from photos.

Here's how it works: photograph a child working, the system identifies the material from 329 AMI curriculum works, updates progress records, and generates parent reports. Automatically.

It reasons with 13 developmental psychologists. It learns from every teacher correction — permanently. And no other Montessori software anywhere offers AI photo recognition. We researched every competitor.

Your school is already excellent. This is how you stay ahead — not just keeping up, but setting the pace.

Let me know if you would like more information and it would be my pleasure to answer any questions you may have.

Warm regards,
Tredoux
Montree — montree.xyz`,
  },
]

const GAME_PLAN = [
  { week: 'Week 1 — Deploy & Polish', tasks: [
    'Push all local code (Mar 8-15 features)',
    'Run migrations 137 + 138',
    'Seed Community Library (329 works)',
    'Fix {count}m ago timestamp bug',
    'Fix Chinese work name translation',
    'Test Smart Capture end-to-end on production',
  ]},
  { week: 'Week 2 — First Wave (China + Asia)', tasks: [
    'Send Etonkids emails (6 campus addresses)',
    'Email James Moore at MST Tokyo',
    'Email QAIS Qingdao (Rosemary Gosse)',
    'Email MABIS Bangkok (Serene Jiratanan)',
    'Email MMI Singapore',
    'Follow up any responses within 24hrs',
  ]},
  { week: 'Week 3 — Second Wave (Global)', tasks: [
    'Email Guidepost (try 3 Steve Xu variants)',
    'Email Maria Montessori School London',
    'Email Brainy Bunch (Coach Fadzil)',
    'Batch send to 7 Indian principals',
    'Email Key International School Nairobi',
    'Email Montessori Friends Berlin',
  ]},
  { week: 'Week 4 — Follow-up & Expand', tasks: [
    'Follow up all Week 2 non-responders',
    'Email Spring Education / LePort HQ',
    'Email Montessori Academy Australia',
    'Contact AMI about Global School Accreditation alignment',
    'Send to remaining Top 50 as time allows',
    'Track responses in spreadsheet',
  ]},
]

const TIER_COLORS = { S: '#059669', A: '#D97706', B: '#2563EB', C: '#DC2626', 'A-B': '#7C3AED' }

export default function OutreachCampaignPage() {
  const [tab, setTab] = useState('plan')
  const [expandedTarget, setExpandedTarget] = useState(null)
  const [sent, setSent] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('montree_outreach_sent')
      return s ? JSON.parse(s) : {}
    }
    return {}
  })

  const markSent = (id) => {
    const next = { ...sent, [id]: new Date().toISOString().slice(0, 10) }
    setSent(next)
    localStorage.setItem('montree_outreach_sent', JSON.stringify(next))
  }

  const TABS = [
    { id: 'plan', label: '📋 Game Plan' },
    { id: 'emails', label: '📧 Personalized Emails' },
    { id: 'stats', label: '📊 Stats' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href="/montree/super-admin/marketing" style={{ color: '#0D3330', fontSize: 14 }}>
          ← Marketing Hub
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0D3330', margin: '16px 0 8px' }}>
          🎯 Global Outreach Campaign
        </h1>
        <p style={{ color: '#666', marginBottom: 24 }}>
          50 schools researched. 9 personalized emails ready. 550+ schools reachable through 5 chain contacts.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t.id ? '#0D3330' : '#E5E7EB',
              color: tab === t.id ? '#FFF' : '#333', fontWeight: 600, fontSize: 14,
            }}>{t.label}</button>
          ))}
        </div>

        {/* GAME PLAN TAB */}
        {tab === 'plan' && (
          <div>
            {GAME_PLAN.map((week, wi) => (
              <div key={wi} style={{
                background: '#FFF', borderRadius: 12, padding: 20, marginBottom: 16,
                border: '1px solid #E5E7EB',
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0D3330', marginBottom: 12 }}>
                  {week.week}
                </h3>
                {week.tasks.map((task, ti) => (
                  <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <span style={{ fontSize: 18 }}>{'☐'}</span>
                    <span style={{ fontSize: 14, color: '#333' }}>{task}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* EMAILS TAB */}
        {tab === 'emails' && (
          <div>
            {TARGETS.map(t => (
              <div key={t.id} style={{
                background: '#FFF', borderRadius: 12, marginBottom: 16,
                border: sent[t.id] ? '2px solid #059669' : '1px solid #E5E7EB',
                overflow: 'hidden',
              }}>
                {/* Header */}
                <div
                  onClick={() => setExpandedTarget(expandedTarget === t.id ? null : t.id)}
                  style={{
                    padding: '16px 20px', cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: TIER_COLORS[t.tier] || '#666', color: '#FFF',
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                      }}>TIER {t.tier}</span>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#0D3330' }}>{t.name}</span>
                      {sent[t.id] && <span style={{ color: '#059669', fontSize: 12 }}>✓ Sent {sent[t.id]}</span>}
                    </div>
                    <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                      {t.country} · {t.schools} · {t.person}
                    </div>
                  </div>
                  <span style={{ fontSize: 20 }}>{expandedTarget === t.id ? '▲' : '▼'}</span>
                </div>

                {/* Expanded */}
                {expandedTarget === t.id && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ background: '#FFF8E7', borderRadius: 8, padding: 12, margin: '12px 0', fontSize: 13 }}>
                      <strong>Why this target:</strong> {t.why}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <strong style={{ fontSize: 13, color: '#666' }}>Send to:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {t.emails.map((e, i) => (
                          <a key={i} href={`mailto:${e}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.email)}`}
                            style={{
                              background: '#E0F2FE', color: '#0369A1', padding: '4px 10px',
                              borderRadius: 6, fontSize: 12, textDecoration: 'none',
                            }}>{e}</a>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ fontSize: 13, color: '#666' }}>Subject:</strong>
                      <div style={{ fontStyle: 'italic', fontSize: 14, marginTop: 2 }}>{t.subject}</div>
                    </div>

                    <div style={{
                      background: '#F9FAFB', borderRadius: 8, padding: 16, fontSize: 14,
                      lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif',
                    }}>
                      {t.email}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => navigator.clipboard.writeText(t.email)} style={{
                        padding: '8px 16px', borderRadius: 6, border: '1px solid #D1D5DB',
                        background: '#FFF', cursor: 'pointer', fontSize: 13,
                      }}>📋 Copy Email</button>
                      <button onClick={() => markSent(t.id)} style={{
                        padding: '8px 16px', borderRadius: 6, border: 'none',
                        background: sent[t.id] ? '#D1D5DB' : '#059669', color: '#FFF',
                        cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      }}>{sent[t.id] ? '✓ Marked Sent' : 'Mark as Sent'}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Total Targets', value: TARGETS.length, color: '#0D3330' },
                { label: 'Emails Sent', value: Object.keys(sent).length, color: '#059669' },
                { label: 'Awaiting Send', value: TARGETS.length - Object.keys(sent).length, color: '#D97706' },
              ].map((s, i) => (
                <div key={i} style={{
                  background: '#FFF', borderRadius: 12, padding: 20, textAlign: 'center',
                  border: '1px solid #E5E7EB',
                }}>
                  <div style={{ fontSize: 36, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0D3330', marginBottom: 16 }}>
                Reach Potential
              </h3>
              {[
                { name: 'Guidepost / CEG', reach: '100+ schools', status: sent['guidepost'] ? 'Sent' : 'Pending' },
                { name: 'Etonkids', reach: '60+ campuses', status: sent['etonkids'] ? 'Sent' : 'Pending' },
                { name: 'Brainy Bunch', reach: '120 campuses', status: sent['brainy-bunch'] ? 'Sent' : 'Pending' },
                { name: 'MMI Singapore', reach: 'Multiple campuses + franchisees', status: sent['mmi-singapore'] ? 'Sent' : 'Pending' },
                { name: 'Indian Schools (batch)', reach: '7 direct principals', status: sent['indian-schools'] ? 'Sent' : 'Pending' },
              ].map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                  borderBottom: i < 4 ? '1px solid #F3F4F6' : 'none',
                }}>
                  <span style={{ fontSize: 14 }}>{r.name} — <strong>{r.reach}</strong></span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: r.status === 'Sent' ? '#059669' : '#D97706',
                  }}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
