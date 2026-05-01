import type Phaser from 'phaser';

import { createGazeGuidance } from '../gazeGuidance';
import type { PracticeReducedMotionPolicy } from '../practiceConfig';
import type { PracticeStagePresenterController } from '../stagePresenter';

interface CreateGazeStagePresenterOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  lowIntensity: boolean;
  prompt: string;
  reducedMotion: PracticeReducedMotionPolicy;
}

export const createGazeStagePresenter = ({
  scene,
  x,
  y,
  width,
  lowIntensity,
  prompt,
  reducedMotion,
}: CreateGazeStagePresenterOptions): PracticeStagePresenterController => {
  const guidance = createGazeGuidance({
    scene,
    x,
    y,
    width: Math.max(240, width * (reducedMotion.amplitudeScale || 1)),
    lowIntensity: lowIntensity || reducedMotion.amplitudeScale === 0,
    prompt,
  });

  return {
    setActive(): void {
      // Phrase guidance stays present for the whole practice surface once loaded.
    },
    setPaused(paused: boolean): void {
      guidance.setPaused(paused);
    },
    destroy(): void {
      guidance.destroy();
    },
  };
};
