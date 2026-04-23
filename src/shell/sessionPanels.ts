import type { SoftFocusGame } from '../game/Game';
import { sceneKeys } from '../game/sceneKeys';
import { createPracticeConfigFromSettings } from '../practice/practiceConfig';
import { exerciseIds, normalizeReflection, reflectionMaxLength, type BreathingPresetId } from '../state/types';
import {
  chooseAnotherExercise,
  continueToReflection,
  saveReflectionAndChooseAnotherExercise,
  saveReflectionAndRestart,
} from './sessionPanelActions';
import {
  createBody,
  createEyebrow,
  createOverlayRoot,
  createPanel,
  createPreferenceSelect,
  createPreferencesRoot,
  createPreferenceToggle,
  createPrimaryButton,
  createSecondaryButton,
  createSummaryList,
  createTitle,
  formatDuration,
  supportCopy,
} from './sessionPanelDom';

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
  const hero = document.createElement('div');
  hero.className = 'session-overlay__hero';
  const completionMark = document.createElement('div');
  completionMark.className = 'session-overlay__mark';
  completionMark.setAttribute('aria-hidden', 'true');
  completionMark.textContent = latestSummary.outcome === 'stopped' ? 'pause' : 'ease';
  const copy = document.createElement('div');
  copy.className = 'session-overlay__copy';
  copy.append(
    createEyebrow(practiceConfig.exercise.phaseLabel),
    createTitle(latestSummary.outcome === 'stopped' ? `${practiceConfig.exercise.phaseLabel} round paused early` : `${practiceConfig.exercise.phaseLabel} round complete`),
    createBody(latestSummary.outcome === 'stopped'
      ? `You ended this ${practiceConfig.exercise.phaseLabel.toLowerCase()} round cleanly. Let your attention come back to the room before reflecting.`
      : `You reached the end of this ${practiceConfig.exercise.phaseLabel.toLowerCase()} round. Let the steadier parts of the round land before reflecting.`),
  );
  hero.append(completionMark, copy);

  const summary = document.createElement('div');
  summary.className = 'session-overlay__summary';
  const summaryTitle = document.createElement('h3');
  summaryTitle.className = 'session-overlay__section-title';
  summaryTitle.textContent = 'Session notes';
  summary.append(summaryTitle, createSummaryList(summaryLines));

  const integrationNote = createBody(practiceConfig.copy.completionNote);
  integrationNote.className = 'session-overlay__body session-overlay__body--framed';

  panel.append(
    hero,
    summary,
    integrationNote,
  );

  const support = createBody(supportCopy);
  support.className = 'session-overlay__support';

  const actions = document.createElement('div');
  actions.className = 'app-shell__actions session-overlay__actions';
  const continueButton = createPrimaryButton('Continue to reflection', () => {
    continueToReflection(game);
  });
  const chooseAnotherButton = createSecondaryButton('Choose another exercise', () => {
    chooseAnotherExercise(game);
  });
  const helper = createBody('Reflection is optional. Choose another exercise if you want to return to the practice shore for now.');
  helper.className = 'session-overlay__helper';
  actions.append(continueButton, chooseAnotherButton);
  panel.append(helper, actions, support);

  root.classList.remove('session-overlay--hidden');
  root.replaceChildren(panel);
  queueMicrotask(() => continueButton.focus());
};

const renderReflectionPanel = (root: HTMLElement, game: SoftFocusGame): void => {
  const state = game.sessionStore.getState();
  const practiceConfig = createPracticeConfigFromSettings(state.selectedExercise, state.phrase, state.settings);
  const savedReflection = state.currentSession?.reflection ?? game.sessionStore.getLatestSessionSummary()?.reflection ?? '';

  const panel = createPanel();
  const hero = document.createElement('div');
  hero.className = 'session-overlay__hero session-overlay__hero--reflection';
  const reflectionMark = document.createElement('div');
  reflectionMark.className = 'session-overlay__mark';
  reflectionMark.setAttribute('aria-hidden', 'true');
  reflectionMark.textContent = 'note';
  const copy = document.createElement('div');
  copy.className = 'session-overlay__copy';
  copy.append(
    createEyebrow('Integration / Reflection'),
    createTitle('Notice what softened or stayed steady'),
    createBody(practiceConfig.copy.reflectionSubtitle),
  );
  hero.append(reflectionMark, copy);
  panel.append(
    hero,
  );

  const prompt = createBody(practiceConfig.copy.reflectionPrompt);
  prompt.className = 'session-overlay__prompt';

  const field = document.createElement('label');
  field.className = 'session-overlay__field';
  field.append(prompt);

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

  field.append(textarea, helper);

  const actions = document.createElement('div');
  actions.className = 'app-shell__actions session-overlay__actions';
  const saveButton = createPrimaryButton('Save and start again', () => {
    saveReflectionAndRestart(game, textarea.value);
  });
  const chooseAnotherButton = createSecondaryButton('Save and choose another exercise', () => {
    saveReflectionAndChooseAnotherExercise(game, textarea.value);
  });
  actions.append(saveButton, chooseAnotherButton);

  const support = createBody(supportCopy);
  support.className = 'session-overlay__support';
  const nextStepNote = createBody('Choosing another exercise saves your note and returns you to the practice shore instead of restarting this same practice.');
  nextStepNote.className = 'session-overlay__helper';

  panel.append(field, nextStepNote, actions, support);
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
    const practiceConfig = createPracticeConfigFromSettings(state.selectedExercise, state.phrase, state.settings);

    const launcher = createSecondaryButton('Preferences', () => {
      preferencesOpen = !preferencesOpen;
      renderPreferences();
    });
    launcher.classList.add('preferences-shell__launcher');
    launcher.setAttribute('aria-expanded', preferencesOpen ? 'true' : 'false');

    const panel = document.createElement('section');
    panel.className = `preferences-shell__panel wellness-reduced-motion${preferencesOpen ? '' : ' preferences-shell__panel--hidden'}`;
    panel.setAttribute('aria-label', 'Practice preferences');

    const header = document.createElement('div');
    header.className = 'preferences-shell__header';

    const title = document.createElement('h2');
    title.className = 'preferences-shell__title';
    title.textContent = 'Preferences';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'preferences-shell__eyebrow';
    eyebrow.textContent = 'Practice comfort';

    const heading = document.createElement('div');
    heading.append(eyebrow, title);

    const closeButton = createSecondaryButton('Close', () => {
      preferencesOpen = false;
      renderPreferences();
    });

    header.append(heading, closeButton);

    const body = document.createElement('p');
    body.className = 'preferences-shell__body';
    body.textContent = 'These settings persist locally and shape the current practice flow without changing your saved notes or safe harbor pace.';

    const toggles = document.createElement('div');
    toggles.className = 'preferences-shell__toggles';

    const comfortGroup = document.createElement('div');
    comfortGroup.className = 'preferences-shell__group';
    const comfortTitle = document.createElement('h3');
    comfortTitle.className = 'preferences-shell__group-title';
    comfortTitle.textContent = 'Pace and movement';
    comfortGroup.append(comfortTitle);
    toggles.append(
      comfortGroup,
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
    );

    const guidanceGroup = document.createElement('div');
    guidanceGroup.className = 'preferences-shell__group';
    const guidanceTitle = document.createElement('h3');
    guidanceTitle.className = 'preferences-shell__group-title';
    guidanceTitle.textContent = 'Guidance';
    guidanceGroup.append(guidanceTitle);

    toggles.append(
      guidanceGroup,
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

    if (practiceConfig.breathingReset) {
      const breathingGroup = document.createElement('div');
      breathingGroup.className = 'preferences-shell__group';
      const breathingTitle = document.createElement('h3');
      breathingTitle.className = 'preferences-shell__group-title';
      breathingTitle.textContent = 'Breathing cadence';
      breathingGroup.append(breathingTitle);
      toggles.append(
        breathingGroup,
        createPreferenceSelect({
          label: 'Breathing preset',
          description: `${practiceConfig.breathingReset.summary} Choose the pattern that feels easiest to follow today.`,
          value: practiceConfig.breathingReset.presetId,
          options: practiceConfig.breathingReset.availablePresets,
          onChange: (nextValue) => {
            game.sessionStore.setBreathingPreset(nextValue as BreathingPresetId);
          },
        }),
      );
    }

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
