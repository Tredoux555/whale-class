import React from 'react';
import { Composition } from 'remotion';
import { Montage } from './Montage';
import { computeTimeline, FPS, MontageProps } from './timing';

export const COMPOSITION_ID = 'WeeklyMontage';
export const WIDTH = 1080;
export const HEIGHT = 1920;

// A tiny, 0-photo-safe stub so `remotion studio` opens without a real job.
// Synthetic downbeats (~2.6s apart) let the timeline compute cleanly.
const stubDownbeats = Array.from({ length: 40 }, (_, i) => 0.25 + i * 2.6);
const defaultProps: MontageProps = {
  childName: 'Austin',
  subtitle: 'Week of July 20',
  eyebrow: 'Weekly Moments',
  photos: [],
  track: {
    slug: 'bright-week',
    bpm: 92,
    downbeats: stubDownbeats,
    durationSec: 128,
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={COMPOSITION_ID}
      component={Montage}
      durationInFrames={300}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={defaultProps}
      calculateMetadata={({ props }: { props: MontageProps }) => {
        const timeline = computeTimeline(props);
        return {
          durationInFrames: Math.max(1, timeline.totalDurationFrames),
          fps: FPS,
          width: WIDTH,
          height: HEIGHT,
        };
      }}
    />
  );
};
