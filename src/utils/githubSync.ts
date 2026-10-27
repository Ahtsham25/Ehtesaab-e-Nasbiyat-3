import { VolumeData } from '../types/book';

export const DEFAULT_GITHUB_REPO = 'Ahtsham25/Ehtesaab-e-Nasbiyat-3';
export const DEFAULT_GITHUB_BRANCH = 'main';
export const GITHUB_JSON_PATH = 'public/data/volumes.json';
export const GITHUB_TS_PATH = 'src/data/defaultVolumes.ts';

export const GITHUB_REPO_STORAGE_KEY = 'ehtisab_github_repo_v2';
export const GITHUB_BRANCH_STORAGE_KEY = 'ehtisab_github_branch_v2';
export const GITHUB_TOKEN_STORAGE_KEY = 'ehtisab_github_pat_v1';
export const LAST_SYNC_STORAGE_KEY = 'ehtisab_last_sync_time_v1';

export interface GithubConfig {
  repo: string;
  branch: string;
  token: string;
}

export function getGithubConfig(): GithubConfig {
  let repo = DEFAULT_GITHUB_REPO;
  let branch = DEFAULT_GITHUB_BRANCH;
  let token = '';

  try {
    const savedRepo = localStorage.getItem(GITHUB_REPO_STORAGE_KEY);
    if (savedRepo && savedRepo.trim().length > 0) repo = savedRepo.trim();

    const savedBranch = localStorage.getItem(GITHUB_BRANCH_STORAGE_KEY);
    if (savedBranch && savedBranch.trim().length > 0) branch = savedBranch.trim();

    const savedToken = localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY);
    if (savedToken) token = savedToken.trim();
  } catch {}

  return { repo, branch, token };
}

export function saveGithubConfig(config: Partial<GithubConfig>) {
  try {
    if (config.repo !== undefined) localStorage.setItem(GITHUB_REPO_STORAGE_KEY, config.repo.trim());
    if (config.branch !== undefined) localStorage.setItem(GITHUB_BRANCH_STORAGE_KEY, config.branch.trim());
    if (config.token !== undefined) localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, config.token.trim());
  } catch {}
}

export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUtf8(base64: string): string {
  const clean = base64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function generateDefaultVolumesTs(volumes: VolumeData[]): string {
  const cleanVolumes = volumes.map((v) => ({
    id: v.id,
    volumeNumber: v.volumeNumber,
    volumeTitleUrdu: v.volumeTitleUrdu,
    topic: v.topic || '',
    archiveItemId: v.archiveItemId || '',
    coverImageUrl: v.coverImageUrl,
    pdfUrl: v.pdfUrl,
    pageCount: v.pageCount,
    fileSize: v.fileSize,
    description: v.description || '',
    year: v.year || `جلد ${v.volumeNumber}`,
    isBookmarked: false,
    isDownloaded: false,
  }));

  return `import { VolumeData } from '../types/book';

export const DEFAULT_VOLUMES: VolumeData[] = ${JSON.stringify(cleanVolumes, null, 2)};

export const STORAGE_KEY = 'ehtisab_nasbiyat_volumes_v1';
export const BOOKMARKS_STORAGE_KEY = 'ehtisab_nasbiyat_bookmarks_v1';
`;
}

/**
 * Fetches the latest volumes list from GitHub raw URL or jsDelivr CDN.
 * This runs on app startup or when the user/admin requests a sync.
 */
export async function fetchVolumesFromGithub(): Promise<{
  success: boolean;
  volumes?: VolumeData[];
  error?: string;
  source?: string;
}> {
  const { repo, branch } = getGithubConfig();
  const timestamp = Date.now();

  const endpoints = [
    {
      name: 'GitHub Raw',
      url: `https://raw.githubusercontent.com/${repo}/${branch}/${GITHUB_JSON_PATH}?t=${timestamp}`,
    },
    {
      name: 'jsDelivr CDN',
      url: `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${GITHUB_JSON_PATH}?t=${timestamp}`,
    },
    {
      name: 'Local Bundled',
      url: `/data/volumes.json?t=${timestamp}`,
    },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].volumeNumber) {
        try {
          localStorage.setItem(LAST_SYNC_STORAGE_KEY, new Date().toISOString());
        } catch {}

        return {
          success: true,
          volumes: data as VolumeData[],
          source: ep.name,
        };
      }
    } catch {
      // Continue to next endpoint
    }
  }

  return {
    success: false,
    error: 'گٹ ہب کلاؤڈ سے رابطہ نہ ہو سکا۔ برائے مہربانی انٹرنیٹ کنکشن یا ریپوزٹری کا نام چیک فرمائیں۔',
  };
}

/**
 * Direct commit & push of volume changes to GitHub repository via GitHub REST API.
 */
export async function pushVolumesToGithub(volumes: VolumeData[]): Promise<{
  success: boolean;
  commitSha?: string;
  error?: string;
}> {
  const { repo, branch, token } = getGithubConfig();

  if (!token) {
    return {
      success: false,
      error: 'گٹ ہب ٹوکن (Personal Access Token) درکار ہے۔ براہِ کرم ایڈمن پورٹل میں اپنا ٹوکن درج فرمائیں۔',
    };
  }

  try {
    const jsonContent = JSON.stringify(volumes, null, 2);
    const jsonBase64 = utf8ToBase64(jsonContent);

    // 1. Check current SHA for volumes.json
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${GITHUB_JSON_PATH}?ref=${encodeURIComponent(branch)}`;
    let fileSha: string | undefined = undefined;

    const checkRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (checkRes.ok) {
      const fileData = await checkRes.json();
      fileSha = fileData.sha;
    }

    // 2. Commit updated public/data/volumes.json
    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${GITHUB_JSON_PATH}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `📚 Update volumes catalog via Admin Portal [${new Date().toLocaleString('ur-PK')}]`,
        content: jsonBase64,
        branch: branch,
        ...(fileSha ? { sha: fileSha } : {}),
      }),
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return {
        success: false,
        error: errData.message || `گٹ ہب نے ایرر کوڈ ${putRes.status} دیا`,
      };
    }

    const putData = await putRes.json();
    const commitSha = putData?.commit?.sha || putData?.content?.sha;

    // 3. Also push to src/data/defaultVolumes.ts in background if possible
    try {
      const tsContent = generateDefaultVolumesTs(volumes);
      const tsBase64 = utf8ToBase64(tsContent);
      const tsApiUrl = `https://api.github.com/repos/${repo}/contents/${GITHUB_TS_PATH}?ref=${encodeURIComponent(branch)}`;

      let tsSha: string | undefined = undefined;
      const checkTsRes = await fetch(tsApiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (checkTsRes.ok) {
        const tsData = await checkTsRes.json();
        tsSha = tsData.sha;
      }

      await fetch(`https://api.github.com/repos/${repo}/contents/${GITHUB_TS_PATH}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `📚 Update defaultVolumes.ts via Admin Portal`,
          content: tsBase64,
          branch: branch,
          ...(tsSha ? { sha: tsSha } : {}),
        }),
      });
    } catch {}

    try {
      localStorage.setItem(LAST_SYNC_STORAGE_KEY, new Date().toISOString());
    } catch {}

    return {
      success: true,
      commitSha,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'گٹ ہب پر پش کرنے میں نامعلوم خرابی پیش آئی۔',
    };
  }
}
