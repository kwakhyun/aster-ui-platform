import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { computeEvidenceDigest } from "./lib/provenance.mjs";
import {
  inspectReusableSecurityEvidence,
  securityAuditCommand,
  securityAuditMaxAgeMs,
} from "./record-security-evidence.mjs";
import { isTransientAuditFailure, runSecurityAudit } from "./run-security-audit.mjs";

function outputCollector() {
  const chunks = [];
  return {
    chunks,
    stream: {
      write(value) {
        chunks.push(String(value));
      },
    },
  };
}

function dependencySnapshot(lockfile) {
  return `sha256:${createHash("sha256").update(lockfile).digest("hex")}`;
}

function auditReport(core, generatedAt, gitCommit = null) {
  const sourceRevision = "workspace:11111111111111111111";
  return {
    ...core,
    generatedAt,
    sourceRevision,
    gitCommit,
    runId: "test:audit",
    artifactDigest: computeEvidenceDigest(core, sourceRevision, gitCommit),
  };
}

test("classifies registry connectivity failures as transient", () => {
  assert.equal(isTransientAuditFailure("ERR_SOCKET_TIMEOUT while requesting registry.npmjs.org"), true);
  assert.equal(isTransientAuditFailure("503 Service Unavailable"), true);
});

test("does not classify a vulnerability result as transient", () => {
  assert.equal(isTransientAuditFailure("1 high severity vulnerability found"), false);
});

test("retries a transient failure and succeeds", async () => {
  const results = [
    { status: 1, stdout: "", stderr: "ERR_SOCKET_TIMEOUT\n" },
    { status: 0, stdout: "No known vulnerabilities found\n", stderr: "" },
  ];
  const delays = [];
  let recorded = 0;
  const stdout = outputCollector();
  const stderr = outputCollector();

  const exitCode = await runSecurityAudit({
    maxAttempts: 3,
    retryDelaysMs: [5_000, 15_000],
    runAudit: () => results.shift(),
    recordEvidence: async () => {
      recorded += 1;
    },
    sleep: async (delayMs) => delays.push(delayMs),
    stdout: stdout.stream,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 0);
  assert.equal(recorded, 1);
  assert.deepEqual(delays, [5_000]);
  assert.match(stdout.chunks.join(""), /No known vulnerabilities/);
  assert.match(stderr.chunks.join(""), /attempt 2\/3/);
});

test("does not retry a vulnerability failure", async () => {
  let attempts = 0;
  const delays = [];
  const stderr = outputCollector();

  const exitCode = await runSecurityAudit({
    runAudit: () => {
      attempts += 1;
      return { status: 1, stdout: "1 high severity vulnerability found\n", stderr: "" };
    },
    recordEvidence: async () => assert.fail("failed audits must not record passing evidence"),
    sleep: async (delayMs) => delays.push(delayMs),
    stdout: outputCollector().stream,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 1);
  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
  assert.doesNotMatch(stderr.chunks.join(""), /retrying/);
});

test("reuses recent evidence only after all transient attempts fail", async () => {
  let attempts = 0;
  let cacheChecks = 0;
  const stderr = outputCollector();

  const exitCode = await runSecurityAudit({
    maxAttempts: 2,
    retryDelaysMs: [0],
    runAudit: () => {
      attempts += 1;
      return { status: 1, stdout: "", stderr: "ERR_SOCKET_TIMEOUT\n" };
    },
    inspectCachedEvidence: async () => {
      cacheChecks += 1;
      return { reusable: true };
    },
    recordEvidence: async () => assert.fail("cached audits must not replace the original evidence"),
    sleep: async () => {},
    stdout: outputCollector().stream,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 0);
  assert.equal(attempts, 2);
  assert.equal(cacheChecks, 1);
  assert.match(stderr.chunks.join(""), /pnpm-lock\.yaml is unchanged/);
});

test("fails closed when transient errors have no reusable evidence", async () => {
  const stderr = outputCollector();
  const exitCode = await runSecurityAudit({
    maxAttempts: 1,
    runAudit: () => ({ status: 1, stdout: "", stderr: "ERR_SOCKET_TIMEOUT\n" }),
    inspectCachedEvidence: async () => ({ reusable: false, reason: "the lockfile changed" }),
    recordEvidence: async () => assert.fail("failed audits must not record passing evidence"),
    stdout: outputCollector().stream,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 1);
  assert.match(stderr.chunks.join(""), /fallback rejected: the lockfile changed/);
});

test("reuses a recent signed audit only for the same dependency snapshot", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aster-audit-current-"));
  const lockfile = "lockfileVersion: '9.0'\n";
  const now = Date.parse("2026-09-04T00:00:00.000Z");
  const core = {
    schemaVersion: 4,
    command: securityAuditCommand,
    scope: "Production dependency graph",
    dependencySnapshot: dependencySnapshot(lockfile),
    knownVulnerabilities: 0,
    status: "passed",
  };
  const report = auditReport(core, new Date(now - 60_000).toISOString());

  try {
    await writeFile(path.join(projectRoot, "pnpm-lock.yaml"), lockfile);
    assert.equal((await inspectReusableSecurityEvidence({ projectRoot, report, now })).reusable, true);

    await writeFile(path.join(projectRoot, "pnpm-lock.yaml"), `${lockfile}changed: true\n`);
    const changed = await inspectReusableSecurityEvidence({ projectRoot, report, now });
    assert.equal(changed.reusable, false);
    assert.match(changed.reason, /pnpm-lock\.yaml changed/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("rejects valid but expired audit evidence", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aster-audit-expired-"));
  const lockfile = "lockfileVersion: '9.0'\n";
  const generatedAt = Date.parse("2026-09-01T00:00:00.000Z");
  const core = {
    schemaVersion: 4,
    command: securityAuditCommand,
    scope: "Production dependency graph",
    dependencySnapshot: dependencySnapshot(lockfile),
    knownVulnerabilities: 0,
    status: "passed",
  };
  const report = auditReport(core, new Date(generatedAt).toISOString());

  try {
    await writeFile(path.join(projectRoot, "pnpm-lock.yaml"), lockfile);
    const expired = await inspectReusableSecurityEvidence({
      projectRoot,
      report,
      now: generatedAt + securityAuditMaxAgeMs + 1,
    });
    assert.equal(expired.reusable, false);
    assert.match(expired.reason, /older than 24 hours/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("supports the signed legacy report while its committed lockfile is unchanged", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aster-audit-legacy-"));
  const lockfile = "lockfileVersion: '9.0'\n";
  const generatedAt = "2026-09-04T00:00:00.000Z";

  try {
    await writeFile(path.join(projectRoot, "pnpm-lock.yaml"), lockfile);
    execFileSync("git", ["init", "--quiet"], { cwd: projectRoot });
    execFileSync("git", ["add", "pnpm-lock.yaml"], { cwd: projectRoot });
    execFileSync("git", [
      "-c",
      "user.name=Audit Test",
      "-c",
      "user.email=audit@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "test fixture",
    ], { cwd: projectRoot });
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: projectRoot,
      encoding: "utf8",
    }).trim();
    const core = {
      schemaVersion: 3,
      command: securityAuditCommand,
      scope: "Production dependency graph",
      knownVulnerabilities: 0,
      status: "passed",
    };
    const report = auditReport(core, generatedAt, gitCommit);
    const result = await inspectReusableSecurityEvidence({
      projectRoot,
      report,
      now: Date.parse(generatedAt) + 60_000,
    });
    assert.equal(result.reusable, true);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
