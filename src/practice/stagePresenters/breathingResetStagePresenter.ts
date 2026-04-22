import type Phaser from 'phaser';

import { uiTheme } from '../../ui/theme';
import type { PracticeReducedMotionPolicy } from '../practiceConfig';
import type { PracticeStagePresenterController } from '../stagePresenter';

interface CreateBreathingResetStagePresenterOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  lowIntensity: boolean;
  cycleMs: number;
  reducedMotion: PracticeReducedMotionPolicy;
}

export const createBreathingResetStagePresenter = ({
  scene,
  x,
  y,
  width,
  lowIntensity,
  cycleMs,
  reducedMotion,
}: CreateBreathingResetStagePresenterOptions): PracticeStagePresenterController => {
  const accent = Number.parseInt(uiTheme.colors.accent.slice(1), 16);
  const border = Number.parseInt(uiTheme.colors.border.slice(1), 16);
  const ringRadius = Math.max(48, Math.min(96, width * 0.16));
  const fillRadius = ringRadius * (lowIntensity ? 0.62 : 0.55) * reducedMotion.amplitudeScale;
  const pulseScale = (lowIntensity ? 1.12 : 1.22) * Math.max(0.88, reducedMotion.amplitudeScale);

  const ring = scene.add.circle(x, y, ringRadius, accent, 0.08)
    .setStrokeStyle(2, accent, lowIntensity ? 0.3 : 0.42);
  const fill = scene.add.circle(x, y, fillRadius, accent, lowIntensity ? 0.2 : 0.28);
  const guide = scene.add.rectangle(x, y, width, 2, border, 0.26).setOrigin(0.5);

  const inhaleLabel = scene.add.text(x, y - ringRadius - 28, 'Easy inhale', {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '14px',
    align: 'center',
  });
  inhaleLabel.setOrigin(0.5);

  const exhaleLabel = scene.add.text(x, y + ringRadius + 28, 'Longer, softer exhale', {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '14px',
    align: 'center',
  });
  exhaleLabel.setOrigin(0.5);

  const tween = scene.tweens.add({
    targets: [ring, fill],
    scaleX: pulseScale,
    scaleY: pulseScale,
    duration: Math.round(cycleMs * reducedMotion.cycleMultiplier * 0.45),
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
    paused: true,
  });

  let active = false;
  let paused = false;

  const applyState = (): void => {
    const visible = active;
    const shouldRun = active && !paused;

    ring.setAlpha(visible ? (lowIntensity ? 0.84 : 0.96) : 0.2);
    fill.setAlpha(visible ? 1 : 0.28);
    inhaleLabel.setAlpha(visible ? 1 : 0.32);
    exhaleLabel.setAlpha(visible ? 1 : 0.32);
    guide.setAlpha(visible ? 0.26 : 0.08);
    tween.paused = !shouldRun;

    if (!shouldRun) {
      ring.setScale(1);
      fill.setScale(1);
    }
  };

  applyState();

  return {
    setActive(nextActive: boolean): void {
      active = nextActive;
      applyState();
    },
    setPaused(nextPaused: boolean): void {
      paused = nextPaused;
      applyState();
    },
    destroy(): void {
      tween.stop();
      ring.destroy();
      fill.destroy();
      guide.destroy();
      inhaleLabel.destroy();
      exhaleLabel.destroy();
    },
  };
};
