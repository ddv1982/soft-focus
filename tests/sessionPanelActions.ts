import { sceneKeys } from '../src/game/sceneKeys.ts';
import { exerciseIds } from '../src/state/types.ts';
import {
  chooseAnotherExercise,
  continueToReflection,
  saveReflectionAndChooseAnotherExercise,
  saveReflectionAndRestart,
} from '../src/shell/sessionPanelActions.ts';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const createFakeGame = (selectedExercise = exerciseIds.breathingReset) => {
  const calls: {
    ensuredScenes: string[];
    prepared: number;
    savedReflection: string[];
    updatedScenes: string[];
    startedScenes: string[];
  } = {
    ensuredScenes: [],
    prepared: 0,
    savedReflection: [],
    updatedScenes: [],
    startedScenes: [],
  };

  const game = {
    sessionStore: {
      getState: () => ({ selectedExercise }),
      prepareForNextSession: () => {
        calls.prepared += 1;
      },
      saveReflection: (reflection: string) => {
        calls.savedReflection.push(reflection);
      },
      updateCurrentScene: (sceneKey: string) => {
        calls.updatedScenes.push(sceneKey);
      },
    },
    scene: {
      start: (sceneKey: string) => {
        calls.startedScenes.push(sceneKey);
      },
    },
    ensureSceneRegistered: async (sceneKey: string) => {
      calls.ensuredScenes.push(sceneKey);
    },
  };

  return { game, calls };
};

const runChooseAnotherExerciseScenario = async (): Promise<void> => {
  const { game, calls } = createFakeGame();

  await chooseAnotherExercise(game);

  assert(calls.ensuredScenes[0] === sceneKeys.exerciseSelection, 'expected choose-another-exercise to register exercise selection before navigation');
  assert(calls.prepared === 1, 'expected choose-another-exercise to clear the finished session');
  assert(calls.updatedScenes[0] === sceneKeys.exerciseSelection, 'expected choose-another-exercise to update the managed scene to exercise selection');
  assert(calls.startedScenes[0] === sceneKeys.exerciseSelection, 'expected choose-another-exercise to start the exercise selection scene');
};

const runContinueToReflectionScenario = async (): Promise<void> => {
  const { game, calls } = createFakeGame();

  await continueToReflection(game);

  assert(calls.ensuredScenes[0] === sceneKeys.reflection, 'expected continue-to-reflection to register reflection before navigation');
  assert(calls.prepared === 0, 'expected continue-to-reflection not to clear the session yet');
  assert(calls.updatedScenes[0] === sceneKeys.reflection, 'expected continue-to-reflection to update the managed scene to reflection');
  assert(calls.startedScenes[0] === sceneKeys.reflection, 'expected continue-to-reflection to start the reflection scene');
};

const runSaveAndRestartScenario = async (): Promise<void> => {
  const { game, calls } = createFakeGame(exerciseIds.breathingReset);

  await saveReflectionAndRestart(game, '  calm breath  ');

  assert(calls.savedReflection[0] === '  calm breath  ', 'expected save-and-restart to persist the current note before navigation');
  assert(calls.ensuredScenes[0] === sceneKeys.instructions, 'expected save-and-restart to register the direct-practice restart scene before clearing the session');
  assert(calls.prepared === 1, 'expected save-and-restart to clear the finished session');
  assert(calls.updatedScenes[0] === sceneKeys.instructions, 'expected breathing reset restart to return to instructions');
  assert(calls.startedScenes[0] === sceneKeys.instructions, 'expected breathing reset restart to start the instructions scene');
};

const runSaveAndChooseAnotherScenario = async (): Promise<void> => {
  const { game, calls } = createFakeGame(exerciseIds.movingBall);

  await saveReflectionAndChooseAnotherExercise(game, 'ready to switch');

  assert(calls.savedReflection[0] === 'ready to switch', 'expected save-and-choose-another to persist the note first');
  assert(calls.ensuredScenes[0] === sceneKeys.exerciseSelection, 'expected save-and-choose-another to register exercise selection before clearing the session');
  assert(calls.prepared === 1, 'expected save-and-choose-another to clear the finished session');
  assert(calls.updatedScenes[0] === sceneKeys.exerciseSelection, 'expected save-and-choose-another to update to exercise selection');
  assert(calls.startedScenes[0] === sceneKeys.exerciseSelection, 'expected save-and-choose-another to start exercise selection');
};

await runChooseAnotherExerciseScenario();
await runContinueToReflectionScenario();
await runSaveAndRestartScenario();
await runSaveAndChooseAnotherScenario();

console.log('session panel actions validation passed');
