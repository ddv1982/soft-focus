import * as Phaser from 'phaser';

import { appViewport, getViewportSize } from '../ui/layout';

export const createGameConfig = (
  parent: HTMLElement,
  scenes: Phaser.Types.Scenes.SceneType[] = [],
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  scene: scenes,
  backgroundColor: 'rgba(0, 0, 0, 0)',
  ...getViewportSize(parent),
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
    min: {
      width: appViewport.minWidth,
      height: appViewport.landscapeMinHeight,
    },
  },
  antialias: true,
  pixelArt: false,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    transparent: true,
  },
});
