export function extractArchiveId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/archive\.org\/(?:details|download)\/([^\/\?#]+)/i);
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
    archiveId: '1_20261016_20261016_1311',
    pdfUrl: 'https://archive.org/download/1_20261016_20261016_1311/احتساب_ناصبیت_جلد_1.pdf',
    pageCount: 476,
    pdfFilename: 'احتساب_ناصبیت_جلد_1.pdf',
  },
  2: {
    archiveId: '2_20261019_20261019_1042',
    pdfUrl: 'https://archive.org/download/2_20261019_20261019_1042/احتساب_ناصبیت_جلد_2.pdf',
    pageCount: 512,
    pdfFilename: 'احتساب_ناصبیت_جلد_2.pdf',
  },
  3: {
    archiveId: '3_20261015_20261015_1332',
    pdfUrl: 'https://archive.org/download/3_20261015_20261015_1332/احتساب ناصبیت 3.pdf',
    pageCount: 480,
    pdfFilename: 'احتساب ناصبیت 3.pdf',
  },
  4: {
    archiveId: '4_20261019_20261019_1711',
    pdfUrl: 'https://archive.org/download/4_20261019_20261019_1711/احتساب ناصبیت جلد 4.pdf',
    pageCount: 520,
    pdfFilename: 'احتساب ناصبیت جلد 4.pdf',
  },
  5: {
    archiveId: '5_20261015',
    pdfUrl: 'https://archive.org/download/5_20261015/احتساب ناصبیت 5.pdf',
    pageCount: 490,
    pdfFilename: 'احتساب ناصبیت 5.pdf',
  },
  6: {
    archiveId: '6_20261019_20261019_1726',
    pdfUrl: 'https://archive.org/download/6_20261019_20261019_1726/احتساب ناصبیت جلد 6.pdf',
    pageCount: 530,
    pdfFilename: 'احتساب ناصبیت جلد 6.pdf',
  },
  7: {
    archiveId: '7_20261019_20261019_1737',
    pdfUrl: 'https://archive.org/download/7_20261019_20261019_1737/احتساب ناصبیت جلد 7.pdf',
    pageCount: 560,
    pdfFilename: 'احتساب ناصبیت جلد 7.pdf',
  },
  8: {
    archiveId: '8_20261015_20261015_1342',
    pdfUrl: 'https://archive.org/download/8_20261015_20261015_1342/احتساب ناصبیت 8.pdf',
    pageCount: 470,
    pdfFilename: 'احتساب ناصبیت 8.pdf',
  },
  9: {
    archiveId: '9_20261015_20261015_1343',
    pdfUrl: 'https://archive.org/download/9_20261015_20261015_1343/احتساب ناصبیت جلد 9.pdf',
    pageCount: 510,
    pdfFilename: 'احتساب ناصبیت جلد 9.pdf',
  },
  10: {
    archiveId: '10_20261016_20261016_1418',
    pdfUrl: 'https://archive.org/download/10_20261016_20261016_1418/احتساب ناصبیت 10.pdf',
    pageCount: 460,
    pdfFilename: 'احتساب ناصبیت 10.pdf',
  },
  11: {
    archiveId: '11_20261016',
    pdfUrl: 'https://archive.org/download/11_20261016/احتساب ناصبیت 11.pdf',
    pageCount: 480,
    pdfFilename: 'احتساب ناصبیت 11.pdf',
  },
  12: {
    archiveId: '12_20261015_20261015',
    pdfUrl: 'https://archive.org/download/12_20261015_20261015/احتساب ناصبیت جلد 12.pdf',
    pageCount: 540,
    pdfFilename: 'احتساب ناصبیت جلد 12.pdf',
  },
};

export function resolveVolumeArchiveId(volumeNumber: number, existingId?: string): string {
  if (existingId && !existingId.includes('ehtisab-e-nasbiyat-vol-') && !existingId.includes('placeholder')) {
    return extractArchiveId(existingId);
  }
  return VERIFIED_ARCHIVE_VOLUMES[volumeNumber]?.archiveId || '1_20261016_20261016_1311';
}

export function resolveVolumePdfUrl(volumeNumber: number, existingUrl?: string): string {
  if (existingUrl && !existingUrl.includes('ehtisab-e-nasbiyat-vol-') && existingUrl.endsWith('.pdf')) {
    return existingUrl;
  }
  return VERIFIED_ARCHIVE_VOLUMES[volumeNumber]?.pdfUrl || '';
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
