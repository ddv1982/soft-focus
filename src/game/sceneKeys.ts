export const sceneKeys = {
  entry: 'entry',
  exerciseSelection: 'exercise-selection',
  phrase: 'phrase',
  instructions: 'instructions',
  practice: 'practice',
  completion: 'completion',
  reflection: 'reflection',
} as const;

export type SceneKey = (typeof sceneKeys)[keyof typeof sceneKeys];

const guidedPracticeSceneKeys = [
  sceneKeys.entry,
  sceneKeys.exerciseSelection,
  sceneKeys.phrase,
  sceneKeys.instructions,
  sceneKeys.practice,
  sceneKeys.completion,
  sceneKeys.reflection,
];

export const orderedSceneKeys: readonly SceneKey[] = [...guidedPracticeSceneKeys];

export const initialSceneKey: SceneKey = sceneKeys.entry;

export const isSceneKey = (value: string): value is SceneKey =>
  orderedSceneKeys.includes(value as SceneKey);
