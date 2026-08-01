export interface Accent {
  id: string;
  label: string;
  accent: string;
  accent2: string;
  contrast: string;
}

export const ACCENTS: Accent[] = [
  { id: "matrix", label: "Matrix", accent: "#f97316", accent2: "#fb923c", contrast: "#160a03" },
  { id: "ember", label: "Ember", accent: "#ffb454", accent2: "#ffca7a", contrast: "#160a03" },
  { id: "azure", label: "Azure", accent: "#4f8cff", accent2: "#6aa5ff", contrast: "#04060c" },
  { id: "aurora", label: "Aurora", accent: "#2ee6c4", accent2: "#4ff5da", contrast: "#04120f" },
  { id: "orchid", label: "Orchid", accent: "#c661ff", accent2: "#d688ff", contrast: "#120416" },
  { id: "lime", label: "Lime", accent: "#7ee262", accent2: "#9bef82", contrast: "#071307" },
];

const KEY = "decimen.accent.v1";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function pickContrast(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#160a03" : "#ffffff";
}

export function applyAccent(accent: string, accent2?: string, contrast?: string): void {
  const [r, g, b] = hexToRgb(accent);
  const a2 = accent2 ?? accent;
  const root = document.documentElement.style;
  root.setProperty("--accent", accent);
  root.setProperty("--accent-2", a2);
  root.setProperty("--accent-contrast", contrast ?? pickContrast(accent));
  root.setProperty("--accent-glow", `rgba(${r}, ${g}, ${b}, 0.42)`);
  root.setProperty("--accent-soft", `rgba(${r}, ${g}, ${b}, 0.14)`);
}

export function saveAccent(value: string): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
}

export function loadAccent(): string {
  try {
    return localStorage.getItem(KEY) ?? "matrix";
  } catch {
    return "matrix";
  }
}

export function initAccent(): void {
  const saved = loadAccent();
  if (saved.startsWith("#")) {
    applyAccent(saved);
    return;
  }
  const found = ACCENTS.find((a) => a.id === saved) ?? ACCENTS[0]!;
  applyAccent(found.accent, found.accent2, found.contrast);
}
