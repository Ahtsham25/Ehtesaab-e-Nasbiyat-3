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
  FileJson
} from 'lucide-react';
import { VolumeData } from '../types/book';
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
}

const ADMIN_AUTH_SESSION_KEY = 'ehtisab_admin_authenticated_session';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  volumes,
  onSaveVolumes,
  onResetVolumes,
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

  const [editableVolumes, setEditableVolumes] = useState<VolumeData[]>(volumes);
  const [selectedVolId, setSelectedVolId] = useState<number>(1);
  const [saveToast, setSaveToast] = useState<{ show: boolean; msg: string; isError?: boolean }>({
    show: false,
    msg: '',
    isError: false,
  });
  const [quickArchiveUrl, setQuickArchiveUrl] = useState('');

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
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].volumeNumber) {
          setEditableVolumes(parsed);
          onSaveVolumes(parsed);
          showToast(`کامیابی! ${parsed.length} جلدوں کا ڈیٹا امپورٹ ہو گیا۔`);
        } else {
          showToast('درست فارمیٹ والی کتب کی JSON فائل منتخب کریں', true);
        }
      } catch {
        showToast('فائل پڑھنے میں خرابی پیش آئی', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const githubRepoUrl = `https://github.com/${githubRepo}`;
  const githubEditJsonUrl = `https://github.com/${githubRepo}/edit/${githubBranch}/public/data/volumes.json`;

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[65vh]">
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

        <div
          className={`w-full bg-gradient-to-b from-stone-900 via-stone-900/95 to-stone-950 border border-amber-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 ${
            isShaking ? 'animate-bounce border-rose-500 ring-2 ring-rose-500/30' : ''
          }`}
        >
          <div className="relative w-20 h-20 mx-auto">
            <img
              src="/app-logo.png"
              alt="احتساب ناصبیت لوگو"
              className="w-20 h-20 object-cover rounded-2xl border-2 border-amber-500/50 shadow-xl"
            />
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-amber-950 border border-amber-500/60 shadow-md">
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <div>
            <h2 className="font-nastaliq text-2xl sm:text-3xl font-bold text-amber-300">
              محفوظ ایڈمن پورٹل
            </h2>
            <p className="text-xs text-stone-400 mt-1.5 font-sans leading-relaxed">
              گٹ ہب کلاؤڈ بیک اینڈ اور کتب کے انتظامات کے لیے 4 ہندسوں کا پاسورڈ درج فرمائیں۔
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 py-2">
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
              ایڈمن و گٹ ہب کلاؤڈ پورٹل
            </h2>
            <p className="text-xs text-stone-400 font-sans mt-0.5">
              گٹ ہب ریپوزٹری کو بطور لائیو کلاؤڈ بیک اینڈ استعمال کریں اور کتب کا ڈیٹا اپ ڈیٹ فرمائیں۔
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

      {/* SECTION 1: GITHUB CLOUD BACKEND INTEGRATION */}
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

      {/* SECTION 2: VOLUME SELECTION & FORM */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div>
            <h3 className="font-nastaliq text-xl font-bold text-amber-300">
              جلد کا انتخاب اور معلومات
            </h3>
            <p className="text-xs text-stone-400 font-sans mt-0.5">
              جس جلد کی تفصیلات تبدیل کرنی ہوں اسے منتخب فرمائیں۔
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveLocal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors cursor-pointer shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>لوکل محفوظ کریں</span>
            </button>
            <button
              onClick={onResetVolumes}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>ری سیٹ</span>
            </button>
          </div>
        </div>

        {/* Volume Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {editableVolumes.map((vol) => (
            <button
              key={vol.id}
              onClick={() => setSelectedVolId(vol.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer border ${
                selectedVolId === vol.id
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-105'
                  : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-amber-600/40'
              }`}
            >
              جلد {vol.volumeNumber} ({vol.volumeTitleUrdu})
            </button>
          ))}
        </div>

        {/* Internet Archive Auto-Fill Tool */}
        <div className="bg-stone-950/80 border border-amber-500/20 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-sans">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>انٹرنیٹ آرکائیو (Archive.org) سے خودکار ڈیٹا لائیں:</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickArchiveUrl}
              onChange={(e) => setQuickArchiveUrl(e.target.value)}
              placeholder="مثال: ehtisab-e-nasbiyat-vol-01 یا مکمل archive.org لنک"
              className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={handleAutoFillFromArchive}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
            >
              خودکار ڈیٹا بھریں
            </button>
          </div>
        </div>

        {/* Form Fields for Selected Volume */}
        {currentVolume && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                اردو عنوان (مثال: جلد اول)
              </label>
              <input
                type="text"
                value={currentVolume.volumeTitleUrdu}
                onChange={(e) => handleFieldChange('volumeTitleUrdu', e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-nastaliq"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                موضوع / مبحث (Topic)
              </label>
              <input
                type="text"
                value={currentVolume.topic || ''}
                onChange={(e) => handleFieldChange('topic', e.target.value)}
                placeholder="جلد کا مرکزی موضوع درج کریں"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-nastaliq"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                صفحات کی تعداد (Page Count)
              </label>
              <input
                type="number"
                value={currentVolume.pageCount}
                onChange={(e) => handleFieldChange('pageCount', parseInt(e.target.value) || 0)}
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
                placeholder="مثال: 34 MB"
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
      </div>

      {/* SECTION 3: BACKUP, EXPORT & IMPORT */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-stone-400 font-sans">
          <span>کتب کے تمام ریکارڈ کا بیک اپ اپنے کمپیوٹر یا فون میں محفوظ کریں:</span>
        </div>
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
  );
};
