import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { sceneKeys } from '../game/sceneKeys';
import { getLayoutFrame } from '../ui/layout';
import { renderOceanBackground } from '../ui/oceanBackground';

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

    renderOceanBackground(this, { frame });
  }
}
