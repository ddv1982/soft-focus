import { sceneKeys, type SceneKey } from '../game/sceneKeys';
import { createSessionRepository, type SessionRepository } from '../persistence/sessionRepository';
import { createPracticeConfig, type PracticeConfig } from '../practice/practiceConfig';

import {
  createInitialSessionState,
  createDefaultPracticeSettings,
  exerciseIds,
  maxRecentSessionSummaries,
  normalizeReflection,
  normalizePhrase,
  type ExerciseId,
  type MovingBallPresetId,
  type PracticePhase,
  type PracticeRuntimeState,
  type PracticeSettings,
  type SessionRecord,
  type SessionState,
  type SessionSummary,
} from './types';

export type SessionStoreListener = (state: SessionState) => void;

const createSessionId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}`;
};

export class SessionStore {
  private state: SessionState;

  private readonly listeners = new Set<SessionStoreListener>();

  constructor(
    initialState: SessionState = createInitialSessionState(),
    private readonly sessionRepository: SessionRepository = createSessionRepository(),
  ) {
    this.state = {
      ...initialState,
      ...this.sessionRepository.loadState(),
    };
  }

  getState(): SessionState {
    return this.state;
  }

  getLatestSessionSummary(): SessionSummary | null {
    return this.state.recentSessionSummaries[0] ?? null;
  }

  setSelectedExercise(selectedExercise: ExerciseId): SessionState {
    return this.patchState({ selectedExercise });
  }

  subscribe(listener: SessionStoreListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  setPhrase(phrase: string): SessionState {
    return this.patchState({ phrase: normalizePhrase(phrase) });
  }

  updateSettings(settings: Partial<PracticeSettings>): SessionState {
    return this.patchState({
      settings: {
        ...this.state.settings,
        ...settings,
      },
    });
  }

  setLowIntensityMode(enabled: boolean): SessionState {
    return this.updateSettings({ lowIntensityMode: enabled });
  }

  setGazeGuidanceEnabled(enabled: boolean): SessionState {
    return this.updateSettings({ gazeGuidanceEnabled: enabled });
  }

  setMovingBallPreset(movingBallPresetId: MovingBallPresetId): SessionState {
    return this.updateSettings({ movingBallPresetId });
  }

  createPracticeConfig(): PracticeConfig {
    return createPracticeConfig(this.state);
  }

  startPractice(practiceConfig: PracticeConfig): SessionState {
    return this.patchState({
      practice: {
        phrase: practiceConfig.phrase,
        lowIntensityEnabled: practiceConfig.lowIntensity.enabled,
        gazeGuidanceEnabled: practiceConfig.gazeGuidance.enabled,
        phase: 'settle',
        phaseIndex: 0,
        secondsRemaining: practiceConfig.lowIntensity.settleSeconds,
        paused: false,
        stopped: false,
      },
    });
  }

  updatePractice(patch: Partial<PracticeRuntimeState>): SessionState {
    if (!this.state.practice) {
      return this.state;
    }

    return this.patchState({
      practice: {
        ...this.state.practice,
        ...patch,
      },
    });
  }

  setPracticePaused(paused: boolean): SessionState {
    return this.updatePractice({ paused });
  }

  setPracticePhase(phase: PracticePhase, phaseIndex: number, secondsRemaining: number): SessionState {
    return this.updatePractice({
      phase,
      phaseIndex,
      secondsRemaining,
    });
  }

  stopPractice(): SessionState {
    if (!this.state.practice) {
      return this.state;
    }

    return this.patchState({
      practice: {
        ...this.state.practice,
        paused: false,
        stopped: true,
      },
    });
  }

  clearPractice(): SessionState {
    return this.patchState({ practice: null });
  }

  startSession(sceneKey: SceneKey, startedAt = new Date().toISOString()): SessionState {
    const currentSession: SessionRecord = {
      id: createSessionId(),
      exerciseId: this.state.selectedExercise ?? exerciseIds.phraseAnchor,
      sceneKey,
      startedAt,
      completedAt: null,
      reflection: '',
    };

    return this.patchState({ currentSession });
  }

  updateCurrentScene(sceneKey: SceneKey): SessionState {
    if (!this.state.currentSession) {
      const canStartSession = sceneKey === sceneKeys.phrase
        || (this.state.selectedExercise === exerciseIds.movingBall && sceneKey === sceneKeys.instructions);

      if (!canStartSession) {
        return this.state;
      }

      return this.startSession(sceneKey);
    }

    const shouldRestartSession = this.state.currentSession.completedAt
      && (sceneKey === sceneKeys.phrase
        || (this.state.selectedExercise === exerciseIds.movingBall && sceneKey === sceneKeys.instructions));

    if (shouldRestartSession) {
      return this.startSession(sceneKey);
    }

    return this.patchState({
      currentSession: {
        ...this.state.currentSession,
        sceneKey,
      },
    });
  }

  completeSession(completedAt = new Date().toISOString()): SessionState {
    if (!this.state.currentSession) {
      return this.state;
    }

    const sessionSummary = this.createSessionSummary(completedAt);

    return this.patchState({
      currentSession: {
        ...this.state.currentSession,
        completedAt,
      },
      recentSessionSummaries: sessionSummary
        ? [sessionSummary, ...this.state.recentSessionSummaries.filter(({ id }) => id !== sessionSummary.id)]
          .slice(0, maxRecentSessionSummaries)
        : this.state.recentSessionSummaries,
    });
  }

  saveReflection(reflection: string): SessionState {
    if (!this.state.currentSession) {
      return this.state;
    }

    const nextReflection = normalizeReflection(reflection);

    return this.patchState({
      currentSession: {
        ...this.state.currentSession,
        reflection: nextReflection,
      },
      recentSessionSummaries: this.state.recentSessionSummaries.map((summary) => (
        summary.id === this.state.currentSession?.id
          ? { ...summary, reflection: nextReflection }
          : summary
      )),
    });
  }

  prepareForNextSession(): SessionState {
    return this.patchState({
      currentSession: null,
      practice: null,
    });
  }

  reset(): SessionState {
    return this.patchState({
      selectedExercise: exerciseIds.phraseAnchor,
      phrase: '',
      settings: createDefaultPracticeSettings(),
      currentSession: null,
      practice: null,
      recentSessionSummaries: [],
    });
  }

  private createSessionSummary(completedAt: string): SessionSummary | null {
    if (!this.state.currentSession) {
      return null;
    }

    const { currentSession, practice } = this.state;
    const phrase = currentSession.exerciseId === exerciseIds.movingBall
      ? ''
      : normalizePhrase(practice?.phrase ?? this.state.phrase);
    const startedAtMs = Date.parse(currentSession.startedAt);
    const completedAtMs = Date.parse(completedAt);
    const durationSeconds = Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs) && completedAtMs >= startedAtMs
      ? Math.round((completedAtMs - startedAtMs) / 1000)
      : null;

    return {
      id: currentSession.id,
      exerciseId: currentSession.exerciseId,
      phrase,
      outcome: practice?.stopped ? 'stopped' : 'completed',
      sceneKey: currentSession.sceneKey,
      startedAt: currentSession.startedAt,
      completedAt,
      durationSeconds,
      reflection: currentSession.reflection,
    };
  }

  private patchState(patch: Partial<SessionState>): SessionState {
    this.state = {
      ...this.state,
      ...patch,
    };

    this.sessionRepository.saveState(this.state);

    for (const listener of this.listeners) {
      listener(this.state);
    }

    return this.state;
  }
}

export const createSessionStore = (
  initialState?: SessionState,
  sessionRepository?: SessionRepository,
): SessionStore => new SessionStore(initialState, sessionRepository);
