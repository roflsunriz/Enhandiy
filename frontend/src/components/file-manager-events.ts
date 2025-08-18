/**
 * FileManager イベント処理クラス (TypeScript版)
 * ユーザーインタラクションとイベントハンドリングを担当
 */

import { FileManagerCore } from './file-manager-core';
import { ViewMode } from '../types/file-manager';
import { FileApi, AuthApi } from '../api/client';
import { showAlert, showConfirm, showPasswordPrompt, showModal, hideModal } from '../utils/modal';
// import { openShareModal } from '../file-edit'; // 使用しない

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
   * イベントハンドラーの再初期化（動的更新後に呼び出し）
   */
  public reinitializeEvents(): void {
    
    
    // 委譲型イベントが正常に動作しているかテスト
    const testButton = this.core.container.querySelector('.file-action-btn');
    if (!testButton) {
      console.warn('FileManagerEvents: アクションボタンが見つかりません');
    }
    
    // 既存のリスナーを削除してから初期化を再実行
    this.destroy();
    this.init(); // 重複コードを削除して init() を再利用
    
    
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
    const [field, direction] = select.value.split('_') as [import('../types/file-manager').SortField, import('../types/file-manager').SortDirection];
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
    
    
    
    if (!action || !fileId) {
      console.warn('FileManagerEvents: action または fileId が見つかりません', { action, fileId });
      return;
    }
    
    // FileManagerが処理中の場合は操作を無効化
    if (this.core.isRefreshing()) {
      
      return;
    }
    
    // ボタンが無効化されている場合は処理しない
    if ((button as HTMLButtonElement).disabled || button.classList.contains('disabled')) {
      
      return;
    }
    
    // 重複実行を防ぐためのフラグチェック
    if (button.dataset.processing === 'true') {
      
      return;
    }
    
    // 処理中フラグを設定
    button.dataset.processing = 'true';
    
    // ファイル検索処理
    const currentPageFiles = this.core.getCurrentPageFiles();
    const allFiles = this.core.getFiles();
    
    // 現在ページのファイルから検索（DOM上に存在するファイルのみ）
    let file = currentPageFiles.find(f => f.id.toString() === fileId);
    
    if (!file) {
      // 現在ページにない場合、全ファイルから検索
      const fileInOtherPage = allFiles.find(f => f.id.toString() === fileId);
      
      if (fileInOtherPage) {
        // 該当ファイルを含むページに移動
        const moved = this.core.goToPageContainingFile(fileId);
        
        if (moved) {
          // ページ移動後、再度ファイルを取得
          const newCurrentPageFiles = this.core.getCurrentPageFiles();
          file = newCurrentPageFiles.find(f => f.id.toString() === fileId);
          
          if (!file) {
            console.error('FileManagerEvents: ページ移動後もファイルが見つかりません', { fileId });
            button.dataset.processing = 'false';
            return;
          }
        } else {
          console.error('FileManagerEvents: ページ移動に失敗しました', { fileId });
          button.dataset.processing = 'false';
          return;
        }
      } else {
        console.error('FileManagerEvents: ファイルが見つかりません', {
          searchFileId: fileId,
          searchFileIdType: typeof fileId,
          currentPageAvailableIds: currentPageFiles.map(f => f.id),
          allAvailableIds: allFiles.map(f => f.id),
          isRefreshing: this.core.isRefreshing(),
          note: 'ファイルが完全に存在しません'
        });
        button.dataset.processing = 'false';
        return;
      }
    }
    
    

    try {
      switch (action) {
        case 'download':
          this.downloadFile(file.id.toString());
          break;
        case 'share':
          // グローバル関数を呼び出してシェアモーダルを開く
          if (window.openShareModal) {
            window.openShareModal(fileId!, file.name!, file.comment || '');
          }
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
      case 'select-all':
        this.selectAllFiles();
        break;
      case 'select-none':
        this.core.clearSelection();
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
    
    this.core.setSortBy(sortField as import('../types/file-manager').SortField, newDirection);
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
        // 複数ファイルダウンロード機能は削除されました
        keyEvent.preventDefault();
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
    const file = this.core.getFiles().find(f => f.id.toString() === fileId);
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
          
          return;
        }

        // 認証要求 or キー不一致
        const errCode = typeof res.error === 'object' && res.error ? (res.error as { code?: string }).code : res.error as string | undefined;
        if (errCode === 'AUTH_REQUIRED' || errCode === 'INVALID_KEY') {
          const modalResult = await this.showDownloadAuthModal(file.name || 'download', fileId);
          if (!modalResult) return; // キャンセル
          key = (modalResult.masterKey || modalResult.downloadKey || '').trim();
          if (!key) return; // 未入力はキャンセル扱い
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
   * ダウンロード認証モーダルを表示
   */
  private async showDownloadAuthModal(fileName: string, fileId: string): Promise<{ masterKey?: string, downloadKey?: string } | null> {
    return new Promise((resolve) => {
      const modal = document.getElementById('downloadAuthModal');
      if (!modal) {
        resolve(null);
        return;
      }

      // モーダル内容の設定
      const targetNameElement = modal.querySelector('#downloadTargetName');
      const masterKeyInput = modal.querySelector('#downloadAuthMasterKey') as HTMLInputElement;
      const downloadKeyInput = modal.querySelector('#downloadAuthDlKey') as HTMLInputElement;
      const fileIdInput = modal.querySelector('#downloadAuthFileId') as HTMLInputElement;
      const confirmButton = modal.querySelector('#downloadAuthConfirmBtn');

      if (targetNameElement) (targetNameElement as HTMLElement).textContent = fileName;
      if (masterKeyInput) masterKeyInput.value = '';
      if (downloadKeyInput) downloadKeyInput.value = '';
      if (fileIdInput) fileIdInput.value = fileId;

      // イベントリスナー設定
      const handleConfirm = () => {
        const masterKey = masterKeyInput?.value.trim() || undefined;
        const downloadKey = downloadKeyInput?.value.trim() || undefined;

        // どちらか一方の入力が必要
        if (!masterKey && !downloadKey) {
          alert('マスターキーまたはダウンロードキーのどちらか一方を入力してください。');
          return;
        }

        cleanup();
        hideModal('downloadAuthModal');
        resolve({ masterKey, downloadKey });
      };

      const handleCancel = () => {
        cleanup();
        hideModal('downloadAuthModal');
        resolve(null);
      };

      const cleanup = () => {
        confirmButton?.removeEventListener('click', handleConfirm);
        modal.removeEventListener('hidden.bs.modal', handleCancel as EventListener);
      };

      confirmButton?.addEventListener('click', handleConfirm);
      modal.addEventListener('hidden.bs.modal', handleCancel as EventListener, { once: true } as AddEventListenerOptions);

      // モーダル表示
      showModal('downloadAuthModal');
    });
  }

  /**
   * 全ファイルを選択
   */
  private selectAllFiles(): void {
    const allFiles = this.core.getFiles();
    allFiles.forEach(file => {
      this.core.getState().selectedFiles.add(file.id.toString());
    });
    this.core.refresh();
  }

  /**
   * ファイル削除（マスターキーまたは削除キー認証）
   */
  private async deleteFile(fileId: string): Promise<void> {
    const file = this.core.getFiles().find(f => f.id === fileId);
    if (!file) return;

    // 削除認証モーダルを表示
    const authResult = await this.showDeleteAuthModal(file.name || `ファイル${fileId}`, fileId);
    if (!authResult) {
      return; // キャンセルされた
    }

    try {
      // 進捗表示
      const progressMessage = this.showProgressMessage('削除中...');

      // 2段階削除処理：1.検証＋トークン生成 → 2.実際の削除
      const key = authResult.masterKey || authResult.deleteKey || '';
      const verifyResponse = await AuthApi.verifyDelete(fileId, key);

      if (verifyResponse.success && verifyResponse.data?.token) {
        // トークンを使って実際の削除を実行
        const deleteResponse = await fetch(`./delete.php?id=${fileId}&key=${verifyResponse.data.token}`, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        // 進捗メッセージを削除
        this.hideProgressMessage(progressMessage);

        if (deleteResponse.ok) {
          const result = await deleteResponse.json();
          if (result.success) {
            // アップロード完了処理と同じパターンで更新（showAlertの前に実行）
            setTimeout(async () => {
              try {
                // FolderManagerがある場合は、それが内部的にFileManagerも更新する
                if (window.folderManager) {
                  await window.folderManager.refreshAll();
                } 
                // FolderManagerがない場合は、FileManagerを直接更新
                else if (window.fileManagerInstance) {
                  await window.fileManagerInstance.refreshFromServer();
                }
                // 両方ともない場合はページをリロード
                else {
                  window.location.reload();
                }
              } catch (error) {
                console.error('個別削除: 更新処理エラー:', error);
                // エラーが発生した場合はページをリロード
                window.location.reload();
              }
            }, 1000);
            
            await showAlert('ファイルを削除しました。');
          } else {
            await showAlert(result.message || 'ファイルの削除に失敗しました。');
          }
        } else {
          await showAlert('削除処理でエラーが発生しました。');
        }
      } else {
        // 進捗メッセージを削除
        this.hideProgressMessage(progressMessage);
        
        // 検証エラー処理
        const errorCode = typeof verifyResponse.error === 'object' && verifyResponse.error ? 
          (verifyResponse.error as { code?: string }).code : verifyResponse.error as string | undefined;
          
        let errorMessage = 'ファイルの削除に失敗しました。';
        
        if (errorCode === 'AUTH_REQUIRED') {
          errorMessage = 'マスターキーまたは削除キーの入力が必要です。';
        } else if (errorCode === 'INVALID_KEY') {
          errorMessage = 'マスターキーまたは削除キーが正しくありません。';
        } else if (verifyResponse.message) {
          errorMessage = verifyResponse.message;
        }
        
        await showAlert(errorMessage);
      }
      
    } catch (error) {
      console.error('削除エラー:', error);
      await showAlert('削除処理でシステムエラーが発生しました。');
    }
  }



  /**
   * 選択ファイルの削除（マスターキー認証）
   */
  private async deleteSelectedFiles(): Promise<void> {
    const selectedFiles = this.core.getSelectedFiles();
    
    if (selectedFiles.length === 0) {
      await showAlert('削除するファイルを選択してください。');
      return;
    }
    
    // 確認ダイアログ
    if (!(await showConfirm(`選択した${selectedFiles.length}件のファイルを削除しますか？この操作は取り消せません。`))) {
      return;
    }
    
    // マスターキー入力
    const masterKey = await showPasswordPrompt('管理者マスターキーを入力してください:');
    if (!masterKey) {
      await showAlert('削除処理がキャンセルされました。');
      return;
    }
    
    try {
      // 進捗表示
      const progressMessage = this.showProgressMessage(`削除中... (0/${selectedFiles.length})`);
      
      // ファイルIDを抽出
      const fileIds = selectedFiles.map(file => file.id.toString());
      
      // 一括削除API呼び出し
      const response = await FileApi.bulkDeleteFiles(fileIds, masterKey);
      
      // 進捗メッセージを削除
      this.hideProgressMessage(progressMessage);
      
      if (response.success && response.data) {
        const { summary, details } = response.data;
        
        // 成功メッセージ
        let message = `削除処理が完了しました。\n`;
        message += `成功: ${summary.deleted_count}件\n`;
        
        if (summary.failed_count > 0) {
          message += `失敗: ${summary.failed_count}件\n`;
        }
        
        if (summary.not_found_count > 0) {
          message += `見つからない: ${summary.not_found_count}件\n`;
        }
        
        // 失敗詳細があれば表示
        if (details.failed_files.length > 0) {
          message += `\n失敗したファイル:\n`;
          details.failed_files.slice(0, 5).forEach(file => {
            message += `- ${file.name}: ${file.reason}\n`;
          });
          if (details.failed_files.length > 5) {
            message += `... 他${details.failed_files.length - 5}件\n`;
          }
        }
        
        // アップロード完了処理と同じパターンで更新（showAlertの前に実行）
        setTimeout(async () => {
          try {
            // FolderManagerがある場合は、それが内部的にFileManagerも更新する
            if (window.folderManager) {
              await window.folderManager.refreshAll();
            } 
            // FolderManagerがない場合は、FileManagerを直接更新
            else if (window.fileManagerInstance) {
              await window.fileManagerInstance.refreshFromServer();
            }
            // 両方ともない場合はページをリロード
            else {
              window.location.reload();
            }
          } catch (error) {
            console.error('一括削除: 更新処理エラー:', error);
            // エラーが発生した場合はページをリロード
            window.location.reload();
          }
        }, 1000);
        
        await showAlert(message);
        
        // 選択状態をクリア
        this.core.clearSelection();
        
      } else {
        // エラー処理
        const errorCode = typeof response.error === 'object' && response.error ? 
          (response.error as { code?: string }).code : response.error as string | undefined;
          
        let errorMessage = 'ファイルの削除に失敗しました。';
        
        if (errorCode === 'MASTER_KEY_REQUIRED') {
          errorMessage = 'マスターキーの入力が必要です。';
        } else if (errorCode === 'INVALID_MASTER_KEY') {
          errorMessage = 'マスターキーが正しくありません。';
        } else if (errorCode === 'BULK_DELETE_DISABLED') {
          errorMessage = '一括削除機能が無効になっています。';
        } else if (response.message) {
          errorMessage = response.message;
        }
        
        await showAlert(errorMessage);
      }
      
    } catch (error) {
      console.error('一括削除エラー:', error);
      await showAlert('削除処理でシステムエラーが発生しました。');
    }
  }

  /**
   * 進捗メッセージを表示
   */
  private showProgressMessage(message: string): HTMLElement {
    const progressDiv = document.createElement('div');
    progressDiv.id = 'bulk-delete-progress';
    progressDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ffffff;
      border: 2px solid #007bff;
      border-radius: 8px;
      padding: 20px 30px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      font-size: 16px;
      color: #333;
    `;
    progressDiv.textContent = message;
    document.body.appendChild(progressDiv);
    return progressDiv;
  }

  /**
   * 進捗メッセージを非表示
   */
  private hideProgressMessage(element: HTMLElement): void {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * 削除認証モーダルを表示
   */
  private async showDeleteAuthModal(fileName: string, fileId: string): Promise<{ masterKey?: string, deleteKey?: string } | null> {
    return new Promise((resolve) => {
      const modal = document.getElementById('deleteAuthModal');
      if (!modal) {
        resolve(null);
        return;
      }

      // モーダル内容の設定
      const targetNameElement = modal.querySelector('#deleteTargetName');
      const masterKeyInput = modal.querySelector('#deleteAuthMasterKey') as HTMLInputElement;
      const deleteKeyInput = modal.querySelector('#deleteAuthDelKey') as HTMLInputElement;
      const fileIdInput = modal.querySelector('#deleteAuthFileId') as HTMLInputElement;
      const confirmButton = modal.querySelector('#deleteAuthConfirmBtn');

      if (targetNameElement) targetNameElement.textContent = fileName;
      if (masterKeyInput) masterKeyInput.value = '';
      if (deleteKeyInput) deleteKeyInput.value = '';
      if (fileIdInput) fileIdInput.value = fileId;

      // イベントリスナー設定
      const handleConfirm = () => {
        const masterKey = masterKeyInput?.value.trim() || undefined;
        const deleteKey = deleteKeyInput?.value.trim() || undefined;

        // どちらか一方の入力が必要
        if (!masterKey && !deleteKey) {
          alert('マスターキーまたは削除キーのどちらか一方を入力してください。');
          return;
        }

        cleanup();
        hideModal('deleteAuthModal');
        resolve({ masterKey, deleteKey });
      };

      const handleCancel = () => {
        cleanup();
        hideModal('deleteAuthModal');
        resolve(null);
      };

      const cleanup = () => {
        confirmButton?.removeEventListener('click', handleConfirm);
        modal.removeEventListener('hidden.bs.modal', handleCancel);
      };

      confirmButton?.addEventListener('click', handleConfirm);
      modal.addEventListener('hidden.bs.modal', handleCancel, { once: true });

      // モーダル表示
      showModal('deleteAuthModal');
    });
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