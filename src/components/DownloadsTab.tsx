import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  CheckCircle,
  HardDrive,
  Camera,
  Trash2,
  FolderDown,
  Sparkles,
  BookOpen,
  ArrowRight,
  Share2,
  X,
  FileCheck2,
  RefreshCw
} from 'lucide-react';
import { VolumeData, ResponseBook } from '../types/book';
import {
  getSavedSnapshots,
  deleteSnapshotFromStorage,
  SavedSnapshot,
  triggerDirectDownload,
  getInternalBooksList,
  deleteBookFromInternalStorage,
  StoredBookRecord
} from '../utils/offlineStorage';

interface DownloadsTabProps {
  volumes: VolumeData[];
  onDownload: (volume: VolumeData) => void;
  onRead: (volume: VolumeData) => void;
  onNavigateHome?: () => void;
  onDeleteInternalBook?: (volumeId: number) => void;
  responseBooks?: ResponseBook[];
}

export const DownloadsTab: React.FC<DownloadsTabProps> = ({
  volumes,
  onDownload,
  onRead,
  onNavigateHome,
  onDeleteInternalBook,
  responseBooks = [],
}) => {
  // Default to 'downloaded' as requested by the user
  const [filter, setFilter] = useState<'downloaded' | 'available' | 'snapshots'>('downloaded');
  const [snapshots, setSnapshots] = useState<SavedSnapshot[]>([]);
  const [internalBooks, setInternalBooks] = useState<StoredBookRecord[]>([]);
  const [previewSnapshot, setPreviewSnapshot] = useState<SavedSnapshot | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshInternalBooks = useCallback(async () => {
    try {
      const list = await getInternalBooksList();
      setInternalBooks(list);
    } catch {}
  }, []);

  useEffect(() => {
    setSnapshots(getSavedSnapshots());
    refreshInternalBooks();
  }, [refreshInternalBooks]);

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSnapshotFromStorage(id);
    setSnapshots(updated);
    if (previewSnapshot?.id === id) {
      setPreviewSnapshot(null);
    }
    showToast('اسکرین شاٹ حذف کر دیا گیا');
  };

  const handleDownloadSnapshotAgain = (snap: SavedSnapshot, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerDirectDownload(snap.dataUrl, `Ehtisab_Nasbiyat_Vol_${snap.volumeNumber}_Page_${snap.page}.jpg`);
    showToast('تصویر ڈیوائس پر محفوظ ہو گئی');
  };

  const isVolumeDownloaded = (vol: VolumeData) => {
    return vol.isDownloaded || internalBooks.some((b) => b.volumeId === vol.id);
  };

  const downloadedVolumes = volumes.filter(isVolumeDownloaded);
  const pendingVolumes = volumes.filter((v) => !isVolumeDownloaded(v));

  // Handle deleting a book from app's internal offline storage
  const handleDeleteBook = async (volId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteBookFromInternalStorage(volId);
      if (onDeleteInternalBook) {
        onDeleteInternalBook(volId);
      }
      await refreshInternalBooks();
      showToast('کتاب ایپ کے انٹرنل فولڈر سے کامیابی کے ساتھ حذف کر دی گئی');
    } catch {
      showToast('کتاب حذف کرنے میں دشواری پیش آئی');
    }
  };

  // Handle exporting/saving downloaded blob to device storage
  const handleExportToDevice = (vol: VolumeData, e: React.MouseEvent) => {
    e.stopPropagation();
    const stored = internalBooks.find((b) => b.volumeId === vol.id);
    const filename = `Ihtisab_Nasbiyat_Jild_${vol.volumeNumber}.pdf`;
    if (stored && stored.blob) {
      triggerDirectDownload(stored.blob, filename);
      showToast(`فائل "${filename}" ڈیوائس کے ڈاؤن لوڈز میں محفوظ کر دی گئی`);
    } else {
      onDownload(vol);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-900 border border-emerald-500/50 text-emerald-300 px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-sans font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Downloads Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950/70 border border-amber-900/40 rounded-3xl p-5 mb-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FolderDown className="w-6 h-6 text-amber-400" />
              <h2 className="font-nastaliq text-2xl sm:text-3xl font-bold text-amber-300">
                ایپ ڈاؤن لوڈز و انٹرنل آف لائن اسٹوریج
              </h2>
            </div>
            <p className="text-xs text-stone-300 font-sans max-w-xl leading-relaxed">
              جو کتب آپ ایپ کے اندر ڈاؤن لوڈ کرتے ہیں، وہ یہاں محفوظ رہتی ہیں اور بغیر انٹرنیٹ کے مکمل آف لائن کھلتی ہیں۔
            </p>
          </div>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer font-sans shrink-0"
            >
              <span>فہرست کتب (ہوم)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-stone-800/80 text-center">
          <div className="bg-stone-900/70 p-2.5 rounded-2xl border border-stone-800">
            <span className="text-[11px] text-stone-400 block font-sans">محفوظ شدہ کتب</span>
            <span className="font-bold text-lg text-emerald-400 font-mono">{downloadedVolumes.length}</span>
          </div>
          <div className="bg-stone-900/70 p-2.5 rounded-2xl border border-stone-800">
            <span className="text-[11px] text-stone-400 block font-sans">باقی کتب</span>
            <span className="font-bold text-lg text-amber-300 font-mono">{pendingVolumes.length}</span>
          </div>
          <div className="bg-stone-900/70 p-2.5 rounded-2xl border border-stone-800">
            <span className="text-[11px] text-stone-400 block font-sans">اسکرین شاٹس</span>
            <span className="font-bold text-lg text-amber-400 font-mono">{snapshots.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('downloaded')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-sans transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filter === 'downloaded'
              ? 'bg-emerald-600 text-white font-bold shadow-lg scale-[1.02]'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>ایپ میں ڈاؤن لوڈ شدہ کتب ({downloadedVolumes.length})</span>
        </button>

        <button
          onClick={() => setFilter('available')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-sans transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filter === 'available'
              ? 'bg-amber-600 text-stone-950 font-bold shadow-lg scale-[1.02]'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>دیگر دستیاب کتب ({pendingVolumes.length})</span>
        </button>

        <button
          onClick={() => setFilter('snapshots')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-sans transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filter === 'snapshots'
              ? 'bg-amber-500 text-stone-950 font-bold shadow-lg scale-[1.02]'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>اسکرین شاٹس گیلری ({snapshots.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. PRIMARY VIEW: DOWNLOADED BOOKS (Strictly downloaded only!) */}
      {/* ============================================================== */}
      {filter === 'downloaded' && (
        <div className="space-y-4">
          {downloadedVolumes.length === 0 ? (
            <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-10 sm:p-14 text-center text-stone-400 space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                <FolderDown className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-nastaliq text-2xl sm:text-3xl font-bold text-amber-300">
                  ابھی تک کوئی کتاب ایپ میں ڈاؤن لوڈ نہیں کی گئی
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 font-sans max-w-md mx-auto leading-relaxed">
                  جب آپ کسی کتاب کو ڈاؤن لوڈ کریں گے، تو وہ فائل ایپ کے انٹرنل اسٹوریج میں محفوظ ہو جائے گی اور یہاں ظاہر ہوگی، تاکہ آپ اسے انٹرنیٹ کے بغیر بھی پڑھ سکیں۔
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setFilter('available')}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-stone-950 font-bold text-xs sm:text-sm shadow-xl cursor-pointer transition-all active:scale-95 font-sans"
                >
                  کتب کی فہرست دیکھیں اور ڈاؤن لوڈ کریں
                </button>
                {onNavigateHome && (
                  <button
                    onClick={onNavigateHome}
                    className="px-5 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer font-sans"
                  >
                    ہوم پیج پر جائیں
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {downloadedVolumes.map((volume) => {
                const storedInfo = internalBooks.find((b) => b.volumeId === volume.id);
                return (
                  <div
                    key={volume.id}
                    className="bg-stone-900/95 border-2 border-emerald-600/40 hover:border-emerald-500 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      {/* Book Cover */}
                      <div className="w-16 h-22 sm:w-20 sm:h-26 rounded-2xl bg-stone-950 border border-stone-700 overflow-hidden shrink-0 shadow relative">
                        {volume.coverImageUrl ? (
                          <img
                            src={volume.coverImageUrl}
                            alt={volume.volumeTitleUrdu}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-1 text-center font-nastaliq text-xs text-amber-300">
                            {volume.volumeTitleUrdu}
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-mono font-bold px-1 rounded">
                          آف لائن
                        </div>
                      </div>

                      {/* Book Details */}
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/40 text-[11px] font-bold font-sans">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ایپ کے انٹرنل فولڈر میں محفوظ ہے</span>
                        </div>

                        <h3 className="font-nastaliq text-xl sm:text-2xl font-bold text-amber-200">
                          {volume.volumeTitleUrdu}: {volume.topic}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 font-sans">
                          <span>{volume.pageCount} صفحات</span>
                          <span>•</span>
                          <span>سائز: {storedInfo?.fileSize || volume.fileSize}</span>
                          {storedInfo?.downloadedAt && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400">تاریخ ڈاؤن لوڈ: {storedInfo.downloadedAt}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:self-center">
                      {/* Primary Offline Reader Button */}
                      <button
                        onClick={() => onRead(volume)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl cursor-pointer transition-all active:scale-95 font-sans"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>مطالعہ فرمائیں (آف لائن)</span>
                      </button>

                      {/* Export / Save to Device Chrome */}
                      <button
                        onClick={(e) => handleExportToDevice(volume, e)}
                        className="p-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 border border-stone-700 text-xs font-semibold cursor-pointer transition-colors"
                        title="فون اسٹوریج میں بھی محفوظ کریں"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {/* Delete from App Internal Storage */}
                      <button
                        onClick={(e) => handleDeleteBook(volume.id, e)}
                        className="p-2.5 rounded-2xl bg-stone-800 hover:bg-rose-950/60 text-stone-400 hover:text-rose-400 border border-stone-700 hover:border-rose-500/40 text-xs cursor-pointer transition-colors"
                        title="ایپ سے فائل حذف کریں"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. SECONDARY VIEW: OTHER AVAILABLE BOOKS TO DOWNLOAD */}
      {/* ============================================================== */}
      {filter === 'available' && (
        <div className="space-y-4">
          <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-xs text-stone-300 font-sans">
              جن جلدوں کو آپ ایپ میں آف لائن پڑھنا چاہتے ہیں، ان کے سامنے موجود "ڈاؤن لوڈ" بٹن دبائیں:
            </span>
            <span className="text-xs font-mono text-amber-400 font-bold">
              {pendingVolumes.length} باقی کتب
            </span>
          </div>

          {pendingVolumes.length === 0 ? (
            <div className="bg-stone-900/80 border border-emerald-600/30 rounded-3xl p-10 text-center text-stone-300 space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="font-nastaliq text-xl text-emerald-300 font-bold">
                تمام ۱۲ جلدیں ایپ کے اندر ڈاؤن لوڈ ہو چکی ہیں!
              </h4>
              <p className="text-xs font-sans text-stone-400">
                آپ بغیر انٹرنیٹ کے جب چاہیں تمام کتب کا مطالعہ فرما سکتے ہیں۔
              </p>
              <button
                onClick={() => setFilter('downloaded')}
                className="mt-3 px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold font-sans cursor-pointer"
              >
                ڈاؤن لوڈ شدہ کتب کی لسٹ دیکھیں
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingVolumes.map((volume) => (
                <div
                  key={volume.id}
                  className="bg-stone-900/80 border border-stone-800 hover:border-stone-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 rounded-xl bg-stone-950 border border-stone-800 overflow-hidden shrink-0">
                      {volume.coverImageUrl ? (
                        <img
                          src={volume.coverImageUrl}
                          alt={volume.volumeTitleUrdu}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-1 font-nastaliq text-[10px] text-amber-300">
                          {volume.volumeTitleUrdu}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-nastaliq text-lg font-bold text-stone-200">
                        {volume.volumeTitleUrdu}
                      </h4>
                      <p className="text-xs text-stone-400 font-sans mt-0.5">
                        {volume.topic} • {volume.pageCount} صفحات • {volume.fileSize}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onRead(volume)}
                      className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-xl transition-colors cursor-pointer font-sans"
                    >
                      آن لائن مطالعہ
                    </button>
                    <button
                      onClick={() => onDownload(volume)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow transition-all cursor-pointer font-sans active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ایپ میں ڈاؤن لوڈ کریں</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SNAPSHOTS GALLERY VIEW */}
      {/* ============================================================== */}
      {filter === 'snapshots' && (
        <div className="space-y-4">
          {snapshots.length === 0 ? (
            <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-10 text-center text-stone-400">
              <Camera className="w-10 h-10 text-stone-600 mx-auto mb-2" />
              <h4 className="font-nastaliq text-base text-amber-300">کوئی اسکرین شاٹ محفوظ نہیں ہے</h4>
              <p className="text-xs font-sans mt-1">
                کتاب پڑھتے ہوئے کیمرے کے بٹن پر کلک کریں؛ تصویر فوری ڈیوائس پر ڈاؤن لوڈ ہوگی اور یہاں بھی نظر آئے گی۔
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  onClick={() => setPreviewSnapshot(snap)}
                  className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-md group hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="aspect-[3/4] bg-stone-950 overflow-hidden relative">
                    <img
                      src={snap.dataUrl}
                      alt={snap.volumeTitleUrdu}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute top-1.5 left-1.5 bg-stone-950/80 px-2 py-0.5 rounded text-[10px] text-amber-300 font-mono">
                      ص {snap.page}
                    </div>
                  </div>

                  <div className="p-2 bg-stone-900">
                    <div className="font-nastaliq text-xs font-bold text-stone-200 truncate">
                      جلد {snap.volumeNumber}: {snap.volumeTitleUrdu}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-800 text-[10px]">
                      <button
                        onClick={(e) => handleDownloadSnapshotAgain(snap, e)}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-sans"
                        title="ڈیوائس پر دوبارہ محفوظ کریں"
                      >
                        <Download className="w-3 h-3" />
                        <span>ڈاؤن لوڈ</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="حذف کریں"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Snapshot Fullscreen Preview Modal */}
      {previewSnapshot && (
        <div
          onClick={() => setPreviewSnapshot(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95"
          >
            <div className="px-4 py-3 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h4 className="font-nastaliq text-base font-bold text-amber-300">
                  {previewSnapshot.volumeTitleUrdu}
                </h4>
                <span className="text-xs text-stone-400 font-mono">صفحہ: {previewSnapshot.page}</span>
              </div>
              <button
                onClick={() => setPreviewSnapshot(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-stone-950 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewSnapshot.dataUrl}
                alt="صفحہ پریویو"
                className="max-w-full max-h-[65vh] object-contain rounded"
              />
            </div>

            <div className="p-3 border-t border-stone-800 flex items-center justify-between bg-stone-900">
              <button
                onClick={(e) => handleDownloadSnapshotAgain(previewSnapshot, e)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-sans cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ڈیوائس میں محفوظ کریں</span>
              </button>

              <button
                onClick={(e) => handleDeleteSnapshot(previewSnapshot.id, e)}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 text-xs px-3 py-2 font-sans cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف کریں</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
