# Aster UI AI proposal guardrails

When producing a design-system proposal in this repository:

- Treat `packages/react/component-manifest.json` as the current public API contract.
- Treat `packages/react/api-baseline.json` as the compatibility floor.
- Return only the requested structured proposal. Do not edit source files, run release commands, or claim that checks passed.
- Optional API additions may be minor changes. Removals, type changes, default changes, and optional-to-required changes are major changes.
- Include unit and accessibility verification, documentation work, risks, and mitigations.
- A proposal remains untrusted until deterministic validation and explicit human approval are recorded.
