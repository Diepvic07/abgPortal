/**
 * Remove Vietnamese diacritics/tones from a string.
 * Uses Unicode NFD decomposition to strip combining marks,
 * plus explicit handling for đ/Đ which don't decompose.
 *
 * Examples: "Hiếu" → "Hieu", "Nguyễn" → "Nguyen", "Đức" → "Duc"
 */
export function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Check if a text contains a search term, ignoring Vietnamese diacritics.
 * Both the text and search term are normalized before comparison.
 */
export function vietnameseIncludes(text: string, search: string): boolean {
  return removeVietnameseDiacritics(text)
    .toLowerCase()
    .includes(removeVietnameseDiacritics(search).toLowerCase());
}
