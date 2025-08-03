/**
 * FileManager イベント処理クラス (TypeScript版)
 * ユーザーインタラクションとイベントハンドリングを担当
 */

import { FileManagerCore } from './FileManagerCore';
import { ViewMode } from '../types/fileManager';
import { ShareApi, FileApi, AuthApi } from '../api/client';
import { showAlert, showConfirm, showPrompt, showPasswordPrompt } from '../utils/modal';

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
    // イベント委譲を使用して動的要素にも対応
    this.addListener(this.core.container, 'input', this.handleDelegatedInput.bind(this));
    this.addListener(this.core.container, 'keyup', this.handleDelegatedKeyup.bind(this));
    this.addListener(this.core.container, 'click', this.handleDelegatedClick.bind(this));
    this.addListener(this.core.container, 'change', this.handleDelegatedChange.bind(this));
    this.addListener(this.core.container, 'dblclick', this.handleDelegatedDoubleClick.bind(this));

    // キーボードショートカット
    this.addListener(document, 'keydown', this.handleKeyboard.bind(this));
  }

  /**
   * 委譲されたinputイベント処理
   */
  private handleDelegatedInput(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (target.classList.contains('file-manager__search-input')) {
      this.handleSearch(event);
    }
  }

  /**
   * 委譲されたkeyupイベント処理
   */
  private handleDelegatedKeyup(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (target.classList.contains('file-manager__search-input')) {
      this.handleSearchKeyup(event);
    }
  }

  /**
   * 委譲されたclickイベント処理
   */
  private handleDelegatedClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // ビュー切り替えボタン
    if (target.classList.contains('file-manager__view-btn') || target.closest('.file-manager__view-btn')) {
      this.handleViewToggle(event);
      return;
    }
    
    // ファイルアクションボタン
    if (target.classList.contains('file-action-btn') || target.closest('.file-action-btn')) {
      this.handleFileAction(event);
      return;
    }
    
    // 一括操作ボタン
    if (target.classList.contains('bulk-action-btn') || target.closest('.bulk-action-btn')) {
      this.handleBulkAction(event);
      return;
    }
    
    // ページネーションボタン
    if (target.classList.contains('pagination-btn') || target.closest('.pagination-btn')) {
      this.handlePagination(event);
      return;
    }
    
    // ソートヘッダー
    if (target.classList.contains('sortable') || target.closest('.sortable')) {
      this.handleSort(event);
      return;
    }
    
    // ファイルアイテムクリック
    if (target.classList.contains('file-grid-item') || target.closest('.file-grid-item')) {
      this.handleItemClick(event);
      return;
    }
    
    if (target.classList.contains('file-list-item') || target.closest('.file-list-item')) {
      this.handleItemClick(event);
      return;
    }
  }

  /**
   * 委譲されたchangeイベント処理
   */
  private handleDelegatedChange(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (target.classList.contains('file-checkbox')) {
      this.handleFileSelection(event);
    } else if (target.classList.contains('select-all-checkbox')) {
      this.handleSelectAll(event);
    } else if (target.classList.contains('file-manager__sort-select')) {
      this.handleSortSelectChange(event);
    }
  }

  /**
   * 委譲されたdoubleclickイベント処理
   */
  private handleDelegatedDoubleClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (target.classList.contains('file-grid-item') || target.closest('.file-grid-item')) {
      this.handleItemDoubleClick(event);
    } else if (target.classList.contains('file-list-item') || target.closest('.file-list-item')) {
      this.handleItemDoubleClick(event);
    }
  }

  /**
   * ソートセレクト変更処理
   */
  private handleSortSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const [field, direction] = select.value.split('_') as [import('../types/fileManager').SortField, import('../types/fileManager').SortDirection];
    this.core.setSortBy(field, direction);
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
    event.stopImmediatePropagation(); // 他のリスナーを停止
    
    const button = event.target as HTMLElement;
    const action = button.dataset.action;
    const fileId = button.dataset.fileId;
    
    if (!action || !fileId) return;
    
    // 重複実行を防ぐためのフラグチェック
    if (button.dataset.processing === 'true') {
      return;
    }
    
    // 処理中フラグを設定
    button.dataset.processing = 'true';
    
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) {
      button.dataset.processing = 'false';
      return;
    }

    try {
      switch (action) {
        case 'download':
          this.downloadFile(file.id.toString());
          break;
        case 'share':
          this.shareFile(file.id.toString());
          break;
        case 'delete':
          this.deleteFile(file.id.toString());
          break;
        case 'edit':
          this.editFile(file.id.toString());
          break;
        case 'move':
          this.moveFile(file.id.toString());
          break;
        case 'replace':
          this.replaceFile(file.id.toString());
          break;
      }
    } finally {
      // 処理完了後にフラグをリセット（少し遅延）
      setTimeout(() => {
        button.dataset.processing = 'false';
      }, 1000);
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
    
    // ダブルクリック処理中は除外
    if (item.dataset.doubleClickProcessing === 'true') {
      return;
    }
    
    const fileId = item.dataset.fileId;
    
    if (fileId) {
      // シングルクリックの遅延実行（ダブルクリックとの干渉を防ぐ）
      setTimeout(() => {
        // ダブルクリック処理中でないことを再確認
        if (item.dataset.doubleClickProcessing !== 'true') {
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
      }, 200); // 200ms遅延
    }
  }

  /**
   * アイテムダブルクリック処理
   */
  private handleItemDoubleClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation(); // 他のリスナーを停止
    
    const item = (event.currentTarget as HTMLElement);
    const fileId = item.dataset.fileId;
    
    // ダブルクリック処理中フラグをチェック
    if (item.dataset.doubleClickProcessing === 'true') {
      return;
    }
    
    // ダブルクリック処理中フラグを設定
    item.dataset.doubleClickProcessing = 'true';
    
    if (fileId) {
      this.downloadFile(fileId);
    }
    
    // フラグをリセット（遅延）
    setTimeout(() => {
      item.dataset.doubleClickProcessing = 'false';
    }, 1000);
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
  private async downloadFile(fileId: string): Promise<void> {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;

    let key = '';
    while (true) {
      try {
        const res = await AuthApi.verifyDownload(fileId, key);
        if (res.success && res.data?.token) {
          // トークン付きでダウンロード開始
          const link = document.createElement('a');
          link.href = `./download.php?id=${encodeURIComponent(fileId)}&key=${encodeURIComponent(res.data.token)}`;
          link.download = file.name || 'download';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log('ダウンロード:', file.name);
          return;
        }

        // 認証要求 or キー不一致
        const errCode = typeof res.error === 'object' && res.error ? (res.error as { code?: string }).code : res.error as string | undefined;
        if (errCode === 'AUTH_REQUIRED' || errCode === 'INVALID_KEY') {
          key = await showPasswordPrompt('ダウンロードキーを入力してください:') ?? '';
          if (!key) return; // キャンセル
          continue; // 再トライ
        }

        await showAlert(res.message || 'ダウンロードエラー');
        return;
      } catch (e) {
        console.error('verifyDownload error', e);
        await showAlert('ダウンロード処理でエラーが発生しました。');
        return;
      }
    }
  }

  /**
   * 選択ファイルのダウンロード
   */
  private async downloadSelectedFiles(): Promise<void> {
    const selectedFiles = this.core.getSelectedFiles();
    
    if (selectedFiles.length === 0) {
      await showAlert('ダウンロードするファイルを選択してください。');
      return;
    }
    
    if (selectedFiles.length === 1) {
      await this.downloadFile(selectedFiles[0].id.toString());
    } else {
      // 複数ファイルの場合はZIP化など
      console.log('複数ファイルダウンロード:', selectedFiles.length, '件');
      await showAlert('複数ファイルのダウンロード機能は実装中です。');
    }
  }

  /**
   * ファイル共有
   */
  private async shareFile(fileId: string): Promise<void> {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;
    
    try {
      // 共有リンク生成APIを呼び出し
      const result = await ShareApi.generateShareLink({
        fileId: fileId
      });
      
      if (result.success && result.data?.share_url) {
        // 共有リンクをクリップボードにコピー
        const shareUrl = result.data.share_url;
        
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareUrl);
          await showAlert(`共有リンクをクリップボードにコピーしました:\n${shareUrl}`);
        } else {
          // クリップボードAPIが使えない場合
          await showPrompt('共有リンク（Ctrl+Cでコピー）:', shareUrl);
        }
      } else {
        await showAlert('共有リンクの生成に失敗しました: ' + (result.error || '不明なエラー'));
      }
    } catch (error) {
      console.error('共有エラー:', error);
      await showAlert('共有機能でエラーが発生しました。');
    }
  }

  /**
   * ファイル削除
   */
  private async deleteFile(fileId: string): Promise<void> {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;

    if (!(await showConfirm(`「${file.name}」を削除しますか？この操作は取り消せません。`))) {
      return;
    }

    let key = '';
    
    while (true) {
      try {
        const res = await AuthApi.verifyDelete(fileId, key);
        if (res.success && res.data?.token) {
          // トークン OK → delete.php へ遷移
          window.location.href = `./delete.php?id=${encodeURIComponent(fileId)}&key=${encodeURIComponent(res.data.token)}`;
          return;
        }

        const errCode = typeof res.error === 'object' && res.error ? (res.error as { code?: string }).code : res.error as string | undefined;
        if (errCode === 'AUTH_REQUIRED') {
          key = await showPasswordPrompt('削除キーを入力してください:') ?? '';
          if (!key) return; // キャンセル
          continue; // 再トライ
        }
        
        if (errCode === 'INVALID_KEY') {
          key = await showPasswordPrompt('削除キーが正しくありません。再入力してください:') ?? '';
          if (!key) return;
          continue;
        }

        await showAlert(res.message || '削除検証エラー');
        return;
      } catch (e) {
        console.error('verifyDelete error', e);
        await showAlert('削除処理でエラーが発生しました。');
        return;
      }
    }
  }

  /**
   * 選択ファイルの削除
   */
  private async deleteSelectedFiles(): Promise<void> {
    const selectedFiles = this.core.getSelectedFiles();
    
    if (selectedFiles.length === 0) {
      await showAlert('削除するファイルを選択してください。');
      return;
    }
    
    if (!(await showConfirm(`選択した${selectedFiles.length}件のファイルを削除しますか？この操作は取り消せません。`))) {
      return;
    }
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      // 各ファイルを順次削除
      for (const file of selectedFiles) {
        try {
          const result = await FileApi.deleteFile(file.id.toString());
          
          if (result.success) {
            this.core.removeFile(file.id.toString());
            successCount++;
          } else {
            console.error('ファイル削除失敗:', file.name, result.error);
            errorCount++;
          }
        } catch (error) {
          console.error('ファイル削除エラー:', file.name, error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        await showAlert(`${successCount}件のファイルを削除しました。${errorCount > 0 ? `\n${errorCount}件の削除に失敗しました。` : ''}`);
      } else {
        await showAlert('ファイルの削除に失敗しました。');
      }
    } catch (error) {
      console.error('一括削除エラー:', error);
      await showAlert('ファイル削除でエラーが発生しました。');
    }
  }

  /**
   * ファイル編集
   */
  private async editFile(fileId: string): Promise<void> {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;
    
    // コメント編集モーダルを表示する関数を呼び出し
    if (typeof (window as unknown as { editFile?: (id: string, name?: string, comment?: string) => void }).editFile === 'function') {
      (window as unknown as { editFile: (id: string, name?: string, comment?: string) => void }).editFile(fileId, file.name, file.comment);
    } else {
      await showAlert('編集機能が読み込まれていません。ページを再読み込みしてください。');
    }
  }

  /**
   * ファイル移動
   */
  private async moveFile(fileId: string): Promise<void> {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;
    
    // フォルダマネージャーのmoveFile関数を呼び出し
    if (typeof (window as unknown as { moveFile?: (id: string) => Promise<void> }).moveFile === 'function') {
      await (window as unknown as { moveFile: (id: string) => Promise<void> }).moveFile(fileId);
    } else {
      await showAlert('フォルダマネージャーが読み込まれていません。');
    }
  }

  /**
   * ファイル差し替え
   */
  private async replaceFile(fileId: string): Promise<void> {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;
    
    // ファイル差し替えモーダルを表示する関数を呼び出し
    if (typeof (window as unknown as { replaceFile?: (id: string, name?: string) => void }).replaceFile === 'function') {
      (window as unknown as { replaceFile: (id: string, name?: string) => void }).replaceFile(fileId, file.name);
    } else {
      await showAlert('差し替え機能が読み込まれていません。ページを再読み込みしてください。');
    }
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