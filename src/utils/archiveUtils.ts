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
  const trimmed = (existingId || '').trim();
  if (trimmed && !trimmed.includes('placeholder')) {
    return extractArchiveId(trimmed);
  }
  if (volumeNumber >= 1 && volumeNumber <= 12) {
    return VERIFIED_ARCHIVE_VOLUMES[volumeNumber]?.archiveId || `ehtesabe-nasbiat-by-allah-wasaya-deobandi-${volumeNumber}`;
  }
  return trimmed || '';
}

export function resolveVolumePdfUrl(volumeNumber: number, existingUrl?: string): string {
  const trimmed = (existingUrl || '').trim();

  // If this is a response book or custom book (volumeNumber <= 0 or > 12)
  if (volumeNumber <= 0 || volumeNumber > 12) {
    if (trimmed) return trimmed;
  }

  // If existingUrl is a local blob, data URL, uploaded reference, or local path, always preserve it!
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:') || trimmed.startsWith('uploaded:') || trimmed.startsWith('/')) {
    return trimmed;
  }

  // If verified volume 1..12 has a verified direct high-speed URL
  if (volumeNumber >= 1 && volumeNumber <= 12 && VERIFIED_ARCHIVE_VOLUMES[volumeNumber]?.pdfUrl) {
    return VERIFIED_ARCHIVE_VOLUMES[volumeNumber].pdfUrl;
  }

  // If any valid URL is provided
  if (trimmed) {
    return trimmed;
  }

  // Safe fallback for 1-12
  const volNum = volumeNumber >= 1 && volumeNumber <= 12 ? volumeNumber : 1;
  return `https://ia800903.us.archive.org/2/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-${volNum}/ehtesabe-nasbiat-by-allah-wasaya-deobandi-${volNum}.pdf`;
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

export interface ArchiveItemMetadataResult {
  archiveId: string;
  title: string;
  author: string;
  year: string;
  topic: string;
  description: string;
  pageCount: number;
  fileSize: string;
  coverImageUrl: string;
  pdfUrl: string;
}

export async function fetchArchiveMetadata(archiveIdOrUrl: string): Promise<ArchiveItemMetadataResult | null> {
  const archiveId = extractArchiveId(archiveIdOrUrl);
  if (!archiveId) return null;

  try {
    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(archiveId)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error('Archive metadata not found');
    const data = await res.json();
    const meta = data.metadata || {};
    const files = data.files || [];

    // Find real PDF file
    const pdfFiles = files.filter(
      (f: any) => f.name && f.name.toLowerCase().endsWith('.pdf') && !f.name.toLowerCase().endsWith('_text.pdf')
    );
    const mainPdf = pdfFiles[0] || files.find((f: any) => f.name && f.name.toLowerCase().endsWith('.pdf'));

    const server = data.server || 'ia800903.us.archive.org';
    const dir = data.dir || `/items/${archiveId}`;

    let pdfUrl = '';
    let fileSize = '15 MB';
    let pageCount = 100;

    if (mainPdf) {
      pdfUrl = `https://${server}${dir}/${encodeURIComponent(mainPdf.name)}`;
      if (mainPdf.size) {
        const mb = (parseInt(mainPdf.size, 10) / (1024 * 1024)).toFixed(1);
        fileSize = `${mb} MB`;
      }
      if (mainPdf.imagecount) {
        pageCount = parseInt(mainPdf.imagecount, 10);
      }
    } else {
      pdfUrl = `https://archive.org/download/${archiveId}/${archiveId}.pdf`;
    }

    if (meta.imagecount && pageCount === 100) {
      pageCount = parseInt(meta.imagecount, 10);
    }

    return {
      archiveId,
      title: meta.title || archiveId.replace(/[_-]+/g, ' '),
      author: meta.creator || 'علمائے اہل سنت و محققین',
      year: meta.year || meta.date ? `اشاعت ${meta.year || meta.date?.slice(0, 4)}ء` : 'اشاعت ۲۰۲۶ء',
      topic: meta.subject || 'رد اعتراضات و مدلل جوابات',
      description: meta.description ? meta.description.replace(/<[^>]*>/g, '') : '',
      pageCount: pageCount || 100,
      fileSize,
      coverImageUrl: `https://archive.org/services/img/${archiveId}`,
      pdfUrl,
    };
  } catch (e) {
    console.warn('Failed to fetch archive metadata:', e);
    return {
      archiveId,
      title: archiveId.replace(/[_-]+/g, ' '),
      author: 'علمائے اہل سنت و محققین',
      year: 'اشاعت ۲۰۲۶ء',
      topic: 'رد اعتراضات و علمی جوابات',
      description: '',
      pageCount: 100,
      fileSize: '15 MB',
      coverImageUrl: `https://archive.org/services/img/${archiveId}`,
      pdfUrl: `https://archive.org/download/${archiveId}/${archiveId}.pdf`,
    };
  }
}
