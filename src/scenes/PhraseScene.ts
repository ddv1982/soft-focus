import * as Phaser from 'phaser';

import { createPhraseOverlay } from '../dom/phraseOverlay';
import { getSessionStore } from '../game/Game';
import { navigateToScene } from '../game/navigation';
import { sceneKeys } from '../game/sceneKeys';
import { exerciseIds } from '../state/types';
import { createBackButton } from '../ui/components/BackButton';
import { createCard } from '../ui/components/Card';
import { createPrimaryButton, getPrimaryButtonSize, setPrimaryButtonEnabled } from '../ui/components/PrimaryButton';
import { createScreenTitle } from '../ui/components/ScreenTitle';
import { clampContentWidth, getLayoutFrame } from '../ui/layout';
import { renderOceanBackground } from '../ui/oceanBackground';
import { uiTheme } from '../ui/theme';
import { isValidPhrase, normalizePhrase, phraseMinLength } from '../state/types';

const getHelperCopy = (phrase: string): string => {
  if (isValidPhrase(phrase)) {
    return 'That phrase is ready. You can continue when it feels right.';
  }

  return `Use at least ${phraseMinLength} characters for now.`;
};

export class PhraseScene extends Phaser.Scene {
  constructor() {
    super(sceneKeys.phrase);
  }

  create(): void {
    const sessionStore = getSessionStore(this);

    if (sessionStore.getState().selectedExercise === exerciseIds.movingBall) {
      navigateToScene(this, {
        from: sceneKeys.phrase,
        to: sceneKeys.instructions,
      });
      return;
    }

    sessionStore.updateCurrentScene(sceneKeys.phrase);

    const frame = getLayoutFrame({
      width: this.scale.width,
      height: this.scale.height,
    });
    const contentCenterX = frame.contentX + (frame.contentWidth / 2);
    const cardWidth = clampContentWidth(frame.contentWidth);
    const savedPhrase = sessionStore.getState().phrase;
    let draftPhrase = savedPhrase;

    renderOceanBackground(this, { frame });

    createBackButton(this, {
      x: frame.contentX,
      y: frame.contentY + uiTheme.spacing.sm,
      onPress: () => {
        navigateToScene(this, {
          from: sceneKeys.phrase,
          to: sceneKeys.exerciseSelection,
        });
      },
    });

    const title = createScreenTitle(this, {
      x: contentCenterX,
      y: frame.contentY + uiTheme.spacing.xl,
      width: cardWidth,
      title: 'Choose your phrase',
      subtitle: 'Use a short phrase that feels steady and easy to return to.',
    });

    const { height: buttonHeight } = getPrimaryButtonSize(cardWidth);
    const buttonY = frame.height - uiTheme.spacing.xl - (buttonHeight / 2);
    const cardTop = title.y + title.height + uiTheme.spacing.lg;
    const cardBottom = buttonY - (buttonHeight / 2) - uiTheme.spacing.lg;
    const cardHeight = Math.max(260, cardBottom - cardTop);

    const card = createCard(this, {
      x: contentCenterX,
      y: cardTop,
      width: cardWidth,
      height: cardHeight,
    });

    const intro = this.add.text(card.x, card.y + uiTheme.spacing.lg, 'Enter the phrase you want to practice with in the next step.', {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: `${uiTheme.typography.bodySize}px`,
      align: 'center',
      wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
      lineSpacing: uiTheme.typography.bodyLineHeight - uiTheme.typography.bodySize,
    });
    intro.setOrigin(0.5, 0);

    const label = this.add.text(card.x - ((cardWidth - (uiTheme.spacing.xl * 2)) / 2), intro.y + intro.height + uiTheme.spacing.lg, 'Phrase', {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      fontStyle: '600',
    });
    label.setOrigin(0, 0);

    const inputHeight = 56;
    const inputWidth = cardWidth - (uiTheme.spacing.xl * 2);
    const inputLeft = contentCenterX - (inputWidth / 2);
    const inputTop = label.y + label.height + uiTheme.spacing.sm;

    const helper = this.add.text(card.x, inputTop + inputHeight + uiTheme.spacing.sm, getHelperCopy(draftPhrase), {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      align: 'center',
      wordWrap: { width: inputWidth, useAdvancedWrap: true },
    });
    helper.setOrigin(0.5, 0);

    const note = this.add.text(card.x, card.y + card.height - uiTheme.spacing.lg, 'Keep it simple. You can refine the experience later without changing today\'s phrase.', {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      align: 'center',
      wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
    });
    note.setOrigin(0.5, 1);

    const continueWithPhrase = (): void => {
      const nextPhrase = normalizePhrase(draftPhrase);

      if (!isValidPhrase(nextPhrase)) {
        helper.setText(getHelperCopy(nextPhrase));
        overlay.setInvalid(true);
        overlay.focus();
        setPrimaryButtonEnabled(continueButton, false);
        return;
      }

      sessionStore.setPhrase(nextPhrase);
      navigateToScene(this, {
        from: sceneKeys.phrase,
        to: sceneKeys.instructions,
      });
    };

    const continueButton = createPrimaryButton(this, {
      x: contentCenterX,
      y: buttonY,
      width: cardWidth,
      label: 'Continue',
      onPress: continueWithPhrase,
    });
    setPrimaryButtonEnabled(continueButton, isValidPhrase(draftPhrase));

    const parent = this.game.canvas.parentElement;

    if (!parent) {
      throw new Error('Expected the Phaser canvas to have a parent element for the phrase overlay.');
    }

    const overlay = createPhraseOverlay({
      parent,
      initialValue: savedPhrase,
      placeholder: 'A short practice phrase',
      onInput: (value) => {
        draftPhrase = value;
        const valid = isValidPhrase(value);

        helper.setText(getHelperCopy(value));
        overlay.setInvalid(value.length > 0 && !valid);
        setPrimaryButtonEnabled(continueButton, valid);
      },
      onSubmit: continueWithPhrase,
    });

    const syncOverlayLayout = (): void => {
      const canvasRect = this.game.canvas.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const scaleX = canvasRect.width / this.scale.width;
      const scaleY = canvasRect.height / this.scale.height;

      overlay.updateLayout({
        left: (canvasRect.left - parentRect.left) + (inputLeft * scaleX),
        top: (canvasRect.top - parentRect.top) + (inputTop * scaleY),
        width: inputWidth * scaleX,
        height: inputHeight * scaleY,
      });
    };

    const handleViewportChange = (): void => {
      syncOverlayLayout();
    };

    this.scale.on('resize', syncOverlayLayout);
    window.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    this.events.once(Phaser.Scenes.Events.POST_UPDATE, syncOverlayLayout);
    this.time.delayedCall(30, () => {
      syncOverlayLayout();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', syncOverlayLayout);
      window.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      overlay.destroy();
    });
  }
}
