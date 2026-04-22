import { movingBallPresetIds, type MovingBallPresetId } from '../state/types';

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
    summary: 'A gentle reset that glides through low, middle, and high lanes.',
    activeCopy: 'Follow the ball softly as it rises and settles through different heights without forcing precision.',
    pattern: 'multi-height-sweep',
    laneHeights: [0.34, 0.5, 0.66],
    cycleMs: 2400,
    lowIntensityCycleMs: 3200,
    laneBandHeight: 136,
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
