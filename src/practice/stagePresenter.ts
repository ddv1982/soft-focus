import type Phaser from 'phaser';

import type { PracticeConfig } from './practiceConfig';
import { loadStagePresenterFromRegistry } from './stagePresenterRegistry';

export interface PracticeStagePresenterController {
  setActive(active: boolean): void;
  setPaused(paused: boolean): void;
  destroy(): void;
}

export interface PracticeStagePresenterLoadOptions {
  scene: Phaser.Scene;
  practiceConfig: PracticeConfig;
  x: number;
  y: number;
  stageWidth: number;
  readableWidth: number;
  movingBallInset: number;
  createIdleController: () => PracticeStagePresenterController;
}

export const createIdlePracticeStagePresenter = (): PracticeStagePresenterController => ({
  setActive(): void {
    // Intentionally empty when the selected practice does not need a presenter.
  },
  setPaused(): void {
    // Intentionally empty when the selected practice does not need a presenter.
  },
  destroy(): void {
    // Intentionally empty when the selected practice does not need a presenter.
  },
});

export const loadPracticeStagePresenter = async ({
  scene,
  practiceConfig,
  x,
  y,
  stageWidth,
  readableWidth,
  movingBallInset,
  createIdleController,
}: PracticeStagePresenterLoadOptions): Promise<PracticeStagePresenterController> => loadStagePresenterFromRegistry({
  scene,
  practiceConfig,
  x,
  y,
  stageWidth,
  readableWidth,
  movingBallInset,
  createIdleController,
}, practiceConfig.stagePresenter);
