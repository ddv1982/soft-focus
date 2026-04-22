import * as Phaser from 'phaser';

import { uiTheme } from '../theme';

export type BackButtonOptions = {
  x: number;
  y: number;
  label?: string;
  onPress?: () => void;
};

export const createBackButton = (
  scene: Phaser.Scene,
  options: BackButtonOptions,
): Phaser.GameObjects.Container => {
  const label = options.label ?? 'Back';
  const icon = scene.add.text(0, 0, '←', {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '18px',
    fontStyle: '600',
  });
  icon.setOrigin(0, 0.5);

  const text = scene.add.text(icon.width + uiTheme.spacing.xs, 0, label, {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '15px',
    fontStyle: '600',
  });
  text.setOrigin(0, 0.5);

  const hitWidth = icon.width + uiTheme.spacing.xs + text.width + uiTheme.spacing.md;
  const hitHeight = 36;
  const hitArea = scene.add.rectangle(hitWidth / 2, 0, hitWidth, hitHeight, 0x000000, 0.001)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  const container = scene.add.container(options.x, options.y, [hitArea, icon, text]);
  container.setSize(hitWidth, hitHeight);

  const setIdle = (): void => {
    icon.setColor(uiTheme.colors.textMuted);
    text.setColor(uiTheme.colors.textMuted);
    container.setAlpha(0.9);
    container.setScale(1);
  };

  const setHover = (): void => {
    icon.setColor(uiTheme.colors.text);
    text.setColor(uiTheme.colors.text);
    container.setAlpha(1);
  };

  hitArea.on('pointerover', setHover);
  hitArea.on('pointerout', setIdle);
  hitArea.on('pointerdown', () => {
    container.setScale(uiTheme.motion.pressScale);
  });
  hitArea.on('pointerup', () => {
    setHover();
    options.onPress?.();
  });

  setIdle();

  return container;
};
