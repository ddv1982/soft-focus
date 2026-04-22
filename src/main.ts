import { SoftFocusGame } from './game/Game';

const container = document.getElementById('app');

if (!container) {
  throw new Error('Expected #app container to exist.');
}

const game = new SoftFocusGame(container);

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
document.fonts?.ready.then(refreshInputBounds).catch(() => {
  // Ignore font-loading issues; bounds refresh is only a best-effort sync.
});
