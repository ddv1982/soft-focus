import type { PracticeConfig } from './practiceConfig';
import { PracticeTimer } from './timer';

export type PracticeRunnerPhase = 'settle' | 'phrase' | 'recovery' | 'complete';

export interface PracticeRunnerSnapshot {
  phase: PracticeRunnerPhase;
  phaseIndex: number;
  secondsRemaining: number;
  totalSecondsRemaining: number;
  paused: boolean;
  complete: boolean;
}

interface PracticePhaseDefinition {
  key: Exclude<PracticeRunnerPhase, 'complete'>;
  seconds: number;
}

const toMilliseconds = (seconds: number): number => Math.max(0, seconds * 1000);

const getPhaseDefinitions = (practiceConfig: PracticeConfig): PracticePhaseDefinition[] => practiceConfig.phases.map(({ key, seconds }) => ({
  key,
  seconds,
}));

export class PracticeRunner {
  private readonly phases: PracticePhaseDefinition[];

  private phaseIndex = 0;

  private timer: PracticeTimer | null;

  constructor(practiceConfig: PracticeConfig, initialSnapshot?: PracticeRunnerSnapshot) {
    this.phases = getPhaseDefinitions(practiceConfig);
    this.phaseIndex = initialSnapshot && initialSnapshot.phaseIndex >= 0
      ? Math.min(initialSnapshot.phaseIndex, this.phases.length)
      : 0;

    if (this.phaseIndex >= this.phases.length || initialSnapshot?.complete) {
      this.timer = null;
      return;
    }

    this.timer = new PracticeTimer(
      initialSnapshot ? toMilliseconds(initialSnapshot.secondsRemaining) : toMilliseconds(this.phases[this.phaseIndex].seconds),
      Boolean(initialSnapshot?.paused),
    );
  }

  tick(deltaMs: number): PracticeRunnerSnapshot {
    if (!this.timer) {
      return this.getSnapshot();
    }

    const timerState = this.timer.tick(deltaMs);

    if (timerState.complete) {
      this.advancePhase();
    }

    return this.getSnapshot();
  }

  pause(): PracticeRunnerSnapshot {
    this.timer?.pause();

    return this.getSnapshot();
  }

  resume(): PracticeRunnerSnapshot {
    this.timer?.resume();

    return this.getSnapshot();
  }

  getSnapshot(): PracticeRunnerSnapshot {
    if (this.phaseIndex >= this.phases.length || !this.timer) {
      return {
        phase: 'complete',
        phaseIndex: this.phases.length,
        secondsRemaining: 0,
        totalSecondsRemaining: 0,
        paused: false,
        complete: true,
      };
    }

    const timerState = this.timer.getState();

    const secondsRemaining = Math.ceil(timerState.remainingMs / 1000);
    const futurePhaseSeconds = this.phases
      .slice(this.phaseIndex + 1)
      .reduce((totalSeconds, phase) => totalSeconds + phase.seconds, 0);

    return {
      phase: this.phases[this.phaseIndex].key,
      phaseIndex: this.phaseIndex,
      secondsRemaining,
      totalSecondsRemaining: secondsRemaining + futurePhaseSeconds,
      paused: timerState.paused,
      complete: false,
    };
  }

  private advancePhase(): void {
    this.phaseIndex += 1;

    if (this.phaseIndex >= this.phases.length) {
      this.timer = null;
      return;
    }

    this.timer = new PracticeTimer(toMilliseconds(this.phases[this.phaseIndex].seconds));
  }
}
