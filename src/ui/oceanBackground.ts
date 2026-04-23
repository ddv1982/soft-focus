import * as Phaser from 'phaser';

import { getLayoutFrame, type LayoutFrame } from './layout';
import { hexToNumber, uiTheme } from './theme';

interface OceanBackgroundOptions {
  frame?: LayoutFrame;
  depth?: number;
  includeWaveBand?: boolean;
  compact?: boolean;
}

export const renderOceanBackground = (
  scene: Phaser.Scene,
  {
    frame = getLayoutFrame({ width: scene.scale.width, height: scene.scale.height }),
    depth = -30,
    includeWaveBand = true,
    compact = false,
  }: OceanBackgroundOptions = {},
): void => {
  const centerX = frame.width / 2;
  const centerY = frame.height / 2;

  scene.add.rectangle(
    centerX,
    centerY,
    frame.width,
    frame.height,
    hexToNumber(uiTheme.colors.backgroundDeep),
  ).setDepth(depth);

  scene.add.ellipse(
    frame.width * 0.18,
    frame.height * 0.08,
    frame.width * 0.88,
    frame.height * 0.46,
    hexToNumber(uiTheme.colors.horizon),
    compact ? 0.08 : 0.14,
  ).setDepth(depth + 1);

  scene.add.ellipse(
    frame.width * 0.82,
    frame.height * 0.1,
    frame.width * 0.58,
    frame.height * 0.34,
    hexToNumber(uiTheme.colors.coral),
    compact ? 0.04 : 0.08,
  ).setDepth(depth + 1);

  scene.add.ellipse(
    centerX,
    frame.height * 0.34,
    frame.width * 1.18,
    frame.height * 0.72,
    hexToNumber(uiTheme.colors.tide),
    compact ? 0.14 : 0.22,
  ).setDepth(depth + 1);

  scene.add.rectangle(
    centerX,
    frame.height * 0.56,
    frame.width,
    Math.max(2, compact ? 2 : 3),
    hexToNumber(uiTheme.colors.horizon),
    compact ? 0.16 : 0.24,
  ).setDepth(depth + 2);

  scene.add.rectangle(
    centerX,
    frame.height * 0.78,
    frame.width,
    frame.height * 0.48,
    hexToNumber(uiTheme.colors.backgroundInk),
    compact ? 0.24 : 0.34,
  ).setDepth(depth + 1);

  if (!includeWaveBand) {
    return;
  }

  const waveBaseY = frame.height + (compact ? 26 : 38);
  const waveWidth = frame.width * 1.42;
  const waveHeight = compact ? 86 : 118;

  scene.add.ellipse(
    centerX - (frame.width * 0.18),
    waveBaseY,
    waveWidth,
    waveHeight,
    hexToNumber(uiTheme.colors.foam),
    compact ? 0.06 : 0.09,
  ).setDepth(depth + 3);

  scene.add.ellipse(
    centerX + (frame.width * 0.2),
    waveBaseY - (compact ? 18 : 26),
    waveWidth * 0.9,
    waveHeight * 0.72,
    hexToNumber(uiTheme.colors.seaGlass),
    compact ? 0.08 : 0.11,
  ).setDepth(depth + 2);
};
