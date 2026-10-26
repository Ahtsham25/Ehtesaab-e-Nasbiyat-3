export function extractArchiveId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/archive\.org\/(?:details|download)\/([^\/\?#]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export function generateArchiveThumbnail(archiveId: string): string {
  const cleanId = extractArchiveId(archiveId);
  if (!cleanId) return '';
  return `https://archive.org/services/img/${cleanId}`;
}

export function generateArchiveDownload(archiveId: string): string {
  const cleanId = extractArchiveId(archiveId);
  if (!cleanId) return '';
  return `https://archive.org/download/${cleanId}/${cleanId}.pdf`;
}
