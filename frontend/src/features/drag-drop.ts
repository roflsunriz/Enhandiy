/**
 * ドラッグ&ドロップアップロード機能 (TypeScript版)
 * jQuery依存を除去したモダン実装
 */

import { ready, $, addClass, removeClass } from '../utils/dom';
import { initializeErrorHandling } from '../utils/error-handling';
import { showAlert } from '../utils/modal';
import { UploadedFile, UploadOptions, UploadApiResponse } from '../types/upload';
import { getCsrfToken } from '../utils/http';
import { isPasswordTooWeak } from './password-strength';
import { actionIcons } from '../utils/icons';

// グローバル変数
let selectedFiles: UploadedFile[] = [];
let isUploading = false;

// DOM読み込み完了後の初期化
ready(() => {
  
  
  // エラーハンドリングの初期化
  initializeErrorHandling();
  
  initializeDragDrop();
});

function initializeDragDrop(): void {
  const dragDropArea = $('#dragDropArea') as HTMLElement;
  const selectFilesBtn = $('#selectFilesBtn') as HTMLButtonElement;
  const selectFolderBtn = $('#selectFolderBtn') as HTMLButtonElement;
  const multipleFileInput = $('#multipleFileInput') as HTMLInputElement;
  const folderInput = $('#folderInput') as HTMLInputElement;
  const clearFilesBtn = $('#clearFilesBtn') as HTMLButtonElement;

  if (!dragDropArea) {
    console.warn('Drag drop area not found');
    return;
  }

  // スタイル/クラスはテンプレートとfrontend/assetsのCSSで管理（JSでは何もしない）

  // ドラッグ&ドロップイベント
  dragDropArea.addEventListener('dragover', handleDragOver);
  dragDropArea.addEventListener('dragenter', handleDragEnter);
  dragDropArea.addEventListener('dragleave', handleDragLeave);
  dragDropArea.addEventListener('drop', handleDrop);

  // ファイル選択ボタン（複数ファイル選択）
  if (selectFilesBtn) {
    selectFilesBtn.addEventListener('click', () => {
      if (isUploading) return;
      multipleFileInput?.click();
    });
  }
  
  // ドラッグ&ドロップエリア全体のクリック（ファイル選択のフォールバック）
  dragDropArea.addEventListener('click', (e: Event) => {
    if (isUploading) return;
    // ボタンクリック以外の場合のみ
    const target = e.target as HTMLElement;
    if (target.tagName !== 'BUTTON') {
      multipleFileInput?.click();
    }
  });

  // フォルダ選択ボタン
  if (selectFolderBtn) {
    selectFolderBtn.addEventListener('click', () => {
      if (isUploading) return;
      folderInput?.click();
    });
  }

  // ファイル入力変更イベント
  if (multipleFileInput) {
    multipleFileInput.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        handleFiles(target.files);
      }
    });
  }

  if (folderInput) {
    folderInput.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        handleFiles(target.files);
      }
    });
  }

  // クリアボタン
  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', () => {
      if (isUploading) return;
      clearSelectedFiles();
    });
  }

  // 送信ボタンのクリックイベント（再開可能アップロード統合）
  document.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.id === 'uploadBtn') {
      e.preventDefault();
      e.stopPropagation();
      
      
      
      // 再開可能アップロード機能が利用可能かチェック
      if (typeof (window as unknown as { enhancedFileUpload?: () => void }).enhancedFileUpload === 'function') {
        
        (window as unknown as { enhancedFileUpload: () => void }).enhancedFileUpload();
      } else {
        
        // フォールバック: 従来の方式
        if (selectedFiles.length > 0) {
          uploadMultipleFiles();
        } else {
          const fileInput = $('#multipleFileInput') as HTMLInputElement;
          if (fileInput?.files && fileInput.files.length > 0) {
            // 単一ファイルアップロード
            uploadSingleFile(fileInput.files[0]);
          } else {
            showAlert('ファイルが選択されていません。');
          }
        }
      }
      return false;
    }
  });
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  e.stopPropagation();
  addClass(e.currentTarget as HTMLElement, 'drag-over');
}

function handleDragEnter(e: DragEvent): void {
  e.preventDefault();
  e.stopPropagation();
  addClass(e.currentTarget as HTMLElement, 'drag-over');
}

function handleDragLeave(e: DragEvent): void {
  e.preventDefault();
  e.stopPropagation();
  
  const element = e.currentTarget as HTMLElement;
  // 子要素から出る場合は無視
  if (!element.contains(e.relatedTarget as Node)) {
    removeClass(element, 'drag-over');
  }
}

function handleDrop(e: DragEvent): void {
  e.preventDefault();
  e.stopPropagation();
  removeClass(e.currentTarget as HTMLElement, 'drag-over');
  
  if (isUploading) return;
  
  const files = e.dataTransfer?.files;
  if (files) {
    handleFiles(files);
  }
}

function handleFiles(files: FileList): void {
  if (!files || files.length === 0) return;
  
  // ファイルを配列に変換して追加
  for (let i = 0; i < files.length; i++) {
    const file = files[i] as UploadedFile;
    
    // 重複チェック
    const isDuplicate = selectedFiles.some((existingFile) => {
      return existingFile.name === file.name && 
             existingFile.size === file.size && 
             existingFile.lastModified === file.lastModified;
    });
    
    if (!isDuplicate) {
      selectedFiles.push(file);
    }
  }
  
  updateFilesList();
  showSelectedFilesContainer();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateFilesList(): void {
  const filesList = $('#selectedFilesList');
  if (!filesList) return;
  
  filesList.innerHTML = '';
  
  selectedFiles.forEach((file) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.filename = file.name;

    // シンプル表示：方式インジケーター + 制御（大きめ）
    fileItem.innerHTML = `
      <div class="upload-method-indicator" style="display: none;"></div>
      <span class="file-name">${escapeHtml(file.name)}</span>
      <div class="upload-controls upload-controls--lg">
        <button type="button" class="upload-control-btn upload-control-btn--lg pause" title="一時停止" style="display: none;">
          ${actionIcons.pause(20)}
        </button>
        <button type="button" class="upload-control-btn upload-control-btn--lg resume" title="再開" style="display: none;">
          ${actionIcons.resume(20)}
        </button>
        <button type="button" class="upload-control-btn upload-control-btn--lg cancel" title="キャンセル" style="display: none;">
          ${actionIcons.cancel(20)}
        </button>
      </div>
    `;
    
    filesList.appendChild(fileItem);
  });

  // 旧: 個別削除ボタンは非表示のためイベントは不要
  
  // アップロード制御ボタンイベント（再開可能アップロード用）
  const pauseButtons = filesList.querySelectorAll('.upload-control-btn.pause');
  pauseButtons.forEach((button) => {
    button.addEventListener('click', (e: Event) => {
      const fileItem = (e.currentTarget as HTMLElement).closest('.file-item') as HTMLElement;
      const filename = fileItem.dataset.filename;
      if (filename && typeof (window as unknown as { pauseUpload?: (filename: string) => void }).pauseUpload === 'function') {
        (window as unknown as { pauseUpload: (filename: string) => void }).pauseUpload(filename);
      }
    });
  });
  
  const resumeButtons = filesList.querySelectorAll('.upload-control-btn.resume');
  resumeButtons.forEach((button) => {
    button.addEventListener('click', (e: Event) => {
      const fileItem = (e.currentTarget as HTMLElement).closest('.file-item') as HTMLElement;
      const filename = fileItem.dataset.filename;
      if (filename && typeof (window as unknown as { resumeUpload?: (filename: string) => void }).resumeUpload === 'function') {
        (window as unknown as { resumeUpload: (filename: string) => void }).resumeUpload(filename);
      }
    });
  });
  
  const cancelButtons = filesList.querySelectorAll('.upload-control-btn.cancel');
  cancelButtons.forEach((button) => {
    button.addEventListener('click', (e: Event) => {
      const fileItem = (e.currentTarget as HTMLElement).closest('.file-item') as HTMLElement;
      const filename = fileItem.dataset.filename;
      if (filename && typeof (window as unknown as { cancelUpload?: (filename: string) => void }).cancelUpload === 'function') {
        (window as unknown as { cancelUpload: (filename: string) => void }).cancelUpload(filename);
      }
    });
  });
}

function showSelectedFilesContainer(): void {
  const container = $('#selectedFilesContainer') as HTMLElement;
  if (container) {
    container.style.display = 'block';
    // スライドダウンアニメーション効果
    container.style.opacity = '0';
    container.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      container.style.transition = 'all 0.3s ease';
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    }, 10);
  }
}

function hideSelectedFilesContainer(): void {
  const container = $('#selectedFilesContainer') as HTMLElement;
  if (container) {
    container.style.transition = 'all 0.3s ease';
    container.style.opacity = '0';
    container.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      container.style.display = 'none';
    }, 300);
  }
}

function clearSelectedFiles(): void {
  selectedFiles = [];
  updateFilesList();
  hideSelectedFilesContainer();
  
  // 隠しファイル入力をクリア
  const multipleFileInput = $('#multipleFileInput') as HTMLInputElement;
  const folderInput = $('#folderInput') as HTMLInputElement;
  if (multipleFileInput) multipleFileInput.value = '';
  if (folderInput) folderInput.value = '';
}

async function uploadMultipleFiles(): Promise<void> {
  if (selectedFiles.length === 0) {
    await showAlert('ファイルが選択されていません。');
    return;
  }
  
  if (isUploading) {
    await showAlert('アップロード中です。しばらくお待ちください。');
    return;
  }
  
  isUploading = true;
  
  // エラーコンテナを非表示
  const errorContainer = $('#errorContainer') as HTMLElement;
  const uploadContainer = $('#uploadContainer') as HTMLElement;
  
  if (errorContainer) errorContainer.style.display = 'none';
  if (uploadContainer) uploadContainer.style.display = 'block';
  
  // 各ファイルのプログレスバーを表示
  const progressBars = document.querySelectorAll('.file-item .upload-progress');
  progressBars.forEach((bar) => {
    (bar as HTMLElement).style.display = 'block';
  });
  
  // 順次アップロード
  uploadFilesSequentially(0);
}

async function uploadFilesSequentially(index: number): Promise<void> {
  if (index >= selectedFiles.length) {
    // 全ファイルのアップロード完了
    isUploading = false;
    
    // アップロードリストをクリア
    selectedFiles.length = 0;
    const uploadContainer = $('#uploadContainer') as HTMLElement;
    const selectedFilesList = $('#selectedFilesList') as HTMLElement;
    
    if (uploadContainer) uploadContainer.style.display = 'none';
    if (selectedFilesList) selectedFilesList.innerHTML = '';
    
    // ファイルカウンターをリセット
    const fileCountSpan = document.querySelector('#selectedFilesContainer .file-count');
    if (fileCountSpan) fileCountSpan.textContent = '0';
    
    // 選択コンテナを非表示
    hideSelectedFilesContainer();
    
    // FileManagerの動的更新
    if (window.fileManagerInstance) {
      await window.fileManagerInstance.refreshFromServer();
    }
    
    // FolderManagerがある場合も更新
    if (window.folderManager) {
      await window.folderManager.refreshAll();
    }
    
    // フォールバック: 動的更新が失敗した場合のリロード
    if (!window.fileManagerInstance && !window.folderManager) {
      window.location.reload();
    }

    
    return;
  }
  
  const file = selectedFiles[index];
  const fileItems = document.querySelectorAll('.file-item');
  const fileItem = fileItems[index] as HTMLElement;
  const progressBar = fileItem.querySelector('.upload-progress-bar') as HTMLElement;
  
  try {
    const options = getUploadOptions();
    await uploadSingleFile(file, options, progressBar);
    
    // 成功時の表示更新
    if (progressBar) progressBar.style.width = '100%';
    fileItem.style.backgroundColor = '#d4edda';
    
    // 次のファイルをアップロード
    setTimeout(() => {
      uploadFilesSequentially(index + 1);
    }, 500);
    
  } catch (error) {
    // パスワードエラーの場合は適切なメッセージを表示
    if (error instanceof Error && error.message.includes('キーが弱すぎます')) {
      await showAlert(error.message);
    } else {
      // その他のエラー処理
      const errorData = error as UploadApiResponse;
      handleUploadError(errorData, file.name);
    }
    
    isUploading = false;
    const uploadContainer = $('#uploadContainer') as HTMLElement;
    if (uploadContainer) uploadContainer.style.display = 'none';
  }
}

async function uploadSingleFile(file: File, options?: UploadOptions, progressBar?: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    
    let opts: UploadOptions;
    try {
      opts = options || getUploadOptions();
    } catch (error) {
      if (error instanceof Error && error.message.includes('キーが弱すぎます')) {
        reject(error);
        return;
      } else {
        throw error;
      }
    }
    
    formData.append('comment', opts.comment || '');
    formData.append('dlkey', opts.dlkey || '');
    formData.append('delkey', opts.delkey || '');
    formData.append('replacekey', opts.replacekey || '');
    
    // 共有制限設定を追加
    if (opts.maxDownloads && opts.maxDownloads > 0) {
      formData.append('max_downloads', opts.maxDownloads.toString());
    }
    if (opts.expiresDays && opts.expiresDays > 0) {
      formData.append('expires_days', opts.expiresDays.toString());
    }
    // フォルダIDを追加（指定がある場合）
    if (opts.folderId) {
      formData.append('folder_id', String(opts.folderId));
    }

    // CSRFトークンをFormDataに追加
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      formData.append('csrf_token', csrfToken);
    }
    
    // XMLHttpRequestを使用してプログレス監視
    const xhr = new XMLHttpRequest();
    
    if (progressBar && xhr.upload) {
      xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          progressBar.style.width = progress + '%';
        }
      });
    }
    
    xhr.addEventListener('load', () => {
      try {
        const response = JSON.parse(xhr.responseText) as UploadApiResponse;
        
        if (response.status === 'ok') {
          resolve();
        } else {
          reject(response);
        }
      } catch {
        reject({
          status: 'network_error',
          message: 'レスポンスの解析に失敗しました'
        } as UploadApiResponse);
      }
    });
    
    xhr.addEventListener('error', () => {
      reject({
        status: 'network_error',
        message: 'ネットワークエラーが発生しました'
      } as UploadApiResponse);
    });
    
    xhr.open('POST', '/api/index.php?path=/api/files');
    // CSRFトークンをヘッダーにも設定（UIリクエスト判定用）
    if (csrfToken) {
      xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    }
    xhr.send(formData);
  });
}

function getUploadOptions(): UploadOptions {
  const commentInput = document.getElementById('commentInput') as HTMLInputElement;
  const dlkeyInput = document.getElementById('dlkeyInput') as HTMLInputElement;
  const delkeyInput = document.getElementById('delkeyInput') as HTMLInputElement;
  const replaceKeyInput = document.getElementById('replaceKeyInput') as HTMLInputElement;
  const maxDownloadsInput = document.getElementById('maxDownloadsUploadInput') as HTMLInputElement;
  const expiresDaysInput = document.getElementById('expiresDaysUploadInput') as HTMLInputElement;
  const folderSelect = document.getElementById('folder-select') as HTMLSelectElement;
  
  // パスワード値を取得
  const dlkey = dlkeyInput?.value || '';
  const delkey = delkeyInput?.value || '';
  const replacekey = replaceKeyInput?.value || '';
  
  // パスワード強度チェック
  if (dlkey && isPasswordTooWeak(dlkey)) {
    throw new Error('DLキーが弱すぎます。より複雑なキーを設定してください。');
  }
  
  if (delkey && isPasswordTooWeak(delkey)) {
    throw new Error('削除キーが弱すぎます。より複雑なキーを設定してください。');
  }
  
  if (replacekey && isPasswordTooWeak(replacekey)) {
    throw new Error('差し替えキーが弱すぎます。より複雑なキーを設定してください。');
  }
  
  return {
    comment: commentInput?.value || '',
    dlkey: dlkey,
    delkey: delkey,
    replacekey: replacekey,
    maxDownloads: maxDownloadsInput ? parseInt(maxDownloadsInput.value) || undefined : undefined,
    expiresDays: expiresDaysInput ? parseInt(expiresDaysInput.value) || undefined : undefined,
    folderId: folderSelect?.value || undefined
  };
}

function handleUploadError(data: UploadApiResponse, filename: string): void {
  let errorMessage = '';
  
  const status = (data as unknown as { error_code?: string; status: string }).error_code
    ? (data as unknown as { error_code?: string }).error_code as string
    : (data as UploadApiResponse).status;
  switch (status) {
    case 'filesize_over':
      errorMessage = 'ファイル容量が大きすぎます: ' + filename;
      break;
    case 'extension_error':
      errorMessage = '許可されていない拡張子です: ' + filename + ' (拡張子: ' + data.ext + ')';
      break;
    case 'comment_error':
      errorMessage = 'コメントの文字数が規定数を超えています。';
      break;
    case 'dlkey_required':
      errorMessage = 'DLキーは必須入力です。';
      break;
    case 'delkey_required':
      errorMessage = 'DELキーは必須入力です。';
      break;
    case 'sqlwrite_error':
      errorMessage = 'データベースの書き込みに失敗しました: ' + filename;
      break;
    case 'network_error':
      errorMessage = data.message + ': ' + filename;
      break;
    default:
      errorMessage = 'アップロードに失敗しました: ' + filename;
      break;
  }
  
  const errorContainer = $('#errorContainer') as HTMLElement;
  const errorBody = errorContainer?.querySelector('.panel-body');
  if (errorBody) {
    errorBody.textContent = errorMessage;
  }
  if (errorContainer) {
    errorContainer.style.display = 'block';
  }
}

// グローバル変数として公開（既存のJavaScriptとの互換性のため）
(window as unknown as Record<string, unknown>).selectedFiles = selectedFiles;
(window as unknown as Record<string, unknown>).isUploading = isUploading;
(window as unknown as Record<string, unknown>).handleFiles = handleFiles;
(window as unknown as Record<string, unknown>).uploadMultipleFiles = uploadMultipleFiles;
(window as unknown as Record<string, unknown>).clearSelectedFiles = clearSelectedFiles;

export {};
