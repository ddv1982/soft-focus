import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { sceneKeys } from '../game/sceneKeys';
import { getLayoutFrame } from '../ui/layout';
import { uiTheme } from '../ui/theme';

export class ReflectionScene extends Phaser.Scene {
  constructor() {
    super(sceneKeys.reflection);
  }

  create(): void {
    const sessionStore = getSessionStore(this);
    sessionStore.updateCurrentScene(sceneKeys.reflection);

    const frame = getLayoutFrame({
      width: this.scale.width,
      height: this.scale.height,
    });

    this.add.rectangle(
      frame.width / 2,
      frame.height / 2,
      frame.width,
      frame.height,
      Number.parseInt(uiTheme.colors.background.slice(1), 16),
    );
  }
}
