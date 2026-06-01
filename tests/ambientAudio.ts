import {
  type AmbientAudioContext,
  type AmbientAudioElement,
  AmbientAudioEngine,
  type AmbientAudioSettings,
  type AmbientAudioTrack,
  AmbientAudioUnavailableError,
  ambientAudioTracks,
  getPracticeDurationSeconds,
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

class FakeWebAudioContext {
  constructor({
    deferResume = false,
    failCreateMediaElementSource = false,
    failCreateGain = false,
    failSourceConnect = false,
    failGainConnect = false,
    resumeError = null,
    closeError = null,
  }: {
    deferResume?: boolean;
    failCreateMediaElementSource?: boolean;
    failCreateGain?: boolean;
    failSourceConnect?: boolean;
    failGainConnect?: boolean;
    resumeError?: unknown;
    closeError?: unknown;
  } = {}) {
    this.deferResume = deferResume;
    this.failCreateMediaElementSource = failCreateMediaElementSource;
    this.failCreateGain = failCreateGain;
    this.failSourceConnect = failSourceConnect;
    this.failGainConnect = failGainConnect;
    this.resumeError = resumeError;
    this.closeError = closeError;
  }

  currentTime = 12;

  destination = {};

  state: AudioContextState = 'suspended';

  gainValue = 0;

  resumeCalls = 0;

  closeCalls = 0;

  sourceConnectCalls = 0;

  sourceDisconnectCalls = 0;

  gainConnectCalls = 0;

  gainDisconnectCalls = 0;

  get gainDirectValue(): number {
    return this.gainNode.gain.value;
  }

  private readonly deferResume: boolean;

  private readonly failCreateMediaElementSource: boolean;

  private readonly failCreateGain: boolean;

  private readonly failSourceConnect: boolean;

  private readonly failGainConnect: boolean;

  private readonly resumeError: unknown;

  private readonly closeError: unknown;

  private resumeResolver: (() => void) | null = null;

  private readonly sourceNode = {
    connect: (destinationNode: AudioNode): AudioNode => {
      this.sourceConnectCalls += 1;

      if (this.failSourceConnect) {
        throw new Error('source connect failed');
      }

      return destinationNode;
    },
    disconnect: (): void => {
      this.sourceDisconnectCalls += 1;
    },
  } as MediaElementAudioSourceNode;

  private readonly gainNode = {
    gain: {
      value: 1,
      cancelScheduledValues: () => this.gainNode.gain,
      setTargetAtTime: (target: number) => {
        this.gainValue = target;
        return this.gainNode.gain;
      },
      setValueAtTime: (value: number) => {
        this.gainValue = value;
        this.gainNode.gain.value = value;
        return this.gainNode.gain;
      },
    },
    connect: (destinationNode: AudioNode): AudioNode => {
      this.gainConnectCalls += 1;

      if (this.failGainConnect) {
        throw new Error('gain connect failed');
      }

      return destinationNode;
    },
    disconnect: (): void => {
      this.gainDisconnectCalls += 1;
    },
  } as unknown as GainNode;

  createGain(): GainNode {
    if (this.failCreateGain) {
      throw new Error('create gain failed');
    }

    return this.gainNode;
  }

  createMediaElementSource(): MediaElementAudioSourceNode {
    if (this.failCreateMediaElementSource) {
      throw new Error('media element source failed');
    }

    return this.sourceNode;
  }

  resume(): Promise<void> {
    this.resumeCalls += 1;

    if (this.resumeError) {
      return Promise.reject(this.resumeError);
    }

    if (this.deferResume) {
      return new Promise((resolve) => {
        this.resumeResolver = () => {
          this.state = 'running';
          resolve();
        };
      });
    }

    this.state = 'running';
    return Promise.resolve();
  }

  resolveResume(): void {
    this.resumeResolver?.();
    this.resumeResolver = null;
  }

  close(): Promise<void> {
    this.closeCalls += 1;
    this.state = 'closed';

    if (this.closeError) {
      return Promise.reject(this.closeError);
    }

    return Promise.resolve();
  }
}

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
  audioContext = null,
  audioContextFactory,
  audioFactory,
}: {
  fakeAudio?: FakeAudioElement;
  playlist?: readonly AmbientAudioTrack[];
  errors?: unknown[];
  audioContext?: FakeWebAudioContext | null;
  audioContextFactory?: () => AmbientAudioContext | null;
  audioFactory?: () => AmbientAudioElement | null;
} = {}): {
  engine: AmbientAudioEngine;
  fakeAudio: FakeAudioElement;
  errors: unknown[];
  audioContext: FakeWebAudioContext | null;
} => ({
  fakeAudio,
  errors,
  audioContext,
  engine: new AmbientAudioEngine(settings, {
    tracks: playlist,
    audioFactory: audioFactory ?? (() => fakeAudio),
    audioContextFactory: audioContextFactory ?? (() => audioContext as AmbientAudioContext | null),
    onPlaybackError: (error) => {
      errors.push(error);
    },
  }),
});

const runStartAndFailureScenarios = async (): Promise<void> => {
  const { engine, fakeAudio } = createEngine();

  await engine.start();
  assert(fakeAudio.playCalls === 1, 'expected ambient start to call play once');
  assert(
    fakeAudio.src === tracks[0]?.url,
    'expected ambient start to load the first bundled track',
  );
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

  assert(
    surfacedError === playError,
    'expected start playback rejection to be surfaced to the caller',
  );
  assert(!rejected.engine.isPlaying(), 'expected rejected start to leave the engine stopped');

  const empty = createEngine({ playlist: [] });
  let unavailable: unknown = null;

  try {
    await empty.engine.start();
  } catch (error) {
    unavailable = error;
  }

  assert(
    unavailable instanceof AmbientAudioUnavailableError,
    'expected empty playlist start to reject explicitly',
  );
  assert(
    unavailable.reason === 'empty-playlist',
    'expected empty playlist rejection to include a stable reason',
  );
};

const runPlaylistScenarios = async (): Promise<void> => {
  const { engine, fakeAudio } = createEngine();

  await engine.start();
  fakeAudio.triggerEnded();
  assert(
    fakeAudio.src === tracks[1]?.url,
    'expected natural ended event to advance to the next track',
  );
  const playCallsAfterEnded: number = fakeAudio.playCalls;
  assert(playCallsAfterEnded === 2, 'expected natural track advance to keep playback active');

  fakeAudio.triggerError();
  assert(
    fakeAudio.src === tracks[0]?.url,
    'expected track error to skip to the next playable bundled track',
  );
  const playCallsAfterError: number = fakeAudio.playCalls;
  assert(playCallsAfterError === 3, 'expected track error skip to attempt continued playback');

  const failedPlaylist = createEngine();
  await failedPlaylist.engine.start();
  failedPlaylist.fakeAudio.triggerError();
  failedPlaylist.fakeAudio.triggerError();
  assert(
    failedPlaylist.errors.length === 1,
    'expected all failed playlist tracks to surface one playback error',
  );
  assert(
    !failedPlaylist.engine.isPlaying(),
    'expected all failed playlist tracks to stop playback',
  );
};

const runExerciseClockScenarios = async (): Promise<void> => {
  const { engine, fakeAudio } = createEngine();

  await engine.start();
  const initialVolume = fakeAudio.volume;

  engine.syncExerciseClock({ totalSecondsRemaining: 72 });
  assert(
    fakeAudio.src === tracks[0]?.url,
    'expected exercise clock sync not to interrupt the current song',
  );

  engine.syncExerciseClock({ totalSecondsRemaining: 70 });
  assert(
    fakeAudio.src === tracks[0]?.url,
    'expected first track to keep playing past the exercise midpoint',
  );
  assert(
    fakeAudio.playCalls === 1,
    'expected exercise clock sync not to start the next song early',
  );

  engine.syncExerciseClock({ totalSecondsRemaining: 4 });
  assert(
    fakeAudio.src === tracks[0]?.url,
    'expected final fade to preserve the current song position',
  );
  assert(
    fakeAudio.volume > 0,
    'expected final fade to remain audible before the exercise reaches zero',
  );
  assert(
    fakeAudio.volume < initialVolume,
    'expected final fade to reduce volume inside the last five exercise seconds',
  );

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
  assert(
    loweredVolume < initialVolume,
    'expected setVolume to lower the fake audio element volume after playback starts',
  );

  engine.setVolume(90);
  assert(
    fakeAudio.volume > loweredVolume,
    'expected setVolume to raise the fake audio element volume after playback starts',
  );
  assert(
    fakeAudio.volume <= 1,
    'expected raised ambient volume to stay within browser audio volume bounds',
  );
};

const runWebAudioGainScenario = async (): Promise<void> => {
  const audioContext = new FakeWebAudioContext({ deferResume: true });
  const { engine, fakeAudio } = createEngine({ audioContext });

  const startPromise = engine.start();
  assert(fakeAudio.playCalls === 1, 'expected playback to start before awaiting Web Audio resume');
  audioContext.resolveResume();
  await startPromise;
  const initialGain = audioContext.gainValue;

  assert(
    audioContext.sourceConnectCalls === 1,
    'expected Web Audio source to connect once during ambient start',
  );
  assert(
    audioContext.gainConnectCalls === 1,
    'expected Web Audio gain node to connect once during ambient start',
  );
  assert(
    audioContext.resumeCalls === 1,
    'expected suspended Web Audio context to resume before playback',
  );
  assert(
    fakeAudio.volume === 1,
    'expected media element volume to stay full when Web Audio gain is active',
  );
  assert(
    initialGain > 0 && initialGain <= 1,
    'expected initial Web Audio gain to receive the resolved output volume',
  );
  assert(
    audioContext.gainDirectValue === initialGain,
    'expected initial Web Audio gain to be assigned before scheduled volume automation',
  );

  engine.setVolume(25);
  assert(audioContext.gainValue > 0, 'expected lowered Web Audio gain to remain audible');
  assert(audioContext.gainValue < initialGain, 'expected volume change to lower Web Audio gain');
  assert(fakeAudio.volume === 1, 'expected media element volume to remain full after gain updates');

  engine.syncExerciseClock({ totalSecondsRemaining: 0 });
  assert(
    audioContext.gainValue === 0,
    'expected exercise fade to reach zero through Web Audio gain',
  );
  assert(
    audioContext.gainDirectValue === 0,
    'expected exercise fade completion to set Web Audio gain exactly to zero',
  );

  engine.dispose({ fadeOutSeconds: 0 });
  assert(
    audioContext.sourceDisconnectCalls === 1,
    'expected Web Audio source to disconnect on dispose',
  );
  assert(
    audioContext.gainDisconnectCalls === 1,
    'expected Web Audio gain node to disconnect on dispose',
  );
  assert(audioContext.closeCalls === 1, 'expected Web Audio context to close on dispose');
};

const runWebAudioFallbackScenarios = async (): Promise<void> => {
  const constructionFailureAudio = new FakeAudioElement();
  const constructionFailure = createEngine({
    fakeAudio: constructionFailureAudio,
    audioContextFactory: () => {
      throw new Error('audio context construction failed');
    },
  });

  await constructionFailure.engine.start();
  assert(
    constructionFailureAudio.playCalls === 1,
    'expected playback to continue when AudioContext construction fails',
  );
  assert(
    constructionFailureAudio.volume > 0 && constructionFailureAudio.volume < 1,
    'expected direct media element volume fallback after AudioContext construction failure',
  );

  const sourceFailureAudio = new FakeAudioElement();
  const sourceFailureContext = new FakeWebAudioContext({ failCreateMediaElementSource: true });
  const sourceFailure = createEngine({
    fakeAudio: sourceFailureAudio,
    audioContext: sourceFailureContext,
  });

  await sourceFailure.engine.start();
  assert(
    sourceFailureAudio.playCalls === 1,
    'expected playback to continue when media source creation fails',
  );
  assert(
    sourceFailureAudio.volume > 0 && sourceFailureAudio.volume < 1,
    'expected direct media element volume fallback after media source creation failure',
  );
  assert(
    sourceFailureContext.closeCalls === 1,
    'expected failed Web Audio context to close after source creation failure',
  );
};

const runWebAudioResumeRejectionScenario = async (): Promise<void> => {
  const resumeError = new Error('resume failed');
  const audioContext = new FakeWebAudioContext({ resumeError });
  const { engine, fakeAudio } = createEngine({ audioContext });
  let surfacedError: unknown = null;

  try {
    await engine.start();
  } catch (error) {
    surfacedError = error;
  }

  assert(surfacedError === resumeError, 'expected resume rejection to surface the original error');
  assert(
    fakeAudio.playCalls === 1,
    'expected playback to be attempted in the same activation turn as resume',
  );
  assert(fakeAudio.pauseCalls >= 1, 'expected resume rejection cleanup to pause the media element');
  assert(fakeAudio.paused, 'expected media element to be paused after resume rejection cleanup');
  assert(!engine.isPlaying(), 'expected engine to stop after resume rejection');
  assert(
    audioContext.closeCalls === 1,
    'expected Web Audio context to close after resume rejection',
  );
};

const runPartialGraphFailureUsesFreshAudioScenario = async (): Promise<void> => {
  const firstAudio = new FakeAudioElement();
  const fallbackAudio = new FakeAudioElement();
  const audioContext = new FakeWebAudioContext({ failCreateGain: true });
  const audioElements = [firstAudio, fallbackAudio];
  const { engine } = createEngine({
    fakeAudio: fallbackAudio,
    audioContext,
    audioFactory: () => audioElements.shift() ?? null,
  });

  await engine.start();

  assert(
    firstAudio.playCalls === 0,
    'expected rerouted media element not to be used for fallback playback',
  );
  assert(
    firstAudio.pauseCalls >= 1,
    'expected rerouted media element to be retired after graph setup failure',
  );
  assert(
    firstAudio.loadCalls >= 1,
    'expected rerouted media element to be unloaded after graph setup failure',
  );
  assert(
    fallbackAudio.playCalls === 1,
    'expected fresh media element to be used for direct fallback playback',
  );
  assert(
    fallbackAudio.src === tracks[0]?.url,
    'expected fresh fallback audio to receive the current track source',
  );
  assert(
    fallbackAudio.volume > 0 && fallbackAudio.volume < 1,
    'expected fresh fallback audio to use direct element volume',
  );
  assert(engine.isPlaying(), 'expected engine to keep playing through fresh direct fallback');
  assert(
    audioContext.closeCalls === 1,
    'expected failed Web Audio context to close after partial graph setup failure',
  );
};

const runRejectedClosePromiseScenario = async (): Promise<void> => {
  const audioContext = new FakeWebAudioContext({ closeError: new Error('close failed') });
  const { engine } = createEngine({ audioContext });

  await engine.start();
  engine.dispose({ fadeOutSeconds: 0 });
  await Promise.resolve();

  assert(
    audioContext.closeCalls === 1,
    'expected rejected close promise to be observed and suppressed',
  );
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

  assert(
    firstErrors.length === 0,
    'expected replaced playback error handler not to receive later failures',
  );
  assert(
    secondErrors.length === 1,
    'expected replacement playback error handler to receive later failures',
  );
};

const runPlaybackPreservingControlScenario = async (): Promise<void> => {
  const { engine, fakeAudio } = createEngine();

  await engine.start();
  engine.syncExerciseClock({ totalSecondsRemaining: 3 });
  engine.setVolume(40);
  engine.setPreset(ambientAudioPresetIds.clearBells);

  assert(
    fakeAudio.playCalls === 1,
    'expected clock, volume, and preset updates not to replay started audio',
  );
  assert(engine.isPlaying(), 'expected engine to keep playing after non-start control updates');
};

const runBundledTrackManifestScenario = (): void => {
  assert(
    ambientAudioTracks.length >= 2,
    'expected bundled ambient track manifest to expose both MP3s outside Vite runtime',
  );
  assert(
    ambientAudioTracks[0]?.url.length,
    'expected bundled ambient track 1 to expose a usable URL',
  );
  assert(
    ambientAudioTracks[1]?.url.length,
    'expected bundled ambient track 2 to expose a usable URL',
  );
  assert(
    ambientAudioTracks.some(({ url }) => url.includes('ambient-1')),
    'expected bundled manifest to include ambient-1.mp3',
  );
  assert(
    ambientAudioTracks.some(({ url }) => url.includes('ambient-2')),
    'expected bundled manifest to include ambient-2.mp3',
  );
};

const runDurationHelperScenario = (): void => {
  const total = getPracticeDurationSeconds({
    phases: [{ seconds: 20 }, { seconds: 90 }, { seconds: 20 }],
  });

  assert(total === 130, 'expected practice duration helper to sum all exercise phases');
};

await runStartAndFailureScenarios();
await runPlaylistScenarios();
await runExerciseClockScenarios();
await runVolumeChangeScenario();
await runWebAudioGainScenario();
await runWebAudioFallbackScenarios();
await runWebAudioResumeRejectionScenario();
await runPartialGraphFailureUsesFreshAudioScenario();
await runRejectedClosePromiseScenario();
await runPlaybackHandlerReplacementScenario();
await runPlaybackPreservingControlScenario();
runBundledTrackManifestScenario();
runDurationHelperScenario();

console.log('ambient audio engine validation passed');
