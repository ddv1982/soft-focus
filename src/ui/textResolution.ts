import type * as Phaser from 'phaser';

const maxTextResolution = 2;

export const getPhaserTextResolution = (): number => {
  if (typeof window === 'undefined') {
    return 1;
  }

  return Math.max(1, Math.min(window.devicePixelRatio || 1, maxTextResolution));
};

export const withTextResolution = <T extends Phaser.Types.GameObjects.Text.TextStyle>(
  style: T,
): T & { resolution: number } => ({
  ...style,
  resolution: getPhaserTextResolution(),
});
