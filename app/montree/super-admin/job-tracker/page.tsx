// /montree/super-admin/job-tracker/page.tsx
// Job Search Campaign Tracker — ALL China Montessori schools with personalized emails
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SchoolEntry {
  id: string;
  schoolName: string;
  city: string;
  email: string;
  contactPerson: string;
  ageRange: string;
  accreditation: string;
  wave: number;
  subject: string;
  emailBody: string;
  kidsFit: 'both' | 'daughter' | 'neither';
  // Checkboxes
  sent: boolean;
  responded: boolean;
  followUp1: boolean;
  followUp2: boolean;
  interview: boolean;
  offer: boolean;
  rejected: boolean;
  // Dates
  dateSent: string;
  dateFollowUp1: string;
  dateFollowUp2: string;
  dateInterview: string;
  // Notes
  notes: string;
}

const SUBJECT = 'Montessori Teacher Application — Tredoux Willemse (AMS Certified, 12+ Years)';

function makeEmail(school: { schoolName: string; personalParagraph: string }): string {
  return `Dear ${school.schoolName} Team,

I'm writing to express my interest in a teaching position at ${school.schoolName}. I'm an AMS-certified Montessori educator with 12+ years of international teaching experience across China, South Korea, Indonesia, and Germany. I'm currently leading a mixed-age (3-6) Montessori classroom at Tsinghua Daoxing Lake International School in Beijing, where I deliver the full AMI English language curriculum across all five areas: Oral Language, Writing Preparation, Reading, Grammar, and Word Study.

${school.personalParagraph}

Beyond the classroom, I've built Montree (montree.xyz) — a full-stack classroom management platform born from my daily teaching practice. It tracks child progress across a 329-work AMI curriculum, generates parent reports with photos and observations, and includes an AI-powered Montessori advisor. It's live and serving real classrooms today.

I've attached my resume for your review. I'd welcome the opportunity to discuss how my classroom experience and EdTech background could contribute to ${school.schoolName}.

Warm regards,
Tredoux Willemse
AMS Montessori Certified | TESOL (Wits, 190hrs)
tredoux555@gmail.com | +86 18548922404
montree.xyz`;
}

// ═══════════════════════════════════════════
// ALL CHINA SCHOOLS — Wave 1: Both kids fit
// Wave 2: Daughter only (still good targets)
// Wave 3: Hong Kong & other
// ═══════════════════════════════════════════

const INITIAL_SCHOOLS: SchoolEntry[] = [

  // ——————————————————————————————————————
  // WAVE 1 — BOTH KIDS FIT (K-12 or wide age range)
  // ——————————————————————————————————————

  {
    id: 'qais',
    schoolName: 'QAIS — Qingdao Amerasia International School',
    city: 'Qingdao',
    email: 'chowe@qingdaoamerasia.org',
    contactPerson: 'Comine Howe (Dir. Marketing & Comms)',
    ageRange: 'K-12 (3-18)',
    accreditation: 'AMS — first & only AMS-accredited school in Asia',
    kidsFit: 'both',
    wave: 1,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'QAIS — Qingdao Amerasia International School',
      personalParagraph: `I'm reaching out to QAIS specifically because your K-12 program would be an ideal fit for my family — I have a 3-year-old daughter and a 10-year-old son, and I'm looking for a school community that can welcome all of us under one roof. As the first and only AMS-accredited school in Asia, QAIS represents exactly the kind of commitment to authentic Montessori education that I want to be part of. The fact that you offer free tuition for staff children makes this an extraordinarily attractive opportunity for our family. Qingdao's international community and coastal lifestyle are also very appealing.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'TOP PICK. FREE tuition for staff children. Only AMS school in Asia. Beach city, lower cost than Beijing. K-12 covers BOTH kids.',
  },
  {
    id: 'msb',
    schoolName: 'MSB — The International Montessori School of Beijing',
    city: 'Beijing',
    email: 'hr@msb.edu.cn',
    contactPerson: 'Alice Zhang (Chinese Director) / HR',
    ageRange: '6 months - Grade 8',
    accreditation: 'AMI',
    kidsFit: 'both',
    wave: 1,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'MSB — The International Montessori School of Beijing',
      personalParagraph: `I'm reaching out to MSB specifically because your reputation as the longest-running Montessori school in China speaks volumes about your commitment to authentic Montessori education. With approximately 400 students and AMI accreditation, MSB is exactly the caliber of school I want to contribute to. As a parent of a 3-year-old daughter and a 10-year-old son, your program range through Grade 8 is a wonderful fit for my family. Being already based in Beijing means I could transition seamlessly without any relocation.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'AMI (not AMS). Longest-running Montessori in China (~400 students). NO relocation needed — already in Beijing. Covers both kids through Grade 8.',
  },
  {
    id: 'kidtopia',
    schoolName: 'Beijing Kidtopia Montessori Institute',
    city: 'Beijing',
    email: 'chen84690@126.com',
    contactPerson: 'Chen (Recruitment)',
    ageRange: '0-18',
    accreditation: 'AMI-founded training center',
    kidsFit: 'both',
    wave: 1,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Beijing Kidtopia Montessori Institute',
      personalParagraph: `I'm reaching out to Kidtopia specifically because your 0-18 age range and roots as an AMI training center make you a rare find in Beijing. As a parent of a 3-year-old daughter and a 10-year-old son, I'm looking for a community that can welcome my whole family — and Kidtopia's breadth of programming is exactly that. Your commitment to authentic Montessori education from infancy through adolescence aligns perfectly with my teaching philosophy. Being already based in Beijing means I could start immediately.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'AMI-founded. 0-18 covers BOTH kids. 126.com email = Chinese-run school. No relocation needed.',
  },
  {
    id: 'hongwen',
    schoolName: 'Hongwen School Qingdao',
    city: 'Qingdao',
    email: 'info@hongwenschool.com.cn',
    contactPerson: 'HR Department',
    ageRange: 'K-12 (3-12)',
    accreditation: 'International curriculum',
    kidsFit: 'both',
    wave: 1,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Hongwen School Qingdao',
      personalParagraph: `I'm reaching out to Hongwen specifically because your K-12 international program is ideal for my family — I have a 3-year-old daughter and a 10-year-old son, and finding a school that can welcome both children is a top priority. While my primary expertise is in Montessori early childhood education, I'm deeply committed to progressive, child-centered approaches at every level. Qingdao's international community and quality of life are very attractive for our family.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Not pure Montessori — international K-12. Backup Qingdao option. Covers BOTH kids.',
  },
  {
    id: 'nebula',
    schoolName: 'Nebula Academy Shanghai',
    city: 'Shanghai',
    email: 'info@nebulaacademy.cn',
    contactPerson: 'Campus Directors',
    ageRange: '2-12',
    accreditation: 'Bilingual Montessori',
    kidsFit: 'both',
    wave: 1,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Nebula Academy Shanghai',
      personalParagraph: `I'm reaching out to Nebula Academy because your 2-12 age range means both my 3-year-old daughter and 10-year-old son could join the community together. Your progressive bilingual approach to Montessori education across 5 campuses in Shanghai is impressive, and I'd love to bring my experience delivering the full AMI language curriculum to your team. While this would mean relocating from Beijing, Shanghai's international community and your school's growth trajectory make it a very compelling opportunity.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Formerly Montessori School of Shanghai. 5 campuses. Covers BOTH kids (2-12). Email may be outdated — domain was not resolving during outreach campaign.',
  },
  {
    id: 'guidepost',
    schoolName: 'Guidepost Montessori Shanghai',
    city: 'Shanghai',
    email: 'info@guidepostmontessori.com',
    contactPerson: 'Steve Xu (Global CEO, +852-9126-6211)',
    ageRange: '0-12',
    accreditation: 'AMI — Cosmic Education Group',
    kidsFit: 'both',
    wave: 1,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Guidepost Montessori Shanghai',
      personalParagraph: `I'm reaching out to Guidepost because your AMI-aligned program covering ages 0-12 is an excellent fit for my family — I have a 3-year-old daughter and a 10-year-old son. As part of the Cosmic Education Group with over 100 schools globally, Guidepost represents the kind of scaled, high-quality Montessori education that I find deeply inspiring. Your Mandarin-English immersion model also aligns perfectly with my experience teaching in bilingual environments in China. I would be honored to bring my 12+ years of classroom experience and my EdTech expertise to such a forward-thinking organization.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'CHAIN: 100+ schools globally. CEO Steve Xu. HK HQ. AMI. Covers BOTH kids (0-12). Mandarin+English immersion.',
  },

  // ——————————————————————————————————————
  // WAVE 2 — DAUGHTER ONLY (ages 2-6, still strong targets)
  // ——————————————————————————————————————

  {
    id: 'etonkids-hq',
    schoolName: 'Etonkids International (Headquarters)',
    city: 'Beijing (60+ campuses China-wide)',
    email: 'info@etonkids.com',
    contactPerson: 'Vivien Wang (CEO) / HR (+86-10-82357608)',
    ageRange: '1.5-6',
    accreditation: 'AMS, MACTE, ISO 9001',
    kidsFit: 'daughter',
    wave: 2,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Etonkids International',
      personalParagraph: `I'm reaching out to Etonkids because your scale across China — 60+ campuses — combined with your AMS and MACTE accreditation demonstrates an extraordinary commitment to quality Montessori education at scale. As someone who has built a classroom management platform (Montree) specifically for Montessori schools, I'm deeply interested in how technology can support authentic Montessori practice across multiple campuses. My 3-year-old daughter would thrive in your program, and I would welcome the opportunity to contribute my 12+ years of classroom experience and EdTech background to the Etonkids community. I'm based in Beijing and available for any campus.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'BIGGEST CHAIN in China. AMS+MACTE. Harvard/Kellogg founded. Send to HQ — they place across campuses. Only covers daughter (3). Son needs separate school.',
  },
  {
    id: 'hd-qingdao',
    schoolName: 'HD Qingdao Montessori Academy',
    city: 'Qingdao',
    email: 'info@hdmontessori.com',
    contactPerson: 'Ms. Li Suxiang (Principal)',
    ageRange: '2-6',
    accreditation: 'AMI (3-6 certified)',
    kidsFit: 'daughter',
    wave: 2,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'HD Qingdao Montessori Academy',
      personalParagraph: `I'm reaching out to HD Montessori because your AMI-certified program for ages 3-6 represents the gold standard of Montessori early childhood education. Ms. Li Suxiang's leadership and the school's reputation in Qingdao are well-known in the Montessori community. My 3-year-old daughter would be the perfect age for your program, and I would love the opportunity to bring my experience delivering the full AMI English language curriculum — including the complete Pink/Blue/Green reading program, Sandpaper Letters, Grammar Farm, and Moveable Alphabet work — to your team.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'High quality AMI. Only covers daughter. Backup Qingdao option alongside QAIS.',
  },
  {
    id: 'casa-beijing',
    schoolName: 'Casa dei Bambini Beijing',
    city: 'Beijing',
    email: 'info@casadeibambini.com.cn',
    contactPerson: 'Admissions',
    ageRange: '2-6',
    accreditation: 'AMI',
    kidsFit: 'daughter',
    wave: 2,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Casa dei Bambini Beijing',
      personalParagraph: `I'm reaching out to Casa dei Bambini because your AMI-accredited Children's House program embodies the authentic Montessori tradition that I'm passionate about. The name itself — Maria Montessori's original "Children's House" — signals your commitment to staying true to the method. My 3-year-old daughter would be the perfect age for your program, and as someone already based in Beijing, I could transition seamlessly. I would love to bring my experience with the full AMI English language curriculum and my classroom technology platform to your school.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'AMI Children\'s House. Only covers daughter. No relocation needed.',
  },
  {
    id: 'bjmontessori',
    schoolName: 'Beijing Montessori International Kindergarten',
    city: 'Beijing',
    email: 'contact@bjmontessori.com',
    contactPerson: 'Admissions',
    ageRange: '2-6',
    accreditation: 'International Montessori',
    kidsFit: 'daughter',
    wave: 2,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Beijing Montessori International Kindergarten',
      personalParagraph: `I'm reaching out because your international Montessori kindergarten program in Beijing aligns perfectly with my experience and current location. As an AMS-certified educator already based in Beijing, I could contribute immediately to your team. My 3-year-old daughter would also be the ideal age for your program. I bring deep expertise in the AMI English language curriculum for ages 3-6, including the complete reading program, Sandpaper Letters with AMI groupings, and Grammar Farm.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Beijing-based. Only covers daughter. No relocation.',
  },
  {
    id: 'shanghai-montessori',
    schoolName: 'Shanghai Montessori Academy',
    city: 'Shanghai',
    email: 'info@montessoriacademy.cn',
    contactPerson: 'Admissions',
    ageRange: '2-6',
    accreditation: 'Montessori',
    kidsFit: 'daughter',
    wave: 2,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Shanghai Montessori Academy',
      personalParagraph: `I'm reaching out to Shanghai Montessori Academy because your commitment to Montessori education in one of China's most international cities is very appealing. While this would mean relocating from Beijing, Shanghai's vibrant international community and your school's program would be an excellent fit for my 3-year-old daughter. I bring 12+ years of teaching experience and deep expertise in the AMI English language curriculum, including phonics programs specifically designed for Chinese L1 learners.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Shanghai. Only covers daughter. Would need relocation.',
  },
  {
    id: 'etonkids-pudong',
    schoolName: 'Etonkids Shanghai Pudong',
    city: 'Shanghai',
    email: 'pd@etonkids.com',
    contactPerson: 'Campus Director',
    ageRange: '1.5-6',
    accreditation: 'AMS, MACTE',
    kidsFit: 'daughter',
    wave: 2,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Etonkids Shanghai Pudong',
      personalParagraph: `I'm reaching out to the Etonkids Pudong campus because your AMS and MACTE accreditation, combined with the resources of China's largest Montessori chain, creates an exceptional teaching environment. My 3-year-old daughter would thrive in your program, and I would love to bring my experience delivering the full AMI English language curriculum to your Shanghai team. I have extensive experience in bilingual Mandarin-English environments and have developed phonics curricula specifically for Chinese L1 learners.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Etonkids chain campus. AMS+MACTE. Only covers daughter. Campus email corrected (pd not pudong).',
  },
  {
    id: 'etonkids-hongqiao',
    schoolName: 'Etonkids Shanghai Hongqiao',
    city: 'Shanghai',
    email: 'hq@etonkids.com',
    contactPerson: 'Campus Director',
    ageRange: '1.5-6',
    accreditation: 'AMS, MACTE',
    kidsFit: 'daughter',
    wave: 2,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Etonkids Shanghai Hongqiao',
      personalParagraph: `I'm reaching out to the Etonkids Hongqiao campus because your location in Shanghai's international hub, combined with Etonkids' AMS and MACTE accreditation, makes this a very compelling opportunity. My 3-year-old daughter would be the perfect fit for your program, and I would love to contribute my expertise in the AMI English language curriculum. I bring deep experience with mixed-age Montessori classrooms and have built classroom technology tools that could benefit your teaching team.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Etonkids chain campus. Only covers daughter. Note: "hq" = Hongqiao campus code, NOT headquarters.',
  },
  {
    id: 'etonkids-chengdu',
    schoolName: 'Etonkids Chengdu',
    city: 'Chengdu',
    email: 'cdht@etonkids.com',
    contactPerson: 'Campus Director',
    ageRange: '1.5-6',
    accreditation: 'AMS, MACTE',
    kidsFit: 'daughter',
    wave: 2,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Etonkids Chengdu',
      personalParagraph: `I'm reaching out to the Etonkids Chengdu campus because Chengdu's growing international community and relaxed lifestyle are very attractive for my family. Combined with Etonkids' AMS and MACTE accreditation, this represents an excellent opportunity. My 3-year-old daughter would be the right age for your program. I bring 12+ years of international teaching experience, deep expertise in the AMI English language curriculum, and conversational Mandarin that helps me connect with Chinese families.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Etonkids chain. Chengdu = great lifestyle city. Only covers daughter. Campus code: cdht.',
  },
  {
    id: 'etonkids-gz',
    schoolName: 'Etonkids Guangzhou',
    city: 'Guangzhou',
    email: 'gz@etonkids.com',
    contactPerson: 'Campus Director',
    ageRange: '1.5-6',
    accreditation: 'AMS, MACTE',
    kidsFit: 'daughter',
    wave: 2,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Etonkids Guangzhou',
      personalParagraph: `I'm reaching out to the Etonkids Guangzhou campus because southern China's largest city offers a dynamic international community. Combined with Etonkids' AMS and MACTE accreditation, your campus would be an excellent fit for my teaching expertise. My 3-year-old daughter would thrive in your program. I bring deep experience delivering the full AMI English language curriculum in mixed-age Montessori classrooms, and I've developed phonics and vocabulary curricula specifically tailored for Chinese L1 learners.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Etonkids chain. Guangzhou. Only covers daughter.',
  },
  {
    id: 'discovery-sz',
    schoolName: 'Discovery Montessori Shenzhen',
    city: 'Shenzhen',
    email: 'info@discovery-montessori.cn',
    contactPerson: 'Admissions',
    ageRange: '2-6',
    accreditation: 'Montessori',
    kidsFit: 'daughter',
    wave: 2,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Discovery Montessori Shenzhen',
      personalParagraph: `I'm reaching out to Discovery Montessori because Shenzhen's innovation-driven international community is very appealing, and your Montessori program would be an excellent fit for my 3-year-old daughter. I bring 12+ years of international teaching experience and deep expertise in the AMI English language curriculum. As the creator of Montree (montree.xyz), a classroom management platform built from real Montessori teaching practice, I also bring a unique technology perspective that could benefit your school.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Shenzhen tech hub. Only covers daughter. Email uses hyphenated domain.',
  },

  // ——————————————————————————————————————
  // WAVE 3 — HONG KONG + BOUNCED/RISKY EMAILS
  // ——————————————————————————————————————

  {
    id: 'hkma',
    schoolName: 'Hong Kong Montessori Academy (HKMA)',
    city: 'Hong Kong',
    email: 'enquiry@hkma.edu.hk',
    contactPerson: 'Admissions',
    ageRange: '2-6',
    accreditation: 'AMI',
    kidsFit: 'daughter',
    wave: 3,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Hong Kong Montessori Academy',
      personalParagraph: `I'm reaching out to HKMA because your AMI accreditation in Hong Kong represents the gold standard of Montessori education in the region. While I'm currently based in Beijing, Hong Kong's international environment and your school's reputation make this a very compelling opportunity. My 3-year-old daughter would be the perfect age for your program. I bring deep expertise in the AMI English language curriculum for ages 3-6 and have extensive experience in bilingual educational settings across Asia.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Hong Kong. AMI. Only covers daughter. Email corrected from info@ to enquiry@.',
  },
  {
    id: 'icms',
    schoolName: 'Island Children\'s Montessori (ICMS)',
    city: 'Hong Kong',
    email: 'info@icms.edu.hk',
    contactPerson: 'Admissions',
    ageRange: '2-6',
    accreditation: 'AMI',
    kidsFit: 'daughter',
    wave: 3,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Island Children\'s Montessori School',
      personalParagraph: `I'm reaching out to ICMS because your AMI-accredited program in Hong Kong represents authentic Montessori education at its finest. My 3-year-old daughter would be the perfect age for your program. As an AMS-certified educator with 12+ years of international experience, I bring deep expertise in the AMI English language curriculum — including the complete Pink/Blue/Green reading program, Sandpaper Letters, Grammar Farm, and I Spy sound games. Hong Kong's international community is very attractive for our family.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Hong Kong. AMI. Only covers daughter.',
  },
  {
    id: 'discovery-hk',
    schoolName: 'Discovery Montessori Hong Kong',
    city: 'Hong Kong',
    email: 'admissions@discoverymontessori.hk',
    contactPerson: 'Admissions',
    ageRange: '2-6',
    accreditation: 'Montessori',
    kidsFit: 'daughter',
    wave: 3,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Discovery Montessori Hong Kong',
      personalParagraph: `I'm reaching out to Discovery Montessori because your program in Hong Kong offers an excellent Montessori environment for young learners. My 3-year-old daughter would be the ideal age for your classroom, and I would love to bring my AMS certification and 12+ years of international teaching experience to your team. I have deep expertise in the AMI English language curriculum and have developed phonics programs specifically for multilingual learners in Asia.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Hong Kong. Only covers daughter. Email corrected from earlier campaigns.',
  },
  {
    id: 'etonkids-lido',
    schoolName: 'Etonkids Beijing Lido',
    city: 'Beijing',
    email: 'lido@etonkids.com',
    contactPerson: 'Campus Director',
    ageRange: '1.5-6',
    accreditation: 'AMS, MACTE',
    kidsFit: 'daughter',
    wave: 3,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Etonkids Beijing Lido',
      personalParagraph: `I'm reaching out to the Etonkids Lido campus because your location in Beijing's Lido area, combined with Etonkids' AMS and MACTE accreditation, makes this a natural fit for our family. As someone already based in Beijing, I could start immediately. My 3-year-old daughter would be the perfect age for your program. I bring deep expertise in the AMI English language curriculum and have been leading a mixed-age Montessori classroom at Tsinghua Daoxing Lake International School.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'WARNING: Email BOUNCED in outreach campaign. Try HQ (info@etonkids.com) instead. Beijing, no relocation.',
  },
  {
    id: 'etonkids-cbd',
    schoolName: 'Etonkids Beijing CBD',
    city: 'Beijing',
    email: 'cbd@etonkids.com',
    contactPerson: 'Campus Director',
    ageRange: '1.5-6',
    accreditation: 'AMS, MACTE',
    kidsFit: 'daughter',
    wave: 3,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Etonkids Beijing CBD',
      personalParagraph: `I'm reaching out to the Etonkids CBD campus because your central Beijing location and Etonkids' AMS and MACTE accreditation make this an excellent opportunity. I'm already based in Beijing and could transition immediately. My 3-year-old daughter would thrive in your program. I bring 12+ years of international teaching experience and deep expertise in the AMI English language curriculum, including programs I've developed specifically for Chinese L1 learners.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'WARNING: Email BOUNCED in outreach campaign. Try HQ (info@etonkids.com) instead. Beijing, no relocation.',
  },
  {
    id: 'etonkids-tianjin',
    schoolName: 'Etonkids Tianjin',
    city: 'Tianjin',
    email: 'tianjin@etonkids.com',
    contactPerson: 'Campus Director',
    ageRange: '1.5-6',
    accreditation: 'AMS, MACTE',
    kidsFit: 'daughter',
    wave: 3,
    subject: SUBJECT,
    emailBody: makeEmail({
      schoolName: 'Etonkids Tianjin',
      personalParagraph: `I'm reaching out to the Etonkids Tianjin campus because Tianjin's proximity to Beijing — just 30 minutes by high-speed rail — makes it a very practical option for our family. Combined with Etonkids' AMS and MACTE accreditation, your campus offers an excellent teaching environment. My 3-year-old daughter would be the perfect age for your program. I bring deep expertise in the AMI English language curriculum and conversational Mandarin.`,
    }),
    sent: false, responded: false, followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'WARNING: Email BOUNCED in outreach campaign. Close to Beijing by rail. Only covers daughter.',
  },
];

const WAVE_LABELS: Record<number, string> = {
  1: 'Wave 1 — Both Kids Fit',
  2: 'Wave 2 — Daughter Only',
  3: 'Wave 3 — HK & Risky Emails',
};

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const STORAGE_KEY = 'montree_job_tracker_v3';

export default function JobTrackerPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [schools, setSchools] = useState<SchoolEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState('');
  const [showWave, setShowWave] = useState<'all' | 1 | 2 | 3>('all');

  useEffect(() => {
    try {
      const savedToken = sessionStorage.getItem('sa_session');
      const savedTs = sessionStorage.getItem('sa_session_ts');
      if (savedToken && savedTs) {
        const elapsed = Date.now() - parseInt(savedTs, 10);
        if (elapsed < SESSION_TIMEOUT_MS) setAuthenticated(true);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SchoolEntry[];
        // Merge: keep saved checkbox/notes state, but update email content from code
        const merged = INITIAL_SCHOOLS.map(init => {
          const existing = parsed.find(p => p.id === init.id);
          if (existing) {
            return {
              ...init,
              sent: existing.sent,
              responded: existing.responded,
              followUp1: existing.followUp1,
              followUp2: existing.followUp2,
              interview: existing.interview,
              offer: existing.offer,
              rejected: existing.rejected,
              dateSent: existing.dateSent,
              dateFollowUp1: existing.dateFollowUp1,
              dateFollowUp2: existing.dateFollowUp2,
              dateInterview: existing.dateInterview,
              notes: existing.notes,
            };
          }
          return init;
        });
        setSchools(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } else {
        setSchools(INITIAL_SCHOOLS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SCHOOLS));
      }
    } catch {
      setSchools(INITIAL_SCHOOLS);
    }
  }, [authenticated]);

  const save = useCallback((updated: SchoolEntry[]) => {
    setSchools(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* */ }
  }, []);

  const update = (id: string, changes: Partial<SchoolEntry>) => {
    save(schools.map(s => s.id === id ? { ...s, ...changes } : s));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(''), 2000);
    } catch { /* */ }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('sa_session', data.token || 'ok');
        sessionStorage.setItem('sa_session_ts', Date.now().toString());
        setAuthenticated(true);
      } else {
        setError('Wrong password');
      }
    } catch { setError('Connection error'); }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-xl p-8 w-full max-w-sm border border-gray-800">
          <h1 className="text-xl font-bold text-white mb-1">🎯 Job Tracker</h1>
          <p className="text-gray-400 text-sm mb-6">Super-admin access required</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white mb-3 focus:outline-none focus:border-emerald-500" />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button onClick={handleLogin} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">Unlock</button>
        </div>
      </div>
    );
  }

  const displayed = showWave === 'all' ? schools : schools.filter(s => s.wave === showWave);
  const sentCount = schools.filter(s => s.sent).length;
  const respondedCount = schools.filter(s => s.responded).length;
  const interviewCount = schools.filter(s => s.interview).length;
  const bothKidsCount = schools.filter(s => s.kidsFit === 'both').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/montree/super-admin" className="text-gray-400 hover:text-white text-sm">&larr; Back</Link>
            <h1 className="text-lg font-bold">🎯 Job Search Campaign — {schools.length} Schools</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-blue-400">{bothKidsCount} fit both kids</span>
            <span className="text-gray-500">{sentCount}/{schools.length} sent</span>
            <span className="text-emerald-500">{respondedCount} replied</span>
            <span className="text-amber-400">{interviewCount} interviews</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {/* Wave Filter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { key: 'all' as const, label: `All (${schools.length})` },
            { key: 1 as const, label: `${WAVE_LABELS[1]} (${schools.filter(s => s.wave === 1).length})` },
            { key: 2 as const, label: `${WAVE_LABELS[2]} (${schools.filter(s => s.wave === 2).length})` },
            { key: 3 as const, label: `${WAVE_LABELS[3]} (${schools.filter(s => s.wave === 3).length})` },
          ].map(tab => (
            <button key={String(tab.key)} onClick={() => setShowWave(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showWave === tab.key ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}>{tab.label}</button>
          ))}
        </div>

        {/* School Cards */}
        <div className="space-y-3">
          {displayed.map(school => {
            const isOpen = expandedId === school.id;

            return (
              <div key={school.id} className={`bg-gray-900 border rounded-xl overflow-hidden transition-all ${
                school.rejected ? 'border-red-900/50 opacity-60' :
                school.interview ? 'border-emerald-700' :
                school.responded ? 'border-blue-700' :
                school.sent ? 'border-amber-800/50' : 'border-gray-800'
              }`}>
                {/* Summary Row */}
                <div className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : school.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">{school.schoolName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          school.kidsFit === 'both' ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-800 text-gray-500'
                        }`}>
                          {school.kidsFit === 'both' ? '👨‍👩‍👧‍👦 Both kids' : '👧 Daughter only'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        📍 {school.city} · {school.ageRange} · {school.accreditation}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{school.contactPerson}</div>
                    </div>

                    {/* Status Checkboxes */}
                    <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                      {([
                        { key: 'sent' as const, label: 'Sent', color: 'accent-blue-500' },
                        { key: 'responded' as const, label: 'Reply', color: 'accent-emerald-500' },
                        { key: 'followUp1' as const, label: 'F/U1', color: 'accent-amber-500' },
                        { key: 'followUp2' as const, label: 'F/U2', color: 'accent-orange-500' },
                        { key: 'interview' as const, label: '🎉', color: 'accent-green-400' },
                        { key: 'rejected' as const, label: '❌', color: 'accent-red-500' },
                      ]).map(cb => (
                        <label key={cb.key} className="flex flex-col items-center gap-0.5 cursor-pointer">
                          <input type="checkbox" checked={school[cb.key]}
                            onChange={e => {
                              const changes: Partial<SchoolEntry> = { [cb.key]: e.target.checked };
                              const today = new Date().toISOString().split('T')[0];
                              if (cb.key === 'sent' && e.target.checked && !school.dateSent) changes.dateSent = today;
                              if (cb.key === 'followUp1' && e.target.checked && !school.dateFollowUp1) changes.dateFollowUp1 = today;
                              if (cb.key === 'followUp2' && e.target.checked && !school.dateFollowUp2) changes.dateFollowUp2 = today;
                              if (cb.key === 'interview' && e.target.checked && !school.dateInterview) changes.dateInterview = today;
                              update(school.id, changes);
                            }}
                            className={`w-4 h-4 rounded ${cb.color}`} />
                          <span className="text-[10px] text-gray-500">{cb.label}</span>
                        </label>
                      ))}
                    </div>

                    <span className="text-gray-500 text-sm ml-2">{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {/* Date tags */}
                  {(school.dateSent || school.dateFollowUp1 || school.dateInterview) && (
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      {school.dateSent && <span>📤 {school.dateSent}</span>}
                      {school.dateFollowUp1 && <span>📞 F/U1: {school.dateFollowUp1}</span>}
                      {school.dateFollowUp2 && <span>📞 F/U2: {school.dateFollowUp2}</span>}
                      {school.dateInterview && <span>🎉 {school.dateInterview}</span>}
                    </div>
                  )}
                </div>

                {/* Expanded: Copy-Paste Email + Notes */}
                {isOpen && (
                  <div className="border-t border-gray-800 p-4 space-y-4">
                    {/* Warning for bounced emails */}
                    {school.notes.includes('BOUNCED') && (
                      <div className="bg-red-900/30 border border-red-800/50 rounded-lg px-3 py-2 text-sm text-red-300">
                        ⚠️ This email address bounced during the Montree outreach campaign. Consider emailing HQ instead.
                      </div>
                    )}

                    {/* Copy-Paste Fields */}
                    <div className="space-y-3">
                      {/* Email Address */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500 font-medium">TO: Email Address</label>
                          <button onClick={() => copyToClipboard(school.email, `email-${school.id}`)}
                            className="text-xs px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors">
                            {copiedField === `email-${school.id}` ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 select-all">
                          {school.email}
                        </div>
                      </div>

                      {/* Subject */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500 font-medium">Subject Line</label>
                          <button onClick={() => copyToClipboard(school.subject, `subject-${school.id}`)}
                            className="text-xs px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors">
                            {copiedField === `subject-${school.id}` ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 select-all">
                          {school.subject}
                        </div>
                      </div>

                      {/* Email Body */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500 font-medium">Email Body — personalized for {school.schoolName}</label>
                          <button onClick={() => copyToClipboard(school.emailBody, `body-${school.id}`)}
                            className="text-xs px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors">
                            {copiedField === `body-${school.id}` ? '✓ Copied!' : '📋 Copy Email'}
                          </button>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-sm text-gray-300 whitespace-pre-wrap max-h-72 overflow-y-auto select-all leading-relaxed">
                          {school.emailBody}
                        </div>
                      </div>

                      {/* Quick Copy All */}
                      <button onClick={() => copyToClipboard(
                        `TO: ${school.email}\nSUBJECT: ${school.subject}\n\n${school.emailBody}`,
                        `all-${school.id}`
                      )} className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
                        {copiedField === `all-${school.id}` ? '✓ Everything Copied!' : '📋 Copy Everything (Email + Subject + Body)'}
                      </button>
                    </div>

                    {/* Notes */}
                    <div className="pt-2 border-t border-gray-800">
                      <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                      <textarea value={school.notes}
                        onChange={e => update(school.id, { notes: e.target.value })}
                        className="w-full bg-gray-800 text-sm text-gray-300 rounded-lg p-3 border border-gray-700 focus:border-emerald-500 focus:outline-none resize-none" rows={3} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 text-xs text-gray-600 text-center space-y-1">
          <p>Checkboxes auto-save to localStorage. Dates auto-fill when checked. Expand any card to copy the email.</p>
          <p>👨‍👩‍👧‍👦 = K-12 or wide age range (fits both kids) · 👧 = Early childhood only (daughter fits, son needs separate school)</p>
        </div>
      </div>
    </div>
  );
}
