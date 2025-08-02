/**
 * FileManagerコンポーネント関連の型定義
 */

import { FileData } from './global';

// ソートの方向
export type SortDirection = 'asc' | 'desc';

// ソートのフィールド
export type SortField = 'name' | 'size' | 'date' | 'type';

// ビューモード
export type ViewMode = 'grid' | 'list';

// ファイルマネージャーの状態
export interface FileManagerState {
  files: FileData[];
  filteredFiles: FileData[];
  currentPage: number;
  itemsPerPage: number;
  searchQuery: string;
  sortBy: string;
  viewMode: ViewMode;
  selectedFiles: Set<string>;
  isLoading: boolean;
}

// ファイルマネージャーのイベント
export interface FileManagerEvents {
  'files-updated': CustomEvent<{ files: FileData[] }>;
  'file-selected': CustomEvent<{ file: FileData }>;
  'files-bulk-selected': CustomEvent<{ files: FileData[] }>;
  'page-changed': CustomEvent<{ page: number }>;
  'view-mode-changed': CustomEvent<{ mode: ViewMode }>;
  'search-changed': CustomEvent<{ query: string }>;
  'sort-changed': CustomEvent<{ field: SortField; direction: SortDirection }>;
}

// ドラッグ&ドロップの状態
export interface DragDropState {
  isDragging: boolean;
  dragCounter: number;
  draggedFiles: FileList | null;
}

// アップロード進捗の状態
export interface UploadProgress {
  fileId: string;
  fileName: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// ファイル操作のアクション
export type FileAction = 'download' | 'delete' | 'share' | 'edit' | 'move' | 'copy';

// ファイル操作の結果
export interface FileActionResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

// FileManager コンポーネントのインターフェース
export interface IFileManagerRenderer {
  init(): void;
  render(): void;
}

export interface IFileManagerEvents {
  init(): void;
}

export interface IFileManagerBulkActions {
  bindEvents(): void;
  updateSelectedCount(): void;
}

export {};