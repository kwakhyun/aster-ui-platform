import {
  ArrowRight,
  BookmarkSimple,
  Clock,
  Sparkle,
} from "@phosphor-icons/react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ImgHTMLAttributes,
  type MouseEventHandler,
} from "react";

export type TreatmentCardVariant = "default" | "compact";
export type TreatmentCardCurrency = "KRW" | "USD" | "JPY";
export type TreatmentCardHeadingLevel = "h2" | "h3" | "h4";

interface TreatmentCardLabels {
  readonly downtime: string;
  readonly sessions: string;
  readonly results: string;
  readonly priceFrom: string;
  readonly treatmentInfo: string;
  readonly save: (title: string) => string;
  readonly unsave: (title: string) => string;
  readonly details: (title: string) => string;
}

export interface TreatmentCardProps
  extends Omit<ComponentPropsWithoutRef<"article">, "children" | "onSelect" | "results" | "title"> {
  readonly title: string;
  readonly category: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly imageProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src">;
  readonly price: number;
  readonly currency?: TreatmentCardCurrency;
  readonly locale?: string;
  readonly downtime: string;
  readonly sessions: string;
  readonly results?: string;
  readonly headingLevel?: TreatmentCardHeadingLevel;
  readonly variant?: TreatmentCardVariant;
  readonly disabled?: boolean;
  readonly saved?: boolean;
  readonly onSavedChange?: (
    saved: boolean,
    event: Parameters<MouseEventHandler<HTMLButtonElement>>[0],
  ) => void;
  readonly onSelect?: MouseEventHandler<HTMLButtonElement>;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

const koreanLabels: TreatmentCardLabels = {
  downtime: "회복 기간",
  sessions: "권장 횟수",
  results: "기대 효과",
  priceFrom: "최저",
  treatmentInfo: "시술 정보",
  save: (title) => `${title} 저장`,
  unsave: (title) => `${title} 저장 취소`,
  details: (title) => `${title} 상세 보기`,
};

const englishLabels: TreatmentCardLabels = {
  downtime: "Downtime",
  sessions: "Sessions",
  results: "Results",
  priceFrom: "From",
  treatmentInfo: "Treatment details",
  save: (title) => `Save ${title}`,
  unsave: (title) => `Remove ${title} from saved treatments`,
  details: (title) => `View details for ${title}`,
};

function getDefaultLabels(locale: string): TreatmentCardLabels {
  return locale.toLocaleLowerCase().startsWith("ko") ? koreanLabels : englishLabels;
}

function formatCurrency(value: number, locale: string, currency: TreatmentCardCurrency): string {
  const cacheKey = `${locale}:${currency}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    formatterCache.set(cacheKey, formatter);
  }
  return formatter.format(value);
}

export const TreatmentCard = forwardRef<HTMLElement, TreatmentCardProps>(function TreatmentCard(
  {
    title,
    category,
    imageUrl,
    imageAlt,
    imageProps,
    price,
    currency = "KRW",
    locale = "ko-KR",
    downtime,
    sessions,
    results,
    headingLevel = "h3",
    variant = "default",
    disabled = false,
    saved = false,
    onSavedChange,
    onSelect,
    className,
    ...articleProps
  },
  ref,
) {
  const compact = variant === "compact";
  const Heading = headingLevel;
  const resolvedLabels = getDefaultLabels(locale);
  const cardClassName = [
    "aster-treatment-card",
    compact ? "aster-treatment-card--compact" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <article
      {...articleProps}
      ref={ref}
      aria-disabled={disabled || undefined}
      className={cardClassName}
    >
      <div className="aster-treatment-card__layout">
        <div className="aster-treatment-card__media">
          <img
            {...imageProps}
            src={imageUrl}
            alt={imageAlt}
            loading={imageProps?.loading ?? "lazy"}
            decoding={imageProps?.decoding ?? "async"}
          />
        </div>

        <div className="aster-treatment-card__content">
          <div className="aster-treatment-card__heading">
            <div>
              <Heading>{title}</Heading>
              <p>{category}</p>
            </div>
            {onSavedChange ? (
              <button
                type="button"
                className="aster-treatment-card__save"
                aria-label={saved ? resolvedLabels.unsave(title) : resolvedLabels.save(title)}
                aria-pressed={saved}
                disabled={disabled}
                onClick={(event) => onSavedChange(!saved, event)}
              >
                <BookmarkSimple size={compact ? 14 : 22} weight={saved ? "fill" : "regular"} />
              </button>
            ) : null}
          </div>

          <div className="aster-treatment-card__facts" aria-label={resolvedLabels.treatmentInfo}>
            <div>
              <Clock aria-hidden="true" />
              <span>
                <small>{resolvedLabels.downtime}</small>
                {downtime}
              </span>
            </div>
            <div>
              <Clock aria-hidden="true" />
              <span>
                <small>{resolvedLabels.sessions}</small>
                {sessions}
              </span>
            </div>
            <div
              className={`aster-treatment-card__result${results ? "" : " aster-treatment-card__result--icon-only"}`}
              aria-hidden={results ? undefined : "true"}
            >
              <Sparkle aria-hidden="true" />
              {results ? (
                <span>
                  <small>{resolvedLabels.results}</small>
                  {results}
                </span>
              ) : null}
            </div>
          </div>

          <div className="aster-treatment-card__footer">
            <p>
              <span>{resolvedLabels.priceFrom}</span>
              <strong>{formatCurrency(price, locale, currency)}</strong>
            </p>
            {onSelect ? (
              <button
                type="button"
                className="aster-treatment-card__action"
                aria-label={resolvedLabels.details(title)}
                disabled={disabled}
                onClick={onSelect}
              >
                <ArrowRight weight="bold" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
});
