export type ReflectionOverlayLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ReflectionOverlayOptions = {
  parent: HTMLElement;
  initialValue?: string;
  placeholder?: string;
  maxLength?: number;
  onInput?: (value: string) => void;
  onSubmit?: () => void;
};

export type ReflectionOverlayController = {
  readonly input: HTMLTextAreaElement;
  updateLayout: (layout: ReflectionOverlayLayout) => void;
  focus: () => void;
  destroy: () => void;
};

const setParentPositioningContext = (parent: HTMLElement): void => {
  if (window.getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
};

export const createReflectionOverlay = (options: ReflectionOverlayOptions): ReflectionOverlayController => {
  setParentPositioningContext(options.parent);

  const root = document.createElement('div');
  root.setAttribute('data-role', 'reflection-overlay');
  root.style.position = 'absolute';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '20';

  const input = document.createElement('textarea');
  input.value = options.initialValue ?? '';
  input.placeholder = options.placeholder ?? 'A few words, if you want';
  input.autocomplete = 'off';
  input.autocapitalize = 'sentences';
  input.spellcheck = true;
  input.enterKeyHint = 'done';
  input.maxLength = options.maxLength ?? 240;
  input.rows = 5;
  input.setAttribute('aria-label', 'Session reflection');
  input.style.width = '100%';
  input.style.height = '100%';
  input.style.pointerEvents = 'auto';
  input.style.padding = '14px 16px';
  input.style.border = '1px solid #2b3d59';
  input.style.borderRadius = '18px';
  input.style.background = 'rgba(20, 32, 51, 0.96)';
  input.style.color = '#eef4ff';
  input.style.font = '16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  input.style.lineHeight = '1.5';
  input.style.outline = 'none';
  input.style.boxShadow = '0 12px 30px rgba(5, 8, 16, 0.22)';
  input.style.resize = 'none';

  input.addEventListener('input', () => {
    options.onInput?.(input.value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      options.onSubmit?.();
    }
  });

  root.append(input);
  options.parent.append(root);

  return {
    input,
    updateLayout: (layout) => {
      root.style.left = `${layout.left}px`;
      root.style.top = `${layout.top}px`;
      root.style.width = `${layout.width}px`;
      root.style.height = `${layout.height}px`;
    },
    focus: () => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    },
    destroy: () => {
      root.remove();
    },
  };
};
