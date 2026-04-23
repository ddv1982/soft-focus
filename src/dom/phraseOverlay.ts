export type PhraseOverlayLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PhraseOverlayOptions = {
  parent: HTMLElement;
  initialValue?: string;
  placeholder?: string;
  onInput?: (value: string) => void;
  onSubmit?: () => void;
};

export type PhraseOverlayController = {
  readonly input: HTMLInputElement;
  updateLayout: (layout: PhraseOverlayLayout) => void;
  setInvalid: (invalid: boolean) => void;
  focus: () => void;
  destroy: () => void;
};

const setParentPositioningContext = (parent: HTMLElement): void => {
  if (window.getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
};

export const createPhraseOverlay = (options: PhraseOverlayOptions): PhraseOverlayController => {
  setParentPositioningContext(options.parent);

  const root = document.createElement('div');
  root.setAttribute('data-role', 'phrase-overlay');
  root.style.position = 'absolute';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '20';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = options.initialValue ?? '';
  input.placeholder = options.placeholder ?? 'Enter your phrase';
  input.autocomplete = 'off';
  input.autocapitalize = 'sentences';
  input.spellcheck = false;
  input.enterKeyHint = 'done';
  input.maxLength = 80;
  input.setAttribute('aria-label', 'Practice phrase');
  input.style.width = '100%';
  input.style.height = '100%';
  input.style.pointerEvents = 'auto';
  input.style.padding = '0 16px';
  input.style.border = '1px solid #8ec6c9';
  input.style.borderRadius = '20px';
  input.style.background = 'rgba(248, 255, 255, 0.94)';
  input.style.color = '#0b2735';
  input.style.font = '16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  input.style.outline = 'none';
  input.style.boxShadow = '0 12px 30px rgba(3, 16, 26, 0.16)';

  const setInvalid = (invalid: boolean): void => {
    input.style.borderColor = invalid ? '#e6a48e' : '#8ec6c9';
    input.style.boxShadow = invalid
      ? '0 0 0 1px rgba(230, 164, 142, 0.55), 0 12px 30px rgba(3, 16, 26, 0.16)'
      : '0 12px 30px rgba(3, 16, 26, 0.16)';
  };

  input.addEventListener('input', () => {
    options.onInput?.(input.value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
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
    setInvalid,
    focus: () => {
      input.focus();
      input.select();
    },
    destroy: () => {
      root.remove();
    },
  };
};
