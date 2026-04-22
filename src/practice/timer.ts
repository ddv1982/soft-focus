export interface PracticeTimerState {
  remainingMs: number;
  paused: boolean;
  complete: boolean;
}

export class PracticeTimer {
  private remainingMs: number;

  private paused = false;

  constructor(durationMs: number) {
    this.remainingMs = Math.max(0, durationMs);
  }

  tick(deltaMs: number): PracticeTimerState {
    if (this.paused || this.remainingMs === 0) {
      return this.getState();
    }

    this.remainingMs = Math.max(0, this.remainingMs - Math.max(0, deltaMs));

    return this.getState();
  }

  pause(): PracticeTimerState {
    this.paused = true;

    return this.getState();
  }

  resume(): PracticeTimerState {
    this.paused = false;

    return this.getState();
  }

  getState(): PracticeTimerState {
    return {
      remainingMs: this.remainingMs,
      paused: this.paused,
      complete: this.remainingMs === 0,
    };
  }
}
