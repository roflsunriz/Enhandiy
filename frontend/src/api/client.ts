/**
 * 型安全なAPIクライアント
 * EnhandiyのAPI操作を型安全に行うためのクライアント
 */

import { post, get, getCsrfToken, request } from '../utils/http';
import { ApiResponse, FileData, FolderData } from '../types/global';
// import { RawApiResponse } from '../types/api';

/**
 * ファイル操作API
 */
export class FileApi {
  /**
   * ファイル一覧を取得
   */
  static async getFiles(folderId?: string, options?: { includeFolders?: boolean; includeBreadcrumb?: boolean }): Promise<ApiResponse<FileData[]>> {
    const parts: string[] = [];
    if (folderId) parts.push(`folder=${encodeURIComponent(folderId)}`);
    const include: string[] = [];
    if (options?.includeFolders) include.push('folders');
    if (options?.includeBreadcrumb) include.push('breadcrumb');
    if (include.length) parts.push(`include=${include.join(',')}`);
    const query = parts.length ? `&${parts.join('&')}` : '';
    return get<FileData[]>(`/api/index.php?path=/api/files${query}`);
  }

  /**
   * ファイルをダウンロード
   */
  static async downloadFile(fileId: string): Promise<void> {
    const link = document.createElement('a');
    link.href = `/api/index.php?path=/api/files/${encodeURIComponent(fileId)}/download`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * ファイルを削除（旧メソッド）
   */
  static async deleteFile(fileId: string): Promise<ApiResponse> {
    // ルータ経由の検証エンドポイントへ統一
    const fd = new FormData();
    fd.append('id', fileId);
    fd.append('csrf_token', getCsrfToken());
    return post('/api/index.php?path=/api/auth/verify-delete', fd);
  }

  /**
   * ファイルを削除（マスターキーまたは削除キー認証）
   */
  static async deleteFileWithAuth(fileId: string, masterKey?: string, deleteKey?: string): Promise<ApiResponse> {
    const key = masterKey || deleteKey || '';
    const fd = new FormData();
    fd.append('id', fileId);
    if (key) fd.append('key', key);
    fd.append('csrf_token', getCsrfToken());
    return post('/api/index.php?path=/api/auth/verify-delete', fd);
  }

  /**
   * 複数ファイルを一括削除（マスターキー認証）
   */
  static async bulkDeleteFiles(fileIds: string[], masterKey: string): Promise<ApiResponse<{
    summary: {
      total_requested: number;
      deleted_count: number;
      failed_count: number;
      not_found_count: number;
    };
    details: {
      deleted_files: Array<{ id: number; name: string; physical_deleted: boolean }>;
      failed_files: Array<{ id: number; name: string; reason: string }>;
      not_found_files: Array<{ id: number; reason: string }>;
    };
  }>> {
    // 既存サーバー実装はフォーム受け取りのためFormDataで送信
    const fd = new FormData();
    fileIds.forEach(id => fd.append('file_ids[]', id));
    fd.append('master_key', masterKey);
    fd.append('csrf_token', getCsrfToken());
    return post('/api/index.php?path=/api/files/batch', fd);
  }

  /**
   * ファイルのコメントを更新
   */
  static async updateComment(fileId: string, comment: string): Promise<ApiResponse> {
    return request(`/api/index.php?path=/api/files/${encodeURIComponent(fileId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: comment })
    });
  }

  /**
   * ファイルを差し替え
   */
  static async replaceFile(fileId: string, file: File): Promise<ApiResponse> {
    const formData = new FormData();
    // ルーターの置換APIは単一ファイルを 'file' フィールドで受け取る
    formData.append('file', file);
    return post(`/api/index.php?path=/api/files/${encodeURIComponent(fileId)}/replace`, formData);
  }

  /**
   * ファイルを移動
   */
  static async moveFile(fileId: string, targetFolderId: string | null): Promise<ApiResponse> {
    return request(`/api/index.php?path=/api/files/${encodeURIComponent(fileId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: targetFolderId })
    });
  }

  /**
   * 複数ファイルを移動
   */
  static async moveFiles(fileIds: string[], targetFolderId: string | null): Promise<ApiResponse> {
    return request(`/api/index.php?path=/api/files/batch`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_ids: fileIds, folder_id: targetFolderId })
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
    return request(`/api/index.php?path=/api/files/${encodeURIComponent(params.fileId)}/share`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        max_downloads: params.maxDownloads || null,
        expires_days: params.expiresDays || null
      })
    });
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
    return get<{ folders: FolderData[] }>(`/api/index.php?path=/api/folders`);
  }

  /**
   * フォルダを作成
   */
  static async createFolder(name: string, parentId?: string): Promise<ApiResponse<FolderData>> {
    return request<FolderData>(`/api/index.php?path=/api/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent_id: parentId || null })
    });
  }

  /**
   * フォルダを更新
   */
  static async updateFolder(folderId: string, name: string): Promise<ApiResponse> {
    return request(`/api/index.php?path=/api/folders/${encodeURIComponent(folderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
  }

  /**
   * フォルダを削除
   */
  static async deleteFolder(folderId: string, options?: { moveFiles?: boolean }): Promise<ApiResponse> {
    const move = options?.moveFiles ? '&move_files=true' : '';
    return request(`/api/index.php?path=/api/folders/${encodeURIComponent(folderId)}${move}`, {
      method: 'DELETE'
    });
  }

  /**
   * フォルダ内のファイル数を取得
   */
  static async getFolderFileCount(_folderId: string): Promise<ApiResponse<{ count: number }>> {
    // ルーター側にcheckエンドポイントが無い場合の暫定: 一覧取得してクライアント側で集計は
    // 呼び出し元で行う前提にする（ここはAPI形だけ維持）
    return get(`/api/index.php?path=/api/folders`);
  }

  /**
   * フォルダを移動
   */
  static async moveFolder(folderId: string, newParentId: string | null): Promise<ApiResponse> {
    return request(`/api/index.php?path=/api/folders/${encodeURIComponent(folderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_id: newParentId })
    });
  }
}

/**
 * アップロードAPI
 */
export class UploadApi {
  /**
   * 単一ファイルをアップロード（セキュリティ検証付き）
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
    
    // ファイル検証
    if (!this.validateFile(file)) {
      throw new Error('無効なファイルです');
    }

    // オプション検証
    if (!this.validateUploadOptions(options)) {
      throw new Error('無効なアップロードオプションです');
    }
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.comment) formData.append('comment', options.comment);
    if (options.dlkey) formData.append('dlkey', options.dlkey);
    if (options.delkey) formData.append('delkey', options.delkey);
    if (options.replacekey) formData.append('replacekey', options.replacekey);
    if (options.maxDownloads) formData.append('maxDownloads', options.maxDownloads.toString());
    if (options.expiresDays) formData.append('expiresDays', options.expiresDays.toString());
    if (options.folderId) formData.append('folderId', options.folderId);
    
    return post('/api/index.php?path=/api/files', formData);
  }
  
  /**
   * ファイルの検証
   */
  private static validateFile(file: File): boolean {
    if (!file || !(file instanceof File)) {
      console.error('Invalid file object');
      return false;
    }

    // ファイル名検証
    if (!file.name || file.name.trim() === '') {
      console.error('Empty filename');
      return false;
    }

    const filename = file.name.trim();

    // 危険なファイル名パターン
    const dangerousPatterns = [
      /\.\./,                    // パストラバーサル
      /[<>:"|?*]/,              // Windows禁止文字
      /^\./,                    // 隠しファイル（先頭ドット）
      /\0/,                     // NULLバイト
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i // Windows予約名
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(filename)) {
        console.error('Dangerous filename pattern:', filename);
        return false;
      }
    }

    // ファイル名長さ制限
    if (filename.length > 255) {
      console.error('Filename too long:', filename.length);
      return false;
    }

    return true;
  }

  /**
   * アップロードオプションの検証
   */
  private static validateUploadOptions(options: import('../types/upload').UploadOptions): boolean {
    if (!options || typeof options !== 'object') {
      return true; // 空のオプションは許可
    }

    // コメント検証
    if (options.comment !== undefined) {
      if (typeof options.comment !== 'string' || options.comment.length > 1024) {
        console.error('Invalid comment');
        return false;
      }
    }

    // キー検証
    if (options.dlkey !== undefined) {
      if (typeof options.dlkey !== 'string' || options.dlkey.length > 256) {
        console.error('Invalid download key');
        return false;
      }
    }

    if (options.delkey !== undefined) {
      if (typeof options.delkey !== 'string' || options.delkey.length > 256) {
        console.error('Invalid delete key');
        return false;
      }
    }

    if (options.replacekey !== undefined) {
      if (typeof options.replacekey !== 'string' || options.replacekey.length > 256) {
        console.error('Invalid replace key');
        return false;
      }
    }

    // 数値系の検証
    if (options.maxDownloads !== undefined) {
      const maxDownloads = options.maxDownloads;
      if (!Number.isInteger(maxDownloads) || maxDownloads < 0 || maxDownloads > 10000) {
        console.error('Invalid maxDownloads');
        return false;
      }
    }

    if (options.expiresDays !== undefined) {
      const expiresDays = options.expiresDays;
      if (!Number.isInteger(expiresDays) || expiresDays < 0 || expiresDays > 365) {
        console.error('Invalid expiresDays');
        return false;
      }
    }

    if (options.folderId !== undefined) {
      if (typeof options.folderId !== 'string' || !/^\d+$/.test(options.folderId)) {
        console.error('Invalid folderId');
        return false;
      }
    }

    return true;
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
    
    return post('/api/index.php?path=/api/files', formData);
  }

  /**
   * TUS resumable uploadの初期化
   */
  static async initializeResumableUpload(file: File, options: {
    comment?: string;
    folderId?: string;
  } = {}): Promise<ApiResponse<{ upload_url: string }>> {
    // ルーター経由のTus初期化に変更（ApacheのAlias不要）
    return post('/api/index.php?path=/api/tus-upload', {
      filename: file.name,
      filesize: file.size,
      filetype: file.type,
      comment: options.comment || '',
      folderId: options.folderId || null
    });
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
    fd.append('csrf_token', getCsrfToken());
    const res = await post('/api/index.php?path=/api/auth/verify-download', fd);
    return res as ApiResponse<{ token: string; expires_at: number }>;    
  }

  /**
   * 削除検証（ワンタイムトークン生成）
   */
  static async verifyDelete(id: string, key: string = ''): Promise<ApiResponse<{ token: string; expires_at: number }>> {
    const fd = new FormData();
    fd.append('id', id);
    if (key) fd.append('key', key);
    fd.append('csrf_token', getCsrfToken());
    const res = await post('/api/index.php?path=/api/auth/verify-delete', fd);
    return res as ApiResponse<{ token: string; expires_at: number }>;    
  }

  /**
   * （旧API）汎用認証検証 - 互換用
   */
  static async verify(key: string, type: 'download' | 'delete'): Promise<ApiResponse> {
    const endpoint = type === 'download' ? '/api/index.php?path=/api/auth/verify-download' : '/api/index.php?path=/api/auth/verify-delete';
    return post(endpoint, { key });
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
  static readonly auth = AuthApi;
}

export default ApiClient;