import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { sceneKeys } from '../game/sceneKeys';

interface CompletionSceneData {
  outcome?: 'completed' | 'stopped';
}

export class CompletionScene extends Phaser.Scene {
  constructor() {
    super(sceneKeys.completion);
  }

  create(data?: CompletionSceneData): void {
    const sessionStore = getSessionStore(this);
    sessionStore.updateCurrentScene(sceneKeys.completion);

    void data;
  }
}
