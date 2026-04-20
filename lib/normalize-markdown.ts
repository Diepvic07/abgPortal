/**
 * Fix common markdown typos so they still render correctly.
 *
 * CommonMark requires the opening delimiter of bold/italic to not be followed
 * by whitespace and the closing delimiter to not be preceded by whitespace.
 * Admins frequently write `**text **` or `** text**` from copy/paste. This
 * collapses the stray inner whitespace so the markup still renders as bold.
 */
export function normalizeMarkdown(text: string): string {
  if (!text) return text;
  let out = text;

  // Unescape escaped asterisks (e.g. \*\*text\*\* → **text**)
  out = out.replace(/\\\*/g, '*');

  // Bold: **…**  (non-greedy, single line)
  out = out.replace(/\*\*([ \t]*)([^*\n]+?)([ \t]*)\*\*/g, (_m, _l, inner: string) => {
    const trimmed = inner.trim();
    return trimmed ? `**${trimmed}**` : _m;
  });

  // Bold: __…__
  out = out.replace(/__([ \t]*)([^_\n]+?)([ \t]*)__/g, (_m, _l, inner: string) => {
    const trimmed = inner.trim();
    return trimmed ? `__${trimmed}__` : _m;
  });

  return out;
}
