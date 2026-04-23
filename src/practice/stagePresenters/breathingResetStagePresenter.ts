import type Phaser from 'phaser';

import { hexToNumber, uiTheme } from '../../ui/theme';
import type { PracticeReducedMotionPolicy } from '../practiceConfig';
import type { PracticeStagePresenterController } from '../stagePresenter';

interface CreateBreathingResetStagePresenterOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  lowIntensity: boolean;
  pattern: 'extended-exhale' | 'balanced' | 'box' | 'cyclic-sighing';
  inhaleMs: number;
  inhaleTopUpMs: number | null;
  holdAfterInhaleMs: number | null;
  exhaleMs: number;
  holdAfterExhaleMs: number | null;
  reducedMotion: PracticeReducedMotionPolicy;
}

export const createBreathingResetStagePresenter = ({
  scene,
  x,
  y,
  width,
  lowIntensity,
  pattern,
  inhaleMs,
  inhaleTopUpMs,
  holdAfterInhaleMs,
  exhaleMs,
  holdAfterExhaleMs,
  reducedMotion,
}: CreateBreathingResetStagePresenterOptions): PracticeStagePresenterController => {
  const accent = hexToNumber(uiTheme.colors.accent);
  const border = hexToNumber(uiTheme.colors.border);
  const ringRadius = Math.max(48, Math.min(96, width * 0.16));
  const fillRadius = ringRadius * (lowIntensity ? 0.6 : 0.54) * reducedMotion.amplitudeScale;
  const restScale = Math.max(0.9, reducedMotion.amplitudeScale);
  const inhaleScale = (lowIntensity ? 1.1 : 1.16) * Math.max(0.9, reducedMotion.amplitudeScale);
  const topUpScale = inhaleScale * 1.06;
  const exhaleScale = Math.max(0.88, restScale * 0.96);
  const inhaleDuration = Math.round(inhaleMs * reducedMotion.cycleMultiplier);
  const inhaleTopUpDuration = inhaleTopUpMs ? Math.round(inhaleTopUpMs * reducedMotion.cycleMultiplier) : null;
  const holdAfterInhaleDuration = holdAfterInhaleMs ? Math.round(holdAfterInhaleMs * reducedMotion.cycleMultiplier) : null;
  const exhaleDuration = Math.round(exhaleMs * reducedMotion.cycleMultiplier);
  const holdAfterExhaleDuration = holdAfterExhaleMs ? Math.round(holdAfterExhaleMs * reducedMotion.cycleMultiplier) : null;

  const ring = scene.add.circle(x, y, ringRadius, accent, 0.08)
    .setStrokeStyle(2, accent, lowIntensity ? 0.3 : 0.42);
  const fill = scene.add.circle(x, y, fillRadius, accent, lowIntensity ? 0.2 : 0.28);
  const guide = scene.add.rectangle(x, y, width, 2, border, 0.26).setOrigin(0.5);

  const inhaleLabel = scene.add.text(
    x,
    y - ringRadius - 28,
    pattern === 'cyclic-sighing'
      ? 'Inhale • top-up'
      : pattern === 'box'
        ? 'Inhale • hold'
        : pattern === 'balanced'
          ? 'Balanced inhale'
          : 'Easy inhale',
    {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '14px',
    align: 'center',
  });
  inhaleLabel.setOrigin(0.5);

  const exhaleLabel = scene.add.text(
    x,
    y + ringRadius + 28,
    pattern === 'box'
      ? 'Exhale • hold'
      : pattern === 'balanced'
        ? 'Balanced exhale'
        : 'Long easy exhale',
    {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '14px',
    align: 'center',
  });
  exhaleLabel.setOrigin(0.5);

  const phaseLabel = scene.add.text(x, y, pattern === 'box' ? 'Inhale' : 'Easy inhale', {
    color: uiTheme.colors.text,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: lowIntensity ? '16px' : '18px',
    fontStyle: '600',
    align: 'center',
  });
  phaseLabel.setOrigin(0.5);

  ring.setScale(exhaleScale);
  fill.setScale(exhaleScale);

  const tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [
    {
      targets: [ring, fill],
      scaleX: inhaleScale,
      scaleY: inhaleScale,
      duration: inhaleDuration,
      ease: 'Sine.InOut',
      onStart: () => {
        phaseLabel.setText(pattern === 'balanced' ? 'Balanced inhale' : 'Easy inhale');
      },
    },
  ];

  if (inhaleTopUpDuration) {
    tweens.push({
      targets: [ring, fill],
      scaleX: topUpScale,
      scaleY: topUpScale,
      duration: inhaleTopUpDuration,
      ease: 'Sine.Out',
      onStart: () => {
        phaseLabel.setText('Top-up inhale');
      },
    });
  }

  if (holdAfterInhaleDuration) {
    tweens.push({
      targets: [ring, fill],
      scaleX: inhaleTopUpDuration ? topUpScale : inhaleScale,
      scaleY: inhaleTopUpDuration ? topUpScale : inhaleScale,
      duration: holdAfterInhaleDuration,
      ease: 'Linear',
      onStart: () => {
        phaseLabel.setText('Hold');
      },
    });
  }

  tweens.push({
    targets: [ring, fill],
    scaleX: exhaleScale,
    scaleY: exhaleScale,
    duration: exhaleDuration,
    ease: 'Sine.Out',
    onStart: () => {
      phaseLabel.setText(pattern === 'balanced' ? 'Balanced exhale' : 'Soft exhale');
    },
  });

  if (holdAfterExhaleDuration) {
    tweens.push({
      targets: [ring, fill],
      scaleX: exhaleScale,
      scaleY: exhaleScale,
      duration: holdAfterExhaleDuration,
      ease: 'Linear',
      onStart: () => {
        phaseLabel.setText('Hold empty');
      },
    });
  }

  const tween = scene.tweens.chain({
    targets: [ring, fill],
    loop: -1,
    paused: true,
    tweens,
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
    phaseLabel.setAlpha(visible ? 1 : 0.3);
    guide.setAlpha(visible ? 0.26 : 0.08);
    tween.paused = !shouldRun;

    if (!shouldRun) {
      ring.setScale(exhaleScale);
      fill.setScale(exhaleScale);
      phaseLabel.setText(pattern === 'box' ? 'Inhale' : 'Easy inhale');
    }
  };

  applyState();

  return {
    setActive(nextActive: boolean): void {
      const wasActive = active;
      active = nextActive;

      if (active && !wasActive) {
        tween.restart();
        tween.paused = paused;
      }

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
      phaseLabel.destroy();
    },
  };
};
