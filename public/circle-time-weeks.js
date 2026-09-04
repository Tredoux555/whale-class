/*! Whale Class Circle Time — week manifest + tab-strip renderer.
 *  ONE registration point for every week of the year.
 *
 *  Served at /circle-time-weeks.js (needs a middleware.ts publicPaths entry —
 *  ".js" is NOT in the matcher's static-extension exclusion list).
 *
 *  To ship a new week you edit exactly one entry below: set built:true and give
 *  it its route. Nothing else on any page has to change. See
 *  docs/circle-time/WEEK_BUILD_SPEC.md §6.
 *
 *  WEEK NUMBERING (locked by Tredoux, 2026-09-03): these are SITE weeks —
 *  taught weeks counted from Sep 1 2026. Week 1 = I'm Special (Sep 1–5) …
 *  Week 36 = Graduation (Jun 14–18). 36 taught weeks in all.
 *  The single authority on which week is which — number, theme, dates, day
 *  count, Dark Phonics lesson — is docs/circle-time/YEAR_CALENDAR_2026-27.md.
 *  Where this file and that table disagree, THAT TABLE WINS. There is no
 *  constant offset to the principal's printed sheet any more (the old
 *  "sheet = site + 2" rule is DEAD — the printed plan merges two weeks, drops
 *  three and adds four); the calendar file's Sheet column is the only map.
 *
 *  Each page carries <div id="week-tabs" data-week="N"></div> + this script.
 *  The strip markup is PRE-RENDERED into every page by
 *  scripts/circle-time/render_tabs.py (so it is on screen at first paint, no
 *  flicker); this script then only highlights + scrolls it. If a page has no
 *  pre-rendered strip, this script renders it client-side as before.
 *  Re-run render_tabs.py after ANY edit to the manifest below.
 *
 *  public/circle-time.html is a COPY of whichever week is live — its data-week
 *  must be the copied week's number, and LIVE_WEEK below must agree.
 */
(function () {
  'use strict';

  /* Which week number is currently served at /teachers (public/circle-time.html).
     Bump this in the Sunday swap step. */
  var LIVE_WEEK = 1;

  /* ------------------------------------------------------------------ *
   * THE MANIFEST — one row per taught week, site numbering 1–36.
   *
   * n      site week number (taught weeks counted from Sep 1 2026)
   * short  tab label after "W<n> · " — keep it ~2 words
   * full   full theme title, shown in the tab's tooltip
   * dates  human date range as printed on the page / in the year calendar
   * mon/fri ISO first + last teaching day
   * route  the STABLE clean URL for this week's page (null when unbuilt)
   * built  true = solid clickable tab; false = ghost tab, no link
   * note   optional holiday marker, appended to the tab's tooltip
   *
   * Holiday gaps are date jumps between consecutive rows, flagged with `note`
   * on the week they touch: 中秋 (w4), 国庆 Oct 1–7 (INSIDE w5, which is a
   * five-day week split across the break: Sep 28–30 + Oct 8–9), the winter
   * holiday (after w15), 春节 Feb 8–26 (after w20), 清明 (after w25) and
   * Labour Day May 1–5 (after w29).
   *
   * Three weeks are deliberately not five days: w4 and w26 are four-day weeks
   * and w30 is a TWO-day week (Labour Day). Weeks 1 and 2 print "Sep 1–5" and
   * "Sep 8–12" on their live pages — those two date strings are locked and
   * must not be corrected here or there.
   * ------------------------------------------------------------------ */
  var WEEKS = [
    { n: 1,     short: "I'm Special",      full: "I Am Special! I Like Myself",             dates: "Sep 1–5",          mon: "2026-09-01", fri: "2026-09-05", route: "/teachers-week1", built: true },
    { n: 2,     short: "My Body",          full: "My Body! From Head to Toe",               dates: "Sep 8–12",         mon: "2026-09-08", fri: "2026-09-12", route: "/teachers-next", built: true },
    { n: 3,     short: "5 Senses",         full: "My 5 Senses",                             dates: "Sep 14–18",        mon: "2026-09-14", fri: "2026-09-18", route: "/teachers-w3", built: true },
    { n: 4,     short: "My Feeling",       full: "My Feeling (four-day week)",              dates: "Sep 21–24",        mon: "2026-09-21", fri: "2026-09-24", route: "/teachers-w4", built: true, note: "中秋节 Fri 25 Sep" },
    { n: 5,     short: "Autumn 1",         full: "Autumn (1) — split by 国庆 Oct 1–7",        dates: "Sep 28–Oct 9",     mon: "2026-09-28", fri: "2026-10-09", route: "/teachers-w5", built: true, note: "国庆节 holiday Oct 1–7 falls INSIDE this week" },
    { n: 6,     short: "Autumn 2",         full: "Autumn (2)",                              dates: "Oct 12–16",        mon: "2026-10-12", fri: "2026-10-16", route: "/teachers-w6", built: true },
    { n: 7,     short: "Food Groups",      full: "Five Food Groups",                        dates: "Oct 19–23",        mon: "2026-10-19", fri: "2026-10-23", route: "/teachers-w7", built: true },
    { n: 8,     short: "Healthy Food",     full: "Healthy Food & Healthy Habits",           dates: "Oct 26–30",        mon: "2026-10-26", fri: "2026-10-30", route: "/teachers-w8", built: true },
    { n: 9,     short: "Family",           full: "Family Members",                          dates: "Nov 2–6",          mon: "2026-11-02", fri: "2026-11-06", route: "/teachers-w9", built: true },
    { n: 10,    short: "My House",         full: "My House",                                dates: "Nov 9–13",         mon: "2026-11-09", fri: "2026-11-13", route: "/teachers-w10", built: true },
    { n: 11,    short: "Plants",           full: "The Cycle of Plants",                     dates: "Nov 16–20",        mon: "2026-11-16", fri: "2026-11-20", route: "/teachers-w11", built: true },
    { n: 12,    short: "Thanksgiving",     full: "Thanksgiving Day",                        dates: "Nov 23–27",        mon: "2026-11-23", fri: "2026-11-27", route: "/teachers-w12", built: true },
    { n: 13,    short: "Helpers",          full: "Community Helpers",                       dates: "Nov 30–Dec 4",     mon: "2026-11-30", fri: "2026-12-04", route: "/teachers-w13", built: true },
    { n: 14,    short: "Transport",        full: "Tools & Transportation",                  dates: "Dec 7–11",         mon: "2026-12-07", fri: "2026-12-11", route: "/teachers-w14", built: true },
    { n: 15,    short: "Christmas",        full: "Christmas",                               dates: "Dec 14–18",        mon: "2026-12-14", fri: "2026-12-18", route: "/teachers-w15", built: true, note: "winter holiday Dec 21 – Jan 1" },
    { n: 16,    short: "Winter",           full: "Winter Is Coming",                        dates: "Jan 4–8",          mon: "2027-01-04", fri: "2027-01-08", route: "/teachers-w16", built: true },
    { n: 17,    short: "Weather",          full: "Weather",                                 dates: "Jan 11–15",        mon: "2027-01-11", fri: "2027-01-15", route: "/teachers-w17", built: true },
    { n: 18,    short: "Beijing",          full: "Beijing",                                 dates: "Jan 18–22",        mon: "2027-01-18", fri: "2027-01-22", route: "/teachers-w18", built: true },
    { n: 19,    short: "China",            full: "China",                                   dates: "Jan 25–29",        mon: "2027-01-25", fri: "2027-01-29", route: "/teachers-w19", built: true },
    { n: 20,    short: "New Year",         full: "Chinese New Year (Fri 5 Feb is 除夕)",      dates: "Feb 1–5",          mon: "2027-02-01", fri: "2027-02-05", route: "/teachers-w20", built: true, note: "春节 Sat 6 Feb · holiday Feb 8–26" },
    { n: 21,    short: "Continents",       full: "The Seven Continents",                    dates: "Mar 1–5",          mon: "2027-03-01", fri: "2027-03-05", route: "/teachers-w21", built: true },
    { n: 22,    short: "Oceans",           full: "The Five Oceans",                         dates: "Mar 8–12",         mon: "2027-03-08", fri: "2027-03-12", route: "/teachers-w22", built: true },
    { n: 23,    short: "Africa",           full: "One Continent — Africa",                  dates: "Mar 15–19",        mon: "2027-03-15", fri: "2027-03-19", route: "/teachers-w23", built: true },
    { n: 24,    short: "South Africa",     full: "One Country — South Africa",              dates: "Mar 22–26",        mon: "2027-03-22", fri: "2027-03-26", route: "/teachers-w24", built: true },
    { n: 25,    short: "Spring",           full: "Spring & the Life Cycle of Animals",      dates: "Mar 29–Apr 2",     mon: "2027-03-29", fri: "2027-04-02", route: "/teachers-w25", built: true, note: "清明 Mon 5 Apr" },
    { n: 26,    short: "Habitats",         full: "Animal Habitats (four-day week)",         dates: "Apr 6–9",          mon: "2027-04-06", fri: "2027-04-09", route: "/teachers-w26", built: true, note: "清明 Mon 5 Apr · 4-day week" },
    { n: 27,    short: "The Earth",        full: "The Earth",                               dates: "Apr 12–16",        mon: "2027-04-12", fri: "2027-04-16", route: "/teachers-w27", built: true },
    { n: 28,    short: "Landforms",        full: "Landforms",                               dates: "Apr 19–23",        mon: "2027-04-19", fri: "2027-04-23", route: "/teachers-w28", built: true },
    { n: 29,    short: "Earth Day",        full: "Earth Day",                               dates: "Apr 26–30",        mon: "2027-04-26", fri: "2027-04-30", route: "/teachers-w29", built: true, note: "Labour Day May 1–5" },
    { n: 30,    short: "Big Bang",         full: "Big Bang & the Universe (two-day week)",  dates: "May 6–7",          mon: "2027-05-06", fri: "2027-05-07", route: "/teachers-w30", built: true },
    { n: 31,    short: "Solar System",     full: "Solar System",                            dates: "May 10–14",        mon: "2027-05-10", fri: "2027-05-14", route: "/teachers-w31", built: true },
    { n: 32,    short: "Space",            full: "Space Exploration",                       dates: "May 17–21",        mon: "2027-05-17", fri: "2027-05-21", route: "/teachers-w32", built: true },
    { n: 33,    short: "Dinosaurs 1",      full: "Dinosaurs & Fossils (1)",                 dates: "May 24–28",        mon: "2027-05-24", fri: "2027-05-28", route: "/teachers-w33", built: true },
    { n: 34,    short: "Dinosaurs 2",      full: "Dinosaurs & Fossils (2)",                 dates: "May 31–Jun 4",     mon: "2027-05-31", fri: "2027-06-04", route: "/teachers-w34", built: true },
    { n: 35,    short: "Summer",           full: "Summer",                                  dates: "Jun 7–11",         mon: "2027-06-07", fri: "2027-06-11", route: "/teachers-w35", built: true, note: "端午 Wed 9 Jun" },
    { n: 36,    short: "Graduation",       full: "Graduation",                              dates: "Jun 14–18",        mon: "2027-06-14", fri: "2027-06-18", route: "/teachers-w36", built: true }
  ];

  var CSS = [
    /* --wt-h reserves the strip's height before JS measures it, so the sticky
       day-tab row below never jumps on first paint. */
    ':root{--wt-h:41px}',
    '#week-tabs{position:sticky;top:0;z-index:20;margin:0 -18px 2px;padding:7px 18px 6px;',
      'min-height:var(--wt-h,41px);box-sizing:border-box;',
      'background:var(--bg,#F8F5EE);border-bottom:1px solid var(--line,#E3DDD0);',
      'display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;white-space:nowrap;',
      '-webkit-overflow-scrolling:touch;scrollbar-width:thin}',
    '#week-tabs::-webkit-scrollbar{height:5px}',
    '#week-tabs::-webkit-scrollbar-thumb{background:var(--line,#E3DDD0);border-radius:999px}',
    '#week-tabs .wt{flex:0 0 auto;display:inline-block;font-family:"Fredoka","Atkinson Hyperlegible",system-ui,sans-serif;',
      'font-weight:600;font-size:.78rem;line-height:1.2;padding:5px 10px;border-radius:999px;',
      'border:1px solid var(--line,#E3DDD0);background:var(--surface,#fff);color:var(--ink-soft,#5B6B7A);',
      'text-decoration:none;max-width:170px;overflow:hidden;text-overflow:ellipsis}',
    '#week-tabs a.wt:hover{border-color:var(--whale,#1B6FA8);color:var(--whale,#1B6FA8)}',
    '#week-tabs a.wt:focus-visible{outline:3px solid var(--sun,#B97A0A);outline-offset:2px}',
    '#week-tabs .wt-num{color:var(--ink,#22303C);font-weight:600}',
    '#week-tabs a.wt:hover .wt-num{color:var(--whale,#1B6FA8)}',
    '#week-tabs .wt.is-ghost{opacity:.42;border-style:dashed;background:transparent;cursor:default}',
    '#week-tabs .wt.is-ghost .wt-num{color:var(--ink-soft,#5B6B7A)}',
    '#week-tabs .wt.is-here{background:var(--whale,#1B6FA8);border-color:var(--whale,#1B6FA8);',
      'color:var(--on-whale,#fff);opacity:1}',
    '#week-tabs .wt.is-here .wt-num{color:var(--on-whale,#fff)}',
    '#week-tabs .wt-live{display:inline-block;width:6px;height:6px;border-radius:50%;',
      'background:var(--coral,#C2543B);margin-left:6px;vertical-align:middle}',
    '#week-tabs .wt.is-here .wt-live{background:var(--on-whale,#fff)}',
    /* push the existing sticky day-tab row below the week strip */
    '.tabs{top:var(--wt-h,41px)}',
    '@media (max-width:520px){#week-tabs .wt{max-width:118px;font-size:.74rem}}',
    '@media print{#week-tabs{display:none!important}.tabs{top:0}}'
  ].join('');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function label(w) {
    return 'Week ' + w.n + ' · ' + w.full + (w.dates ? ' · ' + w.dates : '')
      + (w.built ? '' : ' — not built yet')
      + (w.n === LIVE_WEEK ? ' — live on /teachers' : '')
      + (w.note ? ' · ' + w.note : '');
  }

  /* Pure string builder — no DOM. scripts/circle-time/render_tabs.py calls this
     through node to bake the same markup into every page at build time. */
  function tabsHTML(here) {
    var out = [];
    for (var i = 0; i < WEEKS.length; i++) {
      var w = WEEKS[i];
      var isHere = (w.n === here);
      var linked = w.built && w.route && !isHere;
      var cls = 'wt' + (isHere ? ' is-here' : (w.built ? '' : ' is-ghost'));
      var inner = '<span class="wt-num">W' + w.n + '</span> · ' + esc(w.short)
        + (w.n === LIVE_WEEK ? '<span class="wt-live" aria-hidden="true"></span>' : '');
      if (linked) {
        out.push('<a class="' + cls + '" href="' + esc(w.route) + '" title="'
          + esc(label(w)) + '">' + inner + '</a>');
      } else {
        out.push('<span class="' + cls + '"' + (isHere ? ' aria-current="page"' : '')
          + ' title="' + esc(label(w)) + '">' + inner + '</span>');
      }
    }
    return out.join('');
  }

  /* Expose for console checks, for render_tabs.py, and for future pages. */
  window.WHALE_WEEKS = WEEKS;
  window.WHALE_LIVE_WEEK = LIVE_WEEK;
  window.WHALE_WEEK_TABS_CSS = CSS;
  window.WHALE_WEEK_TABS_HTML = tabsHTML;

  function place(host) {
    var current = host.querySelector('.wt.is-here');
    document.documentElement.style.setProperty('--wt-h', host.offsetHeight + 'px');
    if (current && host.scrollWidth > host.clientWidth) {
      host.scrollLeft = Math.max(
        0, current.offsetLeft - host.offsetLeft - (host.clientWidth - current.offsetWidth) / 2
      );
    }
  }

  function boot() {
    var host = document.getElementById('week-tabs');
    if (!host) { return; }

    /* Pages are pre-rendered by render_tabs.py: the strip and its <style> are
       already in the HTML at first paint. Only fall back to client rendering
       for a page that has not been through the build script. */
    if (!host.firstChild) {
      if (!document.getElementById('week-tabs-css')) {
        var style = document.createElement('style');
        style.id = 'week-tabs-css';
        style.textContent = CSS;
        document.head.appendChild(style);
      }
      host.innerHTML = tabsHTML(parseInt(host.getAttribute('data-week'), 10));
    }

    var run = function () { place(host); };
    run();
    window.addEventListener('resize', run);
    /* The page body sits behind a password gate: .wrap starts [hidden], so the
       strip has no measurable width until the teacher unlocks. Re-place then. */
    var wrap = host.closest ? host.closest('.wrap') : null;
    if (wrap && wrap.hidden && window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (!wrap.hidden) { mo.disconnect(); run(); }
      });
      mo.observe(wrap, { attributes: true, attributeFilter: ['hidden'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
