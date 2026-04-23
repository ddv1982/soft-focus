import * as Phaser from 'phaser';

import { clampContentWidth } from '../layout';
import { hexToNumber, uiTheme } from '../theme';

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
  const shadow = scene.add.rectangle(
    options.x,
    options.y + 18,
    width - 14,
    options.height - 4,
    uiTheme.colors.shadow,
    0.3,
  );
  shadow.setOrigin(0.5, 0);

  const halo = scene.add.rectangle(
    options.x,
    options.y - 1,
    width - 10,
    2,
    hexToNumber(uiTheme.colors.foam),
    0.18,
  );
  halo.setOrigin(0.5, 0);

  const card = scene.add.rectangle(
    options.x,
    options.y,
    width,
    options.height,
    hexToNumber(uiTheme.colors.surface),
    options.alpha ?? uiTheme.motion.reducedAlpha,
  );

  card.setOrigin(0.5, 0);
  card.setStrokeStyle(1, hexToNumber(uiTheme.colors.border), 0.34);

  const syncDecorationDepth = (depth: number) => {
    shadow.setDepth(depth - 2);
    halo.setDepth(depth - 1);
  };

  syncDecorationDepth(card.depth);

  const setCardDepth = card.setDepth.bind(card);
  card.setDepth = (depth: number) => {
    setCardDepth(depth);
    syncDecorationDepth(depth);

    return card;
  };

  return card;
};
