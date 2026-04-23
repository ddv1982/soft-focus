import * as Phaser from 'phaser';

import { appViewport, clampContentWidth } from '../layout';
import { hexToNumber, uiTheme } from '../theme';

export type PrimaryButtonOptions = {
  x: number;
  y: number;
  width?: number;
  label: string;
  onPress?: () => void;
};

const primaryButtonEnabledDataKey = 'primary-button:enabled';

export const getPrimaryButtonSize = (availableWidth: number) => {
  const width = clampContentWidth(availableWidth, appViewport.buttonMaxWidth);

  return {
    width,
    height: 56,
  };
};

export const createPrimaryButton = (
  scene: Phaser.Scene,
  options: PrimaryButtonOptions,
): Phaser.GameObjects.Container => {
  const { width, height } = getPrimaryButtonSize(options.width ?? 320);
  const background = scene.add
    .rectangle(0, 0, width, height, hexToNumber(uiTheme.colors.accent))
    .setOrigin(0.5)
    .setStrokeStyle(1, hexToNumber(uiTheme.colors.border), 0.8);

  const label = scene.add.text(0, 0, options.label, {
    color: uiTheme.colors.accentText,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: `${uiTheme.typography.buttonSize}px`,
    fontStyle: '600',
    align: 'center',
  });
  label.setOrigin(0.5);

  const container = scene.add.container(options.x, options.y, [background, label]);
  container.setSize(width, height);
  container.setDataEnabled();
  container.setData(primaryButtonEnabledDataKey, true);

  background.setInteractive({ useHandCursor: true });

  background.on('pointerdown', () => {
    if (!container.getData(primaryButtonEnabledDataKey)) {
      return;
    }

    container.setScale(uiTheme.motion.pressScale);
    background.setFillStyle(hexToNumber(uiTheme.colors.accentPressed));
  });

  const resetState = () => {
    container.setScale(1);
    background.setFillStyle(hexToNumber(uiTheme.colors.accent));
  };

  background.on('pointerout', resetState);
  background.on('pointerup', () => {
    if (!container.getData(primaryButtonEnabledDataKey)) {
      resetState();
      return;
    }

    resetState();
    options.onPress?.();
  });

  return container;
};

export const setPrimaryButtonEnabled = (button: Phaser.GameObjects.Container, enabled: boolean): void => {
  button.setDataEnabled();
  button.setData(primaryButtonEnabledDataKey, enabled);
  button.setAlpha(enabled ? 1 : 0.5);
};
