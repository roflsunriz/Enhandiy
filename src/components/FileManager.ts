/**
 * ファイル管理システム Ver.2.0 - TypeScript版
 * 型安全でモダンなFileManagerクラス
 */

import { FileData, FileManagerOptions } from '../types/global';
import { FileManagerState, ViewMode, SortField, SortDirection } from '../types/fileManager';
import { FileManagerCore } from './FileManagerCore';
import { FileManagerRenderer } from './FileManagerRenderer';
import { FileManagerEvents } from './FileManagerEvents';


export class FileManager {
  private core: FileManagerCore;
  private renderer: FileManagerRenderer;
  private events: FileManagerEvents;


  // 既存APIとの互換性のためのプロパティエイリアス
  public readonly container: HTMLElement;

  private isInitialized = false;

  constructor(container: HTMLElement, options: FileManagerOptions = {}) {
    // コアインスタンスを作成
    this.core = new FileManagerCore(container, options);
    
    // 各コンポーネントを初期化
    this.renderer = new FileManagerRenderer(this.core);
    this.events = new FileManagerEvents(this.core);
    
    // コアに依存コンポーネントを設定
    this.core.setDependencies(this.renderer, this.events);
    
    // プロパティエイリアス
    this.container = this.core.container;

    // 初期化はsetFiles()で実行するため、ここでは基本セットアップのみ
  }

  /**
   * 初期化処理（内部用）
   */
  private init(): void {
    if (!this.isInitialized) {
      this.core.init();
      this.isInitialized = true;
      
    }
  }

  /**
   * ファイルデータを設定
   */
  public setFiles(files: FileData[]): void {
    // データ設定前に初期化を実行
    this.init();
    this.core.setFiles(files);
  }

  /**
   * ファイルデータを取得
   */
  public getFiles(): FileData[] {
    return this.core.getFiles();
  }

  /**
   * フィルタリングされたファイルを取得
   */
  public getFilteredFiles(): FileData[] {
    return this.core.getFilteredFiles();
  }

  /**
   * 現在のページを取得
   */
  public getCurrentPage(): number {
    return this.core.getCurrentPage();
  }

  /**
   * ページを設定
   */
  public setPage(page: number): void {
    this.core.setPage(page);
  }

  /**
   * 検索クエリを設定
   */
  public setSearchQuery(query: string): void {
    this.core.setSearchQuery(query);
  }

  /**
   * ソート設定を変更
   */
  public setSortBy(field: SortField, direction: SortDirection): void {
    this.core.setSortBy(field, direction);
  }

  /**
   * ビューモードを設定
   */
  public setViewMode(mode: ViewMode): void {
    this.core.setViewMode(mode);
  }

  /**
   * ビューモードを取得
   */
  public getViewMode(): ViewMode {
    return this.core.getViewMode();
  }

  /**
   * 選択されたファイルを取得
   */
  public getSelectedFiles(): FileData[] {
    return this.core.getSelectedFiles();
  }

  /**
   * ファイルの選択状態を切り替え
   */
  public toggleFileSelection(fileId: string): void {
    this.core.toggleFileSelection(fileId);
  }

  /**
   * 全ファイルの選択状態を切り替え
   */
  public toggleAllSelection(): void {
    this.core.toggleAllSelection();
  }

  /**
   * 選択をクリア
   */
  public clearSelection(): void {
    this.core.clearSelection();
  }

  /**
   * ファイルを更新
   */
  public updateFile(fileId: string, updates: Partial<FileData>): void {
    this.core.updateFile(fileId, updates);
  }

  /**
   * ファイルを削除
   */
  public removeFile(fileId: string): void {
    this.core.removeFile(fileId);
  }

  /**
   * ファイルを追加（セキュリティ検証付き）
   */
  public addFile(file: FileData): void {
    // 入力検証
    if (!this.validateFileData(file)) {
      console.error('Invalid file data provided to addFile:', file);
      return;
    }
    
    this.core.addFile(file);
  }

  /**
   * ファイルデータの検証
   */
  private validateFileData(file: FileData): boolean {
    // 必須フィールドの検証
    if (!file || typeof file !== 'object') {
      return false;
    }

    // IDの検証（数値または数値文字列）
    if (!file.id || (typeof file.id !== 'string' && typeof file.id !== 'number')) {
      return false;
    }

    // ファイル名の検証
    if (!file.origin_file_name || typeof file.origin_file_name !== 'string' || file.origin_file_name.trim() === '') {
      return false;
    }

    // ファイル名のセキュリティチェック
    const filename = file.origin_file_name.trim();
    
    // 危険なファイル名パターンをチェック
    const dangerousPatterns = [
      /\.\./,                    // パストラバーサル
      /[<>:"|?*]/,              // Windows禁止文字
      /^\./,                    // 隠しファイル
      /\0/,                     // NULLバイト
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i // Windows予約名
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(filename)) {
        console.warn('Dangerous filename pattern detected:', filename);
        return false;
      }
    }

    // ファイル名の長さ制限
    if (filename.length > 255) {
      console.warn('Filename too long:', filename.length);
      return false;
    }

    // ファイルサイズの検証
    if (file.size !== undefined) {
      if (typeof file.size !== 'number' || file.size < 0 || file.size > 10 * 1024 * 1024 * 1024) { // 10GB制限
        console.warn('Invalid file size:', file.size);
        return false;
      }
    }

    // コメントの検証
    if (file.comment !== undefined) {
      if (typeof file.comment !== 'string' || file.comment.length > 1024) {
        console.warn('Invalid comment:', file.comment);
        return false;
      }
    }

    return true;
  }

  /**
   * 表示を更新
   */
  public refresh(): void {
    this.core.refresh();
  }

  /**
   * サーバーからファイルリストを再取得して更新
   */
  public async refreshFromServer(): Promise<void> {
    await this.core.refreshFromServer();
  }

  /**
   * 統計情報を取得
   */
  public getStats(): {
    totalFiles: number;
    filteredFiles: number;
    selectedFiles: number;
    totalSize: number;
  } {
    return this.core.getStats();
  }

  /**
   * 現在の状態を取得
   */
  public getState(): FileManagerState {
    return this.core.getState();
  }

  /**
   * 破棄処理
   */
  public destroy(): void {
    this.events.destroy();
    this.core.destroy();
  }

  // 後方互換性のためのメソッド
  public loadViewMode(): ViewMode {
    return this.core.loadViewMode() || 'grid';
  }
}

export default FileManager;