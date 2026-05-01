import type { PracticeConfig } from './practiceConfig';
import { PracticeTimer } from './timer';

export type PracticeRunnerPhase = 'settle' | 'phrase' | 'recovery' | 'complete';

export interface PracticeRunnerSnapshot {
  phase: PracticeRunnerPhase;
  phaseIndex: number;
  secondsRemaining: number;
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

  constructor(practiceConfig: PracticeConfig) {
    this.phases = getPhaseDefinitions(practiceConfig);
    this.timer = this.phases[0] ? new PracticeTimer(toMilliseconds(this.phases[0].seconds)) : null;
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
        paused: false,
        complete: true,
      };
    }

    const timerState = this.timer.getState();

    return {
      phase: this.phases[this.phaseIndex].key,
      phaseIndex: this.phaseIndex,
      secondsRemaining: Math.ceil(timerState.remainingMs / 1000),
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
