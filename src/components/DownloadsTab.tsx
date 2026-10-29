import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle,
  FileText,
  HardDrive,
  Camera,
  Trash2,
  Eye,
  AlertCircle,
  FolderDown,
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';
import { VolumeData } from '../types/book';
import {
  getSavedSnapshots,
  deleteSnapshotFromStorage,
  SavedSnapshot,
  triggerDirectDownload,
  getInternalBooksList,
  StoredBookRecord
} from '../utils/offlineStorage';

interface DownloadsTabProps {
  volumes: VolumeData[];
  onDownload: (volume: VolumeData) => void;
  onRead: (volume: VolumeData) => void;
}

export const DownloadsTab: React.FC<DownloadsTabProps> = ({
  volumes,
  onDownload,
  onRead,
}) => {
  const [filter, setFilter] = useState<'all' | 'downloaded' | 'pending' | 'snapshots'>('all');
  const [snapshots, setSnapshots] = useState<SavedSnapshot[]>([]);
  const [internalBooks, setInternalBooks] = useState<StoredBookRecord[]>([]);
  const [previewSnapshot, setPreviewSnapshot] = useState<SavedSnapshot | null>(null);

  useEffect(() => {
    setSnapshots(getSavedSnapshots());
    getInternalBooksList().then((list) => setInternalBooks(list));
  }, []);

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSnapshotFromStorage(id);
    setSnapshots(updated);
    if (previewSnapshot?.id === id) {
      setPreviewSnapshot(null);
    }
  };

  const handleDownloadSnapshotAgain = (snap: SavedSnapshot, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerDirectDownload(snap.dataUrl, `Ehtisab_Nasbiyat_Vol_${snap.volumeNumber}_Page_${snap.page}.jpg`);
  };

  const downloadedVolumes = volumes.filter((v) => v.isDownloaded);
  const pendingVolumes = volumes.filter((v) => !v.isDownloaded);

  const displayedVolumes =
    filter === 'downloaded'
      ? downloadedVolumes
      : filter === 'pending'
      ? pendingVolumes
      : volumes;

  const handleDownloadAll = () => {
    volumes.forEach((vol, idx) => {
      setTimeout(() => {
        onDownload(vol);
      }, idx * 800);
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Downloads Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950/70 border border-amber-900/40 rounded-3xl p-5 mb-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FolderDown className="w-6 h-6 text-amber-400" />
              <h2 className="font-nastaliq text-2xl sm:text-3xl font-bold text-amber-300">
                ڈاؤن لوڈ مینیجر و انٹرنل اسٹوریج
              </h2>
            </div>
            <p className="text-xs text-stone-300 font-sans max-w-xl leading-relaxed">
              کتب کی پی ڈی ایف اور کیمرہ سے لیے گئے اسکرین شاٹس براہِ راست آپ کے موبائل میں ڈاؤن لوڈ ہوتے ہیں اور ایپ کے انٹرنل فولڈر میں بھی محفوظ رہتے ہیں۔
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-lg cursor-pointer whitespace-nowrap font-sans"
            >
              <Download className="w-4 h-4" />
              <span>تمام ۱۲ جلدیں ڈاؤن لوڈ کریں</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-stone-800/80 text-center">
          <div className="bg-stone-900/70 p-2.5 rounded-2xl border border-stone-800">
            <span className="text-[11px] text-stone-400 block font-sans">کل جلدیں</span>
            <span className="font-bold text-lg text-amber-300 font-mono">۱۲</span>
          </div>
          <div className="bg-stone-900/70 p-2.5 rounded-2xl border border-stone-800">
            <span className="text-[11px] text-stone-400 block font-sans">انٹرنل محفوظ شدہ کتب</span>
            <span className="font-bold text-lg text-emerald-400 font-mono">{downloadedVolumes.length}</span>
          </div>
          <div className="bg-stone-900/70 p-2.5 rounded-2xl border border-stone-800">
            <span className="text-[11px] text-stone-400 block font-sans">محفوظ اسکرین شاٹس</span>
            <span className="font-bold text-lg text-amber-400 font-mono">{snapshots.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-colors cursor-pointer whitespace-nowrap ${
            filter === 'all'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
          }`}
        >
          تمام جلدیں ({volumes.length})
        </button>
        <button
          onClick={() => setFilter('downloaded')}
          className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-colors cursor-pointer whitespace-nowrap ${
            filter === 'downloaded'
              ? 'bg-emerald-600 text-white font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
          }`}
        >
          محفوظ شدہ کتب ({downloadedVolumes.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-colors cursor-pointer whitespace-nowrap ${
            filter === 'pending'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
          }`}
        >
          ڈاؤن لوڈ کے لیے دستیاب ({pendingVolumes.length})
        </button>
        <button
          onClick={() => setFilter('snapshots')}
          className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filter === 'snapshots'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          <span>اسکرین شاٹس گیلری ({snapshots.length})</span>
        </button>
      </div>

      {/* Snapshots Gallery View */}
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

      {/* Volumes List */}
      {filter !== 'snapshots' && (
        <div className="space-y-3">
          {displayedVolumes.map((volume) => {
            return (
              <div
                key={volume.id}
                className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-700/40 transition-colors shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-14 rounded-xl bg-stone-950 border border-stone-700/60 overflow-hidden flex-shrink-0 flex items-center justify-center text-center p-1">
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
                      <span className="font-nastaliq text-[10px] text-amber-300">
                        {volume.volumeTitleUrdu}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-nastaliq text-base font-bold text-amber-200">
                        {volume.volumeTitleUrdu}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-400 mt-1 font-sans">
                      <span>{volume.pageCount} صفحات</span>
                      <span>•</span>
                      <span>سائز: {volume.fileSize}</span>
                      <span>•</span>
                      <span className="text-[11px] text-emerald-400">
                        براہِ راست ڈیوائس اسٹوریج
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {volume.isDownloaded && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-600/40 px-2.5 py-1.5 rounded-xl font-sans">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>انٹرنل محفوظ شدہ</span>
                    </span>
                  )}

                  <button
                    onClick={() => onRead(volume)}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-xl transition-colors cursor-pointer font-sans"
                  >
                    مطالعہ کریں
                  </button>

                  <button
                    onClick={() => onDownload(volume)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow transition-colors cursor-pointer font-sans"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ڈاؤن لوڈ پی ڈی ایف</span>
                  </button>
                </div>
              </div>
            );
          })}
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
                className="p-1.5 text-stone-400 hover:text-white rounded-lg"
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

      {/* Helpful Download Instructions */}
      <div className="mt-8 p-4 bg-stone-900/50 border border-stone-800/80 rounded-2xl text-xs text-stone-400 space-y-2 font-sans">
        <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>براہِ راست ڈیوائس و انٹرنل اسٹوریج:</span>
        </div>
        <p className="leading-relaxed">
          کتاب کی پی ڈی ایف یا کیمرہ اسکرین شاٹ ڈاؤن لوڈ کرنے پر یہ بیرونی ویب سائٹ کھولے بغیر سیدھی آپ کے ڈیوائس (Downloads / Gallery) میں محفوظ ہو جاتی ہے اور ایپ کے اندر بھی دستیاب رہتی ہے۔
        </p>
      </div>
    </div>
  );
};
