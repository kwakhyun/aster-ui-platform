# Executable AI proposal workflow

This workflow turns a scoped design-system request into a structured proposal. It does not grant an AI agent permission to edit source or release a package.

## Deterministic CI path

```bash
pnpm ai:fixture
pnpm ai:check
```

The check validates the same proposal schema, current component manifest, semver rules, unit and accessibility test requirements, documentation, and risk fields used by the live path. It then executes a temporary human-approval receipt, rejects tampering, overwrites, unsafe paths, invalid reviewer input, and provider timeouts, and confirms that the source revision did not change.

## Live Claude Code path

```bash
pnpm ai:propose -- \
  --provider claude \
  --request ai/requests/localize-treatment-card-save-label.md \
  --output reports/ai-proposals/treatment-card-label.claude.json
```

The wrapper invokes Claude Code non-interactively with tools disabled, JSON Schema structured output, no session persistence, a bounded budget, and a bounded runtime and output size. Requests are restricted to `ai/requests/`; new reports are restricted to `reports/ai-proposals/` and cannot overwrite an existing file. The generated report records provider version, request, prompt, and manifest digests. Deterministic validation runs before the file is written.

## Human approval boundary

```bash
pnpm ai:approve -- \
  --proposal reports/ai-proposals/treatment-card-label.claude.json \
  --reviewer "Reviewer name" \
  --output reports/ai-approvals/treatment-card-label.json
```

Approval revalidates the complete proposal report against the current request, prompt, and component manifest before producing a new receipt under `reports/ai-approvals/`. The receipt is bound to the full report and cannot overwrite a report or an existing receipt. It still does not apply code. Implementation happens in a normal reviewed branch, followed by `pnpm verify` and the release workflow.

The reviewer value is a local audit label, not authenticated identity or a digital signature. Live proposal and approval directories are Git-ignored by default.
