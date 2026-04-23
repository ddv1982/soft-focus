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
  const phraseCardWidth = Math.min(readableWidth, 500);
  const displayPhrase = getDisplayPhrase(phrase);
  const haloRadius = Math.max(70, Math.min(112, readableWidth * 0.18));
  const haloRestScale = motionEnabled ? 0.92 : 1;
  const haloInhaleScale = lowIntensity ? 1.02 : 1.18;

  const title = scene.add.text(x, y - haloRadius - 38, 'Phrase with relaxed breathing', {
    color: uiTheme.colors.seaGlass,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '13px',
    fontStyle: '700',
    align: 'center',
  });
  title.setOrigin(0.5);

  const halo = scene.add.circle(x, y, haloRadius, accent, lowIntensity ? 0.05 : 0.08)
    .setStrokeStyle(2, accent, lowIntensity ? 0.2 : 0.34);
  const innerGlow = scene.add.circle(x, y, haloRadius * 0.68, accent, lowIntensity ? 0.06 : 0.1);

  const phrasePanel = scene.add.rectangle(x, y, phraseCardWidth, 72, accent, lowIntensity ? 0.1 : 0.14)
    .setOrigin(0.5)
    .setStrokeStyle(1, border, lowIntensity ? 0.18 : 0.28);

  const phrasePreview = scene.add.text(x, y - 10, `“${displayPhrase}”`, {
    color: uiTheme.colors.foam,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '18px',
    fontStyle: '700',
    align: 'center',
    wordWrap: { width: phraseCardWidth - 28, useAdvancedWrap: true },
  });
  phrasePreview.setOrigin(0.5);

  const phraseHint = scene.add.text(x, y + 18, 'Let the phrase ride the breath.', {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '12px',
    align: 'center',
    wordWrap: { width: phraseCardWidth - 24, useAdvancedWrap: true },
  });
  phraseHint.setOrigin(0.5);

  const breathLabel = scene.add.text(x, y + haloRadius + 24, 'Breathe in softly', {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '14px',
    fontStyle: '600',
    align: 'center',
  });
  breathLabel.setOrigin(0.5);

  const returnLabel = scene.add.text(x, y + haloRadius + 48, 'Return to the phrase on an easy exhale.', {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '13px',
    align: 'center',
    wordWrap: { width: readableWidth, useAdvancedWrap: true },
  });
  returnLabel.setOrigin(0.5);

  let active = false;
  let paused = false;
  const alphaVisible = lowIntensity ? 0.78 : 0.92;
  let breathTween: Phaser.Tweens.TweenChain | null = null;

  if (motionEnabled) {
    breathTween = scene.tweens.chain({
      targets: [halo, innerGlow],
      loop: -1,
      paused: true,
      tweens: [
        {
          scaleX: haloInhaleScale,
          scaleY: haloInhaleScale,
          duration: 3600,
          ease: 'Sine.InOut',
          onStart: () => {
            breathLabel.setText('Breathe in softly');
            returnLabel.setText('Let the phrase arrive without forcing it.');
          },
        },
        {
          scaleX: haloRestScale,
          scaleY: haloRestScale,
          duration: 4800,
          ease: 'Sine.Out',
          onStart: () => {
            breathLabel.setText('Easy exhale');
            returnLabel.setText('Return to the phrase and soften the effort.');
          },
        },
      ],
    });
  }

  function applyState(): void {
    const visibleAlpha = active ? alphaVisible : 0.28;
    const shouldRun = active && !paused && motionEnabled;

    title.setAlpha(visibleAlpha);
    halo.setAlpha(active ? (lowIntensity ? 0.5 : 0.74) : 0.16);
    innerGlow.setAlpha(active ? (lowIntensity ? 0.24 : 0.36) : 0.1);
    phrasePanel.setAlpha(active ? (lowIntensity ? 0.55 : 0.78) : 0.2);
    phrasePreview.setAlpha(active ? 1 : 0.42);
    phraseHint.setAlpha(active ? 0.72 : 0.26);
    breathLabel.setAlpha(active ? 0.9 : 0.28);
    returnLabel.setAlpha(active ? 0.72 : 0.24);

    if (breathTween) {
      breathTween.paused = !shouldRun;
    }

    if (!shouldRun) {
      halo.setScale(1);
      innerGlow.setScale(1);
      breathLabel.setText('Natural breath');
      returnLabel.setText('Let the phrase arrive and soften around it.');
    }
  }

  applyState();

  return {
    setActive(nextActive: boolean): void {
      const wasActive = active;
      active = nextActive;

      if (active && !wasActive && breathTween) {
        breathTween.restart();
        breathTween.paused = paused;
      }

      applyState();
    },
    setPaused(nextPaused: boolean): void {
      paused = nextPaused;
      applyState();
    },
    destroy(): void {
      breathTween?.stop();
      title.destroy();
      halo.destroy();
      innerGlow.destroy();
      phrasePanel.destroy();
      phrasePreview.destroy();
      phraseHint.destroy();
      breathLabel.destroy();
      returnLabel.destroy();
    },
  };
};
