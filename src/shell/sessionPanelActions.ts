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

export const navigateToManagedScene = (game: SessionPanelGameLike, sceneKey: SceneKey, data?: object): void => {
  if (!game.ensureSceneRegistered) {
    game.sessionStore.updateCurrentScene(sceneKey);
    game.scene.start(sceneKey, data);
    return;
  }

  void (async () => {
    await game.ensureSceneRegistered?.(sceneKey);
    game.sessionStore.updateCurrentScene(sceneKey);
    game.scene.start(sceneKey, data);
  })();
};

export const beginNextSessionFromScene = (game: SessionPanelGameLike, sceneKey: SceneKey): void => {
  game.sessionStore.prepareForNextSession();
  navigateToManagedScene(game, sceneKey);
};

export const continueToReflection = (game: SessionPanelGameLike): void => {
  navigateToManagedScene(game, sceneKeys.reflection);
};

export const chooseAnotherExercise = (game: SessionPanelGameLike): void => {
  beginNextSessionFromScene(game, sceneKeys.exerciseSelection);
};

export const saveReflectionAndRestart = (game: SessionPanelGameLike, reflection: string): void => {
  game.sessionStore.saveReflection(reflection);
  const restartSceneKey = getSessionFlowForExercise(game.sessionStore.getState().selectedExercise).restartSceneKey;
  beginNextSessionFromScene(game, restartSceneKey);
};

export const saveReflectionAndChooseAnotherExercise = (game: SessionPanelGameLike, reflection: string): void => {
  game.sessionStore.saveReflection(reflection);
  chooseAnotherExercise(game);
};
