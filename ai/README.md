# Executable AI proposal workflow

This workflow turns a scoped design-system request into a structured proposal. It does not grant an AI agent permission to edit source or release a package.

## Deterministic CI path

```bash
pnpm ai:fixture
pnpm ai:check
```

The fixture path validates the same proposal schema, current component manifest, semver rules, unit and accessibility test requirements, documentation, and risk fields used by the live path. It also proves that tampered manifest context, validation receipts, and source-mutation boundaries fail closed.

## Live Claude Code path

```bash
pnpm ai:propose -- \
  --provider claude \
  --request ai/requests/localize-treatment-card-save-label.md \
  --output reports/ai-proposals/treatment-card-label.claude.json
```

The wrapper invokes Claude Code non-interactively with tools disabled, JSON Schema structured output, no session persistence, and a budget cap. The generated report records provider version, request, prompt, and manifest digests. Deterministic validation runs before the file is written.

## Human approval boundary

```bash
pnpm ai:approve -- \
  --proposal reports/ai-proposals/treatment-card-label.claude.json \
  --reviewer "Reviewer name" \
  --output reports/ai-approvals/treatment-card-label.json
```

Approval revalidates the proposal against the current request, prompt, and component manifest before producing a separate receipt. It still does not apply code. Implementation happens in a normal reviewed branch, followed by `pnpm verify` and the release workflow.
