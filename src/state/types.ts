import type { SceneKey } from '../game/sceneKeys';

export const exerciseIds = {
  phraseAnchor: 'phrase-anchor',
  movingBall: 'moving-ball',
  breathingReset: 'breathing-reset',
  bilateralRhythm: 'bilateral-rhythm',
  orienting: 'orienting',
} as const;

export type ExerciseId = (typeof exerciseIds)[keyof typeof exerciseIds];

export const sessionFlowIds = {
  phrasePrompted: 'phrase-prompted',
  directPractice: 'direct-practice',
} as const;

export type SessionFlowId = (typeof sessionFlowIds)[keyof typeof sessionFlowIds];

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
} as const;

export type BreathingPresetId = (typeof breathingPresetIds)[keyof typeof breathingPresetIds];

export const isExerciseId = (value: string): value is ExerciseId => (
  Object.values(exerciseIds) as readonly string[]
).includes(value);

export const isSessionFlowId = (value: string): value is SessionFlowId => (
  Object.values(sessionFlowIds) as readonly string[]
).includes(value);

export const getSessionFlowIdForExercise = (exerciseId: ExerciseId): SessionFlowId => (
  exerciseId === exerciseIds.phraseAnchor ? sessionFlowIds.phrasePrompted : sessionFlowIds.directPractice
);

export const isMovingBallPresetId = (value: string): value is MovingBallPresetId => (
  Object.values(movingBallPresetIds) as readonly string[]
).includes(value);

export const isBreathingPresetId = (value: string): value is BreathingPresetId => (
  Object.values(breathingPresetIds) as readonly string[]
).includes(value);

export interface PracticeSettings {
  lowIntensityMode: boolean;
  reducedMotionEnabled: boolean;
  gazeGuidanceEnabled: boolean;
  movingBallPresetId: MovingBallPresetId;
  breathingPresetId: BreathingPresetId;
}

export interface SessionRecord {
  id: string;
  exerciseId: ExerciseId;
  flowId: SessionFlowId;
  sceneKey: SceneKey;
  startedAt: string;
  completedAt: string | null;
  reflection: string;
}

export type SessionOutcome = 'completed' | 'stopped';

export interface SessionSummary {
  id: string;
  exerciseId: ExerciseId;
  flowId: SessionFlowId;
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

export const normalizePhrase = (phrase: string): string => phrase.trim().replace(/\s+/g, ' ');

export const normalizeReflection = (reflection: string): string => reflection
  .replace(/\r\n?/g, '\n')
  .trim()
  .slice(0, reflectionMaxLength);

export const isValidPhrase = (phrase: string): boolean => {
  const normalizedPhrase = normalizePhrase(phrase);

  return normalizedPhrase.length >= phraseMinLength && normalizedPhrase.length <= phraseMaxLength;
};

export const defaultPracticeSettings = (): PracticeSettings => ({
  lowIntensityMode: true,
  reducedMotionEnabled: false,
  gazeGuidanceEnabled: false,
  movingBallPresetId: movingBallPresetIds.steadyCenter,
  breathingPresetId: breathingPresetIds.longExhale,
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
