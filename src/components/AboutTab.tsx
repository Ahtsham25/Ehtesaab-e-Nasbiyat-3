import React, { useState } from 'react';
import {
  ShieldCheck,
  HeartHandshake,
  Check,
  Copy,
  Settings,
  ExternalLink,
  GitBranch
} from 'lucide-react';
import { VolumeData } from '../types/book';
import { Language } from '../i18n/translations';

interface AboutTabProps {
  volumes?: VolumeData[];
  lang?: Language;
  onNavigateAdmin?: () => void;
}

export const AboutTab: React.FC<AboutTabProps> = ({
  lang = 'ur',
  onNavigateAdmin,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const isEn = lang === 'en';

  const handleCopyRepo = () => {
    const url = 'https://github.com/Ahtsham25/Ehtesaab-E-Nasbiyat-2';
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }).catch(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 space-y-6 select-none">
      {/* Main Clean About Card */}
      <div className="bg-gradient-to-b from-stone-900/90 to-stone-950 border border-amber-900/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
        {/* Monogram */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full p-1 bg-gradient-to-br from-amber-400 via-emerald-600 to-amber-600 shadow-xl border border-amber-400/50">
          <img
            src="/app-logo.png"
            alt="احتساب ناصبیت آفیشل مونوگرام"
            className="w-full h-full object-contain rounded-full bg-stone-950"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Title */}
        <div>
          <h2 className="font-nastaliq text-2xl sm:text-3xl font-bold text-amber-300 leading-relaxed">
            مکتبہ &quot;احتسابِ ناصبیت&quot;
          </h2>
          <p className="font-nastaliq text-base sm:text-lg text-emerald-400 mt-1">
            ردِ ناصبیت، دفاعِ اہلِ بیتؑ اور دفاعِ صحابہ کرامؓ
          </p>
        </div>

        {/* Divider */}
        <div className="h-0.5 w-24 mx-auto bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

        {/* Sole Clear Text Required by User */}
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-5 sm:p-6 text-stone-200 shadow-inner">
          <p className="font-nastaliq text-base sm:text-lg leading-loose text-amber-100/90">
            یہ ایپ ردِ ناصبیت، دفاعِ اہلِ بیتؑ اور دفاعِ صحابہ کرامؓ کے لیے بنائی گئی ہے اور اس میں علمی و تحقیقی کتاب &quot;احتسابِ ناصبیت&quot; کی بارہ (12) جلدیں مکمل طور پر شامل ہیں۔
          </p>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs">
          <div className="bg-stone-900/60 border border-stone-800/80 rounded-xl p-3">
            <span className="font-nastaliq font-bold text-amber-300 block text-sm mb-1">ردِ ناصبیت</span>
            <span className="text-stone-400 text-[11px] font-sans">محاکمہ و ابطالِ شبہات</span>
          </div>
          <div className="bg-stone-900/60 border border-stone-800/80 rounded-xl p-3">
            <span className="font-nastaliq font-bold text-emerald-300 block text-sm mb-1">دفاعِ اہلِ بیتؑ</span>
            <span className="text-stone-400 text-[11px] font-sans">عظمت و طہارتِ پنجتن</span>
          </div>
          <div className="bg-stone-900/60 border border-stone-800/80 rounded-xl p-3">
            <span className="font-nastaliq font-bold text-sky-300 block text-sm mb-1">دفاعِ صحابہؓ</span>
            <span className="text-stone-400 text-[11px] font-sans">عدالت و تحفظِ خدمات</span>
          </div>
        </div>
      </div>

      {/* Admin Panel & GitHub Link Section */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-600/30 text-amber-400">
                <GitBranch className="w-4 h-4" />
              </span>
              <h4 className="font-nastaliq text-lg font-bold text-amber-300">
                {isEn ? 'Admin Panel & GitHub Sync' : 'ایڈمن پینل و گٹ ہب سنک'}
              </h4>
            </div>
            <p className="text-xs text-stone-400 font-sans">
              کتب کی ترتیب، لنکس اور ترامیم کے لیے ایڈمن پینل کھولیں یا گٹ ہب ریپوزٹری سے رجوع کریں۔
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateAdmin && (
              <button
                onClick={onNavigateAdmin}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-md cursor-pointer font-nastaliq"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>ایڈمن پینل کھولیں</span>
              </button>
            )}

            <button
              onClick={handleCopyRepo}
              className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">لنک کاپی ہو گیا</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                  <span>ریپو لنک</span>
                </>
              )}
            </button>

            <a
              href="https://github.com/Ahtsham25/Ehtesaab-E-Nasbiyat-2"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-600/40 px-3.5 py-2 rounded-xl text-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>گٹ ہب ریپو</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutTab;
