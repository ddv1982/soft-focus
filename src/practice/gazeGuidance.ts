import * as Phaser from 'phaser';

import { hexToNumber, uiTheme } from '../ui/theme';

export interface GazeGuidanceController {
  setPaused(paused: boolean): void;
  destroy(): void;
}

interface CreateGazeGuidanceOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  lowIntensity: boolean;
  prompt: string;
}

const baseColor = hexToNumber(uiTheme.colors.accent);

export const createGazeGuidance = ({
  scene,
  x,
  y,
  width,
  lowIntensity,
  prompt,
}: CreateGazeGuidanceOptions): GazeGuidanceController => {
  const label = scene.add.text(x, y, prompt, {
    color: uiTheme.colors.textMuted,
    fontFamily: uiTheme.typography.fontFamily,
    fontSize: '14px',
    align: 'center',
    wordWrap: { width, useAdvancedWrap: true },
  });
  label.setOrigin(0.5, 0.5);
  label.setAlpha(lowIntensity ? 0.78 : 0.9);

  const marker = scene.add.circle(x, y - 34, 5, baseColor, lowIntensity ? 0.32 : 0.55);
  let tween: Phaser.Tweens.Tween | null = null;

  if (!lowIntensity) {
    tween = scene.tweens.add({
      targets: marker,
      x: x + 28,
      duration: 2800,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  return {
    setPaused(paused: boolean): void {
      if (tween) {
        tween.paused = paused;
      }
    },
    destroy(): void {
      tween?.stop();
      marker.destroy();
      label.destroy();
    },
  };
};
