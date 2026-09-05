import {
  Cube,
  FigmaLogo,
} from "@phosphor-icons/react";
import { figmaRestFixturePayload, normalizeFigmaChanges } from "@aster-ui/figma-bridge";
import { tokenVersion } from "@aster-ui/tokens";
import { useCallback, useMemo, useState } from "react";
import { QualityDetailsDialog } from "./components/QualityDetailsDialog";
import { useWorkspaceLocation } from "./hooks/useWorkspaceLocation";
import { DiffDrawer } from "./components/DiffDrawer";
import { Inspector } from "./components/Inspector";
import { ReleaseDialog } from "./components/ReleaseDialog";
import { Sidebar } from "./components/Sidebar";
import { SyncStrip } from "./components/SyncStrip";
import { Toast } from "./components/Toast";
import { TopBar } from "./components/TopBar";
import { Workspace } from "./components/Workspace";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useReleaseWorkflow } from "./hooks/useReleaseWorkflow";
import { getBrowserStorage } from "./services/browserStorage";
import { copyText } from "./lib/clipboard";
import qualityEvidenceJson from "./generated/quality-evidence.json";
import { components } from "./data/catalog";
import {
  readStoredReviewReceipt,
  storeReviewReceipt,
} from "./services/reviewService";
import type {
  InspectorTab,
  PreviewStateOption,
  QualityEvidence,
  WorkspaceTab,
} from "./types";

const figmaReview = normalizeFigmaChanges(
  figmaRestFixturePayload,
  "2026-09-01T09:51:00+09:00",
);
const savedRepositoryEvidence = qualityEvidenceJson as QualityEvidence;
const embeddedSourceRevision = typeof __ASTER_SOURCE_REVISION__ === "string"
  ? __ASTER_SOURCE_REVISION__
  : savedRepositoryEvidence.sourceRevision;
const visualFixtureMode = typeof __ASTER_VISUAL_FIXTURE_MODE__ === "boolean"
  && __ASTER_VISUAL_FIXTURE_MODE__;
const visualFixtureGeneratedAt = "2026-09-01T00:45:00.000Z";
const repositoryEvidence: QualityEvidence = visualFixtureMode ? {
  ...savedRepositoryEvidence,
  generatedAt: visualFixtureGeneratedAt,
  sourceRevision: embeddedSourceRevision,
  checks: savedRepositoryEvidence.checks.map((check) => ({ ...check, status: "passed" })),
} : savedRepositoryEvidence;

interface AppProps {
  readonly evidence?: QualityEvidence;
  readonly buildSourceRevision?: string;
}

export function App({
  evidence = repositoryEvidence,
  buildSourceRevision = embeddedSourceRevision,
}: AppProps = {}) {
  const [{ component: selectedComponent, tab: workspaceTab, platform, theme }, navigate] = useWorkspaceLocation();
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("tokens");
  const [previewState, setPreviewState] = useState<PreviewStateOption["id"]>("focus");
  const [saved, setSaved] = useState(false);
  const [storage] = useState(getBrowserStorage);
  const [reviewReceipt, setReviewReceipt] = useState(() =>
    readStoredReviewReceipt(storage, figmaReview)
  );
  const [overlay, setOverlay] = useState<"navigation" | "review" | "release" | "evidence" | null>(null);
  const diffOpen = overlay === "review";
  const releaseOpen = overlay === "release";
  const sidebarOpen = overlay === "navigation";
  const blockingModal = overlay !== null && overlay !== "navigation";
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "info">("info");
  const overlayNavigation = useMediaQuery("(max-width: 1100px)");
  const navigationModalOpen = sidebarOpen && overlayNavigation;
  const evidenceCurrent = evidence.sourceRevision === buildSourceRevision;
  const displayedEvidence = useMemo<QualityEvidence>(() => evidenceCurrent ? evidence : {
    ...evidence,
    checks: evidence.checks.map((check) => ({
      ...check,
      status: "attention",
      detail: "The saved quality evidence does not match this build's source revision.",
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
    navigate({ tab });
  }, [navigate]);

  const completeReview = useCallback(() => {
    try {
      const receipt = storeReviewReceipt(storage, figmaReview);
      setReviewReceipt(receipt);
      setOverlay(null);
      showToast(`Review completed by ${receipt.reviewer.label}.`, "success");
    } catch {
      showToast("The Figma review could not be saved.");
    }
  }, [showToast, storage]);

  const handleCopy = useCallback(async (value: string, label: string) => {
    try {
      await copyText(value);
      showToast(`${label} copied.`, "success");
    } catch {
      showToast(`${label} could not be copied.`);
    }
  }, [showToast]);

  const openSidebar = useCallback(() => {
    if (overlayNavigation && !blockingModal) setOverlay("navigation");
  }, [overlayNavigation, blockingModal]);
  const closeSidebar = useCallback(() => setOverlay(null), []);
  const toggleSidebar = useCallback(() => setOverlay((active) => active === "navigation" ? null : "navigation"), []);
  const copyPackageName = useCallback(
    () => void handleCopy("@aster-ui/react", "Package name"),
    [handleCopy],
  );
  const selectComponent = useCallback((name: string) => {
    navigate({ component: name, tab: "preview" });
    setInspectorTab("api");
  }, [navigate]);

  const handlePublish = async () => {
    const receipt = await release.publish();
    if (!receipt) return;
    setOverlay((active) => active === "release" ? null : active);
    showToast(`${receipt.version} release rehearsal saved locally. Nothing was published.`, "success");
  };

  return (
    <div className="app-shell" data-theme={theme}>
      <a
        className="skip-link"
        href="#main-workspace"
        aria-hidden={(navigationModalOpen || blockingModal) ? "true" : undefined}
        tabIndex={(navigationModalOpen || blockingModal) ? -1 : undefined}
      >
        Skip to main content
      </a>
      <TopBar
        blocked={blockingModal}
        sidebarOpen={sidebarOpen}
        navigationModalOpen={navigationModalOpen}
        running={release.status === "running"}
        rehearsed={release.status === "rehearsed"}
        evidenceGeneratedAt={displayedEvidence.generatedAt}
        onToggleSidebar={toggleSidebar}
        onHelp={() => showToast("Tip: Press ⌘K or Ctrl+K to search components.")}
        onPublish={() => setOverlay("release")}
      />

      <div className="app-layout">
        <Sidebar
          open={sidebarOpen}
          blocked={blockingModal}
          overlayNavigation={overlayNavigation}
          selectedComponent={selectedComponent}
          onRequestOpen={openSidebar}
          onClose={closeSidebar}
          onCopyPackage={copyPackageName}
          onSelectComponent={selectComponent}
        />

        <main
          id="main-workspace"
          className="main"
          tabIndex={-1}
          aria-hidden={(navigationModalOpen || blockingModal) ? "true" : undefined}
          inert={(navigationModalOpen || blockingModal) ? true : undefined}
        >
          <header className="component-header">
            <div className="component-header__title">
              <Cube size={28} aria-hidden="true" />
              <h1>{selectedComponent}</h1>
              <code>@aster-ui/react</code>
              <span>v{tokenVersion}</span>
            </div>
            <p>
              <FigmaLogo weight="fill" aria-hidden="true" />
              Figma variables <i /> {components.length} web components
            </p>
          </header>

          {!storage ? (
            <p className="storage-notice" role="status">
              Browser storage is unavailable. You can explore components, but review and rehearsal records cannot be saved.
            </p>
          ) : null}

          <SyncStrip
            reviewReceipt={reviewReceipt}
            changeCount={figmaReview.validation.changeCount}
            syncedAt={figmaReview.syncedAt}
            sourceTheme={figmaReview.sourceTheme}
            onReview={() => setOverlay("review")}
          />

          <Workspace
            review={figmaReview}
            tab={workspaceTab}
            componentName={selectedComponent}
            platform={platform}
            theme={theme}
            previewState={previewState}
            saved={saved}
            qualityEvidence={displayedEvidence}
            onTabChange={handleWorkspaceTab}
            onPlatformChange={(platform) => navigate({ platform })}
            onThemeChange={(theme) => navigate({ theme })}
            onStateChange={setPreviewState}
            onSavedChange={setSaved}
            onCardSelect={() => showToast("TreatmentCard emitted its selection event.")}
            onCopyUsage={(usage) => void handleCopy(usage, "Usage example")}
          />
        </main>

        <Inspector
          tab={inspectorTab}
          componentName={selectedComponent}
          blocked={navigationModalOpen || blockingModal}
          review={figmaReview}
          qualityEvidence={displayedEvidence}
          onTabChange={setInspectorTab}
          onOpenDiff={() => setOverlay("review")}
          onViewVisualTests={() => setOverlay("evidence")}
        />
      </div>

      <DiffDrawer
        open={diffOpen}
        reviewed={reviewed}
        review={figmaReview}
        onClose={() => setOverlay(null)}
        onComplete={completeReview}
      />

      {releaseOpen ? (
        <ReleaseDialog
          open
          reviewReceipt={reviewReceipt}
          qualityReady={qualityReady}
          status={release.status}
          errorMessage={release.errorMessage}
          onClose={() => setOverlay(null)}
          onCancel={release.cancel}
          onReview={() => {
            setOverlay("review");
          }}
          onInspectQuality={() => {
            setOverlay(null);
            handleWorkspaceTab("quality");
          }}
          onPublish={handlePublish}
        />
      ) : null}

      {overlay === "evidence" ? (
        <QualityDetailsDialog evidence={displayedEvidence} onClose={() => setOverlay(null)} />
      ) : null}

      <Toast
        blocked={overlay !== null}
        message={toast}
        tone={toastTone}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
