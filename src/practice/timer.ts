export interface PracticeTimerState {
  remainingMs: number;
  paused: boolean;
  complete: boolean;
  overshootMs: number;
}

export class PracticeTimer {
  private remainingMs: number;

  private paused = false;

  constructor(durationMs: number, paused = false) {
    this.remainingMs = Math.max(0, durationMs);
    this.paused = paused;
  }

  tick(deltaMs: number): PracticeTimerState {
    if (this.paused) {
      return this.getState();
    }

    const elapsedMs = Math.max(0, deltaMs);

    if (this.remainingMs === 0) {
      return this.getState(elapsedMs);
    }

    const overshootMs = Math.max(0, elapsedMs - this.remainingMs);

    this.remainingMs = Math.max(0, this.remainingMs - elapsedMs);

    return this.getState(overshootMs);
  }

  pause(): PracticeTimerState {
    this.paused = true;

    return this.getState();
  }

  resume(): PracticeTimerState {
    this.paused = false;

    return this.getState();
  }

  getState(overshootMs = 0): PracticeTimerState {
    return {
      remainingMs: this.remainingMs,
      paused: this.paused,
      complete: this.remainingMs === 0,
      overshootMs,
    };
  }
}
