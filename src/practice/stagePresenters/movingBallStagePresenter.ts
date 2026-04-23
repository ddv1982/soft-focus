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

interface ResolveMovingBallStagePresenterLayoutOptions {
  width: number;
  laneBandHeight: number;
  cycleMs: number;
  radius: number;
  reducedMotion: PracticeReducedMotionPolicy;
}

export const resolveMovingBallStagePresenterLayout = ({
  width,
  laneBandHeight,
  cycleMs,
  radius,
  reducedMotion,
}: ResolveMovingBallStagePresenterLayoutOptions): {
  width: number;
  laneBandHeight: number;
  cycleMs: number;
  radius: number;
} => ({
  width: Math.max(180, width * reducedMotion.amplitudeScale),
  laneBandHeight: laneBandHeight * reducedMotion.amplitudeScale,
  cycleMs: Math.round(cycleMs * reducedMotion.cycleMultiplier),
  radius: Math.max(10, radius * reducedMotion.amplitudeScale),
});

export const createMovingBallStagePresenter = (options: CreateMovingBallStagePresenterOptions): PracticeStagePresenterController => {
  const {
    scene,
    x,
    y,
    width,
    lowIntensity,
    reducedMotion,
    movingBall,
  } = options;
  const layout = resolveMovingBallStagePresenterLayout({
    width,
    laneBandHeight: movingBall.laneBandHeight,
    cycleMs: movingBall.cycleMs,
    radius: movingBall.radius,
    reducedMotion,
  });

  return createMovingBallGuidance({
    scene,
    x,
    y,
    lowIntensity,
    width: layout.width,
    laneBandHeight: layout.laneBandHeight,
    laneHeights: movingBall.laneHeights,
    cycleMs: layout.cycleMs,
    radius: layout.radius,
  });
};
