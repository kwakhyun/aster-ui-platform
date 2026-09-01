import {
  Cube,
  FigmaLogo,
} from "@phosphor-icons/react";
import { figmaRestFixturePayload, normalizeFigmaChanges } from "@aster-ui/figma-bridge";
import { tokenVersion } from "@aster-ui/tokens";
import { useCallback, useMemo, useState } from "react";
import { DiffDrawer } from "./components/DiffDrawer";
import { Inspector } from "./components/Inspector";
import { ReleaseDialog } from "./components/ReleaseDialog";
import { Sidebar } from "./components/Sidebar";
import { SyncStrip } from "./components/SyncStrip";
import { Toast } from "./components/Toast";
import { TopBar } from "./components/TopBar";
import { Workspace } from "./components/Workspace";
import { useReleaseWorkflow } from "./hooks/useReleaseWorkflow";
import { copyText } from "./lib/clipboard";
import qualityEvidenceJson from "./generated/quality-evidence.json";
import { components } from "./data/catalog";
import {
  readStoredReviewReceipt,
  storeReviewReceipt,
} from "./services/reviewService";
import type {
  InspectorTab,
  Platform,
  PreviewStateOption,
  QualityEvidence,
  StudioTheme,
  WorkspaceTab,
} from "./types";

const figmaReview = normalizeFigmaChanges(
  figmaRestFixturePayload,
  "2026-09-01T09:51:00+09:00",
);
const repositoryEvidence = qualityEvidenceJson as QualityEvidence;
const embeddedSourceRevision = typeof __ASTER_SOURCE_REVISION__ === "string"
  ? __ASTER_SOURCE_REVISION__
  : repositoryEvidence.sourceRevision;

interface AppProps {
  readonly evidence?: QualityEvidence;
  readonly buildSourceRevision?: string;
}

export function App({
  evidence = repositoryEvidence,
  buildSourceRevision = embeddedSourceRevision,
}: AppProps = {}) {
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("preview");
  const [selectedComponent, setSelectedComponent] = useState("TreatmentCard");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("tokens");
  const [platform, setPlatform] = useState<Platform>("web");
  const [theme, setTheme] = useState<StudioTheme>("coral");
  const [previewState, setPreviewState] = useState<PreviewStateOption["id"]>("focus");
  const [saved, setSaved] = useState(false);
  const [reviewReceipt, setReviewReceipt] = useState(() =>
    readStoredReviewReceipt(window.localStorage, figmaReview)
  );
  const [diffOpen, setDiffOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "info">("info");
  const evidenceCurrent = evidence.sourceRevision === buildSourceRevision;
  const displayedEvidence = useMemo<QualityEvidence>(() => evidenceCurrent ? evidence : {
    ...evidence,
    checks: evidence.checks.map((check) => ({
      ...check,
      status: "attention",
      detail: "This checked-in report does not match the source revision embedded in this build.",
    })),
  }, [evidence, evidenceCurrent]);
  const qualityReady = evidenceCurrent
    && displayedEvidence.checks.every((check) => check.status === "passed");
  const releaseContext = useMemo(() => reviewReceipt && qualityReady ? {
    review: reviewReceipt,
    evidence: {
      generatedAt: displayedEvidence.generatedAt,
      sourceRevision: displayedEvidence.sourceRevision,
      gitCommit: displayedEvidence.gitCommit,
      runId: displayedEvidence.runId,
      artifactDigest: displayedEvidence.artifactDigest,
    },
  } : null, [displayedEvidence, qualityReady, reviewReceipt]);
  const release = useReleaseWorkflow(releaseContext);
  const reviewed = reviewReceipt !== null;

  const showToast = useCallback((message: string, tone: "success" | "info" = "info") => {
    setToast(message);
    setToastTone(tone);
  }, []);

  const handleWorkspaceTab = useCallback((tab: WorkspaceTab) => {
    setWorkspaceTab(tab);
    if (tab !== "preview") setInspectorTab(tab);
  }, []);

  const completeReview = useCallback(() => {
    try {
      const receipt = storeReviewReceipt(window.localStorage, figmaReview);
      setReviewReceipt(receipt);
      setDiffOpen(false);
      showToast(`Figma changes reviewed by ${receipt.reviewer.label}.`, "success");
    } catch {
      showToast("Figma review could not be recorded.");
    }
  }, [showToast]);

  const handleCopy = useCallback(async (value: string, label: string) => {
    try {
      await copyText(value);
      showToast(`${label} copied.`, "success");
    } catch {
      showToast(`${label} could not be copied.`);
    }
  }, [showToast]);

  const handlePublish = async () => {
    const receipt = await release.publish();
    if (!receipt) return;
    setReleaseOpen(false);
    showToast(`${receipt.version} local release rehearsal recorded. No registry was changed.`, "success");
  };

  return (
    <div className="app-shell" data-theme={theme}>
      <a className="skip-link" href="#main-workspace">본문으로 건너뛰기</a>
      <TopBar
        activeTab={workspaceTab}
        sidebarOpen={sidebarOpen}
        running={release.status === "running"}
        rehearsed={release.status === "rehearsed"}
        version={tokenVersion}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onNavigate={handleWorkspaceTab}
        onHelp={() => showToast("Tip: press ⌘K or Ctrl+K to search components.")}
        onPublish={() => setReleaseOpen(true)}
      />

      <div className="app-layout">
        <Sidebar
          open={sidebarOpen}
          selectedComponent={selectedComponent}
          onRequestOpen={() => setSidebarOpen(true)}
          onClose={() => setSidebarOpen(false)}
          onCopyPackage={() => void handleCopy("@aster-ui/react", "Package name")}
          onSelectComponent={(name) => {
            setSelectedComponent(name);
            setWorkspaceTab("preview");
            setInspectorTab("api");
          }}
        />

        <main id="main-workspace" className="main" tabIndex={-1}>
          <header className="component-header">
            <div className="component-header__title">
              <Cube size={28} aria-hidden="true" />
              <h1>{selectedComponent}</h1>
              <code>@aster-ui/react</code>
              <span>v{tokenVersion}</span>
            </div>
            <p>
              <FigmaLogo weight="fill" aria-hidden="true" />
              Figma variables <i /> {components.length} shipped web components
            </p>
          </header>

          <SyncStrip
            reviewReceipt={reviewReceipt}
            changeCount={figmaReview.validation.changeCount}
            syncedAt={figmaReview.syncedAt}
            sourceTheme={figmaReview.sourceTheme}
            onReview={() => setDiffOpen(true)}
          />

          <Workspace
            tab={workspaceTab}
            componentName={selectedComponent}
            platform={platform}
            theme={theme}
            previewState={previewState}
            saved={saved}
            qualityEvidence={displayedEvidence}
            onTabChange={handleWorkspaceTab}
            onPlatformChange={setPlatform}
            onThemeChange={setTheme}
            onStateChange={setPreviewState}
            onSavedChange={setSaved}
            onCardSelect={() => showToast("TreatmentCard selection event emitted.")}
            onCopyUsage={(usage) => void handleCopy(usage, "API usage")}
          />
        </main>

        <Inspector
          tab={inspectorTab}
          componentName={selectedComponent}
          review={figmaReview}
          qualityEvidence={displayedEvidence}
          onTabChange={setInspectorTab}
          onOpenDiff={() => setDiffOpen(true)}
          onViewVisualTests={() => {
            const visual = displayedEvidence.checks.find((check) => check.id === "visual");
            showToast(visual?.detail ?? "Visual evidence is not available.");
          }}
        />
      </div>

      <DiffDrawer
        open={diffOpen}
        reviewed={reviewed}
        review={figmaReview}
        onClose={() => setDiffOpen(false)}
        onComplete={completeReview}
      />

      {releaseOpen ? (
        <ReleaseDialog
          open
          reviewReceipt={reviewReceipt}
          qualityReady={qualityReady}
          status={release.status}
          errorMessage={release.errorMessage}
          onClose={() => setReleaseOpen(false)}
          onCancel={release.cancel}
          onReview={() => {
            setReleaseOpen(false);
            setDiffOpen(true);
          }}
          onInspectQuality={() => {
            setReleaseOpen(false);
            handleWorkspaceTab("quality");
          }}
          onPublish={handlePublish}
        />
      ) : null}

      <Toast
        message={toast}
        tone={toastTone}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
