import React from 'react';
import { Composition } from 'remotion';
import { Montage, montageMeta } from './Montage';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={montageMeta.id}
      component={Montage}
      durationInFrames={montageMeta.durationInFrames}
      fps={montageMeta.fps}
      width={montageMeta.width}
      height={montageMeta.height}
    />
  );
};
