import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { navigateToScene } from '../game/navigation';
import { sceneKeys } from '../game/sceneKeys';
import { createGazeGuidance, type GazeGuidanceController } from '../practice/gazeGuidance';
import { createMovingBallGuidance, type MovingBallGuidanceController } from '../practice/movingBallGuidance';
import type { PracticeConfig } from '../practice/practiceConfig';
import { PracticeRunner, type PracticeRunnerSnapshot } from '../practice/practiceRunner';
import { createCard } from '../ui/components/Card';
import { createPracticeControls, getPracticeControlsLayout, type PracticeControls } from '../ui/components/PracticeControls';
import { createScreenTitle } from '../ui/components/ScreenTitle';
import { getLayoutFrame } from '../ui/layout';
import { uiTheme } from '../ui/theme';

const getPhaseLabel = (practiceConfig: PracticeConfig, phase: PracticeRunnerSnapshot['phase']): string => {
  switch (phase) {
    case 'settle':
      return 'Settle';
    case 'phrase':
      return practiceConfig.movingBall ? 'Guided sweep' : 'Phrase practice';
    case 'recovery':
      return 'Recovery';
    case 'complete':
      return 'Complete';
    default:
      return 'Practice';
  }
};

const getPhaseCopy = (practiceConfig: PracticeConfig, snapshot: PracticeRunnerSnapshot): string => {
  if (snapshot.paused) {
    return 'Pause and let the pace stay easy. Resume when your breathing and gaze feel settled.';
  }

  switch (snapshot.phase) {
    case 'settle':
      return practiceConfig.movingBall
        ? 'Let your attention settle before the first sweep begins. Keep the effort light.'
        : 'Let your attention settle before the phrase begins. Keep the effort light.';
    case 'phrase':
      if (practiceConfig.movingBall) {
        return practiceConfig.movingBall.activeCopy;
      }

      return practiceConfig.gazeGuidance.enabled
        ? 'Return to the phrase softly and keep the eyes easy.'
        : 'Return to the phrase softly and keep the pace unforced.';
    case 'recovery':
      return 'Ease off fully for a moment and let the practice fade into stillness.';
    case 'complete':
      return 'This round is complete.';
    default:
      return '';
  }
};

const getSurfaceAlpha = (practiceConfig: PracticeConfig): number => (practiceConfig.lowIntensity.enabled ? 0.92 : 0.98);

interface PracticeSceneData {
  practiceConfig?: PracticeConfig;
}

export class PracticeScene extends Phaser.Scene {
  private practiceRunner: PracticeRunner | null = null;

  private practiceConfig: PracticeConfig | null = null;

  private snapshot: PracticeRunnerSnapshot | null = null;

  private phraseText?: Phaser.GameObjects.Text;

  private phaseText?: Phaser.GameObjects.Text;

  private timerText?: Phaser.GameObjects.Text;

  private copyText?: Phaser.GameObjects.Text;

  private statusText?: Phaser.GameObjects.Text;

  private pauseOverlay?: Phaser.GameObjects.Container;

  private controls?: PracticeControls;

  private gazeGuidance?: GazeGuidanceController;

  private movingBallGuidance?: MovingBallGuidanceController;

  private phraseTween?: Phaser.Tweens.Tween;

  constructor() {
    super(sceneKeys.practice);
  }

  create(data?: PracticeSceneData): void {
    const sessionStore = getSessionStore(this);
    const practiceConfig = data?.practiceConfig ?? sessionStore.createPracticeConfig();

    this.practiceConfig = practiceConfig;
    this.practiceRunner = new PracticeRunner(practiceConfig);
    this.snapshot = this.practiceRunner.getSnapshot();

    sessionStore.updateCurrentScene(sceneKeys.practice);
    sessionStore.startPractice(practiceConfig);

    const frame = getLayoutFrame({
      width: this.scale.width,
      height: this.scale.height,
    });
    const contentCenterX = frame.contentX + (frame.contentWidth / 2);
    const cardWidth = frame.contentWidth;
    const titleWidth = Math.min(cardWidth, 980);
    const readableWidth = Math.min(cardWidth - (uiTheme.spacing.xl * 2), 760);
    const stageOuterInset = cardWidth >= 900 ? uiTheme.spacing.lg : uiTheme.spacing.md;
    const stageWidth = Math.max(220, cardWidth - (stageOuterInset * 2));
    const controlsWidth = Math.min(cardWidth, 760);
    const controlsLayout = getPracticeControlsLayout(controlsWidth);
    const controlsY = frame.height - uiTheme.spacing.xl - (controlsLayout.height / 2);
    const movingBallInset = cardWidth >= 900 ? uiTheme.spacing.lg : uiTheme.spacing.md;
    const footerHeight = 84;

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
      width: titleWidth,
      title: practiceConfig.exercise.title,
      subtitle: 'Stay with a calm pace. You can pause, resume, or stop without losing control of the session.',
    });

    const cardTop = title.y + title.height + uiTheme.spacing.lg;
    const cardBottom = controlsY - (controlsLayout.height / 2) - uiTheme.spacing.lg;
    const cardHeight = Math.max(360, cardBottom - cardTop);
    const card = createCard(this, {
      x: contentCenterX,
      y: cardTop,
      width: cardWidth,
      height: cardHeight,
      alpha: getSurfaceAlpha(practiceConfig),
      clampWidth: false,
    });

    this.phaseText = this.add.text(card.x, card.y + uiTheme.spacing.xl, '', {
      color: uiTheme.colors.accent,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      fontStyle: '600',
      align: 'center',
    });
    this.phaseText.setOrigin(0.5, 0);

    this.timerText = this.add.text(card.x, this.phaseText.y + this.phaseText.height + uiTheme.spacing.sm, '', {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '40px',
      fontStyle: '600',
      align: 'center',
    });
    this.timerText.setOrigin(0.5, 0);

    this.phraseText = this.add.text(
      card.x,
      this.timerText.y + this.timerText.height + uiTheme.spacing.xl,
      practiceConfig.exercise.requiresPhrase && practiceConfig.phrase
        ? practiceConfig.phrase
        : (practiceConfig.movingBall?.title ?? 'Follow the moving ball softly'),
      {
         color: uiTheme.colors.text,
        fontFamily: uiTheme.typography.fontFamily,
        fontSize: '28px',
        fontStyle: '600',
        align: 'center',
        wordWrap: { width: readableWidth, useAdvancedWrap: true },
        lineSpacing: 8,
      },
    );
    this.phraseText.setOrigin(0.5, 0);

    this.copyText = this.add.text(card.x, this.phraseText.y + this.phraseText.height + uiTheme.spacing.lg, '', {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: `${uiTheme.typography.bodySize}px`,
      align: 'center',
      wordWrap: { width: readableWidth, useAdvancedWrap: true },
      lineSpacing: uiTheme.typography.bodyLineHeight - uiTheme.typography.bodySize,
    });
    this.copyText.setOrigin(0.5, 0);

    const guideTop = this.copyText.y + this.copyText.height + uiTheme.spacing.xl;
    const guideBottom = card.y + card.height - footerHeight - uiTheme.spacing.lg;
    const guideHeight = Math.max(132, guideBottom - guideTop);
    const guideCenterY = guideTop + (guideHeight / 2);

    const guideSurface = this.add.rectangle(
      card.x,
      guideCenterY,
      stageWidth,
      guideHeight,
      Number.parseInt(uiTheme.colors.surfaceRaised.slice(1), 16),
      0.26,
    ).setOrigin(0.5)
      .setStrokeStyle(1, Number.parseInt(uiTheme.colors.border.slice(1), 16), 0.45);
    guideSurface.setDepth(card.depth + 1);

    this.add.rectangle(
      card.x,
      card.y + card.height - footerHeight,
      cardWidth,
      1,
      Number.parseInt(uiTheme.colors.border.slice(1), 16),
      0.9,
    ).setOrigin(0.5, 0);

    this.statusText = this.add.text(card.x, card.y + card.height - uiTheme.spacing.lg, '', {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      align: 'center',
      wordWrap: { width: Math.min(stageWidth, 820), useAdvancedWrap: true },
      lineSpacing: 4,
    });
    this.statusText.setOrigin(0.5, 1);

    if (practiceConfig.movingBall) {
      this.movingBallGuidance = createMovingBallGuidance({
        scene: this,
        x: card.x,
        y: guideCenterY,
        width: Math.max(180, stageWidth - (movingBallInset * 2)),
        laneBandHeight: practiceConfig.movingBall.laneBandHeight,
        laneHeights: practiceConfig.movingBall.laneHeights,
        cycleMs: practiceConfig.movingBall.cycleMs,
        radius: practiceConfig.movingBall.radius,
        lowIntensity: practiceConfig.lowIntensity.enabled,
      });
    } else if (practiceConfig.gazeGuidance.enabled && practiceConfig.gazeGuidance.prompt) {
      this.gazeGuidance = createGazeGuidance({
        scene: this,
        x: card.x,
        y: guideCenterY,
        width: Math.min(readableWidth, stageWidth - (movingBallInset * 2)),
        lowIntensity: practiceConfig.lowIntensity.enabled,
        prompt: practiceConfig.gazeGuidance.prompt,
      });
    }

    if (!practiceConfig.lowIntensity.enabled && !practiceConfig.movingBall) {
      this.phraseTween = this.tweens.add({
        targets: this.phraseText,
        alpha: 0.74,
        duration: 2200,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      });
    }

    const overlayBackground = this.add.rectangle(0, 0, Math.min(stageWidth, 680), 132, Number.parseInt(uiTheme.colors.background.slice(1), 16), 0.72)
      .setOrigin(0.5)
      .setStrokeStyle(1, Number.parseInt(uiTheme.colors.border.slice(1), 16), 0.8);
    const overlayTitle = this.add.text(0, -18, 'Paused', {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '22px',
      fontStyle: '600',
      align: 'center',
    });
    overlayTitle.setOrigin(0.5, 0.5);
    const overlayCopy = this.add.text(0, 20, practiceConfig.movingBall ? `Resume when the ${practiceConfig.movingBall.title.toLowerCase()} feels easy to follow again.` : 'Resume when the phrase feels easy to return to.', {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      align: 'center',
      wordWrap: { width: Math.min(stageWidth, 680) - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
    });
    overlayCopy.setOrigin(0.5, 0.5);
    this.pauseOverlay = this.add.container(card.x, guideCenterY, [overlayBackground, overlayTitle, overlayCopy]);
    this.pauseOverlay.setVisible(false);

    this.controls = createPracticeControls({
      scene: this,
      x: contentCenterX,
      y: controlsY,
      width: controlsWidth,
      onPause: () => {
        this.setPaused(true);
      },
      onResume: () => {
        this.setPaused(false);
      },
      onStop: () => {
        this.finishPractice('stopped');
      },
    });

    this.refreshView(this.snapshot);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gazeGuidance?.destroy();
      this.movingBallGuidance?.destroy();
      this.phraseTween?.stop();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.practiceRunner || !this.snapshot || this.snapshot.paused || this.snapshot.complete) {
      return;
    }

    const nextSnapshot = this.practiceRunner.tick(delta);

    if (nextSnapshot.complete) {
      this.refreshView(nextSnapshot);
      this.finishPractice('completed');
      return;
    }

    if (
      nextSnapshot.phase !== this.snapshot.phase
      || nextSnapshot.secondsRemaining !== this.snapshot.secondsRemaining
      || nextSnapshot.paused !== this.snapshot.paused
    ) {
      this.refreshView(nextSnapshot);
    }
  }

  private setPaused(paused: boolean): void {
    if (!this.practiceRunner || !this.snapshot || this.snapshot.complete) {
      return;
    }

    const nextSnapshot = paused ? this.practiceRunner.pause() : this.practiceRunner.resume();
    this.refreshView(nextSnapshot);
  }

  private refreshView(snapshot: PracticeRunnerSnapshot): void {
    if (!this.practiceConfig || !this.phaseText || !this.timerText || !this.copyText || !this.statusText || !this.controls) {
      return;
    }

    this.snapshot = snapshot;
    this.phaseText.setText(getPhaseLabel(this.practiceConfig, snapshot.phase));
    this.timerText.setText(snapshot.phase === 'complete' ? '0s' : `${snapshot.secondsRemaining}s`);
    this.copyText.setText(getPhaseCopy(this.practiceConfig, snapshot));
    this.statusText.setText([
      `${this.practiceConfig.exercise.phaseLabel} • ${this.practiceConfig.exercise.title}`,
      this.practiceConfig.movingBall
        ? `Preset: ${this.practiceConfig.movingBall.title} • Low intensity: ${this.practiceConfig.lowIntensity.enabled ? 'On' : 'Off'}`
        : `${this.practiceConfig.exercise.requiresPhrase && this.practiceConfig.phrase ? `Phrase: "${this.practiceConfig.phrase}" • ` : ''}Low intensity: ${this.practiceConfig.lowIntensity.enabled ? 'On' : 'Off'} • Gaze guidance: ${this.practiceConfig.gazeGuidance.enabled ? 'On' : 'Off'}`,
    ].join('\n'));

    if (this.phraseText) {
      this.phraseText.setAlpha(snapshot.phase === 'phrase' ? 1 : 0.82);
    }

    this.controls.setPaused(snapshot.paused);
    this.pauseOverlay?.setVisible(snapshot.paused);
    this.gazeGuidance?.setPaused(snapshot.paused);
    this.movingBallGuidance?.setActive(snapshot.phase === 'phrase' && !snapshot.complete);
    this.movingBallGuidance?.setPaused(snapshot.paused);

    if (this.practiceConfig.lowIntensity.enabled || this.practiceConfig.movingBall) {
      this.phraseTween?.pause();
    } else if (snapshot.paused) {
      this.phraseTween?.pause();
    } else {
      this.phraseTween?.resume();
    }

    const sessionStore = getSessionStore(this);
    sessionStore.setPracticePhase(snapshot.phase, snapshot.phaseIndex, snapshot.secondsRemaining);
    sessionStore.setPracticePaused(snapshot.paused);
  }

  private finishPractice(outcome: 'completed' | 'stopped'): void {
    const sessionStore = getSessionStore(this);

    if (outcome === 'stopped') {
      sessionStore.stopPractice();
    }

    sessionStore.completeSession();
    sessionStore.clearPractice();
    navigateToScene(this, {
      from: sceneKeys.practice,
      to: sceneKeys.completion,
      data: { outcome },
    });
  }
}
