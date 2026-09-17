// lib/montree/feedback/strings.ts
//
// The module's own EN / 简体中文 dictionary.
//
// Self-contained on purpose: lib/montree/i18n is keyed to a SCHOOL's locale
// setting, and this board is read logged-out by people who have no school. The
// language lives in a plain `fb_lang` cookie — not localStorage, because the
// WeChat WKWebView wipes storage between sessions and the toggle would forget
// itself every time a parent came back.

import type { Lang } from './types';

export type StringKey = keyof typeof EN;

const EN = {
  boardTitle: 'Montree product board',
  boardIntro: 'Tell us what is broken, what you wish existed, or just ask. Everything here is read by the team.',
  feedback: 'Feedback',
  changelog: 'Changelog',
  write: 'Write',
  writeSomething: 'Write something',
  search: 'Search the board',
  searchPlaceholder: 'Search posts — e.g. photo upload, Chinese summary',
  statusAll: 'Status: All',
  all: 'All',
  sortTrending: 'Trending',
  sortNew: 'New',
  sortTop: 'Top',
  sortUnanswered: 'Unanswered',
  allPosts: 'All posts',
  comments: 'comments',
  comment: 'Comment',
  commentsHint: 'Oldest first · replies quote, they do not nest',
  addComment: 'Add a comment',
  commentPlaceholder: 'Keep it kind. Initials, not names.',
  reply: 'Reply',
  quoteReply: 'Quote reply',
  meToo: 'Me too',
  vote: 'Vote',
  voted: 'Voted',
  subscribe: 'Follow',
  subscribed: 'Subscribed',
  flag: 'Flag',
  flagged: 'Reported',
  needsAnswer: 'Needs an answer',
  noTeamReply: 'No team reply',
  teamReplied: 'Team replied',
  officialReply: 'Montree team',
  pinnedReply: 'pinned reply',
  markedAnswer: 'Marked as the answer',
  markAnswer: 'Mark as the answer',
  author: 'author',
  history: 'History',
  posted: 'posted',
  whoHears: 'Who hears about this',
  whoHearsBody:
    'The author, everyone who voted and everyone who commented are subscribed. They get one email on an official reply or a status change.',
  aboutBoard: 'About this board',
  aboutBoardBody:
    'Parents, teachers and guides share what they hit in Montree. We read everything and answer in public.',
  initialsNudge: "Please use your child's initials, never their name.",
  statusKey: 'Status key',

  // Compose
  step1Title: '1 · Give it a title',
  step1Hint: 'One plain sentence. We search as you type.',
  dupHeading: 'Is it one of these?',
  dupBody: 'Voting on an existing post helps more than a new one.',
  step2Title: '2 · What kind of post is it?',
  step3Problem: '3 · Tell us what happened',
  step3Other: '3 · Say a little more',
  step4Identity: '4 · Who you are',
  whatHappened: 'What happened',
  whatExpected: 'What you expected',
  whereHappened: 'Where it happened',
  wherePrefilled: 'Page and device were filled in for you — edit if they are wrong.',
  details: 'Details',
  whyItMatters: 'Why it matters (optional)',
  addScreenshot: 'Add a screenshot',
  removeScreenshot: 'Remove screenshot',
  yourName: 'Your name',
  yourEmail: 'Your email',
  emailNeverShown: 'Your email is never shown — we only use it to tell you about replies.',
  postingAs: 'Posting as',
  signedIn: 'Signed in · we will email you when someone replies',
  postingAsGuest: 'Posting as a guest.',
  postIt: 'Post it',
  cancel: 'Cancel',
  close: 'Close',
  posting: 'Posting…',

  typeProblem: 'Problem',
  typeProblemHint: 'Something is broken or behaves wrongly.',
  typeIdea: 'Idea',
  typeIdeaHint: 'Something you wish Montree could do.',
  typeQuestion: 'Question',
  typeQuestionHint: 'You need an answer, not a change.',
  typeDiscussion: 'Discussion',
  typeDiscussionHint: 'Open talk with other parents and guides.',

  // Empty state
  emptyTitle: 'Nothing here yet — be the first to say something',
  emptyBody:
    'Report a problem, suggest an idea, ask a question, or start a conversation with other families.',
  emptyCta: 'Write the first post',
  emptyFoot: "No account needed. Please use your child's initials, not their name.",
  noResults: 'Nothing matches that search',
  noResultsBody: 'Try a shorter phrase, or write a new post.',

  // Changelog
  changelogTitle: 'You asked, we built',
  changelogIntro:
    'Everything that shipped or got fixed, newest first. Each line links back to the post it came from.',
  changelogEmpty: 'Nothing has shipped yet. The first one will appear here.',

  // Admin
  adminQueue: 'Queue',
  adminUnansweredFirst: 'Unanswered first',
  adminFlaggedOnly: 'Flagged only',
  adminTypeAll: 'Type: All',
  adminStatus: 'Status',
  merge: 'Merge',
  mergeTitle: 'Merge two posts',
  mergeBody:
    'The duplicate closes and redirects here. Votes and subscribers move across; nobody gets a second email.',
  mergeDuplicate: 'Duplicate — will close',
  mergeSurvivor: 'Survivor — keeps everything',
  mergeConfirm: 'Merge posts',
  hide: 'Hide',
  restore: 'Restore',
  review: 'Review',
  autoHidden: 'auto-hidden',
  votes: 'votes',
  subscribers: 'subscribers',

  // Flags
  flagTitle: 'Report this',
  flagSpam: 'Spam',
  flagRude: 'Rude or unkind',
  flagPrivateInfo: 'Private information',
  flagOther: 'Something else',

  // System
  toastPosted: "Posted. We'll email you when someone replies.",
  toastVoted: 'Counted.',
  toastSubscribed: "You'll get an email on replies and status changes.",
  toastUnsubscribed: 'You will not hear about this one again.',
  boardNotReady: 'The board is not set up yet',
  boardNotReadyBody:
    'The feedback tables have not been created on this database. Run the migration and this page fills itself in.',
  errorGeneric: 'Something went wrong. Please try again.',
  rateLimited: 'That is a lot of posting. Please try again in a little while.',
  loading: 'Loading…',
} as const;

const ZH: Record<StringKey, string> = {
  boardTitle: 'Montree 产品反馈板',
  boardIntro: '告诉我们哪里出了问题、你希望有什么功能，或者直接提问。这里的每一条我们都会看。',
  feedback: '反馈板',
  changelog: '更新日志',
  write: '我要说',
  writeSomething: '写点什么',
  search: '搜索反馈',
  searchPlaceholder: '搜索反馈 —— 例如：照片上传、中文小结',
  statusAll: '状态：全部',
  all: '全部',
  sortTrending: '热门',
  sortNew: '最新',
  sortTop: '最多支持',
  sortUnanswered: '待回复',
  allPosts: '返回列表',
  comments: '条评论',
  comment: '发表评论',
  commentsHint: '按时间顺序 · 回复以引用呈现，不嵌套',
  addComment: '写评论',
  commentPlaceholder: '请友善发言。只写姓名缩写，不写全名。',
  reply: '回复',
  quoteReply: '引用回复',
  meToo: '我也遇到了',
  vote: '支持',
  voted: '已支持',
  subscribe: '关注',
  subscribed: '已关注',
  flag: '举报',
  flagged: '已举报',
  needsAnswer: '还没有人回答',
  noTeamReply: '还没有人跟进',
  teamReplied: '团队已回复',
  officialReply: 'Montree 团队',
  pinnedReply: '置顶回复',
  markedAnswer: '已被采纳为答案',
  markAnswer: '采纳为答案',
  author: '发帖人',
  history: '状态记录',
  posted: '发布',
  whoHears: '谁会收到通知',
  whoHearsBody: '发帖人、支持过和评论过的人都已关注。团队回复或状态变化时，他们各收到一封邮件。',
  aboutBoard: '关于这个反馈板',
  aboutBoardBody: '家长、老师和引导员在这里分享使用 Montree 时遇到的情况。我们会公开回复。',
  initialsNudge: '请只写孩子的姓名缩写，不要写全名。',
  statusKey: '状态说明',

  step1Title: '1 · 起个标题',
  step1Hint: '一句话说清楚。输入时我们会同步搜索。',
  dupHeading: '是不是这几条之一？',
  dupBody: '给已有的帖子投一票，比新开一条更有用。',
  step2Title: '2 · 这是哪一类？',
  step3Problem: '3 · 说说发生了什么',
  step3Other: '3 · 再多说一点',
  step4Identity: '4 · 你是谁',
  whatHappened: '发生了什么',
  whatExpected: '你期待的结果',
  whereHappened: '在哪里发生的',
  wherePrefilled: '页面和设备已自动填写 —— 不对可以改。',
  details: '详细说明',
  whyItMatters: '为什么重要（选填）',
  addScreenshot: '添加截图',
  removeScreenshot: '移除截图',
  yourName: '你的称呼',
  yourEmail: '你的邮箱',
  emailNeverShown: '邮箱不会公开 —— 只用来通知你有人回复。',
  postingAs: '以此身份发布',
  signedIn: '已登录 · 有人回复时我们会发邮件给你',
  postingAsGuest: '以访客身份发布。',
  postIt: '发布',
  cancel: '取消',
  close: '关闭',
  posting: '发布中…',

  typeProblem: '问题',
  typeProblemHint: '有功能坏了或行为不对。',
  typeIdea: '建议',
  typeIdeaHint: '你希望 Montree 能做到的事。',
  typeQuestion: '提问',
  typeQuestionHint: '你需要一个答案，而不是改动。',
  typeDiscussion: '讨论',
  typeDiscussionHint: '和其他家长、引导员聊聊。',

  emptyTitle: '这里还空着 —— 来做第一个说话的人',
  emptyBody: '报告问题、提出建议、提个问题，或者和其他家庭聊聊。',
  emptyCta: '写第一条',
  emptyFoot: '不需要注册。请只写孩子的姓名缩写。',
  noResults: '没有匹配的内容',
  noResultsBody: '换个更短的词试试，或者直接发一条新的。',

  changelogTitle: '你提的，我们做了',
  changelogIntro: '已上线和已修复的内容，最新在前。每一条都可以点回原帖。',
  changelogEmpty: '还没有上线的条目。第一条会出现在这里。',

  adminQueue: '待办队列',
  adminUnansweredFirst: '未回复优先',
  adminFlaggedOnly: '仅看被举报',
  adminTypeAll: '类型：全部',
  adminStatus: '状态',
  merge: '合并',
  mergeTitle: '合并两条帖子',
  mergeBody: '重复的那条会关闭并跳转到这里。支持数和关注者一并转移；没有人会收到第二封邮件。',
  mergeDuplicate: '重复项 —— 将被关闭',
  mergeSurvivor: '保留项 —— 承接全部',
  mergeConfirm: '确认合并',
  hide: '隐藏',
  restore: '恢复',
  review: '查看',
  autoHidden: '已自动隐藏',
  votes: '支持',
  subscribers: '关注者',

  flagTitle: '举报这条',
  flagSpam: '垃圾信息',
  flagRude: '不友善',
  flagPrivateInfo: '涉及隐私信息',
  flagOther: '其他',

  toastPosted: '已发布。有人回复时我们会发邮件给你。',
  toastVoted: '已记录。',
  toastSubscribed: '有回复或状态变化时会邮件通知你。',
  toastUnsubscribed: '不会再收到这条的通知。',
  boardNotReady: '反馈板尚未初始化',
  boardNotReadyBody: '这个数据库还没有创建反馈板的数据表。执行迁移后本页会自动填充。',
  errorGeneric: '出了点问题，请再试一次。',
  rateLimited: '发得有点快，请稍后再试。',
  loading: '加载中…',
};

const DICTS: Record<Lang, Record<StringKey, string>> = { en: EN, zh: ZH };

/** A bound translator. `t('write')` — missing keys fall back to English. */
export function makeT(lang: Lang) {
  const dict = DICTS[lang] ?? EN;
  return function t(key: StringKey): string {
    return dict[key] ?? EN[key] ?? String(key);
  };
}

export type T = ReturnType<typeof makeT>;

export { EN as EN_STRINGS, ZH as ZH_STRINGS };

/** Relative time, localised, with no Intl.RelativeTimeFormat dependency. */
export function timeAgo(iso: string, lang: Lang, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const s = Math.max(0, Math.floor((now - then) / 1000));
  const zh = lang === 'zh';
  if (s < 60) return zh ? '刚刚' : 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return zh ? `${m} 分钟前` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return zh ? `${h} 小时前` : `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return zh ? `${d} 天前` : `${d}d`;
  const w = Math.floor(d / 7);
  if (d < 30) return zh ? `${w} 周前` : `${w}w`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return zh ? `${mo} 个月前` : `${mo}mo`;
  return zh ? `${Math.floor(mo / 12)} 年前` : `${Math.floor(mo / 12)}y`;
}

/** "12 Sep" / "9月12日" — for changelog lines. */
export function shortDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(d);
}

/** "September 2026" / "2026年9月" — changelog month headings. */
export function monthHeading(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(d);
}
