import { spawn } from "node:child_process";
import process from "node:process";

export class BoundedProcessError extends Error {
  constructor(message, reason, options) {
    super(message, options);
    this.name = "BoundedProcessError";
    this.reason = reason;
  }
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer.`);
  }
  return value;
}

export function runBoundedCommand(command, args, options = {}) {
  const timeoutMs = positiveInteger(options.timeoutMs ?? 120_000, "timeoutMs");
  const maxStdoutBytes = positiveInteger(options.maxStdoutBytes ?? 10 * 1024 * 1024, "maxStdoutBytes");
  const maxStderrBytes = positiveInteger(options.maxStderrBytes ?? 1024 * 1024, "maxStderrBytes");

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let terminationError = null;
    let settled = false;

    const terminate = (error) => {
      if (terminationError || settled) return;
      terminationError = error;
      child.kill("SIGKILL");
    };
    const timer = setTimeout(() => {
      terminate(new BoundedProcessError("Provider command timed out.", "timeout"));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > maxStdoutBytes) {
        terminate(new BoundedProcessError("Provider stdout exceeded its limit.", "stdout-limit"));
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes > maxStderrBytes) {
        terminate(new BoundedProcessError("Provider stderr exceeded its limit.", "stderr-limit"));
        return;
      }
      stderr.push(chunk);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new BoundedProcessError("Provider command could not start.", "spawn", { cause: error }));
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (terminationError) {
        reject(terminationError);
        return;
      }
      resolve({
        code: code ?? 1,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}
