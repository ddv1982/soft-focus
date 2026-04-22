import { getInstructionsBackScene, guidedPracticeFlow, getNextSceneKey, getPreviousSceneKey } from '../src/game/navigation.ts';
import { createSessionRepository } from '../src/persistence/sessionRepository.ts';
import { getExerciseStartScene } from '../src/practice/exercises.ts';
import { exerciseIds, movingBallPresetIds } from '../src/state/types.ts';
import type { StorageLike } from '../src/persistence/storage.ts';
import { PracticeRunner } from '../src/practice/practiceRunner.ts';
import { initialSceneKey } from '../src/game/sceneKeys.ts';
import { sceneKeys } from '../src/game/sceneKeys.ts';
import { createSessionStore } from '../src/state/sessionStore.ts';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

class MemoryStorage implements StorageLike {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

const assertSceneFlow = (): void => {
  assert(guidedPracticeFlow[0] === initialSceneKey, 'expected the guided practice flow to begin at the initial scene');
  assert(getPreviousSceneKey(sceneKeys.entry) === null, 'expected entry to have no previous scene');
  assert(getNextSceneKey(sceneKeys.entry) === sceneKeys.exerciseSelection, 'expected entry to navigate to exercise selection');
  assert(getNextSceneKey(sceneKeys.exerciseSelection) === sceneKeys.phrase, 'expected exercise selection to navigate to phrase');
  assert(getNextSceneKey(sceneKeys.phrase) === sceneKeys.instructions, 'expected phrase to navigate to instructions');
  assert(getNextSceneKey(sceneKeys.instructions) === sceneKeys.practice, 'expected instructions to navigate to practice');
  assert(getNextSceneKey(sceneKeys.practice) === sceneKeys.completion, 'expected practice to navigate to completion');
  assert(getNextSceneKey(sceneKeys.completion) === sceneKeys.reflection, 'expected completion to navigate to reflection');
  assert(getNextSceneKey(sceneKeys.reflection) === null, 'expected reflection to terminate the flow');
  assert(getPreviousSceneKey(sceneKeys.reflection) === sceneKeys.completion, 'expected reflection to navigate back to completion');
};

const runPracticeControlsScenario = (): void => {
  const store = createSessionStore();

  store.setPhrase('  steady   phrase  ');
  store.setSelectedExercise(exerciseIds.phraseAnchor);
  store.setLowIntensityMode(false);
  store.setGazeGuidanceEnabled(true);
  store.updateCurrentScene(sceneKeys.entry);
  store.updateCurrentScene(sceneKeys.exerciseSelection);
  store.updateCurrentScene(sceneKeys.phrase);
  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);

  const practiceConfig = store.createPracticeConfig();
  assert(practiceConfig.phrase === 'steady phrase', 'expected phrase normalization before practice begins');
  assert(practiceConfig.lowIntensity.enabled === false, 'expected low-intensity toggle to feed practice config');
  assert(practiceConfig.gazeGuidance.enabled === true, 'expected gaze guidance toggle to feed practice config');
  assert(practiceConfig.copy.expectationsTitle === 'What to expect in this maintenance round', 'expected maintenance instructions copy to be phase-aware');
  assert(practiceConfig.copy.reflectionPrompt.includes('maintenance round'), 'expected maintenance reflection prompt to stay phase-aware');

  store.startPractice(practiceConfig);
  let runner = new PracticeRunner(practiceConfig);
  let snapshot = runner.getSnapshot();
  assert(snapshot.phase === 'settle', 'expected the practice flow to begin with settle');
  assert(snapshot.paused === false, 'expected practice to start unpaused');

  snapshot = runner.pause();
  store.setPracticePaused(snapshot.paused);
  assert(snapshot.paused === true, 'expected pause control to pause the runner');

  snapshot = runner.resume();
  store.setPracticePaused(snapshot.paused);
  assert(snapshot.paused === false, 'expected resume control to resume the runner');

  while (!snapshot.complete) {
    snapshot = runner.tick(30_000);
  }

  store.setPracticePhase(snapshot.phase, snapshot.phaseIndex, snapshot.secondsRemaining);
  store.completeSession('2026-04-22T12:00:00.000Z');
  store.clearPractice();
  store.updateCurrentScene(sceneKeys.completion);

  const latestSummary = store.getLatestSessionSummary();
  assert(latestSummary?.outcome === 'completed', 'expected a completed summary after the runner finishes');
  assert(latestSummary?.phrase === 'steady phrase', 'expected the completed summary to retain the normalized phrase');
  assert(latestSummary?.exerciseId === exerciseIds.phraseAnchor, 'expected the completed summary to retain the selected exercise');
};

const runExerciseBranchingScenario = (): void => {
  const store = createSessionStore();

  store.setSelectedExercise(exerciseIds.movingBall);
  store.setLowIntensityMode(true);
  store.setMovingBallPreset(movingBallPresetIds.steadyCenter);

  const movingBallConfig = store.createPracticeConfig();
  assert(getExerciseStartScene(exerciseIds.movingBall) === sceneKeys.instructions, 'expected moving-ball exercise to bypass phrase entry');
  assert(movingBallConfig.exercise.id === exerciseIds.movingBall, 'expected moving-ball config to reflect the selected exercise');
  assert(movingBallConfig.movingBall?.presetId === movingBallPresetIds.steadyCenter, 'expected moving-ball config to expose the selected steady preset');
  assert(movingBallConfig.movingBall?.laneHeights.length === 1, 'expected steady center sweep to use a single lane');
  assert(movingBallConfig.copy.instructionsSelectionLabel === 'Selected reset practice', 'expected moving-ball instructions copy to reflect the reset phase');

  store.setMovingBallPreset(movingBallPresetIds.multiHeight);

  const variedMovingBallConfig = store.createPracticeConfig();
  assert(variedMovingBallConfig.movingBall?.presetId === movingBallPresetIds.multiHeight, 'expected multi-height preset selection to carry into practice config');
  assert(variedMovingBallConfig.movingBall?.laneHeights.length === 3, 'expected moving-ball config to expose multi-height lanes for the multi-height preset');
  assert(variedMovingBallConfig.movingBall?.pattern === 'multi-height-sweep', 'expected moving-ball config to expose multi-height motion metadata');
  assert(variedMovingBallConfig.copy.reflectionPrompt.includes('settle, reset'), 'expected reset reflection prompt to stay phase-aware');

  store.setMovingBallPreset(movingBallPresetIds.settlingSteps);

  const settlingMovingBallConfig = store.createPracticeConfig();
  assert(settlingMovingBallConfig.movingBall?.pattern === 'settling-step-sweep', 'expected moving-ball config to expose the settling-step pattern metadata');
  assert(getExerciseStartScene(exerciseIds.phraseAnchor) === sceneKeys.phrase, 'expected phrase-anchor exercise to require phrase entry');
  assert(getInstructionsBackScene(exerciseIds.phraseAnchor) === sceneKeys.phrase, 'expected phrase-anchor instructions to navigate back to phrase');
  assert(getInstructionsBackScene(exerciseIds.movingBall) === sceneKeys.exerciseSelection, 'expected moving-ball instructions to navigate back to exercise selection');
};

const runReflectionAndReloadScenario = (): void => {
  const storage = new MemoryStorage();
  const repository = createSessionRepository(storage);
  const store = createSessionStore(undefined, repository);

  store.setSelectedExercise(exerciseIds.movingBall);
  store.setLowIntensityMode(true);
  store.setMovingBallPreset(movingBallPresetIds.multiHeight);
  store.updateCurrentScene(sceneKeys.exerciseSelection);
  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);
  store.startPractice(store.createPracticeConfig());
  store.stopPractice();
  store.completeSession('2026-04-22T12:05:00.000Z');
  store.clearPractice();
  store.updateCurrentScene(sceneKeys.completion);
  store.updateCurrentScene(sceneKeys.reflection);
  store.saveReflection('  shoulders softened and the phrase stayed easy  ');
  store.prepareForNextSession();
  store.updateCurrentScene(sceneKeys.instructions);

  const restartedState = store.getState();
  assert(restartedState.currentSession?.completedAt === null, 'expected reflection restart to begin a fresh session');
  assert(restartedState.currentSession?.sceneKey === sceneKeys.instructions, 'expected reflection restart to return to instructions for moving-ball practice');
  assert(store.createPracticeConfig().movingBall?.presetId === movingBallPresetIds.multiHeight, 'expected restart to preserve the selected moving-ball preset');

  const rehydratedStore = createSessionStore(undefined, createSessionRepository(storage));
  const rehydratedState = rehydratedStore.getState();
  const [latestSummary] = rehydratedState.recentSessionSummaries;

  assert(rehydratedState.phrase === '', 'expected moving-ball exercise not to persist a phrase requirement across reloads');
  assert(rehydratedState.selectedExercise === exerciseIds.movingBall, 'expected selected exercise to persist across reloads');
  assert(rehydratedState.settings.lowIntensityMode === true, 'expected settings persistence across reloads');
  assert(rehydratedState.settings.movingBallPresetId === movingBallPresetIds.multiHeight, 'expected moving-ball preset persistence across reloads');
  assert(rehydratedState.currentSession === null, 'expected in-progress session state not to persist across reloads');
  assert(rehydratedState.practice === null, 'expected practice runtime state not to persist across reloads');
  assert(latestSummary?.outcome === 'stopped', 'expected stopped outcome to persist into the recent session summary');
  assert(latestSummary?.exerciseId === exerciseIds.movingBall, 'expected selected exercise to persist into recent session summaries');
  assert(latestSummary?.phrase === '', 'expected moving-ball summaries not to carry phrase text');
  assert(
    latestSummary?.reflection === 'shoulders softened and the phrase stayed easy',
    'expected reflection text to be normalized and persisted across reloads',
  );
};

assertSceneFlow();
runPracticeControlsScenario();
runExerciseBranchingScenario();
runReflectionAndReloadScenario();

console.log('full guided flow smoke validation passed');
