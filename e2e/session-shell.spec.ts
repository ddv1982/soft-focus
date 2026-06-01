import { expect, type Page, test } from '@playwright/test';

declare global {
  interface Window {
    __softFocusAudioInstances?: Array<{
      volume: number;
      playCalls: number;
      pauseCalls: number;
      loadCalls: number;
      removedAttributes: string[];
      paused: boolean;
    }>;
    __softFocusAudioGainValues?: number[];
  }
}

const openSoftFocus = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Soft Focus' }).click();
  await page.waitForFunction(() => Boolean(window.__softFocusGame));
};

const startBreathingResetPractice = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Start Breathing reset' }).click();
  await page.getByRole('button', { name: 'Start practice' }).click();
  await page.waitForFunction(() => window.__softFocusGame?.sessionStore.getState().currentSession?.sceneKey === 'practice');
};

const installAudioStub = async (page: Page, mode: 'direct' | 'web-audio' = 'direct'): Promise<void> => {
  await page.addInitScript((stubMode) => {
    class FakeAudio {
      preload = '';

      src = '';

      currentTime = 0;

      volume = 0;

      playCalls = 0;

      pauseCalls = 0;

      loadCalls = 0;

      removedAttributes: string[] = [];

      paused = true;

      onended: (() => void) | null = null;

      onerror: (() => void) | null = null;

      constructor() {
        window.__softFocusAudioInstances ??= [];
        window.__softFocusAudioInstances.push(this);
      }

      async play(): Promise<void> {
        this.playCalls += 1;
        this.paused = false;
      }

      pause(): void {
        this.pauseCalls += 1;
        this.paused = true;
      }

      removeAttribute(qualifiedName: string): void {
        this.removedAttributes.push(qualifiedName);

        if (qualifiedName === 'src') {
          this.src = '';
        }
      }

      load(): void {
        this.loadCalls += 1;
      }
    }

    window.__softFocusAudioInstances = [];
    window.__softFocusAudioGainValues = [];
    Object.defineProperty(window, 'Audio', {
      configurable: true,
      value: FakeAudio,
    });

    if (stubMode === 'direct') {
      Object.defineProperty(window, 'AudioContext', {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(window, 'webkitAudioContext', {
        configurable: true,
        value: undefined,
      });
      return;
    }

    class FakeAudioParam {
      value = 0;

      cancelScheduledValues(): void {
        // No-op in the deterministic test double.
      }

      setTargetAtTime(value: number): void {
        this.value = value;
        window.__softFocusAudioGainValues?.push(value);
      }

      setValueAtTime(value: number): void {
        this.value = value;
        window.__softFocusAudioGainValues?.push(value);
      }
    }

    class FakeGainNode {
      gain = new FakeAudioParam();

      connect(): void {
        // No-op in the deterministic test double.
      }

      disconnect(): void {
        // No-op in the deterministic test double.
      }
    }

    class FakeMediaElementAudioSourceNode {
      connect(): void {
        // No-op in the deterministic test double.
      }

      disconnect(): void {
        // No-op in the deterministic test double.
      }
    }

    class FakeAudioContext {
      currentTime = 0;

      destination = {};

      state = 'running';

      createMediaElementSource(): FakeMediaElementAudioSourceNode {
        return new FakeMediaElementAudioSourceNode();
      }

      createGain(): FakeGainNode {
        const node = new FakeGainNode();
        window.__softFocusAudioGainValues?.push(node.gain.value);
        return node;
      }

      async resume(): Promise<void> {
        this.state = 'running';
      }

      async close(): Promise<void> {
        this.state = 'closed';
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: FakeAudioContext,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      value: FakeAudioContext,
    });
  }, mode);
};

const getLatestAmbientOutputVolume = async (page: Page): Promise<number> => page.evaluate(() => {
  const gainValue = window.__softFocusAudioGainValues?.at(-1);

  if (typeof gainValue === 'number') {
    return gainValue;
  }

  return window.__softFocusAudioInstances?.at(-1)?.volume ?? 0;
});

test('welcome title is not focused on initial load', async ({ page }) => {
  await page.goto('/');

  const title = page.getByRole('heading', { name: 'A quiet space to practice' });

  await expect(title).toBeVisible();
  await expect(title).not.toBeFocused();
});

test('exercise library is horizontally contained on narrow iPhone widths', async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await openSoftFocus(page);

    await expect(page.getByRole('heading', { name: 'Choose one gentle focus' })).toBeVisible();

    const overflow = await page.evaluate(() => {
      const setupShell = document.querySelector<HTMLElement>('.setup-shell');

      return {
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        setupClientWidth: setupShell?.clientWidth ?? 0,
        setupScrollWidth: setupShell?.scrollWidth ?? 0,
      };
    });

    expect(overflow.documentScrollWidth).toBeLessThanOrEqual(overflow.documentClientWidth + 1);
    expect(overflow.setupScrollWidth).toBeLessThanOrEqual(overflow.setupClientWidth + 1);
  }
});

test('setup instruction controls stay within cards on iPhone 13 mini width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openSoftFocus(page);
  await page.getByRole('button', { name: 'Start Breathing reset' }).click();

  const breathingPreset = page.locator('.setup-shell label', { hasText: 'Breathing preset' }).locator('select');
  await expect(breathingPreset).toBeVisible();

  const metrics = await breathingPreset.evaluate((element) => {
    const select = element as HTMLSelectElement;
    const card = select.closest('label');

    if (!card) {
      throw new Error('Breathing preset control card was not found');
    }

    const cardRect = card.getBoundingClientRect();
    const selectRect = select.getBoundingClientRect();

    return {
      cardClientWidth: card.clientWidth,
      cardScrollWidth: card.scrollWidth,
      cardLeft: cardRect.left,
      cardRight: cardRect.right,
      selectLeft: selectRect.left,
      selectRight: selectRect.right,
      selectWidth: selectRect.width,
    };
  });

  expect(metrics.cardScrollWidth).toBeLessThanOrEqual(metrics.cardClientWidth + 1);
  expect(metrics.selectLeft).toBeGreaterThanOrEqual(metrics.cardLeft - 1);
  expect(metrics.selectRight).toBeLessThanOrEqual(metrics.cardRight + 1);
  expect(metrics.selectWidth).toBeLessThanOrEqual(metrics.cardClientWidth);
});

test('preferences panel is scrollable after opening on iPhone 13 mini width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openSoftFocus(page);
  await startBreathingResetPractice(page);

  await page.getByRole('button', { name: 'Preferences' }).click();
  const panel = page.locator('.preferences-shell__panel:not(.preferences-shell__panel--hidden)');
  await expect(panel).toBeVisible();

  const scrollMetrics = await panel.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);

  await panel.evaluate((element) => {
    element.scrollTop = 96;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test('setup ambient music volume input is applied to the MP3 when practice starts', async ({ page }) => {
  await installAudioStub(page);
  await openSoftFocus(page);
  await page.getByRole('button', { name: 'Start Breathing reset' }).click();
  await page.evaluate(() => {
    const game = window.__softFocusGame;

    if (!game) {
      throw new Error('Soft Focus game not available on window');
    }

    game.sessionStore.setAmbientAudioEnabled(true);
    game.sessionStore.setAmbientAudioVolume(80);
  });

  const setupAmbientVolume = page.locator('.setup-shell label:has-text("Ambient music volume") input[type="range"]');
  await expect(setupAmbientVolume).toBeVisible();
  await setupAmbientVolume.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '20';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(await page.evaluate(() => window.__softFocusGame?.sessionStore.getState().settings.ambientAudioVolume)).toBe(80);

  await page.getByRole('button', { name: 'Start practice' }).click();
  await page.waitForFunction(() => {
    const audio = window.__softFocusAudioInstances?.at(-1);

    return Boolean(audio && audio.playCalls > 0);
  });

  expect(await page.evaluate(() => window.__softFocusGame?.sessionStore.getState().settings.ambientAudioVolume)).toBe(20);
  await expect.poll(() => page.evaluate(() => window.__softFocusAudioInstances?.at(-1)?.volume ?? 1))
    .toBeLessThan(0.4);
});

test('ambient volume slider updates playing audio during input before change', async ({ page }) => {
  await installAudioStub(page, 'web-audio');
  await openSoftFocus(page);
  await page.getByRole('button', { name: 'Start Breathing reset' }).click();
  await page.evaluate(() => {
    const game = window.__softFocusGame;

    if (!game) {
      throw new Error('Soft Focus game not available on window');
    }

    game.sessionStore.setAmbientAudioEnabled(true);
    game.sessionStore.setAmbientAudioVolume(80);
  });
  await page.getByRole('button', { name: 'Start practice' }).click();
  await page.waitForFunction(() => {
    const audio = window.__softFocusAudioInstances?.at(-1);

    return Boolean(audio && audio.playCalls > 0 && audio.volume > 0);
  });

  const initialVolume = await getLatestAmbientOutputVolume(page);
  await page.getByRole('button', { name: 'Preferences' }).click();

  const ambientVolume = page.getByLabel('Ambient volume');
  await expect(ambientVolume).toBeVisible();
  await ambientVolume.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '20';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect.poll(() => getLatestAmbientOutputVolume(page))
    .toBeLessThan(initialVolume);
  expect(await page.evaluate(() => window.__softFocusGame?.sessionStore.getState().settings.ambientAudioVolume)).toBe(80);

  await ambientVolume.dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => window.__softFocusGame?.sessionStore.getState().settings.ambientAudioVolume))
    .toBe(20);
});

test('theme restart preserves ambient audio without replaying the MP3', async ({ page }) => {
  await installAudioStub(page);
  await openSoftFocus(page);
  await page.getByRole('button', { name: 'Start Breathing reset' }).click();
  await page.evaluate(() => {
    const game = window.__softFocusGame;

    if (!game) {
      throw new Error('Soft Focus game not available on window');
    }

    game.sessionStore.setAmbientAudioEnabled(true);
    game.sessionStore.setAmbientAudioVolume(80);
  });
  await page.getByRole('button', { name: 'Start practice' }).click();
  await page.waitForFunction(() => {
    const audio = window.__softFocusAudioInstances?.at(-1);

    return Boolean(audio && audio.playCalls > 0 && !audio.paused);
  });
  await page.evaluate(() => {
    window.__softFocusGame?.sessionStore.setAmbientAudioVolume(20);
  });
  await expect.poll(() => page.evaluate(() => window.__softFocusAudioInstances?.[0]?.volume ?? 1))
    .toBeLessThan(0.4);

  await page.evaluate(() => {
    window.dispatchEvent(new Event('soft-focus:themechange'));
  });
  await page.waitForFunction(() => window.__softFocusGame?.sessionStore.getState().currentSession?.sceneKey === 'practice');

  expect(await page.evaluate(() => window.__softFocusAudioInstances?.length)).toBe(1);
  expect(await page.evaluate(() => window.__softFocusAudioInstances?.[0]?.playCalls)).toBe(1);
  expect(await page.evaluate(() => window.__softFocusAudioInstances?.[0]?.removedAttributes.includes('src'))).toBe(false);
  expect(await page.evaluate(() => window.__softFocusAudioInstances?.[0]?.loadCalls)).toBe(0);
});

test('resize restart preserves ambient audio without replaying the MP3', async ({ page }) => {
  await installAudioStub(page);
  await openSoftFocus(page);
  await page.getByRole('button', { name: 'Start Breathing reset' }).click();
  await page.evaluate(() => {
    const game = window.__softFocusGame;

    if (!game) {
      throw new Error('Soft Focus game not available on window');
    }

    game.sessionStore.setAmbientAudioEnabled(true);
  });
  await page.getByRole('button', { name: 'Start practice' }).click();
  await page.waitForFunction(() => {
    const audio = window.__softFocusAudioInstances?.at(-1);

    return Boolean(audio && audio.playCalls > 0 && !audio.paused);
  });

  await page.setViewportSize({ width: 900, height: 720 });
  await page.waitForFunction(() => window.__softFocusGame?.sessionStore.getState().currentSession?.sceneKey === 'practice');

  expect(await page.evaluate(() => window.__softFocusAudioInstances?.length)).toBe(1);
  expect(await page.evaluate(() => window.__softFocusAudioInstances?.[0]?.playCalls)).toBe(1);
  expect(await page.evaluate(() => window.__softFocusAudioInstances?.[0]?.removedAttributes.includes('src'))).toBe(false);
  expect(await page.evaluate(() => window.__softFocusAudioInstances?.[0]?.loadCalls)).toBe(0);
});

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
  const breathingPreset = page.getByLabel('Breathing preset');

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
