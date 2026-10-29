import { ResponseBook } from '../types/book';

export const RESPONSE_BOOKS_STORAGE_KEY = 'ehtisab_response_books_v2';

export const INITIAL_RESPONSE_BOOKS: ResponseBook[] = [
  {
    id: 'resp-1',
    titleUrdu: 'احتساب ناصبیت پر اعتراضات کا جواب',
    author: 'علمائے اہل سنت و دفاعِ اہل بیت ریسرچ اکیڈمی',
    topic: 'معترضین کے شکوک و شبہات کا تفصیلی اور مسکت علمی جواب',
    description: 'کتاب "احتساب ناصبیت" پر کیے گئے اعتراضات، طعن اور شبہات کا نصوص اور دلائل کی روشنی میں بھرپور محاکمہ۔',
    archiveItemId: '20261003_20261003_2332',
    pdfUrl: 'https://ia801801.us.archive.org/21/items/20261003_20261003_2332/%D8%A7%D8%AD%D8%AA%D8%B3%D8%A7%D8%A8%20%D9%86%D8%A7%D8%B5%D8%A8%DB%8C%D8%AA%20%D9%BE%D8%B1%20%D8%A7%D8%B9%D8%AA%D8%B1%D8%A7%D8%B6%D8%A7%D8%AA%20%DA%A9%D8%A7%20%D8%AC%D9%88%D8%A7%D8%A8.pdf',
    coverImageUrl: 'https://archive.org/services/img/20261003_20261003_2332',
    pageCount: 128,
    fileSize: '5.8 MB',
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
    pdfUrl: 'https://ia800701.us.archive.org/1/items/20261003_20261003_0649/%D8%A7%D8%AD%D8%AA%D8%B3%D8%A7%D8%A8%20%D9%86%D8%A7%D8%B5%D8%A8%DB%8C%D8%AA%20%D8%B3%DB%92%20%D9%85%D8%AA%D8%B9%D9%84%D9%82%20%D8%A7%DB%81%D9%85%20%D9%88%D8%B6%D8%A7%D8%AD%D8%AA.pdf',
    coverImageUrl: 'https://archive.org/services/img/20261003_20261003_0649',
    pageCount: 64,
    fileSize: '1.3 MB',
    year: 'اشاعت ۲۰۲۶ء',
    isBookmarked: false,
    isUserAdded: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'resp-3',
    titleUrdu: 'مفتی عبد الواحد قریشی صاحب کا اعتراض اور اس کا جواب',
    author: 'علمائے کرام و محققین',
    topic: 'ناصبی افکار کی تردید اور روایات کا تحقیقی جائزہ',
    description: 'مفتی عبد الواحد قریشی کی تحریروں میں اٹھائے گئے دوسرے اعتراض کا تسلی بخش تحقیقی جواب۔',
    archiveItemId: '20261009_20261009_2214',
    pdfUrl: 'https://ia801404.us.archive.org/7/items/20261009_20261009_2214/%D9%85%D9%81%D8%AA%DB%8C%20%D8%B9%D8%A8%D8%AF%20%D8%A7%D9%84%D9%88%D8%A7%D8%AD%D8%AF%20%D9%82%D8%B1%DB%8C%D8%B4%DB%8C%20%D8%B5%D8%A7%D8%AD%D8%A8%20%DA%A9%D8%A7%20%D8%A7%D8%AD%D8%AA%D8%B3%D8%A7%D8%A8%20%D9%86%D8%A7%D8%B5%D8%A8%DB%8C%D8%AA%20%D9%BE%D8%B1%20%D8%AF%D9%88%D8%B3%D8%B1%D8%A7%20%D8%A7%D8%B9%D8%AA%D8%B1%D8%A7%D8%B6%20%D8%A7%D9%88%D8%B1%20%D8%A7%D8%B3%20%DA%A9%D8%A7%20%D8%AC%D9%88%D8%A7%D8%A8%20.pdf',
    coverImageUrl: 'https://archive.org/services/img/20261009_20261009_2214',
    pageCount: 96,
    fileSize: '1.2 MB',
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
