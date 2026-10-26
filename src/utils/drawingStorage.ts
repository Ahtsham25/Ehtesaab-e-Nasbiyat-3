import { DrawingAnnotation } from '../types/book';

const DRAWINGS_STORAGE_KEY = 'ehtisab_drawings_annotations_v1';

export function getAllDrawings(): DrawingAnnotation[] {
  try {
    const raw = localStorage.getItem(DRAWINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getDrawingForPage(volumeId: number, page: number): string | null {
  const all = getAllDrawings();
  const found = all.find((d) => d.volumeId === volumeId && d.page === page);
  return found ? found.dataUrl : null;
}

export function saveDrawingForPage(
  volumeId: number,
  volumeNumber: number,
  volumeTitleUrdu: string,
  page: number,
  dataUrl: string
): DrawingAnnotation {
  const all = getAllDrawings().filter((d) => d.volumeId !== volumeId || d.page !== page);
  const newAnnotation: DrawingAnnotation = {
    id: `drawing_${volumeId}_p${page}_${Date.now()}`,
    volumeId,
    volumeNumber,
    volumeTitleUrdu,
    page,
    dataUrl,
    updatedAt: new Date().toISOString(),
  };
  all.push(newAnnotation);
  try {
    localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save drawing to localStorage', err);
  }
  return newAnnotation;
}

export function deleteDrawingForPage(volumeId: number, page: number): void {
  const filtered = getAllDrawings().filter((d) => d.volumeId !== volumeId || d.page !== page);
  try {
    localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export function deleteDrawingById(id: string): void {
  const filtered = getAllDrawings().filter((d) => d.id !== id);
  try {
    localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export function clearAllDrawings(): void {
  try {
    localStorage.removeItem(DRAWINGS_STORAGE_KEY);
  } catch {}
}
