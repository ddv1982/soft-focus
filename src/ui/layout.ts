export const appViewport = {
  width: 390,
  height: 844,
  minWidth: 320,
  minHeight: 568,
  contentMaxWidth: 720,
  buttonMaxWidth: 420,
} as const;

export const getViewportSize = (parent?: HTMLElement): FrameSize => ({
  width: Math.max(parent?.clientWidth ?? window.innerWidth, appViewport.minWidth),
  height: Math.max(parent?.clientHeight ?? window.innerHeight, appViewport.minHeight),
});

export const safeArea = {
  top: 32,
  right: 20,
  bottom: 32,
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

export const getLayoutFrame = (size: FrameSize): LayoutFrame => ({
  width: size.width,
  height: size.height,
  contentX: safeArea.left,
  contentY: safeArea.top,
  contentWidth: Math.max(0, size.width - safeArea.left - safeArea.right),
  contentHeight: Math.max(0, size.height - safeArea.top - safeArea.bottom),
});

export const clampContentWidth = (width: number, maxWidth: number = appViewport.contentMaxWidth): number => Math.min(width, maxWidth);

export const centerX = (size: FrameSize): number => size.width / 2;
