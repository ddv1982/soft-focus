import { applyPreferredTheme } from './dom/themePreference';
import { getViewportSize } from './ui/layout';
import './styles.css';
import { reportOperatorError } from './observability/operatorErrors';

export {};

const container = document.getElementById('app');

applyPreferredTheme();

declare global {
  interface Window {
    __softFocusGame?: import('./game/Game').SoftFocusGame;
  }
}

if (!container) {
  throw new Error('Expected #app container to exist.');
}

const renderBootError = (): void => {
  container.className = 'app-shell';

  const card = document.createElement('section');
  card.className = 'app-shell__card';

  const title = document.createElement('h1');
  title.className = 'app-shell__title';
  title.textContent = 'Soft Focus could not load.';

  const body = document.createElement('p');
  body.className = 'app-shell__body';
  body.textContent = 'Please refresh and try again.';

  card.append(title, body);
  container.replaceChildren(card);
};

const startSoftFocus = async (): Promise<void> => {
  container.className = 'app-runtime-shell app-runtime-shell--setup';
  const runtimeHost = document.createElement('div');
  runtimeHost.className = 'app-shell__runtime app-shell__runtime--setup';
  container.replaceChildren(runtimeHost);

  try {
    const [{ SoftFocusGame }, { mountSessionPanels }, { mountSetupShell }] = await Promise.all([
      import('./game/Game'),
      import('./shell/sessionPanels'),
      import('./dom/setupShell'),
      document.fonts?.ready ?? Promise.resolve(),
    ]);

    const game = new SoftFocusGame(runtimeHost);
    window.__softFocusGame = game;
    mountSessionPanels(container, game);

    const refreshInputBounds = (): void => {
      const { width, height } = getViewportSize(runtimeHost);

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
  } catch (error) {
    renderBootError();
    reportOperatorError('Soft Focus failed to load.', error);
  }
};

void startSoftFocus();
