/**
 * Convert bare URLs in text to markdown links.
 * Skips URLs already inside markdown link syntax [text](url).
 */
export function linkifyText(text: string): string {
  if (!text) return text;
  // Match URLs not already inside markdown link parentheses
  return text.replace(
    /(?<!\]\()(?<!\()(https?:\/\/[^\s<>)\]]+)/g,
    '[$1]($1)'
  );
}
