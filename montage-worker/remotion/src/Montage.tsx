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
  MontageProps,
} from './timing';

const FOREST = '#0a1a0f';
const GOLD = '#E8C96A';
const GOLD_MUTED = '#c9ad6a';

// Font stack: Lora for Latin, Noto Serif SC fallback for CJK (Whale Class
// Beijing reality — child names are frequently Chinese).
const FONT_STACK = "'Lora', 'Noto Serif SC', serif";

const easeInOut = Easing.bezier(0.42, 0, 0.58, 1);
const easeOut = Easing.out(Easing.cubic);

const secToFrame = (s: number) => s * FPS;

// ---------- optional asset preloader (tolerant of missing dev assets) ----------
type AssetState = 'loading' | 'ok' | 'error';

function useOptionalImage(file: string): AssetState {
  const [state, setState] = React.useState<AssetState>('loading');
  const [handle] = React.useState(() => delayRender(`img:${file}`));
  React.useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setState('ok');
      continueRender(handle);
    };
    img.onerror = () => {
      // Missing in dev (before prepare-assets) → skip cleanly, never hang.
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

// Register Lora + Noto Serif SC. Each is independent + catches so a missing
// face never hangs a render — the font-family stack degrades gracefully.
function useFonts() {
  const [handle] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    const faces: Promise<unknown>[] = [];

    const lora = new FontFace('Lora', `url(${staticFile('Lora.ttf')})`, {
      weight: '400 700',
    });
    faces.push(
      lora
        .load()
        .then((f) => document.fonts.add(f))
        .catch((e) => console.error('Lora load failed', e))
    );

    const noto = new FontFace(
      'Noto Serif SC',
      `url(${staticFile('NotoSerifSC-Regular.otf')})`,
      { weight: '400 700' }
    );
    faces.push(
      noto
        .load()
        .then((f) => document.fonts.add(f))
        .catch((e) => console.warn('Noto Serif SC fallback missing', e))
    );

    Promise.all(faces).finally(() => continueRender(handle));
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
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
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
    <AbsoluteFill style={{ backgroundColor: FOREST, opacity }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(60% 45% at 50% 44%, rgba(232,201,106,0.14) 0%, rgba(232,201,106,0.03) 45%, rgba(10,26,15,0) 72%)',
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
            fontWeight: 400,
            letterSpacing: 6,
            fontSize: 30,
            textTransform: 'uppercase',
            color: GOLD_MUTED,
            marginBottom: 30,
            opacity: 0.9,
            textAlign: 'center',
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 500,
            fontSize: nameFontSize,
            lineHeight: 1.05,
            color: '#fbf6ea',
            textShadow: '0 6px 40px rgba(0,0,0,0.5)',
            textAlign: 'center',
          }}
        >
          {childName}
        </div>
        <div
          style={{
            marginTop: 40,
            width: 120,
            height: 1,
            background:
              'linear-gradient(90deg, rgba(232,201,106,0) 0%, rgba(232,201,106,0.8) 50%, rgba(232,201,106,0) 100%)',
          }}
        />
        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 400,
            fontSize: 34,
            letterSpacing: 2,
            color: GOLD,
            marginTop: 34,
            opacity: 0.92,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- end card ----------
const EndCard: React.FC<{ startSec: number }> = ({ startSec }) => {
  const frame = useCurrentFrame();
  const logoState = useOptionalImage('logo.png');
  const inFrom = secToFrame(startSec - FADE / 2);
  const inTo = secToFrame(startSec + FADE / 2);

  const opacity = interpolate(frame, [inFrom, inTo], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (opacity <= 0) return null;

  const logoIn = interpolate(frame, [inTo, secToFrame(startSec + 1.5)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const logoScale = interpolate(
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

  return (
    <AbsoluteFill style={{ backgroundColor: FOREST, opacity }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(55% 40% at 50% 45%, rgba(232,201,106,0.12) 0%, rgba(10,26,15,0) 70%)',
        }}
      />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        {logoState === 'ok' && (
          <Img
            src={staticFile('logo.png')}
            style={{
              width: 190,
              height: 'auto',
              opacity: logoIn,
              transform: `scale(${logoScale})`,
              filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.55))',
            }}
          />
        )}
        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 400,
            fontSize: 40,
            letterSpacing: 3,
            color: '#efe7d3',
            marginTop: logoState === 'ok' ? 46 : 0,
            opacity: textIn,
          }}
        >
          Made with <span style={{ color: GOLD, fontWeight: 500 }}>Montree</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Montage: React.FC<MontageProps> = (props) => {
  useFonts();
  const timeline = computeTimeline(props);
  const eyebrow = props.eyebrow ?? 'Weekly Moments';

  return (
    <AbsoluteFill style={{ backgroundColor: FOREST }}>
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
      <EndCard startSec={timeline.endCardStartSec} />
    </AbsoluteFill>
  );
};
