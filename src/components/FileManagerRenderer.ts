/**
 * FileManager レンダリングクラス (TypeScript版)
 * HTML生成とDOM操作を担当
 */

import { FileData } from '../types/global';
import { FileManagerCore } from './FileManagerCore';

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
    this.render();
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
            <input type="text" class="file-manager__search-input" placeholder="ファイル名または説明で検索...">
          </div>
          <div class="file-manager__view-toggle">
            <button class="file-manager__view-btn" data-view="grid" title="グリッド表示">
              <span class="view-icon view-icon--grid">⊞</span>
            </button>
            <button class="file-manager__view-btn" data-view="list" title="リスト表示">
              <span class="view-icon view-icon--list">☰</span>
            </button>
          </div>
        </div>
        <div class="file-manager__stats">
          <span class="file-manager__stats-text"></span>
        </div>
      </div>
      
      <div class="file-manager__bulk-actions" style="display: none;">
        <div class="bulk-actions__controls">
          <button class="bulk-action-btn bulk-action-btn--download" data-action="download">
            ダウンロード
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
            <th class="file-list__name sortable" data-sort="name">ファイル名</th>
            <th class="file-list__size sortable" data-sort="size">サイズ</th>
            <th class="file-list__date sortable" data-sort="date">アップロード日時</th>
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
    const isSelected = this.core.getState().selectedFiles.has(file.id);
    const fileIcon = this.getFileIcon(file.type);
    const fileSize = this.formatFileSize(file.size);
    const uploadDate = this.formatDate(file.upload_date);
    
    return `
      <div class="file-grid-item ${isSelected ? 'selected' : ''}" data-file-id="${file.id}">
        <div class="file-grid-item__checkbox">
          <input type="checkbox" ${isSelected ? 'checked' : ''} class="file-checkbox" data-file-id="${file.id}">
        </div>
        
        <div class="file-grid-item__icon">
          <span class="file-icon file-icon--${this.getFileTypeClass(file.type)}">${fileIcon}</span>
        </div>
        
        <div class="file-grid-item__info">
          <div class="file-grid-item__name" title="${this.escapeHtml(file.name)}">
            ${this.escapeHtml(this.truncateText(file.name, 20))}
          </div>
          <div class="file-grid-item__size">${fileSize}</div>
          <div class="file-grid-item__date">${uploadDate}</div>
          ${file.comment ? `<div class="file-grid-item__comment">${this.escapeHtml(this.truncateText(file.comment, 30))}</div>` : ''}
        </div>
        
        <div class="file-grid-item__actions">
          <button class="file-action-btn file-action-btn--download" data-action="download" data-file-id="${file.id}" title="ダウンロード">
            ⬇
          </button>
          <button class="file-action-btn file-action-btn--share" data-action="share" data-file-id="${file.id}" title="共有">
            🔗
          </button>
          <button class="file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${file.id}" title="削除">
            🗑
          </button>
        </div>
      </div>
    `;
  }

  /**
   * リストアイテムのHTML作成
   */
  private createListItem(file: FileData): string {
    const isSelected = this.core.getState().selectedFiles.has(file.id);
    const fileIcon = this.getFileIcon(file.type);
    const fileSize = this.formatFileSize(file.size);
    const uploadDate = this.formatDate(file.upload_date);
    
    return `
      <tr class="file-list-item ${isSelected ? 'selected' : ''}" data-file-id="${file.id}">
        <td class="file-list__select">
          <input type="checkbox" ${isSelected ? 'checked' : ''} class="file-checkbox" data-file-id="${file.id}">
        </td>
        <td class="file-list__name">
          <span class="file-icon file-icon--${this.getFileTypeClass(file.type)}">${fileIcon}</span>
          <span class="file-name" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</span>
          ${file.comment ? `<div class="file-comment">${this.escapeHtml(file.comment)}</div>` : ''}
        </td>
        <td class="file-list__size">${fileSize}</td>
        <td class="file-list__date">${uploadDate}</td>
        <td class="file-list__actions">
          <button class="file-action-btn file-action-btn--download" data-action="download" data-file-id="${file.id}" title="ダウンロード">
            ⬇
          </button>
          <button class="file-action-btn file-action-btn--share" data-action="share" data-file-id="${file.id}" title="共有">
            🔗
          </button>
          <button class="file-action-btn file-action-btn--delete" data-action="delete" data-file-id="${file.id}" title="削除">
            🗑
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
  private getFileIcon(mimeType: string): string {
    if (!mimeType) return '📁';
    if (mimeType.startsWith('image/')) return '🖼';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    if (mimeType.includes('text')) return '📝';
    return '📁';
  }

  private getFileTypeClass(mimeType: string): string {
    if (!mimeType) return 'file';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('zip')) return 'archive';
    if (mimeType.includes('text')) return 'text';
    return 'file';
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
}

export default FileManagerRenderer;