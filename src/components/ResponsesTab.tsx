import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ResponseBook, VolumeData } from '../types/book';

interface ResponsesTabProps {
  books: ResponseBook[];
  onAddBook: (book: ResponseBook) => void;
  onUpdateBook: (book: ResponseBook) => void;
  onDeleteBook: (id: string) => void;
  onReadBook: (book: ResponseBook) => void;
  onNavigateHome: () => void;
}

export const ResponsesTab: React.FC<ResponsesTabProps> = ({
  books,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onReadBook,
  onNavigateHome,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBook, setEditingBook] = useState<ResponseBook | null>(null);

  // Form fields
  const [titleUrdu, setTitleUrdu] = useState('');
  const [author, setAuthor] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [archiveItemId, setArchiveItemId] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [pageCount, setPageCount] = useState<number>(100);
  const [year, setYear] = useState('اشاعت ۲۰۲۶ء');
  const [formError, setFormError] = useState<string | null>(null);

  // Filter books by search
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

  const openAddModal = () => {
    setEditingBook(null);
    setTitleUrdu('');
    setAuthor('');
    setTopic('');
    setDescription('');
    setPdfUrl('');
    setArchiveItemId('');
    setCoverImageUrl('');
    setPageCount(100);
    setYear('اشاعت ۲۰۲۶ء');
    setFormError(null);
    setShowAddModal(true);
  };

  const openEditModal = (book: ResponseBook) => {
    setEditingBook(book);
    setTitleUrdu(book.titleUrdu);
    setAuthor(book.author);
    setTopic(book.topic || '');
    setDescription(book.description);
    setPdfUrl(book.pdfUrl);
    setArchiveItemId(book.archiveItemId || '');
    setCoverImageUrl(book.coverImageUrl || '');
    setPageCount(book.pageCount);
    setYear(book.year || 'اشاعت ۲۰۲۶ء');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleUrdu.trim()) {
      setFormError('برائے مہربانی کتاب کا نام / عنوان درج فرمائیں۔');
      return;
    }
    if (!pdfUrl.trim() && !archiveItemId.trim()) {
      setFormError('برائے مہربانی پی ڈی ایف کا لنک یا آرکائیو آئی ڈی درج فرمائیں۔');
      return;
    }

    const finalArchiveId = archiveItemId.trim() || '';
    const finalPdf = pdfUrl.trim() || (finalArchiveId ? `https://archive.org/download/${finalArchiveId}/${finalArchiveId}.pdf` : '');
    const finalCover = coverImageUrl.trim() || (finalArchiveId ? `https://archive.org/services/img/${finalArchiveId}` : '/app-logo.png');

    if (editingBook) {
      onUpdateBook({
        ...editingBook,
        titleUrdu: titleUrdu.trim(),
        author: author.trim() || 'اہل علم و محققین',
        topic: topic.trim(),
        description: description.trim(),
        pdfUrl: finalPdf,
        archiveItemId: finalArchiveId,
        coverImageUrl: finalCover,
        pageCount: Number(pageCount) || 100,
        year: year.trim(),
      });
    } else {
      const newBook: ResponseBook = {
        id: `resp-${Date.now()}`,
        titleUrdu: titleUrdu.trim(),
        author: author.trim() || 'اہل علم و محققین',
        topic: topic.trim(),
        description: description.trim(),
        pdfUrl: finalPdf,
        archiveItemId: finalArchiveId,
        coverImageUrl: finalCover,
        pageCount: Number(pageCount) || 100,
        year: year.trim(),
        isBookmarked: false,
        isUserAdded: true,
        createdAt: new Date().toISOString(),
      };
      onAddBook(newBook);
    }

    setShowAddModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 pb-24 space-y-6">
      {/* Top Navigation & Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/90 via-stone-900 to-amber-950/90 border border-emerald-500/30 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs mb-2 font-sans font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>خصوصی تحقیقی سلسلہ</span>
          </div>
          <h2 className="font-nastaliq text-2xl sm:text-3xl font-bold text-amber-300 leading-tight">
            احتساب ناصبیت پر اعتراضات کے جوابات
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 font-sans mt-1">
            کتاب پر معترضین کے اٹھائے گئے شبہات، الزامات اور اعتراضات کے مدلل و مسکت علمی جوابات
          </p>
        </div>

        {/* Action Button: Add New Book */}
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="font-nastaliq text-base">نئی کتاب شامل کریں</span>
        </button>
      </div>

      {/* Search & Info Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/70 p-3 rounded-2xl border border-stone-800">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="کتاب، مصنف یا موضوع تلاش کریں..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-700 rounded-xl px-9 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500 font-sans"
          />
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-2.5 text-stone-400 hover:text-stone-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-stone-400 font-sans">
          دستیاب کتب و رسائل: <span className="font-mono font-bold text-amber-400">{filteredBooks.length}</span>
          <span className="text-stone-500 text-[11px] mr-2">(آپ اپنی مرضی سے مزید کتب بھی شامل کر سکتے ہیں)</span>
        </div>
      </div>

      {/* Book Grid */}
      {filteredBooks.length === 0 ? (
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-12 text-center text-stone-400">
          <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="font-nastaliq text-xl text-amber-300 mb-1">کوئی کتاب نہیں ملی</h3>
          <p className="text-xs font-sans mb-4">
            تلاش کا لفظ تبدیل فرمائیں یا اوپر دیے گئے بٹن سے نئی کتاب شامل کریں۔
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>نئی کتاب شامل کریں</span>
          </button>
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
                    <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-600/40">
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

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(book)}
                    className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition-colors"
                    title="ترمیم کریں"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {book.isUserAdded && (
                    <button
                      onClick={() => {
                        if (confirm(`کیا آپ واقعی کتاب "${book.titleUrdu}" کو حذف کرنا چاہتے ہیں؟`)) {
                          onDeleteBook(book.id);
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors"
                      title="حذف کریں"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {book.pdfUrl && (
                    <a
                      href={book.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-stone-400 hover:text-emerald-400 hover:bg-stone-800 rounded-lg transition-colors"
                      title="پی ڈی ایف ڈاؤن لوڈ کریں"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Primary Button: Read Book */}
                <button
                  onClick={() => onReadBook(book)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs sm:text-sm cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="font-nastaliq text-sm sm:text-base">مطالعہ فرمائیں</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT BOOK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-nastaliq text-xl font-bold">
                  {editingBook ? 'کتاب کی معلومات تبدیل کریں' : 'نئی جوابی کتاب شامل کریں'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-950/60 border border-rose-500/60 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-stone-300 block mb-1 font-bold font-sans">
                  کتاب کا نام / عنوان: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: دفاع احتساب ناصبیت اور شبہات کا ازالہ"
                  value={titleUrdu}
                  onChange={(e) => setTitleUrdu(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1 font-sans">
                    مصنف / مرتب / ادارہ:
                  </label>
                  <input
                    type="text"
                    placeholder="مثلاً: مولانا اللہ وسایا"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 block mb-1 font-sans">
                    صفحات کی تعداد:
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="100"
                    value={pageCount}
                    onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 100)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1 font-bold font-sans">
                  پی ڈی ایف کا براہ راست لنک (PDF URL): <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://archive.org/download/.../book.pdf"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  انٹرنیٹ آرکائیو یا کسی بھی ویب سائٹ سے پی ڈی ایف کا لنک ڈالیں
                </span>
              </div>

              <div>
                <label className="text-stone-300 block mb-1 font-sans">
                  آرکائیو آئی ڈی (اگر آرکائیو پر ہے تو):
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: 20261003_20261003_2332"
                  value={archiveItemId}
                  onChange={(e) => setArchiveItemId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1 font-sans">
                  موضوع یا خلاصہ:
                </label>
                <textarea
                  rows={2}
                  placeholder="کتاب کے اہم مباحث اور اعتراضات کا خلاصہ..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1 font-sans">
                  سرورق کی تصویر کا لنک (اختیاری):
                </label>
                <input
                  type="url"
                  placeholder="https://.../cover.jpg"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold cursor-pointer shadow-lg"
                >
                  {editingBook ? 'تبدیلیاں محفوظ کریں' : 'کتاب شامل کریں'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
