import type Phaser from 'phaser';

import { createMovingBallGuidance } from '../movingBallGuidance';
import type { PracticeConfig, PracticeReducedMotionPolicy } from '../practiceConfig';
import type { PracticeStagePresenterController } from '../stagePresenter';

interface CreateMovingBallStagePresenterOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  lowIntensity: boolean;
  reducedMotion: PracticeReducedMotionPolicy;
  movingBall: NonNullable<PracticeConfig['movingBall']>;
}

export const createMovingBallStagePresenter = ({
  scene,
  x,
  y,
  width,
  lowIntensity,
  reducedMotion,
  movingBall,
}: CreateMovingBallStagePresenterOptions): PracticeStagePresenterController => createMovingBallGuidance({
  scene,
  x,
  y,
  width: Math.max(180, width * reducedMotion.amplitudeScale),
  laneBandHeight: movingBall.laneBandHeight,
  laneHeights: movingBall.laneHeights,
  cycleMs: Math.round(movingBall.cycleMs * reducedMotion.cycleMultiplier),
  radius: Math.max(10, movingBall.radius * reducedMotion.amplitudeScale),
  lowIntensity,
});
