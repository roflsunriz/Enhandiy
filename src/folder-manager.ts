/**
 * フォルダマネージャ機能 (TypeScript版)
 * 既存のフォルダナビゲーションに統合された管理機能
 */

import { ready } from './utils/dom';
import { get, post, put, del } from './utils/http';
import { ApiResponse, FolderData } from './types/global';
import { initializeErrorHandling } from './utils/errorHandling';

interface FolderApiResponse extends ApiResponse {
  folders?: FolderData[];
  file_count?: number;
  child_count?: number;
  moved_files?: number;
}

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
    // フォルダ作成ボタン
    const createBtn = document.getElementById('create-folder-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateFolderDialog());
    }
    
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
  
  // フォルダ選択プルダウンの選択肢を読み込み
  private async loadFolderOptions(): Promise<void> {
    try {
      const response = await get<FolderApiResponse>('./app/api/folders.php');
      this.updateFolderSelect((response as FolderApiResponse).folders || []);
    } catch (error) {
      console.error('フォルダ読み込みエラー:', error);
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
  private showCreateFolderDialog(): void {
    const folderName = window.prompt('新しいフォルダ名を入力してください:');
    if (!folderName || !folderName.trim()) return;
    
    this.createFolder(folderName.trim(), this.currentFolderId);
  }
  
  // フォルダ作成
  private async createFolder(name: string, parentId: string | null = null): Promise<void> {
    try {
      await post<FolderApiResponse>('./app/api/folders.php', {
        name: name,
        parent_id: parentId
      });
      
      alert('フォルダを作成しました: ' + name);
      // ページを再読み込み
      window.location.reload();
      
    } catch (error) {
      console.error('フォルダ作成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ作成に失敗しました';
      alert('エラー: ' + errorMessage);
    }
  }
  
  // フォルダ名変更ダイアログ
  private showRenameFolderDialog(folderId: string): void {
    const folderElement = document.querySelector(`[data-folder-id="${folderId}"] .folder-item`);
    const currentName = folderElement ? folderElement.textContent?.trim().replace('📁', '').trim() : '';
    
    const newName = window.prompt('新しいフォルダ名を入力してください:', currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;
    
    this.renameFolder(folderId, newName.trim());
  }
  
  // フォルダ名変更
  private async renameFolder(folderId: string, newName: string): Promise<void> {
    try {
      await put<FolderApiResponse>('./app/api/folders.php', {
        id: folderId,
        name: newName
      });
      
      alert('フォルダ名を変更しました: ' + newName);
      // 名前変更後は現在のページを適切にリロード
      window.location.reload();
      
    } catch (error) {
      console.error('フォルダ名変更エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ名変更に失敗しました';
      alert('エラー: ' + errorMessage);
    }
  }
  
  // フォルダ移動ダイアログ
  private async showMoveFolderDialog(folderId: string): Promise<void> {
    try {
      // フォルダ一覧を取得
      const response = await get<FolderApiResponse>('./app/api/folders.php');
      const folders = (response as FolderApiResponse).folders || [];
      
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
      
      const targetId = window.prompt(options + '\n移動先のフォルダIDを入力してください:');
      if (targetId === null) return; // キャンセル
      
      const parentId = targetId.toLowerCase() === 'root' ? null : targetId;
      this.moveFolder(folderId, parentId);
      
    } catch (error) {
      console.error('フォルダ移動ダイアログエラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ移動の準備に失敗しました';
      alert('エラー: ' + errorMessage);
    }
  }
  
  // フォルダ移動
  private async moveFolder(folderId: string, newParentId: string | null): Promise<void> {
    try {
      await put<FolderApiResponse>('./app/api/folders.php', {
        id: folderId,
        parent_id: newParentId
      });
      
      alert('フォルダを移動しました');
      // 移動後は現在のページを適切にリロード
      window.location.reload();
      
    } catch (error) {
      console.error('フォルダ移動エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ移動に失敗しました';
      alert('エラー: ' + errorMessage);
    }
  }
  
  // フォルダ削除確認ダイアログ
  private async showDeleteFolderDialog(folderId: string): Promise<void> {
    const folderElement = document.querySelector(`[data-folder-id="${folderId}"] .folder-item`);
    const folderName = folderElement ? folderElement.textContent?.trim().replace('📁', '').trim() : 'フォルダ';
    
    try {
      // フォルダ内のファイル数を確認
      const response = await get<FolderApiResponse>(`./app/api/folders.php?id=${folderId}&check=true`);
      
      const fileCount = (response as FolderApiResponse).file_count || 0;
      const childCount = (response as FolderApiResponse).child_count || 0;
      
      if (fileCount === 0 && childCount === 0) {
        // 空のフォルダの場合
        if (confirm(`フォルダ「${folderName}」を削除しますか？`)) {
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
        
        if (confirm(message)) {
          this.deleteFolder(folderId, true);
        }
      }
    } catch (error) {
      console.error('フォルダ削除確認エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ情報の取得に失敗しました';
      alert('エラー: ' + errorMessage);
    }
  }
  
  // フォルダ削除
  private async deleteFolder(folderId: string, moveFiles = false): Promise<void> {
    try {
      const url = `./app/api/folders.php?id=${folderId}${moveFiles ? '&move_files=true' : ''}`;
      const response = await del<FolderApiResponse>(url);
      
      if (moveFiles && (response as FolderApiResponse).moved_files && (response as FolderApiResponse).moved_files! > 0) {
        alert(`フォルダを削除しました。\n${(response as FolderApiResponse).moved_files}個のファイルをルートフォルダに移動しました。`);
      } else {
        alert('フォルダを削除しました');
      }
      
      // 削除後は現在のページを適切にリロード
      window.location.reload();
      
    } catch (error) {
      console.error('フォルダ削除エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォルダ削除に失敗しました';
      alert('エラー: ' + errorMessage);
    }
  }
}

// グローバルファイル移動関数（外部から呼び出し可能）
export async function moveFile(fileId: string): Promise<void> {
  if (!window.folderManager) {
    alert('フォルダマネージャが初期化されていません');
    return;
  }
  
  try {
    // フォルダ一覧を取得
    const response = await get<FolderApiResponse>('./app/api/folders.php');
    const folders = (response as FolderApiResponse).folders || [];
    
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
    
    const targetId = window.prompt(options + '\n移動先のフォルダIDを入力してください:');
    if (targetId === null) return; // キャンセル
    
    const folderId = targetId.toLowerCase() === 'root' ? null : targetId;
    
    // ファイル移動API呼び出し
    await post('./app/api/move-file.php', {
      file_id: fileId,
      folder_id: folderId
    });
    
    alert('ファイルを移動しました');
    window.location.reload();
    
  } catch (error) {
    console.error('ファイル移動エラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'ファイル移動に失敗しました';
    alert('エラー: ' + errorMessage);
  }
}

// モジュール初期化
ready(() => {
  console.log('Folder Manager functionality initialized (TypeScript)');
  
  // エラーハンドリングの初期化
  initializeErrorHandling();
  
  if (document.getElementById('folder-grid') || document.getElementById('folder-select')) {
    const manager = new SimpleFolderManager();
    // グローバルに公開（既存のJavaScriptとの互換性のため）
    window.folderManager = manager;
  }
});

// グローバル関数として公開（既存のJavaScriptとの互換性のため）
(window as unknown as Record<string, unknown>).moveFile = moveFile;

export {};