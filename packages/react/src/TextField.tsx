import { forwardRef, useId, type InputHTMLAttributes } from "react";

export type TextFieldSize = "sm" | "md";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly hideLabel?: boolean;
  readonly fieldSize?: TextFieldSize;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    hint,
    error,
    hideLabel = false,
    fieldSize = "md",
    className = "",
    id: providedId,
    "aria-describedby": consumerDescription,
    "aria-invalid": consumerInvalid,
    disabled,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = providedId ?? `aster-field-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [consumerDescription, errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div
      className={[
        "aster-text-field",
        `aster-text-field--${fieldSize}`,
        error ? "aster-text-field--invalid" : "",
        disabled ? "aster-text-field--disabled" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <label className={hideLabel ? "aster-visually-hidden" : ""} htmlFor={inputId}>
        {label}
      </label>
      <input
        {...props}
        ref={ref}
        id={inputId}
        disabled={disabled}
        aria-invalid={error ? true : consumerInvalid}
        aria-describedby={describedBy}
      />
      {error ? <p id={errorId} className="aster-text-field__error">{error}</p> : null}
      {hint ? <p id={hintId} className="aster-text-field__hint">{hint}</p> : null}
    </div>
  );
});
