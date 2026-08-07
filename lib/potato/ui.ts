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

@media (prefers-reduced-motion: reduce){
  .pt-root *{animation:none !important;transition:none !important}
}
`;
