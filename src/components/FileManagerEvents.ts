/**
 * FileManager イベント処理クラス (TypeScript版)
 * ユーザーインタラクションとイベントハンドリングを担当
 */

import { FileManagerCore } from './FileManagerCore';
import { ViewMode } from '../types/fileManager';

export class FileManagerEvents {
  private core: FileManagerCore;
  private eventListeners: Array<{ element: Element | Window | Document; event: string; handler: EventListener }> = [];

  constructor(core: FileManagerCore) {
    this.core = core;
  }

  /**
   * 初期化処理
   */
  public init(): void {
    this.bindEvents();
  }

  /**
   * イベントリスナーの登録
   */
  private bindEvents(): void {
    // 検索入力
    this.addListener('.file-manager__search-input', 'input', this.handleSearch.bind(this));
    this.addListener('.file-manager__search-input', 'keyup', this.handleSearchKeyup.bind(this));

    // ビュー切り替え
    this.addListenerAll('.file-manager__view-btn', 'click', this.handleViewToggle.bind(this));

    // ファイル選択（チェックボックス）
    this.addListenerAll('.file-checkbox', 'change', this.handleFileSelection.bind(this));
    this.addListener('.select-all-checkbox', 'change', this.handleSelectAll.bind(this));

    // ファイルアクション
    this.addListenerAll('.file-action-btn', 'click', this.handleFileAction.bind(this));

    // 一括操作
    this.addListenerAll('.bulk-action-btn', 'click', this.handleBulkAction.bind(this));

    // ページネーション
    this.addListenerAll('.pagination-btn', 'click', this.handlePagination.bind(this));

    // ソート（リストビュー）
    this.addListenerAll('.sortable', 'click', this.handleSort.bind(this));

    // ファイルアイテムクリック（選択）
    this.addListenerAll('.file-grid-item', 'click', this.handleItemClick.bind(this));
    this.addListenerAll('.file-list-item', 'click', this.handleItemClick.bind(this));

    // ダブルクリック（ダウンロード）
    this.addListenerAll('.file-grid-item', 'dblclick', this.handleItemDoubleClick.bind(this));
    this.addListenerAll('.file-list-item', 'dblclick', this.handleItemDoubleClick.bind(this));

    // キーボードショートカット
    this.addListener(document, 'keydown', this.handleKeyboard.bind(this));
  }

  /**
   * 検索処理
   */
  private handleSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.core.setSearchQuery(input.value);
  }

  /**
   * 検索キーアップ処理（Enterキーでの検索実行）
   */
  private handleSearchKeyup(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === 'Enter') {
      const input = keyEvent.target as HTMLInputElement;
      this.core.setSearchQuery(input.value);
    }
  }

  /**
   * ビュー切り替え処理
   */
  private handleViewToggle(event: Event): void {
    event.preventDefault();
    const button = event.target as HTMLElement;
    const viewMode = button.dataset.view as ViewMode;
    
    if (viewMode) {
      this.core.setViewMode(viewMode);
    }
  }

  /**
   * ファイル選択処理
   */
  private handleFileSelection(event: Event): void {
    event.stopPropagation();
    const checkbox = event.target as HTMLInputElement;
    const fileId = checkbox.dataset.fileId;
    
    if (fileId) {
      this.core.toggleFileSelection(fileId);
    }
  }

  /**
   * 全選択処理
   */
  private handleSelectAll(event: Event): void {
    event.stopPropagation();
    this.core.toggleAllSelection();
  }

  /**
   * ファイルアクション処理
   */
  private handleFileAction(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.target as HTMLElement;
    const action = button.dataset.action;
    const fileId = button.dataset.fileId;
    
    if (!action || !fileId) return;
    
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;

    switch (action) {
      case 'download':
        this.downloadFile(file.id);
        break;
      case 'share':
        this.shareFile(file.id);
        break;
      case 'delete':
        this.deleteFile(file.id);
        break;
      case 'edit':
        this.editFile(file.id);
        break;
    }
  }

  /**
   * 一括操作処理
   */
  private handleBulkAction(event: Event): void {
    event.preventDefault();
    
    const button = event.target as HTMLElement;
    const action = button.dataset.action;
    
    switch (action) {
      case 'download':
        this.downloadSelectedFiles();
        break;
      case 'delete':
        this.deleteSelectedFiles();
        break;
      case 'cancel':
        this.core.clearSelection();
        break;
    }
  }

  /**
   * ページネーション処理
   */
  private handlePagination(event: Event): void {
    event.preventDefault();
    
    const button = event.target as HTMLElement;
    const page = parseInt(button.dataset.page || '1');
    
    if (!isNaN(page)) {
      this.core.setPage(page);
    }
  }

  /**
   * ソート処理
   */
  private handleSort(event: Event): void {
    event.preventDefault();
    
    const header = event.target as HTMLElement;
    const sortField = header.dataset.sort;
    
    if (!sortField) return;
    
    // 現在のソート状態を確認
    const currentSort = this.core.getState().sortBy;
    const [currentField, currentDirection] = currentSort.split('_');
    
    // 同じフィールドの場合は方向を切り替え、違う場合は昇順から開始
    let newDirection: 'asc' | 'desc' = 'asc';
    if (currentField === sortField && currentDirection === 'asc') {
      newDirection = 'desc';
    }
    
    this.core.setSortBy(sortField as import('../types/fileManager').SortField, newDirection);
  }

  /**
   * アイテムクリック処理
   */
  private handleItemClick(event: Event): void {
    // チェックボックスやボタンのクリックは除外
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('.file-action-btn')) {
      return;
    }
    
    const item = (event.currentTarget as HTMLElement);
    const fileId = item.dataset.fileId;
    
    if (fileId) {
      const mouseEvent = event as MouseEvent;
      // Ctrlキーまたは⌘キーが押されている場合は選択状態を切り替え
      if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
        this.core.toggleFileSelection(fileId);
      } else {
        // 通常クリックの場合は単一選択
        this.core.clearSelection();
        this.core.toggleFileSelection(fileId);
      }
    }
  }

  /**
   * アイテムダブルクリック処理
   */
  private handleItemDoubleClick(event: Event): void {
    event.preventDefault();
    
    const item = (event.currentTarget as HTMLElement);
    const fileId = item.dataset.fileId;
    
    if (fileId) {
      this.downloadFile(fileId);
    }
  }

  /**
   * キーボードショートカット処理
   */
  private handleKeyboard(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    // ファイルマネージャーがフォーカスされている場合のみ
    if (!this.core.container.contains(document.activeElement)) {
      return;
    }
    
    switch (keyEvent.key) {
      case 'Delete':
        keyEvent.preventDefault();
        this.deleteSelectedFiles();
        break;
      case 'Enter':
        keyEvent.preventDefault();
        this.downloadSelectedFiles();
        break;
      case 'Escape':
        keyEvent.preventDefault();
        this.core.clearSelection();
        break;
      case 'a':
        if (keyEvent.ctrlKey || keyEvent.metaKey) {
          keyEvent.preventDefault();
          this.core.toggleAllSelection();
        }
        break;
    }
  }

  /**
   * ファイルダウンロード
   */
  private downloadFile(fileId: string): void {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;
    
    // ダウンロードリンクを作成して実行
    const link = document.createElement('a');
    link.href = `./download.php?id=${encodeURIComponent(fileId)}`;
    link.download = file.name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('ダウンロード:', file.name);
  }

  /**
   * 選択ファイルのダウンロード
   */
  private downloadSelectedFiles(): void {
    const selectedFiles = this.core.getSelectedFiles();
    
    if (selectedFiles.length === 0) {
      alert('ダウンロードするファイルを選択してください。');
      return;
    }
    
    if (selectedFiles.length === 1) {
      this.downloadFile(selectedFiles[0].id);
    } else {
      // 複数ファイルの場合はZIP化など
      console.log('複数ファイルダウンロード:', selectedFiles.length, '件');
      alert('複数ファイルのダウンロード機能は実装中です。');
    }
  }

  /**
   * ファイル共有
   */
  private shareFile(fileId: string): void {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;
    
    console.log('共有:', file.name);
    alert('共有機能は実装中です。');
  }

  /**
   * ファイル削除
   */
  private deleteFile(fileId: string): void {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;
    
    if (confirm(`「${file.name}」を削除しますか？この操作は取り消せません。`)) {
      console.log('削除:', file.name);
      this.core.removeFile(fileId);
    }
  }

  /**
   * 選択ファイルの削除
   */
  private deleteSelectedFiles(): void {
    const selectedFiles = this.core.getSelectedFiles();
    
    if (selectedFiles.length === 0) {
      alert('削除するファイルを選択してください。');
      return;
    }
    
    if (confirm(`選択した${selectedFiles.length}件のファイルを削除しますか？この操作は取り消せません。`)) {
      selectedFiles.forEach(file => {
        this.core.removeFile(file.id);
      });
    }
  }

  /**
   * ファイル編集
   */
  private editFile(fileId: string): void {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;
    
    console.log('編集:', file.name);
    alert('編集機能は実装中です。');
  }

  /**
   * イベントリスナーの追加（単一要素）
   */
  private addListener(selector: string | Element | Document | Window, event: string, handler: EventListener): void {
    let element: Element | Document | Window | null = null;
    
    if (typeof selector === 'string') {
      element = this.core.container.querySelector(selector) || document.querySelector(selector);
    } else {
      element = selector;
    }
    
    if (element) {
      element.addEventListener(event, handler);
      this.eventListeners.push({ element, event, handler });
    }
  }

  /**
   * イベントリスナーの追加（複数要素）
   */
  private addListenerAll(selector: string, event: string, handler: EventListener): void {
    const elements = this.core.container.querySelectorAll(selector);
    elements.forEach(element => {
      element.addEventListener(event, handler);
      this.eventListeners.push({ element, event, handler });
    });
  }

  /**
   * 破棄処理
   */
  public destroy(): void {
    // 全てのイベントリスナーを削除
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }
}

export default FileManagerEvents;