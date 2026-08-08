import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  Easing,
  continueRender,
  delayRender,
} from 'remotion';
import {
  computeTimeline,
  kenBurns,
  FADE,
  FPS,
  Branding,
  MontageProps,
} from './timing';

// --- Potato Snaps palette (contract §9 / design spec tokens) -------------
// The anti-Montree register: cream page, honey/butter warmth, baby blue,
// ink-navy type. NOTHING dark-forest, NOTHING Lanternlight gold-on-black.
const CREAM = '#FFFDF6';
const HONEY = '#E8A317';
const BUTTER = '#FFD466';
const BABY_BLUE = '#9ED2F0';
const SKY = '#EAF6FD';
const SKY_LINE = '#D5E8F5';
const BLUE_DEEP = '#3E93C4';
const INK = '#23395B';
const INK_50 = 'rgba(35,57,91,.50)';
const INK_35 = 'rgba(35,57,91,.35)';

// Font stack: Baloo 2 (display) with Nunito as the body companion, plus a
// Noto Serif SC fallback for CJK names. Every face is loaded optionally — a
// missing file degrades to the system sans, never hangs a render.
const FONT_STACK =
  "'Baloo 2', 'Nunito', 'Noto Serif SC', system-ui, -apple-system, sans-serif";

const easeInOut = Easing.bezier(0.42, 0, 0.58, 1);
const easeOut = Easing.out(Easing.cubic);

const secToFrame = (s: number) => s * FPS;

// The end card is specified in the design spec against a 300px-wide mock of
// the 1080-wide frame. Every measurement below is the spec value x this.
const S = 1080 / 300; // 3.6

// ---------- optional asset preloader (tolerant of missing dev assets) ----------
type AssetState = 'loading' | 'ok' | 'error';

/**
 * Preload an optional public asset. `file` may be null (nothing to load) —
 * the hook still runs unconditionally so the rules of hooks hold, it just
 * never registers a delayRender handle in that case.
 */
function useOptionalImage(file: string | null): AssetState {
  const [state, setState] = React.useState<AssetState>(
    file ? 'loading' : 'error'
  );
  const [handle] = React.useState<number | null>(() =>
    file ? delayRender(`img:${file}`) : null
  );
  React.useEffect(() => {
    if (!file || handle === null) return;
    const img = new window.Image();
    img.onload = () => {
      setState('ok');
      continueRender(handle);
    };
    img.onerror = () => {
      // Missing in dev (before prepare-assets), or a branding upload that has
      // since been deleted → skip cleanly, never hang.
      setState('error');
      continueRender(handle);
    };
    img.src = staticFile(file);
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [file, handle]);
  return state;
}

// Register the type faces. Each is independent + catches, so a missing face
// never hangs a render — the font-family stack degrades gracefully.
// 🚨 The weight RANGE matters: the design's display weight is 800, and a
// FontFace declared '400 700' would clamp Baloo 2's variable axis at 700.
function useFonts() {
  const [handle] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    const load = (family: string, file: string, weight: string) => {
      const face = new FontFace(family, `url(${staticFile(file)})`, { weight });
      return face
        .load()
        .then((f) => document.fonts.add(f))
        .catch((e) => console.warn(`${family} not loaded`, e));
    };

    Promise.all([
      load('Baloo 2', 'Baloo2.ttf', '400 800'),
      load('Nunito', 'Nunito.ttf', '400 900'),
      load('Noto Serif SC', 'NotoSerifSC-Regular.otf', '400 700'),
    ]).finally(() => continueRender(handle));
  }, [handle]);
}

// ---------- shared warm grade + vignette (pre-baked PNG = cheap) ----------
const WarmGrade: React.FC = () => {
  const state = useOptionalImage('overlay.png');
  if (state !== 'ok') return null;
  return (
    <Img
      src={staticFile('overlay.png')}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
};

// ---------- one photo layer with Ken Burns + crossfade ----------
const PhotoLayer: React.FC<{
  file: string;
  index: number;
  startSec: number;
  endSec: number;
}> = ({ file, index, startSec, endSec }) => {
  const frame = useCurrentFrame();

  const inFrom = secToFrame(startSec - FADE / 2);
  const inTo = secToFrame(startSec + FADE / 2);
  const outFrom = secToFrame(endSec - FADE / 2);
  const outTo = secToFrame(endSec + FADE / 2);

  const fadeIn = interpolate(frame, [inFrom, inTo], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [outFrom, outTo], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = fadeIn * fadeOut;
  if (opacity <= 0) return null;

  const kb = kenBurns(index);
  const p = interpolate(frame, [inFrom, outTo], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeInOut,
  });
  const scale = kb.s0 + (kb.s1 - kb.s0) * p;
  const tx = kb.tx0 + (kb.tx1 - kb.tx0) * p;
  const ty = kb.ty0 + (kb.ty1 - kb.ty0) * p;

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: INK }}>
        <Img
          src={staticFile(file)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
            filter: 'saturate(1.07) contrast(1.045) brightness(1.02)',
            willChange: 'transform',
          }}
        />
        <WarmGrade />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- title card ----------
const TitleCard: React.FC<{
  childName: string;
  subtitle: string;
  eyebrow: string;
  endSec: number;
}> = ({ childName, subtitle, eyebrow, endSec }) => {
  const frame = useCurrentFrame();
  const outFrom = secToFrame(endSec - FADE / 2);
  const outTo = secToFrame(endSec + FADE / 2);

  const fadeIn = interpolate(frame, [0, secToFrame(0.7)], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [outFrom, outTo], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = fadeIn * fadeOut;
  if (opacity <= 0) return null;

  const rise = interpolate(frame, [0, secToFrame(1.6)], [26, 0], {
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const scale = interpolate(frame, [0, secToFrame(2.2)], [0.965, 1], {
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  // Name size scales down for long / CJK names so they never overflow.
  const nameLen = [...childName].length;
  const nameFontSize = nameLen <= 5 ? 168 : nameLen <= 9 ? 120 : 84;

  return (
    <AbsoluteFill style={{ backgroundColor: CREAM, opacity }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(62% 46% at 50% 44%, rgba(255,212,102,0.55) 0%, rgba(255,212,102,0.18) 46%, rgba(255,253,246,0) 74%)',
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 90px',
          transform: `translateY(${rise}px) scale(${scale})`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 700,
            letterSpacing: 8,
            fontSize: 30,
            textTransform: 'uppercase',
            color: HONEY,
            marginBottom: 30,
            textAlign: 'center',
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 700,
            fontSize: nameFontSize,
            lineHeight: 1.05,
            color: INK,
            textAlign: 'center',
          }}
        >
          {childName}
        </div>
        <div
          style={{
            marginTop: 40,
            width: 160,
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${BABY_BLUE} 0%, ${BUTTER} 100%)`,
          }}
        />
        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 600,
            fontSize: 36,
            letterSpacing: 1,
            color: INK,
            opacity: 0.72,
            marginTop: 34,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- the school's mark: uploaded logo, else initials ----------
// Design tab 09: "No logo yet → initials in a circle on sky wash, same size
// and weight as the real mark, so the layout never shifts when HQ uploads.
// Never a potato — the potato is our brand, not theirs."
const SchoolMark: React.FC<{ branding: Branding }> = ({ branding }) => {
  const size = Math.round(54 * S); // 194
  const logoState = useOptionalImage(branding.logoFile);

  if (branding.logoFile && logoState === 'ok') {
    return (
      <Img
        src={staticFile(branding.logoFile)}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          // A rounded square — the uploaded asset, safely contained.
          borderRadius: Math.round(14 * S),
        }}
      />
    );
  }
  if (logoState === 'loading') return null;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: SKY,
        border: `${Math.max(2, Math.round(1.5 * S))}px solid ${SKY_LINE}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_STACK,
        fontWeight: 800,
        fontSize: Math.round(size * 0.34),
        letterSpacing: '.02em',
        color: BLUE_DEEP,
      }}
    >
      {branding.initials}
    </div>
  );
};

const ClassEmblem: React.FC<{ file: string | null }> = ({ file }) => {
  const size = Math.round(18 * S); // 65
  const state = useOptionalImage(file);
  if (!file || state !== 'ok') return null;
  return (
    <Img
      src={staticFile(file)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        flex: 'none',
      }}
    />
  );
};

// ---------- branded end card (design tab 09) ----------
// "The last three seconds of every film. This is the frame a parent
// screenshots — so the school owns it."
//
// Lockup order is a system law: school first, class second, Potato Snaps last.
// The whole lockup lives inside a 16:9 share-safe box centred in the 9:16
// frame, so a parent cropping for a group chat still crops the school. (The
// dashed box + "share-safe 16:9" tag in the design mock are annotations — they
// are documentation, not pixels, and are deliberately not rendered here.)
const EndCard: React.FC<{ startSec: number; branding?: Branding }> = ({
  startSec,
  branding,
}) => {
  const frame = useCurrentFrame();
  const inFrom = secToFrame(startSec - FADE / 2);
  const inTo = secToFrame(startSec + FADE / 2);

  const opacity = interpolate(frame, [inFrom, inTo], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (opacity <= 0) return null;

  const markIn = interpolate(frame, [inTo, secToFrame(startSec + 1.5)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const markScale = interpolate(
    frame,
    [inTo, secToFrame(startSec + 1.8)],
    [0.9, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );
  const textIn = interpolate(
    frame,
    [secToFrame(startSec + 0.9), secToFrame(startSec + 2.0)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const ground = (
    <>
      <AbsoluteFill
        style={{
          background: [
            'radial-gradient(150% 80% at 50% 12%, #FFF6DF 0%, rgba(255,246,223,0) 62%)',
            'radial-gradient(120% 70% at 50% 100%, #EAF6FD 0%, rgba(234,246,253,0) 58%)',
          ].join(','),
        }}
      />
      {/* dot texture, faded out of the middle so the lockup stays clean */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(rgba(35,57,91,.085) 1px, transparent 1px)',
          backgroundSize: `${Math.round(15 * S)}px ${Math.round(15 * S)}px`,
          WebkitMaskImage:
            'radial-gradient(74% 48% at 50% 47%, rgba(0,0,0,0) 46%, rgba(0,0,0,1))',
          maskImage:
            'radial-gradient(74% 48% at 50% 47%, rgba(0,0,0,0) 46%, rgba(0,0,0,1))',
        }}
      />
    </>
  );

  // No branding at all (Remotion Studio with bare props): keep the plain v1.0
  // sign-off rather than rendering an empty lockup.
  if (!branding) {
    return (
      <AbsoluteFill style={{ backgroundColor: CREAM, opacity }}>
        {ground}
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 600,
              fontSize: 42,
              letterSpacing: 1,
              color: INK,
              opacity: textIn,
            }}
          >
            Made with{' '}
            <span style={{ color: HONEY, fontWeight: 700 }}>Potato Snaps</span>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  // School name is the headline; when HQ has not set one the class name is
  // promoted into that slot and the class row drops its (duplicate) text.
  const headline = branding.schoolName ?? branding.className;
  const showClassName = headline !== branding.className;

  // Design rule #2: "Lockup stays inside the 16:9 share-safe box." Real school
  // names run long ("St Mary of the Angels Catholic Primary School"), and at
  // the spec's 20px/72px that wraps to three lines and pushes the week label
  // out of the box. Step the headline down instead — same trick the title card
  // already uses for long/CJK child names. 22 chars ~ one line at full size.
  const headlineLen = [...headline].length;
  const headlineSize =
    headlineLen <= 22
      ? Math.round(20 * S) // 72 — the spec value, the common case
      : headlineLen <= 34
        ? Math.round(16 * S) // 58
        : Math.round(13 * S); // 47

  return (
    <AbsoluteFill style={{ backgroundColor: CREAM, opacity }}>
      {ground}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        {/* 16:9 share-safe box, centred */}
        <div
          style={{
            width: Math.round(272 * S), // 979
            height: Math.round((272 * S * 9) / 16), // 551
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            // Hard guarantee for design rule #2 even if a name defeats the
            // responsive sizing below: nothing escapes the share-safe box.
            padding: `0 ${Math.round(8 * S)}px`,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              opacity: markIn,
              transform: `scale(${markScale})`,
              display: 'flex',
            }}
          >
            <SchoolMark branding={branding} />
          </div>

          <div
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 800,
              fontSize: headlineSize,
              letterSpacing: '-.02em',
              lineHeight: 1.05,
              color: INK,
              marginTop: Math.round(9 * S),
              opacity: textIn,
              maxWidth: '100%',
            }}
          >
            {headline}
          </div>

          <div
            style={{
              width: Math.round(34 * S),
              height: Math.round(3 * S),
              borderRadius: 999,
              background: HONEY,
              margin: `${Math.round(8 * S)}px 0`,
              opacity: textIn,
            }}
          />

          {(branding.emblemFile || showClassName) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: Math.round(6 * S),
                fontFamily: FONT_STACK,
                fontWeight: 800,
                fontSize: Math.round(13 * S), // 47
                lineHeight: 1.2,
                color: INK,
                opacity: textIn,
                maxWidth: '100%',
              }}
            >
              <ClassEmblem file={branding.emblemFile} />
              {showClassName && <span>{branding.className}</span>}
            </div>
          )}

          <div
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 800,
              fontSize: Math.round(10.5 * S), // 38
              color: INK_50,
              marginTop: Math.round(5 * S),
              letterSpacing: '.03em',
              opacity: textIn,
            }}
          >
            {branding.weekLabel}
          </div>
        </div>
      </AbsoluteFill>

      {/* the mascot retreats to a signature — the only mention of the product */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: Math.round(14 * S),
          textAlign: 'center',
          fontFamily: FONT_STACK,
          fontWeight: 800,
          fontSize: Math.round(9 * S), // 32
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: INK_35,
          opacity: textIn,
        }}
      >
        made with Potato Snaps
      </div>
    </AbsoluteFill>
  );
};

export const Montage: React.FC<MontageProps> = (props) => {
  useFonts();
  const timeline = computeTimeline(props);
  const eyebrow = props.eyebrow ?? 'Potato Snaps';

  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
      <TitleCard
        childName={props.childName}
        subtitle={props.subtitle}
        eyebrow={eyebrow}
        endSec={timeline.titleEndSec}
      />
      {timeline.cuts.map((cut) => (
        <PhotoLayer
          key={cut.index}
          file={props.photos[cut.index].file}
          index={cut.index}
          startSec={cut.startSec}
          endSec={cut.endSec}
        />
      ))}
      <EndCard startSec={timeline.endCardStartSec} branding={props.branding} />
    </AbsoluteFill>
  );
};
