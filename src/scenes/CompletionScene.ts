import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { navigateToScene } from '../game/navigation';
import { sceneKeys } from '../game/sceneKeys';
import { createPracticeConfigFromSettings } from '../practice/practiceConfig';
import { createCard } from '../ui/components/Card';
import { createPrimaryButton, getPrimaryButtonSize } from '../ui/components/PrimaryButton';
import { createScreenTitle } from '../ui/components/ScreenTitle';
import { clampContentWidth, getLayoutFrame } from '../ui/layout';
import { uiTheme } from '../ui/theme';

const formatDuration = (durationSeconds: number | null): string => {
  if (!durationSeconds || durationSeconds < 60) {
    return durationSeconds === 1 ? '1 second' : `${durationSeconds ?? 0} seconds`;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  if (seconds === 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  return `${minutes}m ${seconds}s`;
};

interface CompletionSceneData {
  outcome?: 'completed' | 'stopped';
}

export class CompletionScene extends Phaser.Scene {
  constructor() {
    super(sceneKeys.completion);
  }

  create(data?: CompletionSceneData): void {
    const sessionStore = getSessionStore(this);
    sessionStore.updateCurrentScene(sceneKeys.completion);

    const frame = getLayoutFrame({
      width: this.scale.width,
      height: this.scale.height,
    });
    const contentCenterX = frame.contentX + (frame.contentWidth / 2);
    const cardWidth = clampContentWidth(frame.contentWidth);
    const outcome = data?.outcome ?? 'completed';
    const state = sessionStore.getState();
    const latestSummary = sessionStore.getLatestSessionSummary();
    const practiceConfig = createPracticeConfigFromSettings(
      latestSummary?.exerciseId ?? state.selectedExercise,
      latestSummary?.phrase || state.phrase,
      state.settings,
    );
    const phrase = latestSummary?.phrase || state.phrase;
    const summaryLines = [
      `Phase: ${practiceConfig.exercise.phaseLabel}`,
      `Exercise: ${practiceConfig.exercise.title}`,
      ...(practiceConfig.movingBall ? [`Preset: ${practiceConfig.movingBall.title}`] : []),
      ...(practiceConfig.exercise.requiresPhrase ? [phrase ? `Phrase: "${phrase}"` : 'Phrase: not available'] : []),
      latestSummary?.durationSeconds !== undefined
        ? `Length: ${formatDuration(latestSummary?.durationSeconds ?? null)}`
        : 'Length: just completed',
      `Mode: ${latestSummary?.outcome === 'stopped' ? 'Stopped early' : 'Completed'}`,
    ];

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
      title: outcome === 'completed' ? `${practiceConfig.exercise.phaseLabel} round complete` : `${practiceConfig.exercise.phaseLabel} round paused early`,
      subtitle: outcome === 'completed'
        ? `You reached the end of this ${practiceConfig.exercise.phaseLabel.toLowerCase()} round. Take a brief breath before reflecting.`
        : `You ended this ${practiceConfig.exercise.phaseLabel.toLowerCase()} round cleanly. Take a brief breath before reflecting.`,
    });

    const { height: buttonHeight } = getPrimaryButtonSize(cardWidth);
    const buttonY = frame.height - uiTheme.spacing.xl - (buttonHeight / 2);
    const cardTop = title.y + title.height + uiTheme.spacing.lg;
    const cardBottom = buttonY - (buttonHeight / 2) - uiTheme.spacing.lg;
    const cardHeight = Math.max(212, cardBottom - cardTop);
    const card = createCard(this, {
      x: contentCenterX,
      y: cardTop,
      width: cardWidth,
      height: cardHeight,
    });

    const summaryLabel = this.add.text(card.x, card.y + uiTheme.spacing.lg, `${practiceConfig.exercise.phaseLabel} round summary`, {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      fontStyle: '600',
      align: 'center',
    });
    summaryLabel.setOrigin(0.5, 0);

    const summary = this.add.text(card.x, summaryLabel.y + summaryLabel.height + uiTheme.spacing.sm, summaryLines.join('\n\n'), {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: `${uiTheme.typography.bodySize}px`,
      align: 'left',
      wordWrap: { width: cardWidth - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
      lineSpacing: uiTheme.typography.bodyLineHeight - uiTheme.typography.bodySize,
    });
    summary.setOrigin(0.5, 0);

    const note = this.add.text(card.x, card.y + card.height - uiTheme.spacing.lg, practiceConfig.copy.completionNote, {
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
      label: 'Continue to reflection',
      onPress: () => {
        navigateToScene(this, {
          from: sceneKeys.completion,
          to: sceneKeys.reflection,
        });
      },
    });
  }
}
