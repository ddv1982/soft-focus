import type Phaser from 'phaser';
import { Game } from 'phaser';
import { EntryScene } from '../scenes/EntryScene';
import { createSessionStore, SessionStore } from '../state/sessionStore';

import { createGameConfig } from './config';
import { initialSceneKey, type SceneKey, sceneKeys } from './sceneKeys';
import { sessionStoreRegistryKey } from './serviceKeys';

export interface SceneDefinition {
  key: SceneKey;
  scene: Phaser.Types.Scenes.SceneType;
}

type SceneLoader = () => Promise<Phaser.Types.Scenes.SceneType>;

export const initialSceneDefinitions: readonly SceneDefinition[] = [
  {
    key: initialSceneKey,
    scene: EntryScene,
  },
];

export const lazySceneLoaders: Readonly<
  Record<Exclude<SceneKey, typeof initialSceneKey>, SceneLoader>
> = {
  [sceneKeys.exerciseSelection]: async () =>
    (await import('../scenes/ExerciseSelectionScene')).ExerciseSelectionScene,
  [sceneKeys.phrase]: async () => (await import('../scenes/PhraseScene')).PhraseScene,
  [sceneKeys.instructions]: async () =>
    (await import('../scenes/InstructionsScene')).InstructionsScene,
  [sceneKeys.practice]: async () => (await import('../scenes/PracticeScene')).PracticeScene,
  [sceneKeys.completion]: async () => (await import('../scenes/CompletionScene')).CompletionScene,
  [sceneKeys.reflection]: async () => (await import('../scenes/ReflectionScene')).ReflectionScene,
};

export class SoftFocusGame extends Game {
  readonly sessionStore: SessionStore;

  readonly registeredSceneKeys: readonly SceneKey[];

  readonly initialSceneKey: SceneKey;

  private readonly loadedSceneKeys = new Set<SceneKey>();

  private readonly sceneLoaderPromises = new Map<SceneKey, Promise<void>>();

  constructor(parent: HTMLElement, scenes: SceneDefinition[] = [...initialSceneDefinitions]) {
    super(
      createGameConfig(
        parent,
        scenes.map(({ scene }) => scene),
      ),
    );

    this.sessionStore = createSessionStore();
    this.registeredSceneKeys = [
      initialSceneKey,
      ...(Object.keys(lazySceneLoaders) as Exclude<SceneKey, typeof initialSceneKey>[]),
    ];
    this.initialSceneKey = this.registeredSceneKeys[0] ?? initialSceneKey;
    scenes.forEach(({ key }) => {
      this.loadedSceneKeys.add(key);
    });

    this.registry.set(sessionStoreRegistryKey, this.sessionStore);
  }

  async ensureSceneRegistered(sceneKey: SceneKey): Promise<void> {
    if (this.loadedSceneKeys.has(sceneKey)) {
      return;
    }

    const existingPromise = this.sceneLoaderPromises.get(sceneKey);

    if (existingPromise) {
      await existingPromise;
      return;
    }

    const loader = lazySceneLoaders[sceneKey as keyof typeof lazySceneLoaders] as
      | SceneLoader
      | undefined;

    if (!loader) {
      throw new Error(`No lazy scene loader is registered for scene key: ${sceneKey}`);
    }

    const loadPromise = (async () => {
      const sceneType = await loader();
      this.scene.add(sceneKey, sceneType, false);
      this.loadedSceneKeys.add(sceneKey);
    })();

    this.sceneLoaderPromises.set(sceneKey, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.sceneLoaderPromises.delete(sceneKey);
    }
  }
}

export const getSoftFocusGame = (scene: Phaser.Scene): SoftFocusGame => scene.game as SoftFocusGame;

export const getSessionStore = (scene: Phaser.Scene): SessionStore => {
  const sessionStore = scene.registry.get(sessionStoreRegistryKey);

  if (!(sessionStore instanceof SessionStore)) {
    throw new Error('Session store has not been registered on the game registry.');
  }

  return sessionStore;
};
