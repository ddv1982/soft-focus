export {};

const container = document.getElementById('app');

declare global {
  interface Window {
    __softFocusGame?: import('./game/Game').SoftFocusGame;
  }
}

if (!container) {
  throw new Error('Expected #app container to exist.');
}

const createBootShell = (parent: HTMLElement) => {
  parent.className = 'app-shell';

  const card = document.createElement('section');
  card.className = 'app-shell__card';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'app-shell__eyebrow';
  eyebrow.textContent = 'Soft Focus';

  const title = document.createElement('h1');
  title.className = 'app-shell__title';
  title.textContent = 'Open a calmer practice space when you are ready.';

  const body = document.createElement('p');
  body.className = 'app-shell__body';
  body.textContent = 'The guided practice runtime now loads on demand so the first screen stays lighter. You can still pause or stop whenever you need to soften the pace.';

  const list = document.createElement('ul');
  list.className = 'app-shell__list';
  [
    'Maintenance: phrase anchor',
    'Reset: moving ball',
    'If motion feels too intense, stop and return to a steadier option.',
  ].forEach((item) => {
    const entry = document.createElement('li');
    entry.textContent = item;
    list.append(entry);
  });

  const actions = document.createElement('div');
  actions.className = 'app-shell__actions';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'app-shell__button';
  button.textContent = 'Open Soft Focus';

  const statusText = document.createElement('p');
  statusText.className = 'app-shell__status';
  statusText.textContent = 'The practice runtime stays unloaded until you open it.';

  actions.append(button);
  card.append(eyebrow, title, body, list, actions, statusText);
  parent.replaceChildren(card);

  return { button, statusText };
};

const { button, statusText } = createBootShell(container);
let bootPromise: Promise<void> | null = null;

const startSoftFocus = async (): Promise<void> => {
  if (bootPromise) {
    return bootPromise;
  }

  button.disabled = true;
  button.textContent = 'Loading Soft Focus…';
  statusText.textContent = 'Preparing the guided practice runtime.';

  bootPromise = (async () => {
    const [{ SoftFocusGame }, { mountSessionPanels }] = await Promise.all([
      import('./game/Game'),
      import('./shell/sessionPanels'),
      document.fonts?.ready ?? Promise.resolve(),
    ]);

    container.className = 'app-runtime-shell';
    const runtimeHost = document.createElement('div');
    runtimeHost.className = 'app-shell__runtime';
    container.replaceChildren(runtimeHost);

    const game = new SoftFocusGame(runtimeHost);
    window.__softFocusGame = game;
    mountSessionPanels(container, game);

    const refreshInputBounds = (): void => {
      game.scale.updateBounds();
    };

    refreshInputBounds();
    window.requestAnimationFrame(() => {
      refreshInputBounds();
      window.requestAnimationFrame(refreshInputBounds);
    });

    window.addEventListener('resize', refreshInputBounds);
    window.visualViewport?.addEventListener('resize', refreshInputBounds);
    window.visualViewport?.addEventListener('scroll', refreshInputBounds);
  })().catch((error) => {
    bootPromise = null;
    button.disabled = false;
    button.textContent = 'Open Soft Focus';
    statusText.textContent = 'Soft Focus could not load. Please try again.';
    throw error;
  });

  return bootPromise;
};

button.addEventListener('click', () => {
  void startSoftFocus();
});
