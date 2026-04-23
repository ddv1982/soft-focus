import type { ExerciseId } from '../state/types';
import { getSessionFlowForExercise } from '../game/navigation';
import { sceneKeys, type SceneKey } from '../game/sceneKeys';

interface SessionPanelStoreLike {
  getState(): {
    selectedExercise: ExerciseId;
  };
  prepareForNextSession(): unknown;
  saveReflection(reflection: string): unknown;
  updateCurrentScene(sceneKey: SceneKey): unknown;
}

interface SessionPanelSceneLike {
  start(sceneKey: SceneKey, data?: object): void;
}

export interface SessionPanelGameLike {
  sessionStore: SessionPanelStoreLike;
  scene: SessionPanelSceneLike;
  ensureSceneRegistered?: (sceneKey: SceneKey) => Promise<void>;
}

const ensureManagedSceneRegistered = async (game: SessionPanelGameLike, sceneKey: SceneKey): Promise<void> => {
  await game.ensureSceneRegistered?.(sceneKey);
};

const startManagedScene = (game: SessionPanelGameLike, sceneKey: SceneKey, data?: object): void => {
  game.sessionStore.updateCurrentScene(sceneKey);
  game.scene.start(sceneKey, data);
};

export const navigateToManagedScene = async (
  game: SessionPanelGameLike,
  sceneKey: SceneKey,
  data?: object,
): Promise<void> => {
  await ensureManagedSceneRegistered(game, sceneKey);
  startManagedScene(game, sceneKey, data);
};

export const beginNextSessionFromScene = async (game: SessionPanelGameLike, sceneKey: SceneKey): Promise<void> => {
  await ensureManagedSceneRegistered(game, sceneKey);
  game.sessionStore.prepareForNextSession();
  startManagedScene(game, sceneKey);
};

export const continueToReflection = (game: SessionPanelGameLike): Promise<void> => (
  navigateToManagedScene(game, sceneKeys.reflection)
);

export const chooseAnotherExercise = (game: SessionPanelGameLike): Promise<void> => (
  beginNextSessionFromScene(game, sceneKeys.exerciseSelection)
);

export const saveReflectionAndRestart = (game: SessionPanelGameLike, reflection: string): Promise<void> => {
  game.sessionStore.saveReflection(reflection);
  const restartSceneKey = getSessionFlowForExercise(game.sessionStore.getState().selectedExercise).restartSceneKey;

  return beginNextSessionFromScene(game, restartSceneKey);
};

export const saveReflectionAndChooseAnotherExercise = (game: SessionPanelGameLike, reflection: string): Promise<void> => {
  game.sessionStore.saveReflection(reflection);

  return chooseAnotherExercise(game);
};
