"use client";

import { useId, useState } from "react";

const OVERLAY_COLOURS = ["#244B50", "#000000", "#FFFFFF", "#2F3E46", "#8B5E3C", "#3978A0"];

/** Local controls deliberately do not depend on permission to save a workflow revision. */
export function HeroAppearanceControls({ values, disabled, notice, onChange }: {
  values: Record<string, string>;
  disabled: boolean;
  notice?: string;
  onChange: (key: string, value: string) => void;
}) {
  const id = useId();
  const [hexDraft, setHex] = useState<string>();
  const hex = hexDraft ?? values.overlayColor;
  const validHex = /^#[0-9a-f]{6}$/i.test(hex);
  return (
    <fieldset disabled={disabled} className="hp-appearance space-y-3 rounded-xl border p-3" aria-describedby={`${id}-help`}>
      <legend className="px-1 font-semibold">Image and text appearance</legend>
      {notice && <p className="hp-explainer" role="note">{notice}</p>}
      <label className="block text-sm">
        Text colour
        <select className="mt-1 w-full rounded border p-2" value={values.textMode} onChange={(event) => onChange("textMode", event.target.value)}>
          <option value="dark">Dark</option><option value="light">Light</option><option value="custom">Custom</option>
        </select>
      </label>
      {values.textMode === "custom" && <label className="block text-sm">Custom text colour<input type="color" value={values.textColor} onChange={(event) => onChange("textColor", event.target.value)} /></label>}
      <label className="block text-sm">Overlay colour<input type="color" value={values.overlayColor} onChange={(event) => onChange("overlayColor", event.target.value)} /></label>
      <div className="hp-overlay-swatches" role="group" aria-label="Overlay colour presets">
        {OVERLAY_COLOURS.map((colour) => <button key={colour} type="button" aria-label={`Overlay ${colour}`} aria-pressed={values.overlayColor.toUpperCase() === colour} style={{ backgroundColor: colour }} onClick={() => onChange("overlayColor", colour)} />)}
      </div>
      <label className="block text-sm" htmlFor={`${id}-hex`}>Overlay hex colour</label>
      <input id={`${id}-hex`} type="text" value={hex} maxLength={7} spellCheck={false} onBlur={() => setHex(undefined)} aria-invalid={!validHex} aria-describedby={!validHex ? `${id}-hex-error` : undefined} onChange={(event) => {
        const next = event.target.value;
        setHex(next);
        if (/^#[0-9a-f]{6}$/i.test(next)) onChange("overlayColor", next);
      }} />
      {!validHex && <p id={`${id}-hex-error`} role="alert">Enter a six-digit colour, for example #244B50.</p>}
      {([
        ["overlayOpacity", "Overlay opacity", 0, 100],
        ["brightness", "Image brightness", 50, 150],
        ["contrast", "Image contrast", 50, 150],
      ] as const).map(([key, label, min, max]) => <div key={key}>
        <label htmlFor={`${id}-${key}`} className="block text-sm">{label}: <output htmlFor={`${id}-${key}`}>{values[key]}%</output>
        <input id={`${id}-${key}`} aria-label={label} className="block w-full" type="range" min={min} max={max} step={1} value={values[key]} onChange={(event) => onChange(key, event.target.value)} />
        </label>
      </div>)}
      <p id={`${id}-help`} className="text-xs text-zinc-600">Brightness and contrast affect only the photograph. Overlay colour and opacity affect a separate layer. Text and buttons remain fully opaque. Defaults: 15% overlay, 100% brightness and contrast.</p>
    </fieldset>
  );
}
