// lib/potato/ui.ts
// The Potato Snaps stylesheet — "Lunchbox Modern".
//
// Ported verbatim from the approved design spec
// (docs: POTATO_SNAPS_DESIGN_SPEC.html + POTATO_SNAPS_PHILOSOPHY.md). The token
// values, radii, shadows and every component class below ARE the signed-off
// design; change them only with the founder's say-so.
//
// This ships as one string injected by app/potato/layout.tsx through
// <style dangerouslySetInnerHTML>. It is deliberately NOT styled-jsx: Turbopack
// rejects a <style jsx> tag that is not the direct child of a component's
// outermost return element, and that rule has cost this repo twelve failed
// deploys. dangerouslySetInnerHTML has the same runtime effect and no such rule.
//
// Scoped under .pt- prefixed classes so nothing here can reach a Montree page.

export const POTATO_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap';

export const POTATO_CSS = `
:root{
  --pt-honey:#E8A317;
  --pt-honey-deep:#C9860B;
  --pt-butter:#FFD466;
  --pt-butter-soft:#FFF0C9;
  --pt-blue:#9ED2F0;
  --pt-blue-deep:#3E93C4;
  --pt-sky:#EAF6FD;
  --pt-cream:#FFFDF6;
  --pt-paper:#FFFFFF;
  --pt-sand:#F1E7D6;
  --pt-sand-line:#EBDFC9;
  --pt-ink:#23395B;
  --pt-ink-70:rgba(35,57,91,.70);
  --pt-ink-50:rgba(35,57,91,.50);
  --pt-ink-35:rgba(35,57,91,.35);
  --pt-coral:#FF7B6B;
  --pt-coral-deep:#D6503F;

  --pt-r-card:24px;
  --pt-r-btn:18px;
  --pt-r-tile:16px;

  --pt-sh-card:0 1px 0 rgba(35,57,91,.04), 0 10px 22px -16px rgba(35,57,91,.30);
  --pt-sh-lift:0 2px 0 rgba(35,57,91,.06), 0 14px 26px -16px rgba(35,57,91,.36);
  --pt-sh-gold:0 2px 0 rgba(150,96,4,.18), 0 14px 26px -14px rgba(232,163,23,.55);

  --pt-disp:'Baloo 2', ui-rounded, 'Segoe UI', system-ui, sans-serif;
  --pt-body:'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --pt-mono:'JetBrains Mono', ui-monospace, Menlo, monospace;
}

.pt-root, .pt-root *{box-sizing:border-box}
.pt-root{
  background:var(--pt-cream);
  color:var(--pt-ink);
  font-family:var(--pt-body);
  -webkit-font-smoothing:antialiased;
  min-height:100dvh;
}
.pt-root button{font-family:inherit}

/* ── shell ────────────────────────────────────────────────────────── */
.pt-app{min-height:100dvh;display:flex;flex-direction:column;background:var(--pt-cream)}
.pt-topbar{
  position:sticky;top:0;z-index:20;background:rgba(255,253,246,.94);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  padding:calc(14px + env(safe-area-inset-top)) 18px 13px;
  border-bottom:1px solid var(--pt-sand-line);
  display:flex;align-items:center;gap:12px;
}
.pt-topbar__txt{min-width:0;flex:1}
.pt-topbar__title{
  font-family:var(--pt-disp);font-weight:800;font-size:19px;line-height:1.12;
  margin:0;letter-spacing:-.01em;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.pt-weekpill{
  display:inline-flex;align-items:center;gap:6px;margin-top:4px;
  background:var(--pt-sky);color:var(--pt-blue-deep);border:none;
  font-size:11.5px;font-weight:800;padding:3px 10px;border-radius:999px;
  font-family:var(--pt-body);
}
.pt-iconbtn{
  width:40px;height:40px;flex:none;border-radius:14px;border:1.5px solid var(--pt-sand-line);
  background:var(--pt-paper);display:grid;place-items:center;cursor:pointer;color:var(--pt-ink);
  padding:0;
}
.pt-iconbtn:active{transform:scale(.94)}
.pt-scroll{flex:1;padding:16px 16px calc(30px + env(safe-area-inset-bottom))}

/* ── buttons ──────────────────────────────────────────────────────── */
.pt-btn{
  font-family:var(--pt-disp);font-weight:800;border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:9px;
  border-radius:var(--pt-r-btn);letter-spacing:-.005em;transition:.15s;color:var(--pt-ink);
}
.pt-btn:active:not(:disabled){transform:scale(.985)}
.pt-btn--primary{background:var(--pt-honey);color:var(--pt-ink);box-shadow:var(--pt-sh-gold)}
.pt-btn--blue{background:var(--pt-blue);color:var(--pt-ink);box-shadow:0 2px 0 rgba(35,57,91,.07), 0 14px 26px -16px rgba(62,147,196,.7)}
.pt-btn--ghost{background:var(--pt-paper);color:var(--pt-ink);border:1.5px solid var(--pt-sand-line);box-shadow:var(--pt-sh-card)}
.pt-btn--danger{background:#FFF0ED;color:var(--pt-coral-deep);border:1.5px solid rgba(214,80,63,.28)}
.pt-btn--lg{height:56px;font-size:18px;padding:0 22px;width:100%}
.pt-btn--md{height:46px;font-size:15.5px;padding:0 18px}
.pt-btn--sm{height:36px;font-size:13.5px;padding:0 14px;border-radius:12px}
.pt-btn:disabled{background:var(--pt-sand);color:var(--pt-ink-35);box-shadow:none;cursor:default;border-color:transparent}

/* ── camera slab ──────────────────────────────────────────────────── */
.pt-camerabtn{
  width:100%;background:var(--pt-honey);border:none;border-radius:var(--pt-r-card);
  padding:15px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;
  box-shadow:var(--pt-sh-gold);text-align:left;position:relative;overflow:hidden;
  font-family:var(--pt-body);
}
.pt-camerabtn:active{transform:scale(.99)}
.pt-camerabtn::after{
  content:"";position:absolute;right:-26px;top:-40px;width:120px;height:120px;border-radius:999px;
  background:rgba(255,255,255,.16);
}
.pt-camerabtn__ic{
  width:52px;height:52px;flex:none;border-radius:18px;background:rgba(255,255,255,.9);
  display:grid;place-items:center;box-shadow:0 2px 0 rgba(150,96,4,.14);
}
.pt-camerabtn__t{font-family:var(--pt-disp);font-weight:800;font-size:19px;line-height:1.1;color:var(--pt-ink)}
.pt-camerabtn__s{font-family:var(--pt-body);font-weight:700;font-size:12.5px;color:rgba(35,57,91,.68);margin-top:3px}

/* ── section label ────────────────────────────────────────────────── */
.pt-seclabel{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:22px 2px 11px}
.pt-seclabel h2{font-family:var(--pt-disp);font-weight:800;font-size:15px;margin:0;letter-spacing:.01em}
.pt-seclabel span{font-size:11.5px;font-weight:800;color:var(--pt-ink-35);letter-spacing:.02em}

/* ── roster row ───────────────────────────────────────────────────── */
.pt-row{
  background:var(--pt-paper);border:1.5px solid var(--pt-sand-line);border-radius:var(--pt-r-card);
  padding:13px 15px;margin-bottom:11px;box-shadow:var(--pt-sh-card);
  display:grid;grid-template-columns:56px 1fr;gap:13px;align-items:start;
}
.pt-row--ready{background:linear-gradient(180deg,#FFFBEF 0%,#FFFFFF 62%);border-color:#F4DFA6;box-shadow:var(--pt-sh-lift)}
.pt-row--empty{background:var(--pt-paper);border-style:dashed;border-color:#E4DAC6;box-shadow:none}
.pt-row__body{min-width:0;padding-top:2px}
.pt-row__head{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.pt-row__name{
  font-family:var(--pt-disp);font-weight:800;font-size:17.5px;line-height:1;margin:0;flex:1;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.01em;
}
.pt-row__hint{font-size:12px;font-weight:700;color:var(--pt-ink-35);margin:9px 0 0}

/* ── avatar ───────────────────────────────────────────────────────── */
.pt-av{
  width:56px;height:56px;border-radius:999px;display:grid;place-items:center;
  font-family:var(--pt-disp);font-weight:800;font-size:22px;color:var(--pt-ink);
  box-shadow:0 0 0 3px var(--pt-paper), 0 0 0 5.5px var(--pt-butter);
  position:relative;overflow:hidden;flex:none;
}
.pt-av img{width:100%;height:100%;object-fit:cover;display:block}
.pt-av--sm{width:44px;height:44px;font-size:17px;box-shadow:0 0 0 2.5px var(--pt-paper), 0 0 0 4.5px var(--pt-butter)}
.pt-av--xs{width:34px;height:34px;font-size:14px;box-shadow:0 0 0 2px var(--pt-paper), 0 0 0 3.5px var(--pt-butter)}
.pt-av--lg{width:72px;height:72px;font-size:27px;box-shadow:0 0 0 3px var(--pt-paper), 0 0 0 5px var(--pt-sand)}
.pt-av--none{background:#FAF5EA;color:var(--pt-ink-35);box-shadow:none;border:2px dashed #E0D4BC}

/* ── count chip ───────────────────────────────────────────────────── */
.pt-chip{
  font-family:var(--pt-body);font-weight:800;font-size:12.5px;flex:none;
  padding:5px 11px;border-radius:999px;background:var(--pt-sand);color:var(--pt-ink-70);
  letter-spacing:.01em;line-height:1;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;
}
.pt-chip--zero{background:#F6F1E7;color:var(--pt-ink-35)}
.pt-chip--gold{background:var(--pt-honey);color:var(--pt-ink);box-shadow:0 1px 0 rgba(150,96,4,.2)}

/* ── THE BAR ──────────────────────────────────────────────────────── */
.pt-bar{
  height:16px;border-radius:999px;background:var(--pt-sand);
  position:relative;overflow:hidden;box-shadow:inset 0 1px 2px rgba(35,57,91,.07);
}
.pt-bar__fill{
  position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--pt-blue);
  box-shadow:inset 0 -2px 0 rgba(35,57,91,.07);transition:width .35s ease;
}
.pt-bar__ticks{position:absolute;inset:0;display:flex;pointer-events:none}
.pt-bar__ticks i{flex:1;border-right:2px solid rgba(255,255,255,.62)}
.pt-bar__ticks i:last-child{border-right:none}
.pt-bar--empty{background:transparent;box-shadow:none;border:2px dashed #E0D4BC}
.pt-bar--empty .pt-bar__ticks{display:none}
.pt-bar--gold .pt-bar__fill{
  background:linear-gradient(180deg,#F2B437 0%,var(--pt-honey) 100%);
  box-shadow:inset 0 -2px 0 rgba(150,96,4,.22);
}
.pt-bar--gold .pt-bar__ticks i{border-right-color:rgba(255,253,246,.5)}
.pt-bar--cooking .pt-bar__fill{
  background:repeating-linear-gradient(115deg,#F2B437 0 12px,#E8A317 12px 24px);
  opacity:.72;
}

/* celebrate sparkles — own box, never overlaps the chip */
.pt-sparks{position:relative;width:22px;height:20px;flex:none;margin-right:2px}
.pt-sparks i{position:absolute;background:var(--pt-butter);border-radius:1.5px}
.pt-sparks i:nth-child(1){width:7px;height:7px;left:1px;top:1px;transform:rotate(20deg)}
.pt-sparks i:nth-child(2){width:5px;height:5px;left:12px;top:-3px;background:var(--pt-honey);transform:rotate(42deg)}
.pt-sparks i:nth-child(3){width:5px;height:5px;left:8px;top:12px;background:var(--pt-honey);opacity:.55;transform:rotate(-16deg)}

/* ── row action / status ──────────────────────────────────────────── */
.pt-rowact{margin-top:11px}
.pt-status{margin-top:11px;display:flex;align-items:center;gap:9px;background:var(--pt-sky);border-radius:14px;padding:9px 12px}
.pt-status--gold{background:var(--pt-butter-soft)}
.pt-status--warn{background:#FFF0ED}
.pt-status__t{font-size:13px;font-weight:800;color:var(--pt-ink);flex:1;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-status__m{font-size:12px;font-weight:700;color:var(--pt-ink-50);white-space:nowrap}
.pt-dots{display:inline-flex;gap:3px;align-items:center}
.pt-dots i{width:5px;height:5px;border-radius:999px;background:var(--pt-honey-deep);animation:pt-bounce 1.1s infinite ease-in-out}
.pt-dots i:nth-child(2){opacity:.6;animation-delay:.15s}
.pt-dots i:nth-child(3){opacity:.3;animation-delay:.3s}
@keyframes pt-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-3px)}}
.pt-tick{width:22px;height:22px;border-radius:999px;background:var(--pt-blue);flex:none;display:grid;place-items:center;box-shadow:0 1px 0 rgba(35,57,91,.1)}
.pt-watch{
  font-family:var(--pt-disp);font-weight:800;font-size:13.5px;color:var(--pt-honey-deep);
  display:inline-flex;align-items:center;gap:5px;white-space:nowrap;
  background:none;border:none;cursor:pointer;padding:0;
}

/* ── tag screen ───────────────────────────────────────────────────── */
.pt-photocard{
  border-radius:var(--pt-r-card);overflow:hidden;position:relative;
  border:1.5px solid var(--pt-sand-line);box-shadow:var(--pt-sh-card);background:var(--pt-sky);
}
.pt-photocard img{width:100%;display:block;max-height:46vh;object-fit:contain;background:#0d1b2a}
.pt-photocard__chip{
  position:absolute;left:12px;top:12px;background:rgba(255,253,246,.94);
  font-size:11.5px;font-weight:800;color:var(--pt-ink);padding:5px 11px 5px 9px;border-radius:999px;
  box-shadow:0 2px 8px rgba(35,57,91,.14);display:flex;align-items:center;gap:5px;
}
.pt-q{font-family:var(--pt-disp);font-weight:800;font-size:23px;margin:20px 2px 4px;letter-spacing:-.015em}
.pt-qsub{font-size:13px;font-weight:700;color:var(--pt-ink-50);margin:0 2px 16px}
.pt-facegrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 8px;margin-bottom:4px}
.pt-face{display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;background:none;border:none;padding:0}
.pt-face__av{position:relative}
.pt-face__av .pt-av{transition:.15s}
.pt-face--on .pt-av{box-shadow:0 0 0 3px var(--pt-paper), 0 0 0 6.5px var(--pt-honey)}
.pt-face__badge{
  position:absolute;right:-3px;bottom:-3px;width:26px;height:26px;border-radius:999px;
  background:var(--pt-butter);border:2.5px solid var(--pt-paper);display:grid;place-items:center;
  box-shadow:0 2px 6px rgba(35,57,91,.2);
}
.pt-face__n{font-size:12.5px;font-weight:700;color:var(--pt-ink-50);text-align:center;line-height:1.1;word-break:break-word}
.pt-face--on .pt-face__n{font-weight:800;color:var(--pt-ink)}
.pt-footbar{
  position:sticky;bottom:0;background:rgba(255,253,246,.95);backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);border-top:1px solid var(--pt-sand-line);
  padding:13px 16px calc(15px + env(safe-area-inset-bottom));display:flex;gap:10px;
}

/* ── login / chooser ──────────────────────────────────────────────── */
.pt-login{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:40px 28px calc(70px + env(safe-area-inset-bottom));text-align:center;position:relative;
}
.pt-halo{position:relative;width:196px;height:196px;display:grid;place-items:center;margin-bottom:6px}
.pt-halo::before{
  content:"";position:absolute;inset:0;border-radius:999px;z-index:0;
  background:radial-gradient(circle at 50% 48%, rgba(255,224,150,.55) 0%, rgba(255,224,150,0) 68%);
}
.pt-halo::after{content:"";position:absolute;inset:6px;border-radius:999px;z-index:0;border:2px dashed rgba(232,163,23,.24)}
.pt-halo > svg{position:relative;z-index:1}
.pt-wordmark{font-family:var(--pt-disp);font-weight:800;font-size:36px;letter-spacing:-.025em;margin:2px 0 0;line-height:1}
.pt-wordrule{width:58px;height:5px;border-radius:999px;background:var(--pt-honey);margin:11px auto 0}
.pt-logintag{font-size:13.5px;font-weight:700;color:var(--pt-ink-50);margin:12px 0 30px;line-height:1.5}
.pt-codeboxes{display:flex;gap:8px;justify-content:center;margin-bottom:26px}
.pt-cbox{
  width:46px;height:60px;border-radius:var(--pt-r-tile);background:var(--pt-paper);
  border:2px solid var(--pt-sand-line);display:grid;place-items:center;
  font-family:var(--pt-disp);font-weight:800;font-size:27px;color:var(--pt-ink);
  box-shadow:0 1px 0 rgba(35,57,91,.04);
}
.pt-cbox--on{border-color:var(--pt-blue);background:#FBFEFF}
.pt-cbox--cur{border-color:var(--pt-honey);box-shadow:0 0 0 4px rgba(232,163,23,.14)}
.pt-caret{width:2px;height:26px;background:var(--pt-honey);border-radius:2px;animation:pt-blink 1.1s steps(1,end) infinite}
@keyframes pt-blink{0%,50%{opacity:1}51%,100%{opacity:0}}
.pt-codeinput{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
.pt-helper{font-size:13px;font-weight:700;color:var(--pt-ink-50);margin:16px auto 0;line-height:1.55;max-width:250px}
.pt-byline{
  position:absolute;left:0;right:0;bottom:calc(26px + env(safe-area-inset-bottom));
  font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--pt-ink-35);
}
.pt-err{
  margin:0 auto 18px;max-width:300px;background:#FFF0ED;border:1.5px solid rgba(214,80,63,.28);
  color:var(--pt-coral-deep);font-size:13px;font-weight:700;border-radius:14px;padding:10px 14px;line-height:1.4;
}

/* ── parent feed ──────────────────────────────────────────────────── */
.pt-greet{margin:20px 2px 18px}
.pt-greet h2{font-family:var(--pt-disp);font-weight:800;font-size:26px;line-height:1.14;margin:0;letter-spacing:-.02em}
.pt-greet p{margin:7px 0 0;font-size:13.5px;font-weight:700;color:var(--pt-ink-50)}
.pt-mcard{
  background:var(--pt-paper);border:1.5px solid var(--pt-sand-line);border-radius:var(--pt-r-card);
  padding:13px;margin-bottom:16px;box-shadow:var(--pt-sh-card);
}
.pt-mcard__top{display:flex;align-items:center;gap:8px;margin:1px 3px 12px}
.pt-mcard__wk{font-family:var(--pt-disp);font-weight:800;font-size:15px;flex:1;letter-spacing:-.005em}
.pt-newbadge{background:var(--pt-butter);color:var(--pt-ink);font-size:10.5px;font-weight:800;letter-spacing:.1em;padding:4px 9px;border-radius:999px}
.pt-player{background:var(--pt-sky);border-radius:18px;padding:14px;display:grid;place-items:center;border:1px solid #DCEDF8}
.pt-frame916{
  width:172px;aspect-ratio:9/16;border-radius:14px;position:relative;overflow:hidden;background:#0d1b2a;
  box-shadow:0 3px 0 rgba(35,57,91,.06), 0 18px 30px -20px rgba(35,57,91,.5);
}
.pt-frame916 video{width:100%;height:100%;object-fit:cover;display:block;background:#0d1b2a}
.pt-mcard__meta{display:flex;align-items:center;gap:8px;margin:12px 3px 12px;font-size:12.5px;font-weight:700;color:var(--pt-ink-50)}
.pt-mcard__meta b{color:var(--pt-ink-70);font-weight:800}
.pt-dotsep{width:3px;height:3px;border-radius:999px;background:var(--pt-ink-35);flex:none}

/* ── teacher extras ───────────────────────────────────────────────── */
.pt-hgroup{margin:22px 2px 12px}
.pt-hgroup h2{font-family:var(--pt-disp);font-weight:800;font-size:18px;margin:0;letter-spacing:-.01em}
.pt-hgroup p{margin:4px 0 0;font-size:12.5px;font-weight:700;color:var(--pt-ink-50)}
.pt-lrow{
  background:var(--pt-paper);border:1.5px solid var(--pt-sand-line);border-radius:20px;
  padding:11px 13px;margin-bottom:9px;display:flex;align-items:center;gap:12px;box-shadow:var(--pt-sh-card);
}
.pt-lrow__n{font-family:var(--pt-disp);font-weight:800;font-size:16px;flex:1;min-width:0;line-height:1.15;overflow:hidden;text-overflow:ellipsis}
.pt-lrow__n small{display:block;font-family:var(--pt-body);font-weight:700;font-size:11.5px;color:var(--pt-ink-35);margin-top:2px}
.pt-addrow{
  border:2px dashed #E4DAC6;border-radius:20px;padding:14px;display:flex;align-items:center;
  justify-content:center;gap:9px;font-family:var(--pt-disp);font-weight:800;font-size:15px;color:var(--pt-ink-50);
  cursor:pointer;background:rgba(255,255,255,.5);width:100%;
}
.pt-code{
  font-family:var(--pt-mono);font-weight:700;font-size:19px;letter-spacing:.14em;color:var(--pt-ink);
  background:var(--pt-sky);border-radius:12px;padding:8px 12px 8px 14px;line-height:1;white-space:nowrap;
}
.pt-segment{display:flex;background:var(--pt-sand);border-radius:999px;padding:4px;gap:3px;margin:0 2px}
.pt-segment button{
  flex:1 1 0;border:none;background:transparent;border-radius:999px;padding:9px 8px;cursor:pointer;
  font-family:var(--pt-disp);font-weight:800;font-size:14px;color:var(--pt-ink-50);
}
.pt-segment button.pt-on{background:var(--pt-paper);color:var(--pt-ink);box-shadow:0 1px 0 rgba(35,57,91,.06), 0 4px 10px -6px rgba(35,57,91,.4)}

.pt-input{
  width:100%;height:50px;border-radius:var(--pt-r-tile);border:2px solid var(--pt-sand-line);
  background:var(--pt-paper);padding:0 14px;font-family:var(--pt-body);font-weight:700;
  font-size:16px;color:var(--pt-ink);outline:none;
}
.pt-input:focus{border-color:var(--pt-honey);box-shadow:0 0 0 4px rgba(232,163,23,.14)}

.pt-empty{
  text-align:center;padding:44px 20px;color:var(--pt-ink-50);
  font-size:14px;font-weight:700;line-height:1.6;
}
.pt-photogrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.pt-thumb{
  position:relative;aspect-ratio:1;border-radius:var(--pt-r-tile);overflow:hidden;
  border:1.5px solid var(--pt-sand-line);background:var(--pt-sky);
}
.pt-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.pt-thumb__x{
  position:absolute;right:5px;top:5px;width:28px;height:28px;border-radius:999px;border:none;
  background:rgba(255,253,246,.94);color:var(--pt-coral-deep);display:grid;place-items:center;
  cursor:pointer;box-shadow:0 2px 8px rgba(35,57,91,.2);padding:0;
}
.pt-toast{
  position:fixed;left:50%;transform:translateX(-50%);
  bottom:calc(24px + env(safe-area-inset-bottom));z-index:60;
  background:var(--pt-ink);color:var(--pt-cream);font-weight:700;font-size:13.5px;
  padding:11px 18px;border-radius:999px;box-shadow:0 12px 26px -12px rgba(35,57,91,.7);
  max-width:calc(100% - 32px);text-align:center;
}
.pt-toast--bad{background:var(--pt-coral-deep)}

/* ═══════════════════════════════════════════════════════════════════
   v1.1 — CLASS FILM PICKER
   ═══════════════════════════════════════════════════════════════════ */
.pt-cfhead{
  position:sticky;top:0;z-index:20;background:rgba(255,253,246,.97);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border-bottom:1px solid var(--pt-sand-line);
  padding:calc(13px + env(safe-area-inset-top)) 16px 13px;
}
.pt-cfhead__top{display:flex;align-items:center;gap:12px}
.pt-cfhead__t{font-family:var(--pt-disp);font-weight:800;font-size:18px;line-height:1.1;margin:0;flex:1;letter-spacing:-.012em;min-width:0}
.pt-cfhead__t small{display:block;font-family:var(--pt-body);font-weight:800;font-size:11.5px;color:var(--pt-blue-deep);margin-top:3px;letter-spacing:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pt-cfcount{display:flex;align-items:flex-end;gap:9px;margin:14px 2px 0}
.pt-cfcount__n{font-family:var(--pt-disp);font-weight:800;font-size:31px;line-height:.86;letter-spacing:-.03em}
.pt-cfcount__u{font-family:var(--pt-body);font-weight:800;font-size:13px;color:var(--pt-ink-50);padding-bottom:1px}
.pt-cfcount__d{margin-left:auto;background:var(--pt-sky);color:var(--pt-blue-deep);font-weight:800;font-size:12.5px;padding:5px 11px;border-radius:999px;line-height:1.1}
.pt-guide{margin:12px 2px 0;position:relative;height:26px}
.pt-guide__track{height:8px;border-radius:999px;background:var(--pt-sand);position:relative}
.pt-guide__zone{position:absolute;top:0;bottom:0;background:var(--pt-blue);border-radius:999px;opacity:.7}
.pt-guide__pin{position:absolute;top:4px;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:999px;
  background:var(--pt-honey);border:3px solid var(--pt-cream);box-shadow:0 1px 0 rgba(150,96,4,.3);transition:left .2s ease}
.pt-guide__tick{position:absolute;top:13px;transform:translateX(-50%);font-size:10px;font-weight:800;color:var(--pt-ink-35);letter-spacing:.02em;white-space:nowrap}

.pt-cover{margin-top:15px}
.pt-cover__h{display:flex;align-items:baseline;gap:8px;margin:0 2px 10px}
.pt-cover__h h4{font-family:var(--pt-disp);font-weight:800;font-size:13.5px;margin:0;letter-spacing:-.005em}
.pt-cover__h span{font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--pt-ink-35);margin-left:auto}
.pt-cover__wrap{position:relative;margin:0 -16px;padding:0 16px}
.pt-cover__wrap::after{content:"";position:absolute;right:0;top:0;bottom:0;width:38px;pointer-events:none;
  background:linear-gradient(90deg,rgba(255,253,246,0),var(--pt-cream) 78%)}
.pt-cover__strip{display:grid;grid-auto-flow:column;grid-template-rows:auto auto;gap:13px 9px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.pt-cover__strip::-webkit-scrollbar{display:none}
.pt-cchip{width:50px;text-align:center;cursor:pointer;background:none;border:none;padding:0;font-family:inherit}
.pt-cchip__w{position:relative;width:44px;height:44px;margin:0 auto}
.pt-cchip__av{width:44px;height:44px;border-radius:999px;display:grid;place-items:center;overflow:hidden;
  font-family:var(--pt-disp);font-weight:800;font-size:17px;color:var(--pt-ink)}
.pt-cchip__av img{width:100%;height:100%;object-fit:cover;display:block}
.pt-cchip--cov .pt-cchip__av{box-shadow:0 0 0 2.5px var(--pt-cream), 0 0 0 5px var(--pt-honey)}
.pt-cchip--miss .pt-cchip__av{background:#FFF7E3 !important;color:rgba(201,134,11,.85);
  border:2px dashed var(--pt-honey);box-shadow:0 0 0 5px rgba(232,163,23,.11)}
.pt-cchip--exc .pt-cchip__av{filter:grayscale(1);opacity:.45;box-shadow:0 0 0 2.5px var(--pt-cream), 0 0 0 4px var(--pt-sand)}
.pt-cchip--filter .pt-cchip__av{box-shadow:0 0 0 2.5px var(--pt-cream), 0 0 0 5px var(--pt-ink)}
.pt-cchip__b{position:absolute;right:-6px;bottom:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;
  font-family:var(--pt-body);font-weight:800;font-size:11px;line-height:1;display:grid;place-items:center;
  border:2.5px solid var(--pt-cream);background:var(--pt-honey);color:var(--pt-ink)}
.pt-cchip--miss .pt-cchip__b{background:var(--pt-cream);color:var(--pt-honey-deep);border-color:var(--pt-honey);border-style:dashed;border-width:1.5px;box-shadow:0 0 0 2.5px var(--pt-cream)}
.pt-cchip--exc .pt-cchip__b{background:var(--pt-sand);color:var(--pt-ink-50);font-size:9px;letter-spacing:.02em}
.pt-cchip__n{font-size:10px;font-weight:800;color:var(--pt-ink-50);margin-top:8px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pt-cchip--miss .pt-cchip__n{color:var(--pt-honey-deep)}
.pt-cchip--exc .pt-cchip__n{color:var(--pt-ink-35)}
.pt-cchip--filter .pt-cchip__n{color:var(--pt-ink)}

.pt-cfsum{display:flex;align-items:center;gap:10px;margin:13px 0 0;padding:8px 12px 8px 10px;border-radius:17px;
  background:var(--pt-butter-soft);border:1px solid #F3E2B6;width:100%;text-align:left;font-family:inherit;cursor:pointer}
.pt-cfsum__t{flex:1;font-size:12.5px;font-weight:800;color:var(--pt-ink);line-height:1.3;min-width:0}
.pt-cfsum__t small{display:block;font-weight:700;font-size:11px;color:var(--pt-ink-50);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pt-cfsum__a{font-size:12.5px;font-weight:800;color:var(--pt-honey-deep);white-space:nowrap;display:flex;align-items:center;gap:4px}
.pt-stackav{display:flex;flex:none}
.pt-stackav i{width:24px;height:24px;border-radius:999px;display:grid;place-items:center;
  font-family:var(--pt-disp);font-weight:800;font-size:11px;color:var(--pt-ink);
  border:2px solid var(--pt-butter-soft);margin-right:-8px;font-style:normal}
.pt-cfsum--ok .pt-stackav i{border-color:#FFFBEE}
.pt-stackav i:last-child{margin-right:0}
.pt-cffilter{display:flex;align-items:center;gap:10px;margin:13px 0 0;padding:7px 8px 7px 10px;border-radius:17px;background:var(--pt-sky);border:1px solid #DAEBF7}
.pt-cffilter__t{flex:1;font-size:12.5px;font-weight:800;color:var(--pt-ink);line-height:1.25;min-width:0}
.pt-cffilter__x{display:flex;align-items:center;gap:6px;background:var(--pt-paper);border:1.5px solid #DAEBF7;border-radius:999px;
  padding:6px 11px;font-size:12px;font-weight:800;color:var(--pt-blue-deep);white-space:nowrap;cursor:pointer;font-family:inherit;min-height:36px}
.pt-excuse{margin:13px 0 0;padding:13px;border-radius:20px;background:var(--pt-paper);border:2px dashed var(--pt-honey);box-shadow:var(--pt-sh-card)}
.pt-excuse__top{display:flex;gap:12px;align-items:center}
.pt-excuse__t{font-family:var(--pt-disp);font-weight:800;font-size:15.5px;line-height:1.2;letter-spacing:-.01em}
.pt-excuse__s{font-size:12px;font-weight:700;color:var(--pt-ink-50);margin-top:4px;line-height:1.4}
.pt-excuse__btns{display:flex;gap:9px;margin-top:13px}
.pt-excuse__btns .pt-btn{flex:1}

.pt-daylabel{display:flex;align-items:center;gap:10px;margin:17px 2px 10px;
  font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--pt-ink-35)}
.pt-daylabel::after{content:"";flex:1;height:1px;background:var(--pt-sand-line)}
.pt-daylabel:first-child{margin-top:4px}
.pt-pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
.pt-pth{position:relative;border-radius:var(--pt-r-tile);background:#FFFDF6;padding:4px;overflow:hidden;
  aspect-ratio:1/1;cursor:pointer;border:none;box-shadow:var(--pt-sh-photo);transition:transform .18s ease}
.pt-pth img{width:100%;height:100%;object-fit:cover;display:block;border-radius:11px}
.pt-pth:nth-child(3n+1){transform:rotate(-1.5deg)}
.pt-pth:nth-child(3n+2){transform:rotate(.7deg)}
.pt-pth:nth-child(3n+3){transform:rotate(1.4deg)}
.pt-pth--on{background:#FFFDF6;
  box-shadow:0 0 0 3px var(--pt-honey), 0 2px 3px rgba(150,96,4,.20), 0 12px 20px -10px rgba(232,163,23,.75)}
/* washi tape across the top-left corner of a starred photo */
.pt-pth--on::before{content:"";position:absolute;left:-10px;top:5px;width:30px;height:9px;z-index:3;
  background:linear-gradient(180deg,rgba(255,233,174,.92) 0%,rgba(255,212,102,.92) 60%,rgba(242,190,69,.92) 100%);
  transform:rotate(-40deg);box-shadow:0 1px 2px rgba(35,57,91,.16)}
.pt-pth__star{position:absolute;right:7px;top:7px;width:28px;height:28px;border-radius:999px;display:grid;place-items:center;
  background:rgba(255,253,246,.88);box-shadow:0 1px 4px rgba(35,57,91,.2);z-index:2}
.pt-pth--on .pt-pth__star{background:var(--pt-honey);box-shadow:0 1px 0 rgba(150,96,4,.35), 0 2px 8px rgba(35,57,91,.2)}
.pt-pth__faces{position:absolute;left:7px;bottom:7px;display:flex;align-items:center;gap:3px;z-index:2;
  background:rgba(255,253,246,.92);padding:3px 7px 3px 4px;border-radius:999px;box-shadow:0 1px 3px rgba(35,57,91,.16)}
.pt-pth__faces i{width:11px;height:11px;border-radius:999px;display:block;flex:none}
.pt-pth__faces span{font-size:9.5px;font-weight:800;color:var(--pt-ink-50);line-height:1}
.pt-cffoot{position:sticky;bottom:0;background:rgba(255,253,246,.97);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border-top:1px solid var(--pt-sand-line);padding:11px 16px calc(14px + env(safe-area-inset-bottom))}
.pt-cffoot__hint{font-size:11.5px;font-weight:700;color:var(--pt-ink-50);text-align:center;margin:0 0 9px;line-height:1.4}
.pt-filternote{margin:18px 2px 4px;padding:13px;border-radius:18px;border:1.5px dashed #E0D4BC;
  background:rgba(255,255,255,.55);text-align:center;font-size:12.5px;font-weight:800;color:var(--pt-ink-50);line-height:1.45}
.pt-filternote small{display:block;font-weight:700;color:var(--pt-ink-35);margin-top:4px;font-size:11.5px}

/* ═══════════════════════════════════════════════════════════════════
   v1.1 — CLASS FILM CARD (board)
   ═══════════════════════════════════════════════════════════════════ */
.pt-filmcard{
  background:linear-gradient(180deg,#FFFCF2 0%,#FFFFFF 62%);
  border:1.5px solid #F0E3C6;border-radius:var(--pt-r-card);
  padding:12px 13px;margin-top:12px;box-shadow:var(--pt-sh-card);
  display:grid;grid-template-columns:46px 1fr auto;gap:12px;align-items:center;cursor:pointer;
  width:100%;text-align:left;font-family:inherit;color:var(--pt-ink);
}
.pt-filmcard__ic{width:46px;height:46px;border-radius:16px;background:var(--pt-sky);display:grid;place-items:center;border:1.5px solid #DAEBF7}
.pt-filmcard__t{font-family:var(--pt-disp);font-weight:800;font-size:15.5px;line-height:1.15;letter-spacing:-.008em}
.pt-filmcard__s{font-size:12px;font-weight:700;color:var(--pt-ink-50);margin-top:4px;line-height:1.3}
.pt-filmcard__cta{font-family:var(--pt-disp);font-weight:800;font-size:13px;color:var(--pt-honey-deep);display:flex;align-items:center;gap:5px;white-space:nowrap}
.pt-filmcard__stripe{grid-column:1/-1;height:9px;border-radius:999px;margin-top:2px;
  background:repeating-linear-gradient(115deg,#F2B437 0 11px,#E8A317 11px 22px);opacity:.78}
.pt-filmcard--cook{background:linear-gradient(180deg,#FFF7E0 0%,#FFFBEF 70%);border-color:#F0DCA6}
.pt-filmcard--cook .pt-filmcard__ic{background:rgba(255,255,255,.85);border-color:#F0DCA6}
.pt-filmcard--sent{background:var(--pt-paper)}

/* ═══════════════════════════════════════════════════════════════════
   v1.1 — WHITE-LABEL BRANDING
   ═══════════════════════════════════════════════════════════════════ */
.pt-logoph{border-radius:999px;background:var(--pt-sky);border:1.5px solid #D5E8F5;display:grid;place-items:center;
  font-family:var(--pt-disp);font-weight:800;color:var(--pt-blue-deep);letter-spacing:.02em;flex:none}
.pt-brandmark{display:block;object-fit:cover;background:var(--pt-sky);flex:none}
.pt-schoolhero{display:flex;flex-direction:column;align-items:center}
.pt-schoolname{font-family:var(--pt-disp);font-weight:800;font-size:27px;letter-spacing:-.022em;margin:16px 0 0;line-height:1.1;text-align:center}
.pt-schoolsub{font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--pt-ink-35);margin:9px 0 0}
.pt-madewith{position:absolute;left:0;right:0;bottom:calc(22px + env(safe-area-inset-bottom));
  display:flex;align-items:center;justify-content:center;gap:7px;
  font-size:11.5px;font-weight:800;color:var(--pt-ink-35);letter-spacing:.01em}
.pt-brandbar__s{font-family:var(--pt-disp);font-weight:800;font-size:15px;line-height:1.1;letter-spacing:-.01em;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pt-brandbar__c{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:11.5px;font-weight:800;color:var(--pt-ink-50)}
.pt-previewcard{border:1.5px dashed #E0D4BC;border-radius:22px;padding:12px;background:rgba(255,255,255,.55);margin-bottom:12px}
.pt-previewcard__l{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--pt-ink-35);margin:0 2px 9px}
.pt-previewcard__in{border-radius:16px;overflow:hidden;border:1px solid var(--pt-sand-line);background:var(--pt-cream)}
.pt-lockchip{display:inline-flex;align-items:center;gap:5px;background:var(--pt-sand);color:var(--pt-ink-50);
  font-size:10px;font-weight:800;padding:5px 9px;border-radius:999px;white-space:nowrap;flex:none}
.pt-endrule{width:34px;height:3px;border-radius:999px;background:var(--pt-honey);margin:8px 0}
.pt-endclass{display:flex;align-items:center;gap:6px;font-family:var(--pt-disp);font-weight:800;font-size:13px}

/* ═══════════════════════════════════════════════════════════════════
   v1.1 — PARENT FEED v2
   ═══════════════════════════════════════════════════════════════════ */
.pt-mcard--class{background:linear-gradient(180deg,#FFFBEE 0%,#FFFFFF 55%);border-color:#F0E3C6;box-shadow:var(--pt-sh-lift)}
.pt-mcard__brand{display:flex;align-items:center;gap:9px;margin:2px 3px 11px}
.pt-mcard__brand .pt-t{flex:1;min-width:0}
.pt-mcard__brand .pt-t b{display:block;font-family:var(--pt-disp);font-weight:800;font-size:15px;line-height:1.15;letter-spacing:-.008em;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pt-mcard__brand .pt-t small{display:block;font-size:11.5px;font-weight:700;color:var(--pt-ink-50);margin-top:2px}
.pt-kindpill{font-size:9.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;
  padding:5px 9px;border-radius:999px;background:var(--pt-honey);color:var(--pt-ink);white-space:nowrap;flex:none}
.pt-kindpill--child{background:var(--pt-blue)}
.pt-player--class{background:var(--pt-butter-soft);border-color:#F3E2B6}
.pt-player--class .pt-frame916{width:214px}
.pt-newtag{position:absolute;left:8px;top:8px;z-index:2;background:var(--pt-butter);color:var(--pt-ink);
  font-size:9.5px;font-weight:800;letter-spacing:.12em;padding:4px 9px;border-radius:999px;box-shadow:0 2px 6px rgba(35,57,91,.22)}

/* ═══════════════════════════════════════════════════════════════════
   v1.1 — LIGHTBOX  (the one dark surface in the product)
   ═══════════════════════════════════════════════════════════════════ */
.pt-lb{position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;background:#1B2C47}
.pt-lb__bar{display:flex;align-items:center;gap:12px;padding:calc(14px + env(safe-area-inset-top)) 14px 10px}
.pt-lb__ic{width:48px;height:48px;flex:none;border-radius:16px;background:rgba(255,253,246,.13);display:grid;place-items:center;border:none;cursor:pointer}
.pt-lb__ic--danger{background:rgba(255,123,107,.24)}
.pt-lb__t{flex:1;text-align:center;min-width:0}
.pt-lb__t b{display:block;font-family:var(--pt-disp);font-weight:800;font-size:15px;color:#FFFDF6;line-height:1.1}
.pt-lb__t small{display:block;font-size:10.5px;font-weight:800;color:rgba(255,253,246,.5);margin-top:3px;letter-spacing:.06em}
.pt-lb__stage{flex:1;display:flex;align-items:center;justify-content:center;padding:6px 14px;position:relative;min-height:0}
.pt-lb__photo{width:100%;max-height:100%;background:#FFFDF6;padding:7px;border-radius:24px;overflow:hidden;
  box-shadow:0 26px 50px -26px rgba(0,0,0,.85);border:1px solid rgba(255,253,246,.1)}
.pt-lb__photo img{width:100%;max-height:60vh;object-fit:contain;display:block;border-radius:18px;background:#0d1b2a}
.pt-lb__nav{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:999px;
  background:rgba(27,44,71,.42);display:grid;place-items:center;backdrop-filter:blur(6px);z-index:3;cursor:pointer;
  box-shadow:0 2px 10px rgba(0,0,0,.28);border:1px solid rgba(255,253,246,.16)}
.pt-lb__nav:disabled{opacity:.3;cursor:default}
.pt-lbdots{display:flex;gap:5px;justify-content:center;align-items:center;margin:16px 0 0;flex-wrap:wrap;padding:0 16px}
.pt-lbdots i{width:6px;height:6px;border-radius:999px;background:rgba(255,253,246,.28);transition:width .2s ease}
.pt-lbdots i.pt-on{background:var(--pt-butter);width:20px}
.pt-lb__foot{padding:10px 16px calc(18px + env(safe-area-inset-bottom))}
.pt-lb__who{background:rgba(255,253,246,.09);border:1px solid rgba(255,253,246,.1);border-radius:20px;padding:12px}
.pt-lb__lbl{font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,253,246,.5);margin:0 0 10px}
.pt-lb__faces{display:flex;gap:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.pt-lb__faces::-webkit-scrollbar{display:none}
.pt-lb__face{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;padding:0;cursor:pointer;flex:none}
.pt-lb__face span{font-size:11px;font-weight:800;color:rgba(255,253,246,.82);max-width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pt-lb__add{width:38px;height:38px;border-radius:999px;border:2px dashed rgba(255,253,246,.28);display:grid;place-items:center}

/* ═══════════════════════════════════════════════════════════════════
   v1.2 — WARMTH / DELIGHT / DEPTH PASS
   Skin and soul only: no flow, layout or palette-family change.
   ═══════════════════════════════════════════════════════════════════ */
:root{
  /* Faint warm paper grain, composited INTO the cream — never over content.
     Inline SVG turbulence: it is a BACKGROUND, not an SVG filter on an
     element. Real filter primitives on scrolling content time out on older
     iPads; a background-blend does not. */
  --pt-grain:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.86' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='.16'/></svg>");
  /* two-layer shadow: a tight contact edge + a wide ambient fall */
  --pt-sh-card:0 1px 1.5px rgba(35,57,91,.07), 0 12px 24px -14px rgba(35,57,91,.30);
  --pt-sh-lift:0 2px 3px rgba(35,57,91,.09), 0 20px 34px -18px rgba(35,57,91,.40);
  --pt-sh-gold:0 2px 3px rgba(150,96,4,.22), 0 18px 30px -14px rgba(232,163,23,.62);
  --pt-sh-photo:0 1px 2px rgba(35,57,91,.13), 0 8px 16px -9px rgba(35,57,91,.40);
}
.pt-app{background-color:var(--pt-cream);background-image:var(--pt-grain);background-blend-mode:soft-light}

/* cards read as thick paper, not flat rectangles */
.pt-row,.pt-mcard,.pt-lrow,.pt-filmcard,.pt-photocard,.pt-previewcard{
  border-bottom-width:2.5px;border-bottom-color:#E7DAC0;
}

/* photos are the product — scrapbook treatment */
.pt-photocard{padding:6px;border-radius:22px;background:#FFFDF6}
.pt-photocard img{border-radius:17px}
.pt-photocard__chip{left:16px;top:16px;white-space:nowrap}
.pt-thumb{background:#FFFDF6;border:none;padding:4px;box-shadow:var(--pt-sh-photo)}
.pt-thumb img{border-radius:11px}
.pt-frame916{box-shadow:0 2px 4px rgba(35,57,91,.16), 0 22px 34px -20px rgba(35,57,91,.62)}

/* DELIGHT 1 — sunshine burst on "everyone's in the film" */
.pt-cfsum--ok,.pt-everyone{
  position:relative;overflow:hidden;padding:11px 13px;border-radius:16px;font-size:13px;
  background:radial-gradient(120px 60px at 16% 50%, #FFF0C6 0%, rgba(255,240,198,0) 72%), #FFFBEE;
  border:1.5px solid #F2E2BC;
}
.pt-everyone{display:flex;align-items:center;gap:8px;margin:12px 3px 0;font-weight:800;color:var(--pt-honey-deep)}
.pt-cfsum--ok::before,.pt-everyone::before{
  content:"";position:absolute;left:-16px;top:50%;width:74px;height:74px;margin-top:-37px;pointer-events:none;
  background:conic-gradient(from 0deg,
    rgba(255,212,102,.62) 0 7deg, rgba(255,212,102,0) 7deg 30deg,
    rgba(255,212,102,.62) 30deg 37deg, rgba(255,212,102,0) 37deg 60deg,
    rgba(255,212,102,.62) 60deg 67deg, rgba(255,212,102,0) 67deg 90deg,
    rgba(255,212,102,.62) 90deg 97deg, rgba(255,212,102,0) 97deg 120deg,
    rgba(255,212,102,.62) 120deg 127deg, rgba(255,212,102,0) 127deg 150deg,
    rgba(255,212,102,.62) 150deg 157deg, rgba(255,212,102,0) 157deg 180deg,
    rgba(255,212,102,.62) 180deg 187deg, rgba(255,212,102,0) 187deg 210deg,
    rgba(255,212,102,.62) 210deg 217deg, rgba(255,212,102,0) 217deg 240deg,
    rgba(255,212,102,.62) 240deg 247deg, rgba(255,212,102,0) 247deg 270deg,
    rgba(255,212,102,.62) 270deg 277deg, rgba(255,212,102,0) 277deg 300deg,
    rgba(255,212,102,.62) 300deg 307deg, rgba(255,212,102,0) 307deg 330deg,
    rgba(255,212,102,.62) 330deg 337deg, rgba(255,212,102,0) 337deg 360deg);
  -webkit-mask-image:radial-gradient(circle, rgba(0,0,0,0) 26%, #000 30%, #000 62%, rgba(0,0,0,0) 78%);
  mask-image:radial-gradient(circle, rgba(0,0,0,0) 26%, #000 30%, #000 62%, rgba(0,0,0,0) 78%);
}
.pt-cfsum--ok > *,.pt-everyone > *{position:relative;z-index:1}

/* DELIGHT 2 — the gold bar flip gets a shimmer */
.pt-bar--gold .pt-bar__fill{
  background:
    linear-gradient(102deg, rgba(255,255,255,0) 28%, rgba(255,255,255,.26) 47%, rgba(255,255,255,0) 66%),
    linear-gradient(180deg,#F2B437 0%,var(--pt-honey) 100%);
  background-repeat:no-repeat,no-repeat;
  background-size:42% 100%, 100% 100%;
  background-position:96% 0, 0 0;
  box-shadow:inset 0 -2px 0 rgba(150,96,4,.22);
}
.pt-sparks{width:26px;height:24px}
.pt-sparks i:nth-child(1){box-shadow:0 0 6px rgba(255,212,102,.9)}
/* cooking keeps its candy-stripe — it must never read as "ready" */
.pt-bar--gold.pt-bar--cooking .pt-bar__fill{
  background:repeating-linear-gradient(115deg,#F2B437 0 12px,#E8A317 12px 24px);opacity:.72;
}

/* DELIGHT 3 — the film CTA glows */
.pt-cffoot .pt-btn--primary:not(:disabled),
.pt-rowact .pt-btn--primary{
  box-shadow:0 0 0 4px rgba(255,212,102,.34), 0 2px 3px rgba(150,96,4,.22), 0 16px 26px -12px rgba(232,163,23,.72);
}

/* RADICAL SIMPLICITY — touch targets never under 48px */
.pt-iconbtn{width:48px;height:48px;border-radius:16px}
.pt-btn--md{height:48px}
.pt-btn--sm{height:40px}
.pt-watch{min-height:44px;display:inline-flex;align-items:center}
.pt-thumb__x{width:36px;height:36px}

/* bigger primary numbers */
.pt-chip{font-size:14px;font-weight:800;min-height:30px;padding:0 13px;display:inline-flex;align-items:center;gap:4px}
.pt-chip--gold{font-size:15px}

/* empty state: the mascot does the encouraging */
.pt-emptyhint{display:flex;align-items:center;justify-content:center;gap:8px;margin:9px 0 0;
  font-size:12.5px;font-weight:700;color:var(--pt-ink-35)}
.pt-emptyhint svg{flex:none;opacity:.9}

@media (prefers-reduced-motion: reduce){
  .pt-root *{animation:none !important;transition:none !important}
  .pt-pth{transform:none !important}
}
`;
