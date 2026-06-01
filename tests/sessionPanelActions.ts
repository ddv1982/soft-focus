import { sceneKeys } from '../src/game/sceneKeys.ts';
import {
  chooseAnotherExercise,
  continueToReflection,
  saveReflectionAndChooseAnotherExercise,
  saveReflectionAndRestart,
} from '../src/shell/sessionPanelActions.ts';
import { type ExerciseId, exerciseIds } from '../src/state/types.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const createFakeGame = (selectedExercise: ExerciseId = exerciseIds.breathingReset) => {
  const calls: {
    ordered: string[];
    ensuredScenes: string[];
    prepared: number;
    savedReflection: string[];
    updatedScenes: string[];
    startedScenes: string[];
  } = {
    ordered: [],
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
        calls.ordered.push('prepare');
        calls.prepared += 1;
      },
      saveReflection: (reflection: string) => {
        calls.ordered.push(`save:${reflection}`);
        calls.savedReflection.push(reflection);
      },
      updateCurrentScene: (sceneKey: string) => {
        calls.ordered.push(`update:${sceneKey}`);
        calls.updatedScenes.push(sceneKey);
      },
    },
    scene: {
      start: (sceneKey: string) => {
        calls.ordered.push(`start:${sceneKey}`);
        calls.startedScenes.push(sceneKey);
      },
    },
    ensureSceneRegistered: async (sceneKey: string) => {
      calls.ordered.push(`ensure:${sceneKey}`);
      calls.ensuredScenes.push(sceneKey);
    },
  };

  return { game, calls };
};

const createFailingRegistrationGame = (
  selectedExercise: ExerciseId = exerciseIds.breathingReset,
) => {
  const { game, calls } = createFakeGame(selectedExercise);
  game.ensureSceneRegistered = async (sceneKey: string) => {
    calls.ordered.push(`ensure:${sceneKey}`);
    calls.ensuredScenes.push(sceneKey);
    throw new Error(`failed to register ${sceneKey}`);
  };

  return { game, calls };
};

const createDeferredRegistrationGame = (
  selectedExercise: ExerciseId = exerciseIds.breathingReset,
) => {
  const { game, calls } = createFakeGame(selectedExercise);
  let resolveRegistration: (() => void) | null = null;
  const registration = new Promise<void>((resolve) => {
    resolveRegistration = resolve;
  });

  game.ensureSceneRegistered = async (sceneKey: string) => {
    calls.ordered.push(`ensure:${sceneKey}`);
    calls.ensuredScenes.push(sceneKey);
    await registration;
  };

  return {
    game,
    calls,
    resolveRegistration: () => {
      resolveRegistration?.();
    },
  };
};

const runChooseAnotherExerciseScenario = async (): Promise<void> => {
  const { game, calls } = createFakeGame();

  await chooseAnotherExercise(game);

  assert(
    calls.ensuredScenes[0] === sceneKeys.exerciseSelection,
    'expected choose-another-exercise to register exercise selection before navigation',
  );
  assert(calls.prepared === 1, 'expected choose-another-exercise to clear the finished session');
  assert(
    calls.updatedScenes[0] === sceneKeys.exerciseSelection,
    'expected choose-another-exercise to update the managed scene to exercise selection',
  );
  assert(
    calls.startedScenes[0] === sceneKeys.exerciseSelection,
    'expected choose-another-exercise to start the exercise selection scene',
  );
  assert(
    calls.ordered.join('>') ===
      [
        `ensure:${sceneKeys.exerciseSelection}`,
        'prepare',
        `update:${sceneKeys.exerciseSelection}`,
        `start:${sceneKeys.exerciseSelection}`,
      ].join('>'),
    'expected choose-another-exercise to register before clearing and navigating',
  );
};

const runContinueToReflectionScenario = async (): Promise<void> => {
  const { game, calls } = createFakeGame();

  await continueToReflection(game);

  assert(
    calls.ensuredScenes[0] === sceneKeys.reflection,
    'expected continue-to-reflection to register reflection before navigation',
  );
  assert(calls.prepared === 0, 'expected continue-to-reflection not to clear the session yet');
  assert(
    calls.updatedScenes[0] === sceneKeys.reflection,
    'expected continue-to-reflection to update the managed scene to reflection',
  );
  assert(
    calls.startedScenes[0] === sceneKeys.reflection,
    'expected continue-to-reflection to start the reflection scene',
  );
  assert(
    calls.ordered.join('>') ===
      [
        `ensure:${sceneKeys.reflection}`,
        `update:${sceneKeys.reflection}`,
        `start:${sceneKeys.reflection}`,
      ].join('>'),
    'expected continue-to-reflection to register before navigating',
  );
};

const runSaveAndRestartScenario = async (): Promise<void> => {
  const { game, calls } = createFakeGame(exerciseIds.breathingReset);

  await saveReflectionAndRestart(game, '  calm breath  ');

  assert(
    calls.savedReflection[0] === '  calm breath  ',
    'expected save-and-restart to persist the current note before navigation',
  );
  assert(
    calls.ensuredScenes[0] === sceneKeys.instructions,
    'expected save-and-restart to register the direct-practice restart scene before clearing the session',
  );
  assert(calls.prepared === 1, 'expected save-and-restart to clear the finished session');
  assert(
    calls.updatedScenes[0] === sceneKeys.instructions,
    'expected breathing reset restart to return to instructions',
  );
  assert(
    calls.startedScenes[0] === sceneKeys.instructions,
    'expected breathing reset restart to start the instructions scene',
  );
  assert(
    calls.ordered.join('>') ===
      [
        'save:  calm breath  ',
        `ensure:${sceneKeys.instructions}`,
        'prepare',
        `update:${sceneKeys.instructions}`,
        `start:${sceneKeys.instructions}`,
      ].join('>'),
    'expected save-and-restart to save, register, clear, then navigate',
  );
};

const runSaveAndChooseAnotherScenario = async (): Promise<void> => {
  const { game, calls } = createFakeGame(exerciseIds.movingBall);

  await saveReflectionAndChooseAnotherExercise(game, 'ready to switch');

  assert(
    calls.savedReflection[0] === 'ready to switch',
    'expected save-and-choose-another to persist the note first',
  );
  assert(
    calls.ensuredScenes[0] === sceneKeys.exerciseSelection,
    'expected save-and-choose-another to register exercise selection before clearing the session',
  );
  assert(calls.prepared === 1, 'expected save-and-choose-another to clear the finished session');
  assert(
    calls.updatedScenes[0] === sceneKeys.exerciseSelection,
    'expected save-and-choose-another to update to exercise selection',
  );
  assert(
    calls.startedScenes[0] === sceneKeys.exerciseSelection,
    'expected save-and-choose-another to start exercise selection',
  );
  assert(
    calls.ordered.join('>') ===
      [
        'save:ready to switch',
        `ensure:${sceneKeys.exerciseSelection}`,
        'prepare',
        `update:${sceneKeys.exerciseSelection}`,
        `start:${sceneKeys.exerciseSelection}`,
      ].join('>'),
    'expected save-and-choose-another to save, register, clear, then navigate',
  );
};

const runRegistrationFailurePreservesSessionScenario = async (): Promise<void> => {
  const { game, calls } = createFailingRegistrationGame();
  let surfacedError: unknown = null;

  try {
    await chooseAnotherExercise(game);
  } catch (error) {
    surfacedError = error;
  }

  assert(surfacedError instanceof Error, 'expected registration failure to surface to the caller');
  assert(
    calls.ensuredScenes[0] === sceneKeys.exerciseSelection,
    'expected failed choose-another-exercise to try registering exercise selection',
  );
  assert(calls.prepared === 0, 'expected failed registration not to clear the finished session');
  assert(
    calls.updatedScenes.length === 0,
    'expected failed registration not to update the managed scene',
  );
  assert(calls.startedScenes.length === 0, 'expected failed registration not to start a scene');
};

const runSaveAndRestartRegistrationFailureScenario = async (): Promise<void> => {
  const { game, calls } = createFailingRegistrationGame(exerciseIds.breathingReset);
  let surfacedError: unknown = null;

  try {
    await saveReflectionAndRestart(game, 'saved before failure');
  } catch (error) {
    surfacedError = error;
  }

  assert(
    surfacedError instanceof Error,
    'expected save-and-restart registration failure to surface to the caller',
  );
  assert(
    calls.savedReflection[0] === 'saved before failure',
    'expected save-and-restart to save the reflection before attempting restart',
  );
  assert(
    calls.ensuredScenes[0] === sceneKeys.instructions,
    'expected failed save-and-restart to try registering the restart scene',
  );
  assert(
    calls.prepared === 0,
    'expected failed save-and-restart not to clear the finished session',
  );
  assert(
    calls.updatedScenes.length === 0,
    'expected failed save-and-restart not to update the managed scene',
  );
  assert(calls.startedScenes.length === 0, 'expected failed save-and-restart not to start a scene');
};

const runDuplicateChooseAnotherDuringRegistrationScenario = async (): Promise<void> => {
  const { game, calls, resolveRegistration } = createDeferredRegistrationGame();
  const getPreparedCount = (): number => calls.prepared;

  const firstTransition = chooseAnotherExercise(game);
  const secondTransition = chooseAnotherExercise(game);

  await Promise.resolve();

  assert(
    calls.ensuredScenes.length === 1,
    'expected duplicate choose-another click to share the in-flight registration',
  );
  assert(
    getPreparedCount() === 0,
    'expected duplicate choose-another click not to clear the session while registration is pending',
  );

  resolveRegistration();
  await Promise.all([firstTransition, secondTransition]);

  assert(
    getPreparedCount() === 1,
    'expected duplicate choose-another click to clear the session once',
  );
  assert(
    calls.updatedScenes.length === 1,
    'expected duplicate choose-another click to update the managed scene once',
  );
  assert(
    calls.startedScenes.length === 1,
    'expected duplicate choose-another click to start the managed scene once',
  );
};

const runDuplicateSaveAndRestartDuringRegistrationScenario = async (): Promise<void> => {
  const { game, calls, resolveRegistration } = createDeferredRegistrationGame(
    exerciseIds.breathingReset,
  );
  const getPreparedCount = (): number => calls.prepared;

  const firstTransition = saveReflectionAndRestart(game, 'first note');
  const secondTransition = saveReflectionAndRestart(game, 'second note');

  await Promise.resolve();

  assert(
    calls.savedReflection.join('>') === 'first note',
    'expected duplicate save-and-restart click not to save a second reflection while registration is pending',
  );
  assert(
    calls.ensuredScenes.length === 1,
    'expected duplicate save-and-restart click to share the in-flight registration',
  );
  assert(
    getPreparedCount() === 0,
    'expected duplicate save-and-restart click not to clear the session while registration is pending',
  );

  resolveRegistration();
  await Promise.all([firstTransition, secondTransition]);

  assert(
    getPreparedCount() === 1,
    'expected duplicate save-and-restart click to clear the session once',
  );
  assert(
    calls.updatedScenes.length === 1,
    'expected duplicate save-and-restart click to update the managed scene once',
  );
  assert(
    calls.startedScenes.length === 1,
    'expected duplicate save-and-restart click to start the managed scene once',
  );
};

await runChooseAnotherExerciseScenario();
await runContinueToReflectionScenario();
await runSaveAndRestartScenario();
await runSaveAndChooseAnotherScenario();
await runRegistrationFailurePreservesSessionScenario();
await runSaveAndRestartRegistrationFailureScenario();
await runDuplicateChooseAnotherDuringRegistrationScenario();
await runDuplicateSaveAndRestartDuringRegistrationScenario();

console.log('session panel actions validation passed');
