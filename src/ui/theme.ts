export const uiTheme = {
  colors: {
    background: '#071927',
    backgroundDeep: '#04111d',
    backgroundInk: '#020b12',
    horizon: '#9bd6df',
    surface: '#0d2a3a',
    surfaceRaised: '#12364a',
    surfaceDeep: '#081b28',
    surfaceMist: '#1c5365',
    border: '#5aaeb7',
    borderMuted: '#4f7780',
    text: '#f2fbfb',
    textOnDark: '#f2fbfb',
    textMuted: '#b9d5d7',
    textMutedOnDark: '#b9d5d7',
    accent: '#6fc7d1',
    accentPressed: '#59b5c1',
    accentText: '#062331',
    sand: '#eadcc3',
    sandDeep: '#cbb58f',
    foam: '#f8ffff',
    seaGlass: '#a9dbd6',
    tide: '#2b7f91',
    coral: '#e6a48e',
    shadow: 0x03101a,
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    titleSize: 30,
    subtitleSize: 18,
    bodySize: 16,
    buttonSize: 18,
    titleLineHeight: 38,
    bodyLineHeight: 24,
  },
  radius: {
    card: 26,
    button: 20,
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
    reducedAlpha: 0.94,
    hoverScale: 1.01,
    pressScale: 0.98,
  },
} as const;

export type UiTheme = typeof uiTheme;

export const hexToNumber = (hex: string): number => Number.parseInt(hex.slice(1), 16);
