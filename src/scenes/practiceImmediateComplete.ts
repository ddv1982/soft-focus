import type { AmbientAudioStartHandle } from '../audio/ambientAudio';
import type { PracticeRunnerSnapshot } from '../practice/practiceRunner';

interface CompleteImmediatePracticeOptions {
  snapshot: PracticeRunnerSnapshot;
  ambientAudioStart: AmbientAudioStartHandle | undefined;
  finishPractice: () => void;
}

export const completeImmediatePracticeIfNeeded = ({
  snapshot,
  ambientAudioStart,
  finishPractice,
}: CompleteImmediatePracticeOptions): boolean => {
  if (!snapshot.complete) {
    return false;
  }

  try {
    ambientAudioStart?.engine.dispose({ fadeOutSeconds: 0 });
  } finally {
    finishPractice();
  }

  return true;
};
