import * as Phaser from 'phaser';

import { hexToNumber, uiTheme } from '../theme';

export interface PracticeControls {
  container: Phaser.GameObjects.Container;
  setPaused(paused: boolean): void;
  setInteractiveEnabled(enabled: boolean): void;
  refreshTheme(paused: boolean): void;
}

export interface PracticeControlsLayout {
  buttonWidth: number;
  buttonHeight: number;
  gap: number;
  stacked: boolean;
  height: number;
}

interface PracticeControlsOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

interface ControlButton {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  background: Phaser.GameObjects.Rectangle;
  highlight: Phaser.GameObjects.Rectangle;
  setOnPress: (onPress: () => void) => void;
  setInteractiveEnabled: (enabled: boolean) => void;
}

export const getPracticeControlsLayout = (width: number): PracticeControlsLayout => {
  const gap = uiTheme.spacing.sm;
  const buttonHeight = 48;
  const stacked = width < 520;

  return {
    buttonWidth: stacked ? width : Math.max(120, Math.floor((width - gap) / 2)),
    buttonHeight,
    gap,
    stacked,
    height: stacked ? (buttonHeight * 2) + gap : buttonHeight,
  };
};

const createControlButton = (
  scene: Phaser.Scene,
  x: number,
  width: number,
  label: string,
  onPress: () => void,
  variant: 'primary' | 'secondary' = 'secondary',
): ControlButton => {
  const height = 48;
  const shadow = scene.add.rectangle(0, 5, width - 8, height, uiTheme.colors.shadow, variant === 'primary' ? 0.18 : 0.08);
  shadow.setOrigin(0.5);

  const background = scene.add.rectangle(
    0,
    0,
    width,
    height,
    hexToNumber(variant === 'primary' ? uiTheme.colors.accent : uiTheme.colors.surfaceRaised),
    variant === 'primary' ? 0.9 : 0.48,
  );
  background.setOrigin(0.5);
  background.setStrokeStyle(variant === 'primary' ? 2 : 1, hexToNumber(variant === 'primary' ? uiTheme.colors.foam : uiTheme.colors.border), variant === 'primary' ? 0.3 : 0.34);

  const highlight = scene.add.rectangle(0, -((height / 2) - 1), width - 18, 1, hexToNumber(uiTheme.colors.foam), variant === 'primary' ? 0.26 : 0.08);
  highlight.setOrigin(0.5);

  const text = scene.add.text(0, 0, label, {
    color: variant === 'primary' ? uiTheme.colors.accentText : uiTheme.colors.text,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '16px',
    fontStyle: '600',
    align: 'center',
  });
  text.setOrigin(0.5);

  const container = scene.add.container(x, 0, [shadow, background, highlight, text]);
  container.setSize(width, height);
  background.setInteractive({ useHandCursor: true });

  background.on('pointerdown', () => {
    container.setScale(uiTheme.motion.pressScale);
    background.setFillStyle(hexToNumber(variant === 'primary' ? uiTheme.colors.accentPressed : uiTheme.colors.surfaceMist), variant === 'primary' ? 0.94 : 0.6);
  });
  const resetState = (): void => {
    container.setScale(1);
    background.setFillStyle(hexToNumber(variant === 'primary' ? uiTheme.colors.accent : uiTheme.colors.surfaceRaised), variant === 'primary' ? 0.9 : 0.48);
  };

  background.on('pointerover', () => {
    background.setFillStyle(hexToNumber(variant === 'primary' ? uiTheme.colors.horizon : uiTheme.colors.surfaceMist), variant === 'primary' ? 0.94 : 0.6);
  });

  background.on('pointerout', resetState);

  const setOnPress = (nextOnPress: () => void): void => {
    background.removeAllListeners('pointerup');
    background.on('pointerup', () => {
      resetState();
      nextOnPress();
    });
  };

  const setInteractiveEnabled = (enabled: boolean): void => {
    if (enabled) {
      background.setInteractive({ useHandCursor: true });
      return;
    }

    background.disableInteractive();
    resetState();
  };

  setOnPress(onPress);

  return {
    container,
    label: text,
    background,
    highlight,
    setOnPress,
    setInteractiveEnabled,
  };
};

export const createPracticeControls = ({
  scene,
  x,
  y,
  width,
  onPause,
  onResume,
  onStop,
}: PracticeControlsOptions): PracticeControls => {
  const layout = getPracticeControlsLayout(width);

  const pauseButton = createControlButton(
    scene,
    layout.stacked ? 0 : -((layout.buttonWidth / 2) + (layout.gap / 2)),
    layout.buttonWidth,
    'Pause',
    onPause,
    'primary',
  );
  const stopButton = createControlButton(
    scene,
    layout.stacked ? 0 : ((layout.buttonWidth / 2) + (layout.gap / 2)),
    layout.buttonWidth,
    'Stop practice',
    onStop,
    'secondary',
  );

  if (layout.stacked) {
    pauseButton.container.setY(-((layout.buttonHeight + layout.gap) / 2));
    stopButton.container.setY((layout.buttonHeight + layout.gap) / 2);
  }

  const container = scene.add.container(x, y, [pauseButton.container, stopButton.container]);
  container.setSize(width, layout.height);

  return {
    container,
    refreshTheme(_paused: boolean): void {
      pauseButton.background.setFillStyle(hexToNumber(uiTheme.colors.accent), 0.9);
      pauseButton.background.setStrokeStyle(2, hexToNumber(uiTheme.colors.foam), 0.3);
      pauseButton.label.setColor(uiTheme.colors.accentText);
      stopButton.background.setFillStyle(hexToNumber(uiTheme.colors.surfaceRaised), 0.48);
      stopButton.background.setStrokeStyle(1, hexToNumber(uiTheme.colors.border), 0.34);
      stopButton.label.setColor(uiTheme.colors.text);
    },
    setPaused(paused: boolean): void {
      pauseButton.label.setText(paused ? 'Resume' : 'Pause');
      pauseButton.setOnPress(() => {
        if (paused) {
          onResume();
          return;
        }

        onPause();
      });
      pauseButton.background.setFillStyle(hexToNumber(uiTheme.colors.accent), 0.9);
      pauseButton.background.setStrokeStyle(2, hexToNumber(uiTheme.colors.foam), 0.3);
      pauseButton.label.setColor(uiTheme.colors.accentText);
      pauseButton.background.setAlpha(1);
      pauseButton.highlight.setAlpha(0.26);
    },
    setInteractiveEnabled(enabled: boolean): void {
      pauseButton.setInteractiveEnabled(enabled);
      stopButton.setInteractiveEnabled(enabled);
    },
  };
};
