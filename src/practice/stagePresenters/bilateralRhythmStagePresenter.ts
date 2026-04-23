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
  const offset = Math.max(64, Math.min(150, width * 0.24)) * reducedMotion.amplitudeScale;
  const radius = (lowIntensity ? 20 : 23) * Math.max(0.88, reducedMotion.amplitudeScale);
  const glowRadius = radius * 1.85;

  const guide = scene.add.rectangle(x, y, Math.min(width, offset * 2.6), 3, border, 0.28).setOrigin(0.5);
  const leftGlow = scene.add.circle(x - offset, y, glowRadius, accent, 0.08);
  const rightGlow = scene.add.circle(x + offset, y, glowRadius, accent, 0.08);
  const leftMarker = scene.add.circle(x - offset, y, radius, accent, lowIntensity ? 0.28 : 0.36);
  const rightMarker = scene.add.circle(x + offset, y, radius, accent, lowIntensity ? 0.28 : 0.36);
  const pulse = scene.add.circle(x - offset, y, radius * 0.86, accent, lowIntensity ? 0.9 : 1);

  const rhythmLabel = scene.add.text(x, y - glowRadius - 30, 'Follow the visual left-right rhythm', {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '14px',
    align: 'center',
  });
  rhythmLabel.setOrigin(0.5);

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

  let active = false;
  let paused = false;
  let activeSide: 'left' | 'right' = 'left';
  let tween: Phaser.Tweens.Tween;

  const applyState = (): void => {
    const visible = active;
    const shouldRun = active && !paused;
    const activeMarkerAlpha = lowIntensity ? 0.68 : 0.82;
    const inactiveMarkerAlpha = visible ? (lowIntensity ? 0.22 : 0.3) : 0.12;
    const activeGlowAlpha = lowIntensity ? 0.2 : 0.28;
    const inactiveGlowAlpha = visible ? 0.08 : 0.03;
    const leftIsActive = visible && activeSide === 'left';
    const rightIsActive = visible && activeSide === 'right';

    leftGlow.setAlpha(leftIsActive ? activeGlowAlpha : inactiveGlowAlpha);
    rightGlow.setAlpha(rightIsActive ? activeGlowAlpha : inactiveGlowAlpha);
    leftGlow.setScale(leftIsActive ? 1.08 : 0.9);
    rightGlow.setScale(rightIsActive ? 1.08 : 0.9);
    pulse.setAlpha(visible ? 1 : 0.22);
    leftMarker.setAlpha(leftIsActive ? activeMarkerAlpha : inactiveMarkerAlpha);
    rightMarker.setAlpha(rightIsActive ? activeMarkerAlpha : inactiveMarkerAlpha);
    leftMarker.setScale(leftIsActive ? 1.08 : 0.96);
    rightMarker.setScale(rightIsActive ? 1.08 : 0.96);
    rhythmLabel.setAlpha(visible ? 0.88 : 0.3);
    leftLabel.setAlpha(visible ? 1 : 0.32);
    rightLabel.setAlpha(visible ? 1 : 0.32);
    guide.setAlpha(visible ? 0.32 : 0.08);
    tween.paused = !shouldRun;

    if (!shouldRun) {
      activeSide = 'left';
      pulse.setX(x - offset);
    }
  };

  tween = scene.tweens.add({
    targets: pulse,
    x: x + offset,
    duration: Math.round((cycleMs * reducedMotion.cycleMultiplier) / 2),
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
    paused: true,
    onYoyo: () => {
      activeSide = 'right';
      applyState();
    },
    onRepeat: () => {
      activeSide = 'left';
      applyState();
    },
  });

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
      leftGlow.destroy();
      rightGlow.destroy();
      leftMarker.destroy();
      rightMarker.destroy();
      pulse.destroy();
      rhythmLabel.destroy();
      leftLabel.destroy();
      rightLabel.destroy();
    },
  };
};
