/**
 * FileManager 一括操作クラス (TypeScript版)
 * 複数ファイルに対する操作を担当
 */

import { FileData } from '../types/global';
import { FileManagerCore } from './FileManagerCore';
import { post, del } from '../utils/http';
import { showSuccess, showError } from '../utils/messages';
import { showConfirm } from '../utils/modal';

export class FileManagerBulkActions {
  private core: FileManagerCore;

  constructor(core: FileManagerCore) {
    this.core = core;
  }

  /**
   * 選択したファイルの一括ダウンロード
   */
  public async downloadSelected(): Promise<void> {
    const selectedFiles = this.core.getSelectedFiles();
    
    if (selectedFiles.length === 0) {
      showError('ダウンロードするファイルを選択してください。');
      return;
    }

    if (selectedFiles.length === 1) {
      // 単一ファイルの場合は直接ダウンロード
      this.downloadSingleFile(selectedFiles[0]);
      return;
    }

    // 複数ファイルの場合はZIP化
    await this.downloadMultipleFiles(selectedFiles);
  }

  /**
   * 選択したファイルの一括削除
   */
  public async deleteSelected(): Promise<void> {
    const selectedFiles = this.core.getSelectedFiles();
    
    if (selectedFiles.length === 0) {
      showError('削除するファイルを選択してください。');
      return;
    }

    const confirmed = await showConfirm(
      `選択した${selectedFiles.length}件のファイルを削除しますか？\n\n` +
      `削除されるファイル:\n${selectedFiles.map(f => f.name).slice(0, 5).join('\n')}` +
      `${selectedFiles.length > 5 ? `\n...他${selectedFiles.length - 5}件` : ''}\n\n` +
      `この操作は取り消せません。`
    );

    if (!confirmed) return;

    try {
      // 削除APIを並列実行
      const deletePromises = selectedFiles.map(file => this.deleteFile(file.id.toString()));
      const results = await Promise.allSettled(deletePromises);
      
      // 結果を集計
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (successful > 0) {
        showSuccess(`${successful}件のファイルを削除しました。`);
        
        // 成功したファイルをUIから削除
        selectedFiles.forEach(file => {
          this.core.removeFile(file.id.toString());
        });
      }
      
      if (failed > 0) {
        showError(`${failed}件のファイルの削除に失敗しました。`);
      }
      
    } catch (error) {
      console.error('一括削除エラー:', error);
      showError('ファイルの削除中にエラーが発生しました。');
    }
  }

  /**
   * 選択したファイルの一括移動
   */
  public async moveSelected(targetFolderId: string): Promise<void> {
    const selectedFiles = this.core.getSelectedFiles();
    
    if (selectedFiles.length === 0) {
      showError('移動するファイルを選択してください。');
      return;
    }

    try {
      // 移動APIを並列実行
      const movePromises = selectedFiles.map(file => 
        this.moveFile(file.id.toString(), targetFolderId)
      );
      
      const results = await Promise.allSettled(movePromises);
      
      // 結果を集計
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (successful > 0) {
        showSuccess(`${successful}件のファイルを移動しました。`);
        
        // 成功したファイルの情報を更新
        selectedFiles.forEach(file => {
          this.core.updateFile(file.id.toString(), { folder_id: targetFolderId });
        });
      }
      
      if (failed > 0) {
        showError(`${failed}件のファイルの移動に失敗しました。`);
      }
      
    } catch (error) {
      console.error('一括移動エラー:', error);
      showError('ファイルの移動中にエラーが発生しました。');
    }
  }

  /**
   * 選択したファイルの一括共有設定
   */
  public async shareSelected(shareSettings: {
    expirationDate?: string;
    downloadLimit?: number;
    password?: string;
  }): Promise<void> {
    const selectedFiles = this.core.getSelectedFiles();
    
    if (selectedFiles.length === 0) {
      showError('共有設定するファイルを選択してください。');
      return;
    }

    try {
      // 共有設定APIを並列実行
      const sharePromises = selectedFiles.map(file => 
        this.setFileSharing(file.id.toString(), shareSettings)
      );
      
      const results = await Promise.allSettled(sharePromises);
      
      // 結果を集計
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (successful > 0) {
        showSuccess(`${successful}件のファイルの共有設定を更新しました。`);
        
        // ファイル情報を更新
        this.core.refresh();
      }
      
      if (failed > 0) {
        showError(`${failed}件のファイルの共有設定に失敗しました。`);
      }
      
    } catch (error) {
      console.error('一括共有設定エラー:', error);
      showError('共有設定中にエラーが発生しました。');
    }
  }

  /**
   * 選択したファイルのメタデータ一括編集
   */
  public async editSelectedMetadata(updates: {
    comment?: string;
    tags?: string[];
  }): Promise<void> {
    const selectedFiles = this.core.getSelectedFiles();
    
    if (selectedFiles.length === 0) {
      showError('編集するファイルを選択してください。');
      return;
    }

    try {
      // メタデータ更新APIを並列実行
      const updatePromises = selectedFiles.map(file => 
        this.updateFileMetadata(file.id.toString(), updates)
      );
      
      const results = await Promise.allSettled(updatePromises);
      
      // 結果を集計
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (successful > 0) {
        showSuccess(`${successful}件のファイル情報を更新しました。`);
        
        // 成功したファイルの情報を更新
        selectedFiles.forEach(file => {
          this.core.updateFile(file.id.toString(), updates);
        });
      }
      
      if (failed > 0) {
        showError(`${failed}件のファイル更新に失敗しました。`);
      }
      
    } catch (error) {
      console.error('一括メタデータ更新エラー:', error);
      showError('ファイル情報の更新中にエラーが発生しました。');
    }
  }

  /**
   * 選択統計情報の取得
   */
  public getSelectionStats(): {
    count: number;
    totalSize: number;
    types: Record<string, number>;
    oldestDate: Date | null;
    newestDate: Date | null;
  } {
    const selectedFiles = this.core.getSelectedFiles();
    
    const stats = {
      count: selectedFiles.length,
      totalSize: 0,
      types: {} as Record<string, number>,
      oldestDate: null as Date | null,
      newestDate: null as Date | null
    };

    selectedFiles.forEach(file => {
      // サイズを累計
      stats.totalSize += file.size;
      
      // ファイルタイプを集計
      const type = (file.type || '').split('/')[0]; // image, video, text, etc.
      stats.types[type] = (stats.types[type] || 0) + 1;
      
      // 日付の範囲を計算
      const date = new Date(file.upload_date || 0);
      if (!stats.oldestDate || date < stats.oldestDate) {
        stats.oldestDate = date;
      }
      if (!stats.newestDate || date > stats.newestDate) {
        stats.newestDate = date;
      }
    });

    return stats;
  }

  /**
   * 私有メソッド群
   */

  /**
   * 単一ファイルのダウンロード
   */
  private downloadSingleFile(file: FileData): void {
    const link = document.createElement('a');
    link.href = `./download.php?id=${encodeURIComponent(file.id)}`;
    link.download = file.name || 'download';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 複数ファイルのZIP化ダウンロード
   */
  private async downloadMultipleFiles(files: FileData[]): Promise<void> {
    try {
      const fileIds = files.map(f => f.id);
      
      // ZIP化リクエスト
      const response = await post('/api/files/zip', {
        file_ids: fileIds
      });

      if (response.success && response.data && typeof response.data === 'object' && 'download_url' in response.data) {
        // ZIP化が完了した場合、ダウンロード開始
        const link = document.createElement('a');
        link.href = (response.data as { download_url: string }).download_url;
        link.download = `files_${new Date().toISOString().slice(0, 10)}.zip`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess(`${files.length}件のファイルをZIP化してダウンロードしました。`);
      } else {
        throw new Error(response.error || 'ZIP化に失敗しました');
      }
      
    } catch (error) {
      console.error('複数ファイルダウンロードエラー:', error);
      showError('複数ファイルのダウンロードに失敗しました。');
    }
  }

  /**
   * ファイル削除API
   */
  private async deleteFile(fileId: string): Promise<void> {
    const response = await del(`/api/files/${fileId}`);
    
    if (!response.success) {
      throw new Error(response.error || 'ファイルの削除に失敗しました');
    }
  }

  /**
   * ファイル移動API
   */
  private async moveFile(fileId: string, targetFolderId: string): Promise<void> {
    const response = await post(`/api/files/${fileId}/move`, {
      folder_id: targetFolderId
    });
    
    if (!response.success) {
      throw new Error(response.error || 'ファイルの移動に失敗しました');
    }
  }

  /**
   * ファイル共有設定API
   */
  private async setFileSharing(fileId: string, settings: Record<string, unknown>): Promise<void> {
    const response = await post(`/api/files/${fileId}/share`, settings);
    
    if (!response.success) {
      throw new Error(response.error || '共有設定に失敗しました');
    }
  }

  /**
   * ファイルメタデータ更新API
   */
  private async updateFileMetadata(fileId: string, updates: Record<string, unknown>): Promise<void> {
    const response = await post(`/api/files/${fileId}/metadata`, updates);
    
    if (!response.success) {
      throw new Error(response.error || 'メタデータの更新に失敗しました');
    }
  }
}

export default FileManagerBulkActions;