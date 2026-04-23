import type Phaser from 'phaser';

import { SessionStore } from '../state/sessionStore';
import { getSessionFlowForExercise } from '../state/sessionFlow';
import type { ExerciseId } from '../state/types';

import { sessionStoreRegistryKey } from './serviceKeys';
import { sceneKeys, orderedSceneKeys, type SceneKey } from './sceneKeys';

const nextSceneKeyByScene: Readonly<Record<SceneKey, SceneKey | null>> = {
  [sceneKeys.entry]: sceneKeys.exerciseSelection,
  [sceneKeys.exerciseSelection]: sceneKeys.phrase,
  [sceneKeys.phrase]: sceneKeys.instructions,
  [sceneKeys.instructions]: sceneKeys.practice,
  [sceneKeys.practice]: sceneKeys.completion,
  [sceneKeys.completion]: sceneKeys.reflection,
  [sceneKeys.reflection]: null,
};

export const guidedPracticeFlow: readonly SceneKey[] = orderedSceneKeys;

export interface NavigationRequest {
  from?: SceneKey;
  to: SceneKey;
  data?: object;
}

export { getSessionFlow, getSessionFlowForExercise, isSessionFlowRestartScene, isSessionFlowStartScene } from '../state/sessionFlow';

export const getNextSceneKey = (sceneKey: SceneKey): SceneKey | null => nextSceneKeyByScene[sceneKey];

export const getPreviousSceneKey = (sceneKey: SceneKey): SceneKey | null => {
  const sceneIndex = orderedSceneKeys.indexOf(sceneKey);

  if (sceneIndex <= 0) {
    return null;
  }

  return orderedSceneKeys[sceneIndex - 1];
};

export const getInstructionsBackScene = (selectedExercise: ExerciseId): SceneKey => (
  getSessionFlowForExercise(selectedExercise).instructionsBackSceneKey
);

const assertRegisteredSceneKey = (scene: Phaser.Scene, sceneKey: SceneKey): void => {
  const registeredSceneKeys = (scene.game as { registeredSceneKeys?: readonly SceneKey[] }).registeredSceneKeys ?? [];

  if (registeredSceneKeys.length > 0 && !registeredSceneKeys.includes(sceneKey)) {
    throw new Error(`Cannot navigate to unregistered scene key: ${sceneKey}`);
  }
};

export const navigateToScene = (scene: Phaser.Scene, request: NavigationRequest): void => {
  assertRegisteredSceneKey(scene, request.to);
  const game = scene.game as { ensureSceneRegistered?: (sceneKey: SceneKey) => Promise<void> };

  void (async () => {
    await game.ensureSceneRegistered?.(request.to);

    if (request.from && !scene.scene.isActive(request.from)) {
      return;
    }

    const sessionStore = scene.registry.get(sessionStoreRegistryKey);

    if (sessionStore instanceof SessionStore) {
      sessionStore.updateCurrentScene(request.to);
    }

    scene.scene.start(request.to, request.data);
  })();
};

export const navigateForward = (scene: Phaser.Scene, currentSceneKey: SceneKey, data?: object): SceneKey | null => {
  const nextSceneKey = getNextSceneKey(currentSceneKey);

  if (!nextSceneKey) {
    return null;
  }

  navigateToScene(scene, {
    from: currentSceneKey,
    to: nextSceneKey,
    data,
  });

  return nextSceneKey;
};

export const navigateBack = (scene: Phaser.Scene, currentSceneKey: SceneKey, data?: object): SceneKey | null => {
  const previousSceneKey = getPreviousSceneKey(currentSceneKey);

  if (!previousSceneKey) {
    return null;
  }

  navigateToScene(scene, {
    from: currentSceneKey,
    to: previousSceneKey,
    data,
  });

  return previousSceneKey;
};
