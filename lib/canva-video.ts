const CANVA_HOST_PATTERN = /(?:^|\.)canva\.com$/i;
const CANVA_SHORT_HOST = 'canva.link';
const CANVA_DESIGN_PATH = /^\/design\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_-]+))?(?:\/(view|watch|edit))?\/?$/;

async function resolveCanvaShortLink(url: URL): Promise<URL | null> {
  try {
    const response = await fetch(url.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    const location = response.headers.get('location');
    if (!location) return null;
    return new URL(location);
  } catch {
    return null;
  }
}

export async function normalizeCanvaVideoInput(input: string): Promise<{ embedUrl: string } | null> {
  const value = input.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.hostname.toLowerCase() === CANVA_SHORT_HOST) {
    const resolved = await resolveCanvaShortLink(url);
    if (!resolved) return null;
    url = resolved;
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
