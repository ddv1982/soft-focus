import * as Phaser from 'phaser';

import { withTextResolution } from '../textResolution';
import { hexToNumber, uiTheme } from '../theme';

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
  const icon = scene.add.text(
    uiTheme.spacing.sm,
    0,
    '←',
    withTextResolution({
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '18px',
      fontStyle: '600',
    }),
  );
  icon.setOrigin(0, 0.5);

  const text = scene.add.text(
    uiTheme.spacing.sm + icon.width + uiTheme.spacing.xs,
    0,
    label,
    withTextResolution({
      color: uiTheme.colors.text,
      fontFamily: uiTheme.typography.fontFamily,
      fontSize: '15px',
      fontStyle: '600',
    }),
  );
  text.setOrigin(0, 0.5);

  const hitWidth = icon.width + uiTheme.spacing.xs + text.width + uiTheme.spacing.sm * 2;
  const hitHeight = 44;
  const hitArea = scene.add
    .rectangle(
      hitWidth / 2,
      0,
      hitWidth,
      hitHeight,
      hexToNumber(uiTheme.colors.surfaceRaised),
      0.64,
    )
    .setOrigin(0.5)
    .setStrokeStyle(1, hexToNumber(uiTheme.colors.border), 0.38)
    .setInteractive({ useHandCursor: true });

  const container = scene.add.container(options.x, options.y, [hitArea, icon, text]);
  container.setSize(hitWidth, hitHeight);

  const setIdle = (): void => {
    icon.setColor(uiTheme.colors.text);
    text.setColor(uiTheme.colors.text);
    hitArea.setFillStyle(hexToNumber(uiTheme.colors.surfaceRaised), 0.64);
    container.setAlpha(0.94);
    container.setScale(1);
  };

  const setHover = (): void => {
    icon.setColor(uiTheme.colors.accent);
    text.setColor(uiTheme.colors.text);
    hitArea.setFillStyle(hexToNumber(uiTheme.colors.surfaceMist), 0.72);
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
