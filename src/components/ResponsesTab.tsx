import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Bookmark,
  Sparkles,
  ArrowRight,
  X,
  FileText
} from 'lucide-react';
import { ResponseBook } from '../types/book';
import { triggerDirectDownload } from '../utils/offlineStorage';

interface ResponsesTabProps {
  books: ResponseBook[];
  onReadBook: (book: ResponseBook) => void;
  onNavigateHome: () => void;
  onToggleBookmark?: (bookId: string) => void;
}

export const ResponsesTab: React.FC<ResponsesTabProps> = ({
  books,
  onReadBook,
  onNavigateHome,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Filter books by search query
  const filteredBooks = books.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.titleUrdu.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.topic && b.topic.toLowerCase().includes(q)) ||
      b.description.toLowerCase().includes(q)
    );
  });

  const handleDownloadBook = (book: ResponseBook) => {
    if (!book.pdfUrl) return;
    const filename = `${book.titleUrdu.replace(/\s+/g, '_')}.pdf`;
    const downloadApiUrl = `/api/download?url=${encodeURIComponent(book.pdfUrl)}&filename=${encodeURIComponent(filename)}`;
    triggerDirectDownload(downloadApiUrl, filename);
    setDownloadToast(`کتاب "${book.titleUrdu}" کا ڈاؤن لوڈ شروع ہو گیا ہے۔`);
    setTimeout(() => setDownloadToast(null), 3500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 pb-24 space-y-6">
      {/* Toast Alert */}
      {downloadToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 border border-emerald-500/60 text-emerald-300 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-sans shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95">
          <Download className="w-4 h-4 text-emerald-400" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* Back to Home Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-900/90 hover:bg-stone-800 text-stone-200 border border-stone-800 hover:border-amber-500/40 text-xs sm:text-sm font-sans cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <ArrowRight className="w-4 h-4 text-amber-400 stroke-[2.5]" />
          <span className="font-nastaliq text-sm sm:text-base">فہرست کتب (ہوم پیج) پر واپس جائیں</span>
        </button>
      </div>

      {/* Main Header Banner - Clean and Strictly Labeled */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950/90 border-2 border-amber-500/60 p-6 sm:p-8 shadow-2xl islamic-pattern-bg">
        <div className="relative z-10 space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold font-sans">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>علمی و تحقیقی کتب خانہ</span>
          </div>

          <h1 className="font-nastaliq text-3xl sm:text-4xl lg:text-5xl font-extrabold text-amber-300 leading-snug drop-shadow-md">
            احتساب ناصبیت پر اعتراضات کے جوابات
          </h1>

          <p className="text-xs sm:text-sm text-stone-200 font-sans max-w-2xl leading-relaxed">
            کتاب "احتسابِ ناصبیت" پر معترضین کے اٹھائے گئے تمام شبہات، الزامات اور طعن کے نصوص، اسناد اور تاریخی حقائق کی روشنی میں مسکت و مدلل علمی جوابات کا جامع ذخیرہ۔
          </p>
        </div>
      </div>

      {/* Search & Statistics Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/80 p-3 sm:p-4 rounded-2xl border border-stone-800 shadow-md">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="کتاب، مصنف یا موضوع تلاش کریں..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-700 rounded-xl pr-9 pl-9 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500 font-sans"
          />
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-2.5 text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-stone-400 font-sans flex items-center gap-2">
          <span>دستیاب کتب و رسائل:</span>
          <span className="font-mono font-bold text-amber-400 bg-stone-950 px-2.5 py-0.5 rounded-full border border-stone-800">
            {filteredBooks.length}
          </span>
        </div>
      </div>

      {/* Book Grid */}
      {filteredBooks.length === 0 ? (
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-12 text-center text-stone-400">
          <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="font-nastaliq text-xl text-amber-300 mb-1">کوئی کتاب نہیں ملی</h3>
          <p className="text-xs font-sans">
            برائے مہربانی تلاش کا لفظ تبدیل فرمائیں یا تلاش ختم کریں۔
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="bg-stone-900/80 hover:bg-stone-900 border border-stone-800 hover:border-emerald-600/40 rounded-3xl p-4 sm:p-5 transition-all shadow-md flex flex-col justify-between group"
            >
              <div className="flex gap-4">
                {/* Book Cover */}
                <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden bg-stone-950 border border-stone-800 shrink-0 shadow-md relative">
                  <img
                    src={book.coverImageUrl || '/app-logo.png'}
                    alt={book.titleUrdu}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/app-logo.png';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/80 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-mono">
                    {book.pageCount} ص
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-600/40 font-semibold">
                      رد اعتراضات
                    </span>
                    {book.year && (
                      <span className="text-[10px] text-stone-500 font-sans">{book.year}</span>
                    )}
                  </div>

                  <h3 className="font-nastaliq text-lg sm:text-xl font-bold text-amber-300 leading-snug line-clamp-2 mb-1">
                    {book.titleUrdu}
                  </h3>

                  <p className="text-xs text-stone-400 font-sans mb-1.5 flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">مصنف / ادارہ:</span>
                    <span className="truncate">{book.author}</span>
                  </p>

                  {book.topic && (
                    <p className="text-[11px] text-stone-300 font-sans line-clamp-2 leading-relaxed mb-2">
                      {book.topic}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons: Direct Read & Download for Public Users */}
              <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {book.pdfUrl && (
                    <button
                      onClick={() => handleDownloadBook(book)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 border border-stone-700 text-xs font-sans transition-all cursor-pointer"
                      title="پی ڈی ایف براہِ راست ڈاؤن لوڈ کریں"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>ڈاؤن لوڈ</span>
                    </button>
                  )}
                </div>

                {/* Primary Button: Read Book */}
                <button
                  onClick={() => onReadBook(book)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <BookOpen className="w-4 h-4 stroke-[2.5]" />
                  <span className="font-nastaliq text-sm sm:text-base">مطالعہ فرمائیں</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
