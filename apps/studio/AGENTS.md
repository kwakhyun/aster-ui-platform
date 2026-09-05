# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context`
skill when the visual source is unclear or no longer matches the current goal.
Record durable prototype-specific design feedback, preferences, and decisions in
`AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of
truth for layout, component anatomy, density, spacing, color, typography, visible
content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable design decisions

- The source of visual truth is `../../design/aster-ui-final-target.png` at a 1440 × 1024 viewport.
- The Component Lab is the primary product frame. It presents Figma sync,
  semantic-token review, quality checks, and semver publishing in one review flow.
  Publishing always requires human approval.
- Preserve the black top bar, porcelain workspace, coral primary accent, blue focus state, compact component tree, large TreatmentCard preview, and right-side inspector.
- AI may draft documentation or migration output, but the UI must always show human review and must never imply automatic correctness or automatic merge.
- Use Phosphor icons and real raster imagery. Do not replace visible assets with emoji, CSS drawings, or handcrafted SVGs.
- Resolve every token swatch from the generated theme JSON. Unknown colors must be labeled, never guessed from list position.
- Keep pending Before/After comparison in the Tokens workspace, using the review's source theme independently of the selected preview theme. Samples are inert visual references; expose their aliases and resolved values as accessible text.
- Storage policy denial must preserve browsing and clearly indicate that review and rehearsal records cannot be saved.
- The top bar identifies Component Lab; only workspace tabs navigate component views. Inspector tabs are Props, Changes, and Checks, under Review summary, and remain independent.
- Use one active overlay for navigation, token review, release rehearsal, or quality details. Background shortcuts and focus must respect the active modal.
- Share component, tab, theme, and platform through validated URL parameters. Preserve the hosting base path and unrelated query parameters.
- Studio metadata uses at least 12px text. Evidence explanations use 13px text with generous line height. Full identifiers and downloadable reports are available in Quality details.
