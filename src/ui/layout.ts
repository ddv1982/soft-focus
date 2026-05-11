export const appViewport = {
  width: 390,
  height: 844,
  minWidth: 320,
  minHeight: 568,
  landscapeMinHeight: 320,
  contentMaxWidth: 720,
  buttonMaxWidth: 420,
} as const;

const getMinimumViewportHeight = (width: number, height: number): number => (
  width > height ? appViewport.landscapeMinHeight : appViewport.minHeight
);

export const getViewportSize = (parent?: HTMLElement): FrameSize => {
  const width = parent?.clientWidth ?? window.innerWidth;
  const height = parent?.clientHeight ?? window.innerHeight;

  return {
    width: Math.max(width, appViewport.minWidth),
    height: Math.max(height, getMinimumViewportHeight(width, height)),
  };
};

export const safeArea = {
  top: 32,
  right: 20,
  bottom: 32,
  left: 20,
} as const;

type SafeArea = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const compactLandscapeSafeArea = {
  top: 16,
  right: 20,
  bottom: 16,
  left: 20,
} as const;

export type FrameSize = {
  width: number;
  height: number;
};

export type LayoutFrame = {
  width: number;
  height: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
};

const getLayoutSafeArea = (size: FrameSize): SafeArea => (
  size.width > size.height && size.height <= 520 ? compactLandscapeSafeArea : safeArea
);

export const getLayoutFrame = (size: FrameSize): LayoutFrame => {
  const layoutSafeArea = getLayoutSafeArea(size);

  return {
    width: size.width,
    height: size.height,
    contentX: layoutSafeArea.left,
    contentY: layoutSafeArea.top,
    contentWidth: Math.max(0, size.width - layoutSafeArea.left - layoutSafeArea.right),
    contentHeight: Math.max(0, size.height - layoutSafeArea.top - layoutSafeArea.bottom),
  };
};

export const clampContentWidth = (width: number, maxWidth: number = appViewport.contentMaxWidth): number => Math.min(width, maxWidth);

export const centerX = (size: FrameSize): number => size.width / 2;
