import type { PracticeStagePresenterConfig } from './practiceConfig';
import type { PracticeStagePresenterController, PracticeStagePresenterLoadOptions } from './stagePresenter';

type StagePresenterLoader = (
  options: PracticeStagePresenterLoadOptions,
  config: PracticeStagePresenterConfig,
) => Promise<PracticeStagePresenterController>;

const idleStagePresenterLoader: StagePresenterLoader = async ({ createIdleController }) => createIdleController();

const gazeStagePresenterLoader: StagePresenterLoader = async ({ scene, x, y, stageWidth, readableWidth, movingBallInset }, config) => {
  if (config.key !== 'gaze-guidance') {
    throw new Error(`Expected gaze-guidance config, received ${config.key}`);
  }

  const { createGazeStagePresenter } = await import('./stagePresenters/gazeStagePresenter');

  return createGazeStagePresenter({
    scene,
    lowIntensity: config.lowIntensity,
    prompt: config.prompt,
    reducedMotion: config.reducedMotion,
    x,
    y,
    width: Math.min(readableWidth, stageWidth - (movingBallInset * 2)),
  });
};

const movingBallStagePresenterLoader: StagePresenterLoader = async ({ scene, x, y, stageWidth, movingBallInset }, config) => {
  if (config.key !== 'moving-ball') {
    throw new Error(`Expected moving-ball config, received ${config.key}`);
  }

  const { createMovingBallStagePresenter } = await import('./stagePresenters/movingBallStagePresenter');

  return createMovingBallStagePresenter({
    scene,
    movingBall: config.movingBall,
    lowIntensity: config.lowIntensity,
    reducedMotion: config.reducedMotion,
    x,
    y,
    width: Math.max(180, stageWidth - (movingBallInset * 2)),
  });
};

const breathingResetStagePresenterLoader: StagePresenterLoader = async ({ scene, x, y, stageWidth }, config) => {
  if (config.key !== 'breathing-reset') {
    throw new Error(`Expected breathing-reset config, received ${config.key}`);
  }

  const { createBreathingResetStagePresenter } = await import('./stagePresenters/breathingResetStagePresenter');

  return createBreathingResetStagePresenter({
    scene,
    lowIntensity: config.lowIntensity,
    cycleMs: config.cycleMs,
    reducedMotion: config.reducedMotion,
    x,
    y,
    width: stageWidth,
  });
};

const bilateralRhythmStagePresenterLoader: StagePresenterLoader = async ({ scene, x, y, stageWidth }, config) => {
  if (config.key !== 'bilateral-rhythm') {
    throw new Error(`Expected bilateral-rhythm config, received ${config.key}`);
  }

  const { createBilateralRhythmStagePresenter } = await import('./stagePresenters/bilateralRhythmStagePresenter');

  return createBilateralRhythmStagePresenter({
    scene,
    lowIntensity: config.lowIntensity,
    cycleMs: config.cycleMs,
    reducedMotion: config.reducedMotion,
    x,
    y,
    width: stageWidth,
  });
};

const orientingStagePresenterLoader: StagePresenterLoader = async ({ scene, x, y, stageWidth }, config) => {
  if (config.key !== 'orienting') {
    throw new Error(`Expected orienting config, received ${config.key}`);
  }

  const { createOrientingStagePresenter } = await import('./stagePresenters/orientingStagePresenter');

  return createOrientingStagePresenter({
    scene,
    lowIntensity: config.lowIntensity,
    cycleMs: config.cycleMs,
    reducedMotion: config.reducedMotion,
    x,
    y,
    width: stageWidth,
  });
};

const stagePresenterLoaders: Record<PracticeStagePresenterConfig['key'], StagePresenterLoader> = {
  idle: idleStagePresenterLoader,
  'gaze-guidance': gazeStagePresenterLoader,
  'moving-ball': movingBallStagePresenterLoader,
  'breathing-reset': breathingResetStagePresenterLoader,
  'bilateral-rhythm': bilateralRhythmStagePresenterLoader,
  orienting: orientingStagePresenterLoader,
};

export const loadStagePresenterFromRegistry = (
  options: PracticeStagePresenterLoadOptions,
  config: PracticeStagePresenterConfig,
): Promise<PracticeStagePresenterController> => stagePresenterLoaders[config.key](options, config);
