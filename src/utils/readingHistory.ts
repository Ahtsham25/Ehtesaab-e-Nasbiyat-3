import { VolumeData } from '../types/book';

export const RECENT_READS_EVENT = 'ehtisab_recent_reads_change';
const RECENT_READS_STORAGE_KEY = 'ehtisab_recent_reads_v1';

export interface RecentReadItem {
  volumeId: number;
  volumeNumber: number;
  volumeTitleUrdu: string;
  page: number;
  lastReadPage?: number;
  pageCount: number;
  coverImageUrl?: string;
  lastReadAt: string;
  updatedAt?: string;
}

export function getRecentReads(): RecentReadItem[] {
  try {
    const raw = localStorage.getItem(RECENT_READS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentRead(
  volumeOrItem: VolumeData | RecentReadItem,
  pageNumber?: number
): void {
  try {
    const now = new Date().toISOString();
    let item: RecentReadItem;

    if ('topic' in volumeOrItem) {
      const vol = volumeOrItem as VolumeData;
      const targetPage = pageNumber || vol.lastReadPage || 1;
      item = {
        volumeId: vol.id,
        volumeNumber: vol.volumeNumber,
        volumeTitleUrdu: vol.volumeTitleUrdu,
        page: targetPage,
        lastReadPage: targetPage,
        pageCount: vol.pageCount,
        coverImageUrl: vol.coverImageUrl,
        lastReadAt: now,
        updatedAt: now,
      };
    } else {
      const rec = volumeOrItem as RecentReadItem;
      const targetPage = pageNumber || rec.page || rec.lastReadPage || 1;
      item = {
        ...rec,
        page: targetPage,
        lastReadPage: targetPage,
        lastReadAt: now,
        updatedAt: now,
      };
    }

    const current = getRecentReads().filter((r) => r.volumeId !== item.volumeId);
    const updated = [item, ...current].slice(0, 10);
    localStorage.setItem(RECENT_READS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(RECENT_READS_EVENT, { detail: updated }));
  } catch {}
}
