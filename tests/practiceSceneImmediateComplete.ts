import type { AmbientAudioStartHandle } from '../src/audio/ambientAudio.ts';
import type { PracticeRunnerSnapshot } from '../src/practice/practiceRunner.ts';
import { completeImmediatePracticeIfNeeded } from '../src/scenes/practiceImmediateComplete.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const runImmediateCompleteAmbientHandoffScenario = (): void => {
  const calls: string[] = [];
  const ambientAudioStart = {
    engine: {
      dispose: (options: { fadeOutSeconds: number }) => {
        calls.push(`dispose:${options.fadeOutSeconds}`);
      },
    },
  } as unknown as AmbientAudioStartHandle;

  const handled = completeImmediatePracticeIfNeeded({
    snapshot: completeSnapshot,
    ambientAudioStart,
    finishPractice: () => {
      calls.push('finish');
    },
  });

  assert(handled, 'expected complete snapshot to be handled immediately');
  assert(calls.join('>') === 'dispose:0>finish', 'expected handed-off ambient audio disposal before immediate completion');
};

const runImmediateCompleteThrowingDisposeScenario = (): void => {
  const calls: string[] = [];
  const ambientAudioStart = {
    engine: {
      dispose: () => {
        calls.push('dispose');
        throw new Error('dispose failed');
      },
    },
  } as unknown as AmbientAudioStartHandle;

  let disposeError: Error | null = null;

  try {
    completeImmediatePracticeIfNeeded({
      snapshot: completeSnapshot,
      ambientAudioStart,
      finishPractice: () => {
        calls.push('finish');
      },
    });
  } catch (error) {
    disposeError = error as Error;
  }

  assert(disposeError?.message === 'dispose failed', 'expected disposal failure to be surfaced');
  assert(calls.join('>') === 'dispose>finish', 'expected completion to run even when handed-off audio disposal fails');
};

const runIncompletePracticeScenario = (): void => {
  const calls: string[] = [];
  const ambientAudioStart = {
    engine: {
      dispose: () => {
        calls.push('dispose');
      },
    },
  } as unknown as AmbientAudioStartHandle;

  const handled = completeImmediatePracticeIfNeeded({
    snapshot: incompleteSnapshot,
    ambientAudioStart,
    finishPractice: () => {
      calls.push('finish');
    },
  });

  assert(!handled, 'expected incomplete snapshot to remain in normal practice lifecycle');
  assert(calls.length === 0, 'expected incomplete practice not to dispose or finish immediately');
};

const runImmediateCompleteWithoutHandoffScenario = (): void => {
  const calls: string[] = [];

  const handled = completeImmediatePracticeIfNeeded({
    snapshot: completeSnapshot,
    ambientAudioStart: undefined,
    finishPractice: () => {
      calls.push('finish');
    },
  });

  assert(handled, 'expected complete snapshot without handoff to be handled immediately');
  assert(calls.join('>') === 'finish', 'expected immediate completion without a handoff to finish normally');
};

const completeSnapshot: PracticeRunnerSnapshot = {
  phase: 'complete',
  phaseIndex: 0,
  secondsRemaining: 0,
  totalSecondsRemaining: 0,
  paused: false,
  complete: true,
};

const incompleteSnapshot: PracticeRunnerSnapshot = {
  phase: 'settle',
  phaseIndex: 0,
  secondsRemaining: 10,
  totalSecondsRemaining: 10,
  paused: false,
  complete: false,
};

runImmediateCompleteAmbientHandoffScenario();
runImmediateCompleteThrowingDisposeScenario();
runIncompletePracticeScenario();
runImmediateCompleteWithoutHandoffScenario();

console.log('practice scene immediate-complete validation passed');
