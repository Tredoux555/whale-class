// components/montree/funnel/funnel-theme.ts
//
// Lanternlight Ceremony — shared theme tokens + global CSS for the first-touch
// funnel (/try, /principal/setup, /login-select narrator hint).
//
// Transcribed from the approved mock (docs/design/FUNNEL_VISION_JUL16.html
// :root + key styles) and the design law
// (docs/design/DESIGN_PHILOSOPHY_LANTERNLIGHT_CEREMONY.md).
//
// Usage: each funnel page injects `FUNNEL_CSS` ONCE via a plain
//   <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />
// (App Router: NEVER <style jsx> on these pages — landing-page CLS precedent).
// Components (GoldenThread / AstraNarrator) use the `fn-*` classes below plus
// `FT` inline tokens where a value must be dynamic.

export const FT = {
  bg: '#030b08',
  gold: '#E8C96A',
  goldDeep: '#cfa93f',
  inkOnGold: '#1a1208',
  emerald: '#2f9e6e',
  emeraldHi: '#34d399',
  voice: 'rgba(255,250,240,0.92)',
  whisper: 'rgba(255,250,240,0.58)',
  hush: 'rgba(255,250,240,0.34)',
  glass: 'rgba(3,10,7,0.62)',
  glassEdge: 'rgba(52,211,153,0.12)',
  action: 'linear-gradient(180deg,#27815a,#1D6B48)',
  serif: "'Lora', Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
} as const;

// Single global stylesheet for the funnel. Class-based (all `fn-` prefixed) so
// it never collides with other surfaces; keyframes included. Injected once per
// page.
export const FUNNEL_CSS = `
.fn-page{
  min-height:100vh; position:relative; overflow-x:hidden;
  color:${FT.voice}; font-family:${FT.sans};
  background:
    radial-gradient(ellipse 900px 700px at 50% -8%, rgba(39,129,90,0.30), rgba(39,129,90,0) 60%),
    radial-gradient(ellipse 1400px 900px at 50% 115%, rgba(6,26,17,0.9), rgba(6,26,17,0) 60%),
    linear-gradient(168deg,#071510 0%,#051009 45%,#030b08 100%);
}
.fn-page::after{ /* vignette — the room is dark at its edges */
  content:''; position:fixed; inset:0; pointer-events:none; z-index:1;
  background:radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgba(1,5,3,0.55) 100%);
}
.fn-page ::selection{background:rgba(232,201,106,0.25)}
.fn-page button{cursor:pointer; font-family:${FT.sans}}
.fn-page input{font-family:${FT.sans}}
.fn-page :focus-visible{outline:2px solid rgba(232,201,106,0.6); outline-offset:2px; border-radius:6px}

/* topbar */
.fn-topbar{position:relative; z-index:5; display:flex; align-items:center; justify-content:space-between;
  padding:calc(16px + env(safe-area-inset-top, 0px)) 30px 8px}
.fn-wordmark{display:flex; align-items:center; gap:11px; text-decoration:none}
.fn-wordmark img{width:30px; height:auto; filter:drop-shadow(0 2px 8px rgba(232,201,106,0.28))}
.fn-wordmark span{font-family:${FT.serif}; font-weight:500; font-size:1.1rem; letter-spacing:0.02em;
  background:linear-gradient(90deg,#e9d9a8,#c9a94f); -webkit-background-clip:text; background-clip:text; color:transparent}

/* golden thread */
.fn-thread{position:relative; z-index:5; display:flex; justify-content:center; padding:16px 24px 0}
.fn-thread-inner{display:flex; align-items:flex-start; width:min(880px,92%)}
.fn-tnode{display:flex; flex-direction:column; align-items:center; gap:8px; width:20px}
.fn-tdot{width:9px; height:9px; border-radius:50%; background:rgba(255,255,255,0.14); transition:all .2s ease}
.fn-tnode.done .fn-tdot{background:${FT.gold}; width:8px; height:8px}
.fn-tnode.now .fn-tdot{background:${FT.gold}; box-shadow:0 0 0 4px rgba(232,201,106,0.13), 0 0 18px rgba(232,201,106,0.55)}
.fn-tlabel{font-size:0.66rem; letter-spacing:0.08em; color:${FT.hush}; white-space:nowrap; text-transform:uppercase}
.fn-tnode.now .fn-tlabel{color:${FT.gold}}
.fn-tnode.done .fn-tlabel{color:rgba(232,201,106,0.45)}
.fn-tline{flex:1; height:1px; background:rgba(255,255,255,0.10); margin-top:4px}
.fn-tline.lit{background:linear-gradient(90deg, rgba(232,201,106,0.55), rgba(232,201,106,0.18))}
.fn-thread-compact{display:none; font-size:0.72rem; letter-spacing:0.14em; color:${FT.gold}; text-transform:uppercase}

/* layout: narrator left, stage right */
.fn-hall{position:relative; z-index:4; display:grid; grid-template-columns:322px 1fr; gap:0;
  max-width:1340px; margin:0 auto; padding:26px 30px 60px; align-items:start}
.fn-stage-wrap{display:flex; justify-content:center; min-height:calc(100vh - 210px); width:100%}

/* the narrator (Astra / Guru, top-left) */
.fn-narrator{position:sticky; top:24px; width:292px;
  background:linear-gradient(180deg, rgba(8,18,12,0.78), rgba(4,11,7,0.72));
  border:1px solid rgba(232,201,106,0.16); border-radius:20px;
  backdrop-filter:blur(20px) saturate(140%); -webkit-backdrop-filter:blur(20px) saturate(140%);
  box-shadow:0 24px 60px -24px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
  padding:18px 18px 14px}
.fn-n-head{display:flex; align-items:center; gap:10px; margin-bottom:12px}
.fn-n-avatar{width:34px; height:34px; border-radius:50%; flex:none;
  display:flex; align-items:center; justify-content:center;
  font-family:${FT.serif}; font-weight:600; font-size:1.05rem}
.fn-n-avatar.astra{background:linear-gradient(145deg,#E8C96A,#b9932f); color:${FT.inkOnGold};
  box-shadow:0 3px 12px rgba(232,201,106,0.35), inset 0 1px 0 rgba(255,255,255,0.5)}
.fn-n-avatar.guru{background:linear-gradient(145deg,#34d399,#1D6B48); color:#04150c;
  box-shadow:0 3px 12px rgba(52,211,153,0.3), inset 0 1px 0 rgba(255,255,255,0.35)}
.fn-n-name{font-family:${FT.serif}; font-size:0.98rem; color:rgba(240,214,138,0.95); letter-spacing:0.02em}
.fn-n-name.guru{color:rgba(167,230,200,0.95)}
.fn-n-role{font-size:0.66rem; letter-spacing:0.14em; text-transform:uppercase; color:${FT.hush}}
.fn-n-say{font-size:0.9rem; line-height:1.62; color:rgba(255,250,240,0.82)}
.fn-n-say b{color:${FT.gold}; font-weight:600}
.fn-n-ask{margin-top:14px}
.fn-n-ask-btn{display:flex; align-items:center; gap:8px; width:100%;
  background:rgba(52,211,153,0.07); border:1px solid rgba(52,211,153,0.22); color:#a7e6c8;
  border-radius:12px; padding:9px 13px; font-size:0.82rem; letter-spacing:0.01em; transition:all .18s ease}
.fn-n-ask-btn:hover{background:rgba(52,211,153,0.13); transform:translateY(-1px)}
.fn-n-ask-btn .dots{color:${FT.emeraldHi}; letter-spacing:2px; font-weight:600}
.fn-n-chat{margin-top:10px}
.fn-n-answer{font-size:0.84rem; line-height:1.6; color:rgba(255,250,240,0.78);
  background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
  border-radius:12px; padding:11px 13px; margin-bottom:9px; animation:fnRiseIn .28s ease both}
.fn-n-typing{padding:10px 13px; color:${FT.whisper}; font-size:0.84rem}
.fn-n-typing i{display:inline-block; width:5px; height:5px; border-radius:50%; background:${FT.gold};
  margin-right:4px; animation:fnBlink 1.1s infinite; font-style:normal}
.fn-n-typing i:nth-child(2){animation-delay:.18s} .fn-n-typing i:nth-child(3){animation-delay:.36s}
@keyframes fnBlink{0%,100%{opacity:0.25}45%{opacity:1}}
.fn-n-row{display:flex; gap:7px}
.fn-n-input{flex:1; min-width:0; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.10);
  border-radius:10px; padding:9px 12px; color:${FT.voice}; font-size:0.84rem}
.fn-n-input::placeholder{color:${FT.hush}}
.fn-n-input:focus{outline:none; border-color:rgba(232,201,106,0.45)}
.fn-n-send{background:linear-gradient(135deg,${FT.gold},${FT.goldDeep}); color:${FT.inkOnGold};
  border:none; border-radius:10px; padding:9px 15px; font-weight:600; font-size:0.82rem; flex:none}
.fn-n-send:disabled{opacity:0.5; cursor:not-allowed}

/* stage & screens */
.fn-screen{width:100%; max-width:820px; animation:fnRiseIn .26s ease both; padding:6px 8px 40px}
.fn-screen.center{display:flex; flex-direction:column; align-items:center; text-align:center}
@keyframes fnRiseIn{from{opacity:0; transform:translateY(7px)}to{opacity:1; transform:none}}
@keyframes fnSpin{to{transform:rotate(360deg)}}

.fn-eyebrow{font-size:0.7rem; letter-spacing:0.26em; text-transform:uppercase; color:rgba(232,201,106,0.75); margin-bottom:14px}
.fn-h1{font-family:${FT.serif}; font-weight:500; font-size:3.1rem; line-height:1.12; letter-spacing:-0.01em; color:${FT.voice}}
.fn-h2{font-family:${FT.serif}; font-weight:500; font-size:2.35rem; line-height:1.16; color:${FT.voice}}

/* hero M — the ONE halo */
.fn-hero-m{position:relative; width:188px; margin:10px auto 24px}
.fn-hero-m img{width:100%; height:auto; display:block; position:relative; z-index:2;
  filter:drop-shadow(0 18px 40px rgba(0,0,0,0.75)) drop-shadow(0 3px 18px rgba(232,201,106,0.25))}
.fn-hero-m::before{content:''; position:absolute; inset:-34%; border-radius:50%; z-index:1;
  background:radial-gradient(circle, rgba(232,201,106,0.15) 0%, rgba(232,201,106,0.05) 46%, transparent 70%);
  border:1px solid rgba(232,201,106,0.08);
  box-shadow:0 0 70px -12px rgba(232,201,106,0.4), inset 0 0 50px -20px rgba(232,201,106,0.2);
  animation:fnBreathe 5600ms ease-in-out infinite}
@keyframes fnBreathe{0%,100%{opacity:0.8}50%{opacity:1}}

/* role cards */
.fn-roles{display:grid; grid-template-columns:1fr 1.14fr 1fr; gap:16px; width:100%; margin-top:28px; align-items:stretch}
.fn-rcard{position:relative; text-align:left; background:${FT.glass}; border:1px solid ${FT.glassEdge};
  border-radius:18px; padding:24px 22px 22px; backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
  transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease; cursor:pointer; color:inherit; width:100%; display:block}
.fn-rcard:hover{transform:translateY(-3px); border-color:rgba(52,211,153,0.3)}
.fn-rcard .fn-ric{font-size:1.7rem; margin-bottom:12px; display:block}
.fn-rcard h3{font-family:${FT.serif}; font-weight:500; font-size:1.32rem; margin-bottom:7px; color:${FT.voice}}
.fn-rcard p{font-size:0.87rem; line-height:1.55; color:${FT.whisper}}
.fn-rcard.goldcard{border-color:rgba(232,201,106,0.5);
  box-shadow:0 0 0 1px rgba(232,201,106,0.13), 0 22px 50px -22px rgba(232,201,106,0.28);
  background:linear-gradient(180deg, rgba(20,16,6,0.35), rgba(3,10,7,0.62))}
.fn-rcard.goldcard:hover{border-color:rgba(232,201,106,0.75); transform:translateY(-4px)}
.fn-rbadge{position:absolute; top:-12px; left:50%; transform:translateX(-50%);
  background:linear-gradient(135deg,${FT.gold},${FT.goldDeep}); color:${FT.inkOnGold};
  font-size:0.64rem; font-weight:600; letter-spacing:0.16em; text-transform:uppercase;
  border-radius:999px; padding:5px 13px; white-space:nowrap}
.fn-rgo{margin-top:14px; display:inline-block; font-size:0.9rem; font-weight:600; color:${FT.gold}}

/* form pieces */
.fn-field{margin-bottom:22px; text-align:left; width:100%}
.fn-field label{display:block; font-size:0.82rem; color:${FT.whisper}; margin-bottom:8px; letter-spacing:0.02em}
.fn-field label i{font-style:normal; color:${FT.hush}}
.fn-input{width:100%; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.11);
  border-radius:13px; padding:15px 17px; color:${FT.voice}; font-size:1.02rem; transition:border-color .16s ease}
.fn-input:focus{outline:none; border-color:rgba(52,211,153,0.5); box-shadow:0 0 0 3px rgba(52,211,153,0.08)}
.fn-input::placeholder{color:${FT.hush}}
.fn-slug{margin-top:9px; font-family:ui-monospace,Menlo,monospace; font-size:0.82rem; color:${FT.hush}}
.fn-slug b{color:${FT.gold}; font-weight:500}

/* pills */
.fn-pill{display:inline-flex; align-items:center; justify-content:center; gap:8px; border-radius:999px;
  border:1px solid rgba(130,217,174,0.18); background:${FT.action}; color:#fff; font-weight:600; font-size:0.98rem;
  padding:15px 30px; transition:transform .16s ease, filter .16s ease;
  box-shadow:0 1px 0 rgba(130,217,174,0.22) inset, 0 0 0 1px rgba(0,0,0,0.25) inset, 0 12px 30px -12px rgba(0,0,0,0.9)}
.fn-pill:hover{transform:translateY(-1px); filter:brightness(1.07)}
.fn-pill:disabled{opacity:0.5; cursor:not-allowed; transform:none; filter:none}
.fn-pill.gold{background:linear-gradient(135deg,${FT.gold},${FT.goldDeep}); color:${FT.inkOnGold}; border-color:rgba(232,201,106,0.4)}
.fn-pill.ghost{background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.14); color:${FT.voice}; font-weight:500}
.fn-pill.block{width:100%}
.fn-backlink{display:inline-block; color:${FT.hush}; font-size:0.86rem; text-decoration:none; cursor:pointer; margin-bottom:22px; background:none; border:none; padding:0; font-family:${FT.sans}}
.fn-backlink:hover{color:${FT.whisper}}
.fn-backlink.disabled{opacity:0.5; cursor:not-allowed}

/* ceremony */
.fn-cere-m{position:relative; width:170px; margin:60px auto 34px}
.fn-cere-m img{width:100%; height:auto; position:relative; z-index:2; filter:drop-shadow(0 14px 34px rgba(0,0,0,0.8))}
.fn-cere-ring{position:absolute; inset:-26%; border-radius:50%; border:1px solid rgba(232,201,106,0.35); animation:fnRingout 2.6s ease-out infinite}
.fn-cere-ring.r2{animation-delay:1.3s}
@keyframes fnRingout{0%{transform:scale(0.72); opacity:0.55}100%{transform:scale(1.28); opacity:0}}
.fn-cere-line{font-family:${FT.serif}; font-style:italic; font-size:1.35rem; color:rgba(255,250,240,0.8); min-height:2em}
.fn-cere-bar{width:min(340px,80%); height:3px; border-radius:3px; background:rgba(255,255,255,0.09); margin:26px auto 0; overflow:hidden}
.fn-cere-bar i{display:block; height:100%; width:0%; border-radius:3px; background:linear-gradient(90deg,${FT.gold},#f3e0a0); transition:width .5s ease}

/* the key */
.fn-keyplate{width:min(560px,100%); margin:34px auto 0; text-align:center; position:relative;
  background:linear-gradient(180deg, rgba(16,13,5,0.55), rgba(3,10,7,0.68));
  border:1px solid rgba(232,201,106,0.55); border-radius:22px; padding:40px 34px 34px;
  box-shadow:0 0 0 1px rgba(232,201,106,0.12), 0 30px 80px -30px rgba(232,201,106,0.28), inset 0 1px 0 rgba(255,255,255,0.06)}
.fn-keyplate .fn-eyebrow{margin-bottom:20px}
.fn-thekey{font-family:ui-monospace,Menlo,monospace; font-size:3rem; font-weight:600; letter-spacing:0.34em;
  color:${FT.gold}; text-shadow:0 0 26px rgba(232,201,106,0.35); margin-left:0.34em; word-break:break-all}
.fn-keybtns{display:flex; gap:12px; justify-content:center; margin-top:30px; flex-wrap:wrap}

/* error glass */
.fn-error{margin-top:16px; padding:14px 16px; background:rgba(239,68,68,0.10); border:1px solid rgba(239,68,68,0.3);
  border-radius:14px; color:rgba(252,165,165,0.95); font-size:0.86rem; text-align:left}
.fn-error pre{white-space:pre-wrap; word-break:break-word; font-family:ui-monospace,Menlo,monospace; font-size:0.76rem; margin:0}
.fn-error button{margin-top:10px; background:none; border:none; color:rgba(252,165,165,0.9); text-decoration:underline; font-size:0.82rem; cursor:pointer}

.fn-foot{position:relative; z-index:4; text-align:center; padding:10px 0 26px; color:rgba(255,250,240,0.22); font-size:0.76rem}

/* login-select — glass card + mono code input */
.fn-login-card{background:${FT.glass}; border:1px solid ${FT.glassEdge}; border-radius:20px; padding:30px 28px;
  backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
  box-shadow:0 24px 60px -24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)}
.fn-code-input{width:100%; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.12);
  border-radius:14px; padding:16px; color:${FT.voice}; text-align:center; font-size:1.6rem;
  font-family:ui-monospace,Menlo,monospace; letter-spacing:0.3em; transition:border-color .16s ease}
.fn-code-input::placeholder{color:rgba(255,255,255,0.18)}
.fn-code-input:focus{outline:none; border-color:rgba(232,201,106,0.55); box-shadow:0 0 0 3px rgba(232,201,106,0.10)}
.fn-login-hint{margin-top:18px; font-size:0.84rem; line-height:1.6; color:rgba(255,250,240,0.55); text-align:center}
.fn-login-hint b{color:rgba(232,201,106,0.75); font-weight:500}
.fn-login-link{color:rgba(52,211,153,0.6); font-size:0.86rem; text-decoration:none}
.fn-login-link:hover{color:rgba(52,211,153,0.85)}
.fn-login-link.muted{color:rgba(255,250,240,0.3); font-size:0.78rem}
.fn-login-link.muted:hover{color:rgba(255,250,240,0.5)}

/* responsive */
@media (prefers-reduced-motion:reduce){
  .fn-hero-m::before, .fn-cere-ring, .fn-n-typing i, .fn-screen, .fn-n-answer{animation:none !important}
}
@media (max-width:1040px){
  .fn-hall{grid-template-columns:1fr; padding:18px 18px 50px}
  .fn-narrator{position:relative; top:0; width:100%; margin-bottom:22px}
  .fn-roles{grid-template-columns:1fr}
  .fn-rcard.goldcard{order:-1}
  .fn-h1{font-size:2.5rem} .fn-h2{font-size:1.85rem}
  .fn-thekey{font-size:2.1rem}
}
@media (max-width:820px){
  .fn-thread-inner{display:none} .fn-thread-compact{display:block; padding:6px 0 2px}
}
`;
