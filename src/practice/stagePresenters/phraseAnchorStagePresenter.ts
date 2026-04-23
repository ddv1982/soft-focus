import type Phaser from 'phaser';

import { hexToNumber, uiTheme } from '../../ui/theme';
import type { PracticeReducedMotionPolicy } from '../practiceConfig';
import type { PracticeStagePresenterController } from '../stagePresenter';

interface CreatePhraseAnchorStagePresenterOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  phrase: string;
  lowIntensity: boolean;
  reducedMotion: PracticeReducedMotionPolicy;
}

const cueSteps = [
  {
    label: 'Notice',
    helper: 'Mind wandered',
  },
  {
    label: 'Return',
    helper: 'Phrase again',
  },
  {
    label: 'Soften',
    helper: 'Less effort',
  },
] as const;

const getDisplayPhrase = (phrase: string): string => {
  if (phrase.length <= 36) {
    return phrase;
  }

  return `${phrase.slice(0, 33).trimEnd()}…`;
};

export const createPhraseAnchorStagePresenter = ({
  scene,
  x,
  y,
  width,
  phrase,
  lowIntensity,
  reducedMotion,
}: CreatePhraseAnchorStagePresenterOptions): PracticeStagePresenterController => {
  const accent = hexToNumber(uiTheme.colors.accent);
  const border = hexToNumber(uiTheme.colors.border);
  const motionEnabled = !lowIntensity && reducedMotion.amplitudeScale > 0;
  const readableWidth = Math.min(width, 680);
  const phraseCardWidth = Math.min(readableWidth, 460);
  const cueCardWidth = Math.min(132, readableWidth / 3.35);
  const cueCardHeight = 46;
  const displayPhrase = getDisplayPhrase(phrase);

  const title = scene.add.text(x, y - 58, 'Phrase anchor loop', {
    color: uiTheme.colors.seaGlass,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '13px',
    fontStyle: '700',
    align: 'center',
  });
  title.setOrigin(0.5);

  const phrasePanel = scene.add.rectangle(x, y - 28, phraseCardWidth, 66, accent, lowIntensity ? 0.08 : 0.12)
    .setOrigin(0.5)
    .setStrokeStyle(1, border, lowIntensity ? 0.18 : 0.28);

  const phrasePreview = scene.add.text(x, y - 37, `“${displayPhrase}”`, {
    color: uiTheme.colors.foam,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '18px',
    fontStyle: '700',
    align: 'center',
    wordWrap: { width: phraseCardWidth - 28, useAdvancedWrap: true },
  });
  phrasePreview.setOrigin(0.5);

  const phraseHint = scene.add.text(x, y - 7, 'Repeat softly with a natural breath if that helps.', {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '12px',
    align: 'center',
    wordWrap: { width: phraseCardWidth - 24, useAdvancedWrap: true },
  });
  phraseHint.setOrigin(0.5);

  const stepSpacing = Math.min(150, readableWidth / 3.25);
  const stepObjects = cueSteps.map(({ label: stepLabel, helper }, index) => {
    const stepX = x + ((index - 1) * stepSpacing);
    const card = scene.add.rectangle(stepX, y + 38, cueCardWidth, cueCardHeight, accent, 0.07)
      .setOrigin(0.5)
      .setStrokeStyle(1, border, 0.2);
    const label = scene.add.text(stepX, y + 30, stepLabel, {
      color: uiTheme.colors.foam,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '13px',
      fontStyle: '700',
      align: 'center',
    });
    label.setOrigin(0.5);
    const helperLabel = scene.add.text(stepX, y + 48, helper, {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '11px',
      align: 'center',
    });
    helperLabel.setOrigin(0.5);

    return { card, label, helperLabel };
  });

  let active = false;
  let paused = false;
  let activeStep = 1;
  const alphaVisible = lowIntensity ? 0.78 : 0.92;
  let phraseTween: Phaser.Tweens.Tween | null = null;
  const stepTimer = motionEnabled
    ? scene.time.addEvent({
      delay: 3600,
      loop: true,
      callback: () => {
        if (!active || paused) {
          return;
        }

        activeStep = (activeStep + 1) % cueSteps.length;
        applyState();
      },
    })
    : null;

  if (motionEnabled) {
    phraseTween = scene.tweens.add({
      targets: [phrasePanel, phrasePreview],
      scale: 1.035,
      duration: 3000,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
      paused: true,
    });
  }

  function applyState(): void {
    const visibleAlpha = active ? alphaVisible : 0.28;
    const shouldRun = active && !paused && motionEnabled;

    title.setAlpha(visibleAlpha);
    phrasePanel.setAlpha(active ? (lowIntensity ? 0.55 : 0.78) : 0.2);
    phrasePreview.setAlpha(active ? 1 : 0.42);
    phraseHint.setAlpha(active ? 0.72 : 0.26);

    stepObjects.forEach(({ card, label, helperLabel }, index) => {
      const isActiveStep = active && index === activeStep;
      card.setAlpha(isActiveStep ? (lowIntensity ? 0.52 : 0.7) : active ? 0.2 : 0.08);
      card.setScale(isActiveStep ? 1.04 : 1);
      label.setAlpha(isActiveStep ? 1 : active ? 0.62 : 0.24);
      helperLabel.setAlpha(isActiveStep ? 0.86 : active ? 0.48 : 0.2);
    });

    if (phraseTween) {
      phraseTween.paused = !shouldRun;
    }

    if (!shouldRun) {
      phrasePanel.setScale(1);
      phrasePreview.setScale(1);
    }
  }

  applyState();

  return {
    setActive(nextActive: boolean): void {
      active = nextActive;
      activeStep = motionEnabled ? activeStep : 1;
      applyState();
    },
    setPaused(nextPaused: boolean): void {
      paused = nextPaused;
      applyState();
    },
    destroy(): void {
      phraseTween?.stop();
      stepTimer?.remove(false);
      title.destroy();
      phrasePanel.destroy();
      phrasePreview.destroy();
      phraseHint.destroy();
      stepObjects.forEach(({ card, label, helperLabel }) => {
        card.destroy();
        label.destroy();
        helperLabel.destroy();
      });
    },
  };
};
