const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

export function extractDriveFileId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (DRIVE_ID_PATTERN.test(value)) return value;

  try {
    const url = new URL(value);
    const idParam = url.searchParams.get('id');
    if (idParam && DRIVE_ID_PATTERN.test(idParam)) return idParam;

    const match = url.pathname.match(/\/d\/([A-Za-z0-9_-]{20,})/);
    if (match?.[1]) return match[1];
  } catch {
    const match = value.match(/\/d\/([A-Za-z0-9_-]{20,})/);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function buildDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function normalizeDriveVideoInput(input: string): { fileId: string; previewUrl: string } | null {
  const fileId = extractDriveFileId(input);
  if (!fileId) return null;

  return {
    fileId,
    previewUrl: buildDrivePreviewUrl(fileId),
  };
}

export function isDriveFolderUrl(input: string): boolean {
  const value = input.trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    return /\/(folders|drive\/folders)\//.test(url.pathname);
  } catch {
    return /\/(folders|drive\/folders)\//.test(value);
  }
}
