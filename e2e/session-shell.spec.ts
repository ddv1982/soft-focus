import { expect, type Page, test } from '@playwright/test';

const openSoftFocus = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Soft Focus' }).click();
  await page.waitForFunction(() => Boolean(window.__softFocusGame));
};

const putGameIntoCompletion = async (
  page: Page,
  {
    exerciseId,
    outcome,
  }: {
    exerciseId: 'breathing-reset' | 'moving-ball';
    outcome: 'completed' | 'stopped';
  },
): Promise<void> => {
  await page.evaluate(async ({ exerciseId, outcome }) => {
    const game = window.__softFocusGame;

    if (!game) {
      throw new Error('Soft Focus game not available on window');
    }

    const store = game.sessionStore;
    store.setSelectedExercise(exerciseId);
    const practiceConfig = store.createPracticeConfig();

    store.updateCurrentScene('instructions');
    store.updateCurrentScene('practice');
    store.startPractice(practiceConfig);

    if (outcome === 'stopped') {
      store.stopPractice();
    }

    store.completeSession('2026-04-23T10:00:00.000Z');
    store.clearPractice();
    await game.ensureSceneRegistered('completion');
    store.updateCurrentScene('completion');
    game.scene.start('completion', { outcome });
  }, { exerciseId, outcome });
};

test('preferences panel persists safety and breathing settings across reloads', async ({ page }) => {
  await openSoftFocus(page);

  await page.evaluate(() => {
    const game = window.__softFocusGame;

    if (!game) {
      throw new Error('Soft Focus game not available on window');
    }

    game.sessionStore.setSelectedExercise('breathing-reset');
    game.sessionStore.setLowIntensityMode(false);
    game.sessionStore.setReducedMotionEnabled(false);
  });

  await page.getByRole('button', { name: 'Preferences' }).click();

  const lowIntensity = page.locator('.preferences-shell__toggle').filter({ hasText: 'Low intensity' }).locator('input[type="checkbox"]');
  const reducedMotion = page.locator('.preferences-shell__toggle').filter({ hasText: 'Reduced motion' }).locator('input[type="checkbox"]');
  const gazeGuidance = page.locator('.preferences-shell__toggle').filter({ hasText: 'Gaze guidance' }).locator('input[type="checkbox"]');
  const breathingPreset = page.locator('.preferences-shell__select');

  await expect(gazeGuidance).toBeDisabled();
  await lowIntensity.check();
  await reducedMotion.check();
  await breathingPreset.selectOption('cyclic-sighing-2-1-6');

  await page.waitForFunction(() => {
    const settings = window.__softFocusGame?.sessionStore.getState().settings;

    return Boolean(
      settings?.lowIntensityMode
      && settings.reducedMotionEnabled
      && settings.breathingPresetId === 'cyclic-sighing-2-1-6',
    );
  });

  await page.reload();
  await page.getByRole('button', { name: 'Open Soft Focus' }).click();
  await page.waitForFunction(() => Boolean(window.__softFocusGame));
  await page.getByRole('button', { name: 'Preferences' }).click();

  await expect(lowIntensity).toBeChecked();
  await expect(reducedMotion).toBeChecked();
  await expect(breathingPreset).toHaveValue('cyclic-sighing-2-1-6');
});

test('reflection panel saves a note and restarts a direct-practice exercise', async ({ page }) => {
  await openSoftFocus(page);
  await putGameIntoCompletion(page, { exerciseId: 'breathing-reset', outcome: 'completed' });

  await expect(page.getByRole('heading', { name: /reset round complete/i })).toBeVisible();
  await expect(page.getByText('Exercise: Breathing reset')).toBeVisible();

  await page.getByRole('button', { name: 'Continue to reflection' }).click();
  await expect(page.getByRole('heading', { name: /notice what softened/i })).toBeVisible();

  await page.getByLabel('Session reflection').fill('  softer breath and clear shoulders  ');
  await expect(page.getByText(`33/240 characters`)).toBeVisible();
  await page.getByRole('button', { name: 'Save and start again' }).click();

  await page.waitForFunction(() => {
    const game = window.__softFocusGame;

    return Boolean(
      game
      && game.sessionStore.getState().currentSession?.sceneKey === 'instructions'
      && game.sessionStore.getLatestSessionSummary()?.reflection === 'softer breath and clear shoulders'
      && game.scene.isActive('instructions') === true,
    );
  });
});

test('completion panel can skip reflection and return to the exercise library', async ({ page }) => {
  await openSoftFocus(page);
  await putGameIntoCompletion(page, { exerciseId: 'moving-ball', outcome: 'stopped' });

  await expect(page.getByRole('heading', { name: /reset round paused early/i })).toBeVisible();
  await expect(page.getByText('Exercise: Moving ball')).toBeVisible();
  await expect(page.getByText('Mode: Stopped early')).toBeVisible();

  await page.getByRole('button', { name: 'Choose another exercise' }).click();

  await page.waitForFunction(() => {
    const game = window.__softFocusGame;

    return Boolean(
      game
      && game.sessionStore.getState().currentSession === null
      && game.sessionStore.getState().selectedExercise === 'moving-ball'
      && game.scene.isActive('exercise-selection') === true,
    );
  });
});
