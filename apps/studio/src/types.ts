import type { ThemeName } from "@aster-ui/tokens";

export type Platform = "web" | "ios" | "android";
export type InspectorTab = "api" | "tokens" | "quality";
export type WorkspaceTab = "preview" | "api" | "tokens" | "quality";
export type ReleaseStatus = "idle" | "running" | "rehearsed" | "failed";
export type PreviewState = "default" | "hover" | "focus" | "disabled";
export type StudioTheme = ThemeName;

export interface PreviewStateOption {
  readonly id: PreviewState;
  readonly label: string;
}

export interface QualityCheckEvidence {
  readonly id: string;
  readonly label: string;
  readonly status: "passed" | "attention";
  readonly detail: string;
  readonly command: string;
  readonly generatedAt: string | null;
  readonly sourceRevision: string | null;
  readonly gitCommit: string | null;
  readonly runId: string | null;
  readonly evidenceDigest: string | null;
}

export interface QualityEvidence {
  readonly schemaVersion: 3;
  readonly generatedAt: string;
  readonly sourceRevision: string;
  readonly gitCommit: string | null;
  readonly runId: string;
  readonly artifactDigest: string;
  readonly checks: readonly QualityCheckEvidence[];
}
