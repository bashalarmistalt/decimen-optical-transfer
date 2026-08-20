export interface SenderSettings {
  txFps: number;
  frameBytes: number;
  ecc: "L" | "M" | "Q" | "H";
  gridCodes: number;
  layout: string;
  displayPx?: number;
}

type UnknownRecord = Record<string, unknown>;

/** Captured diagnostics are local JSON, but still untyped input. Invalid or
 * partial sender announcements must never become benchmark provenance. */
export function parseSenderSettings(value: unknown): SenderSettings | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as UnknownRecord;
  const { txFps, frameBytes, ecc, gridCodes, layout, displayPx } = raw;
  if (typeof txFps !== "number" || !Number.isFinite(txFps) || txFps <= 0) return undefined;
  if (typeof frameBytes !== "number" || !Number.isInteger(frameBytes) || frameBytes <= 0)
    return undefined;
  if (ecc !== "L" && ecc !== "M" && ecc !== "Q" && ecc !== "H") return undefined;
  if (typeof gridCodes !== "number" || !Number.isInteger(gridCodes) || gridCodes <= 0)
    return undefined;
  if (typeof layout !== "string" || !/^\d+×\d+$/.test(layout)) return undefined;
  if (
    displayPx !== undefined &&
    (typeof displayPx !== "number" || !Number.isFinite(displayPx) || displayPx <= 0)
  )
    return undefined;
  return { txFps, frameBytes, ecc, gridCodes, layout, ...(displayPx ? { displayPx } : {}) };
}

export function formatSenderSettings(settings: SenderSettings): string {
  const codes = `${settings.gridCodes} ${settings.gridCodes === 1 ? "code" : "codes"}`;
  const display = settings.displayPx ? ` · ${settings.displayPx} px` : "";
  return (
    `${settings.txFps} fps · ${settings.frameBytes} B · ECC-${settings.ecc}` +
    ` · ${codes} (${settings.layout})${display}`
  );
}
