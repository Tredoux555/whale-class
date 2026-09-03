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
 *  Each page carries <div id="week-tabs" data-week="N"></div> + this script.
 *  public/circle-time.html is a COPY of whichever week is live — its data-week
 *  must be the copied week's number, and LIVE_WEEK below must agree.
 */
(function () {
  'use strict';

  /* Which week number is currently served at /teachers (public/circle-time.html).
     Bump this in the Sunday swap step. */
  var LIVE_WEEK = 1;

  /* ------------------------------------------------------------------ *
   * THE MANIFEST
   *
   * n      week number (the principal's sheet numbering, 1–37)
   * short  tab label after "W<n> · " — keep it ~2 words
   * full   full theme title, shown in the tab's tooltip
   * dates  human date range as printed on the page / in the decoded doc
   * mon/fri ISO first + last teaching day (null where unknown)
   * route  the STABLE clean URL for this week's page (null when unbuilt)
   * built  true = solid clickable tab; false = ghost tab, no link
   *
   * Dates for weeks 9–37 are verbatim from the principal's sheet as decoded in
   * docs/circle-time/Whale_Class_Circle_Time_Decoded_2026-2027.md — including
   * the three ranges that are NOT Mon–Fri (24, 25 run Tue–Sat; 28 is the
   * four-day Qingming week ending Sat 10 Apr, a make-up school day). Do not
   * "fix" them here; fix the sheet decode first.
   *
   * Weeks 3–8 are the principal's own weeks — they are not in the decoded doc
   * and their dates are not recorded anywhere in this repo, so mon/fri/dates
   * stay null. Fill them in when her sheet for Sep–Oct 2026 lands.
   * ------------------------------------------------------------------ */
  var WEEKS = [
    { n: 1,  short: "I'm Special",     full: "I Am Special! I Like Myself",            dates: "Sep 1–5",        mon: "2026-09-01", fri: "2026-09-05", route: "/teachers-week1", built: true },
    { n: 2,  short: "My Body",         full: "My Body! From Head to Toe",              dates: "Sep 8–12",       mon: "2026-09-08", fri: "2026-09-12", route: "/teachers-next",  built: true },
    { n: 3,  short: "Principal week",  full: "Principal's own week — not yet decoded", dates: null, mon: null, fri: null, route: null, built: false },
    { n: 4,  short: "Principal week",  full: "Principal's own week — not yet decoded", dates: null, mon: null, fri: null, route: null, built: false },
    { n: 5,  short: "Principal week",  full: "Principal's own week — not yet decoded", dates: null, mon: null, fri: null, route: null, built: false },
    { n: 6,  short: "Principal week",  full: "Principal's own week — not yet decoded", dates: null, mon: null, fri: null, route: null, built: false },
    { n: 7,  short: "Principal week",  full: "Principal's own week — not yet decoded", dates: null, mon: null, fri: null, route: null, built: false },
    { n: 8,  short: "Principal week",  full: "Principal's own week — not yet decoded", dates: null, mon: null, fri: null, route: null, built: false },
    { n: 9,  short: "Healthy Life",    full: "Healthy Life / Habits",                  dates: "Oct 19–23",      mon: "2026-10-19", fri: "2026-10-23", route: null, built: false },
    { n: 10, short: "Halloween",       full: "Halloween Week / Dress-up Party",        dates: "Oct 26–30",      mon: "2026-10-26", fri: "2026-10-30", route: null, built: false },
    { n: 11, short: "People Around Me",full: "People Around Me (My Family and My Friends)", dates: "Nov 2–6",   mon: "2026-11-02", fri: "2026-11-06", route: null, built: false },
    { n: 12, short: "Animal Cycle",    full: "The Cycle of Animals",                   dates: "Nov 9–13",       mon: "2026-11-09", fri: "2026-11-13", route: null, built: false },
    { n: 13, short: "Plant Cycle",     full: "The Cycle of Plants",                    dates: "Nov 16–20",      mon: "2026-11-16", fri: "2026-11-20", route: null, built: false },
    { n: 14, short: "Thanksgiving",    full: "Thanksgiving Day",                       dates: "Nov 23–27",      mon: "2026-11-23", fri: "2026-11-27", route: null, built: false },
    { n: 15, short: "Helpers 1",       full: "Community Helpers — 1",             dates: "Nov 30–Dec 4",   mon: "2026-11-30", fri: "2026-12-04", route: null, built: false },
    { n: 16, short: "Helpers 2",       full: "Community Helpers — 2",             dates: "Dec 7–11",       mon: "2026-12-07", fri: "2026-12-11", route: null, built: false },
    { n: 17, short: "Christmas",       full: "Christmas",                              dates: "Dec 14–18",      mon: "2026-12-14", fri: "2026-12-18", route: null, built: false },
    { n: 18, short: "Winter",          full: "Winter is coming",                       dates: "Jan 4–8",        mon: "2027-01-04", fri: "2027-01-08", route: null, built: false },
    { n: 19, short: "Weather",         full: "Weather",                                dates: "Jan 11–15",      mon: "2027-01-11", fri: "2027-01-15", route: null, built: false },
    { n: 20, short: "Beijing",         full: "Beijing",                                dates: "Jan 18–22",      mon: "2027-01-18", fri: "2027-01-22", route: null, built: false },
    { n: 21, short: "China",           full: "China",                                  dates: "Jan 25–29",      mon: "2027-01-25", fri: "2027-01-29", route: null, built: false },
    { n: 22, short: "Chinese New Year",full: "Chinese New Year (return-to-school 元宵 week)", dates: "Feb 22–26", mon: "2027-02-22", fri: "2027-02-26", route: null, built: false },
    { n: 23, short: "Seven Continents",full: "The Seven Continents",                   dates: "Mar 1–5",        mon: "2027-03-01", fri: "2027-03-05", route: null, built: false },
    { n: 24, short: "Five Oceans",     full: "Exploring the Five Oceans",              dates: "Mar 9–13",       mon: "2027-03-09", fri: "2027-03-13", route: null, built: false },
    { n: 25, short: "Africa",          full: "Choose one continent — AFRICA",     dates: "Mar 16–20",      mon: "2027-03-16", fri: "2027-03-20", route: null, built: false },
    { n: 26, short: "South Africa",    full: "Choose one country — SOUTH AFRICA", dates: "Mar 22–26",      mon: "2027-03-22", fri: "2027-03-26", route: null, built: false },
    { n: 27, short: "The Earth",       full: "The Earth",                              dates: "Mar 29–Apr 2",   mon: "2027-03-29", fri: "2027-04-02", route: null, built: false },
    { n: 28, short: "Landforms",       full: "Landforms (short Qingming week — 4 days)", dates: "Apr 7–10", mon: "2027-04-07", fri: "2027-04-10", route: null, built: false },
    { n: 29, short: "Animal Habitats", full: "Animal habitats",                        dates: "Apr 12–16",      mon: "2027-04-12", fri: "2027-04-16", route: null, built: false },
    { n: 30, short: "Earth Day",       full: "Earth Day",                              dates: "Apr 19–23",      mon: "2027-04-19", fri: "2027-04-23", route: null, built: false },
    { n: 31, short: "Green Energy",    full: "Green Energy",                           dates: "Apr 26–30",      mon: "2027-04-26", fri: "2027-04-30", route: null, built: false },
    { n: 32, short: "Big Bang",        full: "Big Bang and the Universe",              dates: "May 10–14",      mon: "2027-05-10", fri: "2027-05-14", route: "/teachers-w32", built: true },
    { n: 33, short: "Solar System",    full: "Solar System",                           dates: "May 17–21",      mon: "2027-05-17", fri: "2027-05-21", route: "/teachers-w33", built: true },
    { n: 34, short: "Space Exploration",full:"Space Exploration",                      dates: "May 24–28",      mon: "2027-05-24", fri: "2027-05-28", route: "/teachers-w34", built: true },
    { n: 35, short: "Dinosaurs",       full: "Dinosaurs and Fossils (1)",              dates: "May 31–Jun 4",   mon: "2027-05-31", fri: "2027-06-04", route: "/teachers-w35", built: true },
    { n: 36, short: "Fossils + review",full: "Dinosaurs and Fossils (2) + May review", dates: "Jun 7–11",       mon: "2027-06-07", fri: "2027-06-11", route: "/teachers-w36", built: true },
    { n: 37, short: "Graduation",      full: "Graduation",                             dates: "Jun 14–18",      mon: "2027-06-14", fri: "2027-06-18", route: null, built: false }
  ];

  /* Expose for console checks / future pages. Do not rely on it for rendering. */
  window.WHALE_WEEKS = WEEKS;
  window.WHALE_LIVE_WEEK = LIVE_WEEK;

  var CSS = [
    '#week-tabs{position:sticky;top:0;z-index:20;margin:0 -18px 2px;padding:7px 18px 6px;',
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
    '.tabs{top:var(--wt-h,0px)}',
    '@media (max-width:520px){#week-tabs .wt{max-width:118px;font-size:.74rem}}',
    '@media print{#week-tabs{display:none!important}.tabs{top:0}}'
  ].join('');

  function label(w) {
    return 'Week ' + w.n + ' · ' + w.full + (w.dates ? ' · ' + w.dates : '')
      + (w.built ? '' : ' — not built yet')
      + (w.n === LIVE_WEEK ? ' — live on /teachers' : '');
  }

  function render(host) {
    var here = parseInt(host.getAttribute('data-week'), 10);
    var style = document.createElement('style');
    style.id = 'week-tabs-css';
    style.textContent = CSS;
    document.head.appendChild(style);

    var current = null;
    for (var i = 0; i < WEEKS.length; i++) {
      var w = WEEKS[i];
      var isHere = (w.n === here);
      var linked = w.built && w.route && !isHere;
      var el = document.createElement(linked ? 'a' : 'span');
      el.className = 'wt' + (isHere ? ' is-here' : (w.built ? '' : ' is-ghost'));
      if (linked) { el.href = w.route; }
      el.title = label(w);
      el.innerHTML = '<span class="wt-num">W' + w.n + '</span> · ' + w.short
        + (w.n === LIVE_WEEK ? '<span class="wt-live" aria-hidden="true"></span>' : '');
      if (isHere) {
        el.setAttribute('aria-current', 'page');
        current = el;
      }
      host.appendChild(el);
    }

    function place() {
      document.documentElement.style.setProperty('--wt-h', host.offsetHeight + 'px');
      if (current && host.scrollWidth > host.clientWidth) {
        host.scrollLeft = Math.max(
          0, current.offsetLeft - host.offsetLeft - (host.clientWidth - current.offsetWidth) / 2
        );
      }
    }

    place();
    window.addEventListener('resize', place);
    /* The page body sits behind a password gate: .wrap starts [hidden], so the
       strip has no measurable width until the teacher unlocks. Re-place then. */
    var wrap = host.closest ? host.closest('.wrap') : null;
    if (wrap && wrap.hidden && window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (!wrap.hidden) { mo.disconnect(); place(); }
      });
      mo.observe(wrap, { attributes: true, attributeFilter: ['hidden'] });
    }
  }

  function boot() {
    var host = document.getElementById('week-tabs');
    if (host && !host.firstChild) { render(host); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
