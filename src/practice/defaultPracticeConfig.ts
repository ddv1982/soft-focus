import { breathingPresetIds, movingBallPresetIds, type BreathingPresetId, type MovingBallPresetId } from '../state/types';

export const defaultPhrasePracticeExpectations = [
  'Settle in with a light effort and return to your phrase when attention wanders.',
  'Keep your jaw, shoulders, and eyes soft so the session stays easy to sustain.',
  'Pause if anything feels strained. A calm reset is part of the practice.',
] as const;

export const defaultMovingBallExpectations = [
  'Let your eyes follow the ball without straining or trying to keep it perfectly still.',
  'Choose the sweep preset that feels easiest to stay with today, then let your jaw and shoulders stay easy.',
  'If you lose the path for a moment, soften and rejoin it on the next pass instead of forcing precision.',
] as const;

export const defaultBreathingResetExpectations = [
  'Let the breath stay easy, quiet, and natural rather than deep or forced.',
  'Follow the visual rhythm lightly with an easy inhale and a slightly longer exhale.',
  'If the timing feels too long, keep the breath smaller and return to your natural pace.',
] as const;

export const defaultBilateralRhythmExpectations = [
  'Follow the alternating left-right rhythm without forcing your pace to be perfectly exact.',
  'Let the switch from side to side feel steady and light rather than sharp or urgent.',
  'If the rhythm feels too activating, pause and return when the pace feels easier to follow.',
] as const;

export const defaultOrientingExpectations = [
  'Let your gaze move through the wider space without forcing yourself to notice everything at once.',
  'Follow the prompt lightly and pause anywhere that feels steadier or calmer.',
  'If the scan feels too activating, stop and return to the easiest nearby anchor you can find.',
] as const;

export const defaultLowIntensityConfig = {
  label: 'Low-intensity mode',
  description: 'Keeps the pace gentle with a short settle, brief practice window, and easy recovery.',
  settleSeconds: 20,
  practiceSeconds: 90,
  recoverySeconds: 20,
} as const;

export const defaultGazeGuidanceConfig = {
  label: 'Gaze guidance',
  description: 'Adds a soft reminder to rest your gaze instead of tightening around the phrase.',
  prompt: 'Let your gaze rest softly in front of you and return to the phrase without forcing it.',
} as const;

export interface MovingBallPresetDefinition {
  id: MovingBallPresetId;
  title: string;
  summary: string;
  activeCopy: string;
  pattern: string;
  laneHeights: readonly number[];
  cycleMs: number;
  lowIntensityCycleMs: number;
  laneBandHeight: number;
  radius: number;
}

export interface BreathingPresetDefinition {
  id: BreathingPresetId;
  title: string;
  summary: string;
  activeCopy: string;
  pattern: 'extended-exhale' | 'balanced' | 'box' | 'cyclic-sighing';
  inhaleMs: number;
  inhaleTopUpMs: number | null;
  holdAfterInhaleMs: number | null;
  exhaleMs: number;
  holdAfterExhaleMs: number | null;
}

export const movingBallPresetCatalog: readonly MovingBallPresetDefinition[] = [
  {
    id: movingBallPresetIds.steadyCenter,
    title: 'Steady center sweep',
    summary: 'A single centered sweep for the simplest visual path.',
    activeCopy: 'Follow the ball softly through a single centered sweep and let your eyes stay easy.',
    pattern: 'center-sweep',
    laneHeights: [0.5],
    cycleMs: 2200,
    lowIntensityCycleMs: 3000,
    laneBandHeight: 136,
    radius: 14,
  },
  {
    id: movingBallPresetIds.multiHeight,
    title: 'Multi-height sweep',
    summary: 'A gentle reset that glides through lower, middle, and eye-level lanes.',
    activeCopy: 'Follow the ball softly through the lower, middle, and eye-level lanes without forcing precision.',
    pattern: 'multi-height-sweep',
    laneHeights: [0.78, 0.5, 0.22],
    cycleMs: 2400,
    lowIntensityCycleMs: 3200,
    laneBandHeight: 260,
    radius: 14,
  },
  {
    id: movingBallPresetIds.settlingSteps,
    title: 'Settling step sweep',
    summary: 'A slower stepped sweep that eases downward before returning to center.',
    activeCopy: 'Let the sweep step downward gently, then meet it again at center with a light effort.',
    pattern: 'settling-step-sweep',
    laneHeights: [0.62, 0.54, 0.46, 0.5],
    cycleMs: 2800,
    lowIntensityCycleMs: 3600,
    laneBandHeight: 144,
    radius: 14,
  },
] as const;

export const getMovingBallPresetDefinition = (presetId: MovingBallPresetId): MovingBallPresetDefinition => (
  movingBallPresetCatalog.find((preset) => preset.id === presetId) ?? movingBallPresetCatalog[0]
);

export const breathingPresetCatalog: readonly BreathingPresetDefinition[] = [
  {
    id: breathingPresetIds.gentleExhale,
    title: 'Gentle exhale',
    summary: 'A smaller 3-in / 4-out rhythm for an easier, lighter reset.',
    activeCopy: 'Let the inhale stay easy and the softer exhale taper out without forcing extra depth.',
    pattern: 'extended-exhale',
    inhaleMs: 3000,
    inhaleTopUpMs: null,
    holdAfterInhaleMs: null,
    exhaleMs: 4000,
    holdAfterExhaleMs: null,
  },
  {
    id: breathingPresetIds.longExhale,
    title: 'Long exhale',
    summary: 'A calming 4-in / 6-out rhythm with a noticeably longer exhale.',
    activeCopy: 'Follow the inhale easily and let the longer exhale soften the pace of the round.',
    pattern: 'extended-exhale',
    inhaleMs: 4000,
    inhaleTopUpMs: null,
    holdAfterInhaleMs: null,
    exhaleMs: 6000,
    holdAfterExhaleMs: null,
  },
  {
    id: breathingPresetIds.coherent,
    title: 'Coherent',
    summary: 'A balanced 5-in / 5-out rhythm near six breaths per minute.',
    activeCopy: 'Keep both phases even and quiet so the breath feels steady instead of effortful.',
    pattern: 'balanced',
    inhaleMs: 5000,
    inhaleTopUpMs: null,
    holdAfterInhaleMs: null,
    exhaleMs: 5000,
    holdAfterExhaleMs: null,
  },
  {
    id: breathingPresetIds.box,
    title: 'Box',
    summary: 'A structured 4-in / 4-hold / 4-out / 4-hold rhythm for equal-phase focus.',
    activeCopy: 'Move through each inhale, hold, exhale, and empty pause evenly without rushing the transitions.',
    pattern: 'box',
    inhaleMs: 4000,
    inhaleTopUpMs: null,
    holdAfterInhaleMs: 4000,
    exhaleMs: 4000,
    holdAfterExhaleMs: 4000,
  },
  {
    id: breathingPresetIds.cyclicSighing,
    title: 'Cyclic sighing',
    summary: 'A double inhale followed by a long exhale, modeled as 2 in / 1 top-up / 6 out.',
    activeCopy: 'Take one easy inhale, add a small top-up breath, then let the long exhale taper out slowly.',
    pattern: 'cyclic-sighing',
    inhaleMs: 2000,
    inhaleTopUpMs: 1000,
    holdAfterInhaleMs: null,
    exhaleMs: 6000,
    holdAfterExhaleMs: null,
  },
] as const;

export const getBreathingPresetDefinition = (presetId: BreathingPresetId): BreathingPresetDefinition => (
  breathingPresetCatalog.find((preset) => preset.id === presetId) ?? breathingPresetCatalog[0]
);
