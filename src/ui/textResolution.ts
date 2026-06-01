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

const isLightTheme = (): boolean => (
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
);

const getPracticeTextContrast = (): {
  stroke: string;
  shadowColor: string;
} => (isLightTheme()
  ? {
    stroke: 'rgba(248, 255, 255, 0.64)',
    shadowColor: 'rgba(248, 255, 255, 0.48)',
  }
  : {
    stroke: 'rgba(4, 17, 29, 0.72)',
    shadowColor: 'rgba(4, 17, 29, 0.66)',
  });

export const withPracticeTextContrast = <T extends Phaser.Types.GameObjects.Text.TextStyle>(
  style: T,
): T & Phaser.Types.GameObjects.Text.TextStyle & { resolution: number } => ({
  ...withTextResolution(style),
  stroke: style.stroke ?? getPracticeTextContrast().stroke,
  strokeThickness: style.strokeThickness ?? 2,
  shadow: {
    offsetX: 0,
    offsetY: 1,
    color: getPracticeTextContrast().shadowColor,
    blur: 2,
    stroke: false,
    fill: true,
    ...style.shadow,
  },
});
