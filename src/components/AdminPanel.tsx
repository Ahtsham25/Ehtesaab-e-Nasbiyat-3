import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Download,
  Upload,
  ExternalLink,
  AlertCircle,
  Sparkles,
  GitBranch,
  RefreshCw,
  CheckCircle2,
  Lock,
  KeyRound,
  ShieldAlert,
  Cloud,
  CheckCircle,
  FileJson,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  Layers,
  HelpCircle
} from 'lucide-react';
import { VolumeData, ResponseBook } from '../types/book';
import { DEFAULT_VOLUMES, STORAGE_KEY } from '../data/defaultVolumes';
import { extractArchiveId, generateArchiveThumbnail, generateArchiveDownload } from '../utils/archiveUtils';
import {
  getGithubConfig,
  saveGithubConfig,
  fetchVolumesFromGithub,
  pushVolumesToGithub,
  DEFAULT_GITHUB_REPO,
  DEFAULT_GITHUB_BRANCH,
  LAST_SYNC_STORAGE_KEY
} from '../utils/githubSync';

interface AdminPanelProps {
  volumes: VolumeData[];
  onSaveVolumes: (updatedVolumes: VolumeData[]) => void;
  onResetVolumes: () => void;
  onSyncGithub?: () => Promise<void>;
  responseBooks?: ResponseBook[];
  onAddResponseBook?: (book: ResponseBook) => void;
  onUpdateResponseBook?: (book: ResponseBook) => void;
  onDeleteResponseBook?: (id: string) => void;
}

const ADMIN_AUTH_SESSION_KEY = 'ehtisab_admin_authenticated_session';

type AdminTab = 'responses' | 'volumes' | 'github';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  volumes,
  onSaveVolumes,
  onResetVolumes,
  responseBooks = [],
  onAddResponseBook,
  onUpdateResponseBook,
  onDeleteResponseBook,
}) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Active Admin Sub-Tab
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('responses');

  // Response Books Management State
  const [showResponseModal, setShowResponseModal] = useState<boolean>(false);
  const [editingResponseBook, setEditingResponseBook] = useState<ResponseBook | null>(null);
  const [respTitle, setRespTitle] = useState('');
  const [respAuthor, setRespAuthor] = useState('');
  const [respTopic, setRespTopic] = useState('');
  const [respDesc, setRespDesc] = useState('');
  const [respArchiveId, setRespArchiveId] = useState('');
  const [respPdfUrl, setRespPdfUrl] = useState('');
  const [respCoverUrl, setRespCoverUrl] = useState('');
  const [respPages, setRespPages] = useState<number>(100);
  const [respYear, setRespYear] = useState('اشاعت ۲۰۲۶ء');
  const [respFormError, setRespFormError] = useState<string | null>(null);

  // Volumes Management State
  const [editableVolumes, setEditableVolumes] = useState<VolumeData[]>(volumes);
  const [selectedVolId, setSelectedVolId] = useState<number>(1);
  const [saveToast, setSaveToast] = useState<{ show: boolean; msg: string; isError?: boolean }>({
    show: false,
    msg: '',
    isError: false,
  });
  const [quickArchiveUrl, setQuickArchiveUrl] = useState('');

  // GitHub Settings
  const [githubRepo, setGithubRepo] = useState<string>(DEFAULT_GITHUB_REPO);
  const [githubBranch, setGithubBranch] = useState<string>(DEFAULT_GITHUB_BRANCH);
  const [githubToken, setGithubToken] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isPushingToGit, setIsPushingToGit] = useState<boolean>(false);
  const [isPullingFromGit, setIsPullingFromGit] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    const config = getGithubConfig();
    setGithubRepo(config.repo);
    setGithubBranch(config.branch);
    setGithubToken(config.token);

    try {
      const syncTime = localStorage.getItem(LAST_SYNC_STORAGE_KEY);
      if (syncTime) setLastSyncTime(new Date(syncTime).toLocaleString('ur-PK'));
    } catch {}
  }, []);

  useEffect(() => {
    setEditableVolumes(volumes);
  }, [volumes]);

  const showToast = (msg: string, isError = false) => {
    setSaveToast({ show: true, msg, isError });
    setTimeout(() => setSaveToast({ show: false, msg: '', isError: false }), 4500);
  };

  const handleVerifyPin = (pinValue: string) => {
    const sanitized = pinValue.replace(/\s+/g, '');
    if (sanitized === '3775') {
      setIsUnlocked(true);
      try {
        sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, 'true');
      } catch {}
      setPinError('');
      setEnteredPin('');
      showToast('خوش آمدید! ایڈمن پورٹل کامیابی سے ان لاک ہو چکا ہے۔');
    } else {
      setIsShaking(true);
      setPinError('غلط پاسورڈ! ایڈمن رسائی کی اجازت نہیں ہے۔');
      setEnteredPin('');
      setTimeout(() => setIsShaking(false), 500);
      setTimeout(() => setPinError(''), 3000);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      if (nextPin.length === 4) {
        handleVerifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError('');
  };

  const handleClearPin = () => {
    setEnteredPin('');
    setPinError('');
  };

  const handleLockPortal = () => {
    setIsUnlocked(false);
    setEnteredPin('');
    try {
      sessionStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
    } catch {}
    showToast('ایڈمن پورٹل محفوظ طریقے سے لاک کر دیا گیا ہے۔');
  };

  // --- Response Books Handlers ---
  const openAddResponseModal = () => {
    setEditingResponseBook(null);
    setRespTitle('');
    setRespAuthor('');
    setRespTopic('');
    setRespDesc('');
    setRespArchiveId('');
    setRespPdfUrl('');
    setRespCoverUrl('');
    setRespPages(100);
    setRespYear('اشاعت ۲۰۲۶ء');
    setRespFormError(null);
    setShowResponseModal(true);
  };

  const openEditResponseModal = (book: ResponseBook) => {
    setEditingResponseBook(book);
    setRespTitle(book.titleUrdu);
    setRespAuthor(book.author);
    setRespTopic(book.topic || '');
    setRespDesc(book.description || '');
    setRespArchiveId(book.archiveItemId || '');
    setRespPdfUrl(book.pdfUrl || '');
    setRespCoverUrl(book.coverImageUrl || '');
    setRespPages(book.pageCount || 100);
    setRespYear(book.year || 'اشاعت ۲۰۲۶ء');
    setRespFormError(null);
    setShowResponseModal(true);
  };

  const handleAutoFillResponseArchive = () => {
    const raw = respArchiveId.trim() || respPdfUrl.trim();
    const id = extractArchiveId(raw);
    if (!id) {
      setRespFormError('برائے مہربانی درست Archive.org URL یا آئٹم آئی ڈی درج فرمائیں۔');
      return;
    }
    setRespArchiveId(id);
    setRespCoverUrl(generateArchiveThumbnail(id));
    setRespPdfUrl(generateArchiveDownload(id));
    setRespFormError(null);
    showToast('آرکائیو سے سرورق اور ڈاؤن لوڈ لنک خودکار پر ہو گیا!');
  };

  const handleSaveResponseBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!respTitle.trim()) {
      setRespFormError('برائے مہربانی کتاب کا نام / عنوان درج فرمائیں۔');
      return;
    }
    if (!respPdfUrl.trim() && !respArchiveId.trim()) {
      setRespFormError('برائے مہربانی پی ڈی ایف لنک یا آرکائیو آئی ڈی درج فرمائیں۔');
      return;
    }

    const cleanArchiveId = respArchiveId.trim();
    const finalPdf = respPdfUrl.trim() || (cleanArchiveId ? generateArchiveDownload(cleanArchiveId) : '');
    const finalCover = respCoverUrl.trim() || (cleanArchiveId ? generateArchiveThumbnail(cleanArchiveId) : '/app-logo.png');

    if (editingResponseBook) {
      if (onUpdateResponseBook) {
        onUpdateResponseBook({
          ...editingResponseBook,
          titleUrdu: respTitle.trim(),
          author: respAuthor.trim() || 'علمائے اہل سنت و محققین',
          topic: respTopic.trim(),
          description: respDesc.trim(),
          pdfUrl: finalPdf,
          archiveItemId: cleanArchiveId,
          coverImageUrl: finalCover,
          pageCount: Number(respPages) || 100,
          year: respYear.trim(),
        });
        showToast(`کتاب "${respTitle.trim()}" کی معلومات کامیابی سے اپ ڈیٹ ہو گئیں!`);
      }
    } else {
      if (onAddResponseBook) {
        const newBook: ResponseBook = {
          id: `resp-${Date.now()}`,
          titleUrdu: respTitle.trim(),
          author: respAuthor.trim() || 'علمائے اہل سنت و محققین',
          topic: respTopic.trim(),
          description: respDesc.trim(),
          pdfUrl: finalPdf,
          archiveItemId: cleanArchiveId,
          coverImageUrl: finalCover,
          pageCount: Number(respPages) || 100,
          year: respYear.trim(),
          isBookmarked: false,
          isUserAdded: true,
          createdAt: new Date().toISOString(),
        };
        onAddResponseBook(newBook);
        showToast(`نئی کتاب "${respTitle.trim()}" کامیابی سے شامل ہو گئی!`);
      }
    }
    setShowResponseModal(false);
  };

  const handleDeleteResponseBook = (book: ResponseBook) => {
    if (confirm(`کیا آپ واقعی کتاب "${book.titleUrdu}" کو حذف کرنا چاہتے ہیں؟`)) {
      if (onDeleteResponseBook) {
        onDeleteResponseBook(book.id);
        showToast(`کتاب "${book.titleUrdu}" کامیابی سے حذف کر دی گئی۔`);
      }
    }
  };

  // --- Volumes Handlers ---
  const currentVolume =
    editableVolumes.find((v) => v.id === selectedVolId) || editableVolumes[0];

  const handleFieldChange = (field: keyof VolumeData, value: any) => {
    if (!currentVolume) return;
    const updated = editableVolumes.map((vol) =>
      vol.id === currentVolume.id ? { ...vol, [field]: value } : vol
    );
    setEditableVolumes(updated);
  };

  const handleAutoFillFromArchive = () => {
    const id = extractArchiveId(quickArchiveUrl.trim());
    if (!id) {
      showToast('درست Archive.org URL یا آئٹم آئی ڈی درج فرمائیں', true);
      return;
    }

    const coverUrl = generateArchiveThumbnail(id);
    const downloadUrl = generateArchiveDownload(id);

    const updated = editableVolumes.map((vol) => {
      if (vol.id === currentVolume.id) {
        return {
          ...vol,
          archiveItemId: id,
          coverImageUrl: coverUrl,
          pdfUrl: downloadUrl,
        };
      }
      return vol;
    });

    setEditableVolumes(updated);
    setQuickArchiveUrl('');
    showToast(`جلد نمبر ${currentVolume.volumeNumber} کی معلومات خودکار بھر دی گئیں!`);
  };

  const handleSaveLocal = () => {
    onSaveVolumes(editableVolumes);
    showToast('کتب کا تمام ڈیٹا لوکل ڈیوائس پر کامیابی سے محفوظ ہو گیا!');
  };

  const handleSaveRepoSettings = () => {
    saveGithubConfig({
      repo: githubRepo,
      branch: githubBranch,
      token: githubToken,
    });
    showToast('گٹ ہب ریپوزٹری کی ترتیبات محفوظ کر لی گئیں!');
  };

  const handlePushToGithub = async () => {
    handleSaveRepoSettings();

    if (!githubToken.trim()) {
      showToast('گٹ ہب ٹوکن (PAT) درکار ہے تاکہ ریپوزٹری میں تبدیلیاں کمٹ ہو سکیں۔', true);
      return;
    }

    setIsPushingToGit(true);
    try {
      const res = await pushVolumesToGithub(editableVolumes);
      if (res.success) {
        onSaveVolumes(editableVolumes);
        setLastSyncTime(new Date().toLocaleString('ur-PK'));
        showToast(`🎉 کامیابی! ڈیٹا براہِ راست گٹ ہب (${githubRepo}) پر پش ہو گیا!`);
      } else {
        showToast(`گٹ ہب پر پش ناکام: ${res.error}`, true);
      }
    } catch (err: any) {
      showToast(`خرابی: ${err.message || 'نامعلوم مسئلہ'}`, true);
    } finally {
      setIsPushingToGit(false);
    }
  };

  const handlePullFromGithub = async () => {
    setIsPullingFromGit(true);
    try {
      const res = await fetchVolumesFromGithub();
      if (res.success && res.volumes) {
        setEditableVolumes(res.volumes);
        onSaveVolumes(res.volumes);
        setLastSyncTime(new Date().toLocaleString('ur-PK'));
        showToast(`✓ گٹ ہب کلاؤڈ سے تازہ ترین کتب کا ڈیٹا کامیابی سے حاصل کر لیا گیا!`);
      } else {
        showToast(res.error || 'گٹ ہب سے ڈیٹا حاصل نہ ہو سکا', true);
      }
    } catch (err: any) {
      showToast(`خرابی: ${err.message}`, true);
    } finally {
      setIsPullingFromGit(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(editableVolumes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ehtisab_volumes_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('JSON بیک اپ کامیابی سے ڈاؤنلوڈ ہو گیا۔');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && json.length > 0) {
          setEditableVolumes(json);
          onSaveVolumes(json);
          showToast('JSON بیک اپ سے تمام جلدیں بحال کر دی گئیں!');
        } else {
          showToast('غلط فائل فارمیٹ: درست JSON منتخب فرمائیں۔', true);
        }
      } catch {
        showToast('فائل پڑھنے میں ناکامی۔ درست JSON فائل منتخب فرمائیں۔', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const githubRepoUrl = `https://github.com/${githubRepo.trim()}`;
  const githubEditJsonUrl = `https://github.com/${githubRepo.trim()}/edit/${githubBranch.trim()}/public/data/volumes.json`;

  // LOCKED STATE: PIN Pad UI
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div
          className={`bg-stone-900/90 border border-amber-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center backdrop-blur-md ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="font-nastaliq text-2xl font-bold text-amber-300">
              ایڈمن پورٹل محفوظ رسائی
            </h2>
            <p className="text-xs text-stone-400 font-sans">
              براہِ کرم ایڈمن پورٹل ان لاک کرنے کے لیے ۴ ہندسوں کا پن کوڈ درج فرمائیں۔
            </p>
          </div>

          {/* 4 Dots PIN Indicator */}
          <div className="flex justify-center items-center gap-3 py-2">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = enteredPin.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                    isFilled
                      ? 'bg-amber-400 border-amber-300 scale-125 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                      : 'bg-stone-800 border-stone-700'
                  }`}
                />
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (enteredPin) handleVerifyPin(enteredPin);
            }}
            className="flex justify-center"
          >
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={enteredPin}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val.length <= 4) {
                  setEnteredPin(val);
                  if (val.length === 4) handleVerifyPin(val);
                }
              }}
              placeholder="پاسورڈ درج کریں"
              className="w-40 text-center tracking-widest text-lg font-mono py-2 bg-stone-950 border border-stone-700 rounded-xl text-amber-300 focus:outline-none focus:border-amber-400"
            />
          </form>

          {pinError && (
            <div className="text-xs font-semibold text-rose-400 flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>{pinError}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-12 rounded-2xl bg-stone-800/90 hover:bg-amber-500 hover:text-stone-950 text-stone-200 text-lg font-mono font-bold transition-all active:scale-95 border border-stone-700/60 shadow-md cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClearPin}
              className="h-12 rounded-2xl bg-stone-900/90 hover:bg-stone-800 text-stone-400 text-xs font-sans transition-all active:scale-95 border border-stone-800 cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-12 rounded-2xl bg-stone-800/90 hover:bg-amber-500 hover:text-stone-950 text-stone-200 text-lg font-mono font-bold transition-all active:scale-95 border border-stone-700/60 shadow-md cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 rounded-2xl bg-stone-900/90 hover:bg-stone-800 text-stone-400 text-xs font-sans transition-all active:scale-95 border border-stone-800 cursor-pointer"
            >
              ⌫
            </button>
          </div>

          <div className="pt-2 border-t border-stone-800/80 text-[11px] text-stone-500 flex items-center justify-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-amber-500/70" />
            <span>پاسورڈ کا اشارہ: <strong>37 75</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // UNLOCKED STATE: Full Admin Portal
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {saveToast.show && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold border ${
            saveToast.isError ? 'bg-rose-600 border-rose-400' : 'bg-emerald-600 border-emerald-400'
          }`}
        >
          {saveToast.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{saveToast.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900/90 to-stone-950 border border-amber-900/30 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
            <Settings className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="font-nastaliq text-2xl sm:text-3xl font-bold text-amber-300">
              مرکزی ایڈمن پینل
            </h2>
            <p className="text-xs text-stone-400 font-sans mt-0.5">
              یہاں سے آپ "احتساب ناصبیت پر اعتراضات کے جوابات" کی کتب داخل کر سکتے ہیں اور ۱۲ جلدوں کا انتظام کر سکتے ہیں۔
            </p>
          </div>
        </div>

        <button
          onClick={handleLockPortal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 transition-colors cursor-pointer shadow-sm self-end sm:self-center"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>پورٹل لاک کریں</span>
        </button>
      </div>

      {/* Sub-Tabs Navigation Strip */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-stone-950 border border-stone-800 rounded-2xl shadow-inner">
        <button
          onClick={() => setActiveAdminTab('responses')}
          className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all cursor-pointer ${
            activeAdminTab === 'responses'
              ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 shadow-md scale-[1.01]'
              : 'text-stone-300 hover:text-amber-300 hover:bg-stone-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="font-nastaliq text-base sm:text-lg">اعتراضات کے جوابات (کتب داخل کریں)</span>
          <span className="bg-stone-950/40 text-xs px-2 py-0.5 rounded-full font-mono">
            {responseBooks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminTab('volumes')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all cursor-pointer ${
            activeAdminTab === 'volumes'
              ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 shadow-md scale-[1.01]'
              : 'text-stone-300 hover:text-amber-300 hover:bg-stone-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="font-nastaliq text-base sm:text-lg">بارہ جلدوں کی ترتیبات</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('github')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all cursor-pointer ${
            activeAdminTab === 'github'
              ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 shadow-md scale-[1.01]'
              : 'text-stone-300 hover:text-amber-300 hover:bg-stone-900'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span className="font-nastaliq text-base sm:text-lg">گٹ ہب کلاؤڈ سنک</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: MANAGE "احتساب ناصبیت پر اعتراضات کے جوابات" BOOKS */}
      {/* ============================================================== */}
      {activeAdminTab === 'responses' && (
        <div className="space-y-5">
          {/* Section Header & Add Book Button */}
          <div className="bg-gradient-to-r from-amber-950/60 via-stone-900 to-emerald-950/60 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold font-sans mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>شعبہ: احتساب ناصبیت پر اعتراضات کے جوابات</span>
              </div>
              <h3 className="font-nastaliq text-2xl font-bold text-amber-300">
                کتب داخل و ترمیم کرنے کا شعبہ
              </h3>
              <p className="text-xs text-stone-300 font-sans mt-0.5">
                صرف ایڈمن یہاں سے نئی کتب داخل یا حذف کر سکتا ہے۔ صارفین صرف پڑھ اور ڈاؤن لوڈ کر سکیں گے۔
              </p>
            </div>

            <button
              onClick={openAddResponseModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="font-nastaliq text-base">نئی کتاب داخل کریں</span>
            </button>
          </div>

          {/* List of Existing Response Books */}
          {responseBooks.length === 0 ? (
            <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-10 text-center text-stone-400">
              <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-2" />
              <h4 className="font-nastaliq text-xl text-amber-300 mb-1">ابھی تک کوئی کتاب داخل نہیں کی گئی</h4>
              <p className="text-xs font-sans mb-4">
                "نئی کتاب داخل کریں" بٹن دبا کر پہلی کتاب کا اندراج فرمائیں۔
              </p>
              <button
                onClick={openAddResponseModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>کتاب داخل کریں</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {responseBooks.map((book) => (
                <div
                  key={book.id}
                  className="bg-stone-900/90 border border-stone-800 hover:border-amber-600/40 rounded-3xl p-4 sm:p-5 transition-all shadow-md flex flex-col justify-between"
                >
                  <div className="flex gap-4">
                    {/* Cover Preview */}
                    <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden bg-stone-950 border border-stone-800 shrink-0 shadow relative">
                      <img
                        src={book.coverImageUrl || '/app-logo.png'}
                        alt={book.titleUrdu}
                        onError={(e) => ((e.target as any).src = '/app-logo.png')}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/80 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-mono">
                        {book.pageCount} ص
                      </div>
                    </div>

                    {/* Book Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-600/40 font-semibold">
                          رد اعتراضات
                        </span>
                        {book.year && (
                          <span className="text-[10px] text-stone-400 font-sans">{book.year}</span>
                        )}
                      </div>

                      <h4 className="font-nastaliq text-lg sm:text-xl font-bold text-amber-300 leading-snug line-clamp-2 mb-1">
                        {book.titleUrdu}
                      </h4>

                      <p className="text-xs text-stone-400 font-sans mb-1 flex items-center gap-1">
                        <span className="text-emerald-400 font-bold">مصنف / ادارہ:</span>
                        <span className="truncate">{book.author}</span>
                      </p>

                      {book.topic && (
                        <p className="text-[11px] text-stone-300 font-sans line-clamp-2 leading-relaxed">
                          {book.topic}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Admin Actions Strip */}
                  <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditResponseModal(book)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-sans transition-all cursor-pointer"
                        title="کتاب کی معلومات ایڈٹ کریں"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>ترمیم کریں</span>
                      </button>

                      <button
                        onClick={() => handleDeleteResponseBook(book)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-sans transition-all cursor-pointer"
                        title="کتاب حذف کریں"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف کریں</span>
                      </button>
                    </div>

                    <span className="text-[10px] text-stone-500 font-mono">
                      ID: {book.id.slice(-6)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ADD / EDIT BOOK MODAL FOR ADMIN */}
          {showResponseModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
              <div className="w-full max-w-xl bg-stone-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-stone-100 font-nastaliq text-xl font-bold">
                        {editingResponseBook ? 'کتاب کی معلومات میں ترمیم' : 'نئی کتاب کا اندراج (ایڈمن)'}
                      </h3>
                      <p className="text-[11px] text-stone-400 font-sans">
                        یہ کتاب براہِ راست "احتساب ناصبیت پر اعتراضات کے جوابات" میں شامل ہوگی۔
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowResponseModal(false)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {respFormError && (
                  <div className="mb-4 p-3 bg-rose-950/60 border border-rose-600/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 font-sans">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{respFormError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveResponseBook} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                      کتاب کا نام / عنوان (لازمی) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: احتساب ناصبیت پر اعتراضات کا علمی رد"
                      value={respTitle}
                      onChange={(e) => setRespTitle(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-amber-200 font-nastaliq focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                        مصنف / مرتب / ادارہ
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: علمائے اہل سنت"
                        value={respAuthor}
                        onChange={(e) => setRespAuthor(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-sans focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                        اشاعت / سال
                      </label>
                      <input
                        type="text"
                        placeholder="اشاعت ۲۰۲۶ء"
                        value={respYear}
                        onChange={(e) => setRespYear(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-sans focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                      موضوع و مختصر خلاصہ
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: شبہات کا مسکت جواب اور تاریخی حقائق"
                      value={respTopic}
                      onChange={(e) => setRespTopic(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-sans focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Archive Auto Fill Helper */}
                  <div className="bg-stone-950/80 p-3 rounded-2xl border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-amber-300 font-sans">
                        انٹرنیٹ آرکائیو آئی ڈی یا لنک (Archive.org Item ID)
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoFillResponseArchive}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-600/40 px-2.5 py-0.5 rounded-lg cursor-pointer"
                      >
                        خودکار معلومات بھریں
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="مثال: ehtesabe-nasbiat-by-allah-wasaya-deobandi-1"
                      value={respArchiveId}
                      onChange={(e) => setRespArchiveId(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[10px] text-stone-500 font-sans">
                      آرکائیو آئی ڈی درج کر کے "خودکار معلومات بھریں" دبائیں تو کور تصویر اور پی ڈی ایف لنک خود بخود بن جائیں گے۔
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                      پی ڈی ایف فائل کا ربط (Direct PDF URL) *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://ia800903.us.archive.org/.../book.pdf"
                      value={respPdfUrl}
                      onChange={(e) => setRespPdfUrl(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                        سرورق تصویر کا لنک (Cover Image URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://archive.org/services/img/..."
                        value={respCoverUrl}
                        onChange={(e) => setRespCoverUrl(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                        کل صفحات (Page Count)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={respPages}
                        onChange={(e) => setRespPages(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                      کتاب کا تعارف و تفصیل (Description)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="کتاب کے مندرجات کا تعارف..."
                      value={respDesc}
                      onChange={(e) => setRespDesc(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-nastaliq"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowResponseModal(false)}
                      className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-sans cursor-pointer"
                    >
                      منسوخ کریں
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm font-nastaliq cursor-pointer shadow-lg active:scale-95"
                    >
                      {editingResponseBook ? 'تبدیلیاں محفوظ کریں' : 'کتاب داخل کریں'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: 12 VOLUMES SETTINGS */}
      {/* ============================================================== */}
      {activeAdminTab === 'volumes' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
            <div>
              <h3 className="font-nastaliq text-xl font-bold text-amber-300">
                بارہ جلدوں کا انتخاب اور معلومات
              </h3>
              <p className="text-xs text-stone-400 font-sans mt-0.5">
                جس جلد کی تفصیلات تبدیل کرنی ہوں اسے منتخب فرمائیں۔
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveLocal}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer font-sans"
              >
                <Save className="w-3.5 h-3.5" />
                <span>محفوظ کریں</span>
              </button>
              <button
                onClick={onResetVolumes}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-sans transition-colors cursor-pointer"
                title="ڈیفالٹ پر بحال کریں"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ری سیٹ</span>
              </button>
            </div>
          </div>

          {/* Quick Archive URL Helper */}
          <div className="bg-stone-950/80 p-3.5 rounded-2xl border border-stone-800/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 font-sans">
              <Sparkles className="w-3.5 h-3.5" />
              <span>فوری آرکائیو (Archive.org) سے خودکار معلومات حاصل کریں:</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="آرکائیو آئی ڈی یا URL چسپاں کریں..."
                value={quickArchiveUrl}
                onChange={(e) => setQuickArchiveUrl(e.target.value)}
                className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                onClick={handleAutoFillFromArchive}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 font-sans"
              >
                خودکار بھریں
              </button>
            </div>
          </div>

          {/* Volume Grid Selector (1-12) */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
            {editableVolumes.map((vol) => (
              <button
                key={vol.id}
                onClick={() => setSelectedVolId(vol.id)}
                className={`py-2 px-1 text-center rounded-xl border text-xs font-sans transition-all cursor-pointer ${
                  selectedVolId === vol.id
                    ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-md scale-105'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                جلد {vol.volumeNumber}
              </button>
            ))}
          </div>

          {/* Edit Form for Selected Volume */}
          {currentVolume && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-stone-800">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                  عنوانِ جلد (Urdu Title)
                </label>
                <input
                  type="text"
                  value={currentVolume.volumeTitleUrdu}
                  onChange={(e) => handleFieldChange('volumeTitleUrdu', e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-nastaliq text-base focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                  موضوع و خلاصہ (Topic)
                </label>
                <input
                  type="text"
                  value={currentVolume.topic}
                  onChange={(e) => handleFieldChange('topic', e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                  کل صفحات (Page Count)
                </label>
                <input
                  type="number"
                  value={currentVolume.pageCount}
                  onChange={(e) => handleFieldChange('pageCount', parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                  فائل کا سائز (File Size)
                </label>
                <input
                  type="text"
                  value={currentVolume.fileSize}
                  onChange={(e) => handleFieldChange('fileSize', e.target.value)}
                  placeholder="مثال: 14 MB"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                  انٹرنیٹ آرکائیو آئٹم آئی ڈی (Archive Item ID)
                </label>
                <input
                  type="text"
                  value={currentVolume.archiveItemId || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    handleFieldChange('archiveItemId', id);
                    if (id) {
                      handleFieldChange('coverImageUrl', generateArchiveThumbnail(id));
                      handleFieldChange('pdfUrl', generateArchiveDownload(id));
                    }
                  }}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                  پی ڈی ایف فائل کا ربط (PDF Download URL)
                </label>
                <input
                  type="url"
                  value={currentVolume.pdfUrl}
                  onChange={(e) => handleFieldChange('pdfUrl', e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                  ٹائٹل / کور تصویر کا ربط (Cover Image URL)
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="url"
                    value={currentVolume.coverImageUrl}
                    onChange={(e) => handleFieldChange('coverImageUrl', e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-400"
                  />
                  <img
                    src={currentVolume.coverImageUrl}
                    alt="پیش منظر"
                    onError={(e) => ((e.target as any).src = '/app-logo.png')}
                    className="w-12 h-16 object-cover rounded-lg border border-amber-500/40 shadow shrink-0"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                  مختصر تعارف و خلاصہ (Description)
                </label>
                <textarea
                  rows={2}
                  value={currentVolume.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="جلد کے مباحث کا مختصر تعارف..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-nastaliq"
                />
              </div>
            </div>
          )}

          {/* Backup & Export Options */}
          <div className="pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-stone-400 font-sans">کتب کے تمام ریکارڈ کا بیک اپ محفوظ کریں:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border border-stone-700 font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>بیک اپ ڈاؤن لوڈ (JSON)</span>
              </button>
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border border-stone-700 font-semibold cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>بیک اپ امپورٹ</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 3: GITHUB CLOUD BACKEND INTEGRATION */}
      {/* ============================================================== */}
      {activeAdminTab === 'github' && (
        <div className="bg-gradient-to-b from-stone-900 via-stone-900/90 to-stone-950 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-nastaliq text-xl font-bold text-emerald-300">
                    گٹ ہب لائیو بیک اینڈ کنکشن
                  </h3>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600/50 px-2 py-0.5 rounded-full font-sans font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    مربوط
                  </span>
                </div>
                <p className="text-xs text-stone-400 font-sans mt-0.5">
                  آپ کی ریپوزٹری <code className="text-amber-300 font-mono font-bold">{githubRepo}</code> کا ڈیٹا صارفین کی ایپ میں لائیو اپ ڈیٹ ہوتا ہے۔
                </p>
              </div>
            </div>

            {lastSyncTime && (
              <div className="text-[11px] text-stone-400 font-sans bg-stone-950/80 px-3 py-1 rounded-xl border border-stone-800">
                آخری سنک: <span className="text-emerald-400 font-semibold">{lastSyncTime}</span>
              </div>
            )}
          </div>

          {/* GitHub Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                گٹ ہب ریپوزٹری (Owner/Repo)
              </label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="Ahtsham25/Ehtesaab-e-Nasbiyat-3"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                برانچ (Branch)
              </label>
              <input
                type="text"
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value)}
                placeholder="main"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-300 font-sans">
                  گٹ ہب ٹوکن (PAT)
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[10px] text-stone-400 hover:text-amber-300 cursor-pointer"
                >
                  {showToken ? 'چھپائیں' : 'دکھائیں'}
                </button>
              </div>
              <input
                type={showToken ? 'text' : 'password'}
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Action Buttons for GitHub Cloud */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-stone-800">
            <button
              onClick={handlePushToGithub}
              disabled={isPushingToGit}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-stone-950 font-bold text-xs transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              {isPushingToGit ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{isPushingToGit ? 'گٹ ہب پر کمٹ ہو رہا ہے...' : 'گٹ ہب پر محفوظ کریں (Push to GitHub)'}</span>
            </button>

            <button
              onClick={handlePullFromGithub}
              disabled={isPullingFromGit}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs transition-all border border-stone-700 cursor-pointer disabled:opacity-50"
            >
              {isPullingFromGit ? (
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <RefreshCw className="w-4 h-4 text-amber-400" />
              )}
              <span>{isPullingFromGit ? 'ڈاؤن لوڈ ہو رہا ہے...' : 'گٹ ہب سے تازہ ڈیٹا لائیں (Pull)'}</span>
            </button>

            <a
              href={githubEditJsonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-amber-300 text-xs font-semibold border border-amber-600/30 transition-colors"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>گٹ ہب ویب سائٹ پر ایڈیٹ کریں</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </a>

            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 text-xs font-semibold border border-stone-700 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-stone-400" />
              <span>ریپوزٹری کھولیں</span>
            </a>
          </div>

          {/* Guidance Box */}
          <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-2xl p-3.5 text-xs text-stone-300 space-y-1.5 font-sans">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>یہ بیک اینڈ سسٹم کیسے کام کرتا ہے؟</span>
            </div>
            <p className="leading-relaxed text-stone-400">
              1. تمام کتب کا ریکارڈ آپ کے گٹ ہب میں <code className="text-amber-300 font-mono">public/data/volumes.json</code> کے اندر محفوظ ہے۔
            </p>
            <p className="leading-relaxed text-stone-400">
              2. جب آپ اس پورٹل سے تبدیلیاں کر کے <strong>"گٹ ہب پر محفوظ کریں"</strong> دباتے ہیں یا براہِ راست گٹ ہب پر فائل ایڈیٹ کرتے ہیں، تو تمام صارفین کے موبائل میں ایپ کھلتے ہی نیا ڈیٹا خودکار طور پر آ جاتا ہے۔
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
