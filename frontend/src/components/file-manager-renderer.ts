/**
 * FileManager レンダリングクラス (TypeScript版)
 * HTML生成とDOM操作を担当
 */

import { FileData } from '../types/global';
import { FileManagerCore } from './file-manager-core';
import { actionIcons, fileIconForMime, metaIcons } from '../utils/icons';

export class FileManagerRenderer {
  private core: FileManagerCore;

  constructor(core: FileManagerCore) {
    this.core = core;
  }

  /**
   * 初期化処理
   */
  public init(): void {
    this.setupContainer();
    // render() は setFiles() が呼ばれた後に実行されるため、ここでは呼ばない
  }

  /**
   * コンテナの初期設定
   */
  private setupContainer(): void {
    if (!this.core.container.classList.contains('file-manager-v2')) {
      this.core.container.classList.add('file-manager-v2');
    }
    
    // 基本構造を作成
    this.core.container.innerHTML = `
      <div class="file-manager__header">
        <div class="file-manager__controls">
          <div class="file-manager__search">
            <input type="text" class="file-manager__search-input" placeholder="ファイル名・コメントで検索">
          </div>
          <div class="file-manager__sort">
            <label>並び順:</label>
            <select class="file-manager__sort-select">
              <option value="name_asc">名前順</option>
              <option value="name_desc">名前順 (逆)</option>
              <option value="size_asc">サイズ小順</option>
              <option value="size_desc">サイズ大順</option>
              <option value="date_asc">古い順</option>
              <option value="date_desc" selected>新しい順</option>
            </select>
          </div>
          <div class="file-manager__view-toggle">
            <button class="file-manager__view-btn" data-view="grid" title="グリッド表示">
              グリッド
            </button>
            <button class="file-manager__view-btn" data-view="list" title="リスト表示">
              リスト
            </button>
            <button class="file-manager__refresh-btn" title="最新の状態に更新">
              ${actionIcons.refresh(18)} 更新
            </button>
          </div>
        </div>
        <div class="file-manager__stats">
          <span class="file-manager__stats-text"></span>
        </div>
      </div>
      
      <div class="file-manager__bulk-actions" style="display: none;">
        <div class="bulk-actions__controls">
          <button class="bulk-action-btn bulk-action-btn--select-all" data-action="select-all">
            全選択
          </button>
          <button class="bulk-action-btn bulk-action-btn--delete" data-action="delete">
            削除
          </button>
          <button class="bulk-action-btn bulk-action-btn--cancel" data-action="cancel">
            選択解除
          </button>
        </div>
      </div>
      
      <div class="file-manager__content">
        <div class="file-manager__grid" data-view="grid"></div>
        <div class="file-manager__list" data-view="list"></div>
      </div>
      
      <div class="file-manager__pagination">
        <div class="pagination__info"></div>
        <div class="pagination__controls"></div>
      </div>
      
      <div class="file-manager__loading" style="display: none;">
        <div class="loading__spinner"></div>
        <div class="loading__text">読み込み中...</div>
      </div>
    `;
  }

  /**
   * メインレンダリング処理
   */
  public render(): void {
    this.updateViewMode();
    this.renderFiles();
    this.renderPagination();
    this.renderStats();
    this.renderBulkActions();
  }

  /**
   * ビューモードの更新
   */
  private updateViewMode(): void {
    const viewMode = this.core.getViewMode();
    const state = this.core.getState();
    
    // ビューボタンの状態更新
    const viewButtons = this.core.container.querySelectorAll('.file-manager__view-btn');
    viewButtons.forEach(btn => {
      const buttonElement = btn as HTMLElement;
      if (buttonElement.dataset.view === viewMode) {
        buttonElement.classList.add('active');
      } else {
        buttonElement.classList.remove('active');
      }
    });
    
    // ソートセレクトの状態更新
    const sortSelect = this.core.container.querySelector('.file-manager__sort-select') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.value = state.sortBy;
    }
    
    // コンテンツエリアの表示切り替え
    const gridView = this.core.container.querySelector('.file-manager__grid') as HTMLElement;
    const listView = this.core.container.querySelector('.file-manager__list') as HTMLElement;
    
    if (viewMode === 'grid') {
      gridView.style.display = 'grid';
      listView.style.display = 'none';
    } else {
      gridView.style.display = 'none';
      listView.style.display = 'block';
    }
    
    // ソートアイコンの更新（リストビューのみ）
    this.updateSortIcons();
  }

  /**
   * ソートアイコンの更新
   */
  private updateSortIcons(): void {
    const state = this.core.getState();
    const [currentField, currentDirection] = state.sortBy.split('_');
    
    // 全てのソートアイコンをクリア
    const sortIcons = this.core.container.querySelectorAll('.sort-icon');
    sortIcons.forEach(icon => {
      icon.textContent = '';
    });
    
    // 現在のソートフィールドのアイコンを設定
    const currentHeader = this.core.container.querySelector(`[data-sort="${currentField}"] .sort-icon`);
    if (currentHeader) {
      (currentHeader as HTMLElement).innerHTML = currentDirection === 'asc' ? ` ${actionIcons.arrowUp(16)}` : ` ${actionIcons.arrowDown(16)}`;
    }
  }

  /**
   * ファイル一覧のレンダリング
   */
  private renderFiles(): void {
    const files = this.core.getCurrentPageFiles();
    const viewMode = this.core.getViewMode();
    
    if (viewMode === 'grid') {
      this.renderGridView(files);
    } else {
      this.renderListView(files);
    }
  }

  /**
   * グリッドビューのレンダリング
   */
  private renderGridView(files: FileData[]): void {
    const container = this.core.container.querySelector('.file-manager__grid') as HTMLElement;
    
    if (files.length === 0) {
      container.innerHTML = '<div class="file-manager__empty">ファイルがありません</div>';
      return;
    }
    
    container.innerHTML = files.map(file => this.createGridItem(file)).join('');
  }

  /**
   * リストビューのレンダリング
   */
  private renderListView(files: FileData[]): void {
    const container = this.core.container.querySelector('.file-manager__list') as HTMLElement;
    
    if (files.length === 0) {
      container.innerHTML = '<div class="file-manager__empty">ファイルがありません</div>';
      return;
    }
    
    const tableHTML = `
      <table class="file-list-table">
        <thead>
          <tr>
            <th class="file-list__select">
              <input type="checkbox" class="select-all-checkbox">
            </th>
            <th class="file-list__name sortable" data-sort="name">
              ファイル名 <span class="sort-icon"></span>
            </th>
            <th class="file-list__size sortable" data-sort="size">
              サイズ <span class="sort-icon"></span>
            </th>
            <th class="file-list__date sortable" data-sort="date">
              アップロード日時 <span class="sort-icon"></span>
            </th>
            ${(window as unknown as { config?: { folders_enabled?: boolean } })?.config?.folders_enabled ? '<th class="file-list__folder">フォルダ</th>' : ''}
            <th class="file-list__downloads">DL数</th>
            <th class="file-list__actions">操作</th>
          </tr>
        </thead>
        <tbody>
          ${files.map(file => this.createListItem(file)).join('')}
        </tbody>
      </table>
    `;
    
    container.innerHTML = tableHTML;
  }

  /**
   * グリッドアイテムのHTML作成
   */
  private createGridItem(file: FileData): string {
    const isSelected = this.core.getState().selectedFiles.has(file.id.toString());
    const fileIcon = fileIconForMime(file.type || '', 20);
    const fileSize = this.formatFileSize(file.size);
    const uploadDate = this.formatDate(file.upload_date || '');
    
    return `
      <div class="file-grid-item ${isSelected ? 'selected' : ''}" data-file-id="${file.id}">
        <div class="file-grid-item__checkbox">
          <input type="checkbox" ${isSelected ? 'checked' : ''} class="file-checkbox" data-file-id="${file.id}">
        </div>
        
        <!-- アイコンとコメント部分（薄いねずみ色背景） -->
        <div class="file-grid-item__header">
          <div class="file-grid-item__icon">
            <span class="file-icon file-icon--${this.getFileTypeClass(file.type || '')}">${fileIcon}</span>
          </div>
          <div class="file-grid-item__name" title="${this.escapeHtml(file.name || '')}">
            ${this.escapeHtml(this.truncateText(file.name || '', 20))}
          </div>
          ${file.comment ? `<div class="file-grid-item__comment">${this.escapeHtml(this.truncateText(file.comment, 50))}</div>` : ''}
        </div>
        
        <!-- メタデータ部分（2x2 グリッド・アイコンラベル） -->
        <div class="file-grid-item__metadata metadata-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;align-items:center;">
          <div class="meta-item meta-item--size">${metaIcons.size(16)} <span class="meta-text">${fileSize}</span></div>
          <div class="meta-item meta-item--downloads">${metaIcons.downloads(16)} <span class="meta-text">${this.formatDownloads(file)}</span></div>
          <div class="meta-item meta-item--date">${metaIcons.date(16)} <span class="meta-text">${uploadDate}</span></div>
          ${(window as unknown as { config?: { folders_enabled?: boolean } })?.config?.folders_enabled ? `<div class=\"meta-item meta-item--folder\">${metaIcons.folder(16)} <span class=\"meta-text\">${this.getFolderPath(file.folder_id)}</span></div>` : ''}
        </div>
        
        <!-- アクションボタン部分（二段構成） -->
        <div class="file-grid-item__actions">
          <div class="file-grid-item__actions-row">
            <button class="btn btn-xs btn-primary file-action-btn file-action-btn--download" data-action="download" data-file-id="${file.id}" title="ダウンロード">
              DL
            </button>
            <button class="btn btn-xs btn-info file-action-btn file-action-btn--share" data-action="share" data-file-id="${file.id}" title="共有">
              共有
            </button>
            ${(window as unknown as { config?: { folders_enabled?: boolean } })?.config?.folders_enabled ? `
            <button class="btn btn-xs btn-warning file-action-btn file-action-btn--move" data-action="move" data-file-id="${file.id}" title="移動">
              移動
            </button>
            ` : ''}
            ${(window as unknown as { config?: { allow_comment_edit?: boolean } })?.config?.allow_comment_edit ? `
            <button class="btn btn-xs btn-success file-action-btn file-action-btn--edit" data-action="edit" data-file-id="${file.id}" title="編集">
              編集
            </button>
            ` : ''}
          </div>
          <div class="file-grid-item__actions-row">
            ${(window as unknown as { config?: { allow_file_replace?: boolean } })?.config?.allow_file_replace ? `
            <button class="btn btn-xs btn-warning file-action-btn file-action-btn--replace" data-action="replace" data-file-id="${file.id}" title="差し替え">
              差し替え
            </button>
            ` : ''}
            <button class="btn btn-xs btn-danger file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${file.id}" title="削除">
              削除
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * リストアイテムのHTML作成
   */
  private createListItem(file: FileData): string {
    const isSelected = this.core.getState().selectedFiles.has(file.id.toString());
    const fileIcon = this.getFileIcon(file.type || '');
    const fileSize = this.formatFileSize(file.size);
    const uploadDate = this.formatDate(file.upload_date || '');
    
    return `
      <tr class="file-list-item ${isSelected ? 'selected' : ''}" data-file-id="${file.id}">
        <td class="file-list__select">
          <input type="checkbox" ${isSelected ? 'checked' : ''} class="file-checkbox" data-file-id="${file.id}">
        </td>
        <td class="file-list__name">
          <span class="file-icon file-icon--${this.getFileTypeClass(file.type || '')}">${fileIcon}</span>
          <span class="file-name" title="${this.escapeHtml(file.name || '')}">${this.escapeHtml(file.name || '')}</span>
          ${file.comment ? `<div class="file-comment">${this.escapeHtml(file.comment)}</div>` : ''}
        </td>
        <td class="file-list__size">${fileSize}</td>
        <td class="file-list__date">${uploadDate}</td>
        ${(window as unknown as { config?: { folders_enabled?: boolean } })?.config?.folders_enabled ? `<td class="file-list__folder">${this.getFolderPath(file.folder_id)}</td>` : ''}
        <td class="file-list__downloads">${this.formatDownloads(file)}</td>
        <td class="file-list__actions">
          <button class="btn btn-xs btn-primary file-action-btn file-action-btn--download" data-action="download" data-file-id="${file.id}" title="ダウンロード">
            ${actionIcons.download(18)}
          </button>
          <button class="btn btn-xs btn-info file-action-btn file-action-btn--share" data-action="share" data-file-id="${file.id}" title="共有">
            ${actionIcons.share(18)}
          </button>
          ${(window as unknown as { config?: { allow_comment_edit?: boolean } })?.config?.allow_comment_edit ? `
          <button class="btn btn-xs btn-success file-action-btn file-action-btn--edit" data-action="edit" data-file-id="${file.id}" title="編集">
            ${actionIcons.edit(18)}
          </button>
          ` : ''}
          ${(window as unknown as { config?: { folders_enabled?: boolean } })?.config?.folders_enabled ? `
          <button class="btn btn-xs btn-warning file-action-btn file-action-btn--move" data-action="move" data-file-id="${file.id}" title="移動">
            ${actionIcons.move(18)}
          </button>
          ` : ''}
          ${(window as unknown as { config?: { allow_file_replace?: boolean } })?.config?.allow_file_replace ? `
          <button class="btn btn-xs btn-warning file-action-btn file-action-btn--replace" data-action="replace" data-file-id="${file.id}" title="差し替え">
            ${actionIcons.replace(18)}
          </button>
          ` : ''}
          <button class="btn btn-xs btn-danger file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${file.id}" title="削除">
            ${actionIcons.delete(18)}
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * ページネーションのレンダリング
   */
  private renderPagination(): void {
    const stats = this.core.getStats();
    const currentPage = this.core.getCurrentPage();
    const maxPage = this.core.getMaxPage();
    
    const infoContainer = this.core.container.querySelector('.pagination__info') as HTMLElement;
    const controlsContainer = this.core.container.querySelector('.pagination__controls') as HTMLElement;
    
    // 情報表示
    const startItem = (currentPage - 1) * this.core.getState().itemsPerPage + 1;
    const endItem = Math.min(currentPage * this.core.getState().itemsPerPage, stats.filteredFiles);
    
    infoContainer.textContent = `${startItem}-${endItem} / ${stats.filteredFiles}件`;
    
    // ページングコントロール
    if (maxPage <= 1) {
      controlsContainer.innerHTML = '';
      return;
    }
    
    let paginationHTML = '';
    
    // 前ページボタン
    paginationHTML += `
      <button class="pagination-btn pagination-btn--prev" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
        ← 前
      </button>
    `;
    
    // ページ番号
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(maxPage, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="pagination-btn pagination-btn--number ${i === currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }
    
    // 次ページボタン
    paginationHTML += `
      <button class="pagination-btn pagination-btn--next" ${currentPage >= maxPage ? 'disabled' : ''} data-page="${currentPage + 1}">
        次 →
      </button>
    `;
    
    controlsContainer.innerHTML = paginationHTML;
  }

  /**
   * 統計情報のレンダリング
   */
  private renderStats(): void {
    const stats = this.core.getStats();
    const statsContainer = this.core.container.querySelector('.file-manager__stats-text') as HTMLElement;
    
    let statsText = `${stats.totalFiles}件のファイル`;
    
    if (stats.filteredFiles !== stats.totalFiles) {
      statsText += ` (${stats.filteredFiles}件表示)`;
    }
    
    if (stats.selectedFiles > 0) {
      statsText += ` | ${stats.selectedFiles}件選択中`;
    }
    
    statsContainer.textContent = statsText;
  }

  /**
   * 一括操作バーのレンダリング
   */
  private renderBulkActions(): void {
    const selectedCount = this.core.getStats().selectedFiles;
    const bulkActionsContainer = this.core.container.querySelector('.file-manager__bulk-actions') as HTMLElement;
    
    if (selectedCount > 0) {
      bulkActionsContainer.style.display = 'block';
    } else {
      bulkActionsContainer.style.display = 'none';
    }
  }

  /**
   * ユーティリティメソッド
   */
  private getFileIcon(_mimeType: string): string {
    return '';
  }

  private getFileTypeClass(mimeType: string): string {
    if (!mimeType) return 'file';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive';
    if (mimeType.includes('text') || mimeType.includes('plain')) return 'text';
    if (mimeType.includes('javascript') || mimeType.includes('json')) return 'code';
    if (mimeType.includes('html') || mimeType.includes('xml')) return 'web';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'spreadsheet';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
    return 'file';
  }

  private formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    // 小数点以下の桁数を調整
    let decimalPlaces = 0;
    if (unitIndex > 0) {
      if (size < 10) {
        decimalPlaces = 2;
      } else if (size < 100) {
        decimalPlaces = 1;
      }
    }
    
    return `${size.toFixed(decimalPlaces)} ${units[unitIndex]}`;
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '不明';
    
    let date: Date;
    
    // 数値の場合はUnix timestampとして扱う
    if (typeof dateString === 'number' || /^\d+$/.test(dateString)) {
      const timestamp = typeof dateString === 'number' ? dateString : parseInt(dateString);
      // Unix timestampが秒単位かミリ秒単位かを判定
      date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
    } else if (typeof dateString === 'string') {
      // MySQLのDATETIME形式（YYYY-MM-DD HH:MM:SS）を処理
      if (dateString.includes(' ')) {
        const parts = dateString.split(' ');
        if (parts.length === 2) {
          const [datePart, timePart] = parts;
          // YYYY-MM-DD HH:MM:SS 形式をISO形式に変換
          const isoString = `${datePart}T${timePart}`;
          date = new Date(isoString);
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString);
    }
    
    // 無効な日付の場合
    if (isNaN(date.getTime())) {
      console.warn('Invalid date format:', dateString);
      return '不明';
    }
    
    try {
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return '不明';
    }
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private truncateText(text: string, length: number): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  private getFolderPath(folderId?: string): string {
    if (!folderId) return 'ルート';
    
    // フォルダデータからフォルダ名を取得
    const folderData = (window as unknown as { folderData?: unknown[] }).folderData || [];
    
    const findFolder = (folders: unknown[], id: string): { name?: string } | null => {
      for (const folder of folders) {
        const f = folder as { id?: string | number; name?: string; children?: unknown[] };
        // 型不一致を吸収するため、IDは文字列比較
        if (String(f.id) === String(id)) return f as { name?: string };
        if (f.children) {
          const found = findFolder(f.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const folder = findFolder(folderData, String(folderId));
    return folder?.name || '不明なフォルダ';
  }

  private formatDownloads(file: FileData): string {
    // 実際のダウンロード数（count プロパティ）があれば表示
    if (file.count && typeof file.count === 'number') {
      return `${file.count}回`;
    }
    
    // 共有ダウンロード数があれば表示
    if (file.share_downloads && typeof file.share_downloads === 'number') {
      return `${file.share_downloads}回`;
    }
    
    // 共有リンクが存在するかチェック
    if (file.share_key) {
      return '共有中';
    }
    
    return '0回';
  }
}

export default FileManagerRenderer;
