import { createSessionStore } from '../src/state/sessionStore.ts';
import { sceneKeys } from '../src/game/sceneKeys.ts';
import { exerciseIds, movingBallPresetIds } from '../src/state/types.ts';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const runEntryToPhraseScenario = (): void => {
  const store = createSessionStore();

  store.updateCurrentScene(sceneKeys.entry);
  assert(store.getState().currentSession === null, 'expected entry scene not to start a session');

  store.updateCurrentScene(sceneKeys.exerciseSelection);
  assert(store.getState().currentSession === null, 'expected exercise selection not to start a session');

  store.updateCurrentScene(sceneKeys.phrase);

  const startedSession = store.getState().currentSession;
  assert(startedSession, 'expected a session to start when entering the phrase flow');
  assert(startedSession?.sceneKey === sceneKeys.phrase, 'expected the phrase scene to own the new session start');
};

const runCompletedRestartScenario = (): void => {
  const store = createSessionStore();

  store.setSelectedExercise(exerciseIds.phraseAnchor);
  store.setPhrase('steady phrase');
  store.updateCurrentScene(sceneKeys.exerciseSelection);
  store.updateCurrentScene(sceneKeys.phrase);

  const firstSessionId = store.getState().currentSession?.id;
  assert(firstSessionId, 'expected a session to start on the phrase scene');

  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);
  store.completeSession('2026-04-22T00:00:00.000Z');
  store.updateCurrentScene(sceneKeys.completion);

  const completedSession = store.getState().currentSession;
  assert(completedSession?.id === firstSessionId, 'completion should keep the finished session record');
  assert(completedSession?.sceneKey === sceneKeys.completion, 'completion should update the finished session scene');
  assert(completedSession?.completedAt === '2026-04-22T00:00:00.000Z', 'completion should preserve the completed timestamp');

  store.updateCurrentScene(sceneKeys.phrase);

  const restartedSession = store.getState().currentSession;
  assert(restartedSession, 'expected a fresh session after restarting from phrase');
  if (!restartedSession) {
    return;
  }

  assert(restartedSession.id !== firstSessionId, 'restarting from phrase should create a new session id');
  assert(restartedSession.sceneKey === sceneKeys.phrase, 'restarted session should begin at the phrase scene');
  assert(restartedSession.completedAt === null, 'restarted session should not inherit completion state');
}

const runStoppedRestartScenario = (): void => {
  const store = createSessionStore();

  store.setSelectedExercise(exerciseIds.movingBall);
  store.setMovingBallPreset(movingBallPresetIds.settlingSteps);
  store.updateCurrentScene(sceneKeys.exerciseSelection);
  store.updateCurrentScene(sceneKeys.instructions);

  const firstSessionId = store.getState().currentSession?.id;
  assert(firstSessionId, 'expected a session to start on the instructions scene for moving-ball practice');

  store.updateCurrentScene(sceneKeys.practice);
  store.startPractice(store.createPracticeConfig());
  store.stopPractice();
  store.completeSession('2026-04-22T00:01:00.000Z');
  store.clearPractice();
  store.updateCurrentScene(sceneKeys.completion);

  const stoppedSession = store.getState().currentSession;
  assert(stoppedSession?.id === firstSessionId, 'stopping should keep the finished session record until restart');
  assert(stoppedSession?.sceneKey === sceneKeys.completion, 'stopped flow should still land on completion');
  assert(stoppedSession?.completedAt === '2026-04-22T00:01:00.000Z', 'stopped flow should preserve the completion timestamp');

  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);

  const restartedSession = store.getState().currentSession;
  assert(restartedSession, 'expected a fresh session after restarting a stopped round');
  if (!restartedSession) {
    return;
  }

  assert(restartedSession.id !== firstSessionId, 'restarting a stopped round should create a new session id');
  assert(restartedSession.completedAt === null, 'restarted stopped round should not inherit completion state');
  assert(restartedSession.sceneKey === sceneKeys.practice, 'new session should continue through the new practice flow');
  assert(restartedSession.exerciseId === exerciseIds.movingBall, 'restarted session should preserve the selected exercise');
  assert(store.createPracticeConfig().movingBall?.presetId === movingBallPresetIds.settlingSteps, 'restarted moving-ball flow should preserve the selected preset');
}

runEntryToPhraseScenario();
runCompletedRestartScenario();
runStoppedRestartScenario();

console.log('session restart lifecycle validation passed');
