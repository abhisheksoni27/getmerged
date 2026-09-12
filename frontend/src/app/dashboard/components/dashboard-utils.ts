export function fmtHours(h: number | null | undefined): string {
  if (h === null || h === undefined) return " - ";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

// Clipboard write with graceful fallback (AC2): async Clipboard API first,
// hidden-textarea execCommand fallback, throws only when both fail so the
// caller can surface a visible error toast instead of an unhandled rejection.
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fall through to execCommand fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("execCommand copy failed");
  } catch {
    throw new Error("Could not access the clipboard");
  }
}
