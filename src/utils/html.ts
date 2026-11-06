const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape a string for safe interpolation into HTML text content or quoted attribute values.
 * All UI templates build markup via template literals, so every data-driven value must pass through here.
 */
export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

/** Returns true while the user has an active (non-collapsed) text selection on the page. */
export function hasActiveTextSelection(): boolean {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim().length > 0);
}

/** Resolve a `public/` asset path against Vite's configured base URL (works under GitHub Pages sub-paths). */
export function assetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base.endsWith('/') ? base : `${base}/`}${relativePath.replace(/^\/+/, '')}`;
}
