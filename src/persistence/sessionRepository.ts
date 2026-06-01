import { isSceneKey } from '../game/sceneKeys';
import {
  createInitialSessionState,
  createDefaultPracticeSettings,
  isBreathingPresetId,
  isAmbientAudioPresetId,
  isExerciseId,
  isMovingBallPresetId,
  isPracticeDurationPresetId,
  isSessionEntryModeId,
  maxRecentSessionSummaries,
  normalizeReflection,
  normalizePhrase,
  sanitizeAmbientAudioVolume,
  sanitizeCustomBreathingSeconds,
  sanitizeCustomPracticeDurationMinutes,
  customBreathingTimingBounds,
  type PracticeSettings,
  type SessionState,
  type SessionSummary,
} from '../state/types';
import { exerciseRequiresPhrase, getExerciseSessionEntryModeId } from '../practice/exercises';

import { getBrowserStorage, readStorageItem, type StorageLike, writeStorageItem } from './storage';

const storageKey = 'soft-focus/session-state';

interface PersistedSessionState {
  selectedExercise: string;
  phrase: string;
  settings: PracticeSettings;
  recentSessionSummaries: SessionSummary[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const sanitizeSettings = (value: unknown): PracticeSettings => {
  const defaults = createDefaultPracticeSettings();

  if (!isRecord(value)) {
    return defaults;
  }

  return {
    lowIntensityMode: typeof value.lowIntensityMode === 'boolean' ? value.lowIntensityMode : defaults.lowIntensityMode,
    reducedMotionEnabled: typeof value.reducedMotionEnabled === 'boolean' ? value.reducedMotionEnabled : defaults.reducedMotionEnabled,
    gazeGuidanceEnabled: typeof value.gazeGuidanceEnabled === 'boolean' ? value.gazeGuidanceEnabled : defaults.gazeGuidanceEnabled,
    ambientAudioEnabled: typeof value.ambientAudioEnabled === 'boolean' ? value.ambientAudioEnabled : defaults.ambientAudioEnabled,
    ambientAudioVolume: sanitizeAmbientAudioVolume(value.ambientAudioVolume),
    ambientAudioPresetId: typeof value.ambientAudioPresetId === 'string' && isAmbientAudioPresetId(value.ambientAudioPresetId)
      ? value.ambientAudioPresetId
      : defaults.ambientAudioPresetId,
    practiceDurationPresetId: typeof value.practiceDurationPresetId === 'string' && isPracticeDurationPresetId(value.practiceDurationPresetId)
      ? value.practiceDurationPresetId
      : defaults.practiceDurationPresetId,
    customPracticeDurationMinutes: sanitizeCustomPracticeDurationMinutes(value.customPracticeDurationMinutes),
    movingBallPresetId: typeof value.movingBallPresetId === 'string' && isMovingBallPresetId(value.movingBallPresetId)
      ? value.movingBallPresetId
      : defaults.movingBallPresetId,
    breathingPresetId: typeof value.breathingPresetId === 'string' && isBreathingPresetId(value.breathingPresetId)
      ? value.breathingPresetId
      : defaults.breathingPresetId,
    customBreathingInhaleSeconds: sanitizeCustomBreathingSeconds(
      value.customBreathingInhaleSeconds,
      customBreathingTimingBounds.defaultInhaleSeconds,
    ),
    customBreathingHoldSeconds: sanitizeCustomBreathingSeconds(
      value.customBreathingHoldSeconds,
      customBreathingTimingBounds.defaultHoldSeconds,
    ),
    customBreathingExhaleSeconds: sanitizeCustomBreathingSeconds(
      value.customBreathingExhaleSeconds,
      customBreathingTimingBounds.defaultExhaleSeconds,
    ),
  };
};

const sanitizeSessionSummary = (value: unknown): SessionSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (
    Object.keys(value).some((key) => ![
      'id',
      'exerciseId',
      'sessionEntryModeId',
      'phrase',
      'outcome',
      'sceneKey',
      'startedAt',
      'completedAt',
      'durationSeconds',
      'reflection',
    ].includes(key))
  ) {
    return null;
  }

  const durationSeconds = value.durationSeconds;
  const hasValidDuration = durationSeconds === null
    || (
      typeof durationSeconds === 'number'
      && Number.isFinite(durationSeconds)
      && durationSeconds >= 0
      && Number.isInteger(durationSeconds)
    );

  if (
    typeof value.id !== 'string'
    || typeof value.phrase !== 'string'
    || (value.outcome !== 'completed' && value.outcome !== 'stopped')
    || typeof value.sceneKey !== 'string'
    || !isSceneKey(value.sceneKey)
    || typeof value.startedAt !== 'string'
    || typeof value.completedAt !== 'string'
    || !hasValidDuration
  ) {
    return null;
  }

  const persistedSessionEntryModeId = value.sessionEntryModeId;
  const persistedExerciseId = value.exerciseId;
  const hasValidExerciseId = typeof persistedExerciseId === 'string' && isExerciseId(persistedExerciseId);

  if (!hasValidExerciseId || typeof persistedSessionEntryModeId !== 'string') {
    return null;
  }

  const exerciseId = persistedExerciseId;
  const expectedSessionEntryModeId = getExerciseSessionEntryModeId(exerciseId);

  if (
    !isSessionEntryModeId(persistedSessionEntryModeId)
    || persistedSessionEntryModeId !== expectedSessionEntryModeId
  ) {
    return null;
  }

  const phrase = exerciseRequiresPhrase(exerciseId)
    ? normalizePhrase(value.phrase)
    : '';

  return {
    id: value.id,
    exerciseId,
    sessionEntryModeId: expectedSessionEntryModeId,
    phrase,
    outcome: value.outcome,
    sceneKey: value.sceneKey,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    durationSeconds: durationSeconds as number | null,
    reflection: typeof value.reflection === 'string' ? normalizeReflection(value.reflection) : '',
  };
};

const sanitizeRecentSessionSummaries = (value: unknown): SessionSummary[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((summary) => sanitizeSessionSummary(summary))
    .filter((summary): summary is SessionSummary => summary !== null)
    .slice(0, maxRecentSessionSummaries);
};

const createPersistedSessionState = (state: SessionState): PersistedSessionState => ({
  selectedExercise: state.selectedExercise,
  phrase: normalizePhrase(state.phrase),
  settings: {
    ...state.settings,
  },
  recentSessionSummaries: state.recentSessionSummaries.slice(0, maxRecentSessionSummaries),
});

export class SessionRepository {
  constructor(private readonly storage: StorageLike | null = getBrowserStorage()) {}

  loadState(): Pick<SessionState, 'selectedExercise' | 'phrase' | 'settings' | 'recentSessionSummaries'> {
    const fallbackState = createInitialSessionState();
    const rawValue = readStorageItem(this.storage, storageKey);

    if (!rawValue) {
      return {
        selectedExercise: fallbackState.selectedExercise,
        phrase: fallbackState.phrase,
        settings: fallbackState.settings,
        recentSessionSummaries: fallbackState.recentSessionSummaries,
      };
    }

    try {
      const parsedValue = JSON.parse(rawValue) as unknown;

      if (!isRecord(parsedValue)) {
        return {
          selectedExercise: fallbackState.selectedExercise,
          phrase: fallbackState.phrase,
          settings: fallbackState.settings,
          recentSessionSummaries: fallbackState.recentSessionSummaries,
        };
      }

      return {
        selectedExercise: typeof parsedValue.selectedExercise === 'string' && isExerciseId(parsedValue.selectedExercise)
          ? parsedValue.selectedExercise
          : fallbackState.selectedExercise,
        phrase: typeof parsedValue.phrase === 'string' ? normalizePhrase(parsedValue.phrase) : fallbackState.phrase,
        settings: sanitizeSettings(parsedValue.settings),
        recentSessionSummaries: sanitizeRecentSessionSummaries(parsedValue.recentSessionSummaries),
      };
    } catch {
      return {
        selectedExercise: fallbackState.selectedExercise,
        phrase: fallbackState.phrase,
        settings: fallbackState.settings,
        recentSessionSummaries: fallbackState.recentSessionSummaries,
      };
    }
  }

  saveState(state: SessionState): boolean {
    return writeStorageItem(this.storage, storageKey, JSON.stringify(createPersistedSessionState(state)));
  }
}

export const createSessionRepository = (storage?: StorageLike | null): SessionRepository => new SessionRepository(storage);
