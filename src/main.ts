import './styles.css';

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
  title.textContent = 'Step into a quiet ocean practice space.';

  const body = document.createElement('p');
  body.className = 'app-shell__body';
  body.textContent = 'Soft Focus opens like a safe shoreline: choose one gentle exercise, follow the pace that fits today, and pause or stop whenever you need more room.';

  const list = document.createElement('ul');
  list.className = 'app-shell__list';
  [
    'Ocean-calm maintenance: phrase anchor',
    'Reset tools: breathing, moving ball, rhythm, and orienting',
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
  statusText.textContent = 'The practice runtime stays unloaded until you enter the space.';

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
  button.textContent = 'Opening Soft Focus…';
  statusText.textContent = 'Preparing the shoreline practice space.';

  bootPromise = (async () => {
    const [{ SoftFocusGame }, { mountSessionPanels }, { mountSetupShell }] = await Promise.all([
      import('./game/Game'),
      import('./shell/sessionPanels'),
      import('./dom/setupShell'),
      document.fonts?.ready ?? Promise.resolve(),
    ]);

    container.className = 'app-runtime-shell app-runtime-shell--setup';
    const runtimeHost = document.createElement('div');
    runtimeHost.className = 'app-shell__runtime app-shell__runtime--setup';
    container.replaceChildren(runtimeHost);

    const game = new SoftFocusGame(runtimeHost);
    window.__softFocusGame = game;
    mountSessionPanels(container, game);

    const refreshInputBounds = (): void => {
      const width = runtimeHost.clientWidth || window.innerWidth;
      const height = runtimeHost.clientHeight || window.innerHeight;

      if (width > 0 && height > 0) {
        game.scale.resize(width, height);
      }

      game.scale.updateBounds();
    };

    refreshInputBounds();
    mountSetupShell({
      parent: container,
      game,
      runtimeHost,
      onPracticeVisible: refreshInputBounds,
    });

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
    console.error('Soft Focus failed to load.', error);
  });

  return bootPromise;
};

button.addEventListener('click', () => {
  void startSoftFocus();
});
