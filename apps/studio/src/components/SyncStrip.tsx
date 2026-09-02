import {
  ArrowsClockwise,
  FigmaLogo,
  Sparkle,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@aster-ui/react";
import type { ThemeName } from "@aster-ui/tokens";
import type { ReviewReceipt } from "../services/reviewService";

interface SyncStripProps {
  readonly reviewReceipt: ReviewReceipt | null;
  readonly changeCount: number;
  readonly syncedAt: string;
  readonly sourceTheme: ThemeName;
  readonly onReview: () => void;
}

export function SyncStrip({
  reviewReceipt,
  changeCount,
  syncedAt,
  sourceTheme,
  onReview,
}: SyncStripProps) {
  const reviewed = reviewReceipt !== null;
  const syncDate = new Date(syncedAt);
  const formattedSync = Number.isNaN(syncDate.getTime())
    ? "Sync time unavailable"
    : new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Seoul",
    }).format(syncDate);
  return (
    <div className="sync-strip" aria-label="Workspace Figma sync status">
      <span>
        <Sparkle size={17} weight="fill" aria-hidden="true" />
        {changeCount} semantic token changes ready for review
      </span>
      <i />
      <span className={reviewed ? "sync-strip__reviewed" : "sync-strip__warning"}>
        {reviewed ? (
          <ArrowsClockwise size={17} aria-hidden="true" />
        ) : (
          <Warning size={17} weight="fill" aria-hidden="true" />
        )}
        {reviewed
          ? `Review completed by ${reviewReceipt.reviewer.label}`
          : "Review required"}
      </span>
      <i />
      <span>
        <ArrowsClockwise size={17} aria-hidden="true" />
        <time dateTime={syncedAt}>
          {sourceTheme.charAt(0).toUpperCase()}{sourceTheme.slice(1)} test data · {formattedSync} KST
        </time>
      </span>
      <Button
        className="sync-strip__button"
        tone="secondary"
        size="sm"
        leadingIcon={<FigmaLogo size={16} />}
        onClick={onReview}
      >
        Review changes
      </Button>
    </div>
  );
}
