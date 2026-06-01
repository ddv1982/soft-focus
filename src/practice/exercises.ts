import type { SceneKey } from '../game/sceneKeys';
import { getSessionEntryMode, type SessionEntryModeDefinition } from '../state/sessionEntryMode';
import {
  type ExerciseId,
  exerciseIds,
  type SessionEntryModeId,
  sessionEntryModeIds,
} from '../state/types';

export const exercisePhaseIds = {
  maintenance: 'maintenance',
  reset: 'reset',
  integration: 'integration',
} as const;

export type ExercisePhaseId = (typeof exercisePhaseIds)[keyof typeof exercisePhaseIds];

export interface ExerciseDefinition {
  id: ExerciseId;
  phase: ExercisePhaseId;
  phaseLabel: string;
  phaseSummary: string;
  title: string;
  summary: string;
  sessionEntryModeId: SessionEntryModeId;
  requiresPhrase: boolean;
}

type ExerciseCatalogEntry = Omit<ExerciseDefinition, 'requiresPhrase'>;

const exerciseCatalogEntries: readonly ExerciseCatalogEntry[] = [
  {
    id: exerciseIds.breathingReset,
    phase: exercisePhaseIds.reset,
    phaseLabel: 'Reset',
    phaseSummary: 'Gentle guided practices for easing and re-settling through calm sensory rhythm.',
    title: 'Breathing reset',
    summary: 'A paced breathing reset with a softer visual rhythm and a lower-motion fallback.',
    sessionEntryModeId: sessionEntryModeIds.directPractice,
  },
  {
    id: exerciseIds.orienting,
    phase: exercisePhaseIds.reset,
    phaseLabel: 'Reset',
    phaseSummary: 'Gentle guided practices for easing and re-settling through calm sensory rhythm.',
    title: 'Orienting',
    summary: 'A guided scan that invites you to notice the wider space around you without rushing.',
    sessionEntryModeId: sessionEntryModeIds.directPractice,
  },
  {
    id: exerciseIds.phraseAnchor,
    phase: exercisePhaseIds.maintenance,
    phaseLabel: 'Maintenance',
    phaseSummary:
      'Steady practices you can return to regularly to keep attention and ease anchored.',
    title: 'Phrase anchor',
    summary: 'A steady phrase-based maintenance practice in the current Soft Focus core toolkit.',
    sessionEntryModeId: sessionEntryModeIds.phrasePrompted,
  },
  {
    id: exerciseIds.movingBall,
    phase: exercisePhaseIds.reset,
    phaseLabel: 'Reset',
    phaseSummary: 'Gentle guided practices for easing and re-settling through calm sensory rhythm.',
    title: 'Moving ball',
    summary:
      'A guided visual tracking reset and the current visual member of the Soft Focus reset toolkit.',
    sessionEntryModeId: sessionEntryModeIds.directPractice,
  },
  {
    id: exerciseIds.bilateralRhythm,
    phase: exercisePhaseIds.reset,
    phaseLabel: 'Reset',
    phaseSummary: 'Gentle guided practices for easing and re-settling through calm sensory rhythm.',
    title: 'Bilateral rhythm',
    summary:
      'An alternating left-right rhythm for a steadier reset with less visual travel than moving ball.',
    sessionEntryModeId: sessionEntryModeIds.directPractice,
  },
];

export const exerciseCatalog: readonly ExerciseDefinition[] = exerciseCatalogEntries.map(
  (exercise) => ({
    ...exercise,
    requiresPhrase: getSessionEntryMode(exercise.sessionEntryModeId).requiresPhrase,
  }),
);

export const upcomingResetTools = ['Bilateral tapping'] as const;

export const upcomingExercisePhases = [
  {
    id: exercisePhaseIds.integration,
    label: 'Integration / Reflection',
    summary:
      'This currently lives in the closing reflection step after each round, while the next Soft Focus reset tools will expand into tapping, orienting, and breathing-based practices.',
  },
] as const;

export const getExerciseDefinition = (exerciseId: ExerciseId): ExerciseDefinition =>
  exerciseCatalog.find((exercise) => exercise.id === exerciseId) ?? exerciseCatalog[0];

export const getExerciseSessionEntryModeId = (exerciseId: ExerciseId): SessionEntryModeId =>
  getExerciseDefinition(exerciseId).sessionEntryModeId;

export const getExerciseSessionEntryMode = (exerciseId: ExerciseId): SessionEntryModeDefinition =>
  getSessionEntryMode(getExerciseSessionEntryModeId(exerciseId));

export const exerciseRequiresPhrase = (exerciseId: ExerciseId): boolean =>
  getExerciseSessionEntryMode(exerciseId).requiresPhrase;

export const getExerciseStartScene = (exerciseId: ExerciseId): SceneKey =>
  getExerciseSessionEntryMode(exerciseId).startSceneKey;

export const getExerciseInstructionsBackScene = (exerciseId: ExerciseId): SceneKey =>
  getExerciseSessionEntryMode(exerciseId).instructionsBackSceneKey;
