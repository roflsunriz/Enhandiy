/**
 * フォルダマネージャ機能 (TypeScript版)
 * 既存のフォルダナビゲーションに統合された管理機能
 */

import { ready } from './utils/dom';
import { FolderApi } from './api/client';
import { FolderData } from './types/global';
import { initializeErrorHandling } from './utils/errorHandling';
import { post } from './utils/http';
import { showAlert, showConfirm, showPrompt } from './utils/modal';

// FolderApiを使用するため、個別インターフェースは不要
// interface FolderApiResponse extends ApiResponse {
//   folders?: FolderData[];
//   file_count?: number;
//   child_count?: number;
//   moved_files?: number;
// }

// Window型を拡張
declare global {
  interface Window {
    folderManager?: SimpleFolderManager;
  }
}

class SimpleFolderManager {
  private currentFolderId: string | null = null;
  
  constructor() {
    this.init();
  }
  
  private init(): void {
    // URL パラメータから現在のフォルダIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    this.currentFolderId = urlParams.get('folder') || null;
    
    this.setupEventListeners();
    this.loadFolderOptions();
  }
  
  private setupEventListeners(): void {
    // フォルダ作成ボタン（遅延バインディング対応）
    this.bindCreateFolderButton();
    
    // フォルダ管理メニュー（イベントデリゲーション）
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('rename-folder')) {
        e.preventDefault();
        const folderId = target.dataset.folderId;
        if (folderId) {
          this.showRenameFolderDialog(folderId);
        }
      }
      
      if (target.classList.contains('move-folder')) {
        e.preventDefault();
        const folderId = target.dataset.folderId;
        if (folderId) {
          this.showMoveFolderDialog(folderId);
        }
      }
      
      if (target.classList.contains('delete-folder')) {
        e.preventDefault();
        const folderId = target.dataset.folderId;
        if (folderId) {
          this.showDeleteFolderDialog(folderId);
        }
      }
    });
  }

  private bindCreateFolderButton(): void {
    const createBtn = document.getElementById('create-folder-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateFolderDialog());
      console.log('Create folder button bound');
    } else {
      console.log('Create folder button not found, retrying in 500ms');
      // 500ms後に再試行（DOMが完全に読み込まれていない場合に対応）
      setTimeout(() => this.bindCreateFolderButton(), 500);
    }
  }
  
  // フォルダ選択プルダウンの選択肢を読み込み
  private async loadFolderOptions(): Promise<void> {
    try {
          const response = await FolderApi.getFolders();
    this.updateFolderSelect(response.data || []);
    } catch (error) {
      console.error('フォルダ読み込みエラー:', error);
    }
  }

  /**
   * フォルダ表示とFileManagerを動的更新
   */
  public async refreshAll(): Promise<void> {
    try {
      // フォルダ選択プルダウンを更新
      await this.loadFolderOptions();
      
      // FileManagerがある場合は更新
      if (window.fileManagerInstance) {
        await window.fileManagerInstance.refreshFromServer();
      }
      
      // フォルダナビゲーション部分も更新
      this.refreshFolderNavigation();
    } catch (error) {
      console.error('フォルダとファイル表示の更新に失敗:', error);
    }
  }

  /**
   * フォルダナビゲーション部分の更新
   */
  private refreshFolderNavigation(): void {
    // フォルダナビゲーション部分が存在する場合は、内容を動的に更新
    const folderNav = document.querySelector('.folder-navigation');
    if (folderNav) {
      // 現在のフォルダIDに基づいてナビゲーションを再構築
      this.updateFolderNavigation();
    }
  }

  /**
   * フォルダナビゲーションの再構築
   */
  private async updateFolderNavigation(): Promise<void> {
    try {
      await FolderApi.getFolders();
      // ここでナビゲーション部分のHTMLを再構築する処理を追加
      // 実装は既存のフォルダナビゲーション表示ロジックに依存
    } catch (error) {
      console.error('フォルダナビゲーション更新エラー:', error);
    }
  }
  
  // フォルダ選択プルダウンを更新
  private updateFolderSelect(folders: FolderData[]): void {
    const folderSelect = document.getElementById('folder-select') as HTMLSelectElement;
    if (!folderSelect) return;
    
    // 現在選択されている値を保持
    const currentValue = folderSelect.value;
    
    // プルダウンを再構築
    folderSelect.innerHTML = '<option value="">ルートフォルダ</option>';
    
    const addOptions = (folders: FolderData[], level = 0): void => {
      folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = '　'.repeat(level) + folder.name;
        folderSelect.appendChild(option);
        
        // 子フォルダがある場合は再帰的に追加
        const folderWithChildren = folder as FolderData & { children?: FolderData[] };
        if ('children' in folder && folderWithChildren.children && folderWithChildren.children.length > 0) {
          addOptions(folderWithChildren.children, level + 1);
        }
      });
    };
    
    addOptions(folders);
    
    // 値を復元
    folderSelect.value = currentValue;
  }
  
  // フォルダ作成ダイアログ
  private async showCreateFolderDialog(): Promise<void> {
    const folderName = await showPrompt('新しいフォルダ名を入力してください:');
    if (!folderName || !folderName.trim()) return;
    
    this.createFolder(folderName.trim(), this.currentFolderId);
  }
  
  // フォルダ作成
  private async createFolder(name: string, parentId: string | null = null): Promise<void> {
    try {
      await FolderApi.createFolder(name, parentId || undefined);
      
      await showAlert('フォルダを作成しました: ' + name);
      // 動的更新
      await this.refreshAll();
      
    } catch (error) {
      console.error('フォルダ作成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ作成に失敗しました';
      await showAlert('エラー: ' + errorMessage);
    }
  }
  
  // フォルダ名変更ダイアログ
  private async showRenameFolderDialog(folderId: string): Promise<void> {
    const folderElement = document.querySelector(`[data-folder-id="${folderId}"] .folder-item`);
    const currentName = folderElement ? folderElement.textContent?.trim().replace('📁', '').trim() : '';
    
    const newName = await showPrompt('新しいフォルダ名を入力してください:', currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;
    
    this.renameFolder(folderId, newName.trim());
  }
  
  // フォルダ名変更
  private async renameFolder(folderId: string, newName: string): Promise<void> {
    try {
      await FolderApi.updateFolder(folderId, newName);
      
      await showAlert('フォルダ名を変更しました: ' + newName);
      // 動的更新
      await this.refreshAll();
      
    } catch (error) {
      console.error('フォルダ名変更エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ名変更に失敗しました';
      await showAlert('エラー: ' + errorMessage);
    }
  }
  
  // フォルダ移動ダイアログ
  private async showMoveFolderDialog(folderId: string): Promise<void> {
    try {
      // フォルダ一覧を取得
      const response = await FolderApi.getFolders();
      const folders = response.data || [];
      
      // 移動先選択のプロンプト作成
      let options = 'ルートフォルダに移動する場合は「root」と入力してください。\n\n利用可能なフォルダ:\n';
      const addFolderOptions = (folders: FolderData[], level = 0): void => {
        folders.forEach(folder => {
          if (folder.id !== folderId) { // 自分自身は除外
            options += '　'.repeat(level) + `${folder.id}: ${folder.name}\n`;
          }
          const folderWithChildren = folder as FolderData & { children?: FolderData[] };
          if ('children' in folder && folderWithChildren.children && folderWithChildren.children.length > 0) {
            addFolderOptions(folderWithChildren.children, level + 1);
          }
        });
      };
      addFolderOptions(folders);
      
      const targetId = await showPrompt(options + '\n移動先のフォルダIDを入力してください:');
      if (targetId === null) return; // キャンセル
      
      const parentId = targetId.toLowerCase() === 'root' ? null : targetId;
      this.moveFolder(folderId, parentId);
      
    } catch (error) {
      console.error('フォルダ移動ダイアログエラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ移動の準備に失敗しました';
      await showAlert('エラー: ' + errorMessage);
    }
  }
  
  // フォルダ移動（現在のAPIには移動機能がないため、コメントアウト）
  private async moveFolder(folderId: string, newParentId: string | null): Promise<void> {
    try {
      // TODO: FolderApiに移動機能を追加する必要がある
      console.warn('フォルダ移動機能は未実装です', { folderId, newParentId });
      await showAlert('フォルダ移動機能は現在実装中です。');
      return;
      
      // 移動後は現在のページを適切にリロード
      // window.location.reload();
      
    } catch (error) {
      console.error('フォルダ移動エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ移動に失敗しました';
      await showAlert('エラー: ' + errorMessage);
    }
  }
  
  // フォルダ削除確認ダイアログ
  private async showDeleteFolderDialog(folderId: string): Promise<void> {
    const folderElement = document.querySelector(`[data-folder-id="${folderId}"] .folder-item`);
    const folderName = folderElement ? folderElement.textContent?.trim().replace('📁', '').trim() : 'フォルダ';
    
    try {
      // フォルダ内のファイル数を確認
          const response = await FolderApi.getFolderFileCount(folderId);
    
    const fileCount = response.data?.count || 0;
    const childCount = 0; // 子フォルダ数は別途API実装が必要
      
      if (fileCount === 0 && childCount === 0) {
        // 空のフォルダの場合
        if (await showConfirm(`フォルダ「${folderName}」を削除しますか？`)) {
          this.deleteFolder(folderId, false);
        }
      } else {
        // ファイルまたは子フォルダがある場合
        let message = `フォルダ「${folderName}」には以下が含まれています：\n`;
        if (fileCount > 0) message += `・ファイル: ${fileCount}個\n`;
        if (childCount > 0) message += `・子フォルダ: ${childCount}個\n`;
        message += '\n削除方法を選択してください：\n';
        message += '「OK」= 中身をルートフォルダに移動して削除\n';
        message += '「キャンセル」= 削除を中止';
        
        if (await showConfirm(message)) {
          this.deleteFolder(folderId, true);
        }
      }
    } catch (error) {
      console.error('フォルダ削除確認エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ情報の取得に失敗しました';
      await showAlert('エラー: ' + errorMessage);
    }
  }
  
  // フォルダ削除
  private async deleteFolder(folderId: string, _moveFiles = false): Promise<void> {
    try {
      const response = await FolderApi.deleteFolder(folderId);
      
      if (response.success) {
        await showAlert('フォルダを削除しました');
      } else {
        throw new Error(response.error || 'フォルダ削除に失敗しました');
      }
      
      // 動的更新
      await this.refreshAll();
      
    } catch (error) {
      console.error('フォルダ削除エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ削除に失敗しました';
      await showAlert('エラー: ' + errorMessage);
    }
  }
}

// グローバルファイル移動関数（外部から呼び出し可能）
export async function moveFile(fileId: string): Promise<void> {
  // フォルダ機能が無効でも移動機能は提供
  const config = (window as unknown as { config?: { folders_enabled?: boolean } }).config;
  if (!config || !config.folders_enabled) {
    await showAlert('フォルダ機能が無効になっています。設定を確認してください。');
    return;
  }
  
  try {
    // フォルダ一覧を取得
    const response = await FolderApi.getFolders();
    const folders = response.data || [];
    
    // 移動先選択のプロンプト作成
    let options = 'ルートフォルダに移動する場合は「root」と入力してください。\n\n利用可能なフォルダ:\n';
    const addFolderOptions = (folders: FolderData[], level = 0): void => {
      folders.forEach(folder => {
        options += '　'.repeat(level) + `${folder.id}: ${folder.name}\n`;
        const folderWithChildren = folder as FolderData & { children?: FolderData[] };
        if ('children' in folder && folderWithChildren.children && folderWithChildren.children.length > 0) {
          addFolderOptions(folderWithChildren.children, level + 1);
        }
      });
    };
    addFolderOptions(folders);
    
    const targetId = await showPrompt(options + '\n移動先のフォルダIDを入力してください:');
    if (targetId === null) return; // キャンセル
    
    const folderId = targetId.toLowerCase() === 'root' ? null : targetId;
    
    // ファイル移動API呼び出し
    await post('./app/api/move-file.php', {
      file_id: fileId,
      folder_id: folderId
    });
    
    await showAlert('ファイルを移動しました');
    window.location.reload();
    
  } catch (error) {
    console.error('ファイル移動エラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'ファイル移動に失敗しました';
    await showAlert('エラー: ' + errorMessage);
  }
}

// モジュール初期化
ready(() => {
  console.log('Folder Manager functionality initialized (TypeScript)');
  
  // エラーハンドリングの初期化
  initializeErrorHandling();
  
  // フォルダ機能が有効な場合は常に初期化
  const config = (window as unknown as { config?: { folders_enabled?: boolean } }).config;
  if (config && config.folders_enabled) {
    const manager = new SimpleFolderManager();
    // グローバルに公開（既存のJavaScriptとの互換性のため）
    window.folderManager = manager;
    console.log('SimpleFolderManager initialized');
  } else {
    console.log('Folder functionality is disabled or config not available');
  }
});

// グローバル関数として公開（既存のJavaScriptとの互換性のため）
(window as unknown as Record<string, unknown>).moveFile = moveFile;

export {};