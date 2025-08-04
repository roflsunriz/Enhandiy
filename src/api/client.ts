/**
 * 型安全なAPIクライアント
 * PHPUploaderのAPI操作を型安全に行うためのクライアント
 */

import { post, get, del, put } from '../utils/http';
import { ApiResponse, FileData, FolderData } from '../types/global';

// 内部レスポンス型の定義
interface RawApiResponse {
  status: string;
  data?: unknown;
  message?: string;
  error_code?: string;
}

/**
 * ファイル操作API
 */
export class FileApi {
  /**
   * ファイル一覧を取得
   */
  static async getFiles(folderId?: string): Promise<ApiResponse<FileData[]>> {
    const params = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : '';
    return get<FileData[]>(`./app/api/simple-files.php${params}`);
  }

  /**
   * ファイルをダウンロード
   */
  static async downloadFile(fileId: string): Promise<void> {
    const link = document.createElement('a');
    link.href = `./download.php?id=${encodeURIComponent(fileId)}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * ファイルを削除
   */
  static async deleteFile(fileId: string): Promise<ApiResponse> {
    return post('./app/api/verifydelete.php', { id: fileId });
  }

  /**
   * ファイルのコメントを更新
   */
  static async updateComment(fileId: string, comment: string): Promise<ApiResponse> {
    return post('./app/api/edit-comment.php', {
      file_id: fileId,
      comment: comment
    });
  }

  /**
   * ファイルを差し替え
   */
  static async replaceFile(fileId: string, file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('files[]', file);
    
    return post('./app/api/replace-file.php', formData);
  }

  /**
   * ファイルを移動
   */
  static async moveFile(fileId: string, targetFolderId: string): Promise<ApiResponse> {
    return post('./app/api/move-file.php', {
      file_id: fileId,
      folder_id: targetFolderId
    });
  }

  /**
   * 複数ファイルを移動
   */
  static async moveFiles(fileIds: string[], targetFolderId: string): Promise<ApiResponse> {
    return post('./app/api/move-files.php', {
      file_ids: fileIds,
      folder_id: targetFolderId
    });
  }

  /**
   * ファイルをZIP化してダウンロード
   */
  static async downloadAsZip(fileIds: string[]): Promise<ApiResponse<{ download_url: string }>> {
    return post('/api/files/zip', {
      file_ids: fileIds
    });
  }
}

/**
 * 共有リンクAPI
 */
export class ShareApi {
  /**
   * 共有リンクを生成
   */
  static async generateShareLink(params: {
    fileId: string;
    maxDownloads?: string | number;
    expiresDays?: string | number;
  }): Promise<ApiResponse<{
    share_url: string;
    share_url_with_comment: string;
    max_downloads?: number;
    expires_days?: number;
  }>> {
    return post('./app/api/generatesharelink.php', {
      id: params.fileId,
      max_downloads: params.maxDownloads || null,
      expires_days: params.expiresDays || null
    });
  }

  /**
   * 共有リンクの状態を確認
   */
  static async checkShareLink(shareKey: string): Promise<ApiResponse> {
    return get(`/api/share/check.php?key=${encodeURIComponent(shareKey)}`);
  }

  /**
   * 共有リンクを無効化
   */
  static async revokeShareLink(fileId: string): Promise<ApiResponse> {
    return post('/api/share/revoke.php', { fileId: fileId });
  }
}

/**
 * フォルダ操作API
 */
export class FolderApi {
  /**
   * フォルダ一覧を取得
   */
  static async getFolders(): Promise<ApiResponse<{ folders: FolderData[] }>> {
    return get<{ folders: FolderData[] }>('./app/api/folders.php');
  }

  /**
   * フォルダを作成
   */
  static async createFolder(name: string, parentId?: string): Promise<ApiResponse<FolderData>> {
    return post('./app/api/folders.php', {
      action: 'create',
      name: name,
      parent_id: parentId || null
    });
  }

  /**
   * フォルダを更新
   */
  static async updateFolder(folderId: string, name: string): Promise<ApiResponse> {
    return put('./app/api/folders.php', {
      action: 'update',
      id: folderId,
      name: name
    });
  }

  /**
   * フォルダを削除
   */
  static async deleteFolder(folderId: string): Promise<ApiResponse> {
    return del(`./app/api/folders.php?id=${encodeURIComponent(folderId)}`);
  }

  /**
   * フォルダ内のファイル数を取得
   */
  static async getFolderFileCount(folderId: string): Promise<ApiResponse<{ count: number }>> {
    return get(`./app/api/folders.php?id=${encodeURIComponent(folderId)}&check=true`);
  }

  /**
   * フォルダを移動
   */
  static async moveFolder(folderId: string, newParentId: string | null): Promise<ApiResponse> {
    return post('./app/api/folders.php', {
      action: 'move',
      id: folderId,
      new_parent_id: newParentId
    });
  }
}

/**
 * アップロードAPI
 */
export class UploadApi {
  /**
   * 単一ファイルをアップロード
   */
  static async uploadFile(file: File, options: {
    comment?: string;
    dlkey?: string;
    delkey?: string;
    replacekey?: string;
    maxDownloads?: number;
    expiresDays?: number;
    folderId?: string;
  } = {}): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('files[]', file);
    
    if (options.comment) formData.append('comment', options.comment);
    if (options.dlkey) formData.append('dlkey', options.dlkey);
    if (options.delkey) formData.append('delkey', options.delkey);
    if (options.replacekey) formData.append('replacekey', options.replacekey);
    if (options.maxDownloads) formData.append('maxDownloads', options.maxDownloads.toString());
    if (options.expiresDays) formData.append('expiresDays', options.expiresDays.toString());
    if (options.folderId) formData.append('folderId', options.folderId);
    
    return post('./app/api/upload.php', formData);
  }

  /**
   * 複数ファイルをアップロード
   */
  static async uploadFiles(files: File[], options: {
    comment?: string;
    dlkey?: string;
    delkey?: string;
    replacekey?: string;
    maxDownloads?: number;
    expiresDays?: number;
    folderId?: string;
  } = {}): Promise<ApiResponse> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files[]', file);
    });
    
    if (options.comment) formData.append('comment', options.comment);
    if (options.dlkey) formData.append('dlkey', options.dlkey);
    if (options.delkey) formData.append('delkey', options.delkey);
    if (options.replacekey) formData.append('replacekey', options.replacekey);
    if (options.maxDownloads) formData.append('maxDownloads', options.maxDownloads.toString());
    if (options.expiresDays) formData.append('expiresDays', options.expiresDays.toString());
    if (options.folderId) formData.append('folderId', options.folderId);
    
    return post('./app/api/upload.php', formData);
  }

  /**
   * TUS resumable uploadの初期化
   */
  static async initializeResumableUpload(file: File, options: {
    comment?: string;
    folderId?: string;
  } = {}): Promise<ApiResponse<{ upload_url: string }>> {
    return post('./app/api/tus-upload.php', {
      filename: file.name,
      filesize: file.size,
      filetype: file.type,
      comment: options.comment || '',
      folderId: options.folderId || null
    });
  }
}

/**
 * システム情報API
 */
export class SystemApi {
  /**
   * システム情報を取得
   */
  static async getSystemInfo(): Promise<ApiResponse<{
    version: string;
    php_version: string;
    upload_max_filesize: string;
    post_max_size: string;
    max_file_uploads: number;
  }>> {
    return get('/api/system/info.php');
  }

  /**
   * データベース接続テスト
   */
  static async testDatabase(): Promise<ApiResponse> {
    return get('/api/test-db.php');
  }

  /**
   * ストレージ使用量を取得
   */
  static async getStorageUsage(): Promise<ApiResponse<{
    total_files: number;
    total_size: number;
    available_space?: number;
  }>> {
    return get('/api/system/storage.php');
  }
}

/**
 * 認証API
 */
export class AuthApi {
  /**
   * ダウンロード検証（ワンタイムトークン生成）
   */
  static async verifyDownload(id: string, key: string = ''): Promise<ApiResponse<{ token: string; expires_at: number }>> {
    const fd = new FormData();
    fd.append('id', id);
    if (key) fd.append('key', key);
    fd.append('csrf_token', (window as unknown as { config?: { csrf_token?: string } }).config?.csrf_token || '');
    const raw = await post('./app/api/verifydownload.php', fd) as unknown as RawApiResponse;
    if (raw.status === 'success') {
      return { success: true, data: raw.data as { token: string; expires_at: number }, message: raw.message };
    }
    return { success: false, error: raw.error_code || raw.message };
  }

  /**
   * 削除検証（ワンタイムトークン生成）
   */
  static async verifyDelete(id: string, key: string = ''): Promise<ApiResponse<{ token: string; expires_at: number }>> {
    const fd = new FormData();
    fd.append('id', id);
    if (key) fd.append('key', key);
    fd.append('csrf_token', (window as unknown as { config?: { csrf_token?: string } }).config?.csrf_token || '');
    const raw = await post('./app/api/verifydelete.php', fd) as unknown as RawApiResponse;
    if (raw.status === 'success') {
      return { success: true, data: raw.data as { token: string; expires_at: number }, message: raw.message };
    }
    return { success: false, error: raw.error_code || raw.message };
  }

  /**
   * （旧API）汎用認証検証 - 互換用
   */
  static async verify(key: string, type: 'download' | 'delete'): Promise<ApiResponse> {
    const endpoint = type === 'download' ? './app/api/verifydownload.php' : './app/api/verifydelete.php';
    return post(endpoint, { key });
  }

  /**
   * CSRFトークンを取得
   */
  static async getCsrfToken(): Promise<ApiResponse<{ token: string }>> {
    return get('/api/csrf-token.php');
  }
}

/**
 * 統合APIクライアント
 */
export class ApiClient {
  static readonly file = FileApi;
  static readonly share = ShareApi;
  static readonly folder = FolderApi;
  static readonly upload = UploadApi;
  static readonly system = SystemApi;
  static readonly auth = AuthApi;
}

export default ApiClient;