import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { getInstructionsBackScene, navigateToScene } from '../game/navigation';
import { sceneKeys } from '../game/sceneKeys';
import { createPracticeConfigFromSettings } from '../practice/practiceConfig';
import { createBackButton } from '../ui/components/BackButton';
import { createCard } from '../ui/components/Card';
import { createPrimaryButton, getPrimaryButtonSize, setPrimaryButtonEnabled } from '../ui/components/PrimaryButton';
import { isValidPhrase } from '../state/types';
import { createScreenTitle } from '../ui/components/ScreenTitle';
import { clampContentWidth, getLayoutFrame } from '../ui/layout';
import { uiTheme } from '../ui/theme';

type SelectorOption = {
  id: string;
  title: string;
  summary: string;
};

const createToggle = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  label: string,
  description: string,
  initialValue: boolean,
  onToggle: (nextValue: boolean) => void,
): Phaser.GameObjects.Container => {
  const border = Number.parseInt(uiTheme.colors.border.slice(1), 16);
  const surface = Number.parseInt(uiTheme.colors.surfaceRaised.slice(1), 16);
  const accent = Number.parseInt(uiTheme.colors.accent.slice(1), 16);
  const toggleWidth = 48;
  const toggleHeight = 28;
  let value = initialValue;

  const labelText = scene.add.text((-width / 2) + uiTheme.spacing.md, -10, label, {
    color: uiTheme.colors.text,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '16px',
    fontStyle: '600',
  });
  labelText.setOrigin(0, 0.5);

  const descriptionText = scene.add.text((-width / 2) + uiTheme.spacing.md, 18, description, {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '14px',
    wordWrap: { width: width - toggleWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
    lineSpacing: 4,
  });
  descriptionText.setOrigin(0, 0);

  const track = scene.add.rectangle((width / 2) - uiTheme.spacing.md - (toggleWidth / 2), 4, toggleWidth, toggleHeight, surface)
    .setOrigin(0.5)
    .setStrokeStyle(1, border, 1);

  const knob = scene.add.circle(0, 4, 10, Number.parseInt(uiTheme.colors.text.slice(1), 16));

  const refresh = (): void => {
    track.setFillStyle(value ? accent : surface);
    knob.setX((width / 2) - uiTheme.spacing.md - (value ? 14 : 34));
  };

  const container = scene.add.container(x, y, [labelText, descriptionText, track, knob]);
  container.setSize(width, Math.max(72, descriptionText.y + descriptionText.height + uiTheme.spacing.sm));

  const toggle = (): void => {
    value = !value;
    refresh();
    onToggle(value);
  };

  track.setInteractive({ useHandCursor: true });
  knob.setInteractive({ useHandCursor: true });
  track.on('pointerup', toggle);
  knob.on('pointerup', toggle);

  refresh();

  return container;
};

const getExpectationsText = (expectations: readonly string[]): string => expectations
  .map((expectation, index) => `${index + 1}. ${expectation}`)
  .join('\n\n');

const createOptionSelector = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  label: string,
  options: readonly SelectorOption[],
  initialValue: string,
  onSelect: (nextValue: string) => void,
): Phaser.GameObjects.Container => {
  const border = Number.parseInt(uiTheme.colors.border.slice(1), 16);
  const surface = Number.parseInt(uiTheme.colors.surfaceRaised.slice(1), 16);
  const accent = Number.parseInt(uiTheme.colors.accent.slice(1), 16);
  const optionHeight = 76;
  const optionGap = uiTheme.spacing.sm;
  let value = initialValue;

  const labelText = scene.add.text((-width / 2) + uiTheme.spacing.md, 0, label, {
    color: uiTheme.colors.text,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '16px',
    fontStyle: '600',
  });
  labelText.setOrigin(0, 0);

  const optionViews = options.map((option, index) => {
    const optionCenterY = labelText.height + uiTheme.spacing.sm + (index * (optionHeight + optionGap)) + (optionHeight / 2);
    const background = scene.add.rectangle(0, optionCenterY, width, optionHeight, surface)
      .setOrigin(0.5)
      .setStrokeStyle(1, border, 0.9);

    const title = scene.add.text((-width / 2) + uiTheme.spacing.md, optionCenterY - 14, option.title, {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '15px',
      fontStyle: '600',
      wordWrap: { width: width - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
    });
    title.setOrigin(0, 0.5);

    const summary = scene.add.text((-width / 2) + uiTheme.spacing.md, optionCenterY + 10, option.summary, {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '13px',
      wordWrap: { width: width - (uiTheme.spacing.xl * 2) - 24, useAdvancedWrap: true },
      lineSpacing: 3,
    });
    summary.setOrigin(0, 0.5);

    const indicator = scene.add.circle((width / 2) - uiTheme.spacing.md - 9, optionCenterY, 9, border, 0.85);

    background.setInteractive({ useHandCursor: true });
    background.on('pointerup', () => {
      value = option.id;
      refresh();
      onSelect(value);
    });

    return { option, background, title, summary, indicator };
  });

  const refresh = (): void => {
    optionViews.forEach(({ option, background, title, summary, indicator }) => {
      const selected = option.id === value;
      background.setFillStyle(selected ? accent : surface, selected ? 0.2 : 1);
      background.setStrokeStyle(1, selected ? accent : border, selected ? 1 : 0.9);
      title.setColor(uiTheme.colors.text);
      summary.setColor(selected ? uiTheme.colors.text : uiTheme.colors.textMuted);
      indicator.setFillStyle(selected ? accent : border, selected ? 1 : 0.85);
    });
  };

  const container = scene.add.container(x, y, [
    labelText,
    ...optionViews.flatMap(({ background, title, summary, indicator }) => [background, title, summary, indicator]),
  ]);
  container.setSize(width, labelText.height + uiTheme.spacing.sm + (options.length * optionHeight) + ((options.length - 1) * optionGap));

  refresh();

  return container;
};

export class InstructionsScene extends Phaser.Scene {
  constructor() {
    super(sceneKeys.instructions);
  }

  create(): void {
    const sessionStore = getSessionStore(this);
    sessionStore.updateCurrentScene(sceneKeys.instructions);

    const frame = getLayoutFrame({
      width: this.scale.width,
      height: this.scale.height,
    });
    const compactLayout = frame.contentHeight <= 520;
    const edgeSpacing = compactLayout ? uiTheme.spacing.lg : uiTheme.spacing.xl;
    const sectionSpacing = compactLayout ? uiTheme.spacing.md : uiTheme.spacing.lg;
    const contentSpacing = compactLayout ? uiTheme.spacing.lg : uiTheme.spacing.xl;
    const contentCenterX = frame.contentX + (frame.contentWidth / 2);
    const cardWidth = clampContentWidth(frame.contentWidth);
    const savedState = sessionStore.getState();
    const { phrase, selectedExercise } = savedState;
    let lowIntensityMode = savedState.settings.lowIntensityMode;
    let gazeGuidanceEnabled = savedState.settings.gazeGuidanceEnabled;
    const previewConfig = createPracticeConfigFromSettings(selectedExercise, phrase, savedState.settings);

    this.add.rectangle(
      frame.width / 2,
      frame.height / 2,
      frame.width,
      frame.height,
      Number.parseInt(uiTheme.colors.background.slice(1), 16),
    );

    createBackButton(this, {
      x: frame.contentX,
      y: frame.contentY + uiTheme.spacing.sm,
      onPress: () => {
        navigateToScene(this, {
          from: sceneKeys.instructions,
          to: getInstructionsBackScene(selectedExercise),
        });
      },
    });

    const title = createScreenTitle(this, {
      x: contentCenterX,
      y: frame.contentY + edgeSpacing,
      width: cardWidth,
      title: `${previewConfig.exercise.title} instructions`,
      subtitle: previewConfig.copy.instructionsSubtitle,
    });

    const { height: buttonHeight } = getPrimaryButtonSize(cardWidth);
    const buttonY = frame.height - edgeSpacing - (buttonHeight / 2);
    const cardTop = title.y + title.height + sectionSpacing;
    const cardBottom = buttonY - (buttonHeight / 2) - sectionSpacing;
    const cardHeight = Math.max(0, cardBottom - cardTop);

    const card = createCard(this, {
      x: contentCenterX,
      y: cardTop,
      width: cardWidth,
      height: cardHeight,
    });

    const cardContent = this.add.container(card.x, card.y + sectionSpacing);

    const phraseLabel = this.add.text(0, 0, previewConfig.copy.instructionsSelectionLabel, {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      fontStyle: '600',
      align: 'center',
    });
    phraseLabel.setOrigin(0.5, 0);
    cardContent.add(phraseLabel);

    const phraseText = this.add.text(
      0,
      phraseLabel.y + phraseLabel.height + uiTheme.spacing.sm,
      previewConfig.exercise.requiresPhrase
        ? (phrase ? `"${phrase}"` : 'No phrase was saved.')
        : (previewConfig.movingBall?.title ?? previewConfig.exercise.summary),
      {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '24px',
      fontStyle: '600',
      align: 'center',
      wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
    });
    phraseText.setOrigin(0.5, 0);
    cardContent.add(phraseText);

    let expectationsStartY = phraseText.y + phraseText.height + sectionSpacing;

    if (previewConfig.movingBall) {
      const presetSummary = this.add.text(0, phraseText.y + phraseText.height + uiTheme.spacing.xs, previewConfig.movingBall.summary, {
        color: uiTheme.colors.textMuted,
        fontFamily: uiTheme.typography.fontFamily,
        fontSize: '14px',
        align: 'center',
        wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
        lineSpacing: 4,
      });
      presetSummary.setOrigin(0.5, 0);
      cardContent.add(presetSummary);
      expectationsStartY = presetSummary.y + presetSummary.height + sectionSpacing;
    }

    const expectations = previewConfig.expectations;
    const expectationsTitle = this.add.text(0, expectationsStartY, previewConfig.copy.expectationsTitle, {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '16px',
      fontStyle: '600',
      align: 'center',
    });
    expectationsTitle.setOrigin(0.5, 0);
    cardContent.add(expectationsTitle);

    const expectationsText = this.add.text(0, expectationsTitle.y + expectationsTitle.height + uiTheme.spacing.sm, getExpectationsText(expectations), {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      align: 'left',
      wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
      lineSpacing: 4,
    });
    expectationsText.setOrigin(0.5, 0);
    cardContent.add(expectationsText);

    const lowIntensityToggle = createToggle(
      this,
      0,
      expectationsText.y + expectationsText.height + contentSpacing,
      cardWidth - (uiTheme.spacing.xl * 2),
      previewConfig.lowIntensity.label,
      previewConfig.lowIntensity.description,
      lowIntensityMode,
      (nextValue) => {
        lowIntensityMode = nextValue;
        sessionStore.setLowIntensityMode(nextValue);
      },
    );
    cardContent.add(lowIntensityToggle);

    const lastBlock = previewConfig.movingBall
      ? createOptionSelector(
        this,
        0,
        lowIntensityToggle.y + lowIntensityToggle.height + uiTheme.spacing.md,
        cardWidth - (uiTheme.spacing.xl * 2),
        'Sweep preset',
        previewConfig.movingBall.availablePresets,
        previewConfig.movingBall.presetId,
        (nextValue) => {
          sessionStore.setMovingBallPreset(nextValue as typeof previewConfig.movingBall.presetId);
        },
      )
      : createToggle(
        this,
        0,
        lowIntensityToggle.y + lowIntensityToggle.height + uiTheme.spacing.md,
        cardWidth - (uiTheme.spacing.xl * 2),
        previewConfig.gazeGuidance.label,
        previewConfig.gazeGuidance.description,
        gazeGuidanceEnabled,
        (nextValue) => {
          gazeGuidanceEnabled = nextValue;
          sessionStore.setGazeGuidanceEnabled(nextValue);
        },
      );
    cardContent.add(lastBlock);

    const cardContentHeight = lastBlock.y + lastBlock.height;
    const availableCardContentHeight = Math.max(1, card.height - (sectionSpacing * 2));
    if (cardContentHeight > availableCardContentHeight) {
      cardContent.setScale(availableCardContentHeight / cardContentHeight);
    }

    const canStartPractice = !previewConfig.exercise.requiresPhrase || isValidPhrase(phrase);
    const startButton = createPrimaryButton(this, {
      x: contentCenterX,
      y: buttonY,
      width: cardWidth,
      label: 'Start practice',
      onPress: () => {
        const practiceConfig = sessionStore.createPracticeConfig();

        navigateToScene(this, {
          from: sceneKeys.instructions,
          to: sceneKeys.practice,
          data: { practiceConfig },
        });
      },
    });
    setPrimaryButtonEnabled(startButton, canStartPractice);
  }
}
