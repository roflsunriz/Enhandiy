/**
 * FileManager コアクラス (TypeScript版)
 * データ管理、フィルタリング、ソート、ページネーションなどの基本機能を担当
 */

import { FileData, FileManagerOptions } from '../types/global';
import { FileManagerState, ViewMode, SortField, SortDirection } from '../types/file-manager';

export class FileManagerCore {
  public readonly container: HTMLElement;
  private state: FileManagerState;
  
  // 依存コンポーネント（後から設定）
  private renderer: import('../types/file-manager').IFileManagerRenderer | null = null;
  private events: import('../types/file-manager').IFileManagerEvents | null = null;

  constructor(container: HTMLElement, options: FileManagerOptions = {}) {
    this.container = container;
    
    this.state = {
      files: [],
      filteredFiles: [],
      currentPage: 1,
      itemsPerPage: options.itemsPerPage || 12,
      searchQuery: '',
      sortBy: options.defaultSort || 'date_desc',
      viewMode: this.loadViewMode() || options.defaultView || 'grid',
      selectedFiles: new Set<string>(),
      isLoading: false,
      isRefreshing: false
    };
  }

  /**
   * 依存コンポーネントを設定
   */
  public setDependencies(
    renderer: import('../types/file-manager').IFileManagerRenderer, 
    events: import('../types/file-manager').IFileManagerEvents
  ): void {
    this.renderer = renderer;
    this.events = events;
  }

  /**
   * ユーザーのビューモード設定を読み込み
   */
  public loadViewMode(): ViewMode | null {
    try {
      const saved = localStorage.getItem('fileManager_viewMode');
      return saved as ViewMode || null;
    } catch {
      return null;
    }
  }

  /**
   * ビューモード設定を保存
   */
  public saveViewMode(): void {
    try {
      localStorage.setItem('fileManager_viewMode', this.state.viewMode);
    } catch {
      // localStorage が使用できない場合は無視
    }
  }

  /**
   * 初期化処理
   */
  public init(): void {
    if (this.renderer) {
      this.renderer.init();
    }
    if (this.events) {
      this.events.init();
    }
    
    // URLパラメータ監視機能を初期化
    this.initializeUrlParamWatcher();
  }

  /**
   * ファイルデータを設定
   */
  public setFiles(files: FileData[]): void {
    // PHPからのデータを正規化
    this.state.files = files.map(file => this.normalizeFileData(file));
    this.applyFiltersAndSort();
    this.render();
  }

  /**
   * PHPからのファイルデータを正規化
   */
  private normalizeFileData(file: FileData): FileData {
    const normalized = { ...file };
    
    // name プロパティが存在しない場合は origin_file_name を使用
    if (!normalized.name && normalized.origin_file_name) {
      normalized.name = normalized.origin_file_name;
    }
    
    // upload_date の検証と正規化
    if (normalized.upload_date) {
      // 既にupload_dateがある場合でも、Unix timestampかどうかチェック
      if (typeof normalized.upload_date === 'number' || /^\d+$/.test(normalized.upload_date)) {
        const timestamp = typeof normalized.upload_date === 'number' ? normalized.upload_date : parseInt(normalized.upload_date);
        normalized.upload_date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp).toISOString();
      }
    } else if (normalized.input_date) {
      // upload_date が存在しない場合は input_date から変換
      const timestamp = typeof normalized.input_date === 'number' ? normalized.input_date : parseInt(normalized.input_date);
      normalized.upload_date = new Date(timestamp * 1000).toISOString();
    }
    
    // id を string に変換
    if (typeof normalized.id === 'number') {
      normalized.id = normalized.id.toString();
    }
    
    // type プロパティが存在しない場合はファイル名から推測
    if (!normalized.type && normalized.name) {
      normalized.type = this.guessFileTypeFromName(normalized.name);
    }
    
    return normalized;
  }

  /**
   * ファイル名からMIMEタイプを推測
   */
  private guessFileTypeFromName(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'json': 'application/json',
      'js': 'application/javascript',
      'html': 'text/html',
      'css': 'text/css',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    
    return mimeMap[ext] || 'application/octet-stream';
  }

  /**
   * ファイルデータを取得
   */
  public getFiles(): FileData[] {
    return [...this.state.files];
  }

  /**
   * フィルタリングされたファイルを取得
   */
  public getFilteredFiles(): FileData[] {
    return [...this.state.filteredFiles];
  }

  /**
   * 現在のページを取得
   */
  public getCurrentPage(): number {
    return this.state.currentPage;
  }

  /**
   * ページを設定
   */
  public setPage(page: number): void {
    const maxPage = this.getMaxPage();
    this.state.currentPage = Math.max(1, Math.min(page, maxPage));
    this.render();
  }

  /**
   * 最大ページ数を取得
   */
  public getMaxPage(): number {
    return Math.ceil(this.state.filteredFiles.length / this.state.itemsPerPage);
  }

  /**
   * 検索クエリを設定
   */
  public setSearchQuery(query: string): void {
    this.state.searchQuery = query;
    this.state.currentPage = 1; // 検索時はページをリセット
    this.applyFiltersAndSort();
    this.render();
  }

  /**
   * ソート設定を変更
   */
  public setSortBy(field: SortField, direction: SortDirection): void {
    this.state.sortBy = `${field}_${direction}`;
    this.applyFiltersAndSort();
    this.render();
  }

  /**
   * ビューモードを設定
   */
  public setViewMode(mode: ViewMode): void {
    this.state.viewMode = mode;
    this.saveViewMode();
    this.render();
  }

  /**
   * ビューモードを取得
   */
  public getViewMode(): ViewMode {
    return this.state.viewMode;
  }

  /**
   * 選択されたファイルを取得
   */
  public getSelectedFiles(): FileData[] {
    return this.state.files.filter(file => this.state.selectedFiles.has(file.id.toString()));
  }

  /**
   * ファイルの選択状態を切り替え
   */
  public toggleFileSelection(fileId: string | number): void {
    const id = fileId.toString();
    if (this.state.selectedFiles.has(id)) {
      this.state.selectedFiles.delete(id);
    } else {
      this.state.selectedFiles.add(id);
    }
    this.render();
  }

  /**
   * 全ファイルの選択状態を切り替え
   */
  public toggleAllSelection(): void {
    const currentPageFiles = this.getCurrentPageFiles();
    const allSelected = currentPageFiles.every(file => this.state.selectedFiles.has(file.id.toString()));
    
    if (allSelected) {
      // 全選択解除
      currentPageFiles.forEach(file => this.state.selectedFiles.delete(file.id.toString()));
    } else {
      // 全選択
      currentPageFiles.forEach(file => this.state.selectedFiles.add(file.id.toString()));
    }
    
    this.render();
  }

  /**
   * 選択をクリア
   */
  public clearSelection(): void {
    this.state.selectedFiles.clear();
    this.render();
  }

  /**
   * ファイルを更新
   */
  public updateFile(fileId: string, updates: Partial<FileData>): void {
    const fileIndex = this.state.files.findIndex(file => file.id === fileId);
    if (fileIndex !== -1) {
      this.state.files[fileIndex] = { ...this.state.files[fileIndex], ...updates };
      this.applyFiltersAndSort();
      this.render();
    }
  }

  /**
   * ファイルを削除
   */
  public removeFile(fileId: string): void {
    this.state.files = this.state.files.filter(file => file.id !== fileId);
    this.state.selectedFiles.delete(fileId);
    this.applyFiltersAndSort();
    this.render();
  }

  /**
   * ファイルを追加
   */
  public addFile(file: FileData): void {
    this.state.files.push(file);
    this.applyFiltersAndSort();
    this.render();
  }

  /**
   * 表示を更新
   */
  public refresh(): void {
    this.applyFiltersAndSort();
    this.render();
  }



  /**
   * サーバーからファイルリストを再取得して更新
   */
  public async refreshFromServer(): Promise<void> {
    // 既に処理中の場合は新しいリクエストを開始しない
    if (this.state.isRefreshing) {
      
      return;
    }

    try {
      // 処理中フラグを設定
      this.state.isRefreshing = true;
      
      
      // ローディング状態をUIに反映
      this.state.isLoading = true;
      this.updateLoadingState();

      // 現在のフォルダIDを取得
      const urlParams = new URLSearchParams(window.location.search);
      const folderId = urlParams.get('folder') || '';
      
      // 新しいAPIエンドポイントを使用
      const url = folderId ? `/api/refresh-files.php?folder=${encodeURIComponent(folderId)}` : '/api/refresh-files.php';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.files)) {
        
        
        this.state.files = data.files.map((file: FileData) => this.normalizeFileData(file));
        this.applyFiltersAndSort();
        
        
        
        // 新しいファイルがアップロードされた可能性がある場合、最新ファイルのページに移動
        this.goToLatestFilePage();
        
        this.render();
        
        // レンダリング完了を確実に待つ（Promiseベース）
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => {
            setTimeout(() => {
              
              if (this.events) {
                this.events.reinitializeEvents();
              }              
              resolve();
            }, 100); // 少し長めの待機時間で確実性を向上
          });
        });
        
        
      } else {
        console.error('ファイルリスト更新エラー:', data.error || 'データが無効です');
      }
    } catch (error) {
      console.error('ファイルリストの更新に失敗:', error);
    } finally {
      // 処理完了フラグを設定
      this.state.isRefreshing = false;
      this.state.isLoading = false;
      this.updateLoadingState();
    }
  }

  /**
   * ローディング状態をUIに反映
   */
  private updateLoadingState(): void {
    // ローディング状態に応じてUIを更新
    if (this.state.isLoading || this.state.isRefreshing) {
      this.container.classList.add('file-manager--loading');
      
      // アクションボタンを無効化
      const actionButtons = this.container.querySelectorAll('.file-action-btn');
      actionButtons.forEach(button => {
        (button as HTMLButtonElement).disabled = true;
        button.classList.add('disabled');
      });
    } else {
      this.container.classList.remove('file-manager--loading');
      
      // アクションボタンを有効化
      const actionButtons = this.container.querySelectorAll('.file-action-btn');
      actionButtons.forEach(button => {
        (button as HTMLButtonElement).disabled = false;
        button.classList.remove('disabled');
      });
    }
  }

  /**
   * 処理中状態を取得
   */
  public isRefreshing(): boolean {
    return this.state.isRefreshing;
  }

  /**
   * URLパラメータを監視して自動更新
   */
  public initializeUrlParamWatcher(): void {
    // ページ読み込み時のURLパラメータチェック
    this.checkUrlParams();

    // popstateイベントで戻る・進むボタンに対応
    window.addEventListener('popstate', () => {
      this.checkUrlParams();
    });
  }

  /**
   * URLパラメータをチェックして必要な処理を実行
   */
  private async checkUrlParams(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const deleted = urlParams.get('deleted');
    
    if (deleted === 'success') {
      // deleted=successパラメータが検出された場合、UI更新を実行
      await this.refreshFromServer();
      
      // FolderManagerがある場合も更新
      if (window.folderManager) {
        await window.folderManager.refreshAll();
      }
      
      // URLパラメータをクリーンアップ（ブラウザ履歴を汚さずに）
      urlParams.delete('deleted');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }

  /**
   * 統計情報を取得
   */
  public getStats() {
    const selectedFiles = this.getSelectedFiles();
    const totalSize = this.state.files.reduce((sum, file) => sum + file.size, 0);
    
    return {
      totalFiles: this.state.files.length,
      filteredFiles: this.state.filteredFiles.length,
      selectedFiles: selectedFiles.length,
      totalSize
    };
  }

  /**
   * 現在の状態を取得
   */
  public getState(): FileManagerState {
    return { ...this.state };
  }

  /**
   * 指定されたファイルIDを含むページに移動
   */
  public goToPageContainingFile(fileId: string): boolean {
    const fileIndex = this.state.filteredFiles.findIndex(f => f.id.toString() === fileId);
    if (fileIndex === -1) {
      console.warn('FileManagerCore: 指定されたファイルが見つかりません:', fileId);
      return false;
    }
    
    const targetPage = Math.floor(fileIndex / this.state.itemsPerPage) + 1;
    
    if (targetPage !== this.state.currentPage) {
      this.setPage(targetPage);
      return true;
    }
    
    return false; // 既に正しいページにいる
  }

  /**
   * 最新のファイルを含むページに移動（通常は1ページ目）
   */
  public goToLatestFilePage(): void {
    if (this.state.filteredFiles.length > 0) {
      // ソートが新しい順の場合、最新ファイルは先頭にある
      const latestFile = this.state.filteredFiles[0];
      this.goToPageContainingFile(latestFile.id.toString());
    }
  }

  /**
   * 現在のページのファイルを取得
   */
  public getCurrentPageFiles(): FileData[] {
    const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
    const endIndex = startIndex + this.state.itemsPerPage;
    return this.state.filteredFiles.slice(startIndex, endIndex);
  }

  /**
   * フィルタリングとソートを適用
   */
  private applyFiltersAndSort(): void {
    let filtered = [...this.state.files];

    // 検索フィルター
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(file => {
        // データ検証: name プロパティが存在するかチェック
        if (!file || typeof file.name !== 'string') {
          console.warn('Invalid file data (missing name):', file);
          return false;
        }
        
        const nameMatch = file.name.toLowerCase().includes(query);
        const commentMatch = file.comment && typeof file.comment === 'string' 
          ? file.comment.toLowerCase().includes(query) 
          : false;
        
        return nameMatch || commentMatch;
      });
    }

    // ソート
    filtered.sort((a, b) => this.compareFiles(a, b));

    this.state.filteredFiles = filtered;

    // ページ数の調整
    const maxPage = this.getMaxPage();
    if (this.state.currentPage > maxPage && maxPage > 0) {
      this.state.currentPage = maxPage;
    }
  }

  /**
   * ファイルの比較関数
   */
  private compareFiles(a: FileData, b: FileData): number {
    // データ検証
    if (!a || !b) {
      console.warn('Invalid file data in comparison:', { a, b });
      return 0;
    }
    
    const [field, direction] = this.state.sortBy.split('_') as [SortField, SortDirection];
    const multiplier = direction === 'asc' ? 1 : -1;

    try {
      switch (field) {
        case 'name': {
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB) * multiplier;
        }
        case 'size': {
          const sizeA = typeof a.size === 'number' ? a.size : 0;
          const sizeB = typeof b.size === 'number' ? b.size : 0;
          return (sizeA - sizeB) * multiplier;
        }
        case 'date': {
          const dateA = new Date(a.upload_date || 0).getTime();
          const dateB = new Date(b.upload_date || 0).getTime();
          return (dateA - dateB) * multiplier;
        }
        case 'type': {
          const typeA = a.type || '';
          const typeB = b.type || '';
          return typeA.localeCompare(typeB) * multiplier;
        }
        default:
          return 0;
      }
    } catch (error) {
      console.error('Error in file comparison:', error, { a, b });
      return 0;
    }
  }

  /**
   * レンダリング
   */
  private render(): void {
    if (this.renderer) {
      this.renderer.render();
    }
  }

  /**
   * 破棄処理
   */
  public destroy(): void {
    // イベントリスナーの削除等
    this.state.selectedFiles.clear();
  }
}

export default FileManagerCore;