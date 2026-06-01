import * as Phaser from 'phaser';

import { getSessionStore } from '../game/Game';
import { sceneKeys } from '../game/sceneKeys';

export class ReflectionScene extends Phaser.Scene {
  constructor() {
    super(sceneKeys.reflection);
  }

  create(): void {
    const sessionStore = getSessionStore(this);
    sessionStore.updateCurrentScene(sceneKeys.reflection);
  }
}
