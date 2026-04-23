import type Phaser from 'phaser';

import { hexToNumber, uiTheme } from '../../ui/theme';
import type { PracticeReducedMotionPolicy } from '../practiceConfig';
import type { PracticeStagePresenterController } from '../stagePresenter';

interface CreateBilateralRhythmStagePresenterOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  lowIntensity: boolean;
  cycleMs: number;
  reducedMotion: PracticeReducedMotionPolicy;
}

export const createBilateralRhythmStagePresenter = ({
  scene,
  x,
  y,
  width,
  lowIntensity,
  cycleMs,
  reducedMotion,
}: CreateBilateralRhythmStagePresenterOptions): PracticeStagePresenterController => {
  const accent = hexToNumber(uiTheme.colors.accent);
  const border = hexToNumber(uiTheme.colors.border);
  const offset = Math.max(42, Math.min(120, width * 0.2)) * reducedMotion.amplitudeScale;
  const radius = (lowIntensity ? 18 : 20) * Math.max(0.85, reducedMotion.amplitudeScale);

  const guide = scene.add.rectangle(x, y, width, 2, border, 0.26).setOrigin(0.5);
  const leftMarker = scene.add.circle(x - offset, y, radius, accent, lowIntensity ? 0.24 : 0.3);
  const rightMarker = scene.add.circle(x + offset, y, radius, accent, lowIntensity ? 0.24 : 0.3);
  const pulse = scene.add.circle(x - offset, y, radius * 0.72, accent, lowIntensity ? 0.86 : 0.96);

  const leftLabel = scene.add.text(x - offset, y + radius + 22, 'Left', {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '13px',
    align: 'center',
  });
  leftLabel.setOrigin(0.5);

  const rightLabel = scene.add.text(x + offset, y + radius + 22, 'Right', {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '13px',
    align: 'center',
  });
  rightLabel.setOrigin(0.5);

  const tween = scene.tweens.add({
    targets: pulse,
    x: x + offset,
    duration: Math.round((cycleMs * reducedMotion.cycleMultiplier) / 2),
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

    pulse.setAlpha(visible ? 1 : 0.22);
    leftMarker.setAlpha(visible ? (lowIntensity ? 0.28 : 0.34) : 0.12);
    rightMarker.setAlpha(visible ? (lowIntensity ? 0.28 : 0.34) : 0.12);
    leftLabel.setAlpha(visible ? 1 : 0.32);
    rightLabel.setAlpha(visible ? 1 : 0.32);
    guide.setAlpha(visible ? 0.26 : 0.08);
    tween.paused = !shouldRun;

    if (!shouldRun) {
      pulse.setX(x - offset);
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
      guide.destroy();
      leftMarker.destroy();
      rightMarker.destroy();
      pulse.destroy();
      leftLabel.destroy();
      rightLabel.destroy();
    },
  };
};
