const CANVA_HOST_PATTERN = /(?:^|\.)canva\.com$/i;
const CANVA_DESIGN_PATH = /^\/design\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_-]+))?(?:\/(view|watch|edit))?\/?$/;

export function normalizeCanvaVideoInput(input: string): { embedUrl: string } | null {
  const value = input.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (!CANVA_HOST_PATTERN.test(url.hostname)) return null;

  const match = url.pathname.match(CANVA_DESIGN_PATH);
  if (!match) return null;

  const [, designId, slugPart] = match;
  const embedPath = slugPart
    ? `/design/${designId}/${slugPart}/watch`
    : `/design/${designId}/watch`;

  return {
    embedUrl: `https://www.canva.com${embedPath}?embed`,
  };
}
