export const supportCopy = 'If the tide feels too strong, stop and return to a steadier option. Seek local support if you need more help.';

export const formatDuration = (durationSeconds: number | null): string => {
  if (!durationSeconds || durationSeconds < 60) {
    return durationSeconds === 1 ? '1 second' : `${durationSeconds ?? 0} seconds`;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  if (seconds === 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  return `${minutes}m ${seconds}s`;
};

export const createOverlayRoot = (parent: HTMLElement): HTMLDivElement => {
  const root = document.createElement('div');
  root.className = 'session-overlay session-overlay--hidden';
  parent.append(root);
  return root;
};

export const createPreferencesRoot = (parent: HTMLElement): HTMLDivElement => {
  const root = document.createElement('div');
  root.className = 'preferences-shell';
  parent.append(root);
  return root;
};

export const createPanel = (): HTMLElement => {
  const panel = document.createElement('section');
  panel.className = 'session-overlay__panel wellness-reduced-motion';
  panel.setAttribute('aria-live', 'polite');
  return panel;
};

export const createEyebrow = (text: string): HTMLParagraphElement => {
  const eyebrow = document.createElement('p');
  eyebrow.className = 'session-overlay__eyebrow';
  eyebrow.textContent = text;
  return eyebrow;
};

export const createTitle = (text: string): HTMLHeadingElement => {
  const title = document.createElement('h2');
  title.className = 'session-overlay__title';
  title.textContent = text;
  return title;
};

export const createBody = (text: string): HTMLParagraphElement => {
  const body = document.createElement('p');
  body.className = 'session-overlay__body';
  body.textContent = text;
  return body;
};

export const createSummaryList = (lines: string[]): HTMLUListElement => {
  const list = document.createElement('ul');
  list.className = 'session-overlay__list';

  lines.forEach((line) => {
    const item = document.createElement('li');
    const [label, ...valueParts] = line.split(': ');
    const labelElement = document.createElement('span');
    labelElement.className = 'session-overlay__list-label';
    labelElement.textContent = valueParts.length > 0 ? `${label}: ` : 'Detail: ';

    const value = document.createElement('span');
    value.className = 'session-overlay__list-value';
    value.textContent = valueParts.length > 0 ? valueParts.join(': ') : line;

    item.append(labelElement, value);
    list.append(item);
  });

  return list;
};

export const createPrimaryButton = (label: string, onClick: () => void): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'app-shell__button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
};

export const createSecondaryButton = (label: string, onClick: () => void): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'preferences-shell__button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
};

export const createPreferenceToggle = ({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}): HTMLLabelElement => {
  const row = document.createElement('label');
  row.className = `preferences-shell__toggle${disabled ? ' preferences-shell__toggle--disabled' : ''}`;

  const copy = document.createElement('div');
  copy.className = 'preferences-shell__toggle-copy';

  const title = document.createElement('span');
  title.className = 'preferences-shell__toggle-title';
  title.textContent = label;

  const body = document.createElement('span');
  body.className = 'preferences-shell__toggle-body';
  body.textContent = description;

  copy.append(title, body);

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.disabled = disabled;
  input.className = 'preferences-shell__checkbox';
  input.addEventListener('change', () => {
    onChange(input.checked);
  });

  const switchTrack = document.createElement('span');
  switchTrack.className = 'preferences-shell__switch';
  switchTrack.setAttribute('aria-hidden', 'true');

  row.append(copy, input, switchTrack);
  return row;
};

export const createPreferenceSelect = ({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  options: readonly {
    id: string;
    title: string;
  }[];
  onChange: (value: string) => void;
}): HTMLLabelElement => {
  const row = document.createElement('label');
  row.className = 'preferences-shell__toggle';

  const copy = document.createElement('div');
  copy.className = 'preferences-shell__toggle-copy';

  const title = document.createElement('span');
  title.className = 'preferences-shell__toggle-title';
  title.textContent = label;

  const body = document.createElement('span');
  body.className = 'preferences-shell__toggle-body';
  body.textContent = description;

  copy.append(title, body);

  const select = document.createElement('select');
  select.className = 'preferences-shell__select';
  select.setAttribute('aria-label', label);
  options.forEach((option) => {
    const optionElement = document.createElement('option');
    optionElement.value = option.id;
    optionElement.textContent = option.title;
    optionElement.selected = option.id === value;
    select.append(optionElement);
  });
  select.addEventListener('change', () => {
    onChange(select.value);
  });

  row.append(copy, select);
  return row;
};

export const createPreferenceRange = ({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  valueLabel,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueLabel: string;
  onChange: (value: number) => void;
}): HTMLLabelElement => {
  const row = document.createElement('label');
  row.className = 'preferences-shell__toggle preferences-shell__range-row';

  const copy = document.createElement('div');
  copy.className = 'preferences-shell__toggle-copy';

  const title = document.createElement('span');
  title.className = 'preferences-shell__toggle-title';
  title.textContent = label;

  const body = document.createElement('span');
  body.className = 'preferences-shell__toggle-body';
  body.textContent = description;

  copy.append(title, body);

  const control = document.createElement('div');
  control.className = 'preferences-shell__range-control';

  const output = document.createElement('span');
  output.className = 'preferences-shell__range-value';
  output.setAttribute('aria-hidden', 'true');
  output.textContent = valueLabel;

  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'preferences-shell__range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('aria-label', label);
  input.setAttribute('aria-valuetext', valueLabel);
  input.addEventListener('input', () => {
    const nextValue = Number(input.value);
    const nextLabel = `${nextValue}%`;
    output.textContent = nextLabel;
    input.setAttribute('aria-valuetext', nextLabel);
  });
  input.addEventListener('change', () => {
    const nextValue = Number(input.value);
    const nextLabel = `${nextValue}%`;
    output.textContent = nextLabel;
    input.setAttribute('aria-valuetext', nextLabel);
    onChange(nextValue);
  });

  control.append(output, input);
  row.append(copy, control);
  return row;
};

export const createThemeToggleButton = ({
  theme,
  onToggle,
}: {
  theme: 'light' | 'dark';
  onToggle: () => void;
}): HTMLButtonElement => {
  const button = document.createElement('button');
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  button.type = 'button';
  button.className = 'preferences-shell__theme-toggle';
  button.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
  button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  button.title = `Switch to ${nextTheme} theme`;
  button.addEventListener('click', onToggle);

  const icon = document.createElement('span');
  icon.className = 'preferences-shell__theme-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = theme === 'dark' ? '☾' : '☀';

  const label = document.createElement('span');
  label.className = 'preferences-shell__theme-label';
  label.textContent = theme === 'dark' ? 'Dark' : 'Light';

  button.append(icon, label);
  return button;
};
