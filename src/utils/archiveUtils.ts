export function extractArchiveId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/archive\.org\/(?:details|download|items)\/([^\/\?#]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export const VERIFIED_ARCHIVE_VOLUMES: Record<number, {
  archiveId: string;
  pdfUrl: string;
  pageCount: number;
  pdfFilename: string;
}> = {
  1: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-1',
    pdfUrl: 'https://ia800903.us.archive.org/2/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-1/ehtesabe-nasbiat-by-allah-wasaya-deobandi-1.pdf',
    pageCount: 476,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-1.pdf',
  },
  2: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-2',
    pdfUrl: 'https://ia801804.us.archive.org/4/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-2/ehtesabe-nasbiat-by-allah-wasaya-deobandi-2.pdf',
    pageCount: 531,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-2.pdf',
  },
  3: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-3',
    pdfUrl: 'https://ia801608.us.archive.org/35/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-3/ehtesabe-nasbiat-by-allah-wasaya-deobandi-3.pdf',
    pageCount: 508,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-3.pdf',
  },
  4: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-4',
    pdfUrl: 'https://ia601600.us.archive.org/25/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-4/ehtesabe-nasbiat-by-allah-wasaya-deobandi-4.pdf',
    pageCount: 500,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-4.pdf',
  },
  5: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-5',
    pdfUrl: 'https://ia800806.us.archive.org/9/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-5/ehtesabe-nasbiat-by-allah-wasaya-deobandi-5.pdf',
    pageCount: 524,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-5.pdf',
  },
  6: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-6',
    pdfUrl: 'https://ia803106.us.archive.org/26/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-6/ehtesabe-nasbiat-by-allah-wasaya-deobandi-6.pdf',
    pageCount: 500,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-6.pdf',
  },
  7: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-7',
    pdfUrl: 'https://ia803108.us.archive.org/23/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-7/ehtesabe-nasbiat-by-allah-wasaya-deobandi-7.pdf',
    pageCount: 516,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-7.pdf',
  },
  8: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-8',
    pdfUrl: 'https://ia600901.us.archive.org/34/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-8/ehtesabe-nasbiat-by-allah-wasaya-deobandi-8.pdf',
    pageCount: 508,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-8.pdf',
  },
  9: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-9',
    pdfUrl: 'https://ia801607.us.archive.org/11/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-9/ehtesabe-nasbiat-by-allah-wasaya-deobandi-9.pdf',
    pageCount: 492,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-9.pdf',
  },
  10: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-10',
    pdfUrl: 'https://ia903107.us.archive.org/0/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-10/ehtesabe-nasbiat-by-allah-wasaya-deobandi-10.pdf',
    pageCount: 468,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-10.pdf',
  },
  11: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-11',
    pdfUrl: 'https://ia600103.us.archive.org/30/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-11/ehtesabe-nasbiat-by-allah-wasaya-deobandi-11.pdf',
    pageCount: 500,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-11.pdf',
  },
  12: {
    archiveId: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-12',
    pdfUrl: 'https://ia803105.us.archive.org/11/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-12/ehtesabe-nasbiat-by-allah-wasaya-deobandi-12.pdf',
    pageCount: 468,
    pdfFilename: 'ehtesabe-nasbiat-by-allah-wasaya-deobandi-12.pdf',
  },
};

export function resolveVolumeArchiveId(volumeNumber: number, existingId?: string): string {
  if (existingId && existingId.trim() && !existingId.includes('placeholder')) {
    return extractArchiveId(existingId);
  }
  return VERIFIED_ARCHIVE_VOLUMES[volumeNumber]?.archiveId || `ehtesabe-nasbiat-by-allah-wasaya-deobandi-${volumeNumber}`;
}

export function resolveVolumePdfUrl(volumeNumber: number, existingUrl?: string): string {
  if (VERIFIED_ARCHIVE_VOLUMES[volumeNumber]?.pdfUrl) {
    return VERIFIED_ARCHIVE_VOLUMES[volumeNumber].pdfUrl;
  }
  if (existingUrl && existingUrl.trim() && existingUrl.includes('archive.org')) {
    return existingUrl.trim();
  }
  return `https://ia800903.us.archive.org/2/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-${volumeNumber}/ehtesabe-nasbiat-by-allah-wasaya-deobandi-${volumeNumber}.pdf`;
}

export function getArchivePageImageUrl(archiveId: string, pageNumber: number): string {
  return `https://archive.org/download/${archiveId}/page/n${pageNumber}_w1200.jpg`;
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
