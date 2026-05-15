import {
  ambientAudioPresetIds,
  type AmbientAudioPresetId,
  type ExerciseId,
} from '../state/types';

export interface AmbientAudioSettings {
  enabled: boolean;
  presetId: AmbientAudioPresetId;
  volume: number;
}

export type AmbientEnergyLevel = 'very-low' | 'low' | 'moderate';

export type AmbientModeName = 'ionian' | 'lydian' | 'mixolydian' | 'major-pentatonic' | 'minor-pentatonic';

export type AmbientLayerKind = 'drone' | 'pad' | 'air' | 'field' | 'bell' | 'bowl' | 'kalimba';

export interface AmbientMusicTheoryDescriptor {
  tonalCenter: string;
  mode: AmbientModeName;
  harmonicPalette: readonly string[];
  harmonicRhythm: string;
  rhythmFeel: string;
}

export interface AmbientLayerRecipe {
  kind: AmbientLayerKind;
  role: string;
  texture: string;
  density: 'continuous' | 'slow' | 'sparse' | 'occasional';
}

export interface AmbientSoundDesignMetadata {
  scaleFocus: string;
  tuningSystem: string;
  dynamicShape: string;
  modulation: string;
  impulseVoice: string;
}

export interface AmbientSpatialProfile {
  width: 'narrow' | 'medium' | 'wide';
  depth: 'close' | 'soft-delay' | 'distant';
  motion: 'still' | 'gentle-drift';
}

export interface AmbientPracticeFitMetadata {
  energy: AmbientEnergyLevel;
  mood: readonly string[];
  motifDensity: 'minimal' | 'light' | 'moderate';
  recommendedExercises: readonly ExerciseId[];
  avoids: readonly string[];
}

export interface AmbientRenderDescriptor {
  playlistMode: 'asset-playlist';
  fadeOutLeadSeconds: number;
}

export interface AmbientCompositionPreset {
  id: AmbientAudioPresetId;
  title: string;
  summary: string;
  description: string;
  musicTheory: AmbientMusicTheoryDescriptor;
  layers: readonly AmbientLayerRecipe[];
  soundDesign: AmbientSoundDesignMetadata;
  spatialProfile: AmbientSpatialProfile;
  practiceFit: AmbientPracticeFitMetadata;
  render: AmbientRenderDescriptor;
}

export interface AmbientAudioTrack {
  title: string;
  url: string;
}

export interface AmbientAudioElement {
  preload: string;
  src: string;
  currentTime: number;
  volume: number;
  readonly paused: boolean;
  onended: HTMLAudioElement['onended'];
  onerror: HTMLAudioElement['onerror'];
  play: () => Promise<void>;
  pause: () => void;
  removeAttribute: (qualifiedName: string) => void;
  load: () => void;
}

export interface AmbientPlaybackErrorContext {
  action: 'start' | 'resume' | 'scheduled-track-switch' | 'natural-track-advance' | 'track-error-skip';
  trackIndex: number;
  track?: AmbientAudioTrack;
}

export interface AmbientAudioEngineOptions {
  tracks?: readonly AmbientAudioTrack[];
  audioFactory?: () => AmbientAudioElement | null;
  onPlaybackError?: (error: unknown, context: AmbientPlaybackErrorContext) => void;
}

export type AmbientAudioStartResult = { ok: true } | { ok: false; error: unknown };

export interface AmbientAudioStartHandle {
  engine: AmbientAudioEngine;
  settings: AmbientAudioSettings;
  startResult: Promise<AmbientAudioStartResult>;
  totalDurationSeconds: number;
}

export class AmbientAudioUnavailableError extends Error {
  readonly reason: 'empty-playlist' | 'audio-unavailable';

  constructor(reason: 'empty-playlist' | 'audio-unavailable') {
    super(reason === 'empty-playlist'
      ? 'Ambient music is enabled, but no bundled ambient audio tracks are available.'
      : 'Ambient music is enabled, but this runtime does not provide a browser audio element.');
    this.name = 'AmbientAudioUnavailableError';
    this.reason = reason;
  }
}

const supportedAmbientTrackModules: Record<string, string> = {
  '../assets/audio/ambient/ambient-1.mp3': new URL('../assets/audio/ambient/ambient-1.mp3', import.meta.url).href,
  '../assets/audio/ambient/ambient-2.mp3': new URL('../assets/audio/ambient/ambient-2.mp3', import.meta.url).href,
};

const trackNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const formatTrackTitle = (path: string): string => {
  const filename = path.split('/').pop() ?? path;
  const name = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();

  return name.length > 0 ? name.replace(/\b\w/g, (letter) => letter.toUpperCase()) : filename;
};

export const ambientAudioTracks: readonly AmbientAudioTrack[] = Object.entries(supportedAmbientTrackModules)
  .sort(([left], [right]) => trackNameCollator.compare(left, right))
  .map(([path, url]) => ({
    title: formatTrackTitle(path),
    url,
  }));

const playlistRender: AmbientRenderDescriptor = {
  playlistMode: 'asset-playlist',
  fadeOutLeadSeconds: 5,
};

const allExercises: readonly ExerciseId[] = [
  'phrase-anchor',
  'moving-ball',
  'breathing-reset',
  'bilateral-rhythm',
  'orienting',
];

const playlistLayers: readonly AmbientLayerRecipe[] = [
  { kind: 'drone', role: 'Recorded foundation', texture: 'Full-length mastered ambient bed from the local playlist', density: 'continuous' },
  { kind: 'pad', role: 'Recorded harmonic movement', texture: 'Sustained musical pads and evolving production from the source tracks', density: 'continuous' },
  { kind: 'bowl', role: 'Recorded spatial detail', texture: 'Soft mastered depth and transitions within each song file', density: 'slow' },
];

const playlistSoundDesign: AmbientSoundDesignMetadata = {
  scaleFocus: 'Recorded ambient songs supply the musical material; app playback preserves the mastered source files.',
  tuningSystem: 'Determined by the uploaded songs instead of in-browser synthesis.',
  dynamicShape: 'User volume scaling plus an exercise-ending five-second fade-out.',
  modulation: 'No generated modulation; tracks play in filename order and loop as a playlist for long sessions.',
  impulseVoice: 'Recorded song details replace synthesized impulses or motifs.',
};

const makePlaylistPreset = ({
  id,
  title,
  summary,
  recommendedExercises,
}: {
  id: AmbientAudioPresetId;
  title: string;
  summary: string;
  recommendedExercises: readonly ExerciseId[];
}): AmbientCompositionPreset => ({
  id,
  title,
  summary,
  description: 'Plays the uploaded ambient song playlist in order, then loops through every available track if the exercise lasts longer than the playlist.',
  musicTheory: {
    tonalCenter: 'Recorded playlist',
    mode: 'major-pentatonic',
    harmonicPalette: ['Recorded ambient song 1', 'Recorded ambient song 2', 'Additional uploaded ambient songs'],
    harmonicRhythm: 'Determined by the mastered tracks; the app sequences songs in filename order.',
    rhythmFeel: 'Sustained recorded ambience with no generated pulse from the app.',
  },
  layers: playlistLayers,
  soundDesign: playlistSoundDesign,
  spatialProfile: { width: 'wide', depth: 'distant', motion: 'gentle-drift' },
  practiceFit: {
    energy: 'very-low',
    mood: ['recorded', 'soothing', 'immersive', 'steady'],
    motifDensity: 'minimal',
    recommendedExercises,
    avoids: ['generated pulse', 'synthetic transient', 'browser melody', 'busy subdivision'],
  },
  render: playlistRender,
});

export const ambientCompositionPresets: Record<AmbientAudioPresetId, AmbientCompositionPreset> = {
  [ambientAudioPresetIds.openHorizon]: makePlaylistPreset({
    id: ambientAudioPresetIds.openHorizon,
    title: 'Ambient Playlist',
    summary: 'Plays your uploaded ambient songs from the beginning of the playlist.',
    recommendedExercises: ['phrase-anchor', 'orienting'],
  }),
  [ambientAudioPresetIds.emberDrift]: makePlaylistPreset({
    id: ambientAudioPresetIds.emberDrift,
    title: 'Ambient Playlist · Warm',
    summary: 'Uses the same uploaded songs with a warm practice-fit label for breathing and bilateral rounds.',
    recommendedExercises: ['breathing-reset', 'bilateral-rhythm', 'phrase-anchor'],
  }),
  [ambientAudioPresetIds.clearBells]: makePlaylistPreset({
    id: ambientAudioPresetIds.clearBells,
    title: 'Ambient Playlist · Clear',
    summary: 'Uses the same uploaded songs with a clear practice-fit label for moving and orienting rounds.',
    recommendedExercises: ['moving-ball', 'orienting'],
  }),
};

allExercises.forEach((exerciseId) => {
  if (!Object.values(ambientCompositionPresets).some(({ practiceFit }) => practiceFit.recommendedExercises.includes(exerciseId))) {
    throw new Error(`Ambient playlist metadata must include ${exerciseId}.`);
  }
});

export const getAmbientCompositionPreset = (presetId: AmbientAudioPresetId): AmbientCompositionPreset => ambientCompositionPresets[presetId];

const normalizeVolume = (volume: number): number => Math.min(1, Math.max(0, volume / 100));

const resolveOutputVolume = (volume: number): number => Math.pow(normalizeVolume(volume), 1.45) * 0.92;

const clampFadeMultiplier = (secondsRemaining: number): number => Math.min(1, Math.max(0, secondsRemaining / playlistRender.fadeOutLeadSeconds));

const getDefaultAudioFactory = (): AmbientAudioElement | null => {
  if (typeof Audio === 'undefined') {
    return null;
  }

  return new Audio();
};

const getNow = (): number => globalThis.performance?.now() ?? Date.now();

export const getPracticeDurationSeconds = ({ phases }: { phases: readonly { seconds: number }[] }): number => phases.reduce(
  (totalSeconds, phase) => totalSeconds + Math.max(0, phase.seconds),
  0,
);

export class AmbientAudioEngine {
  private audio: AmbientAudioElement | null = null;

  private currentSettings: AmbientAudioSettings;

  private trackIndex = 0;

  private playing = false;

  private fadeMultiplier = 1;

  private stopFadeTimer: ReturnType<typeof globalThis.setInterval> | null = null;

  private readonly tracks: readonly AmbientAudioTrack[];

  private readonly audioFactory: () => AmbientAudioElement | null;

  private onPlaybackError: (error: unknown, context: AmbientPlaybackErrorContext) => void;

  private failedTrackIndexes = new Set<number>();

  private highestExerciseTrackIndexIntroduced = 0;

  constructor(settings: AmbientAudioSettings, options: AmbientAudioEngineOptions = {}) {
    this.currentSettings = settings;
    this.tracks = options.tracks ?? ambientAudioTracks;
    this.audioFactory = options.audioFactory ?? getDefaultAudioFactory;
    this.onPlaybackError = options.onPlaybackError ?? (() => undefined);
  }

  async start(settings: AmbientAudioSettings = this.currentSettings): Promise<void> {
    this.currentSettings = settings;

    if (!settings.enabled) {
      return;
    }

    this.assertTracksAvailable();
    this.clearStopFadeTimer();
    this.trackIndex = 0;
    this.fadeMultiplier = 1;
    this.playing = true;
    this.failedTrackIndexes.clear();
    this.highestExerciseTrackIndexIntroduced = 0;
    this.loadTrack(this.trackIndex);
    this.applyVolume();
    await this.playCurrentTrack();
  }

  async resume(): Promise<void> {
    if (!this.currentSettings.enabled) {
      return;
    }

    this.assertTracksAvailable();

    if (!this.audio) {
      this.loadTrack(this.trackIndex);
    }

    this.clearStopFadeTimer();
    this.playing = true;
    this.applyVolume();
    await this.playCurrentTrack();
  }

  pause(): void {
    this.playing = false;
    this.audio?.pause();
  }

  stop(): void {
    if (!this.audio) {
      this.dispose();
      return;
    }

    this.fadeTo(0, 900, () => {
      this.dispose({ fadeOutSeconds: 0 });
    });
  }

  dispose({ fadeOutSeconds = 0.08 }: { fadeOutSeconds?: number } = {}): void {
    this.clearStopFadeTimer();
    this.playing = false;

    if (!this.audio) {
      return;
    }

    if (fadeOutSeconds > 0) {
      this.audio.volume = 0;
    }

    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.audio.onended = null;
    this.audio.onerror = null;
    this.audio = null;
  }

  setPlaybackErrorHandler(handler: (error: unknown, context: AmbientPlaybackErrorContext) => void): void {
    this.onPlaybackError = handler;
  }

  setVolume(volume: number): void {
    this.currentSettings = {
      ...this.currentSettings,
      volume,
    };
    this.applyVolume();
  }

  setPreset(presetId: AmbientAudioPresetId): void {
    this.currentSettings = {
      ...this.currentSettings,
      presetId,
    };
  }

  setExerciseTimeRemaining(secondsRemaining: number): void {
    if (!Number.isFinite(secondsRemaining)) {
      return;
    }

    this.fadeMultiplier = clampFadeMultiplier(secondsRemaining);
    this.applyVolume();
  }

  syncExerciseClock({
    totalSecondsRemaining,
    totalDurationSeconds,
  }: {
    totalSecondsRemaining: number;
    totalDurationSeconds: number;
  }): void {
    if (!Number.isFinite(totalSecondsRemaining) || !Number.isFinite(totalDurationSeconds)) {
      return;
    }

    this.fadeMultiplier = clampFadeMultiplier(totalSecondsRemaining);
    this.applyVolume();

    if (!this.playing || this.tracks.length <= 1 || totalDurationSeconds <= 0) {
      return;
    }

    const clampedRemaining = Math.min(Math.max(0, totalSecondsRemaining), totalDurationSeconds);
    const elapsedSeconds = totalDurationSeconds - clampedRemaining;
    const segmentSeconds = totalDurationSeconds / this.tracks.length;
    const scheduledTrackIndex = Math.min(this.tracks.length - 1, Math.floor(elapsedSeconds / Math.max(segmentSeconds, 1)));

    if (scheduledTrackIndex <= this.highestExerciseTrackIndexIntroduced) {
      return;
    }

    this.highestExerciseTrackIndexIntroduced = scheduledTrackIndex;
    this.switchToTrack(scheduledTrackIndex, 'scheduled-track-switch');
  }

  isPlaying(): boolean {
    return this.playing && this.audio !== null && !this.audio.paused;
  }

  private assertTracksAvailable(): void {
    if (this.tracks.length === 0) {
      throw new AmbientAudioUnavailableError('empty-playlist');
    }
  }

  private loadTrack(index: number): void {
    const track = this.tracks[index % this.tracks.length];

    if (!track) {
      return;
    }

    if (!this.audio) {
      this.audio = this.audioFactory();
      if (!this.audio) {
        throw new AmbientAudioUnavailableError('audio-unavailable');
      }
      this.audio.preload = 'auto';
    }

    this.audio.onended = () => {
      if (!this.playing) {
        return;
      }

      this.switchToTrack((this.trackIndex + 1) % this.tracks.length, 'natural-track-advance');
    };
    this.audio.onerror = () => {
      if (!this.playing) {
        return;
      }

      this.failedTrackIndexes.add(this.trackIndex);

      if (this.failedTrackIndexes.size >= this.tracks.length) {
        const error = new Error('Ambient music could not play any bundled playlist tracks.');
        this.playing = false;
        this.onPlaybackError(error, this.getPlaybackErrorContext('track-error-skip'));
        return;
      }

      this.switchToTrack(this.getNextPlayableTrackIndex(), 'track-error-skip');
    };
    this.audio.src = track.url;
    this.audio.currentTime = 0;
    this.applyVolume();
  }

  private switchToTrack(index: number, action: AmbientPlaybackErrorContext['action']): void {
    this.trackIndex = index % this.tracks.length;
    this.loadTrack(this.trackIndex);
    void this.playCurrentTrack().catch((error: unknown) => {
      this.playing = false;
      this.onPlaybackError(error, this.getPlaybackErrorContext(action));
    });
  }

  private getNextPlayableTrackIndex(): number {
    for (let offset = 1; offset <= this.tracks.length; offset += 1) {
      const nextIndex = (this.trackIndex + offset) % this.tracks.length;

      if (!this.failedTrackIndexes.has(nextIndex)) {
        return nextIndex;
      }
    }

    return this.trackIndex;
  }

  private async playCurrentTrack(): Promise<void> {
    if (!this.audio || !this.playing) {
      return;
    }

    try {
      await this.audio.play();
    } catch (error) {
      this.playing = false;
      throw error;
    }
  }

  private getPlaybackErrorContext(action: AmbientPlaybackErrorContext['action']): AmbientPlaybackErrorContext {
    return {
      action,
      trackIndex: this.trackIndex,
      track: this.tracks[this.trackIndex],
    };
  }

  private applyVolume(): void {
    if (!this.audio) {
      return;
    }

    this.audio.volume = Math.min(1, Math.max(0, resolveOutputVolume(this.currentSettings.volume) * this.fadeMultiplier));
  }

  private fadeTo(targetMultiplier: number, durationMs: number, onComplete: () => void): void {
    this.clearStopFadeTimer();

    const startMultiplier = this.fadeMultiplier;
    const startTime = getNow();
    this.stopFadeTimer = globalThis.setInterval(() => {
      const elapsed = getNow() - startTime;
      const progress = Math.min(1, elapsed / Math.max(1, durationMs));
      this.fadeMultiplier = startMultiplier + ((targetMultiplier - startMultiplier) * progress);
      this.applyVolume();

      if (progress >= 1) {
        this.clearStopFadeTimer();
        onComplete();
      }
    }, 50);
  }

  private clearStopFadeTimer(): void {
    if (this.stopFadeTimer !== null) {
      globalThis.clearInterval(this.stopFadeTimer);
      this.stopFadeTimer = null;
    }
  }
}

export const createAmbientAudioEngine = (
  settings: AmbientAudioSettings,
  options?: AmbientAudioEngineOptions,
): AmbientAudioEngine => new AmbientAudioEngine(settings, options);
