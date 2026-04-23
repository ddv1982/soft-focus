import type { SoftFocusGame } from '../game/Game';
import { sceneKeys, type SceneKey } from '../game/sceneKeys';
import { getSessionFlowForExercise } from '../game/navigation';
import { createPracticeConfigFromSettings } from '../practice/practiceConfig';
import { exerciseIds, normalizeReflection, reflectionMaxLength } from '../state/types';

const supportCopy = 'If this feels too intense, stop and return to a steadier option. Seek local support if you need more help.';

const formatDuration = (durationSeconds: number | null): string => {
  if (!durationSeconds || durationSeconds < 60) {
    return durationSeconds === 1 ? '1 second' : `${durationSeconds ?? 0} seconds`;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  if (seconds === 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  return `${minutes}m ${seconds}s`;
};

const navigateToManagedScene = (game: SoftFocusGame, sceneKey: SceneKey, data?: object): void => {
  game.sessionStore.updateCurrentScene(sceneKey);
  game.scene.start(sceneKey, data);
};

const createOverlayRoot = (parent: HTMLElement): HTMLDivElement => {
  const root = document.createElement('div');
  root.className = 'session-overlay session-overlay--hidden';
  parent.append(root);
  return root;
};

const createPreferencesRoot = (parent: HTMLElement): HTMLDivElement => {
  const root = document.createElement('div');
  root.className = 'preferences-shell';
  parent.append(root);
  return root;
};

const createPanel = (): HTMLElement => {
  const panel = document.createElement('section');
  panel.className = 'session-overlay__panel';
  return panel;
};

const createEyebrow = (text: string): HTMLParagraphElement => {
  const eyebrow = document.createElement('p');
  eyebrow.className = 'session-overlay__eyebrow';
  eyebrow.textContent = text;
  return eyebrow;
};

const createTitle = (text: string): HTMLHeadingElement => {
  const title = document.createElement('h2');
  title.className = 'session-overlay__title';
  title.textContent = text;
  return title;
};

const createBody = (text: string): HTMLParagraphElement => {
  const body = document.createElement('p');
  body.className = 'session-overlay__body';
  body.textContent = text;
  return body;
};

const createSummaryList = (lines: string[]): HTMLUListElement => {
  const list = document.createElement('ul');
  list.className = 'session-overlay__list';

  lines.forEach((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    list.append(item);
  });

  return list;
};

const createPrimaryButton = (label: string, onClick: () => void): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'app-shell__button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
};

const createSecondaryButton = (label: string, onClick: () => void): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'preferences-shell__button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
};

const createPreferenceToggle = ({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}): HTMLLabelElement => {
  const row = document.createElement('label');
  row.className = `preferences-shell__toggle${disabled ? ' preferences-shell__toggle--disabled' : ''}`;

  const copy = document.createElement('div');
  copy.className = 'preferences-shell__toggle-copy';

  const title = document.createElement('span');
  title.className = 'preferences-shell__toggle-title';
  title.textContent = label;

  const body = document.createElement('span');
  body.className = 'preferences-shell__toggle-body';
  body.textContent = description;

  copy.append(title, body);

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.disabled = disabled;
  input.className = 'preferences-shell__checkbox';
  input.addEventListener('change', () => {
    onChange(input.checked);
  });

  row.append(copy, input);
  return row;
};

const renderCompletionPanel = (root: HTMLElement, game: SoftFocusGame): void => {
  const state = game.sessionStore.getState();
  const latestSummary = game.sessionStore.getLatestSessionSummary();

  if (!latestSummary) {
    root.classList.add('session-overlay--hidden');
    root.replaceChildren();
    return;
  }

  const practiceConfig = createPracticeConfigFromSettings(
    latestSummary.exerciseId ?? state.selectedExercise,
    latestSummary.phrase || state.phrase,
    state.settings,
  );
  const phrase = latestSummary.phrase || state.phrase;
  const summaryLines = [
    `Phase: ${practiceConfig.exercise.phaseLabel}`,
    `Exercise: ${practiceConfig.exercise.title}`,
    ...(practiceConfig.movingBall ? [`Preset: ${practiceConfig.movingBall.title}`] : []),
    ...(practiceConfig.exercise.requiresPhrase ? [phrase ? `Phrase: "${phrase}"` : 'Phrase: not available'] : []),
    `Length: ${formatDuration(latestSummary.durationSeconds ?? null)}`,
    `Mode: ${latestSummary.outcome === 'stopped' ? 'Stopped early' : 'Completed'}`,
  ];

  const panel = createPanel();
  panel.append(
    createEyebrow(practiceConfig.exercise.phaseLabel),
    createTitle(latestSummary.outcome === 'stopped' ? `${practiceConfig.exercise.phaseLabel} round paused early` : `${practiceConfig.exercise.phaseLabel} round complete`),
    createBody(latestSummary.outcome === 'stopped'
      ? `You ended this ${practiceConfig.exercise.phaseLabel.toLowerCase()} round cleanly. Take a brief breath before reflecting.`
      : `You reached the end of this ${practiceConfig.exercise.phaseLabel.toLowerCase()} round. Take a brief breath before reflecting.`),
    createSummaryList(summaryLines),
    createBody(practiceConfig.copy.completionNote),
  );

  const support = createBody(supportCopy);
  support.className = 'session-overlay__support';

  const actions = document.createElement('div');
  actions.className = 'app-shell__actions';
  const continueButton = createPrimaryButton('Continue to reflection', () => {
    navigateToManagedScene(game, sceneKeys.reflection);
  });
  actions.append(continueButton);
  panel.append(actions, support);

  root.classList.remove('session-overlay--hidden');
  root.replaceChildren(panel);
  queueMicrotask(() => continueButton.focus());
};

const renderReflectionPanel = (root: HTMLElement, game: SoftFocusGame): void => {
  const state = game.sessionStore.getState();
  const practiceConfig = createPracticeConfigFromSettings(state.selectedExercise, state.phrase, state.settings);
  const savedReflection = state.currentSession?.reflection ?? game.sessionStore.getLatestSessionSummary()?.reflection ?? '';

  const panel = createPanel();
  panel.append(
    createEyebrow('Integration / Reflection'),
    createTitle('Notice what softened or stayed steady'),
    createBody(practiceConfig.copy.reflectionSubtitle),
  );

  const prompt = createBody(practiceConfig.copy.reflectionPrompt);
  prompt.className = 'session-overlay__prompt';
  panel.append(prompt);

  const textarea = document.createElement('textarea');
  textarea.className = 'session-overlay__textarea';
  textarea.placeholder = practiceConfig.copy.reflectionPlaceholder;
  textarea.maxLength = reflectionMaxLength;
  textarea.value = savedReflection;
  textarea.setAttribute('aria-label', 'Session reflection');

  const helper = document.createElement('p');
  helper.className = 'session-overlay__helper';
  helper.textContent = savedReflection.length > 0
    ? `${savedReflection.length}/${reflectionMaxLength} characters`
    : practiceConfig.copy.reflectionHelper;

  textarea.addEventListener('input', () => {
    const normalized = normalizeReflection(textarea.value);
    helper.textContent = normalized.length > 0
      ? `${normalized.length}/${reflectionMaxLength} characters`
      : practiceConfig.copy.reflectionHelper;
  });

  const actions = document.createElement('div');
  actions.className = 'app-shell__actions';
  const saveButton = createPrimaryButton('Save and start again', () => {
    game.sessionStore.saveReflection(textarea.value);
    game.sessionStore.prepareForNextSession();
    const restartSceneKey = getSessionFlowForExercise(game.sessionStore.getState().selectedExercise).restartSceneKey;
    navigateToManagedScene(game, restartSceneKey);
  });
  actions.append(saveButton);

  const support = createBody(supportCopy);
  support.className = 'session-overlay__support';

  panel.append(textarea, helper, actions, support);
  root.classList.remove('session-overlay--hidden');
  root.replaceChildren(panel);
  queueMicrotask(() => textarea.focus());
};

export const mountSessionPanels = (parent: HTMLElement, game: SoftFocusGame): (() => void) => {
  const root = createOverlayRoot(parent);
  const preferencesRoot = createPreferencesRoot(parent);
  let preferencesOpen = false;

  const renderPreferences = (): void => {
    const state = game.sessionStore.getState();

    const launcher = createSecondaryButton('Preferences', () => {
      preferencesOpen = !preferencesOpen;
      renderPreferences();
    });
    launcher.classList.add('preferences-shell__launcher');
    launcher.setAttribute('aria-expanded', preferencesOpen ? 'true' : 'false');

    const panel = document.createElement('section');
    panel.className = `preferences-shell__panel${preferencesOpen ? '' : ' preferences-shell__panel--hidden'}`;

    const header = document.createElement('div');
    header.className = 'preferences-shell__header';

    const title = document.createElement('h2');
    title.className = 'preferences-shell__title';
    title.textContent = 'Preferences';

    const closeButton = createSecondaryButton('Close', () => {
      preferencesOpen = false;
      renderPreferences();
    });

    header.append(title, closeButton);

    const body = document.createElement('p');
    body.className = 'preferences-shell__body';
    body.textContent = 'These settings persist locally and shape the current practice flow without changing your saved notes.';

    const toggles = document.createElement('div');
    toggles.className = 'preferences-shell__toggles';
    toggles.append(
      createPreferenceToggle({
        label: 'Low intensity',
        description: 'Keeps settle, practice, and recovery pacing gentler across the selected exercise.',
        checked: state.settings.lowIntensityMode,
        onChange: (checked) => {
          game.sessionStore.setLowIntensityMode(checked);
        },
      }),
      createPreferenceToggle({
        label: 'Reduced motion',
        description: 'Uses gentler family-specific motion settings so animated reset practices feel slower and smaller.',
        checked: state.settings.reducedMotionEnabled,
        onChange: (checked) => {
          game.sessionStore.setReducedMotionEnabled(checked);
        },
      }),
      createPreferenceToggle({
        label: 'Gaze guidance',
        description: state.selectedExercise === exerciseIds.phraseAnchor
          ? 'Adds a soft gaze reminder during phrase anchor rounds.'
          : 'Gaze guidance currently applies only to phrase anchor rounds.',
        checked: state.settings.gazeGuidanceEnabled,
        disabled: state.selectedExercise !== exerciseIds.phraseAnchor,
        onChange: (checked) => {
          game.sessionStore.setGazeGuidanceEnabled(checked);
        },
      }),
    );

    const support = document.createElement('p');
    support.className = 'preferences-shell__support';
    support.textContent = supportCopy;

    panel.append(header, body, toggles, support);
    preferencesRoot.replaceChildren(launcher, panel);
  };

  const render = (): void => {
    const state = game.sessionStore.getState();
    const sceneKey = state.currentSession?.sceneKey ?? null;

    if (sceneKey === sceneKeys.completion) {
      renderCompletionPanel(root, game);
      return;
    }

    if (sceneKey === sceneKeys.reflection) {
      renderReflectionPanel(root, game);
      return;
    }

    root.classList.add('session-overlay--hidden');
    root.replaceChildren();
  };

  render();
  renderPreferences();
  const unsubscribe = game.sessionStore.subscribe(() => {
    render();
    renderPreferences();
  });

  return () => {
    unsubscribe();
    root.remove();
    preferencesRoot.remove();
  };
};
