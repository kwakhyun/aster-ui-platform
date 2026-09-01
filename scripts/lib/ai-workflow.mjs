import { createHash } from "node:crypto";

export function digest(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

export function createProposalPrompt(template, request, manifest) {
  return template
    .replace("{{REQUEST}}", request.trim())
    .replace("{{MANIFEST}}", JSON.stringify(manifest, null, 2));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export function validateProposal(proposal, manifest) {
  const failures = [];
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    throw new Error("AI proposal must be an object.");
  }
  const rootKeys = [
    "title",
    "summary",
    "component",
    "semverImpact",
    "apiChanges",
    "implementationPlan",
    "testCases",
    "documentation",
    "risks",
  ];
  if (!hasOnlyKeys(proposal, rootKeys)) failures.push("proposal contains unsupported fields");
  for (const field of ["title", "summary", "component"]) {
    if (!isNonEmptyString(proposal[field])) failures.push(`${field} must be a non-empty string`);
  }
  if (!["patch", "minor", "major"].includes(proposal.semverImpact)) {
    failures.push("semverImpact must be patch, minor, or major");
  }
  const component = manifest.components.find((candidate) => candidate.name === proposal.component);
  if (!component) failures.push(`component is not in the public manifest: ${String(proposal.component)}`);

  if (!Array.isArray(proposal.apiChanges)) {
    failures.push("apiChanges must be an array");
  } else {
    for (const change of proposal.apiChanges) {
      if (!change || typeof change !== "object") {
        failures.push("every API change must be an object");
        continue;
      }
      if (!hasOnlyKeys(change, ["action", "prop", "type", "required", "rationale"])) {
        failures.push("API change contains unsupported fields");
      }
      if (!["add", "deprecate", "remove", "change"].includes(change.action)) {
        failures.push(`invalid API change action: ${String(change.action)}`);
      }
      if (!isNonEmptyString(change.prop) || !isNonEmptyString(change.type) || !isNonEmptyString(change.rationale)) {
        failures.push("API changes require prop, type, and rationale strings");
      }
      if (typeof change.required !== "boolean") failures.push(`API change ${String(change.prop)} needs a boolean required field`);
      const existing = component?.props.some((prop) => prop.name === change.prop) ?? false;
      if (change.action === "add" && existing) failures.push(`${proposal.component}.${change.prop} already exists`);
      if (change.action !== "add" && !existing) failures.push(`${proposal.component}.${change.prop} does not exist`);
      const breaking = change.action === "remove" || change.action === "change" || (change.action === "add" && change.required);
      if (breaking && proposal.semverImpact !== "major") {
        failures.push(`${proposal.component}.${change.prop} requires a major semver impact`);
      }
      if (change.action === "add" && !change.required && proposal.semverImpact === "patch") {
        failures.push(`${proposal.component}.${change.prop} requires at least a minor semver impact`);
      }
    }
  }

  if (!Array.isArray(proposal.implementationPlan) || proposal.implementationPlan.length < 2
    || proposal.implementationPlan.some((item) => !isNonEmptyString(item))) {
    failures.push("implementationPlan needs at least two concrete steps");
  }
  if (!Array.isArray(proposal.testCases) || proposal.testCases.length < 2) {
    failures.push("testCases needs at least two cases");
  } else {
    const testKinds = new Set();
    for (const testCase of proposal.testCases) {
      if (!testCase || typeof testCase !== "object"
        || !isNonEmptyString(testCase.name)
        || !isNonEmptyString(testCase.assertion)
        || !["unit", "interaction", "accessibility", "browser", "visual"].includes(testCase.kind)) {
        failures.push("every test case needs a valid name, kind, and assertion");
        continue;
      }
      if (!hasOnlyKeys(testCase, ["name", "kind", "assertion"])) {
        failures.push("test case contains unsupported fields");
      }
      testKinds.add(testCase.kind);
    }
    if (!testKinds.has("unit")) failures.push("testCases must include unit verification");
    if (!testKinds.has("accessibility")) failures.push("testCases must include accessibility verification");
  }
  if (!Array.isArray(proposal.documentation) || proposal.documentation.length === 0
    || proposal.documentation.some((item) => !isNonEmptyString(item))) {
    failures.push("documentation needs at least one concrete update");
  }
  if (!Array.isArray(proposal.risks) || proposal.risks.length === 0
    || proposal.risks.some((item) => !item
      || typeof item !== "object"
      || !hasOnlyKeys(item, ["risk", "mitigation"])
      || !isNonEmptyString(item.risk)
      || !isNonEmptyString(item.mitigation))) {
    failures.push("risks need at least one risk and mitigation");
  }

  if (failures.length > 0) throw new Error(`AI proposal validation failed:\n- ${failures.join("\n- ")}`);
  return [
    "public component exists",
    "semver impact matches API shape",
    "unit verification is specified",
    "accessibility verification is specified",
    "documentation is specified",
    "risks and mitigations are specified",
  ];
}

export function validateProposalReport(report, context) {
  const {
    manifest,
    request,
    requestPath,
    promptTemplate,
    promptTemplatePath,
  } = context;
  const failures = [];
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("AI proposal report must be an object.");
  }
  if (!hasOnlyKeys(report, [
    "schemaVersion",
    "generatedAt",
    "provider",
    "request",
    "prompt",
    "context",
    "proposal",
    "automatedValidation",
    "humanReview",
    "sourceMutation",
  ])) failures.push("proposal report contains unsupported fields");
  const checks = validateProposal(report.proposal, manifest);
  const expectedPrompt = createProposalPrompt(promptTemplate, request, manifest);

  if (report.schemaVersion !== 1) failures.push("unsupported proposal report schema");
  if (typeof report.generatedAt !== "string" || !Number.isFinite(Date.parse(report.generatedAt))) {
    failures.push("proposal report generatedAt must be a valid timestamp");
  }
  if (!report.provider || typeof report.provider !== "object"
    || !hasOnlyKeys(report.provider, ["id", "version", "execution"])
    || !isNonEmptyString(report.provider.id)
    || !isNonEmptyString(report.provider.version)
    || !isNonEmptyString(report.provider.execution)) {
    failures.push("proposal provider metadata is invalid");
  }
  if (!report.request || typeof report.request !== "object"
    || !hasOnlyKeys(report.request, ["path", "digest"])) {
    failures.push("proposal request metadata is invalid");
  }
  if (!report.prompt || typeof report.prompt !== "object"
    || !hasOnlyKeys(report.prompt, ["template", "digest"])) {
    failures.push("proposal prompt metadata is invalid");
  }
  if (requestPath && report.request?.path !== requestPath) {
    failures.push("request path does not match the approved input");
  }
  if (promptTemplatePath && report.prompt?.template !== promptTemplatePath) {
    failures.push("prompt template path does not match the approved input");
  }
  if (report.request?.digest !== digest(request)) failures.push("request digest does not match current input");
  if (report.prompt?.digest !== digest(expectedPrompt)) failures.push("prompt digest does not match current inputs");
  if (report.context?.package !== manifest.package
    || report.context?.version !== manifest.version
    || report.context?.componentCount !== manifest.components.length
    || report.context?.manifestDigest !== digest(manifest)) {
    failures.push("manifest context does not match the current public API");
  }
  if (report.automatedValidation?.status !== "passed"
    || JSON.stringify(report.automatedValidation?.checks) !== JSON.stringify(checks)) {
    failures.push("automated validation receipt does not match a fresh validation");
  }
  if (!report.humanReview || typeof report.humanReview !== "object"
    || !hasOnlyKeys(report.humanReview, ["status", "reviewer", "reviewedAt"])
    || report.humanReview.status !== "required"
    || report.humanReview.reviewer !== null
    || report.humanReview.reviewedAt !== null) {
    failures.push("human review is not required or is already claimed");
  }
  if (report.sourceMutation?.allowedByThisCommand !== false || report.sourceMutation?.applied !== false) {
    failures.push("source mutation boundary is not disabled");
  }

  if (failures.length > 0) throw new Error(`AI proposal report validation failed:\n- ${failures.join("\n- ")}`);
  return checks;
}

export function validateReviewer(reviewer) {
  if (!isNonEmptyString(reviewer) || reviewer.trim().length > 100 || /[\r\n]/u.test(reviewer)) {
    throw new Error("Reviewer must be a single non-empty line of at most 100 characters.");
  }
  return reviewer.trim();
}

export function createApprovalReceipt(report, context) {
  validateProposalReport(report, context);
  const reviewer = validateReviewer(context.reviewer);
  const reviewedAt = context.reviewedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(reviewedAt))) {
    throw new Error("Approval reviewedAt must be a valid timestamp.");
  }
  if (!isNonEmptyString(context.proposalPath)) {
    throw new Error("Approval proposalPath must be a non-empty project path.");
  }
  return {
    schemaVersion: 2,
    proposalPath: context.proposalPath,
    reportDigest: digest(report),
    proposalDigest: digest(report.proposal),
    requestDigest: report.request.digest,
    promptDigest: report.prompt.digest,
    manifestDigest: report.context.manifestDigest,
    status: "approved",
    reviewer,
    reviewedAt,
    sourceMutation: {
      applied: false,
      note: "Approval authorizes a separate implementation review. It does not apply generated code.",
    },
  };
}

export function validateApprovalReceipt(receipt, report, context) {
  validateProposalReport(report, context);
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new Error("AI approval receipt must be an object.");
  }
  const expected = createApprovalReceipt(report, {
    ...context,
    proposalPath: receipt.proposalPath,
    reviewer: receipt.reviewer,
    reviewedAt: receipt.reviewedAt,
  });
  if (!hasOnlyKeys(receipt, Object.keys(expected)) || JSON.stringify(receipt) !== JSON.stringify(expected)) {
    throw new Error("AI approval receipt does not match the current validated proposal.");
  }
  return true;
}
