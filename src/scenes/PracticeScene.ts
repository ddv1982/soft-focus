import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { navigateToScene } from '../game/navigation';
import { sceneKeys } from '../game/sceneKeys';
import type { PracticeConfig, PracticePhaseDefinition } from '../practice/practiceConfig';
import { PracticeRunner, type PracticeRunnerSnapshot } from '../practice/practiceRunner';
import {
  createIdlePracticeStagePresenter,
  loadPracticeStagePresenter,
  type PracticeStagePresenterController,
} from '../practice/stagePresenter';
import { createCard } from '../ui/components/Card';
import { createPracticeControls, getPracticeControlsLayout, type PracticeControls } from '../ui/components/PracticeControls';
import { createScreenTitle } from '../ui/components/ScreenTitle';
import { getLayoutFrame } from '../ui/layout';
import { renderOceanBackground } from '../ui/oceanBackground';
import { hexToNumber, uiTheme } from '../ui/theme';

const getSurfaceAlpha = (practiceConfig: PracticeConfig): number => (practiceConfig.lowIntensity.enabled ? 0.82 : 0.88);

const getPhaseDefinition = (
  practiceConfig: PracticeConfig,
  snapshot: PracticeRunnerSnapshot,
): PracticePhaseDefinition | null => practiceConfig.phases[snapshot.phaseIndex] ?? null;

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

  private stagePresenter: PracticeStagePresenterController = createIdlePracticeStagePresenter();

  private phraseTween?: Phaser.Tweens.Tween;

  private presenterLoadId = 0;

  private shuttingDown = false;

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
    const stageOuterInset = cardWidth >= 900 ? uiTheme.spacing.xl : uiTheme.spacing.md;
    const stageWidth = Math.max(220, cardWidth - (stageOuterInset * 2));
    const controlsWidth = Math.min(cardWidth, 760);
    const controlsLayout = getPracticeControlsLayout(controlsWidth);
    const controlsY = frame.height - uiTheme.spacing.xl - (controlsLayout.height / 2);
    const movingBallInset = cardWidth >= 900 ? uiTheme.spacing.lg : uiTheme.spacing.md;
    const footerHeight = 84;
    this.shuttingDown = false;

    renderOceanBackground(this, { frame });

    const title = createScreenTitle(this, {
      x: contentCenterX,
      y: frame.contentY + uiTheme.spacing.xl,
      width: titleWidth,
      title: practiceConfig.display.title,
      subtitle: practiceConfig.display.subtitle,
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

    this.add.rectangle(
      card.x,
      card.y + 1,
      cardWidth - 18,
      1,
      hexToNumber(uiTheme.colors.foam),
      0.2,
    ).setOrigin(0.5, 0);

    this.add.rectangle(
      card.x,
      card.y + uiTheme.spacing.sm,
      cardWidth - uiTheme.spacing.lg,
      cardHeight - (uiTheme.spacing.lg),
      hexToNumber(uiTheme.colors.surfaceDeep),
      0.18,
    ).setOrigin(0.5, 0)
      .setStrokeStyle(1, hexToNumber(uiTheme.colors.borderMuted), 0.18);

    this.phaseText = this.add.text(card.x, card.y + uiTheme.spacing.xl, '', {
      color: uiTheme.colors.seaGlass,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      fontStyle: '700',
      align: 'center',
    });
    this.phaseText.setOrigin(0.5, 0);

    this.timerText = this.add.text(card.x, this.phaseText.y + this.phaseText.height + uiTheme.spacing.sm, '', {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: cardWidth < 420 ? '36px' : '44px',
      fontStyle: '700',
      align: 'center',
    });
    this.timerText.setOrigin(0.5, 0);

    this.phraseText = this.add.text(
      card.x,
      this.timerText.y + this.timerText.height + uiTheme.spacing.xl,
      practiceConfig.display.phraseText,
      {
        color: uiTheme.colors.foam,
        fontFamily: uiTheme.typography.fontFamily,
        fontSize: cardWidth < 420 ? '25px' : '30px',
        fontStyle: '700',
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

    this.add.rectangle(
      card.x,
      guideCenterY + 12,
      stageWidth - 14,
      guideHeight,
      uiTheme.colors.shadow,
      0.24,
    ).setOrigin(0.5);

    this.add.rectangle(
      card.x,
      guideCenterY,
      stageWidth,
      guideHeight,
      hexToNumber(uiTheme.colors.surfaceRaised),
      0.36,
    ).setOrigin(0.5)
      .setStrokeStyle(1, hexToNumber(uiTheme.colors.border), 0.34);

    this.add.rectangle(
      card.x,
      guideCenterY - ((guideHeight / 2) - 18),
      stageWidth - 34,
      1,
      hexToNumber(uiTheme.colors.foam),
      0.16,
    ).setOrigin(0.5);

    this.add.rectangle(
      card.x,
      card.y + card.height - footerHeight,
      cardWidth - uiTheme.spacing.lg,
      1,
      hexToNumber(uiTheme.colors.border),
      0.28,
    ).setOrigin(0.5, 0);

    this.statusText = this.add.text(card.x, card.y + card.height - uiTheme.spacing.lg, '', {
      color: uiTheme.colors.textMutedOnDark,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '14px',
      align: 'center',
      wordWrap: { width: Math.min(stageWidth, 820), useAdvancedWrap: true },
      lineSpacing: 4,
    });
    this.statusText.setOrigin(0.5, 1);

    void this.loadStagePresenter({
      x: card.x,
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

    const overlayBackground = this.add.rectangle(0, 0, Math.min(stageWidth, 680), 132, hexToNumber(uiTheme.colors.surface), 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(1, hexToNumber(uiTheme.colors.border), 0.42);
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
      this.shuttingDown = true;
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
    this.timerText.setText(snapshot.phase === 'complete' ? '0s' : `${snapshot.secondsRemaining}s`);
    this.copyText.setText(snapshot.paused
      ? 'Pause and let the pace stay easy. Resume when your breathing and gaze feel settled.'
      : (snapshot.phase === 'complete' ? this.practiceConfig.display.completeCopy : (activePhase?.copy ?? '')));
    this.statusText.setText(this.practiceConfig.display.statusLines.join('\n'));

    if (this.phraseText) {
      this.phraseText.setAlpha(snapshot.phase === 'phrase' ? 1 : 0.82);
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
      console.error('Soft Focus could not load the practice stage presenter.', error);

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
