import { isSceneKey } from '../game/sceneKeys';
import {
  createInitialSessionState,
  createDefaultPracticeSettings,
  isBreathingPresetId,
  exerciseIds,
  getSessionFlowIdForExercise,
  isExerciseId,
  isMovingBallPresetId,
  isSessionFlowId,
  maxRecentSessionSummaries,
  normalizeReflection,
  normalizePhrase,
  type PracticeSettings,
  type SessionState,
  type SessionSummary,
} from '../state/types';

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
    movingBallPresetId: typeof value.movingBallPresetId === 'string' && isMovingBallPresetId(value.movingBallPresetId)
      ? value.movingBallPresetId
      : defaults.movingBallPresetId,
    breathingPresetId: typeof value.breathingPresetId === 'string' && isBreathingPresetId(value.breathingPresetId)
      ? value.breathingPresetId
      : defaults.breathingPresetId,
  };
};

const sanitizeSessionSummary = (value: unknown): SessionSummary | null => {
  if (!isRecord(value)) {
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

  return {
    id: value.id,
    exerciseId: typeof value.exerciseId === 'string' && isExerciseId(value.exerciseId)
      ? value.exerciseId
      : exerciseIds.phraseAnchor,
    flowId: typeof value.flowId === 'string' && isSessionFlowId(value.flowId)
      ? value.flowId
      : getSessionFlowIdForExercise(
        typeof value.exerciseId === 'string' && isExerciseId(value.exerciseId)
          ? value.exerciseId
          : exerciseIds.phraseAnchor,
      ),
    phrase: normalizePhrase(value.phrase),
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
