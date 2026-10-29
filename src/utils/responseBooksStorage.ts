import { ResponseBook } from '../types/book';

export const RESPONSE_BOOKS_STORAGE_KEY = 'ehtisab_response_books_v1';

export const INITIAL_RESPONSE_BOOKS: ResponseBook[] = [
  {
    id: 'resp-1',
    titleUrdu: 'احتساب ناصبیت پر اعتراضات کا جواب',
    author: 'علمائے اہل سنت و دفاعِ اہل بیت ریسرچ اکیڈمی',
    topic: 'معترضین کے شکوک و شبہات کا تفصیلی اور مسکت علمی جواب',
    description: 'کتاب "احتساب ناصبیت" پر کیے گئے اعتراضات، طعن اور شبہات کا نصوص اور دلائل کی روشنی میں بھرپور محاکمہ۔',
    archiveItemId: '20261003_20261003_2332',
    pdfUrl: 'https://archive.org/download/20261003_20261003_2332/20261003_20261003_2332.pdf',
    coverImageUrl: 'https://archive.org/services/img/20261003_20261003_2332',
    pageCount: 128,
    fileSize: '8.4 MB',
    year: 'اشاعت ۲۰۲۶ء',
    isBookmarked: false,
    isUserAdded: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'resp-2',
    titleUrdu: 'احتساب ناصبیت سے متعلق اہم وضاحت',
    author: 'ادارہ تحقیقاتِ حقائق و تالیفاتِ اسلاف',
    topic: 'کتاب کے منہج، مصادر اور اسناد کا تفصیلی دفاع',
    description: 'کتاب میں پیش کردہ حوالہ جات کے سیاق و سباق، عبارتوں کی صحت اور علمی معیار کی مستند وضاحت۔',
    archiveItemId: '20261003_20261003_0649',
    pdfUrl: 'https://archive.org/download/20261003_20261003_0649/20261003_20261003_0649.pdf',
    coverImageUrl: 'https://archive.org/services/img/20261003_20261003_0649',
    pageCount: 64,
    fileSize: '4.2 MB',
    year: 'اشاعت ۲۰۲۶ء',
    isBookmarked: false,
    isUserAdded: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'resp-3',
    titleUrdu: 'مفتی عبد الواحد قریشی کے اعتراضات کا علمی رد',
    author: 'محققین و علمائے کرام',
    topic: 'ناصبی افکار کی تردید اور روایات کا تحقیقی جائزہ',
    description: 'مفتی عبد الواحد قریشی کی تحریروں میں پیدا کیے گئے ابہامات اور اعتراضات کے تسلی بخش تحقیقی جوابات۔',
    archiveItemId: '20261009_20261009_2214',
    pdfUrl: 'https://archive.org/download/20261009_20261009_2214/20261009_20261009_2214.pdf',
    coverImageUrl: 'https://archive.org/services/img/20261009_20261009_2214',
    pageCount: 96,
    fileSize: '6.1 MB',
    year: 'اشاعت ۲۰۲۶ء',
    isBookmarked: false,
    isUserAdded: false,
    createdAt: new Date().toISOString(),
  },
];

export function getStoredResponseBooks(): ResponseBook[] {
  try {
    const raw = localStorage.getItem(RESPONSE_BOOKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_RESPONSE_BOOKS;
}

export function saveResponseBooks(books: ResponseBook[]): void {
  try {
    localStorage.setItem(RESPONSE_BOOKS_STORAGE_KEY, JSON.stringify(books));
  } catch (e) {
    console.warn('Failed to save response books:', e);
  }
}
