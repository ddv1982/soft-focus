import {
  createAmbientAudioEngine,
  getPracticeDurationSeconds,
  type AmbientAudioSettings,
  type AmbientAudioStartHandle,
} from '../audio/ambientAudio';
import type { SoftFocusGame } from '../game/Game';
import { sceneKeys, type SceneKey } from '../game/sceneKeys';
import { getInstructionsBackScene } from '../game/navigation';
import { reportOperatorError } from '../observability/operatorErrors';
import { exerciseCatalog, getExerciseDefinition, getExerciseStartScene } from '../practice/exercises';
import { createPracticeConfigFromSettings, type PracticeConfig } from '../practice/practiceConfig';
import {
  ambientAudioVolumeBounds,
  breathingPresetIds,
  customBreathingTimingBounds,
  customPracticeDurationBounds,
  isAmbientAudioPresetId,
  isBreathingPresetId,
  isMovingBallPresetId,
  isPracticeDurationPresetId,
  isValidPhrase,
  normalizePhrase,
  phraseMaxLength,
  phraseMinLength,
  practiceDurationPresetIds,
  sanitizeAmbientAudioVolume,
  type AmbientAudioPresetId,
  type BreathingPresetId,
  type MovingBallPresetId,
  type PracticeDurationPresetId,
} from '../state/types';
import {
  bodyClass,
  createBackButton,
  createButton,
  createElement,
  createHeader,
  createMinuteStepper,
  createRangeSlider,
  createSelect,
  createSecondStepper,
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

const getAmbientAudioSettings = (settings: PracticeConfig['ambientAudio']): AmbientAudioSettings => ({
  enabled: settings.enabled,
  presetId: settings.presetId,
  volume: settings.volume,
});

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
  let ambientAudioVolumeDraft: number | null = null;
  let setupNavigationToken = 0;
  let practiceStartInFlight = false;

  const focusAutofocusTarget = (): void => {
    window.requestAnimationFrame(() => root.querySelector<HTMLElement>('[data-autofocus]')?.focus());
  };

  const showSetup = (sceneKey: SetupSceneKey, { focusAutofocus = true }: { focusAutofocus?: boolean } = {}): void => {
    setupNavigationToken += 1;
    currentSceneKey = sceneKey;
    stopActiveScenes(game);
    parent.classList.add('app-runtime-shell--setup');
    runtimeHost.classList.add('app-shell__runtime--setup');
    root.hidden = false;
    render();

    if (focusAutofocus) {
      focusAutofocusTarget();
    }
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
    focusAutofocusTarget();
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

  const commitAmbientAudioVolumeDraft = (): void => {
    if (ambientAudioVolumeDraft === null) {
      return;
    }

    const volume = ambientAudioVolumeDraft;
    ambientAudioVolumeDraft = null;

    if (game.sessionStore.getState().settings.ambientAudioVolume !== volume) {
      game.sessionStore.setAmbientAudioVolume(volume);
    }
  };

  const startPractice = async (): Promise<void> => {
    if (practiceStartInFlight) {
      return;
    }

    commitAmbientAudioVolumeDraft();

    const navigationToken = setupNavigationToken;
    const practiceConfig = game.sessionStore.createPracticeConfig();
    let ambientAudioStart: AmbientAudioStartHandle | undefined;
    let ambientAudioHandedOff = false;

    if (practiceConfig.ambientAudio.enabled) {
      const ambientAudioSettings = getAmbientAudioSettings(practiceConfig.ambientAudio);
      const engine = createAmbientAudioEngine(ambientAudioSettings, {
        onPlaybackError: (error) => {
          reportOperatorError('Soft Focus could not continue ambient music.', error);
        },
      });
      const startResult = engine.start()
        .then(() => ({ ok: true }) as const)
        .catch((error: unknown) => ({ ok: false, error }) as const);

      ambientAudioStart = {
        engine,
        settings: ambientAudioSettings,
        startResult,
        totalDurationSeconds: getPracticeDurationSeconds(practiceConfig),
      };
    }

    practiceStartInFlight = true;
    renderInstructions();

    try {
      await game.ensureSceneRegistered(sceneKeys.practice);

      if (navigationToken !== setupNavigationToken || currentSceneKey !== sceneKeys.instructions) {
        return;
      }

      showPracticeRuntime();
      game.scene.start(sceneKeys.practice, { practiceConfig, ambientAudioStart });
      ambientAudioHandedOff = true;
    } catch (error) {
      if (navigationToken === setupNavigationToken && currentSceneKey === sceneKeys.instructions) {
        parent.classList.add('app-runtime-shell--setup');
        runtimeHost.classList.add('app-shell__runtime--setup');
        root.hidden = false;
        renderInstructions();
      }

      reportOperatorError('Soft Focus could not start practice.', error);
    } finally {
      if (!ambientAudioHandedOff) {
        ambientAudioStart?.engine.dispose({ fadeOutSeconds: 0 });
      }

      practiceStartInFlight = false;

      if (!root.hidden && currentSceneKey === sceneKeys.instructions) {
        renderInstructions();
      }
    }
  };

  const renderEntry = (): void => {
    const main = createElement('main', 'mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl place-items-center');
    const panel = createElement('section', `${panelClass} relative isolate w-full max-w-3xl overflow-hidden p-7 sm:p-10`);
    panel.setAttribute('aria-labelledby', 'setup-entry-title');
    const glow = createElement('div', 'pointer-events-none absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-wellness-mist/10 blur-3xl');
    const copy = createElement('div', 'flex flex-col justify-center gap-5');
    const title = createElement('h1', titleClass, 'A quiet space to practice');
    title.id = 'setup-entry-title';
    title.tabIndex = -1;
    title.dataset.autofocus = 'true';
    copy.append(
      createElement('p', eyebrowClass, 'Soft Focus'),
      title,
      createElement('p', `${bodyClass} max-w-xl`, 'Choose one gentle exercise. Pause or stop anytime.'),
    );
    const actions = createElement('div', 'flex flex-wrap gap-3');
    const startButton = createButton('Open Soft Focus', primaryButtonClass, () => goTo(sceneKeys.exerciseSelection));
    actions.append(startButton, createButton('Recent reflections', secondaryButtonClass, goToHistory));
    copy.append(actions);

    panel.append(glow, copy);
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
      focusAutofocusTarget();
    });

    panel.append(list, clearButton);
    main.append(panel);
    root.replaceChildren(main);
  };

  const renderExerciseSelection = (): void => {
    const groups = [...new Set(exerciseCatalog.map((exercise) => exercise.phase))];
    const main = createElement('main', 'mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-5 pb-12 sm:gap-7');
    main.append(createBackButton('Back to welcome', () => goTo(sceneKeys.entry)));
    main.append(createHeader('Exercises', 'Choose one gentle focus'));

    const grid = createElement('div', 'grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start');
    groups.forEach((group) => {
      const exercises = exerciseCatalog.filter((exercise) => exercise.phase === group);
      const phase = exercises[0];
      const section = createElement('section', `${panelClass} min-w-0 overflow-hidden p-4 sm:p-6`);
      section.append(
        createElement('p', eyebrowClass, phase.phaseLabel),
        createElement('p', 'mt-3 max-w-full min-w-0 break-words text-sm font-semibold leading-6 text-[var(--text-muted)] sm:max-w-md sm:text-lg sm:leading-7', phase.phaseSummary),
      );
      const list = createElement('div', 'mt-4 grid min-w-0 gap-3 sm:mt-5');
      exercises.forEach((exercise) => {
        const selected = game.sessionStore.getState().selectedExercise === exercise.id;
        const card = createElement('article', `min-w-0 overflow-hidden rounded-[1.5rem] border p-3 transition motion-reduce:transition-none sm:rounded-3xl sm:p-4 ${selected ? 'border-wellness-mist/55 bg-white/[0.075]' : 'border-[var(--line)] bg-white/[0.04]'}`);
        const cardHeader = createElement('div', 'flex min-w-0 flex-wrap items-center justify-between gap-2');
        cardHeader.append(createElement('p', 'min-w-0 break-words text-base font-semibold text-wellness-foam', exercise.title));
        card.append(cardHeader);
        const button = createButton(`Start ${exercise.title}`, selected ? primaryButtonClass : secondaryButtonClass, () => {
          game.sessionStore.setSelectedExercise(exercise.id);
          goTo(getExerciseStartScene(exercise.id) as SetupSceneKey);
        });
        button.classList.add('mt-4', 'w-full', 'min-w-0', 'max-w-full', 'whitespace-normal', 'text-center', 'leading-snug');
        card.append(button);
        list.append(card);
      });
      section.append(list);
      grid.append(section);
    });

    main.append(grid);
    root.replaceChildren(main);
  };

  const renderPhrase = (): void => {
    const main = createElement('main', 'mx-auto flex w-full max-w-4xl flex-col gap-8 pb-12');
    main.append(createBackButton('Back to exercises', () => goTo(sceneKeys.exerciseSelection)));
    main.append(createHeader('Phrase', 'Choose a short anchor'));

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
      helper.textContent = valid ? 'Ready.' : `Use ${phraseMinLength}-${phraseMaxLength} characters.`;
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

    form.append(label, helper, continueButton);
    main.append(form);
    root.replaceChildren(main);
  };

  const renderInstructions = (): void => {
    const state = game.sessionStore.getState();
    const previewConfig = createPracticeConfigFromSettings(state.selectedExercise, state.phrase, state.settings);
    const canStartPractice = !previewConfig.exercise.requiresPhrase || isValidPhrase(state.phrase);
    const main = createElement('main', 'mx-auto flex w-full max-w-6xl flex-col gap-8 pb-12');
    main.append(createBackButton('Back', () => goTo(getInstructionsBackScene(state.selectedExercise) as SetupSceneKey)));
    main.append(createHeader(previewConfig.exercise.phaseLabel, previewConfig.exercise.title));

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
    summary.append(createElement('p', 'mt-7 text-base font-bold text-wellness-foam', 'Practice flow'), expectations);

    const settings = createElement('section', `${panelClass} grid gap-4 p-6 sm:p-8`);
    settings.append(createElement('p', eyebrowClass, 'Practice settings'));
    const durationControl = createElement('div', 'grid gap-3');
    durationControl.append(createSelect({
      label: previewConfig.duration.label,
      description: previewConfig.duration.description,
      value: previewConfig.duration.presetId,
      options: previewConfig.duration.availablePresets,
      onChange: (value) => {
        if (isPracticeDurationPresetId(value)) {
          game.sessionStore.setPracticeDurationPreset(value as PracticeDurationPresetId);
          renderInstructions();
        }
      },
    }));

    if (previewConfig.duration.presetId === practiceDurationPresetIds.custom) {
      durationControl.append(createMinuteStepper({
        label: 'Custom duration minutes',
        minutes: previewConfig.duration.customMinutes,
        minMinutes: customPracticeDurationBounds.minMinutes,
        maxMinutes: customPracticeDurationBounds.maxMinutes,
        onChange: (minutes) => {
          game.sessionStore.setCustomPracticeDurationMinutes(minutes);
          renderInstructions();
        },
      }));
    }

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
      durationControl,
    );

    const audioSettings = createElement('div', 'grid gap-3 rounded-3xl border border-[var(--line)] bg-white/[0.035] p-4');
    audioSettings.append(createToggle({
      label: previewConfig.ambientAudio.label,
      description: previewConfig.ambientAudio.description,
      checked: state.settings.ambientAudioEnabled,
      onChange: (checked) => {
        ambientAudioVolumeDraft = null;
        game.sessionStore.setAmbientAudioEnabled(checked);
        renderInstructions();
      },
    }));

    if (state.settings.ambientAudioEnabled) {
      const ambientAudioVolume = ambientAudioVolumeDraft ?? state.settings.ambientAudioVolume;

      audioSettings.append(
        createSelect({
          label: 'Ambient music preset',
          description: previewConfig.ambientAudio.availablePresets.find(({ id }) => id === previewConfig.ambientAudio.presetId)?.summary ?? previewConfig.ambientAudio.description,
          value: previewConfig.ambientAudio.presetId,
          options: previewConfig.ambientAudio.availablePresets,
          onChange: (value) => {
            if (isAmbientAudioPresetId(value)) {
              game.sessionStore.setAmbientAudioPreset(value as AmbientAudioPresetId);
              renderInstructions();
            }
          },
        }),
        createRangeSlider({
          label: 'Ambient music volume',
          description: 'Adjust before practice starts. The value updates while you drag and commits when released; start near 40% and lower if you want more space.',
          value: ambientAudioVolume,
          min: ambientAudioVolumeBounds.min,
          max: ambientAudioVolumeBounds.max,
          valueLabel: `${ambientAudioVolume}%`,
          onInput: (volume) => {
            ambientAudioVolumeDraft = sanitizeAmbientAudioVolume(volume);
          },
          onChange: (volume) => {
            ambientAudioVolumeDraft = null;
            game.sessionStore.setAmbientAudioVolume(volume);
            renderInstructions();
          },
        }),
      );
    }

    settings.append(audioSettings);

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
      const breathingControl = createElement('div', 'grid gap-3');
      breathingControl.append(createSelect({
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

      if (previewConfig.breathingReset.presetId === breathingPresetIds.custom) {
        breathingControl.append(
          createSecondStepper({
            label: 'Custom inhale',
            description: 'Choose how many seconds the visual cue spends on the inhale.',
            seconds: state.settings.customBreathingInhaleSeconds,
            minSeconds: customBreathingTimingBounds.minSeconds,
            maxSeconds: customBreathingTimingBounds.maxSeconds,
            onChange: (seconds) => {
              game.sessionStore.setCustomBreathingInhaleSeconds(seconds);
              renderInstructions();
            },
          }),
          createSecondStepper({
            label: 'Custom hold',
            description: 'Choose the gentle pause after the inhale before the exhale starts.',
            seconds: state.settings.customBreathingHoldSeconds,
            minSeconds: customBreathingTimingBounds.minSeconds,
            maxSeconds: customBreathingTimingBounds.maxSeconds,
            onChange: (seconds) => {
              game.sessionStore.setCustomBreathingHoldSeconds(seconds);
              renderInstructions();
            },
          }),
          createSecondStepper({
            label: 'Custom exhale',
            description: 'Choose how many seconds the visual cue spends on the exhale.',
            seconds: state.settings.customBreathingExhaleSeconds,
            minSeconds: customBreathingTimingBounds.minSeconds,
            maxSeconds: customBreathingTimingBounds.maxSeconds,
            onChange: (seconds) => {
              game.sessionStore.setCustomBreathingExhaleSeconds(seconds);
              renderInstructions();
            },
          }),
        );
      }

      settings.append(breathingControl);
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
        reportOperatorError('Soft Focus could not show setup scene.', error);
      });
    }
  };

  showSetup(sceneKeys.entry, { focusAutofocus: false });

  return () => {
    unsubscribe();
    if (window.__softFocusShowSetupScene) {
      delete window.__softFocusShowSetupScene;
    }
    root.remove();
  };
};
