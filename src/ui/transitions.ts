import type { SessionStore } from '../state/sessionStore';

/**
 * Shared timing tokens for screen transitions. Kept in sync with the CSS
 * `--motion-normal` / `--ease-soft` tokens in styles/theme-base.css so the
 * Phaser (canvas) and DOM sides of a cross-fade move at the same pace.
 */
export const transitionTimings = {
  durationMs: 240,
  /** cubic-bezier matching --ease-soft; usable by the Web Animations API. */
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

/**
 * Single source of truth for "should motion be reduced?". Combines the in-app
 * reduced-motion preference with the OS-level `prefers-reduced-motion` media
 * query. Both the DOM shell and the Phaser scenes consult this before playing
 * a transition so the two stay consistent.
 */
export const prefersReducedMotion = (sessionStore?: SessionStore | null): boolean => {
  const userSetting = sessionStore?.getState().settings.reducedMotionEnabled ?? false;
  const mediaReduced =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  return userSetting || mediaReduced;
};

/**
 * Play a gentle fade-and-rise entrance on a freshly-rendered DOM screen.
 * No-op when reduced motion is requested or the Web Animations API is missing.
 */
export const playEnterTransition = (element: Element, sessionStore?: SessionStore | null): void => {
  if (prefersReducedMotion(sessionStore) || typeof element.animate !== 'function') {
    return;
  }

  element.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    {
      duration: transitionTimings.durationMs,
      easing: transitionTimings.easing,
      fill: 'none',
    },
  );
};

/**
 * Fade an element's opacity to 0, resolving once the fade completes. Used to
 * dissolve the Phaser runtime host (canvas + DOM-text overlays, which share the
 * canvas parent) when leaving the practice scene. Callers gate on
 * {@link prefersReducedMotion} before invoking.
 */
export const fadeOutElement = (element: HTMLElement): Promise<void> =>
  new Promise((resolve) => {
    element.style.transition = `opacity ${transitionTimings.durationMs}ms ${transitionTimings.easing}`;
    // Force a reflow so the transition starts from the current opacity.
    void element.offsetHeight;
    element.style.opacity = '0';
    window.setTimeout(resolve, transitionTimings.durationMs);
  });
