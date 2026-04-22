# Soft Focus

Soft Focus is a small Phaser guided-practice prototype with an exercise-driven flow.

The current Soft Focus core toolkit surfaces two live practice phases:

- `Maintenance`: `Phrase anchor`
- `Reset`: `Moving ball`

`Integration / Reflection` currently appears as the closing reflection step after practice.

Planned next reset tools for Soft Focus:

- `Bilateral tapping`
- `Orienting`
- `Breathing reset`

Current flow:

- `Entry -> Exercise Selection -> Phrase -> Instructions -> Practice -> Completion -> Reflection` for the phrase-anchor exercise
- `Entry -> Exercise Selection -> Instructions -> Practice -> Completion -> Reflection` for the moving-ball exercise

The app persists the selected exercise, phrase (when used), settings, and recent session summaries locally.

## Scripts

- `npm run dev`: start the local Vite app.
- `npm run typecheck`: run the TypeScript compiler without emitting files.
- `npm run smoke:test`: run focused TypeScript smoke validations for scene flow, persistence, and restart behavior.
- `npm run build`: typecheck and produce a production bundle.
- `npm run validate`: run broad validation across typecheck, smoke tests, and production build.

## Manual Smoke Path

1. Start the app with `npm run dev`.
2. On `Entry`, press `Choose your exercise` and confirm the app moves to `Exercise Selection`.
3. On `Exercise Selection`, confirm the screen labels `Phrase anchor` as `Maintenance`, `Moving ball` as `Reset`, and shows `Integration / Reflection` as a calm note about the current closing step.

### Phrase anchor path

4. Choose `Phrase anchor`.
5. On `Phrase`, enter a short phrase, verify invalid text disables the continue button, then continue.
6. On `Instructions`, verify the saved phrase is shown and toggle `Low-intensity mode` and `Gaze guidance`.
7. Start practice and verify the `Pause`, `Resume`, and `Stop` controls behave as expected.
8. Allow one run to finish and confirm the app reaches `Completion` automatically with maintenance-oriented summary copy.
9. Continue to `Reflection`, confirm the screen uses `Integration / Reflection` framing with a maintenance-oriented prompt, enter a short note, and save.
10. Confirm the app returns to `Phrase` with the previous phrase still available for the next round.

### Moving-ball path

11. Return to `Exercise Selection` and choose `Moving ball`.
12. Confirm the app skips `Phrase` and moves directly to `Instructions`.
13. On `Instructions`, verify the selected preset is shown, toggle `Low-intensity mode`, and switch between the available moving-ball sweep presets.
14. Start practice and confirm the moving ball stays still during `Settle`, uses the selected sweep pattern only during the active practice phase, and pauses/resumes cleanly.
15. Let one run finish or stop it early, continue through `Completion` and `Reflection`, confirm the copy stays reset-aware, save an optional note, and confirm restart returns to the moving-ball path with the selected preset still active.

16. Reload the page and confirm the selected exercise, phrase/settings where applicable, and the latest completed or stopped summary still appear after reload, while any in-progress practice state does not resume.

## Validation Notes

- `tests/fullFlowSmoke.ts` checks scene registration order, exercise-aware flow sequencing, practice control behavior, reflection save behavior, and reload persistence for both exercise paths.
- `tests/sessionPersistence.ts` validates persistence sanitization and graceful storage failures.
- `tests/sessionRestartLifecycle.ts` validates session restart behavior for completed and stopped rounds.
