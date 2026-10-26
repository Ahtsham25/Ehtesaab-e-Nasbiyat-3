import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Download,
  Upload,
  ExternalLink,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Sparkles,
  GitBranch,
  Copy,
  RefreshCw,
  Key,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { VolumeData } from '../types/book';
import { DEFAULT_VOLUMES, STORAGE_KEY } from '../data/defaultVolumes';
import { extractArchiveId, generateArchiveThumbnail, generateArchiveDownload } from '../utils/archiveUtils';

interface AdminPanelProps {
  volumes: VolumeData[];
  onSaveVolumes: (updatedVolumes: VolumeData[]) => void;
  onResetVolumes: () => void;
}

const GITHUB_REPO = 'Ahtsham25/Ehtsaab-E-Nasbiyat-';
const GITHUB_FILE_PATH = 'src/data/defaultVolumes.ts';
const GITHUB_TOKEN_STORAGE_KEY = 'ehtisab_github_pat_v1';
const GITHUB_BRANCH_STORAGE_KEY = 'ehtisab_github_branch_v1';
const ADMIN_AUTH_SESSION_KEY = 'ehtisab_admin_authenticated_session';

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(base64: string): string {
  const clean = base64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function generateDefaultVolumesTs(volumes: VolumeData[]): string {
  const cleanVolumes = volumes.map((v) => ({
    id: v.id,
    volumeNumber: v.volumeNumber,
    volumeTitleUrdu: v.volumeTitleUrdu,
    topic: v.topic,
    archiveItemId: v.archiveItemId || '',
    coverImageUrl: v.coverImageUrl,
    pdfUrl: v.pdfUrl,
    pageCount: v.pageCount,
    fileSize: v.fileSize,
    description: v.description,
    year: v.year || `جلد ${v.volumeNumber}`,
    isBookmarked: false,
    isDownloaded: false
  }));

  return `import { VolumeData } from '../types/book';

export const DEFAULT_VOLUMES: VolumeData[] = ${JSON.stringify(cleanVolumes, null, 2)};

export const STORAGE_KEY = 'ehtisab_nasbiyat_volumes_v1';
export const BOOKMARKS_STORAGE_KEY = 'ehtisab_nasbiyat_bookmarks_v1';
`;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  volumes,
  onSaveVolumes,
  onResetVolumes,
}) => {
  // Password Lock State
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

  // GitHub integration states
  const [githubToken, setGithubToken] = useState('');
  const [branch, setBranch] = useState('main');
  const [isPushingToGit, setIsPushingToGit] = useState(false);
  const [isPullingFromGit, setIsPullingFromGit] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [lastCommitSha, setLastCommitSha] = useState<string | null>(null);

  // Load saved GitHub token and branch from localStorage
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY);
      if (savedToken) setGithubToken(savedToken);
      const savedBranch = localStorage.getItem(GITHUB_BRANCH_STORAGE_KEY);
      if (savedBranch) setBranch(savedBranch);
    } catch {}
  }, []);

  const saveGithubSettings = (token: string, br: string) => {
    try {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(GITHUB_BRANCH_STORAGE_KEY, br);
    } catch {}
  };

  const showToast = (msg: string, isError = false) => {
    setSaveToast({ show: true, msg, isError });
    setTimeout(() => setSaveToast({ show: false, msg: '', isError: false }), 4000);
  };

  // Password verification (Required: 3775 or 37 75)
  const handleVerifyPin = (pinValue: string) => {
    const sanitized = pinValue.replace(/\s+/g, '');
    if (sanitized === '3775') {
      setIsUnlocked(true);
      try {
        sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, 'true');
      } catch {}
      setPinError('');
      setEnteredPin('');
      showToast('خوش آمدید ایڈمن! پورٹل کامیابی سے ان لاک ہو چکا ہے۔');
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

  // IF NOT UNLOCKED: RENDER SECURE LOCK SCREEN (PASSWORD 37 75)
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[65vh]">
        {/* Toast Notification */}
        {saveToast.show && (
          <div
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4 border ${
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
          {/* Logo & Lock Badge */}
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
              یہ پورٹل صرف بااختیار ایڈمن کے لیے ہے۔ رسائی کے لیے پاسورڈ درج فرمائیں۔
            </p>
          </div>

          {/* Masked PIN Indicator Dots */}
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

          {/* Hidden/Direct Input Field for Physical Keyboards */}
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
              maxLength={4}
              value={enteredPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setEnteredPin(val);
                if (val.length === 4) handleVerifyPin(val);
              }}
              placeholder="پاسورڈ درج کریں"
              className="w-40 text-center bg-stone-950/90 border border-stone-700 focus:border-amber-500 rounded-xl py-2 px-3 text-lg font-mono tracking-widest text-amber-300 placeholder-stone-600 focus:outline-none"
              autoFocus
            />
          </form>

          {/* Error Message */}
          {pinError && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-sans animate-pulse">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {/* Sleek Virtual Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-12 rounded-2xl bg-stone-800/90 hover:bg-stone-700/90 active:bg-amber-600 active:text-stone-950 text-stone-100 font-mono font-bold text-lg border border-stone-700/60 shadow-sm transition-all cursor-pointer flex items-center justify-center"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClearPin}
              title="صاف کریں"
              className="h-12 rounded-2xl bg-stone-900/90 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs font-sans border border-stone-800 shadow-sm transition-colors cursor-pointer flex items-center justify-center"
            >
              صاف
            </button>

            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-12 rounded-2xl bg-stone-800/90 hover:bg-stone-700/90 active:bg-amber-600 active:text-stone-950 text-stone-100 font-mono font-bold text-lg border border-stone-700/60 shadow-sm transition-all cursor-pointer flex items-center justify-center"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              title="مٹائیں"
              className="h-12 rounded-2xl bg-stone-900/90 hover:bg-stone-800 text-rose-400 hover:text-rose-300 text-sm font-sans border border-stone-800 shadow-sm transition-colors cursor-pointer flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          <p className="text-[11px] text-stone-500 pt-1 font-sans">
            عام قارئین کے لیے یہ سیکشن مقفل ہے۔
          </p>
        </div>
      </div>
    );
  }

  // UNLOCKED VIEW: FULL ADMIN PANEL
  const currentVol = editableVolumes.find((v) => v.id === selectedVolId) || editableVolumes[0];

  const handleFieldChange = (field: keyof VolumeData, value: any) => {
    setEditableVolumes((prev) =>
      prev.map((v) => (v.id === selectedVolId ? { ...v, [field]: value } : v))
    );
  };

  // Helper when user pastes an archive link into the quick helper for current volume
  const handleApplyQuickArchive = () => {
    if (!quickArchiveUrl) return;
    const archiveId = extractArchiveId(quickArchiveUrl);
    if (archiveId) {
      const thumb = generateArchiveThumbnail(archiveId);
      const pdf = generateArchiveDownload(archiveId);
      setEditableVolumes((prev) =>
        prev.map((v) =>
          v.id === selectedVolId
            ? {
                ...v,
                archiveItemId: archiveId,
                coverImageUrl: thumb,
                pdfUrl: pdf,
              }
            : v
        )
      );
      setQuickArchiveUrl('');
      showToast('آرکائیو لنکس کامیابی سے خودکار طریقے سے تیار کر دیے گئے!');
    } else {
      showToast('درست آرکائیو لنک درج فرمائیں۔', true);
    }
  };

  // In-App Local Save
  const handleSaveLocal = () => {
    onSaveVolumes(editableVolumes);
    showToast('تبدیلیاں ایپلیکیشن میں محفوظ کر دی گئی ہیں!');
  };

  // Copy TypeScript code for pasting into GitHub
  const handleCopyCodeForGithub = () => {
    const tsCode = generateDefaultVolumesTs(editableVolumes);
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(tsCode).then(() => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
        showToast('مکمل TypeScript کوڈ کاپی ہو گیا ہے! اب آپ گٹ ہب میں پیسٹ کر سکتے ہیں۔');
      });
    } else {
      setShowCodeModal(true);
    }
  };

  // Commit & Push to GitHub via GitHub REST API
  const handlePushToGithub = async () => {
    if (!githubToken.trim()) {
      showToast('براہ کرم گٹ ہب پرسنل ایکسس ٹوکن (PAT) درج فرمائیں!', true);
      return;
    }

    saveGithubSettings(githubToken.trim(), branch.trim());
    setIsPushingToGit(true);

    try {
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
      
      // Step 1: Get current file to retrieve latest SHA
      let currentSha: string | null = null;
      const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
        headers: {
          Authorization: `Bearer ${githubToken.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (getRes.ok) {
        const fileInfo = await getRes.json();
        currentSha = fileInfo.sha;
      } else if (getRes.status !== 404) {
        const errJson = await getRes.json().catch(() => ({}));
        throw new Error(errJson.message || `گٹ ہب سے فائل کی معلومات لانے میں نقص: HTTP ${getRes.status}`);
      }

      // Step 2: Generate TypeScript Code & Base64 Encode
      const newTsContent = generateDefaultVolumesTs(editableVolumes);
      const encodedContent = utf8ToBase64(newTsContent);

      // Step 3: PUT request to commit changes
      const commitRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${githubToken.trim()}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `کتب احتساب ناصبیت کا ڈیٹا اپڈیٹ بذریعہ ایڈمن پینل (${new Date().toLocaleDateString('ur-PK')})`,
          content: encodedContent,
          branch: branch,
          ...(currentSha ? { sha: currentSha } : {}),
        }),
      });

      if (!commitRes.ok) {
        const errJson = await commitRes.json().catch(() => ({}));
        throw new Error(errJson.message || `گٹ ہب پر کمٹ کرنے میں خرابی واقع ہوئی (HTTP ${commitRes.status})`);
      }

      const commitData = await commitRes.json();
      setLastCommitSha(commitData?.commit?.sha?.slice(0, 7) || 'success');
      
      // Also update local app state
      onSaveVolumes(editableVolumes);
      showToast(`کامیابی! تمام کتب کا ڈیٹا براہِ راست گٹ ہب (${GITHUB_REPO}) پر کمٹ اور پش ہو چکا ہے!`);
    } catch (err: any) {
      console.error('GitHub Push Error:', err);
      showToast(`گٹ ہب خرابی: ${err.message || 'کنکشن فیل ہو گیا'}`, true);
    } finally {
      setIsPushingToGit(false);
    }
  };

  // Pull latest volumes from GitHub
  const handlePullFromGithub = async () => {
    setIsPullingFromGit(true);
    try {
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${branch}/${GITHUB_FILE_PATH}`;
      const res = await fetch(rawUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const tsText = await res.text();
      const match = tsText.match(/DEFAULT_VOLUMES\s*:\s*VolumeData\[\]\s*=\s*(\[[\s\S]*?\]);/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEditableVolumes(parsed);
          onSaveVolumes(parsed);
          showToast('گٹ ہب سے تازہ ترین ۱۲ جلدوں کا ڈیٹا کامیابی سے سنک ہو گیا ہے!');
          return;
        }
      }
      throw new Error('فائل سے ڈیٹا پارس نہیں ہو سکا');
    } catch (err: any) {
      console.warn('Raw pull failed, trying API:', err);
      try {
        const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${encodeURIComponent(branch)}`;
        const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
        if (githubToken.trim()) headers['Authorization'] = `Bearer ${githubToken.trim()}`;

        const apiRes = await fetch(apiUrl, { headers });
        if (!apiRes.ok) throw new Error(`HTTP ${apiRes.status}`);
        const data = await apiRes.json();
        const content = base64ToUtf8(data.content);
        const match = content.match(/DEFAULT_VOLUMES\s*:\s*VolumeData\[\]\s*=\s*(\[[\s\S]*?\]);/);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEditableVolumes(parsed);
            onSaveVolumes(parsed);
            showToast('گٹ ہب سے تازہ ترین ۱۲ جلدوں کا ڈیٹا کامیابی سے سنک ہو گیا ہے!');
            return;
          }
        }
        throw new Error('فائل فارمیٹ درست نہیں ملا');
      } catch (innerErr: any) {
        showToast(`گٹ ہب سے ڈیٹا لانے میں خرابی: ${innerErr.message}`, true);
      }
    } finally {
      setIsPullingFromGit(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(editableVolumes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'ihtisab_nasbiyat_12_volumes.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length === 12) {
          setEditableVolumes(parsed);
          onSaveVolumes(parsed);
          showToast('کامیابی: ۱۲ جلدوں کا ڈیٹا کامیابی سے درآمد اور محفوظ کر دیا گیا ہے!');
        } else {
          showToast('خرابی: منتخب کردہ فائل میں مکمل ۱۲ جلدوں کا درست ڈیٹا موجود نہیں ہے۔', true);
        }
      } catch {
        showToast('خرابی: JSON فائل پڑھنے میں نقص واقع ہوا۔', true);
      }
    };
    reader.readAsText(file);
  };

  // GitHub direct URLs
  const githubRepoUrl = `https://github.com/${GITHUB_REPO}`;
  const githubEditFileUrl = `https://github.com/${GITHUB_REPO}/edit/${branch}/${GITHUB_FILE_PATH}`;
  const githubDevUrl = `https://github.dev/${GITHUB_REPO}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 space-y-6">
      {/* Toast Notification */}
      {saveToast.show && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4 border ${
            saveToast.isError
              ? 'bg-rose-600 border-rose-400'
              : 'bg-emerald-600 border-emerald-400'
          }`}
        >
          {saveToast.isError ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{saveToast.msg}</span>
        </div>
      )}

      {/* Code Modal for Copying */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-3xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-nastaliq text-xl text-amber-300 font-bold">
                گٹ ہب کے لیے تیار کردہ TypeScript کوڈ
              </h3>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-stone-300">
              یہ مکمل کوڈ کاپی کر کے گٹ ہب میں <code className="text-amber-400">src/data/defaultVolumes.ts</code> میں پیسٹ کر دیں۔
            </p>
            <textarea
              readOnly
              rows={14}
              value={generateDefaultVolumesTs(editableVolumes)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateDefaultVolumesTs(editableVolumes));
                  showToast('کوڈ کاپی ہو گیا!');
                  setShowCodeModal(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>کوڈ کاپی کریں</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Admin & GitHub Hub Header */}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950/60 to-stone-900 border border-amber-800/40 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/app-logo.png"
                alt="احتساب ناصبیت لوگو"
                className="w-12 h-12 object-cover rounded-xl border border-amber-500/50 shadow-md shadow-amber-950/40 shrink-0"
              />
              <div>
                <h2 className="font-nastaliq text-2xl sm:text-3xl font-bold text-amber-300 leading-tight">
                  ایڈمن پینل و گٹ ہب انٹیگریشن
                </h2>
                <span className="text-[11px] text-emerald-400 font-sans font-medium flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>براہ راست گٹ ہب ریپوزٹری کے ساتھ مربوط (تصدیق شدہ سیشن)</span>
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-300 mt-2 leading-relaxed">
              آپ کی گٹ ہب ریپوزٹری{' '}
              <a
                href={githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 underline font-mono font-bold hover:text-amber-300"
              >
                {GITHUB_REPO}
              </a>{' '}
              مربوط ہے۔ یہاں تبدیلیاں کر کے براہِ راست گٹ ہب پر کمٹ کریں یا گٹ ہب پر ترمیم کریں۔
            </p>
          </div>

          {/* Quick GitHub Action Buttons & Lock Button */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLockPortal}
              title="ایڈمن پورٹل کو دوبارہ لاک کر دیں"
              className="flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/40 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>پورٹل لاک کریں</span>
            </button>

            <a
              href={githubEditFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>گٹ ہب پر فائل ایڈٹ کریں</span>
            </a>

            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>ریپوزٹری</span>
            </a>

            <a
              href={githubDevUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="GitHub.dev پر آن لائن VS Code ایڈیٹر میں کھولیں"
            >
              <Code2 className="w-3.5 h-3.5 text-sky-400" />
              <span>github.dev</span>
            </a>
          </div>
        </div>

        {/* GitHub Auto-Sync & Commit Panel */}
        <div className="bg-stone-950/90 border border-amber-600/30 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">
                گٹ ہب پر براہِ راست پش اور سنک (GitHub API Direct Sync):
              </span>
            </div>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=Ehtisab-Nasbiyat-Admin-Sync"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
            >
              <span>گٹ ہب ٹوکن (PAT) بنائیں (صرف repo پرمشن چاہیے)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label className="block text-[11px] text-stone-400 mb-1 font-semibold">
                GitHub Personal Access Token (خفیہ ٹوکن):
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value);
                  saveGithubSettings(e.target.value, branch);
                }}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-stone-400 mb-1 font-semibold">
                برانچ (Branch):
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  saveGithubSettings(githubToken, e.target.value);
                }}
                placeholder="main"
                className="w-full bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono text-stone-200 focus:outline-none text-center"
              />
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <button
                onClick={handlePushToGithub}
                disabled={isPushingToGit}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
              >
                {isPushingToGit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>پش ہو رہا ہے...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>گٹ ہب پر پش کریں</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePullFromGithub}
                disabled={isPullingFromGit}
                title="گٹ ہب سے تازہ ترین ڈیٹا لائیں"
                className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isPullingFromGit ? 'animate-spin' : ''}`} />
                <span>پل (Pull)</span>
              </button>

              <button
                onClick={handleCopyCodeForGithub}
                title="گٹ ہب میں پیسٹ کرنے کے لیے پورا کوڈ کاپی کریں"
                className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>کوڈ کاپی</span>
              </button>
            </div>
          </div>

          {lastCommitSha && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                آخری کامیاب کمٹ: <span className="font-mono font-bold text-white">{lastCommitSha}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Global In-App Save and Reset Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
        <div>
          <span className="text-xs font-bold text-stone-200 block">
            ایپلیکیشن پریویو و لوکل اپڈیٹ:
          </span>
          <span className="text-[11px] text-stone-400">
            یہاں 'ایپ میں محفوظ کریں' دبانے سے تبدیلیاں اسی وقت ہوم اور ریڈر میں فعال ہو جائیں گی۔
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveLocal}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>ایپ میں محفوظ کریں</span>
          </button>

          <button
            onClick={() => {
              if (confirm('کیا آپ تمام ۱۲ جلدوں کے لنکس اصل بنیادی حالت پر بحال کرنا چاہتے ہیں؟')) {
                onResetVolumes();
                setEditableVolumes(DEFAULT_VOLUMES);
                showToast('تمام کتب بنیادی حالت پر بحال کر دی گئی ہیں!');
              }
            }}
            className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-2 rounded-xl text-xs transition-colors border border-stone-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ری سیٹ</span>
          </button>
        </div>
      </div>

      {/* Volume Selector Tabs (1 to 12) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3 shadow-md">
        <span className="text-[11px] text-stone-400 block mb-2 px-1 font-semibold">
          ترمیم کے لیے جلد منتخب فرمائیں (۱ تا ۱۲):
        </span>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
          {editableVolumes.map((vol) => (
            <button
              key={vol.id}
              onClick={() => setSelectedVolId(vol.id)}
              className={`py-2 px-1 rounded-xl text-xs text-center font-nastaliq transition-all cursor-pointer ${
                vol.id === selectedVolId
                  ? 'bg-amber-600 text-stone-950 font-bold border border-amber-400 shadow-md scale-105'
                  : 'bg-stone-800/80 text-stone-300 hover:bg-stone-800 hover:text-amber-200'
              }`}
            >
              {vol.volumeTitleUrdu}
            </button>
          ))}
        </div>
      </div>

      {/* Main Volume Editor Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl">
        {/* Left/Preview Column: Live Image Preview & PDF Link Test */}
        <div className="lg:col-span-4 flex flex-col items-center gap-4">
          <div className="w-full">
            <span className="text-xs font-semibold text-stone-300 block mb-2 text-center">
              لائیو سرورق پریویو (Live Image Preview)
            </span>
            <div className="w-full aspect-[3/4.2] rounded-xl overflow-hidden border-2 border-dashed border-amber-600/40 bg-stone-950 flex flex-col items-center justify-center p-2 relative shadow-inner">
              {currentVol.coverImageUrl ? (
                <img
                  src={currentVol.coverImageUrl}
                  alt={`جلد ${currentVol.volumeNumber}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      const msg = document.createElement('div');
                      msg.className = 'text-center p-3 text-rose-400 text-xs';
                      msg.innerText = 'تصویر لوڈ نہیں ہو سکی! برائے مہربانی درست امیج لنک درج کریں۔';
                      parent.appendChild(msg);
                    }
                  }}
                />
              ) : (
                <div className="text-center p-4 text-stone-500 flex flex-col items-center gap-2">
                  <ImageIcon className="w-10 h-10 text-stone-600" />
                  <span className="text-xs">
                    امیج کا لنک پیسٹ کریں، تصویر فوری شو ہو جائے گی۔
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Test PDF Buttons */}
          <div className="w-full space-y-2">
            <a
              href={currentVol.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 py-2.5 px-3 rounded-xl text-xs transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>پی ڈی ایف لنک کھولیں / ٹیسٹ کریں</span>
            </a>

            <div className="p-3 bg-stone-950/80 rounded-xl border border-stone-800 text-[11px] text-stone-400 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                آپ آرکائیو (Archive.org) کا ڈائریکٹ امیج لنک، پی ڈی ایف لنک یا کوئی بھی کلاؤڈ لنک درج کر سکتے ہیں۔
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Input Fields for this Volume */}
        <div className="lg:col-span-8 space-y-4">
          {/* Quick Archive URL Helper */}
          <div className="bg-stone-950/90 border border-amber-600/30 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>آرکائیو لنک آٹو جنریٹر (Auto-fill from Archive.org URL):</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickArchiveUrl}
                onChange={(e) => setQuickArchiveUrl(e.target.value)}
                placeholder="مثلاً: https://archive.org/details/ehtisab-e-nasbiyat-vol-01 یا آئی ڈی"
                className="flex-1 bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none font-mono"
              />
              <button
                onClick={handleApplyQuickArchive}
                className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer whitespace-nowrap"
              >
                آٹو فل کریں
              </button>
            </div>
            <p className="text-[10px] text-stone-400">
              اگر آپ آرکائیو کی مکمل لنک پیسٹ کریں گے تو یہ سرورق اور پی ڈی ایف لنک خود بخود بنا دے گا۔
            </p>
          </div>

          {/* Volume Title & Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-300 mb-1 font-semibold">
                جلد کا عنوان (مثلاً: جلد اول، جلد دوم)
              </label>
              <input
                type="text"
                value={currentVol.volumeTitleUrdu}
                onChange={(e) => handleFieldChange('volumeTitleUrdu', e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-amber-300 font-nastaliq"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-300 mb-1 font-semibold">
                جلد نمبر (1 تا 12)
              </label>
              <input
                type="number"
                value={currentVol.volumeNumber}
                onChange={(e) => handleFieldChange('volumeNumber', parseInt(e.target.value) || 1)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-stone-200"
              />
            </div>
          </div>

          {/* Cover Image URL input */}
          <div>
            <label className="block text-xs text-stone-300 mb-1 font-semibold flex items-center justify-between">
              <span>آرکائیو سرورق/امیج کا لنک (Archive Image Link):</span>
              <span className="text-[10px] text-amber-400">فوری لائیو شو ہوگا</span>
            </label>
            <input
              type="text"
              value={currentVol.coverImageUrl}
              onChange={(e) => handleFieldChange('coverImageUrl', e.target.value)}
              placeholder="https://archive.org/services/img/your-item-id"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono"
            />
          </div>

          {/* PDF Link input */}
          <div>
            <label className="block text-xs text-stone-300 mb-1 font-semibold flex items-center justify-between">
              <span>پی ڈی ایف فائل کا لنک (Archive PDF Download Link):</span>
              <span className="text-[10px] text-emerald-400">براہ راست ڈاؤن لوڈ لنک</span>
            </label>
            <input
              type="text"
              value={currentVol.pdfUrl}
              onChange={(e) => handleFieldChange('pdfUrl', e.target.value)}
              placeholder="https://archive.org/download/your-item-id/volume.pdf"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono"
            />
          </div>

          {/* Topic / Subject */}
          <div>
            <label className="block text-xs text-stone-300 mb-1 font-semibold">
              جلد کا موضوع / خلاصہ عنوان:
            </label>
            <input
              type="text"
              value={currentVol.topic}
              onChange={(e) => handleFieldChange('topic', e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-stone-100 font-nastaliq"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-stone-300 mb-1 font-semibold">
              تفصیل و مشمولات:
            </label>
            <textarea
              rows={2}
              value={currentVol.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-200 font-sans"
            />
          </div>

          {/* Pages & File Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-300 mb-1 font-semibold">
                صفحات کی تعداد:
              </label>
              <input
                type="number"
                value={currentVol.pageCount}
                onChange={(e) => handleFieldChange('pageCount', parseInt(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-stone-200"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-300 mb-1 font-semibold">
                فائل سائز (مثلاً: 34 MB):
              </label>
              <input
                type="text"
                value={currentVol.fileSize}
                onChange={(e) => handleFieldChange('fileSize', e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-stone-200"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSaveLocal}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>ایپ میں محفوظ کریں</span>
            </button>

            <button
              onClick={handlePushToGithub}
              disabled={isPushingToGit}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:bg-stone-800 text-stone-950 font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg cursor-pointer disabled:cursor-not-allowed"
            >
              <GitBranch className="w-4 h-4" />
              <span>{isPushingToGit ? 'گٹ ہب پر کمٹ ہو رہا ہے...' : 'گٹ ہب پر پش کریں'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* JSON Backup Export / Import */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
        <div>
          <span className="font-semibold text-stone-200 block">ڈیٹا بیک اپ اور بحالی (Offline JSON Backup):</span>
          <span>آپ اپنے تمام ڈیٹا کی JSON فائل ڈاؤن لوڈ کر سکتے ہیں یا کسی بھی وقت امپورٹ کر سکتے ہیں۔</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-2 rounded-xl transition-colors cursor-pointer border border-stone-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>بیک اپ ڈاؤن لوڈ</span>
          </button>

          <label className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-2 rounded-xl transition-colors cursor-pointer border border-stone-700">
            <Upload className="w-3.5 h-3.5" />
            <span>امپورٹ کریں</span>
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
