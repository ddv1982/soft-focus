import { PracticeRunner } from '../src/practice/practiceRunner.ts';
import type { PracticeConfig } from '../src/practice/practiceConfig.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const createRunnerConfig = (): PracticeConfig => ({
  phases: [
    { key: 'settle', label: 'Settle', copy: '', seconds: 1, activatesStagePresenter: false },
    { key: 'phrase', label: 'Practice', copy: '', seconds: 2, activatesStagePresenter: true },
    { key: 'recovery', label: 'Recover', copy: '', seconds: 1, activatesStagePresenter: false },
  ],
} as unknown as PracticeConfig);

const runOvershootCarryScenario = (): void => {
  const runner = new PracticeRunner(createRunnerConfig());

  const afterBoundaryOvershoot = runner.tick(1500);

  assert(afterBoundaryOvershoot.phase === 'phrase', 'expected overshoot to advance into the next phase');
  assert(afterBoundaryOvershoot.phaseIndex === 1, 'expected phase index to advance once');
  assert(afterBoundaryOvershoot.secondsRemaining === 2, 'expected carried 500ms overshoot to reduce the next phase');
  assert(afterBoundaryOvershoot.totalSecondsRemaining === 3, 'expected total remaining seconds to include carried overshoot');

  const afterMultiBoundaryOvershoot = runner.tick(2000);

  assert(afterMultiBoundaryOvershoot.phase === 'recovery', 'expected large overshoot to carry through multiple phase boundaries');
  assert(afterMultiBoundaryOvershoot.phaseIndex === 2, 'expected phase index to advance through the practice phase');
  assert(afterMultiBoundaryOvershoot.secondsRemaining === 1, 'expected remaining overshoot to apply to recovery');
  assert(afterMultiBoundaryOvershoot.totalSecondsRemaining === 1, 'expected total remaining to reflect recovery only');

  const complete = runner.tick(500);

  assert(complete.complete, 'expected runner to complete after exact final phase elapsed time');
  assert(complete.phase === 'complete', 'expected complete phase after final phase elapsed time');
};

const runPausedOvershootScenario = (): void => {
  const runner = new PracticeRunner(createRunnerConfig());

  runner.pause();
  const paused = runner.tick(5000);

  assert(paused.paused, 'expected paused runner to remain paused');
  assert(paused.phase === 'settle', 'expected paused runner not to advance phases');
  assert(paused.secondsRemaining === 1, 'expected paused runner not to consume elapsed time');
};

const runZeroDurationCarryScenario = (): void => {
  const runner = new PracticeRunner({
    phases: [
      { key: 'settle', label: 'Settle', copy: '', seconds: 0, activatesStagePresenter: false },
      { key: 'phrase', label: 'Practice', copy: '', seconds: 0, activatesStagePresenter: true },
      { key: 'recovery', label: 'Recover', copy: '', seconds: 1, activatesStagePresenter: false },
    ],
  } as unknown as PracticeConfig);

  const afterZeroLengthPhases = runner.tick(250);

  assert(afterZeroLengthPhases.phase === 'recovery', 'expected positive delta to skip zero-duration phases');
  assert(afterZeroLengthPhases.phaseIndex === 2, 'expected runner to advance through both zero-duration phases');
  assert(afterZeroLengthPhases.secondsRemaining === 1, 'expected carried delta to apply to recovery phase');
  assert(afterZeroLengthPhases.totalSecondsRemaining === 1, 'expected total remaining to reflect carried delta in recovery');

  const complete = runner.tick(750);

  assert(complete.complete, 'expected follow-up tick to prove the 250ms overshoot was applied to recovery');
};

const runInitialZeroDurationNormalizationScenario = (): void => {
  const runner = new PracticeRunner({
    phases: [
      { key: 'settle', label: 'Settle', copy: '', seconds: 0, activatesStagePresenter: false },
      { key: 'phrase', label: 'Practice', copy: '', seconds: 1, activatesStagePresenter: true },
    ],
  } as unknown as PracticeConfig);

  const initial = runner.getSnapshot();

  assert(initial.phase === 'phrase', 'expected constructor to skip initial zero-duration phases');
  assert(initial.phaseIndex === 1, 'expected constructor normalization to advance to the first positive phase');
  assert(initial.secondsRemaining === 1, 'expected first positive phase to retain its full duration');
};

const runTickZeroNormalizationScenario = (): void => {
  const runner = new PracticeRunner({
    phases: [
      { key: 'settle', label: 'Settle', copy: '', seconds: 0, activatesStagePresenter: false },
      { key: 'phrase', label: 'Practice', copy: '', seconds: 1, activatesStagePresenter: true },
    ],
  } as unknown as PracticeConfig, {
    phase: 'settle',
    phaseIndex: 0,
    secondsRemaining: 0,
    totalSecondsRemaining: 1,
    paused: true,
    complete: false,
  });

  assert(runner.getSnapshot().paused, 'expected paused zero-duration snapshot to remain paused before a public transition');
  runner.resume();
  const afterTickZero = runner.tick(0);

  assert(afterTickZero.phase === 'phrase', 'expected tick(0) after resume to normalize zero-duration phase');
  assert(afterTickZero.phaseIndex === 1, 'expected tick(0) normalization to advance to the first positive phase');
};

const runExactBoundaryZeroDurationScenario = (): void => {
  const runner = new PracticeRunner({
    phases: [
      { key: 'settle', label: 'Settle', copy: '', seconds: 1, activatesStagePresenter: false },
      { key: 'phrase', label: 'Practice', copy: '', seconds: 0, activatesStagePresenter: true },
      { key: 'recovery', label: 'Recover', copy: '', seconds: 1, activatesStagePresenter: false },
    ],
  } as unknown as PracticeConfig);

  const afterExactBoundary = runner.tick(1000);

  assert(afterExactBoundary.phase === 'recovery', 'expected exact-boundary tick to skip zero-duration phase');
  assert(afterExactBoundary.phaseIndex === 2, 'expected exact-boundary tick to advance through zero-duration phase');
  assert(afterExactBoundary.secondsRemaining === 1, 'expected recovery to start with full duration after exact-boundary skip');
  assert(afterExactBoundary.totalSecondsRemaining === 1, 'expected total remaining to reflect recovery phase only');
};

const runEmptyPhaseScenario = (): void => {
  const runner = new PracticeRunner({
    phases: [],
  } as unknown as PracticeConfig);

  const snapshot = runner.getSnapshot();

  assert(snapshot.complete, 'expected empty phase arrays to complete immediately');
  assert(snapshot.phase === 'complete', 'expected empty phase arrays to report the complete phase');
  assert(snapshot.phaseIndex === 0, 'expected empty phase arrays to keep the phase index at zero');
  assert(snapshot.totalSecondsRemaining === 0, 'expected empty phase arrays to have no remaining time');
};

const runAllZeroPhaseScenario = (): void => {
  const phases = [
    { key: 'settle', label: 'Settle', copy: '', seconds: 0, activatesStagePresenter: false },
    { key: 'phrase', label: 'Practice', copy: '', seconds: 0, activatesStagePresenter: true },
    { key: 'recovery', label: 'Recover', copy: '', seconds: 0, activatesStagePresenter: false },
  ];
  const runner = new PracticeRunner({ phases } as unknown as PracticeConfig);

  const snapshot = runner.getSnapshot();

  assert(snapshot.complete, 'expected all-zero phase arrays to complete immediately');
  assert(snapshot.phase === 'complete', 'expected all-zero phase arrays to report the complete phase');
  assert(snapshot.phaseIndex === phases.length, 'expected all-zero phase arrays to advance through every phase');
  assert(snapshot.totalSecondsRemaining === 0, 'expected all-zero phase arrays to have no remaining time');
};

runOvershootCarryScenario();
runPausedOvershootScenario();
runZeroDurationCarryScenario();
runInitialZeroDurationNormalizationScenario();
runTickZeroNormalizationScenario();
runExactBoundaryZeroDurationScenario();
runEmptyPhaseScenario();
runAllZeroPhaseScenario();

console.log('practice runner validation passed');
