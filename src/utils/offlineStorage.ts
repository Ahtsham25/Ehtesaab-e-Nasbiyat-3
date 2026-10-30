// Internal IndexedDB and LocalStorage offline manager for Ehtisab e Nasbiyat

export interface SavedSnapshot {
  id: string;
  volumeId: number;
  volumeNumber: number;
  volumeTitleUrdu: string;
  page: number;
  capturedAt: string;
  dataUrl: string;
}

export interface StoredBookRecord {
  volumeId: number;
  volumeNumber: number;
  titleUrdu: string;
  fileSize: string;
  downloadedAt: string;
  blob?: Blob;
}

const DB_NAME = 'ehtisab_app_internal_storage';
const DB_VERSION = 2;
const BOOKS_STORE = 'internal_books_folder';
const UPLOADED_PDFS_STORE = 'uploaded_custom_pdfs';
const SNAPSHOTS_KEY = 'ehtisab_saved_snapshots_v1';

// Initialize IndexedDB
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(BOOKS_STORE, { keyPath: 'volumeId' });
      }
      if (!db.objectStoreNames.contains(UPLOADED_PDFS_STORE)) {
        db.createObjectStore(UPLOADED_PDFS_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Save custom uploaded PDF blob to IndexedDB
export async function saveUploadedPdfBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(UPLOADED_PDFS_STORE, 'readwrite');
      const store = tx.objectStore(UPLOADED_PDFS_STORE);
      store.put({ id, blob, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save uploaded PDF:', err);
  }
}

// Get custom uploaded PDF blob
export async function getUploadedPdfBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(UPLOADED_PDFS_STORE, 'readonly');
      const store = tx.objectStore(UPLOADED_PDFS_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Delete custom uploaded PDF
export async function deleteUploadedPdfBlob(id: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(UPLOADED_PDFS_STORE, 'readwrite');
      const store = tx.objectStore(UPLOADED_PDFS_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

// Save a downloaded PDF blob to internal IndexedDB folder
export async function saveBookToInternalStorage(record: StoredBookRecord): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BOOKS_STORE, 'readwrite');
      const store = tx.objectStore(BOOKS_STORE);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save to IndexedDB:', err);
  }
}

// Get all internally saved books
export async function getInternalBooksList(): Promise<StoredBookRecord[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BOOKS_STORE, 'readonly');
      const store = tx.objectStore(BOOKS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// Get a book from internal storage
export async function getBookFromInternalStorage(volumeId: number): Promise<StoredBookRecord | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(BOOKS_STORE, 'readonly');
      const store = tx.objectStore(BOOKS_STORE);
      const req = store.get(volumeId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Delete a book from internal storage
export async function deleteBookFromInternalStorage(volumeId: number): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BOOKS_STORE, 'readwrite');
      const store = tx.objectStore(BOOKS_STORE);
      store.delete(volumeId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not delete from IndexedDB:', err);
  }
}

// Check if book exists in internal storage
export async function isBookInInternalStorage(volumeId: number): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(BOOKS_STORE, 'readonly');
      const store = tx.objectStore(BOOKS_STORE);
      const req = store.get(volumeId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// Snapshots (Camera Screenshots) Manager
export function getSavedSnapshots(): SavedSnapshot[] {
  try {
    const data = localStorage.getItem(SNAPSHOTS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveSnapshotToStorage(snapshot: SavedSnapshot): void {
  try {
    const list = getSavedSnapshots();
    const updated = [snapshot, ...list.filter((s) => s.id !== snapshot.id)].slice(0, 50);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save snapshot to localStorage:', err);
  }
}

export function deleteSnapshotFromStorage(id: string): SavedSnapshot[] {
  try {
    const list = getSavedSnapshots().filter((s) => s.id !== id);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

// Trigger direct browser download from a Blob or URL without leaving the page or redirecting
export function triggerDirectDownload(blobOrUrl: Blob | string, filename: string): void {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    if (typeof blobOrUrl !== 'string') {
      URL.revokeObjectURL(url);
    }
  }, 4000);
}
