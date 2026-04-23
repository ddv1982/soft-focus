import { createSessionRepository } from '../src/persistence/sessionRepository.ts';
import type { StorageLike } from '../src/persistence/storage.ts';
import { sceneKeys } from '../src/game/sceneKeys.ts';
import { createSessionStore } from '../src/state/sessionStore.ts';
import { breathingPresetIds, exerciseIds, movingBallPresetIds, sessionFlowIds } from '../src/state/types.ts';

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

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('storage read failed');
  }

  setItem(): void {
    throw new Error('storage write failed');
  }

  removeItem(): void {
    throw new Error('storage remove failed');
  }
}

const runRehydrationScenario = (): void => {
  const storage = new MemoryStorage();
  const repository = createSessionRepository(storage);
  const store = createSessionStore(undefined, repository);
  const startedAt = '2026-04-22T10:00:00.000Z';

  store.setSelectedExercise(exerciseIds.movingBall);
  store.setPhrase('  steady   phrase  ');
  store.setLowIntensityMode(false);
  store.setReducedMotionEnabled(true);
  store.setMovingBallPreset(movingBallPresetIds.settlingSteps);
  store.setBreathingPreset(breathingPresetIds.cyclicSighing);
  store.startSession(sceneKeys.instructions, startedAt);
  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);
  store.startPractice(store.createPracticeConfig());
  store.stopPractice();
  store.completeSession('2026-04-22T10:00:05.000Z');
  store.clearPractice();

  const rehydratedStore = createSessionStore(undefined, createSessionRepository(storage));
  const rehydratedState = rehydratedStore.getState();

  assert(rehydratedState.phrase === 'steady phrase', 'expected phrase to rehydrate from local persistence');
  assert(rehydratedState.selectedExercise === exerciseIds.movingBall, 'expected selected exercise to rehydrate from local persistence');
  assert(rehydratedState.settings.lowIntensityMode === false, 'expected low-intensity setting to rehydrate');
  assert(rehydratedState.settings.reducedMotionEnabled === true, 'expected reduced-motion setting to rehydrate');
  assert(rehydratedState.settings.movingBallPresetId === movingBallPresetIds.settlingSteps, 'expected moving-ball preset setting to rehydrate');
  assert(rehydratedState.settings.breathingPresetId === breathingPresetIds.cyclicSighing, 'expected breathing preset setting to rehydrate');
  assert(rehydratedState.currentSession === null, 'expected current session not to resume after reload');
  assert(rehydratedState.practice === null, 'expected practice runtime not to resume after reload');
  assert(rehydratedState.recentSessionSummaries.length === 1, 'expected one recent session summary to rehydrate');

  const [summary] = rehydratedState.recentSessionSummaries;
  assert(summary?.exerciseId === exerciseIds.movingBall, 'expected saved summary to preserve the selected exercise');
  assert(summary?.flowId === sessionFlowIds.directPractice, 'expected saved summary to preserve the direct-practice flow');
  assert(summary?.phrase === '', 'expected moving-ball summaries to omit phrase text');
  assert(summary?.outcome === 'stopped', 'expected saved summary to preserve the stopped outcome');
  assert(summary?.durationSeconds === 5, 'expected saved summary duration in seconds');
};

const runGracefulFailureScenario = (): void => {
  const store = createSessionStore(undefined, createSessionRepository(new ThrowingStorage()));

  store.setPhrase('calm focus');
  store.setSelectedExercise(exerciseIds.phraseAnchor);
  store.setLowIntensityMode(false);
  store.setReducedMotionEnabled(true);
  store.updateCurrentScene(sceneKeys.phrase);
  store.updateCurrentScene(sceneKeys.practice);
  store.startPractice(store.createPracticeConfig());
  store.completeSession('2026-04-22T10:01:00.000Z');

  const state = store.getState();

  assert(state.phrase === 'calm focus', 'expected store updates to work even when persistence fails');
  assert(state.selectedExercise === exerciseIds.phraseAnchor, 'expected selected exercise updates to survive persistence failures');
  assert(state.settings.lowIntensityMode === false, 'expected settings updates to survive persistence failures');
  assert(state.settings.reducedMotionEnabled === true, 'expected reduced-motion updates to survive persistence failures');
  assert(state.recentSessionSummaries.length === 1, 'expected summary creation to survive persistence failures');
};

const runClearRecentSessionSummariesScenario = (): void => {
  const storage = new MemoryStorage();
  const repository = createSessionRepository(storage);
  const store = createSessionStore(undefined, repository);

  store.setSelectedExercise(exerciseIds.phraseAnchor);
  store.setPhrase('  clear only results  ');
  store.setLowIntensityMode(false);
  store.setReducedMotionEnabled(true);
  store.setMovingBallPreset(movingBallPresetIds.settlingSteps);
  store.setBreathingPreset(breathingPresetIds.cyclicSighing);
  store.startSession(sceneKeys.phrase, '2026-04-22T10:02:00.000Z');
  store.updateCurrentScene(sceneKeys.practice);
  store.startPractice(store.createPracticeConfig());
  store.completeSession('2026-04-22T10:02:10.000Z');
  store.saveReflection('  calmer after practice  ');

  assert(store.getState().recentSessionSummaries.length === 1, 'expected saved summary before clearing');
  assert(store.getState().recentSessionSummaries[0]?.reflection === 'calmer after practice', 'expected saved reflection before clearing');

  store.clearRecentSessionSummaries();

  const clearedState = store.getState();
  assert(clearedState.recentSessionSummaries.length === 0, 'expected clear to remove recent session summaries');
  assert(clearedState.selectedExercise === exerciseIds.phraseAnchor, 'expected clear to preserve selected exercise');
  assert(clearedState.phrase === 'clear only results', 'expected clear to preserve phrase');
  assert(clearedState.settings.lowIntensityMode === false, 'expected clear to preserve low-intensity setting');
  assert(clearedState.settings.reducedMotionEnabled === true, 'expected clear to preserve reduced-motion setting');
  assert(clearedState.settings.movingBallPresetId === movingBallPresetIds.settlingSteps, 'expected clear to preserve moving-ball preset setting');
  assert(clearedState.settings.breathingPresetId === breathingPresetIds.cyclicSighing, 'expected clear to preserve breathing preset setting');

  const rehydratedState = createSessionStore(undefined, createSessionRepository(storage)).getState();
  assert(rehydratedState.recentSessionSummaries.length === 0, 'expected cleared summaries to persist through rehydration');
  assert(rehydratedState.selectedExercise === exerciseIds.phraseAnchor, 'expected selected exercise to rehydrate after clear');
  assert(rehydratedState.phrase === 'clear only results', 'expected phrase to rehydrate after clear');
  assert(rehydratedState.settings.lowIntensityMode === false, 'expected low-intensity setting to rehydrate after clear');
  assert(rehydratedState.settings.reducedMotionEnabled === true, 'expected reduced-motion setting to rehydrate after clear');
  assert(rehydratedState.settings.movingBallPresetId === movingBallPresetIds.settlingSteps, 'expected moving-ball preset setting to rehydrate after clear');
  assert(rehydratedState.settings.breathingPresetId === breathingPresetIds.cyclicSighing, 'expected breathing preset setting to rehydrate after clear');
};

const runInvalidSummarySceneKeyScenario = (): void => {
  const storage = new MemoryStorage();
  storage.setItem('soft-focus/session-state', JSON.stringify({
    phrase: 'steady phrase',
    settings: {
      lowIntensityMode: true,
      reducedMotionEnabled: false,
      gazeGuidanceEnabled: false,
      movingBallPresetId: 'not-a-preset',
      breathingPresetId: 'not-a-breathing-preset',
    },
    recentSessionSummaries: [{
      id: 'bad-scene-key',
      exerciseId: exerciseIds.phraseAnchor,
      phrase: 'steady phrase',
      outcome: 'completed',
      sceneKey: 'not-a-scene',
      startedAt: '2026-04-22T10:00:00.000Z',
      completedAt: '2026-04-22T10:00:05.000Z',
      durationSeconds: 5,
    }],
  }));

  const rehydratedState = createSessionStore(undefined, createSessionRepository(storage)).getState();

  assert(rehydratedState.recentSessionSummaries.length === 0, 'expected invalid recent summary scene keys to be dropped during rehydration');
};

runRehydrationScenario();
runGracefulFailureScenario();
runClearRecentSessionSummariesScenario();
runInvalidSummarySceneKeyScenario();

console.log('session persistence validation passed');
