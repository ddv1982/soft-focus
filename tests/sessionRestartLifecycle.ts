import { createSessionStore } from '../src/state/sessionStore.ts';
import { sceneKeys } from '../src/game/sceneKeys.ts';
import { exerciseIds, movingBallPresetIds, sessionFlowIds } from '../src/state/types.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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
  assert(startedSession?.flowId === sessionFlowIds.phrasePrompted, 'expected the phrase scene to start the phrase-prompted flow');
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
  assert(restartedSession.flowId === sessionFlowIds.phrasePrompted, 'phrase restart should keep the phrase-prompted flow');
  assert(restartedSession.completedAt === null, 'restarted session should not inherit completion state');
}

const runStoppedRestartScenario = (): void => {
  const store = createSessionStore();

  store.setSelectedExercise(exerciseIds.movingBall);
  store.setReducedMotionEnabled(true);
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
  assert(restartedSession.flowId === sessionFlowIds.directPractice, 'moving-ball restart should keep the direct-practice flow');
  assert(store.getState().settings.reducedMotionEnabled === true, 'restarted moving-ball flow should preserve reduced-motion preference');
  assert(store.createPracticeConfig().movingBall?.presetId === movingBallPresetIds.settlingSteps, 'restarted moving-ball flow should preserve the selected preset');
}

const runExerciseReselectionClearsActiveDraftSessionScenario = (): void => {
  const store = createSessionStore();

  store.setSelectedExercise(exerciseIds.movingBall);
  store.updateCurrentScene(sceneKeys.instructions);

  const firstSession = store.getState().currentSession;
  assert(firstSession?.exerciseId === exerciseIds.movingBall, 'expected moving-ball instructions to start a direct-practice session');

  store.setSelectedExercise(exerciseIds.phraseAnchor);
  assert(store.getState().currentSession === null, 'expected changing exercises before practice to clear the stale draft session');

  store.setPhrase('new anchor');
  store.updateCurrentScene(sceneKeys.phrase);
  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);
  store.completeSession('2026-04-22T00:02:00.000Z');

  const summary = store.getLatestSessionSummary();
  assert(summary?.exerciseId === exerciseIds.phraseAnchor, 'expected reselected phrase-anchor summary to use the new exercise');
  assert(summary?.flowId === sessionFlowIds.phrasePrompted, 'expected reselected phrase-anchor summary to use the phrase-prompted flow');
  assert(summary?.phrase === 'new anchor', 'expected reselected phrase-anchor summary to keep the phrase');
}

const runDirectExerciseReselectionScenario = (): void => {
  const store = createSessionStore();

  store.setSelectedExercise(exerciseIds.movingBall);
  store.updateCurrentScene(sceneKeys.instructions);
  assert(store.getState().currentSession?.exerciseId === exerciseIds.movingBall, 'expected moving-ball to start a draft session');

  store.setSelectedExercise(exerciseIds.breathingReset);
  store.updateCurrentScene(sceneKeys.instructions);

  const reselectedSession = store.getState().currentSession;
  assert(reselectedSession?.exerciseId === exerciseIds.breathingReset, 'expected direct-to-direct reselection to start a session for the new exercise');
  assert(reselectedSession?.flowId === sessionFlowIds.directPractice, 'expected reselected direct practice to keep the direct-practice flow');
}

const runCompletedExerciseReselectionScenario = (): void => {
  const store = createSessionStore();

  store.setSelectedExercise(exerciseIds.phraseAnchor);
  store.setPhrase('steady phrase');
  store.updateCurrentScene(sceneKeys.phrase);
  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);
  store.completeSession('2026-04-22T00:03:00.000Z');

  const completedSessionId = store.getState().currentSession?.id;
  assert(completedSessionId, 'expected phrase-anchor completion to keep the finished session record');

  store.setSelectedExercise(exerciseIds.movingBall);
  assert(store.getState().currentSession === null, 'expected changing exercises after completion to clear the stale completed session');

  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);
  store.completeSession('2026-04-22T00:04:00.000Z');

  const summary = store.getLatestSessionSummary();
  assert(summary?.id !== completedSessionId, 'expected reselected exercise to create a fresh session summary');
  assert(summary?.exerciseId === exerciseIds.movingBall, 'expected reselected moving-ball summary to use the new exercise');
  assert(summary?.flowId === sessionFlowIds.directPractice, 'expected reselected moving-ball summary to use the direct-practice flow');
}

runEntryToPhraseScenario();
runCompletedRestartScenario();
runStoppedRestartScenario();
runExerciseReselectionClearsActiveDraftSessionScenario();
runDirectExerciseReselectionScenario();
runCompletedExerciseReselectionScenario();

console.log('session restart lifecycle validation passed');
