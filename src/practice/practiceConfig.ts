import type { ExerciseId, MovingBallPresetId, PracticeSettings, SessionState } from '../state/types';
import { exerciseIds } from '../state/types';

import { getExerciseDefinition } from './exercises';
import {
  defaultGazeGuidanceConfig,
  defaultLowIntensityConfig,
  defaultMovingBallExpectations,
  defaultPhrasePracticeExpectations,
  getMovingBallPresetDefinition,
  movingBallPresetCatalog,
} from './defaultPracticeConfig';

export interface PracticeConfig {
  exercise: {
    id: ExerciseId;
    phase: string;
    phaseLabel: string;
    phaseSummary: string;
    title: string;
    summary: string;
    requiresPhrase: boolean;
  };
  phrase: string;
  expectations: readonly string[];
  lowIntensity: {
    enabled: boolean;
    label: string;
    description: string;
    settleSeconds: number;
    practiceSeconds: number;
    recoverySeconds: number;
  };
  gazeGuidance: {
    enabled: boolean;
    label: string;
    description: string;
    prompt: string | null;
  };
  movingBall: {
    enabled: boolean;
    presetId: MovingBallPresetId;
    title: string;
    summary: string;
    activeCopy: string;
    availablePresets: readonly {
      id: MovingBallPresetId;
      title: string;
      summary: string;
    }[];
    pattern: string;
    laneHeights: readonly number[];
    cycleMs: number;
    laneBandHeight: number;
    radius: number;
  } | null;
  copy: {
    instructionsSubtitle: string;
    instructionsSelectionLabel: string;
    expectationsTitle: string;
    completionNote: string;
    reflectionSubtitle: string;
    reflectionPrompt: string;
    reflectionHelper: string;
    reflectionPlaceholder: string;
  };
}

export const createPracticeConfig = ({ selectedExercise, phrase, settings }: Pick<SessionState, 'selectedExercise' | 'phrase' | 'settings'>): PracticeConfig => {
  const exercise = getExerciseDefinition(selectedExercise);
  const lowIntensity = {
    ...defaultLowIntensityConfig,
    enabled: settings.lowIntensityMode,
  };

  if (selectedExercise === exerciseIds.movingBall) {
    const movingBallPreset = getMovingBallPresetDefinition(settings.movingBallPresetId);

    return {
      exercise,
      phrase,
      expectations: defaultMovingBallExpectations,
      lowIntensity,
      gazeGuidance: {
        ...defaultGazeGuidanceConfig,
        enabled: settings.gazeGuidanceEnabled,
        prompt: null,
      },
      movingBall: {
        enabled: true,
        presetId: movingBallPreset.id,
        title: movingBallPreset.title,
        summary: movingBallPreset.summary,
        activeCopy: movingBallPreset.activeCopy,
        availablePresets: movingBallPresetCatalog.map(({ id, title, summary }) => ({ id, title, summary })),
        pattern: movingBallPreset.pattern,
        laneHeights: movingBallPreset.laneHeights,
        cycleMs: settings.lowIntensityMode ? movingBallPreset.lowIntensityCycleMs : movingBallPreset.cycleMs,
        laneBandHeight: movingBallPreset.laneBandHeight,
        radius: movingBallPreset.radius,
      },
      copy: {
        instructionsSubtitle: 'Keep the pace gentle, choose the visual reset preset that feels easiest to settle into today, and begin when your eyes feel easy.',
        instructionsSelectionLabel: 'Selected reset practice',
        expectationsTitle: 'What to expect in this reset round',
        completionNote: 'Continue when you are ready to note what helped you settle or reset.',
        reflectionSubtitle: 'Use this integration moment to notice what softened, settled, or became easier. A short note is enough.',
        reflectionPrompt: 'What helped you settle, reset, or feel more ease this round?',
        reflectionHelper: 'Optional. A few calm words about what softened or settled is enough.',
        reflectionPlaceholder: 'A settling note for next time',
      },
    };
  }

  return {
    exercise,
    phrase,
    expectations: defaultPhrasePracticeExpectations,
    lowIntensity,
    gazeGuidance: {
      ...defaultGazeGuidanceConfig,
      enabled: settings.gazeGuidanceEnabled,
      prompt: settings.gazeGuidanceEnabled ? defaultGazeGuidanceConfig.prompt : null,
    },
    movingBall: null,
    copy: {
        instructionsSubtitle: 'Confirm the phrase, settle into a steady maintenance round, and use it as one of the current Soft Focus core practices.',
      instructionsSelectionLabel: 'Practice phrase',
      expectationsTitle: 'What to expect in this maintenance round',
      completionNote: 'Continue when you are ready to note what feels worth carrying forward.',
      reflectionSubtitle: 'Use this integration moment to notice what felt steady enough to carry forward. A short note is enough.',
      reflectionPrompt: 'What feels worth carrying into the next maintenance round?',
      reflectionHelper: 'Optional. A few calm words about what felt steady is enough.',
      reflectionPlaceholder: 'A steady note for next time',
    },
  };
};

export const createPracticeConfigFromSettings = (
  selectedExercise: ExerciseId,
  phrase: string,
  settings: PracticeSettings,
): PracticeConfig => createPracticeConfig({
  selectedExercise,
  phrase,
  settings,
});
