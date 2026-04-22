import * as Phaser from 'phaser';

import { appViewport, getViewportSize } from '../ui/layout';
import { uiTheme } from '../ui/theme';

export const createGameConfig = (
  parent: HTMLElement,
  scenes: Phaser.Types.Scenes.SceneType[] = [],
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  scene: scenes,
  backgroundColor: uiTheme.colors.background,
  ...getViewportSize(parent),
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
    min: {
      width: appViewport.minWidth,
      height: appViewport.minHeight,
    },
  },
  antialias: true,
  pixelArt: false,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    transparent: false,
  },
});
