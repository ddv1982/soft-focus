import { sceneKeys } from '../src/game/sceneKeys.ts';
import { createSessionRepository } from '../src/persistence/sessionRepository.ts';
import type { StorageLike } from '../src/persistence/storage.ts';
import { exerciseCatalog } from '../src/practice/exercises.ts';
import { createSessionStore } from '../src/state/sessionStore.ts';
import {
  ambientAudioPresetIds,
  ambientAudioVolumeBounds,
  breathingPresetIds,
  exerciseIds,
  movingBallPresetIds,
  sessionEntryModeIds,
} from '../src/state/types.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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
  store.setAmbientAudioEnabled(true);
  store.setAmbientAudioVolume(42);
  store.setAmbientAudioPreset(ambientAudioPresetIds.emberDrift);
  store.setMovingBallPreset(movingBallPresetIds.settlingSteps);
  store.setBreathingPreset(breathingPresetIds.custom);
  store.setCustomBreathingInhaleSeconds(5);
  store.setCustomBreathingHoldSeconds(3);
  store.setCustomBreathingExhaleSeconds(7);
  store.startSession(sceneKeys.instructions, startedAt);
  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);
  store.startPractice(store.createPracticeConfig());
  store.stopPractice();
  store.completeSession('2026-04-22T10:00:05.000Z');
  store.clearPractice();

  const rehydratedStore = createSessionStore(undefined, createSessionRepository(storage));
  const rehydratedState = rehydratedStore.getState();

  assert(
    rehydratedState.phrase === 'steady phrase',
    'expected phrase to rehydrate from local persistence',
  );
  assert(
    rehydratedState.selectedExercise === exerciseIds.movingBall,
    'expected selected exercise to rehydrate from local persistence',
  );
  assert(
    rehydratedState.settings.lowIntensityMode === false,
    'expected low-intensity setting to rehydrate',
  );
  assert(
    rehydratedState.settings.reducedMotionEnabled === true,
    'expected reduced-motion setting to rehydrate',
  );
  assert(
    rehydratedState.settings.ambientAudioEnabled === true,
    'expected ambient audio enabled setting to rehydrate',
  );
  assert(
    rehydratedState.settings.ambientAudioVolume === 42,
    'expected ambient audio volume setting to rehydrate',
  );
  assert(
    rehydratedState.settings.ambientAudioPresetId === ambientAudioPresetIds.emberDrift,
    'expected ambient audio preset setting to rehydrate',
  );
  assert(
    rehydratedState.settings.movingBallPresetId === movingBallPresetIds.settlingSteps,
    'expected moving-ball preset setting to rehydrate',
  );
  assert(
    rehydratedState.settings.breathingPresetId === breathingPresetIds.custom,
    'expected breathing preset setting to rehydrate',
  );
  assert(
    rehydratedState.settings.customBreathingInhaleSeconds === 5,
    'expected custom breathing inhale setting to rehydrate',
  );
  assert(
    rehydratedState.settings.customBreathingHoldSeconds === 3,
    'expected custom breathing hold setting to rehydrate',
  );
  assert(
    rehydratedState.settings.customBreathingExhaleSeconds === 7,
    'expected custom breathing exhale setting to rehydrate',
  );
  assert(
    rehydratedState.currentSession === null,
    'expected current session not to resume after reload',
  );
  assert(rehydratedState.practice === null, 'expected practice runtime not to resume after reload');
  assert(
    rehydratedState.recentSessionSummaries.length === 1,
    'expected one recent session summary to rehydrate',
  );

  const [summary] = rehydratedState.recentSessionSummaries;
  assert(
    summary?.exerciseId === exerciseIds.movingBall,
    'expected saved summary to preserve the selected exercise',
  );
  assert(
    summary?.sessionEntryModeId === sessionEntryModeIds.directPractice,
    'expected saved summary to preserve the direct-practice entry mode',
  );
  assert(summary?.phrase === '', 'expected moving-ball summaries to omit phrase text');
  assert(summary?.outcome === 'stopped', 'expected saved summary to preserve the stopped outcome');
  assert(summary?.durationSeconds === 5, 'expected saved summary duration in seconds');
};

const runNonPhraseSummaryScenario = (): void => {
  exerciseCatalog
    .filter((exercise) => !exercise.requiresPhrase)
    .forEach((exercise, index) => {
      const storage = new MemoryStorage();
      const store = createSessionStore(undefined, createSessionRepository(storage));

      store.setSelectedExercise(exercise.id);
      store.setPhrase(` stale ${exercise.id} phrase `);
      store.startSession(
        sceneKeys.instructions,
        `2026-04-22T10:${String(index).padStart(2, '0')}:00.000Z`,
      );
      store.updateCurrentScene(sceneKeys.practice);
      store.startPractice(store.createPracticeConfig());
      store.completeSession(`2026-04-22T10:${String(index).padStart(2, '0')}:05.000Z`);

      const summary = store.getState().recentSessionSummaries[0];

      assert(summary?.exerciseId === exercise.id, `expected summary exercise to be ${exercise.id}`);
      assert(
        summary?.sessionEntryModeId === sessionEntryModeIds.directPractice,
        `expected ${exercise.id} to use direct-practice entry mode`,
      );
      assert(summary?.phrase === '', `expected ${exercise.id} summary to omit stale phrase text`);
    });
};

const runPersistedNonPhraseSummarySanitizationScenario = (): void => {
  const storage = new MemoryStorage();

  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      selectedExercise: exerciseIds.breathingReset,
      phrase: 'current phrase may remain available',
      settings: {
        lowIntensityMode: true,
        reducedMotionEnabled: false,
        gazeGuidanceEnabled: false,
        movingBallPresetId: movingBallPresetIds.steadyCenter,
        breathingPresetId: breathingPresetIds.longExhale,
      },
      recentSessionSummaries: [
        {
          id: 'legacy-non-phrase-summary',
          exerciseId: exerciseIds.breathingReset,
          sessionEntryModeId: sessionEntryModeIds.directPractice,
          phrase: 'legacy stale phrase',
          outcome: 'completed',
          sceneKey: sceneKeys.completion,
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: 5,
        },
      ],
    }),
  );

  const rehydratedState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();
  const [summary] = rehydratedState.recentSessionSummaries;

  assert(
    summary?.exerciseId === exerciseIds.breathingReset,
    'expected legacy non-phrase summary exercise to rehydrate',
  );
  assert(
    summary?.phrase === '',
    'expected legacy non-phrase summary phrase to be sanitized during rehydration',
  );
};

const runAmbiguousLegacyDirectPracticeSummaryScenario = (): void => {
  const storage = new MemoryStorage();

  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      selectedExercise: exerciseIds.phraseAnchor,
      phrase: 'current phrase',
      settings: {
        lowIntensityMode: true,
        reducedMotionEnabled: false,
        gazeGuidanceEnabled: false,
        movingBallPresetId: movingBallPresetIds.steadyCenter,
        breathingPresetId: breathingPresetIds.longExhale,
      },
      recentSessionSummaries: [
        {
          id: 'ambiguous-direct-practice-summary',
          exerciseId: 'legacy-unknown-exercise',
          sessionEntryModeId: sessionEntryModeIds.directPractice,
          phrase: 'stale direct practice phrase',
          outcome: 'completed',
          sceneKey: sceneKeys.completion,
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: 5,
        },
      ],
    }),
  );

  const rehydratedState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();

  assert(
    rehydratedState.recentSessionSummaries.length === 0,
    'expected ambiguous direct-practice summary without a valid exercise to be dropped',
  );
};

const runSessionEntryModeMigrationScenario = (): void => {
  const storage = new MemoryStorage();

  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      selectedExercise: exerciseIds.phraseAnchor,
      phrase: 'current phrase',
      settings: {
        lowIntensityMode: true,
        reducedMotionEnabled: false,
        gazeGuidanceEnabled: false,
        movingBallPresetId: movingBallPresetIds.steadyCenter,
        breathingPresetId: breathingPresetIds.longExhale,
      },
      recentSessionSummaries: [
        {
          id: 'missing-entry-mode-summary',
          exerciseId: exerciseIds.phraseAnchor,
          phrase: 'legacy phrase',
          outcome: 'completed',
          sceneKey: sceneKeys.completion,
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: 5,
        },
        {
          id: 'new-entry-mode-summary',
          exerciseId: exerciseIds.movingBall,
          sessionEntryModeId: sessionEntryModeIds.directPractice,
          phrase: 'stale direct practice phrase',
          outcome: 'completed',
          sceneKey: sceneKeys.completion,
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: 5,
        },
        {
          id: 'mismatched-entry-mode-summary',
          exerciseId: exerciseIds.movingBall,
          sessionEntryModeId: sessionEntryModeIds.phrasePrompted,
          phrase: 'mismatched phrase',
          outcome: 'completed',
          sceneKey: sceneKeys.completion,
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: 5,
        },
        {
          id: 'invalid-entry-mode-summary',
          exerciseId: exerciseIds.phraseAnchor,
          sessionEntryModeId: 'not-an-entry-mode',
          phrase: 'invalid entry mode',
          outcome: 'completed',
          sceneKey: sceneKeys.completion,
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: 5,
        },
        {
          id: 'unknown-key-summary',
          exerciseId: exerciseIds.phraseAnchor,
          sessionEntryModeId: sessionEntryModeIds.phrasePrompted,
          phrase: 'unknown key should drop',
          outcome: 'completed',
          sceneKey: sceneKeys.completion,
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: 5,
          unexpectedSummaryKey: true,
        },
        {
          id: 'stale-field-summary',
          exerciseId: exerciseIds.phraseAnchor,
          sessionEntryModeId: sessionEntryModeIds.phrasePrompted,
          phrase: 'stale field should drop',
          outcome: 'completed',
          sceneKey: sceneKeys.completion,
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: 5,
          flowId: sessionEntryModeIds.phrasePrompted,
        },
      ],
    }),
  );

  const rehydratedState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();

  assert(
    rehydratedState.recentSessionSummaries.length === 1,
    'expected only the complete new-schema entry-mode summary to rehydrate',
  );
  assert(
    rehydratedState.recentSessionSummaries[0]?.sessionEntryModeId ===
      sessionEntryModeIds.directPractice,
    'expected new entry-mode summary to rehydrate',
  );
  assert(
    rehydratedState.recentSessionSummaries[0]?.phrase === '',
    'expected migrated direct-practice summary phrase to be sanitized',
  );
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

  assert(
    state.phrase === 'calm focus',
    'expected store updates to work even when persistence fails',
  );
  assert(
    state.selectedExercise === exerciseIds.phraseAnchor,
    'expected selected exercise updates to survive persistence failures',
  );
  assert(
    state.settings.lowIntensityMode === false,
    'expected settings updates to survive persistence failures',
  );
  assert(
    state.settings.reducedMotionEnabled === true,
    'expected reduced-motion updates to survive persistence failures',
  );
  assert(
    state.recentSessionSummaries.length === 1,
    'expected summary creation to survive persistence failures',
  );
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

  assert(
    store.getState().recentSessionSummaries.length === 1,
    'expected saved summary before clearing',
  );
  assert(
    store.getState().recentSessionSummaries[0]?.reflection === 'calmer after practice',
    'expected saved reflection before clearing',
  );

  store.clearRecentSessionSummaries();

  const clearedState = store.getState();
  assert(
    clearedState.recentSessionSummaries.length === 0,
    'expected clear to remove recent session summaries',
  );
  assert(
    clearedState.selectedExercise === exerciseIds.phraseAnchor,
    'expected clear to preserve selected exercise',
  );
  assert(clearedState.phrase === 'clear only results', 'expected clear to preserve phrase');
  assert(
    clearedState.settings.lowIntensityMode === false,
    'expected clear to preserve low-intensity setting',
  );
  assert(
    clearedState.settings.reducedMotionEnabled === true,
    'expected clear to preserve reduced-motion setting',
  );
  assert(
    clearedState.settings.movingBallPresetId === movingBallPresetIds.settlingSteps,
    'expected clear to preserve moving-ball preset setting',
  );
  assert(
    clearedState.settings.breathingPresetId === breathingPresetIds.cyclicSighing,
    'expected clear to preserve breathing preset setting',
  );

  const rehydratedState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();
  assert(
    rehydratedState.recentSessionSummaries.length === 0,
    'expected cleared summaries to persist through rehydration',
  );
  assert(
    rehydratedState.selectedExercise === exerciseIds.phraseAnchor,
    'expected selected exercise to rehydrate after clear',
  );
  assert(
    rehydratedState.phrase === 'clear only results',
    'expected phrase to rehydrate after clear',
  );
  assert(
    rehydratedState.settings.lowIntensityMode === false,
    'expected low-intensity setting to rehydrate after clear',
  );
  assert(
    rehydratedState.settings.reducedMotionEnabled === true,
    'expected reduced-motion setting to rehydrate after clear',
  );
  assert(
    rehydratedState.settings.movingBallPresetId === movingBallPresetIds.settlingSteps,
    'expected moving-ball preset setting to rehydrate after clear',
  );
  assert(
    rehydratedState.settings.breathingPresetId === breathingPresetIds.cyclicSighing,
    'expected breathing preset setting to rehydrate after clear',
  );
};

const runInvalidSummarySceneKeyScenario = (): void => {
  const storage = new MemoryStorage();
  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      phrase: 'steady phrase',
      settings: {
        lowIntensityMode: true,
        reducedMotionEnabled: false,
        gazeGuidanceEnabled: false,
        movingBallPresetId: 'not-a-preset',
        breathingPresetId: 'not-a-breathing-preset',
      },
      recentSessionSummaries: [
        {
          id: 'bad-scene-key',
          exerciseId: exerciseIds.phraseAnchor,
          phrase: 'steady phrase',
          outcome: 'completed',
          sceneKey: 'not-a-scene',
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: 5,
        },
      ],
    }),
  );

  const rehydratedState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();

  assert(
    rehydratedState.recentSessionSummaries.length === 0,
    'expected invalid recent summary scene keys to be dropped during rehydration',
  );
};

const runPartialSettingsFallbackScenario = (): void => {
  const storage = new MemoryStorage();
  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      selectedExercise: exerciseIds.phraseAnchor,
      phrase: 'steady phrase',
      settings: {},
      recentSessionSummaries: [],
    }),
  );

  const rehydratedState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();

  assert(
    rehydratedState.settings.lowIntensityMode === true,
    'expected missing persisted low-intensity setting to preserve the app default',
  );
  assert(
    rehydratedState.settings.reducedMotionEnabled === false,
    'expected missing persisted reduced-motion setting to preserve the app default',
  );
  assert(
    rehydratedState.settings.gazeGuidanceEnabled === false,
    'expected missing persisted gaze-guidance setting to preserve the app default',
  );
  assert(
    rehydratedState.settings.ambientAudioEnabled === false,
    'expected missing persisted ambient audio toggle to preserve the app default',
  );
  assert(
    rehydratedState.settings.ambientAudioVolume === ambientAudioVolumeBounds.defaultValue,
    'expected missing persisted ambient audio volume to preserve the app default',
  );
  assert(
    rehydratedState.settings.ambientAudioPresetId === ambientAudioPresetIds.openHorizon,
    'expected missing persisted ambient audio preset to use the app default',
  );
  assert(
    rehydratedState.settings.movingBallPresetId === movingBallPresetIds.steadyCenter,
    'expected missing persisted moving-ball preset to preserve the app default',
  );
  assert(
    rehydratedState.settings.breathingPresetId === breathingPresetIds.longExhale,
    'expected missing persisted breathing preset to preserve the app default',
  );
  assert(
    rehydratedState.settings.customBreathingInhaleSeconds === 4,
    'expected missing custom breathing inhale to preserve the app default',
  );
  assert(
    rehydratedState.settings.customBreathingHoldSeconds === 2,
    'expected missing custom breathing hold to preserve the app default',
  );
  assert(
    rehydratedState.settings.customBreathingExhaleSeconds === 6,
    'expected missing custom breathing exhale to preserve the app default',
  );
};

const runCustomBreathingSettingsSanitizationScenario = (): void => {
  const storage = new MemoryStorage();
  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      selectedExercise: exerciseIds.breathingReset,
      phrase: '',
      settings: {
        lowIntensityMode: true,
        reducedMotionEnabled: false,
        gazeGuidanceEnabled: false,
        movingBallPresetId: movingBallPresetIds.steadyCenter,
        breathingPresetId: breathingPresetIds.custom,
        customBreathingInhaleSeconds: 20,
        customBreathingHoldSeconds: -5,
        customBreathingExhaleSeconds: Number.NaN,
      },
      recentSessionSummaries: [],
    }),
  );

  const rehydratedState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();

  assert(
    rehydratedState.settings.breathingPresetId === breathingPresetIds.custom,
    'expected valid custom breathing preset to rehydrate',
  );
  assert(
    rehydratedState.settings.customBreathingInhaleSeconds === 12,
    'expected persisted custom inhale to clamp to the upper bound',
  );
  assert(
    rehydratedState.settings.customBreathingHoldSeconds === 1,
    'expected persisted custom hold to clamp to the lower bound',
  );
  assert(
    rehydratedState.settings.customBreathingExhaleSeconds === 6,
    'expected invalid persisted custom exhale to fall back to the default',
  );
};

const runAmbientAudioSettingsSanitizationScenario = (): void => {
  const storage = new MemoryStorage();
  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      selectedExercise: exerciseIds.phraseAnchor,
      phrase: 'steady phrase',
      settings: {
        lowIntensityMode: true,
        reducedMotionEnabled: false,
        gazeGuidanceEnabled: false,
        ambientAudioEnabled: true,
        ambientAudioVolume: 160,
        ambientAudioPresetId: 'not-a-preset',
        movingBallPresetId: movingBallPresetIds.steadyCenter,
        breathingPresetId: breathingPresetIds.longExhale,
      },
      recentSessionSummaries: [],
    }),
  );

  const rehydratedState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();

  assert(
    rehydratedState.settings.ambientAudioEnabled === true,
    'expected valid ambient audio toggle to rehydrate',
  );
  assert(
    rehydratedState.settings.ambientAudioVolume === ambientAudioVolumeBounds.max,
    'expected ambient audio volume to clamp to the upper bound',
  );
  assert(
    rehydratedState.settings.ambientAudioPresetId === ambientAudioPresetIds.openHorizon,
    'expected invalid ambient audio preset to fall back to the default',
  );

  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      selectedExercise: exerciseIds.phraseAnchor,
      phrase: 'steady phrase',
      settings: {
        lowIntensityMode: true,
        reducedMotionEnabled: false,
        gazeGuidanceEnabled: false,
        ambientAudioEnabled: false,
        ambientAudioVolume: -15,
        ambientAudioPresetId: ambientAudioPresetIds.clearBells,
        movingBallPresetId: movingBallPresetIds.steadyCenter,
        breathingPresetId: breathingPresetIds.longExhale,
      },
      recentSessionSummaries: [],
    }),
  );

  const lowerBoundState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();

  assert(
    lowerBoundState.settings.ambientAudioEnabled === false,
    'expected disabled ambient audio state to rehydrate without forcing playback on',
  );
  assert(
    lowerBoundState.settings.ambientAudioVolume === ambientAudioVolumeBounds.min,
    'expected ambient audio volume to clamp to the lower bound',
  );
  assert(
    lowerBoundState.settings.ambientAudioPresetId === ambientAudioPresetIds.clearBells,
    'expected valid canonical ambient preset to survive lower-bound sanitization',
  );

  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      selectedExercise: exerciseIds.phraseAnchor,
      phrase: 'steady phrase',
      settings: {
        lowIntensityMode: true,
        reducedMotionEnabled: false,
        gazeGuidanceEnabled: false,
        ambientAudioEnabled: true,
        ambientAudioVolume: Number.NaN,
        ambientAudioPresetId: ambientAudioPresetIds.emberDrift,
        movingBallPresetId: movingBallPresetIds.steadyCenter,
        breathingPresetId: breathingPresetIds.longExhale,
      },
      recentSessionSummaries: [],
    }),
  );

  const fallbackVolumeState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();

  assert(
    fallbackVolumeState.settings.ambientAudioVolume === ambientAudioVolumeBounds.defaultValue,
    'expected invalid ambient audio volume to fall back to the safe default',
  );
  assert(
    fallbackVolumeState.settings.ambientAudioPresetId === ambientAudioPresetIds.emberDrift,
    'expected valid musical ambient preset to survive invalid-volume sanitization',
  );
};

const runCanonicalAmbientPresetPersistenceScenario = (): void => {
  const storage = new MemoryStorage();
  const store = createSessionStore(undefined, createSessionRepository(storage));

  [
    ambientAudioPresetIds.openHorizon,
    ambientAudioPresetIds.emberDrift,
    ambientAudioPresetIds.clearBells,
  ].forEach((presetId, index) => {
    const volume = 20 + index * 15;

    store.setSelectedExercise(index === 1 ? exerciseIds.breathingReset : exerciseIds.orienting);
    store.setAmbientAudioEnabled(index !== 0);
    store.setAmbientAudioVolume(volume);
    store.setAmbientAudioPreset(presetId);

    const rehydratedState = createSessionStore(
      undefined,
      createSessionRepository(storage),
    ).getState();

    assert(
      rehydratedState.settings.ambientAudioEnabled === (index !== 0),
      `expected ambient enabled setting for ${presetId} to persist`,
    );
    assert(
      rehydratedState.settings.ambientAudioVolume === volume,
      `expected ambient volume setting for ${presetId} to persist`,
    );
    assert(
      rehydratedState.settings.ambientAudioPresetId === presetId,
      `expected canonical ambient preset ${presetId} to persist`,
    );
    assert(
      rehydratedState.selectedExercise ===
        (index === 1 ? exerciseIds.breathingReset : exerciseIds.orienting),
      `expected selected practice mode to persist with ambient preset ${presetId}`,
    );
  });
};

const runInvalidSummaryDurationScenario = (): void => {
  const storage = new MemoryStorage();
  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      phrase: 'steady phrase',
      settings: {
        lowIntensityMode: true,
        reducedMotionEnabled: false,
        gazeGuidanceEnabled: false,
        movingBallPresetId: movingBallPresetIds.steadyCenter,
        breathingPresetId: breathingPresetIds.longExhale,
      },
      recentSessionSummaries: [
        {
          id: 'bad-duration',
          exerciseId: exerciseIds.phraseAnchor,
          phrase: 'steady phrase',
          outcome: 'completed',
          sceneKey: sceneKeys.completion,
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: -5,
        },
      ],
    }),
  );

  const rehydratedState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();

  assert(
    rehydratedState.recentSessionSummaries.length === 0,
    'expected invalid negative summary durations to be dropped during rehydration',
  );
};

const runFractionalSummaryDurationScenario = (): void => {
  const storage = new MemoryStorage();
  storage.setItem(
    'soft-focus/session-state',
    JSON.stringify({
      phrase: 'steady phrase',
      settings: {
        lowIntensityMode: true,
        reducedMotionEnabled: false,
        gazeGuidanceEnabled: false,
        movingBallPresetId: movingBallPresetIds.steadyCenter,
        breathingPresetId: breathingPresetIds.longExhale,
      },
      recentSessionSummaries: [
        {
          id: 'fractional-duration',
          exerciseId: exerciseIds.phraseAnchor,
          phrase: 'steady phrase',
          outcome: 'completed',
          sceneKey: sceneKeys.completion,
          startedAt: '2026-04-22T10:00:00.000Z',
          completedAt: '2026-04-22T10:00:05.000Z',
          durationSeconds: 1.5,
        },
      ],
    }),
  );

  const rehydratedState = createSessionStore(
    undefined,
    createSessionRepository(storage),
  ).getState();

  assert(
    rehydratedState.recentSessionSummaries.length === 0,
    'expected fractional summary durations to be dropped during rehydration',
  );
};

runRehydrationScenario();
runNonPhraseSummaryScenario();
runPersistedNonPhraseSummarySanitizationScenario();
runAmbiguousLegacyDirectPracticeSummaryScenario();
runSessionEntryModeMigrationScenario();
runGracefulFailureScenario();
runClearRecentSessionSummariesScenario();
runInvalidSummarySceneKeyScenario();
runPartialSettingsFallbackScenario();
runCustomBreathingSettingsSanitizationScenario();
runAmbientAudioSettingsSanitizationScenario();
runCanonicalAmbientPresetPersistenceScenario();
runInvalidSummaryDurationScenario();
runFractionalSummaryDurationScenario();

console.log('session persistence validation passed');
