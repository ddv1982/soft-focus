import * as Phaser from 'phaser';

import { clampContentWidth } from '../layout';
import { uiTheme } from '../theme';

export type CardOptions = {
  x: number;
  y: number;
  width?: number;
  height: number;
  alpha?: number;
  clampWidth?: boolean;
};

export const createCard = (
  scene: Phaser.Scene,
  options: CardOptions,
): Phaser.GameObjects.Rectangle => {
  const width = options.clampWidth === false
    ? (options.width ?? 320)
    : clampContentWidth(options.width ?? 320);
  const card = scene.add.rectangle(
    options.x,
    options.y,
    width,
    options.height,
    Number.parseInt(uiTheme.colors.surface.slice(1), 16),
    options.alpha ?? uiTheme.motion.reducedAlpha,
  );

  card.setOrigin(0.5, 0);
  card.setStrokeStyle(1, Number.parseInt(uiTheme.colors.border.slice(1), 16), 0.9);

  return card;
};
