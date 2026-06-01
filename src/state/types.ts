import type { SceneKey } from '../game/sceneKeys';

export const exerciseIds = {
  phraseAnchor: 'phrase-anchor',
  movingBall: 'moving-ball',
  breathingReset: 'breathing-reset',
  bilateralRhythm: 'bilateral-rhythm',
  orienting: 'orienting',
} as const;

export type ExerciseId = (typeof exerciseIds)[keyof typeof exerciseIds];

export const sessionEntryModeIds = {
  phrasePrompted: 'phrase-prompted',
  directPractice: 'direct-practice',
} as const;

export type SessionEntryModeId = (typeof sessionEntryModeIds)[keyof typeof sessionEntryModeIds];

export const movingBallPresetIds = {
  steadyCenter: 'steady-center-sweep',
  multiHeight: 'multi-height-sweep',
  settlingSteps: 'settling-step-sweep',
} as const;

export type MovingBallPresetId = (typeof movingBallPresetIds)[keyof typeof movingBallPresetIds];

export const breathingPresetIds = {
  gentleExhale: 'gentle-exhale-3-4',
  longExhale: 'long-exhale-4-6',
  coherent: 'coherent-5-5',
  box: 'box-4-4-4-4',
  cyclicSighing: 'cyclic-sighing-2-1-6',
  custom: 'custom',
} as const;

export type BreathingPresetId = (typeof breathingPresetIds)[keyof typeof breathingPresetIds];

export const practiceDurationPresetIds = {
  brief: 'brief-60',
  standard: 'standard-90',
  extended: 'extended-180',
  custom: 'custom',
} as const;

export type PracticeDurationPresetId =
  (typeof practiceDurationPresetIds)[keyof typeof practiceDurationPresetIds];

export const ambientAudioPresetIds = {
  openHorizon: 'open-horizon',
  emberDrift: 'ember-drift',
  clearBells: 'clear-bells',
} as const;

export type AmbientAudioPresetId =
  (typeof ambientAudioPresetIds)[keyof typeof ambientAudioPresetIds];

export const ambientAudioPresetOrder = [
  ambientAudioPresetIds.openHorizon,
  ambientAudioPresetIds.emberDrift,
  ambientAudioPresetIds.clearBells,
] as const satisfies readonly AmbientAudioPresetId[];

export const isExerciseId = (value: string): value is ExerciseId =>
  (Object.values(exerciseIds) as readonly string[]).includes(value);

export const isSessionEntryModeId = (value: string): value is SessionEntryModeId =>
  (Object.values(sessionEntryModeIds) as readonly string[]).includes(value);

export const isMovingBallPresetId = (value: string): value is MovingBallPresetId =>
  (Object.values(movingBallPresetIds) as readonly string[]).includes(value);

export const isBreathingPresetId = (value: string): value is BreathingPresetId =>
  (Object.values(breathingPresetIds) as readonly string[]).includes(value);

export const isPracticeDurationPresetId = (value: string): value is PracticeDurationPresetId =>
  (Object.values(practiceDurationPresetIds) as readonly string[]).includes(value);

export const isAmbientAudioPresetId = (value: string): value is AmbientAudioPresetId =>
  (ambientAudioPresetOrder as readonly string[]).includes(value);

export interface PracticeSettings {
  lowIntensityMode: boolean;
  reducedMotionEnabled: boolean;
  gazeGuidanceEnabled: boolean;
  ambientAudioEnabled: boolean;
  ambientAudioVolume: number;
  ambientAudioPresetId: AmbientAudioPresetId;
  practiceDurationPresetId: PracticeDurationPresetId;
  customPracticeDurationMinutes: number;
  movingBallPresetId: MovingBallPresetId;
  breathingPresetId: BreathingPresetId;
  customBreathingInhaleSeconds: number;
  customBreathingHoldSeconds: number;
  customBreathingExhaleSeconds: number;
}

export interface SessionRecord {
  id: string;
  exerciseId: ExerciseId;
  sessionEntryModeId: SessionEntryModeId;
  sceneKey: SceneKey;
  startedAt: string;
  completedAt: string | null;
  reflection: string;
}

export type SessionOutcome = 'completed' | 'stopped';

export interface SessionSummary {
  id: string;
  exerciseId: ExerciseId;
  sessionEntryModeId: SessionEntryModeId;
  phrase: string;
  outcome: SessionOutcome;
  sceneKey: SceneKey;
  startedAt: string;
  completedAt: string;
  durationSeconds: number | null;
  reflection: string;
}

export type PracticePhase = 'settle' | 'phrase' | 'recovery' | 'complete';

export interface PracticeRuntimeState {
  phrase: string;
  lowIntensityEnabled: boolean;
  reducedMotionEnabled: boolean;
  gazeGuidanceEnabled: boolean;
  phase: PracticePhase;
  phaseIndex: number;
  secondsRemaining: number;
  paused: boolean;
  stopped: boolean;
}

export interface SessionState {
  selectedExercise: ExerciseId;
  phrase: string;
  settings: PracticeSettings;
  currentSession: SessionRecord | null;
  practice: PracticeRuntimeState | null;
  recentSessionSummaries: SessionSummary[];
}

export const phraseMinLength = 2;

export const phraseMaxLength = 80;

export const reflectionMaxLength = 240;

export const maxRecentSessionSummaries = 5;

export const customPracticeDurationBounds = {
  minMinutes: 1,
  maxMinutes: 30,
  defaultMinutes: 5,
} as const;

export const customBreathingTimingBounds = {
  minSeconds: 1,
  maxSeconds: 12,
  defaultInhaleSeconds: 4,
  defaultHoldSeconds: 2,
  defaultExhaleSeconds: 6,
} as const;

export const ambientAudioVolumeBounds = {
  min: 0,
  max: 100,
  defaultValue: 40,
} as const;

export const normalizePhrase = (phrase: string): string => phrase.trim().replace(/\s+/g, ' ');

export const normalizeReflection = (reflection: string): string =>
  reflection.replace(/\r\n?/g, '\n').trim().slice(0, reflectionMaxLength);

export const isValidPhrase = (phrase: string): boolean => {
  const normalizedPhrase = normalizePhrase(phrase);

  return normalizedPhrase.length >= phraseMinLength && normalizedPhrase.length <= phraseMaxLength;
};

export const sanitizeCustomPracticeDurationMinutes = (minutes: unknown): number => {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    return customPracticeDurationBounds.defaultMinutes;
  }

  return Math.min(
    customPracticeDurationBounds.maxMinutes,
    Math.max(customPracticeDurationBounds.minMinutes, Math.round(minutes)),
  );
};

export const sanitizeCustomBreathingSeconds = (
  seconds: unknown,
  fallbackSeconds: number,
): number => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return fallbackSeconds;
  }

  return Math.min(
    customBreathingTimingBounds.maxSeconds,
    Math.max(customBreathingTimingBounds.minSeconds, Math.round(seconds)),
  );
};

export const sanitizeAmbientAudioVolume = (volume: unknown): number => {
  if (typeof volume !== 'number' || !Number.isFinite(volume)) {
    return ambientAudioVolumeBounds.defaultValue;
  }

  return Math.min(
    ambientAudioVolumeBounds.max,
    Math.max(ambientAudioVolumeBounds.min, Math.round(volume)),
  );
};

export const defaultPracticeSettings = (): PracticeSettings => ({
  lowIntensityMode: true,
  reducedMotionEnabled: false,
  gazeGuidanceEnabled: false,
  ambientAudioEnabled: false,
  ambientAudioVolume: ambientAudioVolumeBounds.defaultValue,
  ambientAudioPresetId: ambientAudioPresetIds.openHorizon,
  practiceDurationPresetId: practiceDurationPresetIds.standard,
  customPracticeDurationMinutes: customPracticeDurationBounds.defaultMinutes,
  movingBallPresetId: movingBallPresetIds.steadyCenter,
  breathingPresetId: breathingPresetIds.longExhale,
  customBreathingInhaleSeconds: customBreathingTimingBounds.defaultInhaleSeconds,
  customBreathingHoldSeconds: customBreathingTimingBounds.defaultHoldSeconds,
  customBreathingExhaleSeconds: customBreathingTimingBounds.defaultExhaleSeconds,
});

export const createDefaultPracticeSettings = (): PracticeSettings => defaultPracticeSettings();

export const createInitialSessionState = (): SessionState => ({
  selectedExercise: exerciseIds.phraseAnchor,
  phrase: '',
  settings: defaultPracticeSettings(),
  currentSession: null,
  practice: null,
  recentSessionSummaries: [],
});
