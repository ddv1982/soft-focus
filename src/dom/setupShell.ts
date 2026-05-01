import type { SoftFocusGame } from '../game/Game';
import { sceneKeys, type SceneKey } from '../game/sceneKeys';
import { getInstructionsBackScene } from '../game/navigation';
import { exerciseCatalog, getExerciseDefinition, getExerciseStartScene, upcomingExercisePhases, upcomingResetTools } from '../practice/exercises';
import { createPracticeConfigFromSettings } from '../practice/practiceConfig';
import {
  isBreathingPresetId,
  isMovingBallPresetId,
  isValidPhrase,
  normalizePhrase,
  phraseMaxLength,
  phraseMinLength,
  type BreathingPresetId,
  type MovingBallPresetId,
} from '../state/types';
import {
  bodyClass,
  createBackButton,
  createButton,
  createElement,
  createHeader,
  createSelect,
  createToggle,
  eyebrowClass,
  fieldClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  shellClass,
  titleClass,
} from './setupShellUi';

type SetupSceneKey = typeof sceneKeys.entry | typeof sceneKeys.exerciseSelection | typeof sceneKeys.phrase | typeof sceneKeys.instructions;
type SetupScreenKey = SetupSceneKey | 'history';

const setupSceneKeys = new Set<SceneKey>([
  sceneKeys.entry,
  sceneKeys.exerciseSelection,
  sceneKeys.phrase,
  sceneKeys.instructions,
]);

const isSetupSceneKey = (sceneKey: SceneKey): sceneKey is SetupSceneKey => setupSceneKeys.has(sceneKey);

declare global {
  interface Window {
    __softFocusShowSetupScene?: (sceneKey: SceneKey) => void;
  }
}

const stopActiveScenes = (game: SoftFocusGame, exceptSceneKey?: SceneKey): void => {
  game.scene.getScenes(true).forEach((scene) => {
    if (scene.scene.key !== exceptSceneKey) {
      game.scene.stop(scene.scene.key);
    }
  });
};

export const mountSetupShell = ({
  parent,
  game,
  runtimeHost,
  onPracticeVisible,
}: {
  parent: HTMLElement;
  game: SoftFocusGame;
  runtimeHost: HTMLElement;
  onPracticeVisible: () => void;
}): (() => void) => {
  const root = createElement('div', shellClass);
  parent.append(root);

  let currentSceneKey: SetupScreenKey = sceneKeys.entry;
  let phraseDraft = game.sessionStore.getState().phrase;
  let setupNavigationToken = 0;
  let practiceStartInFlight = false;

  const showSetup = (sceneKey: SetupSceneKey): void => {
    setupNavigationToken += 1;
    currentSceneKey = sceneKey;
    stopActiveScenes(game);
    parent.classList.add('app-runtime-shell--setup');
    runtimeHost.classList.add('app-shell__runtime--setup');
    root.hidden = false;
    render();
    window.requestAnimationFrame(() => root.querySelector<HTMLElement>('[data-autofocus]')?.focus());
  };

  const showPracticeRuntime = (): void => {
    setupNavigationToken += 1;
    root.hidden = true;
    parent.classList.remove('app-runtime-shell--setup');
    runtimeHost.classList.remove('app-shell__runtime--setup');
    onPracticeVisible();
  };

  const goTo = (sceneKey: SetupSceneKey): void => {
    if (sceneKey === sceneKeys.phrase) {
      phraseDraft = game.sessionStore.getState().phrase;
    }

    game.sessionStore.updateCurrentScene(sceneKey);
    showSetup(sceneKey);
  };

  const goToHistory = (): void => {
    setupNavigationToken += 1;
    currentSceneKey = 'history';
    stopActiveScenes(game);
    parent.classList.add('app-runtime-shell--setup');
    runtimeHost.classList.add('app-shell__runtime--setup');
    root.hidden = false;
    render();
    window.requestAnimationFrame(() => root.querySelector<HTMLElement>('[data-autofocus]')?.focus());
  };

  const formatSessionDate = (value: string): string => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const formatDuration = (durationSeconds: number | null): string => {
    if (durationSeconds === null) {
      return 'Duration unavailable';
    }

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;

    if (minutes === 0) {
      return `${seconds} sec`;
    }

    return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} sec`;
  };

  const startPractice = async (): Promise<void> => {
    if (practiceStartInFlight) {
      return;
    }

    const navigationToken = setupNavigationToken;

    practiceStartInFlight = true;
    renderInstructions();

    try {
      await game.ensureSceneRegistered(sceneKeys.practice);

      if (navigationToken !== setupNavigationToken || currentSceneKey !== sceneKeys.instructions) {
        return;
      }

      const practiceConfig = game.sessionStore.createPracticeConfig();
      showPracticeRuntime();
      game.scene.start(sceneKeys.practice, { practiceConfig });
    } catch (error) {
      if (navigationToken === setupNavigationToken && currentSceneKey === sceneKeys.instructions) {
        parent.classList.add('app-runtime-shell--setup');
        runtimeHost.classList.add('app-shell__runtime--setup');
        root.hidden = false;
        renderInstructions();
      }

      console.error('Soft Focus could not start practice.', error);
    } finally {
      practiceStartInFlight = false;

      if (!root.hidden && currentSceneKey === sceneKeys.instructions) {
        renderInstructions();
      }
    }
  };

  const renderEntry = (): void => {
    const main = createElement('main', 'mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl place-items-center');
    const panel = createElement('section', `${panelClass} relative isolate grid w-full gap-8 overflow-hidden p-7 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:p-12`);
    panel.setAttribute('aria-labelledby', 'setup-entry-title');
    const glow = createElement('div', 'pointer-events-none absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-wellness-mist/15 blur-3xl');
    const copy = createElement('div', 'flex flex-col justify-center gap-6');
    const title = createElement('h1', titleClass, 'A quieter way into focused practice');
    title.id = 'setup-entry-title';
    copy.append(
      createElement('p', eyebrowClass, 'Soft Focus'),
      title,
      createElement('p', `${bodyClass} max-w-xl`, 'Choose a gentle exercise, keep the settings that support today, and enter the Phaser practice space only when you are ready.'),
    );
    const actions = createElement('div', 'flex flex-wrap gap-3');
    const startButton = createButton('Choose your exercise', primaryButtonClass, () => goTo(sceneKeys.exerciseSelection));
    startButton.dataset.autofocus = 'true';
    actions.append(startButton, createButton('View recent reflections', secondaryButtonClass, goToHistory));
    copy.append(actions, createElement('p', 'max-w-xl text-sm leading-6 text-[var(--text-muted)]', 'If motion or pace feels too intense, pause, stop, or return to a steadier option.'));

    const notes = createElement('div', 'grid content-center gap-3');
    ['Phrase anchor for maintenance', 'Moving ball, breathing, rhythm, and orienting reset tools', 'Local persistence for phrase, settings, and session notes'].forEach((item) => {
      const card = createElement('article', 'rounded-3xl border border-[var(--line)] bg-white/[0.045] p-5');
      card.append(createElement('p', 'text-base font-bold text-wellness-foam', item));
      notes.append(card);
    });

    panel.append(glow, copy, notes);
    main.append(panel);
    root.replaceChildren(main);
  };

  const renderHistory = (): void => {
    const summaries = game.sessionStore.getState().recentSessionSummaries;
    const main = createElement('main', 'mx-auto flex w-full max-w-5xl flex-col gap-8 pb-12');
    main.append(createBackButton('Back to welcome', () => goTo(sceneKeys.entry)));
    main.append(createHeader('Recent results', 'Recent reflections saved here', 'These recent results are saved locally on this device/browser. They are not synced anywhere else.'));

    const panel = createElement('section', `${panelClass} grid gap-5 p-6 sm:p-8`);
    panel.setAttribute('aria-labelledby', 'recent-reflections-title');
    const heading = createElement('h2', 'text-2xl font-semibold text-wellness-foam', summaries.length > 0 ? 'Saved practice results' : 'No recent results yet');
    heading.id = 'recent-reflections-title';
    heading.tabIndex = -1;
    heading.dataset.autofocus = 'true';
    panel.append(heading);

    if (summaries.length === 0) {
      panel.append(createElement('p', `${bodyClass} max-w-2xl`, 'After you complete or stop a practice, its outcome and reflection will appear here for a short local history.'));
      main.append(panel);
      root.replaceChildren(main);
      return;
    }

    const list = createElement('div', 'grid gap-4');
    summaries.forEach((summary) => {
      const exercise = getExerciseDefinition(summary.exerciseId);
      const card = createElement('article', 'grid gap-4 rounded-3xl border border-[var(--line)] bg-white/[0.045] p-5');
      const meta = createElement('dl', 'grid gap-3 text-sm leading-6 text-[var(--text-muted)] sm:grid-cols-2');
      const addMeta = (label: string, value: string): void => {
        const group = createElement('div', 'grid gap-1 rounded-2xl bg-white/[0.035] p-3');
        group.append(
          createElement('dt', 'text-xs font-black uppercase tracking-[0.18em] text-wellness-mist', label),
          createElement('dd', 'font-semibold text-wellness-foam', value),
        );
        meta.append(group);
      };

      addMeta('Exercise', exercise.title);
      addMeta('Completed', formatSessionDate(summary.completedAt));
      addMeta('Outcome', summary.outcome === 'completed' ? 'Completed' : 'Stopped');
      addMeta('Duration', formatDuration(summary.durationSeconds));
      if (summary.phrase) {
        addMeta('Phrase', summary.phrase);
      }

      card.append(meta);
      card.append(createElement('p', 'rounded-2xl border border-[var(--line)] bg-white/[0.035] p-4 text-base leading-7 text-wellness-foam', summary.reflection || 'No reflection was saved for this result.'));
      list.append(card);
    });

    const clearButton = createButton('Clear recent results', `${secondaryButtonClass} w-fit border-red-200/30 text-red-100 hover:bg-red-500/10`, () => {
      if (!window.confirm('Clear recent locally saved results and reflections from this device/browser?')) {
        return;
      }

      game.sessionStore.clearRecentSessionSummaries();
      renderHistory();
      window.requestAnimationFrame(() => root.querySelector<HTMLElement>('[data-autofocus]')?.focus());
    });

    panel.append(list, clearButton);
    main.append(panel);
    root.replaceChildren(main);
  };

  const renderExerciseSelection = (): void => {
    const groups = [...new Set(exerciseCatalog.map((exercise) => exercise.phase))];
    const main = createElement('main', 'mx-auto flex w-full max-w-6xl flex-col gap-8 pb-12');
    main.append(createBackButton('Back to welcome', () => goTo(sceneKeys.entry)));
    main.append(createHeader('Exercise library', 'Select the shore that fits today', `Maintenance and Reset are ready now. Coming next: ${upcomingResetTools.join(', ')}.`));

    const grid = createElement('div', 'grid gap-5 lg:grid-cols-2');
    groups.forEach((group) => {
      const exercises = exerciseCatalog.filter((exercise) => exercise.phase === group);
      const phase = exercises[0];
      const section = createElement('section', `${panelClass} p-5 sm:p-6`);
      section.append(
        createElement('p', eyebrowClass, phase.phaseLabel),
        createElement('h2', 'mt-3 text-2xl font-semibold text-wellness-foam', phase.phaseSummary),
      );
      const list = createElement('div', 'mt-5 grid gap-3');
      exercises.forEach((exercise) => {
        const selected = game.sessionStore.getState().selectedExercise === exercise.id;
        const card = createElement('article', `rounded-3xl border p-5 transition motion-reduce:transition-none ${selected ? 'border-wellness-mist/70 bg-wellness-mist/10' : 'border-[var(--line)] bg-white/[0.04]'}`);
        card.append(
          createElement('p', 'text-xl font-semibold text-wellness-foam', exercise.title),
          createElement('p', 'mt-2 text-sm leading-6 text-[var(--text-muted)]', exercise.summary),
        );
        const button = createButton(`Start ${exercise.title}`, selected ? primaryButtonClass : secondaryButtonClass, () => {
          game.sessionStore.setSelectedExercise(exercise.id);
          goTo(getExerciseStartScene(exercise.id) as SetupSceneKey);
        });
        button.classList.add('mt-5', 'w-full');
        card.append(button);
        list.append(card);
      });
      section.append(list);
      grid.append(section);
    });

    const upcoming = upcomingExercisePhases[0];
    const roadmap = createElement('aside', `${panelClass} p-6`);
    roadmap.append(
      createElement('p', eyebrowClass, upcoming.label),
      createElement('p', 'mt-3 text-base leading-7 text-[var(--text-muted)]', upcoming.summary),
    );
    main.append(grid, roadmap);
    root.replaceChildren(main);
  };

  const renderPhrase = (): void => {
    const main = createElement('main', 'mx-auto flex w-full max-w-4xl flex-col gap-8 pb-12');
    main.append(createBackButton('Back to exercises', () => goTo(sceneKeys.exerciseSelection)));
    main.append(createHeader('Phrase anchor', 'Choose a phrase with room to breathe', 'Use a short phrase you can repeat gently when attention wanders.'));

    const form = createElement('form', `${panelClass} grid gap-5 p-6 sm:p-8`);
    const label = createElement('label', 'grid gap-3');
    label.append(createElement('span', 'text-sm font-black uppercase tracking-[0.18em] text-wellness-mist', 'Practice phrase'));
    const input = createElement('input', fieldClass);
    input.type = 'text';
    input.value = phraseDraft;
    input.placeholder = 'A short practice phrase';
    input.maxLength = phraseMaxLength;
    input.autocomplete = 'off';
    input.autocapitalize = 'sentences';
    input.spellcheck = false;
    input.enterKeyHint = 'done';
    input.setAttribute('aria-describedby', 'phrase-helper');
    input.dataset.autofocus = 'true';
    label.append(input);

    const helper = createElement('p', 'text-sm leading-6 text-[var(--text-muted)]');
    helper.id = 'phrase-helper';
    const continueButton = createButton('Continue to instructions', primaryButtonClass, () => undefined);
    const refresh = (): void => {
      const normalized = normalizePhrase(phraseDraft);
      const valid = isValidPhrase(normalized);
      helper.textContent = valid ? 'That phrase is ready. You can continue when it feels right.' : `Use ${phraseMinLength}-${phraseMaxLength} characters for now.`;
      continueButton.disabled = !valid;
      input.setAttribute('aria-invalid', phraseDraft.length > 0 && !valid ? 'true' : 'false');
    };
    const submit = (): void => {
      const normalized = normalizePhrase(phraseDraft);
      if (!isValidPhrase(normalized)) {
        refresh();
        input.focus();
        return;
      }
      game.sessionStore.setPhrase(normalized);
      goTo(sceneKeys.instructions);
    };
    continueButton.addEventListener('click', submit);
    input.addEventListener('input', () => {
      phraseDraft = input.value;
      refresh();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submit();
    });
    refresh();

    const note = createElement('p', 'rounded-3xl border border-[var(--line)] bg-white/[0.04] p-5 text-sm leading-6 text-[var(--text-muted)]', 'Keep it simple. During practice you will notice wandering, return to the phrase, and soften the effort.');
    form.append(label, helper, note, continueButton);
    main.append(form);
    root.replaceChildren(main);
  };

  const renderInstructions = (): void => {
    const state = game.sessionStore.getState();
    const previewConfig = createPracticeConfigFromSettings(state.selectedExercise, state.phrase, state.settings);
    const canStartPractice = !previewConfig.exercise.requiresPhrase || isValidPhrase(state.phrase);
    const main = createElement('main', 'mx-auto flex w-full max-w-6xl flex-col gap-8 pb-12');
    main.append(createBackButton('Back', () => goTo(getInstructionsBackScene(state.selectedExercise) as SetupSceneKey)));
    main.append(createHeader(previewConfig.exercise.phaseLabel, `${previewConfig.exercise.title} instructions`, previewConfig.copy.instructionsSubtitle));

    const layout = createElement('div', 'grid gap-5 lg:grid-cols-[0.9fr_1.1fr]');
    const summary = createElement('section', `${panelClass} p-6 sm:p-8`);
    summary.append(
      createElement('p', eyebrowClass, previewConfig.copy.instructionsSelectionLabel),
      createElement('h2', 'mt-3 text-3xl font-semibold text-wellness-foam', previewConfig.exercise.requiresPhrase ? `"${state.phrase}"` : previewConfig.display.phraseText),
    );
    if (previewConfig.movingBall) {
      summary.append(createElement('p', 'mt-3 text-sm leading-6 text-[var(--text-muted)]', previewConfig.movingBall.summary));
    }
    const expectations = createElement('ol', 'mt-6 grid gap-3');
    previewConfig.expectations.forEach((expectation, index) => {
      const item = createElement('li', 'grid grid-cols-[2rem_1fr] gap-3 rounded-3xl border border-[var(--line)] bg-white/[0.04] p-4 text-sm leading-6 text-[var(--text-muted)]');
      item.append(createElement('span', 'font-black text-wellness-mist', String(index + 1)), createElement('span', undefined, expectation));
      expectations.append(item);
    });
    summary.append(createElement('p', 'mt-7 text-base font-bold text-wellness-foam', previewConfig.copy.expectationsTitle), expectations);

    const settings = createElement('section', `${panelClass} grid gap-4 p-6 sm:p-8`);
    settings.append(createElement('p', eyebrowClass, 'Practice settings'));
    settings.append(
      createToggle({
        label: previewConfig.lowIntensity.label,
        description: previewConfig.lowIntensity.description,
        checked: state.settings.lowIntensityMode,
        onChange: (checked) => {
          game.sessionStore.setLowIntensityMode(checked);
          renderInstructions();
        },
      }),
      createToggle({
        label: previewConfig.reducedMotion.label,
        description: previewConfig.reducedMotion.description,
        checked: state.settings.reducedMotionEnabled,
        onChange: (checked) => {
          game.sessionStore.setReducedMotionEnabled(checked);
          renderInstructions();
        },
      }),
    );

    if (previewConfig.movingBall) {
      settings.append(createSelect({
        label: 'Moving ball preset',
        description: previewConfig.movingBall.summary,
        value: previewConfig.movingBall.presetId,
        options: previewConfig.movingBall.availablePresets,
        onChange: (value) => {
          if (isMovingBallPresetId(value)) {
            game.sessionStore.setMovingBallPreset(value as MovingBallPresetId);
            renderInstructions();
          }
        },
      }));
    } else if (previewConfig.breathingReset) {
      settings.append(createSelect({
        label: 'Breathing preset',
        description: previewConfig.breathingReset.summary,
        value: previewConfig.breathingReset.presetId,
        options: previewConfig.breathingReset.availablePresets,
        onChange: (value) => {
          if (isBreathingPresetId(value)) {
            game.sessionStore.setBreathingPreset(value as BreathingPresetId);
            renderInstructions();
          }
        },
      }));
    } else if (previewConfig.capabilities.auxiliaryControl.kind === 'toggle') {
      settings.append(createToggle({
        label: previewConfig.capabilities.auxiliaryControl.label,
        description: previewConfig.capabilities.auxiliaryControl.description,
        checked: state.settings.gazeGuidanceEnabled,
        onChange: (checked) => {
          game.sessionStore.setGazeGuidanceEnabled(checked);
          renderInstructions();
        },
      }));
    } else if (previewConfig.capabilities.auxiliaryControl.kind === 'info') {
      settings.append(createElement('p', 'rounded-3xl border border-[var(--line)] bg-white/[0.04] p-4 text-sm leading-6 text-[var(--text-muted)]', `${previewConfig.capabilities.auxiliaryControl.label}: ${previewConfig.capabilities.auxiliaryControl.description}`));
    }

    settings.append(createElement('p', 'text-sm leading-6 text-[var(--text-muted)]', `${previewConfig.capabilities.reducedMotion.title}: ${previewConfig.capabilities.reducedMotion.description}`));
    const startButton = createButton('Start practice', primaryButtonClass, () => {
      void startPractice();
    });
    startButton.disabled = !canStartPractice || practiceStartInFlight;
    startButton.textContent = practiceStartInFlight ? 'Starting practice…' : 'Start practice';
    startButton.dataset.autofocus = 'true';
    settings.append(startButton);

    layout.append(summary, settings);
    main.append(layout);
    root.replaceChildren(main);
  };

  const render = (): void => {
    if (currentSceneKey === sceneKeys.entry) {
      renderEntry();
      return;
    }

    if (currentSceneKey === sceneKeys.exerciseSelection) {
      renderExerciseSelection();
      return;
    }

    if (currentSceneKey === sceneKeys.phrase) {
      renderPhrase();
      return;
    }

    if (currentSceneKey === 'history') {
      renderHistory();
      return;
    }

    renderInstructions();
  };

  const unsubscribe = game.sessionStore.subscribe(() => {
    const sceneKey = game.sessionStore.getState().currentSession?.sceneKey;

    if (sceneKey && !isSetupSceneKey(sceneKey)) {
      root.hidden = true;
      parent.classList.remove('app-runtime-shell--setup');
      runtimeHost.classList.remove('app-shell__runtime--setup');
      return;
    }

    if (!root.hidden && currentSceneKey === sceneKeys.instructions) {
      renderInstructions();
    } else if (!root.hidden && currentSceneKey === 'history') {
      renderHistory();
    }
  });

  window.__softFocusShowSetupScene = (sceneKey) => {
    if (isSetupSceneKey(sceneKey)) {
      if (sceneKey === sceneKeys.phrase) {
        phraseDraft = game.sessionStore.getState().phrase;
      }
      game.sessionStore.updateCurrentScene(sceneKey);
      showSetup(sceneKey);
      const navigationToken = setupNavigationToken;
      void game.ensureSceneRegistered(sceneKey).then(() => {
        if (navigationToken !== setupNavigationToken || currentSceneKey !== sceneKey) {
          return;
        }

        stopActiveScenes(game, sceneKey);
        game.scene.start(sceneKey);
        game.sessionStore.updateCurrentScene(sceneKey);
      }).catch((error) => {
        console.error('Soft Focus could not show setup scene.', error);
      });
    }
  };

  showSetup(sceneKeys.entry);

  return () => {
    unsubscribe();
    if (window.__softFocusShowSetupScene) {
      delete window.__softFocusShowSetupScene;
    }
    root.remove();
  };
};
