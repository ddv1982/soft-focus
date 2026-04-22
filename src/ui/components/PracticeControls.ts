import * as Phaser from 'phaser';

import { uiTheme } from '../theme';

export interface PracticeControls {
  container: Phaser.GameObjects.Container;
  setPaused(paused: boolean): void;
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
  setOnPress: (onPress: () => void) => void;
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
): ControlButton => {
  const height = 48;
  const background = scene.add.rectangle(0, 0, width, height, Number.parseInt(uiTheme.colors.surfaceRaised.slice(1), 16));
  background.setOrigin(0.5);
  background.setStrokeStyle(1, Number.parseInt(uiTheme.colors.border.slice(1), 16), 1);

  const text = scene.add.text(0, 0, label, {
    color: uiTheme.colors.text,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '16px',
    fontStyle: '600',
    align: 'center',
  });
  text.setOrigin(0.5);

  const container = scene.add.container(x, 0, [background, text]);
  container.setSize(width, height);
  background.setInteractive({ useHandCursor: true });

  background.on('pointerdown', () => {
    container.setScale(uiTheme.motion.pressScale);
  });
  const resetState = (): void => {
    container.setScale(1);
  };

  background.on('pointerout', resetState);

  const setOnPress = (nextOnPress: () => void): void => {
    background.removeAllListeners('pointerup');
    background.on('pointerup', () => {
      resetState();
      nextOnPress();
    });
  };

  setOnPress(onPress);

  return {
    container,
    label: text,
    background,
    setOnPress,
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
  );
  const stopButton = createControlButton(
    scene,
    layout.stacked ? 0 : ((layout.buttonWidth / 2) + (layout.gap / 2)),
    layout.buttonWidth,
    'Stop practice',
    onStop,
  );

  if (layout.stacked) {
    pauseButton.container.setY(-((layout.buttonHeight + layout.gap) / 2));
    stopButton.container.setY((layout.buttonHeight + layout.gap) / 2);
  }

  const container = scene.add.container(x, y, [pauseButton.container, stopButton.container]);
  container.setSize(width, layout.height);

  return {
    container,
    setPaused(paused: boolean): void {
      pauseButton.label.setText(paused ? 'Resume' : 'Pause');
      pauseButton.setOnPress(() => {
        if (paused) {
          onResume();
          return;
        }

        onPause();
      });
      pauseButton.background.setFillStyle(Number.parseInt((paused ? uiTheme.colors.accent : uiTheme.colors.surfaceRaised).slice(1), 16));
      pauseButton.label.setColor(paused ? uiTheme.colors.accentText : uiTheme.colors.text);
    },
  };
};
