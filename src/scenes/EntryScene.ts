import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { navigateToScene } from '../game/navigation';
import { sceneKeys } from '../game/sceneKeys';
import { createCard } from '../ui/components/Card';
import { createPrimaryButton, getPrimaryButtonSize } from '../ui/components/PrimaryButton';
import { createScreenTitle } from '../ui/components/ScreenTitle';
import { clampContentWidth, getLayoutFrame } from '../ui/layout';
import { renderOceanBackground } from '../ui/oceanBackground';
import { uiTheme } from '../ui/theme';

const introCopy = [
  'Take one slow breath and let your attention settle before you begin.',
  'You will choose an exercise, set the pace gently, and move into practice when you are ready.',
  'If you feel strained at any point, pause and soften your focus.',
].join('\n\n');

export class EntryScene extends Phaser.Scene {
  constructor() {
    super(sceneKeys.entry);
  }

  create(): void {
    getSessionStore(this).updateCurrentScene(sceneKeys.entry);

    const frame = getLayoutFrame({
      width: this.scale.width,
      height: this.scale.height,
    });
    const contentCenterX = frame.contentX + (frame.contentWidth / 2);
    const cardWidth = clampContentWidth(frame.contentWidth);

    renderOceanBackground(this, { frame });

    const eyebrow = this.add.text(contentCenterX, frame.contentY, 'Soft Focus', {
      color: uiTheme.colors.accent,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      fontStyle: '600',
      align: 'center',
    });
    eyebrow.setOrigin(0.5, 0);

    const title = createScreenTitle(this, {
      x: contentCenterX,
      y: eyebrow.y + eyebrow.height + uiTheme.spacing.sm,
      width: cardWidth,
      title: 'A calm first step into guided practice',
      subtitle: 'Settle in, choose your exercise, and move forward at an easy pace.',
    });

    const { height: buttonHeight } = getPrimaryButtonSize(cardWidth);
    const buttonY = frame.height - uiTheme.spacing.xl - (buttonHeight / 2);
    const cardTop = title.y + title.height + uiTheme.spacing.lg;
    const cardBottom = buttonY - (buttonHeight / 2) - uiTheme.spacing.lg;
    const cardHeight = Math.max(196, cardBottom - cardTop);

    const card = createCard(this, {
      x: contentCenterX,
      y: cardTop,
      width: cardWidth,
      height: cardHeight,
    });

    const intro = this.add.text(card.x, card.y + uiTheme.spacing.lg, introCopy, {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: `${uiTheme.typography.bodySize}px`,
      align: 'left',
      wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
      lineSpacing: uiTheme.typography.bodyLineHeight - uiTheme.typography.bodySize,
    });
    intro.setOrigin(0.5, 0);

    const note = this.add.text(card.x, card.y + card.height - uiTheme.spacing.lg, 'You can change the exercise and phrase before practice begins.', {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      align: 'center',
      wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
    });
    note.setOrigin(0.5, 1);

    createPrimaryButton(this, {
      x: contentCenterX,
      y: buttonY,
      width: cardWidth,
        label: 'Choose your exercise',
        onPress: () => {
          navigateToScene(this, {
            from: sceneKeys.entry,
            to: sceneKeys.exerciseSelection,
          });
        },
      });
  }
}
