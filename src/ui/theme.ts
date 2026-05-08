export const darkUiTheme = {
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
    cardHeadingSize: 18,
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
    reducedAlpha: 0.78,
    hoverScale: 1.01,
    pressScale: 0.98,
  },
} as const;

export const lightUiTheme = {
  ...darkUiTheme,
  colors: {
    ...darkUiTheme.colors,
    background: '#f8f1de',
    backgroundDeep: '#f4e7cc',
    backgroundInk: '#cfa365',
    horizon: '#56bdc9',
    surface: '#fff6df',
    surfaceRaised: '#fffbef',
    surfaceDeep: '#f0dcc0',
    surfaceMist: '#c5e5e2',
    border: '#2d8290',
    borderMuted: '#5f8f96',
    text: '#102b35',
    textOnDark: '#102b35',
    textMuted: '#335963',
    textMutedOnDark: '#335963',
    accent: '#147f91',
    accentPressed: '#0d6978',
    accentText: '#f8ffff',
    sand: '#e7c382',
    sandDeep: '#b78346',
    foam: '#123845',
    seaGlass: '#24756f',
    tide: '#258999',
    coral: '#c26032',
    shadow: 0x503c1b,
  },
} as const;

export type UiTheme = typeof darkUiTheme | typeof lightUiTheme;

export const getUiTheme = (): UiTheme => {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light') {
    return lightUiTheme;
  }

  return darkUiTheme;
};

export const uiTheme = new Proxy(darkUiTheme, {
  get: (_target, property: keyof UiTheme) => getUiTheme()[property],
}) as UiTheme;

export const hexToNumber = (hex: string): number => Number.parseInt(hex.slice(1), 16);
