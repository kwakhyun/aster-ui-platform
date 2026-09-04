import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  inspectReusableSecurityEvidence,
  recordSecurityEvidence,
} from "./record-security-evidence.mjs";

const transientFailurePatterns = [
  /\b(?:ERR_SOCKET_TIMEOUT|ETIMEDOUT|ESOCKETTIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|ENETUNREACH|EHOSTUNREACH)\b/i,
  /\bERR_PNPM_(?:AUDIT_BAD_RESPONSE|META_FETCH_FAIL)\b/i,
  /\b(?:socket hang up|fetch failed|service unavailable|bad gateway|gateway timeout)\b/i,
];

export function isTransientAuditFailure(output) {
  return transientFailurePatterns.some((pattern) => pattern.test(output));
}

function runAuditCommand() {
  const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  return spawnSync(executable, ["audit", "--prod", "--audit-level", "high"], {
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_fetch_retries: process.env.npm_config_fetch_retries ?? "1",
      npm_config_fetch_retry_maxtimeout:
        process.env.npm_config_fetch_retry_maxtimeout ?? "10000",
      npm_config_fetch_retry_mintimeout:
        process.env.npm_config_fetch_retry_mintimeout ?? "5000",
      npm_config_fetch_timeout: process.env.npm_config_fetch_timeout ?? "30000",
    },
  });
}

const defaultSleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

export async function runSecurityAudit(options = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  const retryDelaysMs = options.retryDelaysMs ?? [5_000, 15_000];
  const runAudit = options.runAudit ?? runAuditCommand;
  const inspectCachedEvidence = options.inspectCachedEvidence ?? inspectReusableSecurityEvidence;
  const recordEvidence = options.recordEvidence ?? recordSecurityEvidence;
  const sleep = options.sleep ?? defaultSleep;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError("maxAttempts must be a positive integer.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = runAudit();
    if (result.stdout) stdout.write(result.stdout);
    if (result.stderr) stderr.write(result.stderr);

    if (result.status === 0) {
      await recordEvidence();
      return 0;
    }

    const diagnostic = [result.stdout, result.stderr, result.error?.message]
      .filter(Boolean)
      .join("\n");
    const transient = isTransientAuditFailure(diagnostic);
    if (!transient) return result.status ?? 1;
    if (attempt === maxAttempts) {
      const cachedEvidence = await inspectCachedEvidence();
      if (cachedEvidence.reusable) {
        stderr.write(
          "npm audit is unavailable; using passing evidence from the last 24 hours " +
            "because pnpm-lock.yaml is unchanged.\n",
        );
        return 0;
      }
      stderr.write(`npm audit fallback rejected: ${cachedEvidence.reason}.\n`);
      return result.status ?? 1;
    }

    const delayMs = retryDelaysMs[Math.min(attempt - 1, retryDelaysMs.length - 1)] ?? 0;
    stderr.write(
      `Transient npm audit failure; retrying in ${Math.ceil(delayMs / 1_000)}s ` +
        `(attempt ${attempt + 1}/${maxAttempts}).\n`,
    );
    await sleep(delayMs);
  }

  return 1;
}

const entryPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryPath === import.meta.url) {
  process.exitCode = await runSecurityAudit();
}
