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

const focusHeaderVisibleAlpha = 1;
const focusHeaderHiddenAlpha = 0;
const focusHeaderIdleDelayMs = 3200;
const focusHeaderFadeMs = 1200;
const focusHeaderRevealMs = 360;
const focusControlsIdleDelayMs = 3200;
const focusControlsFadeMs = 1200;
const focusControlsRevealMs = 300;

interface PracticeSceneData {
  practiceConfig?: PracticeConfig;
  snapshot?: PracticeRunnerSnapshot;
}

export class PracticeScene extends Phaser.Scene {
  private practiceRunner: PracticeRunner | null = null;

  private practiceConfig: PracticeConfig | null = null;

  private snapshot: PracticeRunnerSnapshot | null = null;

  private phaseText?: Phaser.GameObjects.Text;

  private timerText?: Phaser.GameObjects.Text;

  private statusText?: Phaser.GameObjects.Text;

  private focusHeaderObjects: (Phaser.GameObjects.Container | Phaser.GameObjects.Text)[] = [];

  private focusHeaderHideEvent?: Phaser.Time.TimerEvent;

  private focusHeaderTween?: Phaser.Tweens.Tween;

  private focusControlsHideEvent?: Phaser.Time.TimerEvent;

  private focusControlsTween?: Phaser.Tweens.Tween;

  private focusControlsTextTween?: Phaser.Tweens.Tween;

  private focusControlsTextVisibleAlpha = 0.55;

  private pauseOverlay?: Phaser.GameObjects.Container;

  private controls?: PracticeControls;

  private stagePresenter: PracticeStagePresenterController = createIdlePracticeStagePresenter();

  private presenterLoadId = 0;

  private shuttingDown = false;

  private resizeRaf: number | null = null;

  private layoutSize?: { width: number; height: number };

  private readonly handlePracticePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.snapshot || this.snapshot.complete) {
      return;
    }

    if (this.isPointerInHeaderRevealZone(pointer.y)) {
      this.revealFocusHeader();
      return;
    }

    if (this.isPointerInControlsRevealZone(pointer.y)) {
      this.revealFocusControls();
      return;
    }

    if (!this.snapshot.paused) {
      this.scheduleFocusHeaderFade();
      this.scheduleFocusControlsFade();
    }
  };

  private readonly handlePracticePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.snapshot || this.snapshot.complete) {
      return;
    }

    if (pointer.wasTouch) {
      this.revealFocusHeader();
      this.revealFocusControls();
      return;
    }

    if (this.isPointerInHeaderRevealZone(pointer.y)) {
      this.revealFocusHeader();
    }

    if (this.isPointerInControlsRevealZone(pointer.y)) {
      this.revealFocusControls();
    }
  };

  private readonly handleScaleResize = (): void => {
    if (this.shuttingDown || !this.practiceConfig || !this.snapshot) {
      return;
    }

    const nextWidth = this.scale.width;
    const nextHeight = this.scale.height;

    if (this.layoutSize?.width === nextWidth && this.layoutSize.height === nextHeight) {
      return;
    }

    if (this.resizeRaf !== null) {
      window.cancelAnimationFrame(this.resizeRaf);
    }

    this.resizeRaf = window.requestAnimationFrame(() => {
      this.resizeRaf = null;

      if (this.shuttingDown || !this.practiceConfig || !this.snapshot) {
        return;
      }

      const snapshot = this.practiceRunner?.getSnapshot() ?? this.snapshot;

      this.scene.restart({
        practiceConfig: this.practiceConfig,
        snapshot,
      } satisfies PracticeSceneData);
    });
  };

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
    this.layoutSize = {
      width: this.scale.width,
      height: this.scale.height,
    };

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
    this.focusHeaderObjects = [title, this.phaseText, this.timerText];

    const guideTop = this.timerText.y + this.timerText.height + guideGap;
    const guideBottom = practiceBottom - statusReservedHeight - (compactPractice ? uiTheme.spacing.xs : uiTheme.spacing.md);
    const guideHeight = Math.max(guideMinHeight, guideBottom - guideTop);
    const guideCenterY = guideTop + (guideHeight / 2);
    const phraseHeadingY = Math.max(
      this.timerText.y + this.timerText.height + uiTheme.spacing.xl,
      guideCenterY - (compactPractice ? 72 : 104),
    );
    const phraseHeading = practiceConfig.exercise.requiresPhrase && practiceConfig.phrase
      ? this.add.text(contentCenterX, phraseHeadingY, `“${practiceConfig.phrase}”`, {
        color: uiTheme.colors.foam,
        fontFamily: uiTheme.typography.fontFamily,
        fontSize: compactPractice ? '18px' : '24px',
        fontStyle: '700',
        align: 'center',
        wordWrap: { width: readableWidth, useAdvancedWrap: true },
      })
      : null;
    phraseHeading?.setOrigin(0.5, 0.5);
    phraseHeading?.setAlpha(0.96);

    this.statusText = this.add.text(contentCenterX, practiceBottom, '', {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '12px',
      align: 'center',
      wordWrap: { width: Math.min(stageWidth, 820), useAdvancedWrap: true },
      lineSpacing: 4,
    });
    this.statusText.setOrigin(0.5, 1);
    this.focusControlsTextVisibleAlpha = compactPractice ? 0 : 0.55;
    this.statusText.setAlpha(this.focusControlsTextVisibleAlpha);

    void this.loadStagePresenter({
      x: contentCenterX,
      y: guideCenterY,
      stageWidth,
      stageHeight: guideHeight,
      readableWidth,
      movingBallInset,
    });

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
    this.input.on('pointerdown', this.handlePracticePointerDown);
    this.input.on('pointermove', this.handlePracticePointerMove);
    this.scheduleFocusHeaderFade();
    this.scheduleFocusControlsFade();
    window.addEventListener('soft-focus:themechange', this.handleThemeChange);
    this.scale.on('resize', this.handleScaleResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.shuttingDown = true;
      this.scale.off('resize', this.handleScaleResize);
      if (this.resizeRaf !== null) {
        window.cancelAnimationFrame(this.resizeRaf);
        this.resizeRaf = null;
      }
      this.input.off('pointerdown', this.handlePracticePointerDown);
      this.input.off('pointermove', this.handlePracticePointerMove);
      this.focusHeaderHideEvent?.remove(false);
      this.focusHeaderTween?.stop();
      this.focusControlsHideEvent?.remove(false);
      this.focusControlsTween?.stop();
      this.focusControlsTextTween?.stop();
      window.removeEventListener('soft-focus:themechange', this.handleThemeChange);
      this.stagePresenter.destroy();
      this.stagePresenter = createIdlePracticeStagePresenter();
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
    if (!this.practiceConfig || !this.phaseText || !this.timerText || !this.statusText || !this.controls) {
      return;
    }

    const wasPaused = this.snapshot?.paused ?? false;
    this.snapshot = snapshot;
    const activePhase = getPhaseDefinition(this.practiceConfig, snapshot);
    this.phaseText.setText(snapshot.phase === 'complete' ? 'Complete' : (activePhase?.label ?? 'Practice'));
    this.timerText.setText(snapshot.phase === 'complete' ? '0s left' : `${snapshot.secondsRemaining}s left`);
    this.statusText.setText(this.practiceConfig.display.statusLines.join('\n'));

    this.controls.setPaused(snapshot.paused);
    this.pauseOverlay?.setVisible(snapshot.paused);
    this.stagePresenter.setActive(Boolean(activePhase?.activatesStagePresenter) && !snapshot.complete);
    this.stagePresenter.setPaused(snapshot.paused);

    if (snapshot.paused) {
      this.revealFocusHeader(false);
      this.revealFocusControls(false);
    } else if (wasPaused) {
      this.scheduleFocusHeaderFade();
      this.scheduleFocusControlsFade();
    }

    const sessionStore = getSessionStore(this);
    sessionStore.setPracticePhase(snapshot.phase, snapshot.phaseIndex, snapshot.secondsRemaining);
    sessionStore.setPracticePaused(snapshot.paused);
  }

  private isPointerInHeaderRevealZone(pointerY: number): boolean {
    return pointerY <= Math.max(112, this.scale.height * 0.18);
  }

  private isPointerInControlsRevealZone(pointerY: number): boolean {
    return pointerY >= this.scale.height - Math.max(112, this.scale.height * 0.18);
  }

  private scheduleFocusHeaderFade(): void {
    if (this.snapshot?.paused || this.snapshot?.complete || this.focusHeaderObjects.length === 0) {
      return;
    }

    this.focusHeaderHideEvent?.remove(false);
    this.focusHeaderHideEvent = this.time.delayedCall(focusHeaderIdleDelayMs, () => {
      if (!this.snapshot?.paused && !this.snapshot?.complete) {
        this.fadeFocusHeaderTo(focusHeaderHiddenAlpha, focusHeaderFadeMs);
      }
    });
  }

  private revealFocusHeader(rescheduleFade = true): void {
    this.focusHeaderHideEvent?.remove(false);
    this.fadeFocusHeaderTo(focusHeaderVisibleAlpha, focusHeaderRevealMs);

    if (rescheduleFade && !this.snapshot?.paused) {
      this.scheduleFocusHeaderFade();
    }
  }

  private fadeFocusHeaderTo(alpha: number, duration: number): void {
    this.focusHeaderTween?.stop();
    this.focusHeaderTween = this.tweens.add({
      targets: this.focusHeaderObjects,
      alpha,
      duration,
      ease: 'Sine.easeInOut',
    });
  }

  private scheduleFocusControlsFade(): void {
    if (this.snapshot?.paused || this.snapshot?.complete || !this.controls) {
      return;
    }

    this.focusControlsHideEvent?.remove(false);
    this.focusControlsHideEvent = this.time.delayedCall(focusControlsIdleDelayMs, () => {
      if (!this.snapshot?.paused && !this.snapshot?.complete) {
        this.fadeFocusControlsTo(focusHeaderHiddenAlpha, focusControlsFadeMs);
      }
    });
  }

  private revealFocusControls(rescheduleFade = true): void {
    this.focusControlsHideEvent?.remove(false);
    this.fadeFocusControlsTo(focusHeaderVisibleAlpha, focusControlsRevealMs);

    if (rescheduleFade && !this.snapshot?.paused) {
      this.scheduleFocusControlsFade();
    }
  }

  private fadeFocusControlsTo(alpha: number, duration: number): void {
    if (!this.controls || !this.statusText) {
      return;
    }

    if (alpha > focusHeaderHiddenAlpha) {
      this.controls.setInteractiveEnabled(true);
    }

    this.focusControlsTween?.stop();
    this.focusControlsTween = this.tweens.add({
      targets: this.controls.container,
      alpha,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (alpha === focusHeaderHiddenAlpha) {
          this.controls?.setInteractiveEnabled(false);
        }
      },
    });

    this.focusControlsTextTween?.stop();
    this.focusControlsTextTween = this.tweens.add({
      targets: this.statusText,
      alpha: alpha === focusHeaderVisibleAlpha ? this.focusControlsTextVisibleAlpha : alpha,
      duration,
      ease: 'Sine.easeInOut',
    });
  }

  private async loadStagePresenter({
    x,
    y,
    stageWidth,
    stageHeight,
    readableWidth,
    movingBallInset,
  }: {
    x: number;
    y: number;
    stageWidth: number;
    stageHeight: number;
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
        stageHeight,
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
