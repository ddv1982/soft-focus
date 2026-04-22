import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { sceneKeys } from '../game/sceneKeys';
import { getLayoutFrame } from '../ui/layout';
import { uiTheme } from '../ui/theme';

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

    this.add.rectangle(
      frame.width / 2,
      frame.height / 2,
      frame.width,
      frame.height,
      Number.parseInt(uiTheme.colors.background.slice(1), 16),
    );
  }
}
