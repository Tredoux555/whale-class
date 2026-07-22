import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  Easing,
} from 'remotion';
import { continueRender, delayRender } from 'remotion';
import {
  CUTS,
  DURATION_IN_FRAMES,
  END_CARD_BEAT,
  FADE,
  FPS,
  PHOTO_ORDER,
  TITLE_END_BEAT,
  beatToSec,
  kenBurns,
  secToFrame,
} from './timing';

// Self-host Lora (proxy blocks gstatic at render time). Block rendering until
// the face is ready so no frame ever paints in a fallback font.
const fontFamily = 'Lora';
const useLora = () => {
  const [handle] = React.useState(() => delayRender('load-lora'));
  React.useEffect(() => {
    const face = new FontFace('Lora', `url(${staticFile('Lora.ttf')})`, {
      weight: '400 700',
    });
    face
      .load()
      .then((f) => {
        document.fonts.add(f);
        continueRender(handle);
      })
      .catch((e) => {
        console.error('Lora load failed', e);
        continueRender(handle);
      });
  }, [handle]);
};

const FOREST = '#0a1a0f';
const GOLD = '#E8C96A';
const GOLD_MUTED = '#c9ad6a';

const easeInOut = Easing.bezier(0.42, 0, 0.58, 1);
const easeOut = Easing.out(Easing.cubic);

// ---------- shared warm grade + vignette (baked PNG = cheap under swiftshader) ----------
const WarmGrade: React.FC = () => (
  <Img
    src={staticFile('overlay.png')}
    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
  />
);

// ---------- one photo layer with Ken Burns + crossfade ----------
const PhotoLayer: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const inCutSec = beatToSec(CUTS[index]);
  const outCutSec = beatToSec(CUTS[index + 1]);

  // Crossfade windows centred on the cuts (frames).
  const inFrom = secToFrame(inCutSec - FADE / 2);
  const inTo = secToFrame(inCutSec + FADE / 2);
  const outFrom = secToFrame(outCutSec - FADE / 2);
  const outTo = secToFrame(outCutSec + FADE / 2);

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

  // Ken Burns spans the full visible window, eased.
  const kb = kenBurns(index);
  const p = interpolate(frame, [inFrom, outTo], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeInOut,
  });
  const scale = kb.s0 + (kb.s1 - kb.s0) * p;
  const tx = kb.tx0 + (kb.tx1 - kb.tx0) * p;
  const ty = kb.ty0 + (kb.ty1 - kb.ty0) * p;

  const photoNum = String(PHOTO_ORDER[index]).padStart(2, '0');

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
        <Img
          src={staticFile(`photos/${photoNum}.jpg`)}
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
const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const cutSec = beatToSec(TITLE_END_BEAT);
  const outFrom = secToFrame(cutSec - FADE / 2);
  const outTo = secToFrame(cutSec + FADE / 2);

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
          transform: `translateY(${rise}px) scale(${scale})`,
        }}
      >
        <div
          style={{
            fontFamily,
            fontWeight: 400,
            letterSpacing: 6,
            fontSize: 30,
            textTransform: 'uppercase',
            color: GOLD_MUTED,
            marginBottom: 30,
            opacity: 0.9,
          }}
        >
          Weekly Moments
        </div>
        <div
          style={{
            fontFamily,
            fontWeight: 500,
            fontSize: 168,
            lineHeight: 1,
            color: '#fbf6ea',
            textShadow: '0 6px 40px rgba(0,0,0,0.5)',
          }}
        >
          Yo-yo
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
            fontFamily,
            fontWeight: 400,
            fontSize: 34,
            letterSpacing: 2,
            color: GOLD,
            marginTop: 34,
            opacity: 0.92,
          }}
        >
          June 2026
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- end card ----------
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const cutSec = beatToSec(END_CARD_BEAT);
  const inFrom = secToFrame(cutSec - FADE / 2);
  const inTo = secToFrame(cutSec + FADE / 2);

  const opacity = interpolate(frame, [inFrom, inTo], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (opacity <= 0) return null;

  const logoIn = interpolate(frame, [inTo, secToFrame(cutSec + 1.5)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const logoScale = interpolate(
    frame,
    [inTo, secToFrame(cutSec + 1.8)],
    [0.9, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );
  const textIn = interpolate(
    frame,
    [secToFrame(cutSec + 0.9), secToFrame(cutSec + 2.0)],
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
        <div
          style={{
            fontFamily,
            fontWeight: 400,
            fontSize: 40,
            letterSpacing: 3,
            color: '#efe7d3',
            marginTop: 46,
            opacity: textIn,
          }}
        >
          Made with{' '}
          <span style={{ color: GOLD, fontWeight: 500 }}>Montree</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Montage: React.FC = () => {
  useLora();
  return (
    <AbsoluteFill style={{ backgroundColor: FOREST }}>
      <Audio src={staticFile('music.m4a')} />
      <TitleCard />
      {PHOTO_ORDER.map((_, i) => (
        <PhotoLayer key={i} index={i} />
      ))}
      <EndCard />
    </AbsoluteFill>
  );
};

export const montageMeta = {
  id: 'YoyoMontage',
  durationInFrames: DURATION_IN_FRAMES,
  fps: FPS,
  width: 1080,
  height: 1920,
};
