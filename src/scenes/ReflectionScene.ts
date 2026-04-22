import * as Phaser from 'phaser';

import { createReflectionOverlay } from '../dom/reflectionOverlay';
import { getSessionStore } from '../game/Game';
import { navigateToScene } from '../game/navigation';
import { sceneKeys } from '../game/sceneKeys';
import { createPracticeConfigFromSettings } from '../practice/practiceConfig';
import { createCard } from '../ui/components/Card';
import { createPrimaryButton, getPrimaryButtonSize } from '../ui/components/PrimaryButton';
import { createScreenTitle } from '../ui/components/ScreenTitle';
import { clampContentWidth, getLayoutFrame } from '../ui/layout';
import { uiTheme } from '../ui/theme';
import { exerciseIds, normalizeReflection, reflectionMaxLength } from '../state/types';

export class ReflectionScene extends Phaser.Scene {
  constructor() {
    super(sceneKeys.reflection);
  }

  create(): void {
    const sessionStore = getSessionStore(this);
    sessionStore.updateCurrentScene(sceneKeys.reflection);

    const frame = getLayoutFrame({
      width: this.scale.width,
      height: this.scale.height,
    });
    const contentCenterX = frame.contentX + (frame.contentWidth / 2);
    const cardWidth = clampContentWidth(frame.contentWidth);
    const state = sessionStore.getState();
    const practiceConfig = createPracticeConfigFromSettings(state.selectedExercise, state.phrase, state.settings);
    const savedReflection = sessionStore.getState().currentSession?.reflection
      ?? sessionStore.getLatestSessionSummary()?.reflection
      ?? '';
    let draftReflection = savedReflection;

    this.add.rectangle(
      frame.width / 2,
      frame.height / 2,
      frame.width,
      frame.height,
      Number.parseInt(uiTheme.colors.background.slice(1), 16),
    );

    const title = createScreenTitle(this, {
      x: contentCenterX,
      y: frame.contentY + uiTheme.spacing.xl,
      width: cardWidth,
      title: 'Integration / Reflection',
      subtitle: practiceConfig.copy.reflectionSubtitle,
    });

    const { height: buttonHeight } = getPrimaryButtonSize(cardWidth);
    const buttonY = frame.height - uiTheme.spacing.xl - (buttonHeight / 2);
    const cardTop = title.y + title.height + uiTheme.spacing.lg;
    const cardBottom = buttonY - (buttonHeight / 2) - uiTheme.spacing.lg;
    const cardHeight = Math.max(280, cardBottom - cardTop);
    const card = createCard(this, {
      x: contentCenterX,
      y: cardTop,
      width: cardWidth,
      height: cardHeight,
    });

    const prompt = this.add.text(card.x, card.y + uiTheme.spacing.lg, practiceConfig.copy.reflectionPrompt, {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: `${uiTheme.typography.bodySize}px`,
      align: 'left',
      wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
      lineSpacing: uiTheme.typography.bodyLineHeight - uiTheme.typography.bodySize,
    });
    prompt.setOrigin(0.5, 0);

    const inputWidth = cardWidth - (uiTheme.spacing.xl * 2);
    const inputHeight = Math.max(120, card.height - prompt.height - (uiTheme.spacing.xl * 2) - 48);
    const inputLeft = contentCenterX - (inputWidth / 2);
    const inputTop = prompt.y + prompt.height + uiTheme.spacing.md;

    const helper = this.add.text(card.x, card.y + card.height - uiTheme.spacing.lg, practiceConfig.copy.reflectionHelper, {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      align: 'center',
      wordWrap: { width: inputWidth, useAdvancedWrap: true },
    });
    helper.setOrigin(0.5, 1);

    const returnToPhrase = (): void => {
      sessionStore.saveReflection(draftReflection);
      sessionStore.prepareForNextSession();
      navigateToScene(this, {
        from: sceneKeys.reflection,
        to: sessionStore.getState().selectedExercise === exerciseIds.movingBall ? sceneKeys.instructions : sceneKeys.phrase,
      });
    };

    createPrimaryButton(this, {
      x: contentCenterX,
      y: buttonY,
      width: cardWidth,
      label: 'Save and start again',
      onPress: returnToPhrase,
    });

    const parent = this.game.canvas.parentElement;

    if (!parent) {
      throw new Error('Expected the Phaser canvas to have a parent element for the reflection overlay.');
    }

    const overlay = createReflectionOverlay({
      parent,
      initialValue: savedReflection,
      placeholder: practiceConfig.copy.reflectionPlaceholder,
      maxLength: reflectionMaxLength,
      onInput: (value) => {
        draftReflection = normalizeReflection(value);
        helper.setText(
          draftReflection.length > 0
            ? `${draftReflection.length}/${reflectionMaxLength} characters`
            : practiceConfig.copy.reflectionHelper,
        );
      },
      onSubmit: returnToPhrase,
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

    this.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
      syncOverlayLayout();
      overlay.focus();
    });
    this.time.delayedCall(30, syncOverlayLayout);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', syncOverlayLayout);
      window.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      overlay.destroy();
    });
  }
}
