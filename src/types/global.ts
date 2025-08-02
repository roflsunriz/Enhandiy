/**
 * グローバル変数とPHPから渡されるデータの型定義
 */

// ファイルデータの型定義
export interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  upload_date: string;
  comment?: string;
  share_key?: string;
  share_expires?: string;
  share_download_limit?: number;
  share_downloads?: number;
  folder_id?: string;
  original_name?: string;
}

// フォルダデータの型定義
export interface FolderData {
  id: string;
  name: string;
  parent_id?: string;
  created_at: string;
  file_count: number;
}

// アプリケーション設定の型定義
export interface AppConfig {
  allow_comment_edit: boolean;
  allow_file_replace: boolean;
  folders_enabled: boolean;
  upload_method_priority: 'resumable' | 'normal';
  upload_fallback_enabled: boolean;
  csrf_token: string;
}

// APIレスポンスの基本型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ファイルマネージャーのオプション
export interface FileManagerOptions {
  itemsPerPage?: number;
  defaultSort?: 'name_asc' | 'name_desc' | 'size_asc' | 'size_desc' | 'date_asc' | 'date_desc';
  defaultView?: 'grid' | 'list';
}

// イベントハンドラー型
export type EventHandler<T = Event> = (_event: T) => void;

// グローバルオブジェクトの拡張
declare global {
  interface Window {
    fileData: FileData[];
    folderData: FolderData[];
    config: AppConfig;
    fileManagerInstance?: import('../components/FileManager').FileManager;
    showError: (_message: string) => void;
    showSuccess: (_message: string) => void;
  }
}

export {};