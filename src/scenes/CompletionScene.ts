import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { sceneKeys } from '../game/sceneKeys';
import { getLayoutFrame } from '../ui/layout';
import { renderOceanBackground } from '../ui/oceanBackground';

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

    const frame = getLayoutFrame({
      width: this.scale.width,
      height: this.scale.height,
    });
    void data;

    renderOceanBackground(this, { frame });
  }
}
