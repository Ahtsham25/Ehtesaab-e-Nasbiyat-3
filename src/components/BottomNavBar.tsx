import React, { useState } from 'react';
import {
  Home,
  Download,
  Highlighter,
  Bookmark,
  BookOpen,
  Shield,
  GitBranch,
  Palette,
  HelpCircle,
  MoreHorizontal,
  X,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import { ActiveTab } from '../types/book';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface BottomNavBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  downloadCount: number;
  bookmarkCount: number;
  highlightCount?: number;
  lang?: Language;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  setActiveTab,
  downloadCount,
  bookmarkCount,
  highlightCount = 0,
  lang = 'ur',
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const t = TRANSLATIONS[lang];
  const isEn = lang === 'en';

  // The 4 sub-pages inside "More" (مزید)
  const moreSubTabs: ActiveTab[] = ['editor', 'about', 'privacy', 'admin'];
  const isMoreActive = moreSubTabs.includes(activeTab);

  // Primary bottom navigation items (5 visible core tabs)
  const primaryNavItems = [
    {
      id: 'home' as ActiveTab,
      label: t.home,
      icon: Home,
    },
    {
      id: 'responses' as ActiveTab,
      label: t.responses,
      icon: HelpCircle,
    },
    {
      id: 'downloads' as ActiveTab,
      label: t.downloads,
      icon: Download,
      badge: downloadCount > 0 ? downloadCount : undefined,
    },
    {
      id: 'highlights' as ActiveTab,
      label: t.highlights,
      icon: Highlighter,
      badge: highlightCount > 0 ? highlightCount : undefined,
    },
    {
      id: 'bookmarks' as ActiveTab,
      label: t.bookmarks,
      icon: Bookmark,
      badge: bookmarkCount > 0 ? bookmarkCount : undefined,
    },
  ];

  // Secondary items placed inside the "More" (مزید) popup sheet
  const moreItems = [
    {
      id: 'editor' as ActiveTab,
      label: t.editor,
      subtitle: isEn ? 'Quote & Screenshot Maker' : 'اقتباس و حوالہ سند ساز',
      icon: Palette,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
      tag: isEn ? 'Design' : 'ایڈیٹر',
    },
    {
      id: 'about' as ActiveTab,
      label: t.about,
      subtitle: isEn ? 'Book & Author Biography' : 'کتاب و مصنف کا مفصل جائزہ',
      icon: BookOpen,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
      tag: isEn ? 'Biography' : 'تعارف',
    },
    {
      id: 'privacy' as ActiveTab,
      label: t.privacy,
      subtitle: isEn ? 'Privacy Policy & Terms' : 'حقوق و شرائطِ استعمال',
      icon: Shield,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      tag: isEn ? 'Terms' : 'پالیسی',
    },
    {
      id: 'admin' as ActiveTab,
      label: isEn ? 'Admin' : 'ایڈمن',
      subtitle: isEn ? 'Books Manager & Cloud Sync' : 'کتب مینیجر و کلاؤڈ سنک',
      icon: GitBranch,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      tag: isEn ? 'Manager' : 'انتظام',
    },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Backdrop overlay for More Menu */}
      {isMoreOpen && (
        <div
          onClick={() => setIsMoreOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* "More" (مزید) Bottom Sheet / Popover */}
      {isMoreOpen && (
        <div
          className="fixed bottom-16 sm:bottom-18 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-[460px] z-50 bg-stone-900/98 border border-amber-800/60 rounded-2xl p-3 sm:p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-200"
          dir={isEn ? 'ltr' : 'rtl'}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-stone-100 font-bold text-sm sm:text-base font-sans">
                  {isEn ? 'More Pages & Options' : 'مزید صفحات و اختیارات'}
                </h3>
                <p className="text-[11px] text-stone-400">
                  {isEn ? 'Choose additional features & tools' : 'اضافی فیچرز، سوانح و مینیجر منتخب کریں'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsMoreOpen(false)}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Sub-Page Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isCurrent = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`group relative flex items-center gap-3 p-2.5 rounded-xl border text-right transition-all duration-150 cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-inner ring-1 ring-amber-500/50'
                      : 'bg-stone-950/70 border-stone-800/80 hover:border-amber-700/50 hover:bg-stone-800/60 text-stone-200'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-gradient-to-br ${item.color} ${
                      isCurrent ? 'scale-105 shadow-md' : 'group-hover:scale-105'
                    } transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs sm:text-sm truncate">
                        {item.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] bg-amber-500 text-stone-950 font-bold px-1.5 py-0.2 rounded-full">
                          {isEn ? 'Active' : 'فعال'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-stone-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                  <ChevronLeft
                    className={`w-4 h-4 text-stone-500 group-hover:text-amber-400 transition-colors shrink-0 ${
                      isEn ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-md border-t border-amber-900/40 px-1 sm:px-2 py-1 shadow-[0_-8px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-2xl mx-auto flex items-center justify-around gap-1">
          {/* Primary 5 Tabs */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`relative flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 cursor-pointer min-w-0 ${
                  isActive
                    ? 'text-amber-400 font-bold bg-amber-950/40 border border-amber-600/30 shadow-inner'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
                }`}
              >
                {/* Badge for counts */}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 right-2 sm:right-4 bg-emerald-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {item.badge}
                  </span>
                )}

                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-sans truncate max-w-full ${
                    isActive ? 'text-amber-300 font-semibold' : 'text-stone-400'
                  }`}
                >
                  {item.label}
                </span>

                {isActive && (
                  <span className="absolute -bottom-0.5 w-5 h-0.5 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}

          {/* "More" (مزید) 6th Tab Button */}
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`relative flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 cursor-pointer min-w-0 ${
              isMoreActive || isMoreOpen
                ? 'text-amber-400 font-bold bg-amber-950/40 border border-amber-600/30 shadow-inner'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
            }`}
            title={isEn ? 'More Options' : 'مزید اختیارات'}
          >
            {/* Indicator dot if one of the sub-tabs is currently active */}
            {isMoreActive && (
              <span className="absolute -top-0.5 right-3 sm:right-5 w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm" />
            )}

            <MoreHorizontal
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                isMoreActive || isMoreOpen ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
              }`}
            />
            <span
              className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-sans truncate max-w-full ${
                isMoreActive || isMoreOpen ? 'text-amber-300 font-semibold' : 'text-stone-400'
              }`}
            >
              {t.more || (isEn ? 'More' : 'مزید')}
            </span>

            {(isMoreActive || isMoreOpen) && (
              <span className="absolute -bottom-0.5 w-5 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
