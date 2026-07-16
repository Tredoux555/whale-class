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
  glass: 'rgba(255,255,255,0.028)',
  glassEdge: 'rgba(255,255,255,0.08)',
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
    radial-gradient(ellipse 900px 700px at 50% -8%, rgba(39,129,90,0.14), rgba(39,129,90,0) 60%),
    radial-gradient(ellipse 1400px 900px at 50% 115%, rgba(6,26,17,0.45), rgba(6,26,17,0) 60%),
    linear-gradient(168deg,#071510 0%,#051009 45%,#030b08 100%);
}
.fn-page ::selection{background:rgba(232,201,106,0.25)}
.fn-page button{cursor:pointer; font-family:${FT.sans}}
.fn-page input{font-family:${FT.sans}}
.fn-page :focus-visible{outline:2px solid rgba(232,201,106,0.6); outline-offset:2px; border-radius:6px}

/* topbar */
.fn-topbar{position:relative; z-index:5; display:flex; align-items:center; justify-content:space-between;
  padding:calc(16px + env(safe-area-inset-top, 0px)) 30px 8px}
.fn-wordmark{display:flex; align-items:center; gap:11px; text-decoration:none}
.fn-wordmark img{width:22px; height:auto}
.fn-wordmark span{font-family:${FT.serif}; font-weight:500; font-size:1.1rem; letter-spacing:0.02em;
  color:rgba(232,201,106,0.85)}

/* golden thread */
.fn-thread{position:relative; z-index:5; display:flex; justify-content:center; padding:14px 24px 0}
.fn-thread-inner{display:flex; align-items:flex-start; width:min(880px,92%)}
.fn-tnode{display:flex; flex-direction:column; align-items:center; gap:6px; width:20px}
.fn-tdot{width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,0.14); transition:all .2s ease}
.fn-tnode.done .fn-tdot{background:${FT.gold}; width:5px; height:5px}
.fn-tnode.now .fn-tdot{background:${FT.gold}}
.fn-tlabel{font-size:0.58rem; letter-spacing:0.12em; color:rgba(255,255,255,0.22); white-space:nowrap; text-transform:uppercase}
.fn-tnode.now .fn-tlabel{color:rgba(232,201,106,0.7)}
.fn-tnode.done .fn-tlabel{color:rgba(232,201,106,0.4)}
.fn-tline{flex:1; height:1px; background:rgba(255,255,255,0.06); margin-top:2px}
.fn-tline.lit{background:rgba(232,201,106,0.22)}
.fn-thread-compact{display:none; font-size:0.7rem; letter-spacing:0.14em; color:rgba(232,201,106,0.7); text-transform:uppercase}

/* layout: narrator left, stage right */
.fn-hall{position:relative; z-index:4; display:grid; grid-template-columns:322px 1fr; gap:0;
  max-width:1340px; margin:0 auto; padding:32px 36px 72px; align-items:start}
.fn-stage-wrap{display:flex; justify-content:center; min-height:calc(100vh - 210px); width:100%}

/* the narrator (Astra / Guru, top-left) — a quiet figure, not a card */
.fn-narrator{position:sticky; top:24px; width:268px;
  background:transparent; border:none; border-left:1px solid rgba(232,201,106,0.25); border-radius:0;
  backdrop-filter:none; -webkit-backdrop-filter:none; box-shadow:none;
  padding:2px 0 2px 16px}
.fn-n-head{display:flex; align-items:center; gap:10px; margin-bottom:12px}
.fn-n-avatar{width:24px; height:24px; border-radius:50%; flex:none;
  display:flex; align-items:center; justify-content:center;
  font-family:${FT.serif}; font-weight:600; font-size:0.78rem}
.fn-n-avatar.astra{background:#b99a4e; color:${FT.inkOnGold}}
.fn-n-avatar.guru{background:#1D6B48; color:#04150c}
.fn-n-name{font-family:${FT.serif}; font-size:0.9rem; color:rgba(240,214,138,0.95); letter-spacing:0.02em}
.fn-n-name.guru{color:rgba(167,230,200,0.95)}
.fn-n-role{font-size:0.6rem; letter-spacing:0.14em; text-transform:uppercase; color:${FT.hush}}
.fn-n-say{font-size:0.88rem; line-height:1.7; color:rgba(255,250,240,0.72)}
.fn-n-say b{color:rgba(232,201,106,0.8); font-weight:500}
.fn-n-ask{margin-top:14px}
.fn-n-ask-btn{display:inline-flex; align-items:center; gap:6px;
  background:none; border:none; padding:0; color:rgba(52,211,153,0.75);
  font-size:0.8rem; letter-spacing:0.01em}
.fn-n-ask-btn:hover{text-decoration:underline}
.fn-n-ask-btn .dots{color:rgba(52,211,153,0.75); letter-spacing:2px; font-weight:600}
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
.fn-n-input{flex:1; min-width:0; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10);
  border-radius:10px; padding:9px 12px; color:${FT.voice}; font-size:0.84rem}
.fn-n-input::placeholder{color:${FT.hush}}
.fn-n-input:focus{outline:none; border-color:rgba(232,201,106,0.45)}
.fn-n-send{background:transparent; border:1px solid rgba(232,201,106,0.35); color:rgba(232,201,106,0.9);
  border-radius:10px; padding:9px 15px; font-weight:500; font-size:0.82rem; flex:none; transition:background .16s ease}
.fn-n-send:hover{background:rgba(232,201,106,0.06)}
.fn-n-send:disabled{opacity:0.5; cursor:not-allowed}

/* stage & screens */
.fn-screen{width:100%; max-width:820px; animation:fnRiseIn .26s ease both; padding:8px 10px 48px}
.fn-screen.center{display:flex; flex-direction:column; align-items:center; text-align:center}
@keyframes fnRiseIn{from{opacity:0; transform:translateY(7px)}to{opacity:1; transform:none}}
@keyframes fnSpin{to{transform:rotate(360deg)}}

.fn-eyebrow{font-size:0.62rem; letter-spacing:0.3em; text-transform:uppercase; color:rgba(232,201,106,0.55); margin-bottom:14px}
.fn-h1{font-family:${FT.serif}; font-weight:400; font-size:2.15rem; line-height:1.12; letter-spacing:0.005em; color:${FT.voice}}
.fn-h2{font-family:${FT.serif}; font-weight:400; font-size:1.7rem; line-height:1.16; color:${FT.voice}}

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

/* pills — flat, quiet primary action */
.fn-pill{display:inline-flex; align-items:center; justify-content:center; gap:8px; border-radius:10px;
  border:1px solid rgba(255,255,255,0.08); background:#1D5C41; color:#fff; font-weight:500; font-size:0.92rem;
  padding:13px 26px; transition:background .16s ease}
.fn-pill:hover{background:#236B4C}
.fn-pill:disabled{opacity:0.5; cursor:not-allowed}
.fn-pill.gold{background:transparent; border-color:rgba(232,201,106,0.35); color:rgba(232,201,106,0.9)}
.fn-pill.gold:hover{background:rgba(232,201,106,0.06)}
.fn-pill.ghost{background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.14); color:${FT.voice}; font-weight:500}
.fn-pill.ghost:hover{background:rgba(255,255,255,0.08)}
.fn-pill.block{width:100%}
.fn-backlink{display:inline-block; color:${FT.hush}; font-size:0.86rem; text-decoration:none; cursor:pointer; margin-bottom:22px; background:none; border:none; padding:0; font-family:${FT.sans}}
.fn-backlink:hover{color:${FT.whisper}}

/* ceremony — just the line, no mark, no rings */
.fn-cere-line{font-family:${FT.serif}; font-style:italic; font-size:1.05rem; color:rgba(255,250,240,0.6); min-height:2em}
.fn-cere-bar{width:min(340px,80%); height:2px; border-radius:3px; background:rgba(255,255,255,0.09); margin:26px auto 0; overflow:hidden}
.fn-cere-bar i{display:block; height:100%; width:0%; border-radius:3px; background:rgba(232,201,106,0.6); transition:width .5s ease}

/* the key */
.fn-keyplate{width:min(560px,100%); margin:34px auto 0; text-align:center; position:relative;
  background:rgba(255,255,255,0.028);
  border:1px solid rgba(232,201,106,0.25); border-radius:14px; padding:32px 30px;
  box-shadow:none}
.fn-keyplate .fn-eyebrow{margin-bottom:20px}
.fn-thekey{font-family:ui-monospace,Menlo,monospace; font-size:2.2rem; font-weight:600; letter-spacing:0.34em;
  color:#E8C96A; margin-left:0.34em; word-break:break-all}
.fn-keybtns{display:flex; gap:12px; justify-content:center; margin-top:30px; flex-wrap:wrap}

/* error glass */
.fn-error{margin-top:16px; padding:14px 16px; background:rgba(239,68,68,0.10); border:1px solid rgba(239,68,68,0.3);
  border-radius:14px; color:rgba(252,165,165,0.95); font-size:0.86rem; text-align:left}
.fn-error pre{white-space:pre-wrap; word-break:break-word; font-family:ui-monospace,Menlo,monospace; font-size:0.76rem; margin:0}
.fn-error button{margin-top:10px; background:none; border:none; color:rgba(252,165,165,0.9); text-decoration:underline; font-size:0.82rem; cursor:pointer}

.fn-foot{position:relative; z-index:4; text-align:center; padding:10px 0 26px; color:rgba(255,250,240,0.22); font-size:0.76rem}

/* login-select — glass card + mono code input */
.fn-login-card{background:${FT.glass}; border:1px solid ${FT.glassEdge}; border-radius:14px; padding:30px 28px;
  backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); box-shadow:none}
.fn-code-input{width:100%; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.12);
  border-radius:14px; padding:16px; color:${FT.voice}; text-align:center; font-size:1.6rem;
  font-family:ui-monospace,Menlo,monospace; letter-spacing:0.3em; transition:border-color .16s ease}
.fn-code-input::placeholder{color:rgba(255,255,255,0.18)}
.fn-code-input:focus{outline:none; border-color:rgba(232,201,106,0.4); box-shadow:none}
.fn-login-hint{margin-top:18px; font-size:0.84rem; line-height:1.6; color:rgba(255,250,240,0.55); text-align:center}
.fn-login-hint b{color:rgba(232,201,106,0.75); font-weight:500}
.fn-login-link{color:rgba(52,211,153,0.6); font-size:0.86rem; text-decoration:none}
.fn-login-link:hover{color:rgba(52,211,153,0.85)}
.fn-login-link.muted{color:rgba(255,250,240,0.3); font-size:0.78rem}
.fn-login-link.muted:hover{color:rgba(255,250,240,0.5)}

/* responsive */
@media (prefers-reduced-motion:reduce){
  .fn-n-typing i, .fn-screen, .fn-n-answer, .fn-bloom{animation:none !important}
}
@media (max-width:1040px){
  .fn-hall{grid-template-columns:1fr; padding:18px 18px 50px}
  .fn-narrator{position:relative; top:0; width:100%; margin-bottom:22px}
  .fn-h1{font-size:1.85rem} .fn-h2{font-size:1.45rem}
  .fn-thekey{font-size:1.9rem}
}
@media (max-width:820px){
  .fn-thread-inner{display:none} .fn-thread-compact{display:block; padding:6px 0 2px}
}
`;
