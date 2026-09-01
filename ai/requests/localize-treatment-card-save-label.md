# Request: localizable TreatmentCard saved-state labels

TreatmentCard currently constructs Korean accessible labels for the save action inside the component. Propose a backward-compatible public API that lets consumers localize those labels while preserving the current Korean behavior by default.

The proposal must cover the uncontrolled label fallback, saved and unsaved states, disabled behavior, API documentation, unit tests, and accessibility verification. Do not implement or apply the change.
