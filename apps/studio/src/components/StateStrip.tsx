import { TreatmentCard } from "@aster-ui/react";
import { previewStates, responsiveTreatmentImage, treatment } from "../data/catalog";
import type { PreviewStateOption } from "../types";

interface StateStripProps {
  readonly selected: PreviewStateOption["id"];
  readonly onSelect: (state: PreviewStateOption["id"]) => void;
}

const noop = () => undefined;

export function StateStrip({ selected, onSelect }: StateStripProps) {
  return (
    <section className="state-strip" aria-labelledby="states-heading">
      <h2 id="states-heading">States</h2>
      <ul>
        {previewStates.map((option) => (
          <li key={option.id} className={selected === option.id ? "is-selected" : ""}>
            <div
              className="state-strip__card"
              data-preview-state={option.id}
              aria-hidden="true"
              inert
            >
              <TreatmentCard
                {...treatment}
                variant="compact"
                disabled={option.id === "disabled"}
                imageProps={{ ...responsiveTreatmentImage, loading: "lazy", sizes: "120px" }}
                onSavedChange={noop}
                onSelect={noop}
              />
            </div>
            <button
              type="button"
              className="state-strip__selector"
              aria-label={`Preview ${option.label.toLocaleLowerCase()} state`}
              aria-pressed={selected === option.id}
              onClick={() => onSelect(option.id)}
            />
            <span>{option.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
