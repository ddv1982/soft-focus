import * as Phaser from 'phaser';

import { clampContentWidth } from '../layout';
import { uiTheme } from '../theme';

export type ScreenTitleOptions = {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
  width?: number;
};

export const createScreenTitle = (
  scene: Phaser.Scene,
  options: ScreenTitleOptions,
): Phaser.GameObjects.Container => {
  const width = clampContentWidth(options.width ?? 320);
  const title = scene.add.text(0, 0, options.title, {
    color: uiTheme.colors.text,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: `${uiTheme.typography.titleSize}px`,
    fontStyle: '600',
    align: 'center',
    wordWrap: { width, useAdvancedWrap: true },
    lineSpacing: uiTheme.typography.titleLineHeight - uiTheme.typography.titleSize,
  });
  title.setOrigin(0.5, 0);

  const children: Phaser.GameObjects.GameObject[] = [title];
  let height = title.height;

  if (options.subtitle) {
    const subtitle = scene.add.text(0, title.height + uiTheme.spacing.sm, options.subtitle, {
      color: uiTheme.colors.textMuted,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: `${uiTheme.typography.bodySize}px`,
      align: 'center',
      wordWrap: { width, useAdvancedWrap: true },
      lineSpacing: uiTheme.typography.bodyLineHeight - uiTheme.typography.bodySize,
    });
    subtitle.setOrigin(0.5, 0);
    children.push(subtitle);
    height = subtitle.y + subtitle.height;
  }

  const container = scene.add.container(options.x, options.y, children);
  container.setSize(width, height);

  return container;
};
