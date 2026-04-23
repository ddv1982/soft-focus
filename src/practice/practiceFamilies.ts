import type { PracticeSettings } from '../state/types';

import type { ExerciseDefinition } from './exercises';
import {
  breathingPresetCatalog,
  defaultBilateralRhythmExpectations,
  defaultBreathingResetExpectations,
  defaultGazeGuidanceConfig,
  defaultMovingBallExpectations,
  defaultOrientingExpectations,
  defaultPhrasePracticeExpectations,
  getBreathingPresetDefinition,
  getMovingBallPresetDefinition,
  movingBallPresetCatalog,
} from './defaultPracticeConfig';
import type {
  PracticeAuxiliaryControl,
  PracticeBreathingConfig,
  PracticeCapabilities,
  PracticeConfig,
  PracticeCopyConfig,
  PracticeDisplayConfig,
  PracticeFamilyConfig,
  PracticeLowIntensityConfig,
  PracticeReducedMotionConfig,
  PracticeReducedMotionPolicy,
} from './practiceConfig';

interface PracticeFamilyBuilderInput {
  exercise: ExerciseDefinition;
  phrase: string;
  lowIntensity: PracticeLowIntensityConfig;
  settings: PracticeSettings;
}

const reducedMotionLabel = 'Reduced motion';

const createSharedCopy = (copy: PracticeCopyConfig): PracticeCopyConfig => ({
  ...copy,
});

const createCapabilities = (
  auxiliaryControl: PracticeAuxiliaryControl,
  reducedMotion: PracticeReducedMotionPolicy,
): PracticeCapabilities => ({
  auxiliaryControl,
  reducedMotion,
});

const createReducedMotionPolicy = ({
  title,
  description,
  cycleMultiplier,
  amplitudeScale,
}: PracticeReducedMotionPolicy): PracticeReducedMotionPolicy => ({
  title,
  description,
  cycleMultiplier,
  amplitudeScale,
});

const createReducedMotionConfig = (
  enabled: boolean,
  policy: PracticeReducedMotionPolicy,
): PracticeReducedMotionConfig => ({
  enabled,
  label: reducedMotionLabel,
  description: policy.description,
  policy,
});

const createPhraseAnchorFamilyConfig = ({
  exercise,
  phrase,
  lowIntensity,
  settings,
}: PracticeFamilyBuilderInput): PracticeFamilyConfig => {
  const gazePrompt = settings.gazeGuidanceEnabled ? defaultGazeGuidanceConfig.prompt : null;
  const reducedMotion = createReducedMotionPolicy({
    title: 'Steadier phrase guidance',
    description: settings.reducedMotionEnabled || lowIntensity.enabled
      ? 'Reduced motion keeps the phrase practice steadier and removes the breathing pulse motion.'
      : 'Phrase practice uses a slow breathing halo so the phrase can ride an easy breath.',
    cycleMultiplier: 1,
    amplitudeScale: settings.reducedMotionEnabled || lowIntensity.enabled ? 0 : 1,
  });
  const display: PracticeDisplayConfig = {
    title: exercise.title,
    subtitle: 'Stay with a calm pace. You can pause, resume, or stop without losing control of the session.',
    phraseText: phrase,
    pausedOverlayCopy: 'Resume when the phrase feels easy to return to.',
    completeCopy: 'This round is complete.',
    statusLines: [
      `${exercise.phaseLabel} • ${exercise.title}`,
      `${exercise.requiresPhrase && phrase ? `Phrase: "${phrase}" • ` : ''}Low intensity: ${lowIntensity.enabled ? 'On' : 'Off'} • Reduced motion: ${settings.reducedMotionEnabled ? 'On' : 'Off'} • Gaze guidance: ${settings.gazeGuidanceEnabled ? 'On' : 'Off'}`,
    ],
  };

  return {
    expectations: defaultPhrasePracticeExpectations,
    gazeGuidance: {
      ...defaultGazeGuidanceConfig,
      enabled: settings.gazeGuidanceEnabled,
      prompt: gazePrompt,
    },
    movingBall: null,
    breathingReset: null,
    copy: createSharedCopy({
      instructionsSubtitle: 'Choose a phrase that is easy to repeat. During practice, let it ride a relaxed breath, notice wandering, and return softly.',
      instructionsSelectionLabel: 'Practice phrase',
      expectationsTitle: 'What to expect in this maintenance round',
      completionNote: 'Continue when you are ready to note what helped you return without forcing it.',
      reflectionSubtitle: 'Use this integration moment to notice what helped you come back to the phrase. A short note is enough.',
      reflectionPrompt: 'What helped you notice, return, or soften around the phrase?',
      reflectionHelper: 'Optional. A few calm words about what felt steady is enough.',
      reflectionPlaceholder: 'A steady note for next time',
    }),
    phases: [
      {
        key: 'settle',
        label: 'Settle',
        copy: 'Let your attention settle before the phrase begins. Feel one easy point of contact with the chair, floor, or breath.',
        seconds: lowIntensity.settleSeconds,
        activatesStagePresenter: false,
      },
      {
        key: 'phrase',
        label: 'Phrase practice',
        copy: settings.gazeGuidanceEnabled
          ? 'Notice wandering, return to the phrase softly, and keep the eyes easy.'
          : 'Repeat the phrase lightly with an easy breath. Notice wandering, return, and soften the effort.',
        seconds: lowIntensity.practiceSeconds,
        activatesStagePresenter: true,
      },
      {
        key: 'recovery',
        label: 'Recovery',
        copy: 'Ease off fully for a moment and let the practice fade into stillness.',
        seconds: lowIntensity.recoverySeconds,
        activatesStagePresenter: false,
      },
    ],
    stagePresenter: settings.gazeGuidanceEnabled && gazePrompt
      ? {
        key: 'gaze-guidance',
        prompt: gazePrompt,
        lowIntensity: lowIntensity.enabled,
        reducedMotion,
      }
      : {
        key: 'phrase-anchor',
        phrase,
        lowIntensity: lowIntensity.enabled,
        reducedMotion,
      },
    display,
    capabilities: createCapabilities({
      kind: 'toggle',
      label: defaultGazeGuidanceConfig.label,
      description: defaultGazeGuidanceConfig.description,
    }, reducedMotion),
    reducedMotion: createReducedMotionConfig(settings.reducedMotionEnabled, reducedMotion),
  };
};

const createMovingBallFamilyConfig = ({
  exercise,
  phrase,
  lowIntensity,
  settings,
}: PracticeFamilyBuilderInput): PracticeFamilyConfig => {
  const reducedMotion = createReducedMotionPolicy({
    title: 'Softer sweep motion',
    description: 'Reduced motion slows the sweep and shortens the travel so the motion feels easier to follow.',
    cycleMultiplier: settings.reducedMotionEnabled ? 1.35 : 1,
    amplitudeScale: settings.reducedMotionEnabled ? 0.78 : 1,
  });
  const movingBallPreset = getMovingBallPresetDefinition(settings.movingBallPresetId);
  const movingBall: NonNullable<PracticeConfig['movingBall']> = {
    enabled: true,
    presetId: movingBallPreset.id,
    title: movingBallPreset.title,
    summary: movingBallPreset.summary,
    activeCopy: movingBallPreset.activeCopy,
    availablePresets: movingBallPresetCatalog.map(({ id, title, summary }) => ({ id, title, summary })),
    pattern: movingBallPreset.pattern,
    laneHeights: movingBallPreset.laneHeights,
    cycleMs: movingBallPreset.cycleMs,
    laneBandHeight: movingBallPreset.laneBandHeight,
    radius: movingBallPreset.radius,
  };

  const display: PracticeDisplayConfig = {
    title: exercise.title,
    subtitle: 'Stay with a calm pace. You can pause, resume, or stop without losing control of the session.',
    phraseText: movingBallPreset.title,
    pausedOverlayCopy: `Resume when the ${movingBallPreset.title.toLowerCase()} feels easy to follow again.`,
    completeCopy: 'This round is complete.',
    statusLines: [
      `${exercise.phaseLabel} • ${exercise.title}`,
      `Preset: ${movingBallPreset.title} • Low intensity: ${lowIntensity.enabled ? 'On' : 'Off'} • Reduced motion: ${settings.reducedMotionEnabled ? 'On' : 'Off'}`,
    ],
  };

  void phrase;

  return {
    expectations: defaultMovingBallExpectations,
    gazeGuidance: {
      ...defaultGazeGuidanceConfig,
      enabled: settings.gazeGuidanceEnabled,
      prompt: null,
    },
    movingBall,
    breathingReset: null,
    copy: createSharedCopy({
      instructionsSubtitle: 'Keep the pace gentle, choose the visual reset preset that feels easiest to settle into today, and begin when your eyes feel easy.',
      instructionsSelectionLabel: 'Selected reset practice',
      expectationsTitle: 'What to expect in this reset round',
      completionNote: 'Continue when you are ready to note what helped you settle or reset.',
      reflectionSubtitle: 'Use this integration moment to notice what softened, settled, or became easier. A short note is enough.',
      reflectionPrompt: 'What helped you settle, reset, or feel more ease this round?',
      reflectionHelper: 'Optional. A few calm words about what softened or settled is enough.',
      reflectionPlaceholder: 'A settling note for next time',
    }),
    phases: [
      {
        key: 'settle',
        label: 'Settle',
        copy: 'Let your attention settle before the first sweep begins. Keep the effort light.',
        seconds: lowIntensity.settleSeconds,
        activatesStagePresenter: false,
      },
      {
        key: 'phrase',
        label: 'Guided sweep',
        copy: movingBallPreset.activeCopy,
        seconds: lowIntensity.practiceSeconds,
        activatesStagePresenter: true,
      },
      {
        key: 'recovery',
        label: 'Recovery',
        copy: 'Ease off fully for a moment and let the practice fade into stillness.',
        seconds: lowIntensity.recoverySeconds,
        activatesStagePresenter: false,
      },
    ],
    stagePresenter: {
      key: 'moving-ball',
      movingBall,
      lowIntensity: lowIntensity.enabled,
      reducedMotion,
    },
    display,
    capabilities: createCapabilities({
      kind: 'selector',
      label: 'Sweep preset',
    }, reducedMotion),
    reducedMotion: createReducedMotionConfig(settings.reducedMotionEnabled, reducedMotion),
  };
};

const createBreathingResetFamilyConfig = ({
  exercise,
  phrase,
  lowIntensity,
  settings,
}: PracticeFamilyBuilderInput): PracticeFamilyConfig => {
  const breathingPreset = getBreathingPresetDefinition(settings.breathingPresetId);
  const {
    inhaleMs,
    inhaleTopUpMs,
    holdAfterInhaleMs,
    exhaleMs,
    holdAfterExhaleMs,
  } = breathingPreset;
  const cadenceLabel = breathingPreset.pattern === 'box'
    ? `${Math.round(inhaleMs / 1000)} in / ${Math.round((holdAfterInhaleMs ?? 0) / 1000)} hold / ${Math.round(exhaleMs / 1000)} out / ${Math.round((holdAfterExhaleMs ?? 0) / 1000)} hold`
    : breathingPreset.pattern === 'cyclic-sighing'
      ? `${Math.round(inhaleMs / 1000)} in / ${Math.round((inhaleTopUpMs ?? 0) / 1000)} top-up / ${Math.round(exhaleMs / 1000)} out`
      : `${Math.round(inhaleMs / 1000)} in / ${Math.round(exhaleMs / 1000)} out`;
  const breathingReset: PracticeBreathingConfig = {
    enabled: true,
    presetId: breathingPreset.id,
    title: breathingPreset.title,
    summary: breathingPreset.summary,
    activeCopy: breathingPreset.activeCopy,
    availablePresets: breathingPresetCatalog.map(({ id, title, summary }) => ({ id, title, summary })),
    pattern: breathingPreset.pattern,
    inhaleMs: breathingPreset.inhaleMs,
    inhaleTopUpMs: breathingPreset.inhaleTopUpMs,
    holdAfterInhaleMs: breathingPreset.holdAfterInhaleMs,
    exhaleMs: breathingPreset.exhaleMs,
    holdAfterExhaleMs: breathingPreset.holdAfterExhaleMs,
  };
  const reducedMotion = createReducedMotionPolicy({
    title: 'Softer breathing pulse',
    description: 'Reduced motion keeps the visual cue smaller and only slightly slower so the breath pattern stays recognizable.',
    cycleMultiplier: settings.reducedMotionEnabled ? 1.06 : 1,
    amplitudeScale: settings.reducedMotionEnabled ? 0.84 : 1,
  });
  const display: PracticeDisplayConfig = {
    title: exercise.title,
    subtitle: 'Stay with a calm pace. You can pause, resume, or stop without losing control of the session.',
    phraseText: `${breathingPreset.title} (${cadenceLabel})`,
    pausedOverlayCopy: 'Resume when the breathing rhythm feels easy to follow again.',
    completeCopy: 'This round is complete.',
    statusLines: [
      `${exercise.phaseLabel} • ${exercise.title}`,
      `Breath cue: ${breathingPreset.title} • ${cadenceLabel} • Low intensity: ${lowIntensity.enabled ? 'On' : 'Off'} • Reduced motion: ${settings.reducedMotionEnabled ? 'On' : 'Off'}`,
    ],
  };

  void phrase;

  return {
    expectations: defaultBreathingResetExpectations,
    gazeGuidance: {
      ...defaultGazeGuidanceConfig,
      enabled: false,
      prompt: null,
    },
    movingBall: null,
    breathingReset,
    copy: createSharedCopy({
      instructionsSubtitle: breathingPreset.pattern === 'balanced'
        ? `Let the breath stay natural, follow the balanced ${cadenceLabel} pace, and keep both phases easy instead of trying to take a bigger breath.`
        : breathingPreset.pattern === 'box'
          ? `Let the breath stay natural, follow the equal ${cadenceLabel} pace, and keep the holds gentle enough that they do not feel strained.`
          : breathingPreset.pattern === 'cyclic-sighing'
            ? `Let the breath stay natural, follow the ${cadenceLabel} pattern, and keep the second inhale small before a long, easy exhale.`
        : `Let the breath stay natural, follow the ${cadenceLabel} visual pace, and keep the breath smaller instead of deeper if you need less effort.`,
      instructionsSelectionLabel: 'Selected reset practice',
      expectationsTitle: 'What to expect in this reset round',
      completionNote: 'Continue when you are ready to note what helped the inhale stay easy or the exhale stay softer.',
      reflectionSubtitle: 'Use this integration moment to notice what softened or steadied in your breathing. A short note is enough.',
      reflectionPrompt: 'What helped your breathing stay easy or let the exhale soften this round?',
      reflectionHelper: 'Optional. A few calm words about what kept the breath easy is enough.',
      reflectionPlaceholder: 'A breathing note for next time',
    }),
    phases: [
      {
        key: 'settle',
        label: 'Settle',
        copy: 'Let your breathing settle before you follow the next gentle cycle.',
        seconds: lowIntensity.settleSeconds,
        activatesStagePresenter: false,
      },
      {
        key: 'phrase',
        label: 'Breathing rhythm',
        copy: breathingPreset.activeCopy,
        seconds: lowIntensity.practiceSeconds,
        activatesStagePresenter: true,
      },
      {
        key: 'recovery',
        label: 'Recovery',
        copy: 'Ease off fully for a moment and let your breathing find its own pace again.',
        seconds: lowIntensity.recoverySeconds,
        activatesStagePresenter: false,
      },
    ],
    stagePresenter: {
      key: 'breathing-reset',
      pattern: breathingPreset.pattern,
      inhaleMs,
      inhaleTopUpMs,
      holdAfterInhaleMs,
      exhaleMs,
      holdAfterExhaleMs,
      lowIntensity: lowIntensity.enabled,
      reducedMotion,
    },
    display,
    capabilities: createCapabilities({
      kind: 'info',
      label: 'Breathing rhythm',
      description: breathingPreset.pattern === 'balanced'
        ? `This reset uses a balanced ${cadenceLabel} rhythm. Keep the breath natural, avoid breath holds, and let both phases stay quiet and even.`
        : breathingPreset.pattern === 'box'
          ? `This reset uses a box-breathing rhythm of ${cadenceLabel}. Keep the holds gentle and shorten them if they start to feel effortful.`
          : breathingPreset.pattern === 'cyclic-sighing'
            ? `This reset uses a cyclic sighing rhythm of ${cadenceLabel}. Take a normal inhale, add a small top-up inhale, and let the long exhale soften without forcing it.`
        : `This reset uses a ${cadenceLabel} rhythm with a longer exhale. Keep the breath natural, avoid breath holds, and make it smaller instead of deeper if you start to strain.`,
    }, reducedMotion),
    reducedMotion: createReducedMotionConfig(settings.reducedMotionEnabled, reducedMotion),
  };
};

const createBilateralRhythmFamilyConfig = ({
  exercise,
  phrase,
  lowIntensity,
  settings,
}: PracticeFamilyBuilderInput): PracticeFamilyConfig => {
  const reducedMotion = createReducedMotionPolicy({
    title: 'Slower left-right rhythm',
    description: 'Reduced motion slows the alternation and shortens the travel so the left-right rhythm feels steadier.',
    cycleMultiplier: settings.reducedMotionEnabled ? 1.28 : 1,
    amplitudeScale: settings.reducedMotionEnabled ? 0.82 : 1,
  });
  const display: PracticeDisplayConfig = {
    title: exercise.title,
    subtitle: 'Stay with a calm pace. You can pause, resume, or stop without losing control of the session.',
    phraseText: 'Follow the alternating rhythm softly',
    pausedOverlayCopy: 'Resume when the alternating rhythm feels easy to follow again.',
    completeCopy: 'This round is complete.',
    statusLines: [
      `${exercise.phaseLabel} • ${exercise.title}`,
      `Low intensity: ${lowIntensity.enabled ? 'On' : 'Off'} • Reduced motion: ${settings.reducedMotionEnabled ? 'On' : 'Off'} • Gaze guidance: Off for bilateral rhythm`,
    ],
  };

  void phrase;

  return {
    expectations: defaultBilateralRhythmExpectations,
    gazeGuidance: {
      ...defaultGazeGuidanceConfig,
      enabled: false,
      prompt: null,
    },
    movingBall: null,
    breathingReset: null,
    copy: createSharedCopy({
      instructionsSubtitle: 'Follow a gentle visual left-right rhythm, or pair it with your own soft left-right tapping. This practice does not use sound.',
      instructionsSelectionLabel: 'Selected reset practice',
      expectationsTitle: 'What to expect in this reset round',
      completionNote: 'Continue when you are ready to note what helped the rhythm feel easier to follow.',
      reflectionSubtitle: 'Use this integration moment to notice what steadied or softened while you followed the rhythm. A short note is enough.',
      reflectionPrompt: 'What helped the left-right rhythm feel steady or easier this round?',
      reflectionHelper: 'Optional. A few calm words about what softened or steadied is enough.',
      reflectionPlaceholder: 'A rhythm note for next time',
    }),
    phases: [
      {
        key: 'settle',
        label: 'Settle',
        copy: 'Let your attention settle before the alternating rhythm begins.',
        seconds: lowIntensity.settleSeconds,
        activatesStagePresenter: false,
      },
      {
        key: 'phrase',
        label: 'Alternating rhythm',
        copy: 'Follow the visible left-right pulse softly, or tap along gently if that feels easier. No sound is used.',
        seconds: lowIntensity.practiceSeconds,
        activatesStagePresenter: true,
      },
      {
        key: 'recovery',
        label: 'Recovery',
        copy: 'Ease off fully for a moment and let the rhythm fade into stillness.',
        seconds: lowIntensity.recoverySeconds,
        activatesStagePresenter: false,
      },
    ],
    stagePresenter: {
      key: 'bilateral-rhythm',
      cycleMs: 2500,
      lowIntensity: lowIntensity.enabled,
      reducedMotion,
    },
    display,
    capabilities: createCapabilities({
      kind: 'info',
      label: 'Alternating rhythm',
      description: 'This reset uses a visual left-right rhythm, with optional self-tapping if you want a physical cue. It does not use sound.',
    }, reducedMotion),
    reducedMotion: createReducedMotionConfig(settings.reducedMotionEnabled, reducedMotion),
  };
};

const createOrientingFamilyConfig = ({
  exercise,
  phrase,
  lowIntensity,
  settings,
}: PracticeFamilyBuilderInput): PracticeFamilyConfig => {
  const reducedMotion = createReducedMotionPolicy({
    title: 'Gentler orienting scan',
    description: 'Reduced motion slows the orienting scan and softens the visual shift so the wider space feels easier to notice.',
    cycleMultiplier: settings.reducedMotionEnabled ? 1.22 : 1,
    amplitudeScale: settings.reducedMotionEnabled ? 0.8 : 1,
  });
  const display: PracticeDisplayConfig = {
    title: exercise.title,
    subtitle: 'Stay with a calm pace. You can pause, resume, or stop without losing control of the session.',
    phraseText: 'Notice the wider space softly',
    pausedOverlayCopy: 'Resume when the orienting scan feels easy to follow again.',
    completeCopy: 'This round is complete.',
    statusLines: [
      `${exercise.phaseLabel} • ${exercise.title}`,
      `Low intensity: ${lowIntensity.enabled ? 'On' : 'Off'} • Reduced motion: ${settings.reducedMotionEnabled ? 'On' : 'Off'} • Gaze guidance: Off for orienting`,
    ],
  };

  void phrase;

  return {
    expectations: defaultOrientingExpectations,
    gazeGuidance: {
      ...defaultGazeGuidanceConfig,
      enabled: false,
      prompt: null,
    },
    movingBall: null,
    breathingReset: null,
    copy: createSharedCopy({
      instructionsSubtitle: 'Let your attention widen gently, follow a calm orienting prompt, and stop anywhere that feels steadier.',
      instructionsSelectionLabel: 'Selected reset practice',
      expectationsTitle: 'What to expect in this reset round',
      completionNote: 'Continue when you are ready to note what in the wider space helped you settle.',
      reflectionSubtitle: 'Use this integration moment to notice what in the wider space felt steadier or easier. A short note is enough.',
      reflectionPrompt: 'What in the wider space helped you orient or settle this round?',
      reflectionHelper: 'Optional. A few calm words about what felt steadier is enough.',
      reflectionPlaceholder: 'An orienting note for next time',
    }),
    phases: [
      {
        key: 'settle',
        label: 'Settle',
        copy: 'Let your attention settle before you begin the wider orienting scan.',
        seconds: lowIntensity.settleSeconds,
        activatesStagePresenter: false,
      },
      {
        key: 'phrase',
        label: 'Orienting scan',
        copy: 'Follow the orienting prompt softly and notice any part of the wider space that feels easier to rest with.',
        seconds: lowIntensity.practiceSeconds,
        activatesStagePresenter: true,
      },
      {
        key: 'recovery',
        label: 'Recovery',
        copy: 'Ease off fully for a moment and let the room settle back around you.',
        seconds: lowIntensity.recoverySeconds,
        activatesStagePresenter: false,
      },
    ],
    stagePresenter: {
      key: 'orienting',
      cycleMs: 4600,
      lowIntensity: lowIntensity.enabled,
      reducedMotion,
    },
    display,
    capabilities: createCapabilities({
      kind: 'info',
      label: 'Orienting scan',
      description: 'This reset uses a guided orienting scan. Let your attention widen gently and notice any part of the wider space that feels steadier.',
    }, reducedMotion),
    reducedMotion: createReducedMotionConfig(settings.reducedMotionEnabled, reducedMotion),
  };
};

const practiceFamilyBuilders = {
  'phrase-anchor': createPhraseAnchorFamilyConfig,
  'moving-ball': createMovingBallFamilyConfig,
  'breathing-reset': createBreathingResetFamilyConfig,
  'bilateral-rhythm': createBilateralRhythmFamilyConfig,
  orienting: createOrientingFamilyConfig,
} as const satisfies Record<ExerciseDefinition['id'], (input: PracticeFamilyBuilderInput) => PracticeFamilyConfig>;

export const buildPracticeFamilyConfig = (input: PracticeFamilyBuilderInput): PracticeFamilyConfig => (
  practiceFamilyBuilders[input.exercise.id](input)
);
