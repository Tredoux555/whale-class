// @ts-nocheck
'use client';
import { useState } from "react";
import Link from 'next/link';

// ============================================
// PLATFORM STRATEGY HUB
// ============================================

const PLATFORM_BIOS = {
  tiktok: {
    name: "TikTok",
    emoji: "🎵",
    color: "#ff0050",
    handle: "@montree.xyz",
    bio: `🌳 Montessori teacher who coded a classroom tool
📒→📱 From ledger books to one tap
🎓 AMS certified | Beijing classroom
🔗 Free 3-month pilot ⬇️`,
    link: "montree.xyz",
  },
  instagram: {
    name: "Instagram",
    emoji: "📸",
    color: "#E4405F",
    handle: "@montree.xyz",
    bio: `🌳 The QuickBooks moment for Montessori
Built by a teacher, inside a real classroom
📋 One-tap tracking → Auto parent reports
🎁 Free 3-month pilot ⬇️`,
    link: "montree.xyz",
  },
  facebook: {
    name: "Facebook",
    emoji: "📘",
    color: "#1877F2",
    handle: "Montree — Modern Montessori Tools",
    bio: `Montree replaces hours of handwritten Montessori record-keeping with one-tap digital tracking, auto-generated parent reports, and AI curriculum guidance. Built by a working Montessori teacher in Beijing. Free 3-month pilot for schools → montree.xyz`,
    link: "montree.xyz",
  },
  wechat: {
    name: "WeChat",
    emoji: "💬",
    color: "#07C160",
    handle: "Montree蒙特利",
    bio: `🌳 蒙台梭利教室管理系统 | 一键追踪 | 自动家长报告 | AI课程顾问 | 由北京蒙氏老师打造 | 免费试用3个月 → montree.xyz`,
    link: "montree.xyz",
  },
};

// ============================================
// TIKTOK SERIES: 10 SCRIPTS
// ============================================
const TIKTOK_SCRIPTS = [
  {
    episode: 1,
    series: "The Ledger Problem",
    title: "This is how Montessori teachers track progress in 2026",
    hook: "POV: You're a Montessori teacher and it's 6pm on a Friday",
    duration: "15-30s",
    format: "Problem reveal",
    script: `[HOOK — first 2 sec]
(Camera on your face, tired, sitting at desk)
TEXT ON SCREEN: "POV: You're a Montessori teacher and it's 6pm on a Friday"

[BEAT 1 — 3 sec]
(Slow pan down to massive open ledger book)
TEXT: "And you still have to update records for 24 children"

[BEAT 2 — 3 sec]
(Close-up of hand writing rows)
TEXT: "213 works. By hand. Every. Single. Week."

[BEAT 3 — 4 sec]
(Pull back to show the FULL ledger spread)
TEXT: "8+ hours a week on THIS 📒"

[BEAT 4 — 3 sec]
(Look up at camera, slight smile)
TEXT: "...so I built something 🌳"

[END]
TEXT: "Part 2 → Follow to see what I made"
montree.xyz in bio`,
    hashtags: "#montessori #teachertok #montessoriteacher #teacherlife #edtech #montessoriclassroom #thingsiwish #teacherproblems",
    notes: "Film this at your actual desk with your actual ledger. Raw and real. The tiredness should be genuine — film on a Friday evening. Don't over-produce it.",
  },
  {
    episode: 2,
    series: "The Ledger Problem",
    title: "I coded a solution during nap time",
    hook: "Remember that massive ledger? I replaced it.",
    duration: "30-45s",
    format: "Solution reveal",
    script: `[HOOK — 2 sec]
(Hold phone, confident look)
TEXT: "Remember that massive ledger? I replaced it."

[BEAT 1 — 5 sec]
(Screen recording: open Montree on phone)
TEXT: "Meet Montree 🌳"

[BEAT 2 — 5 sec]
(Show tapping a child's work to cycle progress)
TEXT: "One tap. That's it. Presented → Practicing → Mastered"

[BEAT 3 — 5 sec]
(Show the progress dashboard filling up)
TEXT: "Every child. Every work. Real-time."

[BEAT 4 — 5 sec]
(Show parent report generating)
TEXT: "Parent reports? Auto-generated. One click to send."

[BEAT 5 — 5 sec]
(Back to face, genuine)
TEXT: "I built this because I needed it."

[BEAT 6 — 3 sec]
TEXT: "And now every Montessori teacher can have it — free."

[END]
TEXT: "Free 3-month pilot — link in bio 🌳"`,
    hashtags: "#montessori #edtech #teachertok #buildinpublic #indiemaker #montessoriteacher #classroomtech #teachertools",
    notes: "This is the money video. Screen record the actual app working. The tap animation cycling through statuses is visually satisfying — lean into that. Keep energy positive but not salesy.",
  },
  {
    episode: 3,
    series: "The Ledger Problem",
    title: "5,112 data points by hand",
    hook: "Let me show you a number that should make every Montessori principal uncomfortable",
    duration: "15-20s",
    format: "Shocking stat",
    script: `[HOOK — 2 sec]
(Looking at camera, serious)
TEXT: "A number every Montessori principal needs to see"

[BEAT 1 — 4 sec]
TEXT BUILDS:
"24 children"
"× 213 works"
"= 5,112 data points"

[BEAT 2 — 3 sec]
TEXT: "PER YEAR. BY HAND. IN A LEDGER."

[BEAT 3 — 3 sec]
(Slight head shake)
TEXT: "Accountants stopped doing this 30 years ago."

[BEAT 4 — 3 sec]
TEXT: "Why haven't we? 🌳"

[END]
"montree.xyz — the fix is free"`,
    hashtags: "#montessori #education #schooladmin #montessoriprincipal #edtech #classroommanagement #teacherlife",
    notes: "This one targets PRINCIPALS not just teachers. The text building on screen is key — let the math hit. Use a dramatic/serious tone. Keep it short for high completion rate.",
  },
  {
    episode: 4,
    series: "Day in the Life",
    title: "Day in the life of a Montessori teacher using Montree",
    hook: "6:30am — let me show you how a Montessori teacher's day SHOULD look",
    duration: "45-60s",
    format: "Day-in-the-life vlog",
    script: `[HOOK — 2 sec]
TEXT: "Day in the life: Montessori teacher with Montree 🌳"

[6:30] Arriving at school, setting up classroom
TEXT: "Classroom prep — materials ready"

[8:00] Circle time with children
TEXT: "Morning circle — the best part"

[8:30] Work period begins — show tapping Montree on tablet
TEXT: "Work period: I track as they work. One tap per child."

[9:30] Show quick glance at progress dashboard
TEXT: "Real-time view of every child's progress 📊"

[10:30] Outdoor play — put tablet down
TEXT: "The best part? I'm DONE recording. No catch-up needed."

[12:00] Lunch — show laptop briefly
TEXT: "Parent report? Already generated. Send with one click."

[3:00] Pack up, grab bag
TEXT: "3pm. Everything tracked. Reports sent."

[3:05] Walking out the door, big smile
TEXT: "Going home ON TIME. That's the Montree difference."

[END]
"Free 3-month pilot — link in bio"`,
    hashtags: "#montessori #dayinthelife #teachertok #montessoriteacher #morningroutine #teacherlife #classroomtech #edtech",
    notes: "THIS IS YOUR BEST CONTENT FORMAT. Day-in-the-life is massive on TikTok. Film real moments from your actual day. The key moment is 3pm — walking out the door on time. That's the emotional payoff. No student faces — film hands, materials, back of heads if needed.",
  },
  {
    episode: 5,
    series: "vs Transparent Classroom",
    title: "Transparent Classroom has a 1.2 star app rating",
    hook: "The most popular Montessori software has a 1.2 star rating on iOS",
    duration: "20-30s",
    format: "Competitor comparison",
    script: `[HOOK — 2 sec]
(Show phone with App Store)
TEXT: "The most popular Montessori tracking app"

[BEAT 1 — 3 sec]
(Scroll to show the rating)
TEXT: "1.2 stars on iOS. ⭐"

[BEAT 2 — 5 sec]
(Show real 1-star reviews scrolling)
TEXT: "Teachers literally calling it 'someone's college assignment'"

[BEAT 3 — 3 sec]
(Switch to showing Montree on same phone)
TEXT: "So I built an alternative 🌳"

[BEAT 4 — 5 sec]
(Quick demo — tap tracking, dashboard, report)
TEXT: "One tap tracking. Auto reports. Works on any device."

[BEAT 5 — 3 sec]
TEXT: "And it's free for 3 months."

[END]
"montree.xyz — in bio"`,
    hashtags: "#montessori #transparentclassroom #edtech #appstore #teachertok #montessoriteacher #schooltech #softwarereview",
    notes: "Controversial = engagement. This will get comments from TC users agreeing AND disagreeing. Both are good. Be factual — the 1.2 rating is real. Don't trash them, just state facts and show your alternative.",
  },
  {
    episode: 6,
    series: "QuickBooks Moment",
    title: "What QuickBooks did for accounting, Montree does for Montessori",
    hook: "In the 1980s, every accountant used one of these",
    duration: "30s",
    format: "Analogy story",
    script: `[HOOK — 2 sec]
TEXT: "In the 1980s, every accountant used one of these"
(Hold up a big ledger book)

[BEAT 1 — 4 sec]
TEXT: "Then QuickBooks came along and they never looked back"
(Put ledger down, dramatic)

[BEAT 2 — 5 sec]
TEXT: "In 2026, every Montessori teacher STILL uses one of these"
(Pick up a classroom record book)

[BEAT 3 — 3 sec]
(Look at camera)
TEXT: "That's insane."

[BEAT 4 — 5 sec]
TEXT: "Montree is the QuickBooks moment for Montessori 🌳"
(Quick flash of app working)

[END]
"Free 3-month pilot — link in bio"`,
    hashtags: "#montessori #quickbooks #edtech #teachertok #innovation #startup #buildinpublic #montessoriteacher",
    notes: "The physical prop (holding up ledger book) is powerful. The 'that's insane' beat should land with genuine disbelief. This works because the analogy is instantly understood by anyone, not just Montessori people — could go wider than education niche.",
  },
  {
    episode: 7,
    series: "Build in Public",
    title: "I'm a teacher who taught himself to code to solve a classroom problem",
    hook: "I'm a kindergarten teacher who built a SaaS product",
    duration: "45-60s",
    format: "Founder story / authenticity",
    script: `[HOOK — 2 sec]
(In classroom, surrounded by materials)
TEXT: "I'm a kindergarten teacher who built a SaaS product"

[BEAT 1 — 5 sec]
TEXT: "Every day I'd spend hours after school filling in this ledger"
(Show the actual ledger)

[BEAT 2 — 5 sec]
TEXT: "Recording what each child worked on. By hand."
(Close-up of handwritten rows)

[BEAT 3 — 5 sec]
TEXT: "I thought: there has to be a better way"
(Show late night at laptop, code on screen)

[BEAT 4 — 5 sec]
TEXT: "So between nap times and after bedtime, I learned to code"
(Quick montage — laptop, coffee, classroom, laptop)

[BEAT 5 — 5 sec]
TEXT: "And built Montree — the tool I wished existed"
(App demo on phone)

[BEAT 6 — 5 sec]
TEXT: "Now teachers tap once to track. Reports write themselves."
(Show tap animation + report generating)

[BEAT 7 — 5 sec]
(Back to you, genuine emotion)
TEXT: "I'm not backed by investors. I'm backed by naptime. ☕️"

[END]
"Free for every Montessori teacher — link in bio"`,
    hashtags: "#buildinpublic #teachertok #indiemaker #founderstory #solofounder #edtech #montessori #saasstartup #naptimecoding",
    notes: "THIS HAS VIRAL POTENTIAL beyond education. The 'teacher who coded during naptime' angle plays to #buildinpublic, #indiemaker, #solofounder communities — millions of views possible. The 'not backed by investors, backed by naptime' line is your sound byte. Film this raw and genuine.",
  },
  {
    episode: 8,
    series: "Parent Side",
    title: "POV: You're a parent who just got this from your kid's teacher",
    hook: "What your teacher sends you: ✏️ 'Sarah is doing well.' vs What Montree sends:",
    duration: "20-30s",
    format: "Before/after from parent POV",
    script: `[HOOK — 2 sec]
TEXT: "What most Montessori schools send parents:"

[BEAT 1 — 4 sec]
(Show a basic text: "Your child had a good week. She worked with the pink tower and sandpaper letters.")
TEXT: "...that's it?"

[BEAT 2 — 2 sec]
TEXT: "What Montree sends:"

[BEAT 3 — 8 sec]
(Scroll through the Montree parent report — progress bars, curriculum areas, percentages, specific works mastered)
TEXT: "Every area. Every work. Visual progress. Auto-generated."

[BEAT 4 — 3 sec]
(Parent reaction — impressed face)
TEXT: "This is what parents are paying $20,000/year for 👀"

[END]
"montree.xyz — link in bio 🌳"`,
    hashtags: "#montessori #montessoriparent #parentlife #schoolchoice #parentreport #edtech #montessorischool",
    notes: "This targets PARENTS who then pressure their school to adopt Montree. The bottom-up pull strategy. The $20,000/year line is the emotional trigger — parents expect better tools for that tuition. Share on parent-focused groups and 小红书.",
  },
  {
    episode: 9,
    series: "Montessori Teacher Tips",
    title: "How I track 24 children during a 3-hour work period",
    hook: "Every Montessori teacher asks: how do you keep track of everything?",
    duration: "30-45s",
    format: "Educational / tutorial",
    script: `[HOOK — 2 sec]
TEXT: "How I track 24 children in a 3-hour work period"

[BEAT 1 — 5 sec]
(Show classroom during work period — children working)
TEXT: "Step 1: Children choose their work freely (that's Montessori)"

[BEAT 2 — 5 sec]
(Show yourself observing, then quick tap on tablet)
TEXT: "Step 2: I observe. One tap to record what they chose."

[BEAT 3 — 5 sec]
(Show tap cycling: Not started → Presented → Practicing → Mastered)
TEXT: "Step 3: Tap again to update their level"

[BEAT 4 — 5 sec]
(Show dashboard updating in real-time)
TEXT: "Step 4: Dashboard fills itself. I see everyone at a glance."

[BEAT 5 — 5 sec]
(Show end of work period — put tablet down)
TEXT: "Step 5: Done. No evening paperwork. Ever."

[BEAT 6 — 3 sec]
TEXT: "The secret? Montree 🌳 — free for 3 months"

[END]
"Link in bio"`,
    hashtags: "#montessori #teachertips #montessoriteacher #workperiod #classroommanagement #teacherhack #edtech #montessorimethod",
    notes: "Pure value content. This teaches something useful while naturally demoing the product. The step-by-step format has high completion rate because people want to see all 5 steps. Film during an actual work period if possible (no student faces).",
  },
  {
    episode: 10,
    series: "The Mission",
    title: "Why I'm giving Montree away for free",
    hook: "People keep asking why I don't charge for Montree",
    duration: "45-60s",
    format: "Mission / emotional story",
    script: `[HOOK — 2 sec]
(Sitting in classroom, genuine tone)
TEXT: "People keep asking why I give Montree away for free"

[BEAT 1 — 8 sec]
TEXT: "I grew up on a farm in South Africa"
(Pause for effect)
TEXT: "My family built a school for the children of farm workers"

[BEAT 2 — 5 sec]
TEXT: "That school got shut down. Not because it failed."
TEXT: "Because of corruption."

[BEAT 3 — 5 sec]
(Emotional beat — look down, then back up)
TEXT: "I promised myself I'd build something they couldn't take away"

[BEAT 4 — 5 sec]
TEXT: "Montree is step one. Modern tools for every Montessori classroom."
(Quick app demo)

[BEAT 5 — 8 sec]
TEXT: "The profits will fund free schools. Merit-based. Where graduates get land, housing, and a future."

[BEAT 6 — 5 sec]
(Direct to camera)
TEXT: "So yeah. The 3-month pilot is free. Because the mission is bigger than money."

[END]
"montree.xyz — help us build something that matters 🌳"`,
    hashtags: "#montessori #mission #socialgood #education #africa #edtech #buildinpublic #startup #changingtheworld #teachertok",
    notes: "THIS IS YOUR MOST IMPORTANT VIDEO. Save it for when you have some following (1000+ followers). This is the one that makes people share, follow, and buy. It's raw, it's real, it's YOUR story. No student footage needed — just you, talking to camera. Film in one take. Imperfect is better.",
  },
];

// ============================================
// INSTAGRAM CAROUSEL SCRIPTS
// ============================================
const IG_CAROUSELS = [
  {
    title: "The Ledger Problem (5 slides)",
    slides: [
      { text: "This is how Montessori teachers track progress. In 2026.", subtext: "Swipe to see the problem →", bg: "sepia" },
      { text: "24 children\n× 213 works\n= 5,112 data points\nPER YEAR", subtext: "All tracked by hand.", bg: "dark-red" },
      { text: "8+ hours lost every week to paperwork that could be automated", subtext: "That's 400+ hours a year.", bg: "dark" },
      { text: "What if it took one tap instead?", subtext: "[Dashboard screenshot]", bg: "green" },
      { text: "Montree 🌳\nFree 3-month pilot\nmontree.xyz", subtext: "Built by a Montessori teacher, for Montessori teachers", bg: "green-dark" },
    ],
  },
  {
    title: "Before vs After (4 slides)",
    slides: [
      { text: "Montessori Record-Keeping\nBEFORE vs AFTER", subtext: "Swipe →", bg: "split" },
      { text: "BEFORE: Handwritten ledger\n• Hours of writing after school\n• Easy to make mistakes\n• Can't share with parents\n• Data trapped in a book", subtext: "", bg: "sepia" },
      { text: "AFTER: Montree 🌳\n• One tap during work period\n• Auto parent reports\n• AI curriculum guidance\n• Real-time dashboard", subtext: "", bg: "green" },
      { text: "Try it free for 3 months\nNo credit card required\nmontree.xyz", subtext: "The QuickBooks moment for Montessori", bg: "green-dark" },
    ],
  },
  {
    title: "5 Things Your School is Doing Wrong (5 slides)",
    slides: [
      { text: "5 Signs Your Montessori School Needs Modern Tools", subtext: "How many apply to you? →", bg: "dark" },
      { text: "1. Teachers spend more time on records than on children\n\n2. Parent reports take an entire weekend to write", subtext: "", bg: "dark-red" },
      { text: "3. You can't answer 'what did my child do today?' instantly\n\n4. New teachers have no curriculum guidance", subtext: "", bg: "dark-red" },
      { text: "5. You're still using the same system from the 1990s", subtext: "The ledger hasn't changed. Your classroom has.", bg: "dark" },
      { text: "Montree fixes all 5 🌳\nFree for 3 months\nmontree.xyz", subtext: "", bg: "green-dark" },
    ],
  },
];

// ============================================
// FACEBOOK GROUP STRATEGY
// ============================================
const FB_GROUPS = [
  { name: "Montessori Teachers", members: "100k+", strategy: "Post 'The Ledger Problem' video. Ask: 'How many hours do YOU spend on records?' Engage with every comment.", url: "Search: 'Montessori Teachers' on Facebook" },
  { name: "Montessori Classroom Ideas", members: "50k+", strategy: "Share before/after carousel. Caption: 'I replaced my handwritten records with this.' Don't hard sell — let curiosity drive clicks.", url: "Search on Facebook" },
  { name: "AMS Montessori Community", members: "30k+", strategy: "Share the educational tutorial TikTok (Episode 9). Position as fellow teacher sharing a tip, not selling.", url: "Search on Facebook" },
  { name: "Montessori Guide", members: "25k+", strategy: "Post the 5,112 stat image. Ask: 'Does this number shock you or is it just our reality?'", url: "Search on Facebook" },
  { name: "International Montessori Teachers", members: "15k+", strategy: "Share your founder story. The South Africa + Beijing angle resonates with international community.", url: "Search on Facebook" },
  { name: "Beijing International School Parents", members: "10k+", strategy: "Share parent report preview. 'This is what our classroom uses for progress tracking.' Parent pull creates school demand.", url: "Search on Facebook" },
  { name: "Montessori 101 for Parents", members: "40k+", strategy: "Share Episode 8 (parent POV). Parents who see this will ask their school 'why don't we have this?'", url: "Search on Facebook" },
];

// ============================================
// HASHTAG BANKS
// ============================================
const HASHTAG_BANKS = {
  tiktok: {
    primary: ["#montessori", "#teachertok", "#montessoriteacher", "#teacherlife", "#edtech"],
    secondary: ["#classroommanagement", "#teachertools", "#montessoriclassroom", "#montessorimethod", "#preschoolteacher"],
    trending: ["#buildinpublic", "#indiemaker", "#solofounder", "#dayinthelife", "#teacherproblems"],
    engagement: ["#montessoriathome", "#montessorimom", "#montessoritoddler", "#homeschool", "#gentleparenting"],
  },
  instagram: {
    primary: ["#montessori", "#montessoriteacher", "#montessoriclassroom", "#montessorilife", "#montessorieducation"],
    secondary: ["#earlychildhoodeducation", "#preschoolteacher", "#teachersofinstagram", "#edtech", "#classroomtech"],
    trending: ["#teachertools", "#montessoriathome", "#montessoriinspired", "#consciouseducation", "#alternativeeducation"],
  },
  xiaohongshu: {
    primary: ["#蒙特梭利", "#蒙氏教育", "#国际学校", "#早期教育", "#幼儿教育"],
    secondary: ["#教师工具", "#智能教育", "#家长报告", "#课程追踪", "#教育科技"],
  },
};

// ============================================
// 30-DAY SCHEDULE
// ============================================
const SCHEDULE = [
  { day: 1, platform: "TikTok", content: "Ep 1: Ledger Problem (15s hook)", type: "🎬" },
  { day: 1, platform: "Instagram", content: "Post Ledger Problem social card", type: "📸" },
  { day: 2, platform: "Facebook", content: "Join 3 Montessori groups. Observe. Like. Comment.", type: "👀" },
  { day: 2, platform: "WeChat", content: "Post moment: 来自教室的分享 + Montree screenshot", type: "💬" },
  { day: 3, platform: "TikTok", content: "Ep 2: I coded a solution (30s demo)", type: "🎬" },
  { day: 3, platform: "Instagram", content: "Before/After carousel", type: "📸" },
  { day: 4, platform: "Facebook", content: "Post Ep 1 video in Montessori Teachers group", type: "📘" },
  { day: 5, platform: "TikTok", content: "Ep 3: 5,112 stat (15s shocker)", type: "🎬" },
  { day: 5, platform: "Instagram", content: "5,112 Stat card + caption", type: "📸" },
  { day: 5, platform: "小红书", content: "每年5112个数据点 stat card + Chinese caption", type: "📕" },
  { day: 6, platform: "WeChat", content: "Publish full 公众号 article", type: "💬" },
  { day: 7, platform: "ALL", content: "REST DAY — respond to all comments/DMs", type: "💬" },
  { day: 8, platform: "TikTok", content: "Ep 4: Day in the life (60s vlog)", type: "🎬" },
  { day: 8, platform: "Instagram", content: "Share TikTok as Reel", type: "📸" },
  { day: 9, platform: "Facebook", content: "Post before/after carousel in 2 groups", type: "📘" },
  { day: 9, platform: "DMs", content: "Message 5 teacher friends with demo link", type: "✉️" },
  { day: 10, platform: "TikTok", content: "Ep 5: TC 1.2 star rating (20s comparison)", type: "🎬" },
  { day: 10, platform: "Instagram", content: "QuickBooks quote card", type: "📸" },
  { day: 11, platform: "Email", content: "Send 5 cold emails to principals (AMS directory)", type: "📧" },
  { day: 12, platform: "TikTok", content: "Ep 6: QuickBooks analogy (30s)", type: "🎬" },
  { day: 12, platform: "Instagram", content: "Parent Report preview card", type: "📸" },
  { day: 12, platform: "小红书", content: "Parent report card + Chinese caption", type: "📕" },
  { day: 13, platform: "Facebook", content: "Share founder story in international teachers group", type: "📘" },
  { day: 14, platform: "ALL", content: "REST — reply to everything. DM warm leads.", type: "💬" },
  { day: 15, platform: "TikTok", content: "Ep 7: Teacher who coded during naptime (45s)", type: "🎬" },
  { day: 15, platform: "Instagram", content: "Share Ep 7 as Reel", type: "📸" },
  { day: 16, platform: "Facebook", content: "Post stat image + ask 'how many hours do YOU spend?'", type: "📘" },
  { day: 16, platform: "WeChat", content: "Share pilot school early results", type: "💬" },
  { day: 17, platform: "TikTok", content: "Ep 8: Parent POV (20s)", type: "🎬" },
  { day: 17, platform: "Email", content: "Follow up on cold emails + send 5 new ones", type: "📧" },
  { day: 18, platform: "TikTok", content: "Ep 9: Tutorial — how I track 24 children (30s)", type: "🎬" },
  { day: 18, platform: "Instagram", content: "'5 Signs' carousel", type: "📸" },
  { day: 19, platform: "Facebook", content: "Post tutorial video in 3 groups", type: "📘" },
  { day: 19, platform: "小红书", content: "Dashboard walkthrough screenshots", type: "📕" },
  { day: 20, platform: "TikTok", content: "Reply-to-comment video (pick best comment)", type: "🎬" },
  { day: 21, platform: "ALL", content: "REST — review analytics. What worked? Double down.", type: "📊" },
  { day: 22, platform: "TikTok", content: "Ep 10: The Mission — South Africa story (60s)", type: "🎬" },
  { day: 22, platform: "Instagram", content: "Share Ep 10 as Reel", type: "📸" },
  { day: 23, platform: "Facebook", content: "Share mission story + pilot update", type: "📘" },
  { day: 23, platform: "WeChat", content: "Mission article in Chinese", type: "💬" },
  { day: 24, platform: "TikTok", content: "BTS: Show yourself updating Montree code at night", type: "🎬" },
  { day: 25, platform: "Instagram", content: "Carousel: 'What Montree teachers are saying' (testimonials)", type: "📸" },
  { day: 25, platform: "Email", content: "Send case study to 10 new principals", type: "📧" },
  { day: 26, platform: "TikTok", content: "Duet/stitch: React to other teacher complaint videos", type: "🎬" },
  { day: 27, platform: "Facebook", content: "Live Q&A in Montessori group: 'Ask me about Montree'", type: "📘" },
  { day: 28, platform: "ALL", content: "REST — compile analytics. Prepare Month 2 strategy.", type: "📊" },
  { day: 29, platform: "TikTok", content: "Month 1 recap: progress, feedback, what's next", type: "🎬" },
  { day: 29, platform: "Instagram", content: "Infographic: Month 1 in numbers", type: "📸" },
  { day: 30, platform: "ALL", content: "🎯 REVIEW: followers, pilot signups, emails sent, content that hit", type: "📊" },
];

// ============================================
// COPY BUTTON
// ============================================
function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
      style={{
        background: copied ? "rgba(46,204,113,0.2)" : "rgba(46,204,113,0.08)",
        border: `1px solid ${copied ? "rgba(46,204,113,0.4)" : "rgba(46,204,113,0.15)"}`,
        color: copied ? "#2ecc71" : "#8aaa9a",
      }}
    >
      {copied ? "✓ Copied" : label || "📋 Copy"}
    </button>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function PlatformHub() {
  const [tab, setTab] = useState("tiktok");
  const [selectedScript, setSelectedScript] = useState(0);
  const [selectedCarousel, setSelectedCarousel] = useState(0);

  const TABS = [
    { id: "tiktok", label: "🎵 TikTok Scripts", count: 10 },
    { id: "instagram", label: "📸 IG Carousels", count: 3 },
    { id: "facebook", label: "📘 FB Groups", count: 7 },
    { id: "bios", label: "✏️ Bios & Tags" },
    { id: "schedule", label: "📅 30-Day Plan", count: 30 },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0a0f0d", color: "#c8e0d0", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-4 border-b border-slate-700"><Link href="/montree/super-admin/marketing" className="text-emerald-400 hover:text-emerald-300 text-sm">← Back to Marketing Hub</Link></div>
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">🚀</span>
          <h1 className="text-lg font-bold" style={{ color: "#e8f5e9" }}>Montree Platform War Room</h1>
        </div>
        <p className="text-xs" style={{ color: "#5a7a6a" }}>
          TikTok scripts, IG carousels, FB group strategy, bios, hashtags, and 30-day posting schedule.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-3 text-xs font-medium whitespace-nowrap transition-all"
            style={{
              color: tab === t.id ? "#2ecc71" : "#5a7a6a",
              borderBottom: tab === t.id ? "2px solid #2ecc71" : "2px solid transparent",
              background: tab === t.id ? "rgba(46,204,113,0.04)" : "transparent",
            }}
          >
            {t.label} {t.count && <span className="opacity-50">({t.count})</span>}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* TIKTOK */}
        {tab === "tiktok" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-2">
              <div className="text-xs mb-3" style={{ color: "#5a7a6a" }}>
                10-episode series. Film 1 per day. Each script includes hook, beats, duration, hashtags, and production notes.
              </div>
              {TIKTOK_SCRIPTS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedScript(i)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all"
                  style={{
                    background: selectedScript === i ? "rgba(255,0,80,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedScript === i ? "rgba(255,0,80,0.2)" : "rgba(255,255,255,0.04)"}`,
                    color: selectedScript === i ? "#ff6090" : "#8aaa9a",
                  }}
                >
                  <span className="font-semibold">Ep {s.episode}:</span> {s.title}
                  <div className="text-xs opacity-50 mt-0.5">{s.series} · {s.duration}</div>
                </button>
              ))}
            </div>
            <div className="lg:col-span-2">
              {(() => {
                const s = TIKTOK_SCRIPTS[selectedScript];
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm" style={{ color: "#e8f5e9" }}>
                        Episode {s.episode}: {s.title}
                      </h3>
                      <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(255,0,80,0.1)", color: "#ff0050" }}>
                          {s.duration}
                        </span>
                        <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#8aaa9a" }}>
                          {s.format}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl p-4" style={{ background: "rgba(255,0,80,0.04)", border: "1px solid rgba(255,0,80,0.1)" }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: "#ff6090" }}>🎣 HOOK (first 2 seconds)</div>
                      <div className="text-sm font-semibold" style={{ color: "#e8f5e9" }}>{s.hook}</div>
                    </div>

                    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold" style={{ color: "#5a7a6a" }}>FULL SCRIPT</span>
                        <CopyBtn text={s.script} />
                      </div>
                      <pre className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: "#b8d0c0", fontFamily: "'DM Sans', sans-serif" }}>
                        {s.script}
                      </pre>
                    </div>

                    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold" style={{ color: "#5a7a6a" }}>HASHTAGS</span>
                        <CopyBtn text={s.hashtags} />
                      </div>
                      <div className="text-xs" style={{ color: "#8aaa9a" }}>{s.hashtags}</div>
                    </div>

                    <div className="rounded-xl p-4" style={{ background: "rgba(46,204,113,0.04)", border: "1px solid rgba(46,204,113,0.1)" }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: "#2ecc71" }}>💡 PRODUCTION NOTES</div>
                      <div className="text-xs" style={{ color: "#8aaa9a", lineHeight: 1.8 }}>{s.notes}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* INSTAGRAM */}
        {tab === "instagram" && (
          <div className="space-y-6">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              3 carousel templates. Each slide has text + suggested visual. Create in Canva or screenshot the social cards from Content Factory.
            </div>
            <div className="flex gap-2 mb-4">
              {IG_CAROUSELS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCarousel(i)}
                  className="px-4 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: selectedCarousel === i ? "rgba(228,64,95,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedCarousel === i ? "rgba(228,64,95,0.2)" : "rgba(255,255,255,0.04)"}`,
                    color: selectedCarousel === i ? "#E4405F" : "#8aaa9a",
                  }}
                >
                  {c.title}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {IG_CAROUSELS[selectedCarousel].slides.map((slide, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 flex flex-col justify-between"
                  style={{
                    aspectRatio: "1/1",
                    background: slide.bg === "sepia" ? "linear-gradient(135deg, #1a1408, #2a1f0a)"
                      : slide.bg === "dark-red" ? "linear-gradient(135deg, #1a0808, #2a0f0f)"
                      : slide.bg === "dark" ? "linear-gradient(135deg, #0a0a0a, #1a1a1a)"
                      : slide.bg === "green" ? "linear-gradient(135deg, #0d1f17, #0a1610)"
                      : slide.bg === "green-dark" ? "linear-gradient(135deg, #061510, #0a1f17)"
                      : "linear-gradient(135deg, #1a1408, #0d1f17)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="text-xs opacity-40 mb-2">Slide {i + 1}</div>
                  <div className="text-xs font-semibold leading-relaxed" style={{ color: "#e8f5e9", whiteSpace: "pre-line" }}>
                    {slide.text}
                  </div>
                  {slide.subtext && (
                    <div className="text-xs mt-2 opacity-50">{slide.subtext}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FACEBOOK */}
        {tab === "facebook" && (
          <div className="space-y-4">
            <div className="text-xs mb-2" style={{ color: "#5a7a6a" }}>
              Target groups with 10k+ members. Rule: give value for 3 days before posting anything about Montree. Comment on others' posts first. Never spam.
            </div>
            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(24,119,242,0.04)", border: "1px solid rgba(24,119,242,0.1)" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "#1877F2" }}>⚠️ THE GOLDEN RULE</div>
              <div className="text-xs" style={{ color: "#8aaa9a" }}>
                Join group → Comment helpfully for 3 days → THEN post your content.
                Groups ban people who join and immediately promote. Be a teacher first, founder second.
                Answer questions. Share tips. THEN casually mention "I built a tool that helps with this..."
              </div>
            </div>
            {FB_GROUPS.map((g, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#e8f5e9" }}>{g.name}</div>
                    <div className="text-xs" style={{ color: "#5a7a6a" }}>{g.members} members</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(24,119,242,0.1)", color: "#1877F2" }}>
                    Target
                  </span>
                </div>
                <div className="text-xs" style={{ color: "#a8c8b8", lineHeight: 1.7 }}>{g.strategy}</div>
              </div>
            ))}
          </div>
        )}

        {/* BIOS & TAGS */}
        {tab === "bios" && (
          <div className="space-y-6">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              Optimized bios for each platform + hashtag banks. Copy and paste directly.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(PLATFORM_BIOS).map((p) => (
                <div key={p.name} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span>{p.emoji}</span>
                      <span className="text-sm font-semibold" style={{ color: "#e8f5e9" }}>{p.name}</span>
                    </div>
                    <CopyBtn text={p.bio} label="Copy Bio" />
                  </div>
                  <div className="text-xs mb-2" style={{ color: p.color, fontWeight: 600 }}>{p.handle}</div>
                  <pre className="text-xs whitespace-pre-wrap" style={{ color: "#a8c8b8", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}>
                    {p.bio}
                  </pre>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold mt-6" style={{ color: "#e8f5e9" }}>Hashtag Banks</h3>
            {Object.entries(HASHTAG_BANKS).map(([platform, groups]) => (
              <div key={platform} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="text-xs font-semibold mb-3" style={{ color: "#e8f5e9", textTransform: "capitalize" }}>
                  {platform === "xiaohongshu" ? "小红书" : platform}
                </div>
                {Object.entries(groups).map(([group, tags]) => (
                  <div key={group} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs capitalize" style={{ color: "#5a7a6a" }}>{group}</span>
                      <CopyBtn text={tags.join(" ")} label="Copy" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded" style={{
                          background: "rgba(46,204,113,0.06)",
                          color: "#8aaa9a",
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 30-DAY SCHEDULE */}
        {tab === "schedule" && (
          <div>
            <div className="text-xs mb-4" style={{ color: "#5a7a6a" }}>
              30 days. ~30 min/day. Every post planned. Rest days built in for engagement. Weeks 1-2 build awareness, Weeks 3-4 build proof.
            </div>
            <div className="grid grid-cols-1 gap-1">
              {SCHEDULE.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs"
                  style={{
                    background: item.type === "📊" ? "rgba(46,204,113,0.04)" : "rgba(255,255,255,0.015)",
                    borderLeft: item.type === "📊" ? "3px solid #2ecc71" : "3px solid transparent",
                  }}
                >
                  <span className="font-bold" style={{ color: "#5a7a6a", width: 40, flexShrink: 0 }}>
                    D{item.day}
                  </span>
                  <span style={{ width: 20, textAlign: "center" }}>{item.type}</span>
                  <span className="px-2 py-0.5 rounded font-semibold" style={{
                    background: `${PLATFORM_COLORS[item.platform] || "#666"}18`,
                    color: PLATFORM_COLORS[item.platform] || "#888",
                    minWidth: 72, textAlign: "center", flexShrink: 0,
                  }}>
                    {item.platform}
                  </span>
                  <span style={{ color: "#b8d0c0" }}>{item.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
