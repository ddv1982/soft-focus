import type Phaser from 'phaser';

import { hexToNumber, uiTheme } from '../../ui/theme';
import type { PracticeReducedMotionPolicy } from '../practiceConfig';
import type { PracticeStagePresenterController } from '../stagePresenter';

interface CreateOrientingStagePresenterOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  lowIntensity: boolean;
  cycleMs: number;
  reducedMotion: PracticeReducedMotionPolicy;
}

const prompts = [
  'Near left',
  'Center',
  'Near right',
  'Wider space',
] as const;

export const createOrientingStagePresenter = ({
  scene,
  x,
  y,
  width,
  lowIntensity,
  cycleMs,
  reducedMotion,
}: CreateOrientingStagePresenterOptions): PracticeStagePresenterController => {
  const accent = hexToNumber(uiTheme.colors.accent);
  const border = hexToNumber(uiTheme.colors.border);
  const span = Math.max(84, Math.min(180, width * 0.3)) * reducedMotion.amplitudeScale;

  const guide = scene.add.rectangle(x, y, width, 2, border, 0.24).setOrigin(0.5);
  const anchor = scene.add.circle(x - span, y, lowIntensity ? 16 : 18, accent, 0.92);
  const focusHalo = scene.add.circle(x - span, y, (lowIntensity ? 34 : 40) * reducedMotion.amplitudeScale, accent, 0.08)
    .setStrokeStyle(2, accent, lowIntensity ? 0.28 : 0.36);

  const promptText = scene.add.text(x, y + 56, prompts[0], {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '14px',
    align: 'center',
  });
  promptText.setOrigin(0.5);

  let stepIndex = 0;

  const stepTween = scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: Math.round((cycleMs * reducedMotion.cycleMultiplier) / prompts.length),
    ease: 'Sine.InOut',
    yoyo: false,
    repeat: -1,
    paused: true,
    onRepeat: () => {
      stepIndex = (stepIndex + 1) % prompts.length;
      const targetX = stepIndex === 0
        ? x - span
        : stepIndex === 1
          ? x
          : stepIndex === 2
            ? x + span
            : x;
      const haloScale = stepIndex === 3 ? 1.4 * reducedMotion.amplitudeScale : 1;

      scene.tweens.killTweensOf([anchor, focusHalo]);

      scene.tweens.add({
        targets: [anchor, focusHalo],
        x: targetX,
        duration: Math.round(cycleMs * reducedMotion.cycleMultiplier * 0.24),
        ease: 'Sine.InOut',
      });
      scene.tweens.add({
        targets: focusHalo,
        scaleX: haloScale,
        scaleY: haloScale,
        duration: Math.round(cycleMs * reducedMotion.cycleMultiplier * 0.24),
        ease: 'Sine.InOut',
        yoyo: true,
      });
      promptText.setText(prompts[stepIndex]);
    },
  });

  let active = false;
  let paused = false;

  const applyState = (): void => {
    const visible = active;
    const shouldRun = active && !paused;

    anchor.setAlpha(visible ? 0.96 : 0.22);
    focusHalo.setAlpha(visible ? (lowIntensity ? 0.72 : 0.88) : 0.18);
    promptText.setAlpha(visible ? 1 : 0.32);
    guide.setAlpha(visible ? 0.24 : 0.08);
    stepTween.paused = !shouldRun;

    if (!shouldRun) {
      scene.tweens.killTweensOf([anchor, focusHalo]);
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
      stepTween.stop();
      scene.tweens.killTweensOf([anchor, focusHalo]);
      guide.destroy();
      anchor.destroy();
      focusHalo.destroy();
      promptText.destroy();
    },
  };
};
