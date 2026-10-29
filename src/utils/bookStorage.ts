import { VolumeData } from '../types/book';
import { fetchPdfArrayBuffer } from './pdfLoader';

const DB_NAME = 'ehtisab_books_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'downloaded_volumes';

export interface StoredBookRecord {
  volumeId: number;
  volumeNumber: number;
  title: string;
  data: ArrayBuffer;
  byteLength: number;
  downloadedAt: number;
  pageCount?: number;
}

// Open or create IndexedDB connection
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'volumeId' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Check if a volume PDF is downloaded locally inside the app
 */
export async function isBookDownloaded(volumeId: number): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count(volumeId);

      req.onsuccess = () => {
        resolve(req.result > 0);
      };

      req.onerror = () => {
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

/**
 * Get all downloaded volume IDs
 */
export async function getAllDownloadedBookIds(): Promise<number[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        resolve((req.result as number[]) || []);
      };

      req.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

/**
 * Retrieve downloaded volume PDF data from IndexedDB
 */
export async function getDownloadedBook(volumeId: number): Promise<StoredBookRecord | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(volumeId);

      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result as StoredBookRecord);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch (err) {
    console.warn('Error fetching book from IndexedDB:', err);
    return null;
  }
}

/**
 * Save downloaded PDF ArrayBuffer into IndexedDB
 */
export async function saveDownloadedBook(
  volumeId: number,
  volumeNumber: number,
  title: string,
  data: ArrayBuffer,
  pageCount?: number
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: StoredBookRecord = {
      volumeId,
      volumeNumber,
      title,
      data,
      byteLength: data.byteLength,
      downloadedAt: Date.now(),
      pageCount,
    };

    const req = store.put(record);

    req.onsuccess = () => {
      resolve();
    };

    req.onerror = () => {
      reject(req.error || new Error('Failed to save PDF to IndexedDB'));
    };
  });
}

/**
 * Delete downloaded volume PDF from IndexedDB
 */
export async function deleteDownloadedBook(volumeId: number): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(volumeId);

      req.onsuccess = () => {
        resolve();
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch (err) {
    console.warn('Error deleting book from IndexedDB:', err);
  }
}

/**
 * In-app download function:
 * Streams PDF chunks directly inside the app, tracks 0-100% progress,
 * and saves into IndexedDB so it never redirects to external Chrome browser!
 */
export async function downloadVolumeInApp(
  volume: VolumeData,
  onProgress?: (pct: number) => void
): Promise<ArrayBuffer> {
  // First check if already in IndexedDB
  const cached = await getDownloadedBook(volume.id);
  if (cached && cached.data) {
    if (onProgress) onProgress(100);
    return cached.data;
  }

  // Fetch binary ArrayBuffer using our resilient proxy with live progress
  const arrayBuffer = await fetchPdfArrayBuffer(volume.pdfUrl, onProgress);

  // Save to IndexedDB
  await saveDownloadedBook(
    volume.id,
    volume.volumeNumber,
    volume.volumeTitleUrdu,
    arrayBuffer,
    volume.pageCount
  );

  return arrayBuffer;
}

/**
 * Optional export to local device file (without opening external tabs)
 */
export async function exportBookAsPdfFile(volumeId: number, filename?: string): Promise<boolean> {
  const record = await getDownloadedBook(volumeId);
  if (!record || !record.data) return false;

  try {
    const blob = new Blob([record.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `Ehtasab_Nasbiyat_Volume_${record.volumeNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 1000);
    return true;
  } catch {
    return false;
  }
}
