import { sceneKeys, type SceneKey } from '../game/sceneKeys';

import { sessionEntryModeIds, type SessionEntryModeId } from './types';

export interface SessionEntryModeDefinition {
  id: SessionEntryModeId;
  startSceneKey: SceneKey;
  restartSceneKey: SceneKey;
  instructionsBackSceneKey: SceneKey;
  requiresPhrase: boolean;
}

const sessionEntryModeDefinitions: Readonly<Record<SessionEntryModeId, SessionEntryModeDefinition>> = {
  [sessionEntryModeIds.phrasePrompted]: {
    id: sessionEntryModeIds.phrasePrompted,
    startSceneKey: sceneKeys.phrase,
    restartSceneKey: sceneKeys.phrase,
    instructionsBackSceneKey: sceneKeys.phrase,
    requiresPhrase: true,
  },
  [sessionEntryModeIds.directPractice]: {
    id: sessionEntryModeIds.directPractice,
    startSceneKey: sceneKeys.instructions,
    restartSceneKey: sceneKeys.instructions,
    instructionsBackSceneKey: sceneKeys.exerciseSelection,
    requiresPhrase: false,
  },
};

export const getSessionEntryMode = (sessionEntryModeId: SessionEntryModeId): SessionEntryModeDefinition => (
  sessionEntryModeDefinitions[sessionEntryModeId]
);

export const isSessionEntryModeRestartScene = (sceneKey: SceneKey, sessionEntryModeId: SessionEntryModeId): boolean => (
  getSessionEntryMode(sessionEntryModeId).restartSceneKey === sceneKey
);
