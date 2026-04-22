# Soft Focus

Soft Focus is a small guided-practice prototype with a lighter DOM-first launch shell and an on-demand Phaser runtime for the active practice stage.

The current Soft Focus core toolkit surfaces two live practice phases:

- `Maintenance`: `Phrase anchor`
- `Reset`: `Moving ball`
- `Reset`: `Breathing reset`
- `Reset`: `Bilateral rhythm`
- `Reset`: `Orienting`

`Integration / Reflection` currently appears as the closing reflection step after practice.

Planned next reset tools for Soft Focus:

- `Bilateral tapping`
- `Orienting`

Current flow:

- `Entry -> Exercise Selection -> Phrase -> Instructions -> Practice -> Completion -> Reflection` for the phrase-anchor exercise
- `Entry -> Exercise Selection -> Instructions -> Practice -> Completion -> Reflection` for the moving-ball exercise
- `Entry -> Exercise Selection -> Instructions -> Practice -> Completion -> Reflection` for the breathing-reset exercise
- `Entry -> Exercise Selection -> Instructions -> Practice -> Completion -> Reflection` for the bilateral-rhythm exercise
- `Entry -> Exercise Selection -> Instructions -> Practice -> Completion -> Reflection` for the orienting exercise

The app persists the selected exercise, phrase (when used), settings, and recent session summaries locally.

## Runtime and tooling posture

- Package manager: `bun`
- Recommended Node version for tooling/CI: `22.12+`
- Current build strategy:
  - explicit Vite client minification with `oxc`
  - explicit CSS minification with `lightningcss`
  - lazy loading of the Phaser runtime from the launch shell
  - lazy loading of exercise-stage presenter adapters inside the practice runtime
  - shell-owned completion and reflection panels rendered outside the Phaser runtime
  - family capability metadata drives instructions UI and reduced-motion guidance across practices
  - a raised chunk warning limit that matches the current lazy-loaded runtime budget while follow-up refactors keep reducing the runtime payload

## Scripts

- `bun install`: install dependencies and maintain `bun.lock`.
- `bun run dev`: start the local Vite app.
- `bun run typecheck`: run the TypeScript compiler without emitting files.
- `bun run smoke:test`: run focused TypeScript smoke validations for scene flow, persistence, and restart behavior.
- `bun run build`: typecheck and produce a production bundle.
- `bun run validate`: run broad validation across typecheck, smoke tests, and production build.

## Manual Smoke Path

1. Start the app with `bun run dev`.
2. On the launch shell, confirm the DOM-first screen renders and the `Open Soft Focus` button is keyboard-focusable.
3. Activate `Open Soft Focus` and confirm the Phaser practice runtime loads.
4. On `Entry`, press `Choose your exercise` and confirm the app moves to `Exercise Selection`.
5. On `Exercise Selection`, confirm the screen labels `Phrase anchor` as `Maintenance`, `Moving ball` as `Reset`, and shows `Integration / Reflection` as a calm note about the current closing step.

### Phrase anchor path

6. Choose `Phrase anchor`.
7. On `Phrase`, enter a short phrase, verify invalid text disables the continue button, then continue.
8. On `Instructions`, verify the saved phrase is shown and toggle `Low-intensity mode` and `Gaze guidance`.
9. Also verify the `Reduced motion` preference is available and updates the guidance copy for gentler pacing.
10. Start practice and verify the `Pause`, `Resume`, and `Stop` controls behave as expected.
11. Allow one run to finish and confirm the app reaches a shell-owned completion panel with maintenance-oriented summary copy.
12. Continue to reflection, confirm the shell-owned `Integration / Reflection` panel uses a maintenance-oriented prompt, enter a short note, and save.
13. Confirm the app returns to `Phrase` with the previous phrase still available for the next round.

### Moving-ball path

14. Return to `Exercise Selection` and choose `Moving ball`.
15. Confirm the app skips `Phrase` and moves directly to `Instructions`.
16. On `Instructions`, verify the selected preset is shown, toggle `Low-intensity mode`, toggle `Reduced motion`, and switch between the available moving-ball sweep presets.
17. Start practice and confirm the moving ball stays still during `Settle`, uses the selected sweep pattern only during the active practice phase, and pauses/resumes cleanly.
18. Let one run finish or stop it early, continue through the shell-owned completion and reflection panels, confirm the copy stays reset-aware, save an optional note, and confirm restart returns to the moving-ball path with the selected preset still active.

19. Reload the page and confirm the launch shell appears again, then reopen Soft Focus and confirm the selected exercise, phrase/settings where applicable, and the latest completed or stopped summary still appear after reload, while any in-progress practice state does not resume.

### Breathing-reset path

20. Return to `Exercise Selection` and choose `Breathing reset`.
21. Confirm the app skips `Phrase` and moves directly to `Instructions`.
22. On `Instructions`, confirm the screen frames the practice as a reset, shows a breathing-specific guidance block, and still lets you toggle `Low-intensity mode` and `Reduced motion`.
23. Start practice and confirm the breathing presenter uses a gentle visual rhythm during the active practice phase and pauses/resumes cleanly.
24. Continue through the shell-owned completion and reflection panels, confirm the copy stays breathing-aware, save an optional note, and confirm restart returns to the breathing-reset path without requiring a phrase.

### Bilateral-rhythm path

25. Return to `Exercise Selection` and choose `Bilateral rhythm`.
26. Confirm the app skips `Phrase` and moves directly to `Instructions`.
27. On `Instructions`, confirm the screen frames the practice as a reset, shows an alternating-rhythm guidance block, and still lets you toggle `Low-intensity mode` and `Reduced motion`.
28. Start practice and confirm the presenter alternates left-right with a steady rhythm during the active practice phase and pauses/resumes cleanly.
29. Continue through the shell-owned completion and reflection panels, confirm the copy stays rhythm-aware, save an optional note, and confirm restart returns to the bilateral-rhythm path without requiring a phrase.

### Orienting path

30. Return to `Exercise Selection` and choose `Orienting`.
31. Confirm the app skips `Phrase` and moves directly to `Instructions`.
32. On `Instructions`, confirm the screen frames the practice as a reset, shows an orienting guidance block, and still lets you toggle `Low-intensity mode` and `Reduced motion`.
33. Start practice and confirm the presenter guides a wider orienting scan during the active practice phase and pauses/resumes cleanly.
34. Continue through the shell-owned completion and reflection panels, confirm the copy stays orienting-aware, save an optional note, and confirm restart returns to the orienting path without requiring a phrase.

## Validation Notes

- `tests/fullFlowSmoke.ts` checks scene registration order, exercise-aware flow sequencing, practice control behavior, reflection save behavior, and reload persistence for both exercise paths.
- `tests/sessionPersistence.ts` validates persistence sanitization and graceful storage failures.
- `tests/sessionRestartLifecycle.ts` validates session restart behavior for completed and stopped rounds.
