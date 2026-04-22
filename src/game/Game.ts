import { Game } from 'phaser';
import type Phaser from 'phaser';

import { SessionStore, createSessionStore } from '../state/sessionStore';
import { EntryScene } from '../scenes/EntryScene';
import { ExerciseSelectionScene } from '../scenes/ExerciseSelectionScene';
import { InstructionsScene } from '../scenes/InstructionsScene';
import { PhraseScene } from '../scenes/PhraseScene';
import { PracticeScene } from '../scenes/PracticeScene';
import { CompletionScene } from '../scenes/CompletionScene';
import { ReflectionScene } from '../scenes/ReflectionScene';

import { createGameConfig } from './config';
import { sessionStoreRegistryKey } from './serviceKeys';
import { sceneKeys } from './sceneKeys';
import { initialSceneKey, type SceneKey } from './sceneKeys';

export interface SceneDefinition {
  key: SceneKey;
  scene: Phaser.Types.Scenes.SceneType;
}

export const defaultSceneDefinitions: readonly SceneDefinition[] = [
  {
    key: initialSceneKey,
    scene: EntryScene,
  },
  {
    key: sceneKeys.exerciseSelection,
    scene: ExerciseSelectionScene,
  },
  {
    key: sceneKeys.phrase,
    scene: PhraseScene,
  },
  {
    key: sceneKeys.instructions,
    scene: InstructionsScene,
  },
  {
    key: sceneKeys.practice,
    scene: PracticeScene,
  },
  {
    key: sceneKeys.completion,
    scene: CompletionScene,
  },
  {
    key: sceneKeys.reflection,
    scene: ReflectionScene,
  },
];

export class SoftFocusGame extends Game {
  readonly sessionStore: SessionStore;

  readonly registeredSceneKeys: readonly SceneKey[];

  readonly initialSceneKey: SceneKey;

  constructor(parent: HTMLElement, scenes: SceneDefinition[] = [...defaultSceneDefinitions]) {
    super(createGameConfig(
      parent,
      scenes.map(({ scene }) => scene),
    ));

    this.sessionStore = createSessionStore();
    this.registeredSceneKeys = scenes.map(({ key }) => key);
    this.initialSceneKey = this.registeredSceneKeys[0] ?? initialSceneKey;

    this.registry.set(sessionStoreRegistryKey, this.sessionStore);
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
