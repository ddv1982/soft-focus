export const uiTheme = {
  colors: {
    background: '#0b1220',
    surface: '#142033',
    surfaceRaised: '#1a2940',
    border: '#2b3d59',
    text: '#eef4ff',
    textMuted: '#aab9d3',
    accent: '#7cc6ff',
    accentPressed: '#67b4ef',
    accentText: '#0a1a2c',
    shadow: 0x050810,
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    titleSize: 30,
    subtitleSize: 18,
    bodySize: 16,
    buttonSize: 18,
    titleLineHeight: 38,
    bodyLineHeight: 24,
  },
  radius: {
    card: 20,
    button: 18,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  motion: {
    fastMs: 120,
    normalMs: 180,
    reducedAlpha: 0.96,
    hoverScale: 1.01,
    pressScale: 0.98,
  },
} as const;

export type UiTheme = typeof uiTheme;
