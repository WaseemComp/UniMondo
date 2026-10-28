export const HERO_PRESENTATION_DEFAULTS = {
  textMode: "dark",
  textColor: "#2F3E46",
  overlayColor: "#244B50",
  overlayOpacity: "15",
  brightness: "100",
  contrast: "100",
};
export const HERO_PRESENTATION_KEYS = Object.keys(
  HERO_PRESENTATION_DEFAULTS,
) as (keyof typeof HERO_PRESENTATION_DEFAULTS)[];
export type HeroPresentation = Partial<
  Record<keyof typeof HERO_PRESENTATION_DEFAULTS, string>
>;
export function presentationError(key: string, value: string): string | null {
  if (key === "textMode")
    return ["light", "dark", "custom"].includes(value)
      ? null
      : "Choose light, dark or custom text.";
  if (["textColor", "overlayColor"].includes(key))
    return /^#[0-9a-f]{6}$/i.test(value) ? null : "Use a six-digit colour.";
  const n = Number(value),
    min = key === "overlayOpacity" ? 0 : 50,
    max = key === "overlayOpacity" ? 100 : 150;
  return value.trim() && Number.isFinite(n) && n >= min && n <= max
    ? null
    : `Choose ${min}–${max}%.`;
}
export function heroTextStyle(presentation: HeroPresentation) {
  const color =
    presentation.textMode === "light"
      ? "#FFFFFF"
      : presentation.textMode === "custom"
        ? presentation.textColor || "#2F3E46"
        : "#2F3E46";
  const channels = color
    .slice(1)
    .match(/../g)!
    .map((c) => parseInt(c, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const backgroundColor =
    (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
      ? "#000000"
      : "#FFFFFF";
  return {
    color,
    backgroundColor,
    boxDecorationBreak: "clone" as const,
    WebkitBoxDecorationBreak: "clone" as const,
    padding: "0.05em 0.18em",
    borderRadius: "0.12em",
  };
}
