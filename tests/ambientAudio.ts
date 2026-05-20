import {
  AmbientAudioEngine,
  AmbientAudioUnavailableError,
  ambientAudioTracks,
  getPracticeDurationSeconds,
  type AmbientAudioElement,
  type AmbientAudioSettings,
  type AmbientAudioTrack,
} from '../src/audio/ambientAudio.ts';
import { ambientAudioPresetIds } from '../src/state/types.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const tracks: readonly AmbientAudioTrack[] = [
  { title: 'Ambient 1', url: '/ambient-1.mp3' },
  { title: 'Ambient 2', url: '/ambient-2.mp3' },
];

const settings: AmbientAudioSettings = {
  enabled: true,
  presetId: ambientAudioPresetIds.openHorizon,
  volume: 100,
};

class FakeAudioElement implements AmbientAudioElement {
  preload = '';

  src = '';

  currentTime = 0;

  volume = 0;

  onended: (() => void) | null = null;

  onerror: (() => void) | null = null;

  playCalls = 0;

  pauseCalls = 0;

  loadCalls = 0;

  removedAttributes: string[] = [];

  nextPlayError: unknown = null;

  private pausedState = true;

  get paused(): boolean {
    return this.pausedState;
  }

  async play(): Promise<void> {
    this.playCalls += 1;

    if (this.nextPlayError) {
      const error = this.nextPlayError;
      this.nextPlayError = null;
      throw error;
    }

    this.pausedState = false;
  }

  pause(): void {
    this.pauseCalls += 1;
    this.pausedState = true;
  }

  removeAttribute(qualifiedName: string): void {
    this.removedAttributes.push(qualifiedName);

    if (qualifiedName === 'src') {
      this.src = '';
    }
  }

  load(): void {
    this.loadCalls += 1;
  }

  triggerEnded(): void {
    this.onended?.();
  }

  triggerError(): void {
    this.onerror?.();
  }
}

const createEngine = ({
  fakeAudio = new FakeAudioElement(),
  playlist = tracks,
  errors = [],
}: {
  fakeAudio?: FakeAudioElement;
  playlist?: readonly AmbientAudioTrack[];
  errors?: unknown[];
} = {}): { engine: AmbientAudioEngine; fakeAudio: FakeAudioElement; errors: unknown[] } => ({
  fakeAudio,
  errors,
  engine: new AmbientAudioEngine(settings, {
    tracks: playlist,
    audioFactory: () => fakeAudio,
    onPlaybackError: (error) => {
      errors.push(error);
    },
  }),
});

const runStartAndFailureScenarios = async (): Promise<void> => {
  const { engine, fakeAudio } = createEngine();

  await engine.start();
  assert(fakeAudio.playCalls === 1, 'expected ambient start to call play once');
  assert(fakeAudio.src === tracks[0]?.url, 'expected ambient start to load the first bundled track');
  assert(engine.isPlaying(), 'expected engine to report playing after successful start');

  const rejectedAudio = new FakeAudioElement();
  const rejected = createEngine({ fakeAudio: rejectedAudio });
  const playError = new Error('NotAllowedError');
  rejectedAudio.nextPlayError = playError;
  let surfacedError: unknown = null;

  try {
    await rejected.engine.start();
  } catch (error) {
    surfacedError = error;
  }

  assert(surfacedError === playError, 'expected start playback rejection to be surfaced to the caller');
  assert(!rejected.engine.isPlaying(), 'expected rejected start to leave the engine stopped');

  const empty = createEngine({ playlist: [] });
  let unavailable: unknown = null;

  try {
    await empty.engine.start();
  } catch (error) {
    unavailable = error;
  }

  assert(unavailable instanceof AmbientAudioUnavailableError, 'expected empty playlist start to reject explicitly');
  assert(unavailable.reason === 'empty-playlist', 'expected empty playlist rejection to include a stable reason');
};

const runPlaylistScenarios = async (): Promise<void> => {
  const { engine, fakeAudio } = createEngine();

  await engine.start();
  fakeAudio.triggerEnded();
  assert(fakeAudio.src === tracks[1]?.url, 'expected natural ended event to advance to the next track');
  const playCallsAfterEnded: number = fakeAudio.playCalls;
  assert(playCallsAfterEnded === 2, 'expected natural track advance to keep playback active');

  fakeAudio.triggerError();
  assert(fakeAudio.src === tracks[0]?.url, 'expected track error to skip to the next playable bundled track');
  const playCallsAfterError: number = fakeAudio.playCalls;
  assert(playCallsAfterError === 3, 'expected track error skip to attempt continued playback');

  const failedPlaylist = createEngine();
  await failedPlaylist.engine.start();
  failedPlaylist.fakeAudio.triggerError();
  failedPlaylist.fakeAudio.triggerError();
  assert(failedPlaylist.errors.length === 1, 'expected all failed playlist tracks to surface one playback error');
  assert(!failedPlaylist.engine.isPlaying(), 'expected all failed playlist tracks to stop playback');
};

const runExerciseClockScenarios = async (): Promise<void> => {
  const { engine, fakeAudio } = createEngine();

  await engine.start();
  const initialVolume = fakeAudio.volume;

  engine.syncExerciseClock({ totalSecondsRemaining: 72 });
  assert(fakeAudio.src === tracks[0]?.url, 'expected exercise clock sync not to interrupt the current song');

  engine.syncExerciseClock({ totalSecondsRemaining: 70 });
  assert(fakeAudio.src === tracks[0]?.url, 'expected first track to keep playing past the exercise midpoint');
  assert(fakeAudio.playCalls === 1, 'expected exercise clock sync not to start the next song early');

  engine.syncExerciseClock({ totalSecondsRemaining: 4 });
  assert(fakeAudio.src === tracks[0]?.url, 'expected final fade to preserve the current song position');
  assert(fakeAudio.volume > 0, 'expected final fade to remain audible before the exercise reaches zero');
  assert(fakeAudio.volume < initialVolume, 'expected final fade to reduce volume inside the last five exercise seconds');

  engine.syncExerciseClock({ totalSecondsRemaining: 0 });
  assert(fakeAudio.volume === 0, 'expected final exercise fade to reach zero at completion');
};

const runVolumeChangeScenario = async (): Promise<void> => {
  const { engine, fakeAudio } = createEngine();

  await engine.start();
  const initialVolume = fakeAudio.volume;

  engine.setVolume(25);
  const loweredVolume = fakeAudio.volume;
  assert(loweredVolume > 0, 'expected lowered ambient volume to remain audible');
  assert(loweredVolume < initialVolume, 'expected setVolume to lower the fake audio element volume after playback starts');

  engine.setVolume(90);
  assert(fakeAudio.volume > loweredVolume, 'expected setVolume to raise the fake audio element volume after playback starts');
  assert(fakeAudio.volume <= 1, 'expected raised ambient volume to stay within browser audio volume bounds');
};

const runPlaybackHandlerReplacementScenario = async (): Promise<void> => {
  const firstErrors: unknown[] = [];
  const secondErrors: unknown[] = [];
  const { engine, fakeAudio } = createEngine({ errors: firstErrors });

  await engine.start();
  engine.setPlaybackErrorHandler((error) => {
    secondErrors.push(error);
  });
  fakeAudio.nextPlayError = new Error('blocked on advance');
  fakeAudio.triggerEnded();
  await Promise.resolve();
  await Promise.resolve();

  assert(firstErrors.length === 0, 'expected replaced playback error handler not to receive later failures');
  assert(secondErrors.length === 1, 'expected replacement playback error handler to receive later failures');
};

const runPlaybackPreservingControlScenario = async (): Promise<void> => {
  const { engine, fakeAudio } = createEngine();

  await engine.start();
  engine.syncExerciseClock({ totalSecondsRemaining: 3 });
  engine.setVolume(40);
  engine.setPreset(ambientAudioPresetIds.clearBells);

  assert(fakeAudio.playCalls === 1, 'expected clock, volume, and preset updates not to replay started audio');
  assert(engine.isPlaying(), 'expected engine to keep playing after non-start control updates');
};

const runBundledTrackManifestScenario = (): void => {
  assert(ambientAudioTracks.length >= 2, 'expected bundled ambient track manifest to expose both MP3s outside Vite runtime');
  assert(ambientAudioTracks[0]?.url.length, 'expected bundled ambient track 1 to expose a usable URL');
  assert(ambientAudioTracks[1]?.url.length, 'expected bundled ambient track 2 to expose a usable URL');
  assert(ambientAudioTracks.some(({ url }) => url.includes('ambient-1')), 'expected bundled manifest to include ambient-1.mp3');
  assert(ambientAudioTracks.some(({ url }) => url.includes('ambient-2')), 'expected bundled manifest to include ambient-2.mp3');
};

const runDurationHelperScenario = (): void => {
  const total = getPracticeDurationSeconds({
    phases: [
      { seconds: 20 },
      { seconds: 90 },
      { seconds: 20 },
    ],
  });

  assert(total === 130, 'expected practice duration helper to sum all exercise phases');
};

await runStartAndFailureScenarios();
await runPlaylistScenarios();
await runExerciseClockScenarios();
await runVolumeChangeScenario();
await runPlaybackHandlerReplacementScenario();
await runPlaybackPreservingControlScenario();
runBundledTrackManifestScenario();
runDurationHelperScenario();

console.log('ambient audio engine validation passed');
