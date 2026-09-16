# 3DLite Release Gates

Runtime/startup regressions are release-blocking.

Before promotion verify at minimum:

- External script tags are structurally valid and contain no accidental inline body code.
- No known initialization-time TDZ/reference-order hazards.
- No initialization `ReferenceError`/uncaught startup exception.
- Exactly one intended animation/render-loop start.
- Explicit final bootstrap occurs only after required subsystems initialize.
- No duplicate DOM IDs that can redirect UI wiring.
- JavaScript syntax/static checks pass.
- Required viewport/render dependencies are checked before use.
- Successful boot/render marker or equivalent runtime confirmation exists.
- Editor is visible; no black/blank viewport regression.
- Core UI remains responsive.
- Creation, selection and transform paths use the intended authority/ownership path.
- Renderer startup/progress/cancel paths are checked when renderer code changes.
- Browser integration is tested for browser-facing changes.
- Desktop/Tauri build is checked for desktop-facing changes.
- Known-good previous build remains available for recovery.

## Promotion rule
Do not promote a build that fails any applicable release gate. Keep the previous known-good build untouched.

## Regression reporting
For every release candidate record: version, source commit, files changed, tests run, failures found, repairs applied, unresolved issues, browser/runtime evidence and whether promotion is approved.
