export const shellClass = [
  'setup-shell absolute inset-0 z-10 overflow-y-auto px-5 py-6 text-[var(--text)] sm:px-8 lg:px-10',
  'bg-transparent',
].join(' ');

export const panelClass = 'rounded-[2rem] border border-[var(--line)] bg-[var(--surface-panel-setup)] shadow-wellness-glass backdrop-blur-2xl';
export const eyebrowClass = 'text-xs font-black uppercase tracking-[0.22em] text-wellness-mist';
export const titleClass = 'text-balance text-4xl font-semibold leading-[0.98] text-wellness-foam sm:text-5xl lg:text-6xl';
export const bodyClass = 'text-pretty text-base leading-7 text-[var(--text-muted)]';
export const primaryButtonClass = 'wellness-focus inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--button-primary-border)] [background:var(--button-primary-bg)] px-5 py-3 font-black text-[var(--button-text)] shadow-[var(--button-primary-shadow)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0';
export const secondaryButtonClass = 'wellness-focus inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--button-secondary-border)] [background:var(--button-secondary-bg)] px-5 py-3 font-bold text-[var(--text)] shadow-[var(--button-secondary-shadow)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:brightness-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0';
export const fieldClass = 'wellness-focus w-full rounded-[1.35rem] border border-[var(--line)] bg-[var(--field-bg)] px-5 py-4 text-lg font-semibold text-[var(--field-text)] shadow-[0_18px_44px_rgba(3,16,26,0.20)] placeholder:text-[var(--field-placeholder)]';

export const createElement = <K extends keyof HTMLElementTagNameMap>(tagName: K, className?: string, text?: string): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
};

export const createButton = (label: string, className: string, onClick: () => void): HTMLButtonElement => {
  const button = createElement('button', className, label);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
};

export const createHeader = (eyebrow: string, title: string, subtitle: string): HTMLElement => {
  const header = createElement('header', 'mx-auto flex w-full max-w-5xl flex-col gap-5 pt-6 sm:pt-10');
  header.append(
    createElement('p', eyebrowClass, eyebrow),
    createElement('h1', titleClass, title),
    createElement('p', `${bodyClass} max-w-2xl`, subtitle),
  );
  return header;
};

export const createBackButton = (label: string, onClick: () => void): HTMLButtonElement => (
  createButton(label, `${secondaryButtonClass} w-fit`, onClick)
);

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
  const row = createElement('label', 'grid cursor-pointer grid-cols-[1fr_auto] gap-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:brightness-105 motion-reduce:transition-none');
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
  const row = createElement('label', 'grid gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4');
  row.append(
    createElement('span', 'text-base font-bold text-[var(--text)]', label),
    createElement('span', 'text-sm leading-6 text-[var(--text-muted)]', description),
  );

  const select = createElement('select', 'wellness-focus min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface-control)] px-4 font-bold text-[var(--text)]');
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
