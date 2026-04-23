import { expect, test } from '@playwright/test';

test('breathing preset selection persists and choose-another-exercise returns to the library', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Open Soft Focus' }).click();

  await page.waitForFunction(() => Boolean(window.__softFocusGame));

  await page.evaluate(async () => {
    const game = window.__softFocusGame;

    if (!game) {
      throw new Error('Soft Focus game not available on window');
    }

    game.sessionStore.setSelectedExercise('breathing-reset');
  });

  await page.getByRole('button', { name: 'Preferences' }).click();
  const breathingPresetSelect = page.locator('.preferences-shell__select');
  await expect(breathingPresetSelect).toBeVisible();
  await breathingPresetSelect.selectOption('coherent-5-5');

  await page.waitForFunction(() => (
    window.__softFocusGame?.sessionStore.getState().settings.breathingPresetId === 'coherent-5-5'
  ));

  await page.evaluate(async () => {
    const game = window.__softFocusGame;

    if (!game) {
      throw new Error('Soft Focus game not available on window');
    }

    const store = game.sessionStore;
    const practiceConfig = store.createPracticeConfig();

    store.updateCurrentScene('instructions');
    store.updateCurrentScene('practice');
    store.startPractice(practiceConfig);
    store.stopPractice();
    store.completeSession('2026-04-23T10:00:00.000Z');
    store.clearPractice();
    await game.ensureSceneRegistered('completion');
    store.updateCurrentScene('completion');
    game.scene.start('completion', { outcome: 'stopped' });
  });

  await expect(page.getByRole('heading', { name: /round paused early/i })).toBeVisible();
  await page.getByRole('button', { name: 'Choose another exercise' }).click();

  await page.waitForFunction(() => {
    const game = window.__softFocusGame;

    return Boolean(
      game
      && game.sessionStore.getState().currentSession === null
      && game.sessionStore.getState().selectedExercise === 'breathing-reset'
    );
  });

  await page.waitForFunction(() => window.__softFocusGame?.scene.isActive('exercise-selection') === true);
});
