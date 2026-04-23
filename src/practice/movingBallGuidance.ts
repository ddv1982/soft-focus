import * as Phaser from 'phaser';

import { hexToNumber, uiTheme } from '../ui/theme';

export interface MovingBallGuidanceController {
  setActive(active: boolean): void;
  setPaused(paused: boolean): void;
  destroy(): void;
}

interface CreateMovingBallGuidanceOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  laneBandHeight: number;
  laneHeights: readonly number[];
  cycleMs: number;
  radius: number;
  lowIntensity: boolean;
}

export const createMovingBallGuidance = ({
  scene,
  x,
  y,
  width,
  laneBandHeight,
  laneHeights,
  cycleMs,
  radius,
  lowIntensity,
}: CreateMovingBallGuidanceOptions): MovingBallGuidanceController => {
  const guideLines = laneHeights.map((laneHeight) => {
    const laneY = y + ((laneHeight - 0.5) * laneBandHeight);

    return scene.add.rectangle(x, laneY, width, 2, hexToNumber(uiTheme.colors.border), lowIntensity ? 0.18 : 0.28)
      .setOrigin(0.5);
  });

  const ball = scene.add.circle(
    x - (width / 2) + radius,
    y + ((laneHeights[0] - 0.5) * laneBandHeight),
    radius,
    hexToNumber(uiTheme.colors.accent),
    lowIntensity ? 0.72 : 0.9,
  );

  let active = false;
  let isPaused = false;
  let laneTween: Phaser.Tweens.Tween | null = null;

  const applyState = (): void => {
    const shouldRun = active && !isPaused;
    tween.paused = !shouldRun;

    if (laneTween) {
      laneTween.paused = !shouldRun;
    }

    guideLines.forEach((line) => {
      line.setAlpha(active ? (lowIntensity ? 0.18 : 0.28) : 0.08);
    });
    ball.setAlpha(active ? (lowIntensity ? 0.72 : 0.9) : 0.22);
  };

  let laneIndex = 0;
  const updateLane = (): void => {
    if (laneHeights.length <= 1) {
      return;
    }

    laneIndex = (laneIndex + 1) % laneHeights.length;
    const nextY = y + ((laneHeights[laneIndex] - 0.5) * laneBandHeight);

    laneTween?.stop();
    laneTween = scene.tweens.add({
      targets: ball,
      y: nextY,
      duration: Math.max(320, Math.round(cycleMs * 0.3)),
      ease: 'Sine.InOut',
      paused: !active || isPaused,
      onComplete: () => {
        laneTween = null;
      },
    });
  };

  const tween = scene.tweens.add({
    targets: ball,
    x: x + (width / 2) - radius,
    duration: cycleMs,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
    paused: true,
    onYoyo: updateLane,
    onRepeat: updateLane,
  });

  applyState();

  return {
    setActive(nextActive: boolean): void {
      active = nextActive;
      applyState();
    },
    setPaused(nextPaused: boolean): void {
      isPaused = nextPaused;
      applyState();
    },
    destroy(): void {
      laneTween?.stop();
      tween.stop();
      guideLines.forEach((line) => line.destroy());
      ball.destroy();
    },
  };
};
