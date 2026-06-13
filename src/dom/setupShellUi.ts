export const shellClass = [
  'setup-shell absolute inset-0 z-10 w-full max-w-full overflow-y-auto overflow-x-hidden px-5 py-6 text-[var(--text)] overscroll-y-contain sm:px-8 lg:px-10',
  'bg-transparent',
].join(' ');

export const panelClass =
  'setup-panel rounded-[2rem] border border-[var(--line)] bg-[var(--surface-panel-setup)] shadow-wellness-glass backdrop-blur-2xl';
export const eyebrowClass = 'text-xs font-black uppercase tracking-[0.2em] text-wellness-mist';
export const titleClass =
  'text-balance text-4xl font-semibold leading-tight text-wellness-foam sm:text-5xl';
export const bodyClass = 'text-pretty text-base leading-7 text-[var(--text-muted)]';
export const primaryButtonClass =
  'wellness-focus inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--button-primary-border)] [background:var(--button-primary-bg)] px-5 py-3 font-black text-[var(--button-text)] shadow-[var(--button-primary-shadow)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0';
export const secondaryButtonClass =
  'wellness-focus inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--button-secondary-border)] [background:var(--button-secondary-bg)] px-5 py-3 font-bold text-[var(--text)] shadow-[var(--button-secondary-shadow)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:brightness-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0';
export const fieldClass =
  'wellness-focus w-full rounded-[1.35rem] border border-[var(--line)] bg-[var(--field-bg)] px-5 py-4 text-lg font-semibold text-[var(--field-text)] shadow-[0_18px_44px_rgba(3,16,26,0.20)] placeholder:text-[var(--field-placeholder)]';

export const createElement = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
};

export const createButton = (
  label: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement => {
  const button = createElement('button', className, label);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
};

export const createHeader = (eyebrow: string, title: string, subtitle?: string): HTMLElement => {
  const header = createElement(
    'header',
    'mx-auto flex w-full max-w-5xl flex-col gap-4 pt-6 sm:pt-10',
  );
  header.append(createElement('p', eyebrowClass, eyebrow), createElement('h1', titleClass, title));

  if (subtitle) {
    header.append(createElement('p', `${bodyClass} max-w-2xl`, subtitle));
  }

  return header;
};

export const createBackButton = (label: string, onClick: () => void): HTMLButtonElement =>
  createButton(label, `${secondaryButtonClass} w-fit`, onClick);

export const createToggle = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}): HTMLLabelElement => {
  const row = createElement(
    'label',
    'grid cursor-pointer grid-cols-[1fr_auto] gap-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:brightness-105 motion-reduce:transition-none',
  );
  const copy = createElement('span', 'space-y-1');
  copy.append(
    createElement('span', 'block text-base font-bold text-[var(--text)]', label),
    createElement('span', 'block text-sm leading-6 text-[var(--text-muted)]', description),
  );

  const input = createElement('input', 'wellness-focus mt-1 size-6 accent-wellness-mist');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  row.append(copy, input);

  return row;
};

export const createSelect = ({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  options: readonly { id: string; title: string }[];
  onChange: (value: string) => void;
}): HTMLLabelElement => {
  const row = createElement(
    'label',
    'grid min-w-0 gap-3 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4',
  );
  row.append(
    createElement(
      'span',
      'block min-w-0 max-w-full break-words text-base font-bold text-[var(--text)]',
      label,
    ),
    createElement(
      'span',
      'block min-w-0 max-w-full break-words text-sm leading-6 text-[var(--text-muted)]',
      description,
    ),
  );

  const select = createElement(
    'select',
    'wellness-focus min-h-12 w-full min-w-0 max-w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-control)] px-4 font-bold text-[var(--text)]',
  );
  options.forEach((option) => {
    const optionElement = createElement('option', undefined, option.title);
    optionElement.value = option.id;
    optionElement.selected = option.id === value;
    select.append(optionElement);
  });
  select.addEventListener('change', () => onChange(select.value));
  row.append(select);

  return row;
};

export const createRangeSlider = ({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  valueLabel,
  onInput,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueLabel: string;
  onInput?: (value: number) => void;
  onChange: (value: number) => void;
}): HTMLLabelElement => {
  const row = createElement(
    'label',
    'grid min-w-0 gap-3 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4',
  );
  const header = createElement(
    'span',
    'grid min-w-0 gap-1 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4',
  );
  const valueOutput = createElement(
    'output',
    'rounded-full border border-[var(--line)] bg-[var(--surface-control)] px-3 py-1 text-sm font-black text-[var(--text)]',
    valueLabel,
  );
  valueOutput.ariaLive = 'polite';
  header.append(
    createElement('span', 'min-w-0 break-words text-base font-bold text-[var(--text)]', label),
    valueOutput,
  );
  row.append(
    header,
    createElement(
      'span',
      'min-w-0 break-words text-sm leading-6 text-[var(--text-muted)]',
      description,
    ),
  );

  const input = createElement(
    'input',
    'wellness-focus min-h-12 w-full min-w-0 max-w-full accent-wellness-mist',
  );
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const syncValueLabel = (): number => {
    const nextValue = Number(input.value);
    valueOutput.textContent = `${nextValue}%`;
    return nextValue;
  };

  input.addEventListener('input', () => {
    const nextValue = syncValueLabel();
    onInput?.(nextValue);
  });
  input.addEventListener('change', () => onChange(syncValueLabel()));
  row.append(input);

  return row;
};

export const createMinuteStepper = ({
  label,
  minutes,
  minMinutes,
  maxMinutes,
  onChange,
}: {
  label: string;
  minutes: number;
  minMinutes: number;
  maxMinutes: number;
  onChange: (minutes: number) => void;
}): HTMLElement => {
  const row = createElement(
    'div',
    'grid gap-3 rounded-3xl border border-[var(--line)] bg-white/[0.04] p-4 sm:grid-cols-[1fr_auto] sm:items-center',
  );
  const copy = createElement('div', 'space-y-1');
  copy.append(
    createElement('p', 'text-sm font-bold text-[var(--text)]', label),
    createElement(
      'p',
      'text-sm leading-6 text-[var(--text-muted)]',
      `${minutes} minute${minutes === 1 ? '' : 's'} selected. Use the buttons to adjust by 1 minute.`,
    ),
  );

  const controls = createElement(
    'div',
    'grid grid-cols-[auto_minmax(5rem,1fr)_auto] items-center gap-3 sm:min-w-64',
  );
  const decrementButton = createButton(
    '−',
    `${secondaryButtonClass} min-h-11 min-w-11 rounded-full px-0 py-0 text-2xl`,
    () => onChange(minutes - 1),
  );
  decrementButton.ariaLabel = 'Decrease custom practice duration by 1 minute';
  decrementButton.disabled = minutes <= minMinutes;

  const value = createElement(
    'output',
    'rounded-2xl border border-[var(--line)] bg-[var(--surface-control)] px-4 py-3 text-center text-base font-black text-[var(--text)]',
    `${minutes} min`,
  );
  value.ariaLive = 'polite';

  const incrementButton = createButton(
    '+',
    `${secondaryButtonClass} min-h-11 min-w-11 rounded-full px-0 py-0 text-2xl`,
    () => onChange(minutes + 1),
  );
  incrementButton.ariaLabel = 'Increase custom practice duration by 1 minute';
  incrementButton.disabled = minutes >= maxMinutes;

  controls.append(decrementButton, value, incrementButton);
  row.append(copy, controls);

  return row;
};

export const createSecondStepper = ({
  label,
  description,
  seconds,
  minSeconds,
  maxSeconds,
  onChange,
}: {
  label: string;
  description: string;
  seconds: number;
  minSeconds: number;
  maxSeconds: number;
  onChange: (seconds: number) => void;
}): HTMLElement => {
  const row = createElement(
    'div',
    'grid gap-3 rounded-3xl border border-[var(--line)] bg-white/[0.04] p-4 sm:grid-cols-[1fr_auto] sm:items-center',
  );
  const copy = createElement('div', 'space-y-1');
  copy.append(
    createElement('p', 'text-sm font-bold text-[var(--text)]', label),
    createElement('p', 'text-sm leading-6 text-[var(--text-muted)]', description),
  );

  const controls = createElement(
    'div',
    'grid grid-cols-[auto_minmax(5rem,1fr)_auto] items-center gap-3 sm:min-w-64',
  );
  const decrementButton = createButton(
    '−',
    `${secondaryButtonClass} min-h-11 min-w-11 rounded-full px-0 py-0 text-2xl`,
    () => onChange(seconds - 1),
  );
  decrementButton.ariaLabel = `Decrease ${label.toLowerCase()} by 1 second`;
  decrementButton.disabled = seconds <= minSeconds;

  const value = createElement(
    'output',
    'rounded-2xl border border-[var(--line)] bg-[var(--surface-control)] px-4 py-3 text-center text-base font-black text-[var(--text)]',
    `${seconds} sec`,
  );
  value.ariaLive = 'polite';

  const incrementButton = createButton(
    '+',
    `${secondaryButtonClass} min-h-11 min-w-11 rounded-full px-0 py-0 text-2xl`,
    () => onChange(seconds + 1),
  );
  incrementButton.ariaLabel = `Increase ${label.toLowerCase()} by 1 second`;
  incrementButton.disabled = seconds >= maxSeconds;

  controls.append(decrementButton, value, incrementButton);
  row.append(copy, controls);

  return row;
};
