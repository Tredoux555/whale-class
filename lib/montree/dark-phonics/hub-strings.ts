// lib/montree/dark-phonics/hub-strings.ts
//
// Every word of hub chrome, in English and Chinese, in one flat map.
//
// Deliberately NOT lib/montree/i18n: that bundle is the school product's, it is
// loaded through a React context the hub does not mount, and it carries eleven
// locales this page has no copy for. The hub is two languages and forty
// strings, so it gets its own table and the same `fb_lang` cookie the feedback
// board already taught people to toggle.
//
// Pure module — safe to import from a server component or a client island.

export type HubLang = 'en' | 'zh';

export const HUB_LANG_COOKIE = 'fb_lang';

export function isHubLang(v: unknown): v is HubLang {
  return v === 'en' || v === 'zh';
}

type Strings = Record<string, string>;

const EN: Strings = {
  'brand': 'Dark Phonics',
  'brand.sub': 'by Montree',

  'tab.play': 'Play',
  'tab.classroom': 'Classroom',
  'tab.community': 'Community',
  'tabs.label': 'Dark Phonics sections',

  'lang.label': 'Language',
  'lang.en': 'EN',
  'lang.zh': '中',

  'hero.title': 'Phonics your child can touch.',
  'hero.sub': '21 little books. Tap, match, build, trace. Free to start — no signup.',
  'hero.play': 'Play lesson 1',
  'hero.print': 'Print the classroom set',
  'hero.videoLabel': 'Dark Phonics — what a lesson looks like',
  'hero.coverAlt': 'Cover of a Dark Phonics little book',

  'play.free': 'Free',
  'play.locked': 'Locked',
  'play.backToHub': 'Back to Dark Phonics',
  'play.openLesson': 'Open lesson',

  'classroom.intro': 'Every printable for every sound — letter card, book, tracing workbook and the four paper works.',

  'community.title': 'Dark Phonics community',
  'community.empty': 'Ask, suggest, show what your class did.',

  'lead.title': 'New books land every few weeks — get them first.',
  'lead.email': 'Your email',
  'lead.emailPlaceholder': 'you@school.org',
  'lead.role': 'I am a…',
  'lead.roleTeacher': 'Teacher',
  'lead.roleParent': 'Parent',
  'lead.submit': 'Keep me posted',
  'lead.sending': 'Sending…',
  'lead.thanks': 'Thank you — check your inbox.',
  'lead.error': 'That did not go through. Try again in a moment.',
  'lead.dismiss': 'Not now',
  'lead.dismissLabel': 'Dismiss the mailing-list strip',

  'share.title': 'We finished',
  'share.body': 'Send it to somebody who would like it.',
  'share.share': 'Share',
  'share.copy': 'Copy link',
  'share.copied': 'Link copied',
  'share.wechat': 'In WeChat: long-press the link to share it.',
  'share.close': 'Back to the lessons',

  'paywall.title': 'This lesson is part of the full set.',
  'paywall.body': 'Lessons 1–3 are free forever. Unlock everything — $5/month or $30/year.',
  'paywall.cta': 'Unlock everything',
  'paywall.signIn': 'Sign in first',

  'account.title': "Teachers' Room account",
  'account.sub': 'One account for Dark Phonics and the Montree community.',
  'account.signIn': 'Sign in',
  'account.signUp': 'Create an account',
  'account.forgot': 'Forgot your password',
  'account.name': 'Your name',
  'account.email': 'Email',
  'account.password': 'Password',
  'account.submitLogin': 'Sign in',
  'account.submitSignup': 'Create account',
  'account.submitForgot': 'Send reset link',
  'account.working': 'Working…',
  'account.backToHub': 'Back to Dark Phonics',
  'account.signedIn': 'You are signed in.',
  'account.signOut': 'Sign out',
  'account.forgotSent': 'If that address has an account, a reset link is on its way.',
  'account.signupSent': 'Check your email to confirm the account.',

  'skip': 'Skip to the lesson shelf',
};

const ZH: Strings = {
  'brand': 'Dark Phonics 拼读',
  'brand.sub': 'Montree 出品',

  'tab.play': '玩',
  'tab.classroom': '教室材料',
  'tab.community': '社区',
  'tabs.label': 'Dark Phonics 分区',

  'lang.label': '语言',
  'lang.en': 'EN',
  'lang.zh': '中',

  'hero.title': '可以用手去摸的拼读课。',
  'hero.sub': '21 本小书。点一点、配一配、拼一拼、描一描。免费开始，无需注册。',
  'hero.play': '开始第 1 课',
  'hero.print': '打印教室材料',
  'hero.videoLabel': 'Dark Phonics — 一节课是什么样子',
  'hero.coverAlt': 'Dark Phonics 小书封面',

  'play.free': '免费',
  'play.locked': '未解锁',
  'play.backToHub': '返回 Dark Phonics',
  'play.openLesson': '打开课程',

  'classroom.intro': '每个音的全部可打印材料 — 字母卡、小书、描写本，以及四份纸面操作。',

  'community.title': 'Dark Phonics 社区',
  'community.empty': '提问、建议，或者晒一晒你班上的成果。',

  'lead.title': '每隔几周就有新书 — 第一时间收到。',
  'lead.email': '你的邮箱',
  'lead.emailPlaceholder': 'you@school.org',
  'lead.role': '我是…',
  'lead.roleTeacher': '老师',
  'lead.roleParent': '家长',
  'lead.submit': '通知我',
  'lead.sending': '发送中…',
  'lead.thanks': '谢谢 — 请查收邮件。',
  'lead.error': '没能提交，请稍后再试。',
  'lead.dismiss': '暂不',
  'lead.dismissLabel': '关闭订阅条',

  'share.title': '我们读完了',
  'share.body': '分享给会喜欢它的人。',
  'share.share': '分享',
  'share.copy': '复制链接',
  'share.copied': '链接已复制',
  'share.wechat': '在微信里：长按链接即可分享。',
  'share.close': '返回课程列表',

  'paywall.title': '这一课属于完整版。',
  'paywall.body': '第 1–3 课永久免费。解锁全部内容 — 每月 $5 或每年 $30。',
  'paywall.cta': '解锁全部内容',
  'paywall.signIn': '请先登录',

  'account.title': '教师室账户',
  'account.sub': '一个账户，通用于 Dark Phonics 和 Montree 社区。',
  'account.signIn': '登录',
  'account.signUp': '注册',
  'account.forgot': '忘记密码',
  'account.name': '你的名字',
  'account.email': '邮箱',
  'account.password': '密码',
  'account.submitLogin': '登录',
  'account.submitSignup': '创建账户',
  'account.submitForgot': '发送重置链接',
  'account.working': '处理中…',
  'account.backToHub': '返回 Dark Phonics',
  'account.signedIn': '你已登录。',
  'account.signOut': '退出',
  'account.forgotSent': '如果该邮箱已注册，重置链接已发出。',
  'account.signupSent': '请查收邮件以确认账户。',

  'skip': '跳到课程书架',
};

const TABLES: Record<HubLang, Strings> = { en: EN, zh: ZH };

/**
 * A translator for one language. Falls back to English, then to the key itself
 * — a missing string shows its key in development and never crashes a render.
 */
export function makeHubT(lang: HubLang): (key: string) => string {
  const table = TABLES[lang] ?? EN;
  return (key: string) => table[key] ?? EN[key] ?? key;
}

/** Exposed so a test can assert the two tables have not drifted apart. */
export const HUB_STRING_KEYS = Object.keys(EN);
export { EN as HUB_EN, ZH as HUB_ZH };
