import { sceneKeys, type SceneKey } from '../game/sceneKeys';

import { getSessionFlowIdForExercise, type ExerciseId, type SessionFlowId } from './types';

export interface SessionFlowDefinition {
  id: SessionFlowId;
  startSceneKey: SceneKey;
  restartSceneKey: SceneKey;
  instructionsBackSceneKey: SceneKey;
}

const sessionFlowDefinitions: Readonly<Record<SessionFlowId, SessionFlowDefinition>> = {
  'phrase-prompted': {
    id: 'phrase-prompted',
    startSceneKey: sceneKeys.phrase,
    restartSceneKey: sceneKeys.phrase,
    instructionsBackSceneKey: sceneKeys.phrase,
  },
  'direct-practice': {
    id: 'direct-practice',
    startSceneKey: sceneKeys.instructions,
    restartSceneKey: sceneKeys.instructions,
    instructionsBackSceneKey: sceneKeys.exerciseSelection,
  },
};

export const getSessionFlow = (flowId: SessionFlowId): SessionFlowDefinition => sessionFlowDefinitions[flowId];

export const getSessionFlowForExercise = (selectedExercise: ExerciseId): SessionFlowDefinition => (
  getSessionFlow(getSessionFlowIdForExercise(selectedExercise))
);

export const isSessionFlowStartScene = (sceneKey: SceneKey, selectedExercise: ExerciseId): boolean => (
  getSessionFlowForExercise(selectedExercise).startSceneKey === sceneKey
);

export const isSessionFlowRestartScene = (sceneKey: SceneKey, flowId: SessionFlowId): boolean => (
  getSessionFlow(flowId).restartSceneKey === sceneKey
);
