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
              aria-label={saved ? `${title} 저장 취소` : `${title} 저장`}
              aria-pressed={saved}
              disabled={disabled}
              onClick={(event) => onSavedChange(!saved, event)}
            >
              <BookmarkSimple size={compact ? 14 : 22} weight={saved ? "fill" : "regular"} />
            </button>
          ) : null}
        </div>

        <div className="aster-treatment-card__facts" aria-label="시술 정보">
          <div>
            <Clock aria-hidden="true" />
            <span>
              <small>Downtime</small>
              {downtime}
            </span>
          </div>
          <div>
            <Clock aria-hidden="true" />
            <span>
              <small>Sessions</small>
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
                <small>Results</small>
                {results}
              </span>
            ) : null}
          </div>
        </div>

        <div className="aster-treatment-card__footer">
          <p>
            <span>From</span>
            <strong>{formatCurrency(price, locale, currency)}</strong>
          </p>
          {onSelect ? (
            <button
              type="button"
              className="aster-treatment-card__action"
              aria-label={`${title} 상세 보기`}
              disabled={disabled}
              onClick={onSelect}
            >
              <ArrowRight weight="bold" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
});
