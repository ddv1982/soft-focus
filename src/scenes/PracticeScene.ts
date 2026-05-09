import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { navigateToScene } from '../game/navigation';
import { sceneKeys } from '../game/sceneKeys';
import { reportOperatorError } from '../observability/operatorErrors';
import type { PracticeConfig, PracticePhaseDefinition } from '../practice/practiceConfig';
import { PracticeRunner, type PracticeRunnerSnapshot } from '../practice/practiceRunner';
import {
  createIdlePracticeStagePresenter,
  loadPracticeStagePresenter,
  type PracticeStagePresenterController,
} from '../practice/stagePresenter';
import { createPracticeControls, getPracticeControlsLayout, type PracticeControls } from '../ui/components/PracticeControls';
import { createScreenTitle } from '../ui/components/ScreenTitle';
import { getLayoutFrame } from '../ui/layout';
import { hexToNumber, uiTheme } from '../ui/theme';

const getPhaseDefinition = (
  practiceConfig: PracticeConfig,
  snapshot: PracticeRunnerSnapshot,
): PracticePhaseDefinition | null => practiceConfig.phases[snapshot.phaseIndex] ?? null;

interface PracticeSceneData {
  practiceConfig?: PracticeConfig;
  snapshot?: PracticeRunnerSnapshot;
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

  private stagePresenter: PracticeStagePresenterController = createIdlePracticeStagePresenter();

  private phraseTween?: Phaser.Tweens.Tween;

  private presenterLoadId = 0;

  private shuttingDown = false;

  private readonly handleThemeChange = (): void => {
    if (!this.practiceConfig || !this.snapshot) {
      return;
    }

    this.scene.restart({
      practiceConfig: this.practiceConfig,
      snapshot: this.snapshot,
    } satisfies PracticeSceneData);
  };

  constructor() {
    super(sceneKeys.practice);
  }

  create(data?: PracticeSceneData): void {
    const sessionStore = getSessionStore(this);
    const practiceConfig = data?.practiceConfig ?? sessionStore.createPracticeConfig();

    this.practiceConfig = practiceConfig;
    this.practiceRunner = new PracticeRunner(practiceConfig, data?.snapshot);
    this.snapshot = this.practiceRunner.getSnapshot();

    sessionStore.updateCurrentScene(sceneKeys.practice);
    sessionStore.startPractice(practiceConfig);

    const frame = getLayoutFrame({
      width: this.scale.width,
      height: this.scale.height,
    });
    const contentCenterX = frame.contentX + (frame.contentWidth / 2);
    const cardWidth = frame.contentWidth;
    const compactPractice = frame.contentHeight < 640 || cardWidth < 360;
    const titleWidth = Math.min(cardWidth, 980);
    const readableWidth = Math.min(cardWidth - ((compactPractice ? uiTheme.spacing.md : uiTheme.spacing.xl) * 2), 760);
    const stageOuterInset = cardWidth >= 900 ? uiTheme.spacing.xl : uiTheme.spacing.md;
    const stageWidth = Math.max(220, cardWidth - (stageOuterInset * 2));
    const controlsWidth = Math.min(cardWidth, 760);
    const controlsLayout = getPracticeControlsLayout(controlsWidth);
    const controlsY = frame.height - uiTheme.spacing.xl - (controlsLayout.height / 2);
    const movingBallInset = cardWidth >= 900 ? uiTheme.spacing.lg : uiTheme.spacing.md;
    this.shuttingDown = false;

    const title = createScreenTitle(this, {
      x: contentCenterX,
      y: frame.contentY + (compactPractice ? uiTheme.spacing.md : uiTheme.spacing.xl),
      width: titleWidth,
      title: practiceConfig.display.title,
      subtitle: practiceConfig.display.subtitle,
    });

    const practiceTop = title.y + title.height + (compactPractice ? uiTheme.spacing.sm : uiTheme.spacing.lg);
    const practiceBottom = controlsY - (controlsLayout.height / 2) - (compactPractice ? uiTheme.spacing.sm : uiTheme.spacing.lg);
    const statusReservedHeight = compactPractice ? 0 : 44;
    const phraseGap = compactPractice ? uiTheme.spacing.sm : uiTheme.spacing.lg;
    const copyGap = compactPractice ? uiTheme.spacing.xs : uiTheme.spacing.sm;
    const guideGap = compactPractice ? uiTheme.spacing.sm : uiTheme.spacing.md;
    const guideMinHeight = compactPractice ? 120 : 184;

    this.phaseText = this.add.text(contentCenterX, practiceTop + uiTheme.spacing.xs, '', {
      color: uiTheme.colors.seaGlass,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '12px',
      fontStyle: '700',
      align: 'center',
    });
    this.phaseText.setOrigin(0.5, 0);
    this.phaseText.setAlpha(0.72);

    this.timerText = this.add.text(contentCenterX, this.phaseText.y + this.phaseText.height + uiTheme.spacing.sm, '', {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      fontStyle: '600',
      align: 'center',
    });
    this.timerText.setOrigin(0.5, 0);
    this.timerText.setAlpha(0.7);

    this.phraseText = this.add.text(
      contentCenterX,
      this.timerText.y + this.timerText.height + phraseGap,
      practiceConfig.display.phraseText,
      {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.typography.fontFamily,
        fontSize: cardWidth < 420 ? '17px' : '19px',
        fontStyle: '500',
        align: 'center',
        wordWrap: { width: readableWidth, useAdvancedWrap: true },
        lineSpacing: 4,
      },
    );
    this.phraseText.setOrigin(0.5, 0);

    this.copyText = this.add.text(contentCenterX, this.phraseText.y + this.phraseText.height + copyGap, '', {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '13px',
      align: 'center',
      wordWrap: { width: readableWidth, useAdvancedWrap: true },
      lineSpacing: uiTheme.typography.bodyLineHeight - uiTheme.typography.bodySize,
    });
    this.copyText.setOrigin(0.5, 0);
    this.copyText.setAlpha(0.72);

    const guideTop = this.copyText.y + this.copyText.height + guideGap;
    const guideBottom = practiceBottom - statusReservedHeight - (compactPractice ? uiTheme.spacing.xs : uiTheme.spacing.md);
    const guideHeight = Math.max(guideMinHeight, guideBottom - guideTop);
    const guideCenterY = guideTop + (guideHeight / 2);

    this.statusText = this.add.text(contentCenterX, practiceBottom, '', {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '12px',
      align: 'center',
      wordWrap: { width: Math.min(stageWidth, 820), useAdvancedWrap: true },
      lineSpacing: 4,
    });
    this.statusText.setOrigin(0.5, 1);
    this.statusText.setAlpha(compactPractice ? 0 : 0.55);

    void this.loadStagePresenter({
      x: contentCenterX,
      y: guideCenterY,
      stageWidth,
      readableWidth,
      movingBallInset,
    });

    if (!practiceConfig.lowIntensity.enabled && !practiceConfig.reducedMotion.enabled && practiceConfig.stagePresenter.key === 'idle') {
      this.phraseTween = this.tweens.add({
        targets: this.phraseText,
        alpha: 0.74,
        duration: 2200,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      });
    }

    const overlayBackground = this.add.rectangle(0, 0, Math.min(stageWidth, 680), 132, hexToNumber(uiTheme.colors.surface), 0.74)
      .setOrigin(0.5)
      .setStrokeStyle(1, hexToNumber(uiTheme.colors.border), 0.3);
    const overlayTitle = this.add.text(0, -18, 'Paused', {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '22px',
      fontStyle: '600',
      align: 'center',
    });
    overlayTitle.setOrigin(0.5, 0.5);
    const overlayCopy = this.add.text(0, 20, practiceConfig.display.pausedOverlayCopy, {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '13px',
      align: 'center',
      wordWrap: { width: Math.min(stageWidth, 680) - (uiTheme.spacing.xl * 2), useAdvancedWrap: true },
    });
    overlayCopy.setOrigin(0.5, 0.5);
    this.pauseOverlay = this.add.container(contentCenterX, guideCenterY, [overlayBackground, overlayTitle, overlayCopy]);
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
    window.addEventListener('soft-focus:themechange', this.handleThemeChange);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.shuttingDown = true;
      window.removeEventListener('soft-focus:themechange', this.handleThemeChange);
      this.stagePresenter.destroy();
      this.stagePresenter = createIdlePracticeStagePresenter();
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
    const activePhase = getPhaseDefinition(this.practiceConfig, snapshot);
    this.phaseText.setText(snapshot.phase === 'complete' ? 'Complete' : (activePhase?.label ?? 'Practice'));
    this.timerText.setText(snapshot.phase === 'complete' ? '0s left' : `${snapshot.secondsRemaining}s left`);
    this.copyText.setText(snapshot.paused
      ? 'Pause and let the pace stay easy. Resume when your breathing and gaze feel settled.'
      : (snapshot.phase === 'complete' ? this.practiceConfig.display.completeCopy : (activePhase?.copy ?? '')));
    this.statusText.setText(this.practiceConfig.display.statusLines.join('\n'));

    if (this.phraseText) {
      this.phraseText.setAlpha(snapshot.phase === 'phrase' ? 0.82 : 0.62);
    }

    this.controls.setPaused(snapshot.paused);
    this.pauseOverlay?.setVisible(snapshot.paused);
    this.stagePresenter.setActive(Boolean(activePhase?.activatesStagePresenter) && !snapshot.complete);
    this.stagePresenter.setPaused(snapshot.paused);

    if (this.practiceConfig.lowIntensity.enabled || this.practiceConfig.reducedMotion.enabled || this.practiceConfig.stagePresenter.key !== 'idle') {
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

  private async loadStagePresenter({
    x,
    y,
    stageWidth,
    readableWidth,
    movingBallInset,
  }: {
    x: number;
    y: number;
    stageWidth: number;
    readableWidth: number;
    movingBallInset: number;
  }): Promise<void> {
    if (!this.practiceConfig) {
      return;
    }

    const loadId = ++this.presenterLoadId;
    let nextPresenter: PracticeStagePresenterController;

    try {
      nextPresenter = await loadPracticeStagePresenter({
        scene: this,
        practiceConfig: this.practiceConfig,
        x,
        y,
        stageWidth,
        readableWidth,
        movingBallInset,
        createIdleController: createIdlePracticeStagePresenter,
      });
    } catch (error) {
      reportOperatorError('Soft Focus could not load the practice stage presenter.', error);

      if (this.shuttingDown || loadId !== this.presenterLoadId) {
        return;
      }

      nextPresenter = createIdlePracticeStagePresenter();
    }

    if (this.shuttingDown || loadId !== this.presenterLoadId) {
      nextPresenter.destroy();
      return;
    }

    this.stagePresenter.destroy();
    this.stagePresenter = nextPresenter;

    if (this.snapshot) {
      const activePhase = getPhaseDefinition(this.practiceConfig, this.snapshot);
      this.stagePresenter.setActive(Boolean(activePhase?.activatesStagePresenter) && !this.snapshot.complete);
      this.stagePresenter.setPaused(this.snapshot.paused);
    }
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
