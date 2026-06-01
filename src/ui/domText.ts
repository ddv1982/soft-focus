import * as Phaser from 'phaser';

type DomTextStyle = Pick<
  Phaser.Types.GameObjects.Text.TextStyle,
  'align' | 'color' | 'fontFamily' | 'fontSize' | 'fontStyle' | 'lineSpacing' | 'wordWrap'
>;

export interface DomText {
  readonly element: HTMLDivElement;
  setAlpha(alpha: number): this;
  setColor(color: string): this;
  setOrigin(x: number, y?: number): this;
  setText(text: string): this;
  setVisible(visible: boolean): this;
  destroy(): void;
}

const resolveFontSize = (fontSize: DomTextStyle['fontSize']): string => {
  if (typeof fontSize === 'number') {
    return `${fontSize}px`;
  }

  return fontSize ?? '16px';
};

const applyFontStyle = (element: HTMLElement, fontStyle: DomTextStyle['fontStyle']): void => {
  if (!fontStyle) {
    return;
  }

  if (/^\d+$/.test(fontStyle)) {
    element.style.fontWeight = fontStyle;
    return;
  }

  element.style.fontStyle = fontStyle;
};

export const createDomText = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: DomTextStyle,
): DomText => {
  const parent = scene.game.canvas.parentElement;

  if (!parent) {
    throw new Error('Expected the Phaser canvas to have a parent element for DOM text.');
  }

  if (getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }

  const element = document.createElement('div');
  element.textContent = text;
  element.style.position = 'absolute';
  element.style.left = '0';
  element.style.top = '0';
  element.style.pointerEvents = 'none';
  element.style.userSelect = 'none';
  element.style.whiteSpace = style.wordWrap?.width ? 'normal' : 'pre';
  element.style.textAlign = style.align ?? 'left';
  element.style.color = typeof style.color === 'string' ? style.color : '#ffffff';
  element.style.fontFamily = style.fontFamily ?? 'sans-serif';
  element.style.fontSize = resolveFontSize(style.fontSize);
  element.style.fontWeight = '400';
  element.style.lineHeight = style.lineSpacing ? `calc(1.2em + ${style.lineSpacing}px)` : '1.2';
  element.style.zIndex = '2';
  element.style.willChange = 'transform, opacity';
  element.setAttribute('aria-hidden', 'true');
  applyFontStyle(element, style.fontStyle);

  parent.append(element);

  let originX = 0;
  let originY = 0;
  let destroyed = false;

  const sync = (): void => {
    if (destroyed) {
      return;
    }

    const canvasRect = scene.game.canvas.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const scaleX = canvasRect.width / scene.scale.width;
    const scaleY = canvasRect.height / scene.scale.height;
    const left = canvasRect.left - parentRect.left + x * scaleX;
    const top = canvasRect.top - parentRect.top + y * scaleY;

    if (style.wordWrap?.width) {
      element.style.width = `${style.wordWrap.width * scaleX}px`;
    }

    element.style.transform = `translate(${left}px, ${top}px) translate(${-originX * 100}%, ${-originY * 100}%)`;
  };

  const destroy = (): void => {
    if (destroyed) {
      return;
    }

    destroyed = true;
    scene.scale.off('resize', sync);
    window.removeEventListener('resize', sync);
    window.visualViewport?.removeEventListener('resize', sync);
    window.visualViewport?.removeEventListener('scroll', sync);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, destroy);
    element.remove();
  };

  scene.scale.on('resize', sync);
  window.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('scroll', sync);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
  sync();

  return {
    element,
    setAlpha(alpha: number): DomText {
      element.style.opacity = String(alpha);
      return this;
    },
    setColor(color: string): DomText {
      element.style.color = color;
      return this;
    },
    setOrigin(nextOriginX: number, nextOriginY: number = nextOriginX): DomText {
      originX = nextOriginX;
      originY = nextOriginY;
      sync();
      return this;
    },
    setText(nextText: string): DomText {
      element.textContent = nextText;
      return this;
    },
    setVisible(visible: boolean): DomText {
      element.style.display = visible ? 'block' : 'none';
      return this;
    },
    destroy,
  };
};
