import type { BreathingPresetId, ExerciseId, MovingBallPresetId, PracticeSettings, SessionState } from '../state/types';

import { defaultLowIntensityConfig } from './defaultPracticeConfig';
import { getExerciseDefinition } from './exercises';
import { buildPracticeFamilyConfig } from './practiceFamilies';

export type PracticePhaseKey = 'settle' | 'phrase' | 'recovery' | 'complete';

export interface PracticePhaseDefinition {
  key: Exclude<PracticePhaseKey, 'complete'>;
  label: string;
  copy: string;
  seconds: number;
  activatesStagePresenter: boolean;
}

export interface PracticeCopyConfig {
  instructionsSubtitle: string;
  instructionsSelectionLabel: string;
  expectationsTitle: string;
  completionNote: string;
  reflectionSubtitle: string;
  reflectionPrompt: string;
  reflectionHelper: string;
  reflectionPlaceholder: string;
}

export interface PracticeDisplayConfig {
  title: string;
  subtitle: string;
  phraseText: string;
  pausedOverlayCopy: string;
  completeCopy: string;
  statusLines: readonly string[];
}

export interface PracticeMovingBallConfig {
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
}

export interface PracticeBreathingConfig {
  enabled: boolean;
  presetId: BreathingPresetId;
  title: string;
  summary: string;
  activeCopy: string;
  availablePresets: readonly {
    id: BreathingPresetId;
    title: string;
    summary: string;
  }[];
  pattern: 'extended-exhale' | 'balanced' | 'box' | 'cyclic-sighing';
  inhaleMs: number;
  inhaleTopUpMs: number | null;
  holdAfterInhaleMs: number | null;
  exhaleMs: number;
  holdAfterExhaleMs: number | null;
}

export interface PracticeReducedMotionPolicy {
  title: string;
  description: string;
  cycleMultiplier: number;
  amplitudeScale: number;
}

export interface PracticeReducedMotionConfig {
  enabled: boolean;
  label: string;
  description: string;
  policy: PracticeReducedMotionPolicy;
}

export type PracticeAuxiliaryControl =
  | {
    kind: 'toggle';
    label: string;
    description: string;
  }
  | {
    kind: 'selector';
    label: string;
  }
  | {
    kind: 'info';
    label: string;
    description: string;
  };

export interface PracticeCapabilities {
  auxiliaryControl: PracticeAuxiliaryControl;
  reducedMotion: PracticeReducedMotionPolicy;
}

export type PracticeStagePresenterConfig =
  | {
    key: 'idle';
    reducedMotion: PracticeReducedMotionPolicy;
  }
  | {
    key: 'phrase-anchor';
    phrase: string;
    lowIntensity: boolean;
    reducedMotion: PracticeReducedMotionPolicy;
  }
  | {
    key: 'gaze-guidance';
    prompt: string;
    lowIntensity: boolean;
    reducedMotion: PracticeReducedMotionPolicy;
  }
  | {
    key: 'moving-ball';
    movingBall: PracticeMovingBallConfig;
    lowIntensity: boolean;
    reducedMotion: PracticeReducedMotionPolicy;
  }
  | {
    key: 'breathing-reset';
    pattern: PracticeBreathingConfig['pattern'];
    inhaleMs: number;
    inhaleTopUpMs: number | null;
    holdAfterInhaleMs: number | null;
    exhaleMs: number;
    holdAfterExhaleMs: number | null;
    lowIntensity: boolean;
    reducedMotion: PracticeReducedMotionPolicy;
  }
  | {
    key: 'bilateral-rhythm';
    cycleMs: number;
    lowIntensity: boolean;
    reducedMotion: PracticeReducedMotionPolicy;
  }
  | {
    key: 'orienting';
    cycleMs: number;
    lowIntensity: boolean;
    reducedMotion: PracticeReducedMotionPolicy;
  };

export interface PracticeLowIntensityConfig {
  enabled: boolean;
  label: string;
  description: string;
  settleSeconds: number;
  practiceSeconds: number;
  recoverySeconds: number;
}

export interface PracticeFamilyConfig {
  expectations: readonly string[];
  gazeGuidance: {
    enabled: boolean;
    label: string;
    description: string;
    prompt: string | null;
  };
  movingBall: PracticeMovingBallConfig | null;
  breathingReset: PracticeBreathingConfig | null;
  copy: PracticeCopyConfig;
  phases: readonly PracticePhaseDefinition[];
  stagePresenter: PracticeStagePresenterConfig;
  display: PracticeDisplayConfig;
  capabilities: PracticeCapabilities;
  reducedMotion: PracticeReducedMotionConfig;
}

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
  lowIntensity: PracticeLowIntensityConfig;
  gazeGuidance: {
    enabled: boolean;
    label: string;
    description: string;
    prompt: string | null;
  };
  movingBall: PracticeMovingBallConfig | null;
  breathingReset: PracticeBreathingConfig | null;
  copy: PracticeCopyConfig;
  phases: readonly PracticePhaseDefinition[];
  stagePresenter: PracticeStagePresenterConfig;
  display: PracticeDisplayConfig;
  capabilities: PracticeCapabilities;
  reducedMotion: PracticeReducedMotionConfig;
}

export const createPracticeConfig = ({ selectedExercise, phrase, settings }: Pick<SessionState, 'selectedExercise' | 'phrase' | 'settings'>): PracticeConfig => {
  const exercise = getExerciseDefinition(selectedExercise);
  const lowIntensity: PracticeLowIntensityConfig = {
    ...defaultLowIntensityConfig,
    enabled: settings.lowIntensityMode,
  };
  const familyConfig = buildPracticeFamilyConfig({
    exercise,
    phrase,
    lowIntensity,
    settings,
  });

  return {
    exercise,
    phrase,
    expectations: familyConfig.expectations,
    lowIntensity,
    gazeGuidance: familyConfig.gazeGuidance,
    movingBall: familyConfig.movingBall,
    breathingReset: familyConfig.breathingReset,
    copy: familyConfig.copy,
    phases: familyConfig.phases,
    stagePresenter: familyConfig.stagePresenter,
    display: familyConfig.display,
    capabilities: familyConfig.capabilities,
    reducedMotion: familyConfig.reducedMotion,
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
