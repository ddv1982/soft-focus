import {
  getInstructionsBackScene,
  getNextSceneKey,
  getPreviousSceneKey,
  getSessionFlowForExercise,
  guidedPracticeFlow,
} from '../src/game/navigation.ts';
import { createSessionRepository } from '../src/persistence/sessionRepository.ts';
import { getExerciseStartScene } from '../src/practice/exercises.ts';
import { breathingPresetIds, exerciseIds, movingBallPresetIds, sessionFlowIds } from '../src/state/types.ts';
import type { StorageLike } from '../src/persistence/storage.ts';
import { PracticeRunner } from '../src/practice/practiceRunner.ts';
import { resolveMovingBallStagePresenterLayout } from '../src/practice/stagePresenters/movingBallStagePresenter.ts';
import { initialSceneKey } from '../src/game/sceneKeys.ts';
import { sceneKeys } from '../src/game/sceneKeys.ts';
import { createSessionStore } from '../src/state/sessionStore.ts';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

class MemoryStorage implements StorageLike {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

const assertSceneFlow = (): void => {
  assert(guidedPracticeFlow[0] === initialSceneKey, 'expected the guided practice flow to begin at the initial scene');
  assert(getPreviousSceneKey(sceneKeys.entry) === null, 'expected entry to have no previous scene');
  assert(getNextSceneKey(sceneKeys.entry) === sceneKeys.exerciseSelection, 'expected entry to navigate to exercise selection');
  assert(getNextSceneKey(sceneKeys.exerciseSelection) === sceneKeys.phrase, 'expected exercise selection to navigate to phrase');
  assert(getNextSceneKey(sceneKeys.phrase) === sceneKeys.instructions, 'expected phrase to navigate to instructions');
  assert(getNextSceneKey(sceneKeys.instructions) === sceneKeys.practice, 'expected instructions to navigate to practice');
  assert(getNextSceneKey(sceneKeys.practice) === sceneKeys.completion, 'expected practice to navigate to completion');
  assert(getNextSceneKey(sceneKeys.completion) === sceneKeys.reflection, 'expected completion to navigate to reflection');
  assert(getNextSceneKey(sceneKeys.reflection) === null, 'expected reflection to terminate the flow');
  assert(getPreviousSceneKey(sceneKeys.reflection) === sceneKeys.completion, 'expected reflection to navigate back to completion');
};

const runPracticeControlsScenario = (): void => {
  const store = createSessionStore();

  store.setPhrase('  steady   phrase  ');
  store.setSelectedExercise(exerciseIds.phraseAnchor);
  store.setLowIntensityMode(false);
  store.setReducedMotionEnabled(true);
  store.setGazeGuidanceEnabled(true);
  store.updateCurrentScene(sceneKeys.entry);
  store.updateCurrentScene(sceneKeys.exerciseSelection);
  store.updateCurrentScene(sceneKeys.phrase);
  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);

  const practiceConfig = store.createPracticeConfig();
  assert(practiceConfig.phrase === 'steady phrase', 'expected phrase normalization before practice begins');
  assert(practiceConfig.lowIntensity.enabled === false, 'expected low-intensity toggle to feed practice config');
  assert(practiceConfig.reducedMotion.enabled === true, 'expected reduced-motion toggle to feed practice config');
  assert(practiceConfig.reducedMotion.label === 'Reduced motion', 'expected reduced-motion metadata to expose a user-facing label');
  assert(practiceConfig.gazeGuidance.enabled === true, 'expected gaze guidance toggle to feed practice config');
  assert(practiceConfig.stagePresenter.key === 'gaze-guidance', 'expected phrase-anchor config to resolve the gaze-guidance presenter when enabled');
  assert(practiceConfig.capabilities.auxiliaryControl.kind === 'toggle', 'expected phrase-anchor config to declare a toggle auxiliary control');
  assert(practiceConfig.phases[1]?.label === 'Phrase practice', 'expected phrase-anchor config to expose phase metadata through the family contract');
  assert(practiceConfig.phases[1]?.copy.includes('Notice wandering'), 'expected phrase-anchor active copy to teach noticing wandering');
  assert(practiceConfig.copy.expectationsTitle === 'What to expect in this maintenance round', 'expected maintenance instructions copy to be phase-aware');
  assert(practiceConfig.copy.instructionsSubtitle.includes('relaxed breath'), 'expected phrase-anchor instructions to describe relaxed breathing support');
  assert(practiceConfig.copy.reflectionPrompt.includes('notice, return, or soften'), 'expected maintenance reflection prompt to reinforce the anchor loop');

  const unguidedStore = createSessionStore();
  unguidedStore.setPhrase('  steady   phrase  ');
  unguidedStore.setSelectedExercise(exerciseIds.phraseAnchor);
  unguidedStore.setGazeGuidanceEnabled(false);
  const unguidedPracticeConfig = unguidedStore.createPracticeConfig();
  assert(unguidedPracticeConfig.stagePresenter.key === 'phrase-anchor', 'expected phrase-anchor config to resolve default phrase-anchor presenter when gaze guidance is off');
  assert(unguidedPracticeConfig.stagePresenter.phrase === 'steady phrase', 'expected default phrase-anchor presenter to receive the normalized phrase');
  assert(unguidedPracticeConfig.phases[1]?.activatesStagePresenter === true, 'expected phrase-anchor practice phase to activate default presenter');
  assert(unguidedPracticeConfig.phases[1]?.copy.includes('easy breath'), 'expected unguided phrase-anchor copy to pair phrase repetition with easy breathing');

  store.startPractice(practiceConfig);
  let runner = new PracticeRunner(practiceConfig);
  let snapshot = runner.getSnapshot();
  assert(snapshot.phase === 'settle', 'expected the practice flow to begin with settle');
  assert(snapshot.paused === false, 'expected practice to start unpaused');

  snapshot = runner.pause();
  store.setPracticePaused(snapshot.paused);
  assert(snapshot.paused === true, 'expected pause control to pause the runner');

  snapshot = runner.resume();
  store.setPracticePaused(snapshot.paused);
  assert(snapshot.paused === false, 'expected resume control to resume the runner');

  while (!snapshot.complete) {
    snapshot = runner.tick(30_000);
  }

  store.setPracticePhase(snapshot.phase, snapshot.phaseIndex, snapshot.secondsRemaining);
  store.completeSession('2026-04-22T12:00:00.000Z');
  store.clearPractice();
  store.updateCurrentScene(sceneKeys.completion);

  const latestSummary = store.getLatestSessionSummary();
  assert(latestSummary?.outcome === 'completed', 'expected a completed summary after the runner finishes');
  assert(latestSummary?.phrase === 'steady phrase', 'expected the completed summary to retain the normalized phrase');
  assert(latestSummary?.exerciseId === exerciseIds.phraseAnchor, 'expected the completed summary to retain the selected exercise');
};

const runExerciseBranchingScenario = (): void => {
  const store = createSessionStore();

  store.setSelectedExercise(exerciseIds.movingBall);
  store.setLowIntensityMode(true);
  store.setReducedMotionEnabled(true);
  store.setMovingBallPreset(movingBallPresetIds.steadyCenter);

  const movingBallConfig = store.createPracticeConfig();
  assert(getExerciseStartScene(exerciseIds.movingBall) === sceneKeys.instructions, 'expected moving-ball exercise to bypass phrase entry');
  assert(movingBallConfig.exercise.id === exerciseIds.movingBall, 'expected moving-ball config to reflect the selected exercise');
  assert(movingBallConfig.movingBall?.presetId === movingBallPresetIds.steadyCenter, 'expected moving-ball config to expose the selected steady preset');
  assert(movingBallConfig.stagePresenter.key === 'moving-ball', 'expected moving-ball config to resolve the moving-ball presenter');
  assert(movingBallConfig.capabilities.auxiliaryControl.kind === 'selector', 'expected moving-ball config to declare a selector auxiliary control');
  assert(movingBallConfig.reducedMotion.enabled === true, 'expected moving-ball config to preserve the reduced-motion toggle');
  assert(movingBallConfig.movingBall?.laneHeights.length === 1, 'expected steady center sweep to use a single lane');
  assert(movingBallConfig.copy.instructionsSelectionLabel === 'Selected reset practice', 'expected moving-ball instructions copy to reflect the reset phase');

  store.setMovingBallPreset(movingBallPresetIds.multiHeight);

  const variedMovingBallConfig = store.createPracticeConfig();
  assert(variedMovingBallConfig.movingBall?.presetId === movingBallPresetIds.multiHeight, 'expected multi-height preset selection to carry into practice config');
  assert(variedMovingBallConfig.movingBall?.laneHeights.length === 3, 'expected moving-ball config to expose multi-height lanes for the multi-height preset');
  assert(variedMovingBallConfig.movingBall?.laneHeights[0] === 0.78, 'expected multi-height preset to begin in a lower visual lane');
  assert(variedMovingBallConfig.movingBall?.laneHeights[1] === 0.5, 'expected multi-height preset to include a middle visual lane');
  assert(variedMovingBallConfig.movingBall?.laneHeights[2] === 0.22, 'expected multi-height preset to include an eye-level visual lane');
  assert(variedMovingBallConfig.movingBall?.laneBandHeight === 260, 'expected multi-height preset to use a taller vertical band');
  assert(variedMovingBallConfig.movingBall?.pattern === 'multi-height-sweep', 'expected moving-ball config to expose multi-height motion metadata');
  const reducedMotionMultiHeightLayout = resolveMovingBallStagePresenterLayout({
    width: 640,
    laneBandHeight: variedMovingBallConfig.movingBall?.laneBandHeight ?? 0,
    cycleMs: variedMovingBallConfig.movingBall?.cycleMs ?? 0,
    radius: variedMovingBallConfig.movingBall?.radius ?? 0,
    reducedMotion: variedMovingBallConfig.reducedMotion.policy,
  });
  assert(reducedMotionMultiHeightLayout.laneBandHeight < 260, 'expected reduced motion to shorten the taller multi-height vertical band');
  assert(reducedMotionMultiHeightLayout.laneBandHeight === 202.8, 'expected reduced motion to apply the same amplitude scale vertically');
  assert(variedMovingBallConfig.copy.reflectionPrompt.includes('settle, reset'), 'expected reset reflection prompt to stay phase-aware');

  store.setMovingBallPreset(movingBallPresetIds.settlingSteps);

  const settlingMovingBallConfig = store.createPracticeConfig();
  assert(settlingMovingBallConfig.movingBall?.pattern === 'settling-step-sweep', 'expected moving-ball config to expose the settling-step pattern metadata');
  assert(getExerciseStartScene(exerciseIds.phraseAnchor) === sceneKeys.phrase, 'expected phrase-anchor exercise to require phrase entry');
  assert(getExerciseStartScene(exerciseIds.breathingReset) === sceneKeys.instructions, 'expected breathing reset to bypass phrase entry');
  assert(getExerciseStartScene(exerciseIds.bilateralRhythm) === sceneKeys.instructions, 'expected bilateral rhythm to bypass phrase entry');
  assert(getExerciseStartScene(exerciseIds.orienting) === sceneKeys.instructions, 'expected orienting to bypass phrase entry');
  assert(getInstructionsBackScene(exerciseIds.phraseAnchor) === sceneKeys.phrase, 'expected phrase-anchor instructions to navigate back to phrase');
  assert(getInstructionsBackScene(exerciseIds.movingBall) === sceneKeys.exerciseSelection, 'expected moving-ball instructions to navigate back to exercise selection');
  assert(getInstructionsBackScene(exerciseIds.breathingReset) === sceneKeys.exerciseSelection, 'expected breathing reset instructions to navigate back to exercise selection');
  assert(getInstructionsBackScene(exerciseIds.bilateralRhythm) === sceneKeys.exerciseSelection, 'expected bilateral rhythm instructions to navigate back to exercise selection');
  assert(getInstructionsBackScene(exerciseIds.orienting) === sceneKeys.exerciseSelection, 'expected orienting instructions to navigate back to exercise selection');
  assert(getSessionFlowForExercise(exerciseIds.phraseAnchor).id === sessionFlowIds.phrasePrompted, 'expected phrase-anchor to use the phrase-prompted flow');
  assert(getSessionFlowForExercise(exerciseIds.movingBall).id === sessionFlowIds.directPractice, 'expected moving-ball to use the direct-practice flow');

  store.setSelectedExercise(exerciseIds.breathingReset);
  store.setLowIntensityMode(false);
  store.setBreathingPreset(breathingPresetIds.longExhale);
  const breathingResetConfig = store.createPracticeConfig();
  assert(breathingResetConfig.stagePresenter.key === 'breathing-reset', 'expected breathing reset config to resolve the breathing-reset presenter');
  assert(breathingResetConfig.capabilities.auxiliaryControl.kind === 'info', 'expected breathing reset config to declare an info auxiliary control');
  assert(breathingResetConfig.breathingReset?.presetId === breathingPresetIds.longExhale, 'expected breathing reset config to preserve the selected breathing preset');
  assert(breathingResetConfig.display.phraseText === 'Long exhale (4 in / 6 out)', 'expected breathing reset to expose breathing-specific display metadata');
  assert(breathingResetConfig.stagePresenter.inhaleMs === 4000, 'expected breathing reset config to use a four-second inhale cue');
  assert(breathingResetConfig.stagePresenter.exhaleMs === 6000, 'expected breathing reset config to use a six-second exhale cue');
  assert(breathingResetConfig.capabilities.auxiliaryControl.description.includes('4 in / 6 out'), 'expected breathing reset guidance to describe the inhale and exhale cue');
  assert(breathingResetConfig.copy.instructionsSelectionLabel === 'Selected reset practice', 'expected breathing reset instructions copy to stay reset-aware');

  store.setBreathingPreset(breathingPresetIds.gentleExhale);
  const gentlerBreathingResetConfig = store.createPracticeConfig();
  assert(gentlerBreathingResetConfig.stagePresenter.key === 'breathing-reset', 'expected gentler breathing reset config to keep the breathing presenter');
  assert(gentlerBreathingResetConfig.stagePresenter.inhaleMs === 3000, 'expected gentle-exhale breathing reset to shorten the inhale cue');
  assert(gentlerBreathingResetConfig.stagePresenter.exhaleMs === 4000, 'expected gentle-exhale breathing reset to shorten the exhale cue');
  assert(gentlerBreathingResetConfig.display.phraseText === 'Gentle exhale (3 in / 4 out)', 'expected gentle-exhale breathing reset to expose the gentler cadence');
  assert(gentlerBreathingResetConfig.capabilities.auxiliaryControl.description.includes('3 in / 4 out'), 'expected gentle-exhale breathing guidance to describe the gentler cue');

  store.setBreathingPreset(breathingPresetIds.coherent);
  const coherentBreathingResetConfig = store.createPracticeConfig();
  assert(coherentBreathingResetConfig.stagePresenter.inhaleMs === 5000, 'expected coherent breathing reset to use a five-second inhale cue');
  assert(coherentBreathingResetConfig.stagePresenter.exhaleMs === 5000, 'expected coherent breathing reset to use a five-second exhale cue');
  assert(coherentBreathingResetConfig.display.phraseText === 'Coherent (5 in / 5 out)', 'expected coherent breathing reset to expose the balanced cadence');
  assert(coherentBreathingResetConfig.capabilities.auxiliaryControl.description.includes('balanced 5 in / 5 out rhythm'), 'expected coherent breathing guidance to describe the balanced cadence');

  store.setBreathingPreset(breathingPresetIds.box);
  const boxBreathingResetConfig = store.createPracticeConfig();
  assert(boxBreathingResetConfig.stagePresenter.inhaleMs === 4000, 'expected box breathing reset to use a four-second inhale cue');
  assert(boxBreathingResetConfig.stagePresenter.holdAfterInhaleMs === 4000, 'expected box breathing reset to use a four-second inhale hold');
  assert(boxBreathingResetConfig.stagePresenter.exhaleMs === 4000, 'expected box breathing reset to use a four-second exhale cue');
  assert(boxBreathingResetConfig.stagePresenter.holdAfterExhaleMs === 4000, 'expected box breathing reset to use a four-second exhale hold');
  assert(boxBreathingResetConfig.display.phraseText === 'Box (4 in / 4 hold / 4 out / 4 hold)', 'expected box breathing reset to expose the equal-phase cadence');
  assert(boxBreathingResetConfig.capabilities.auxiliaryControl.description.includes('box-breathing rhythm'), 'expected box breathing guidance to describe the held cadence');

  store.setBreathingPreset(breathingPresetIds.cyclicSighing);
  const cyclicSighingResetConfig = store.createPracticeConfig();
  assert(cyclicSighingResetConfig.stagePresenter.inhaleMs === 2000, 'expected cyclic sighing reset to use a two-second first inhale cue');
  assert(cyclicSighingResetConfig.stagePresenter.inhaleTopUpMs === 1000, 'expected cyclic sighing reset to use a short top-up inhale');
  assert(cyclicSighingResetConfig.stagePresenter.exhaleMs === 6000, 'expected cyclic sighing reset to use a long exhale cue');
  assert(cyclicSighingResetConfig.display.phraseText === 'Cyclic sighing (2 in / 1 top-up / 6 out)', 'expected cyclic sighing reset to expose the double-inhale cadence');
  assert(cyclicSighingResetConfig.capabilities.auxiliaryControl.description.includes('cyclic sighing rhythm'), 'expected cyclic sighing guidance to describe the double-inhale cadence');

  store.setSelectedExercise(exerciseIds.bilateralRhythm);
  const bilateralRhythmConfig = store.createPracticeConfig();
  assert(bilateralRhythmConfig.stagePresenter.key === 'bilateral-rhythm', 'expected bilateral rhythm config to resolve the bilateral-rhythm presenter');
  assert(bilateralRhythmConfig.capabilities.auxiliaryControl.kind === 'info', 'expected bilateral rhythm config to declare an info auxiliary control');
  assert(bilateralRhythmConfig.capabilities.auxiliaryControl.description.includes('visual left-right rhythm'), 'expected bilateral rhythm guidance to clarify the visual cue');
  assert(bilateralRhythmConfig.phases[1]?.copy.includes('No sound is used'), 'expected bilateral rhythm active copy to clarify that sound is not used');
  assert(bilateralRhythmConfig.display.phraseText === 'Follow the alternating rhythm softly', 'expected bilateral rhythm to expose rhythm-specific display metadata');
  assert(bilateralRhythmConfig.copy.reflectionPrompt.includes('left-right rhythm'), 'expected bilateral rhythm reflection prompt to stay rhythm-aware');

  store.setSelectedExercise(exerciseIds.orienting);
  const orientingConfig = store.createPracticeConfig();
  assert(orientingConfig.stagePresenter.key === 'orienting', 'expected orienting config to resolve the orienting presenter');
  assert(orientingConfig.capabilities.auxiliaryControl.kind === 'info', 'expected orienting config to declare an info auxiliary control');
  assert(orientingConfig.display.phraseText === 'Notice the wider space softly', 'expected orienting to expose orienting-specific display metadata');
  assert(orientingConfig.copy.reflectionPrompt.includes('wider space'), 'expected orienting reflection prompt to stay orienting-aware');
};

const runReflectionAndReloadScenario = (): void => {
  const storage = new MemoryStorage();
  const repository = createSessionRepository(storage);
  const store = createSessionStore(undefined, repository);

  store.setSelectedExercise(exerciseIds.movingBall);
  store.setLowIntensityMode(true);
  store.setMovingBallPreset(movingBallPresetIds.multiHeight);
  store.updateCurrentScene(sceneKeys.exerciseSelection);
  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);
  store.startPractice(store.createPracticeConfig());
  store.stopPractice();
  store.completeSession('2026-04-22T12:05:00.000Z');
  store.clearPractice();
  store.updateCurrentScene(sceneKeys.completion);
  store.updateCurrentScene(sceneKeys.reflection);
  store.saveReflection('  shoulders softened and the phrase stayed easy  ');
  store.prepareForNextSession();
  store.updateCurrentScene(sceneKeys.exerciseSelection);

  const restartedState = store.getState();
  assert(restartedState.currentSession === null, 'expected exercise selection return to clear the finished session');
  assert(restartedState.selectedExercise === exerciseIds.movingBall, 'expected exercise selection return to preserve the previously selected exercise');
  assert(store.createPracticeConfig().movingBall?.presetId === movingBallPresetIds.multiHeight, 'expected restart to preserve the selected moving-ball preset');

  const rehydratedStore = createSessionStore(undefined, createSessionRepository(storage));
  const rehydratedState = rehydratedStore.getState();
  const [latestSummary] = rehydratedState.recentSessionSummaries;

  assert(rehydratedState.phrase === '', 'expected moving-ball exercise not to persist a phrase requirement across reloads');
  assert(rehydratedState.selectedExercise === exerciseIds.movingBall, 'expected selected exercise to persist across reloads');
  assert(rehydratedState.settings.lowIntensityMode === true, 'expected settings persistence across reloads');
  assert(rehydratedState.settings.movingBallPresetId === movingBallPresetIds.multiHeight, 'expected moving-ball preset persistence across reloads');
  assert(rehydratedState.currentSession === null, 'expected in-progress session state not to persist across reloads');
  assert(rehydratedState.practice === null, 'expected practice runtime state not to persist across reloads');
  assert(latestSummary?.outcome === 'stopped', 'expected stopped outcome to persist into the recent session summary');
  assert(latestSummary?.exerciseId === exerciseIds.movingBall, 'expected selected exercise to persist into recent session summaries');
  assert(latestSummary?.flowId === sessionFlowIds.directPractice, 'expected moving-ball summaries to persist the direct-practice flow id');
  assert(latestSummary?.phrase === '', 'expected moving-ball summaries not to carry phrase text');
  assert(
    latestSummary?.reflection === 'shoulders softened and the phrase stayed easy',
    'expected reflection text to be normalized and persisted across reloads',
  );
};

const runBreathingSelectionReturnScenario = (): void => {
  const store = createSessionStore();

  store.setSelectedExercise(exerciseIds.breathingReset);
  store.updateCurrentScene(sceneKeys.exerciseSelection);
  store.updateCurrentScene(sceneKeys.instructions);
  store.updateCurrentScene(sceneKeys.practice);
  store.startPractice(store.createPracticeConfig());
  store.completeSession('2026-04-22T12:10:00.000Z');
  store.clearPractice();
  store.updateCurrentScene(sceneKeys.completion);
  store.saveReflection('Breath stayed easy');
  store.prepareForNextSession();
  store.updateCurrentScene(sceneKeys.exerciseSelection);

  const state = store.getState();
  assert(state.currentSession === null, 'expected breathing reset to return cleanly to exercise selection after finishing');
  assert(state.selectedExercise === exerciseIds.breathingReset, 'expected returning to exercise selection to preserve the last breathing selection');
};

assertSceneFlow();
runPracticeControlsScenario();
runExerciseBranchingScenario();
runReflectionAndReloadScenario();
runBreathingSelectionReturnScenario();

console.log('full guided flow smoke validation passed');
