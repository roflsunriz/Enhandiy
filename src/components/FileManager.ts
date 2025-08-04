/**
 * ファイル管理システム Ver.2.0 - TypeScript版
 * 型安全でモダンなFileManagerクラス
 */

import { FileData, FileManagerOptions } from '../types/global';
import { FileManagerState, ViewMode, SortField, SortDirection } from '../types/fileManager';
import { FileManagerCore } from './FileManagerCore';
import { FileManagerRenderer } from './FileManagerRenderer';
import { FileManagerEvents } from './FileManagerEvents';
import { FileManagerBulkActions } from './FileManagerBulkActions';

export class FileManager {
  private core: FileManagerCore;
  private renderer: FileManagerRenderer;
  private events: FileManagerEvents;


  // 既存APIとの互換性のためのプロパティエイリアス
  public readonly container: HTMLElement;

  constructor(container: HTMLElement, options: FileManagerOptions = {}) {
    // コアインスタンスを作成
    this.core = new FileManagerCore(container, options);
    
    // 各コンポーネントを初期化
    this.renderer = new FileManagerRenderer(this.core);
    this.events = new FileManagerEvents(this.core);
    // Bulk actionsは必要に応じて初期化
    new FileManagerBulkActions(this.core);
    
    // コアに依存コンポーネントを設定
    this.core.setDependencies(this.renderer, this.events);
    
    // プロパティエイリアス
    this.container = this.core.container;

    this.init();
  }

  /**
   * 初期化処理
   */
  private init(): void {
    this.core.init();
  }

  /**
   * ファイルデータを設定
   */
  public setFiles(files: FileData[]): void {
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
   * ファイルを追加
   */
  public addFile(file: FileData): void {
    this.core.addFile(file);
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