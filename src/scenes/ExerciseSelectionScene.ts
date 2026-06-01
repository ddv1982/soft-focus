import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { navigateToScene } from '../game/navigation';
import { sceneKeys } from '../game/sceneKeys';
import { exerciseCatalog, getExerciseStartScene } from '../practice/exercises';
import { createBackButton } from '../ui/components/BackButton';
import { createCard } from '../ui/components/Card';
import { createPrimaryButton, getPrimaryButtonSize } from '../ui/components/PrimaryButton';
import { createScreenTitle } from '../ui/components/ScreenTitle';
import { clampContentWidth, getLayoutFrame } from '../ui/layout';
import { withTextResolution } from '../ui/textResolution';
import { uiTheme } from '../ui/theme';

export class ExerciseSelectionScene extends Phaser.Scene {
  constructor() {
    super(sceneKeys.exerciseSelection);
  }

  create(): void {
    const sessionStore = getSessionStore(this);
    sessionStore.updateCurrentScene(sceneKeys.exerciseSelection);

    const frame = getLayoutFrame({
      width: this.scale.width,
      height: this.scale.height,
    });
    const contentCenterX = frame.contentX + (frame.contentWidth / 2);
    const cardWidth = clampContentWidth(frame.contentWidth);

    createBackButton(this, {
      x: frame.contentX,
      y: frame.contentY + uiTheme.spacing.sm,
      onPress: () => {
        navigateToScene(this, {
          from: sceneKeys.exerciseSelection,
          to: sceneKeys.entry,
        });
      },
    });

    const title = createScreenTitle(this, {
      x: contentCenterX,
      y: frame.contentY + uiTheme.spacing.xl,
      width: cardWidth,
      title: 'Choose an exercise',
      subtitle: 'Pick the focus that fits right now.',
    });

    const { height: buttonHeight, width: buttonWidth } = getPrimaryButtonSize(cardWidth - (uiTheme.spacing.xl * 2));
    const gap = uiTheme.spacing.md;
    const cardPaddingTop = uiTheme.spacing.md;
    const cardPaddingBottom = uiTheme.spacing.lg;
    const cardInnerSpacing = uiTheme.spacing.xs;
    const cardButtonGap = uiTheme.spacing.lg;
    const firstCardY = title.y + title.height + uiTheme.spacing.xl;
    let currentY = firstCardY;

    exerciseCatalog.forEach((exercise) => {
      const phaseTag = this.add.text(contentCenterX, currentY + cardPaddingTop, exercise.phaseLabel, withTextResolution({
        color: uiTheme.colors.accent,
        fontFamily: uiTheme.typography.fontFamily,
        fontSize: '13px',
        fontStyle: '600',
        align: 'center',
      }));
      phaseTag.setOrigin(0.5, 0);

      const heading = this.add.text(contentCenterX, phaseTag.y + phaseTag.height + cardInnerSpacing, exercise.title, withTextResolution({
        color: uiTheme.colors.text,
        fontFamily: uiTheme.typography.fontFamily,
        fontSize: `${uiTheme.typography.cardHeadingSize}px`,
        fontStyle: '600',
        align: 'center',
        wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
      }));
      heading.setOrigin(0.5, 0);

      const summary = this.add.text(contentCenterX, heading.y + heading.height + uiTheme.spacing.sm, exercise.summary, withTextResolution({
        color: uiTheme.colors.textMuted,
        fontFamily: uiTheme.typography.fontFamily,
        fontSize: '15px',
        align: 'center',
        wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
        lineSpacing: 4,
      }));
      summary.setOrigin(0.5, 0);

      const textBottom = summary.y + summary.height;
      const buttonY = textBottom + cardButtonGap + (buttonHeight / 2);
      const cardHeight = (buttonY + (buttonHeight / 2) + cardPaddingBottom) - currentY;

      const card = createCard(this, {
        x: contentCenterX,
        y: currentY,
        width: cardWidth,
        height: cardHeight,
        alpha: 0.66,
      });
      card.setDepth(-10);

      createPrimaryButton(this, {
        x: contentCenterX,
        y: buttonY,
        width: buttonWidth,
        label: `Start ${exercise.title}`,
        onPress: () => {
          sessionStore.setSelectedExercise(exercise.id);
          navigateToScene(this, {
            from: sceneKeys.exerciseSelection,
            to: getExerciseStartScene(exercise.id),
          });
        },
      });

      currentY += cardHeight + gap;
    });

  }
}
