/**
 * アップロード関連の型定義
 * ファイルアップロード、Tus.io、ドラッグ&ドロップ関連の型
 */

import { ApiResponse } from './global';

// Tus.io アップロード関連の型
export interface TusUploadOptions {
  endpoint: string;
  retryDelays: number[];
  metadata: Record<string, string>;
  chunkSize: number;
  removeFingerprintOnSuccess: boolean;
  resume: boolean;
  onError: (error: Error) => void;
  onProgress: (bytesUploaded: number, bytesTotal: number) => void;
  onSuccess: () => void;
}

export interface TusUpload {
  start(): void;
  abort(): void;
}

// アップロードオプション（共通）
export interface UploadOptions {
  comment?: string;
  dlkey?: string;
  delkey?: string;
  replacekey?: string;
  maxDownloads?: number;
  expiresDays?: number;
  folderId?: string;
}

// アップロード情報
export interface UploadInfo {
  upload?: TusUpload;
  file: File;
  options: UploadOptions;
  progress: number;
  lastTime?: number;
  lastBytes?: number;
  lastSpeed?: number;
  uploadedBytes?: number;
  totalBytes?: number;
  completed?: boolean;
}

// アップロードされたファイル（File拡張）
export interface UploadedFile extends File {
  uploadId?: string;
}

// アップロードAPIレスポンス
export interface UploadApiResponse extends ApiResponse {
  status: 'ok' | 'success' | 'filesize_over' | 'extension_error' | 'comment_error' | 'dlkey_required' | 'delkey_required' | 'sqlwrite_error' | 'network_error';
  ext?: string;
  message?: string;
}

// Tus & jQuery グローバル定義
export interface TusWindowGlobals {
  tus?: {
    Upload: {
      new (_file: Blob, _options: TusUploadOptions): TusUpload;
    };
  };
  // jQuery依存を除去する方針のため、$プロパティを削除
}

// アップロード関連グローバル関数定義
export interface UploadWindowGlobals {
  enhancedFileUpload: () => void;
  pauseUpload: (filename: string) => boolean;
  resumeUpload: (filename: string) => boolean;
  cancelUpload: (filename: string) => boolean;
  uploadFileResumable: (file: File, options?: UploadOptions) => Promise<void>;
}

export {};
