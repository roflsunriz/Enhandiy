/**
 * 再開可能アップロード機能 (TypeScript版)
 * Tus.ioプロトコルを使用し、失敗時は従来方式にフォールバック
 * jQuery依存を除去したモダン実装
 */

import { ready, $, addClass, removeClass } from '../utils/dom';
import { showError } from '../utils/messages';
import { getCsrfToken } from '../utils/http';
import { initializeErrorHandling } from '../utils/error-handling';
import { showAlert, hideModal } from '../utils/modal';
import { showToast } from '../utils/bootstrap';
import { 
  UploadInfo, 
  UploadOptions, 
  UploadApiResponse,
  TusWindowGlobals,
  UploadWindowGlobals
} from '../types/upload';
import { isPasswordTooWeak } from './password-strength';

// 外部ライブラリの型定義
declare global {
  interface Window extends TusWindowGlobals {}
}



// グローバル変数
const resumableUploads: Record<string, UploadInfo> = {};
let isResumableAvailable = false;
let uploadHadErrors = false;

// Tus.ioの利用可能性をチェック
ready(() => {
  
  // エラーハンドリングの初期化
  initializeErrorHandling();
  
  checkTusAvailability();
  
  // グローバルアップロード状況表示を追加
  if (!$('.global-upload-status')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="global-upload-status">
        <h6>アップロード進行状況</h6>
        <div class="global-upload-progress">
          <div class="global-upload-progress-bar"></div>
        </div>
        <div class="global-upload-info"></div>
      </div>
    `);
  }
  // エラートーストが未定義なら用意しておく
  if (!document.getElementById('uploadErrorToast')) {
    const toastHtml = `
      <div id="uploadErrorToast" class="toast align-items-center text-bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true" style="position: fixed; top: 20px; right: 20px; z-index: 1060;">
        <div class="d-flex">
          <div class="toast-body">アップロードに失敗しました。</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', toastHtml);
  }
  
  // Resumable upload module loaded
});

/**
 * Tus.ioサーバーの利用可能性をチェック
 */
async function checkTusAvailability(): Promise<void> {
  if (typeof window.tus === 'undefined') {
    console.warn('Tus.js library not loaded, falling back to traditional upload');
    isResumableAvailable = false;
    return;
  }
  
  try {
    // サーバーのTus.io対応をチェック（タイムアウトを短縮）
    const response = await fetch('/api/tus-upload.php', {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(2000)
    });
    
    const tusResumable = response.headers.get('Tus-Resumable');
    if (tusResumable) {
      isResumableAvailable = true;
      
    } else {
      console.warn('Tus.io server response invalid, falling back to traditional upload');
      isResumableAvailable = false;
    }
  } catch (error) {
    console.warn('Tus.io server not available, falling back to traditional upload:', error);
    isResumableAvailable = false;
  }
}

/**
 * 単一ファイルの再開可能アップロード
 */
export function uploadFileResumable(file: File, options: UploadOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const {
      comment = '',
      dlkey = '',
      delkey = '',
      replacekey = '',
      maxDownloads = null,
      expiresDays = null,
      folderId = null
    } = options;
    
    // 設定に基づくアップロード方式の選択
    const uploadPriority = window.config?.upload_method_priority || 'resumable';
    const fallbackEnabled = window.config?.upload_fallback_enabled !== false;
    
    // 通常アップロード優先の場合
    if (uploadPriority === 'normal') {
      // 通常アップロードを優先使用
      fallbackUpload(file, options)
        .then(resolve)
        .catch((error) => {
          if (fallbackEnabled && isResumableAvailable) {
            // 通常アップロード失敗時は再開可能アップロードにフォールバック
            proceedWithResumableUpload();
          } else {
            reject(error);
          }
        });
      return;
    }
    
    // 再開可能アップロード優先（デフォルト）
    // Tus.ioが利用できない場合はフォールバック
    if (!isResumableAvailable) {
      if (fallbackEnabled) {
        // Tus.io利用不可のためフォールバックアップロードを使用
        fallbackUpload(file, options).then(resolve).catch(reject);
      } else {
        reject(new Error('Resumable upload not available and fallback disabled'));
      }
      return;
    }
    
    proceedWithResumableUpload();
    
    function proceedWithResumableUpload(): void {
      if (!window.tus) {
        reject(new Error('Tus.js not available'));
        return;
      }
      
      // メタデータを準備
      const metadata: Record<string, string> = {
        filename: file.name,
        filetype: file.type || 'application/octet-stream'
      };
      
      // CSRFトークンを追加
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        metadata.csrf_token = csrfToken;
        // CSRFトークンをメタデータに追加
      } else {
        console.error('CSRF Debug - Token not found or empty!');
      }
      
      if (comment) metadata.comment = comment;
      if (dlkey) metadata.dlkey = dlkey;
      if (delkey) metadata.delkey = delkey;
      if (maxDownloads) metadata.max_downloads = maxDownloads.toString();
      if (expiresDays) metadata.expires_days = expiresDays.toString();
      if (folderId) metadata.folder_id = folderId.toString();
      if (replacekey) metadata.replacekey = replacekey.toString();
      
      // Tus.ioアップロードを作成（Docker環境対応）
      const upload = new window.tus.Upload(file, {
        endpoint: '/api/tus-upload.php',
        retryDelays: [0, 1000, 3000, 5000],
        metadata: metadata,
        chunkSize: 512 * 1024, // 512KB chunks for better compatibility
        removeFingerprintOnSuccess: true,
        // アップロード再開を無効にして新規アップロードのみ使用
        resume: false,
        
        onError: (error: Error) => {
          console.error('Tus upload failed:', error);
          
          // グローバルリストから削除
          delete resumableUploads[file.name];
          uploadHadErrors = true;
          
          // Tus.ioが失敗した場合はフォールバック（設定で有効な場合）
          if (fallbackEnabled) {
            // フォールバック処理実行
            fallbackUpload(file, options).then(resolve).catch(reject);
          } else {
            reject(error);
          }
        },
        
        onProgress: (bytesUploaded: number, bytesTotal: number) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          
          // 速度計算
          const currentTime = Date.now();
          const uploadInfo = resumableUploads[file.name];
          if (uploadInfo) {
            if (!uploadInfo.lastTime) {
              uploadInfo.lastTime = currentTime;
              uploadInfo.lastBytes = 0;
            }
            
            const timeDiff = (currentTime - uploadInfo.lastTime) / 1000;
            const bytesDiff = bytesUploaded - (uploadInfo.lastBytes || 0);
            const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
            
            uploadInfo.lastTime = currentTime;
            uploadInfo.lastBytes = bytesUploaded;
            uploadInfo.progress = percentage;
            
            updateUploadProgress(file.name, percentage, bytesUploaded, bytesTotal, 'resumable', speed);
          }
        },
        
        onSuccess: () => {
          // アップロード完了
          onUploadComplete(file.name, 'resumable');
          resolve();
        }
      });
      
      // アップロード開始
      upload.start();
      
      // グローバルに保存（後で中断・再開できるように）
      resumableUploads[file.name] = {
        upload: upload,
        file: file,
        options: options,
        progress: 0
      };
    }
  });
}

/**
 * 従来方式へのフォールバック
 */
async function fallbackUpload(file: File, options: UploadOptions): Promise<void> {
  // フォールバックアップロード実行
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('comment', options.comment || '');
  
  // CSRFトークンを追加
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    formData.append('csrf_token', csrfToken);
    // CSRFトークンをフォームデータに追加
  } else {
    console.error('Fallback CSRF Debug - Token not found or empty!');
  }
  
  formData.append('dlkey', options.dlkey || '');
  formData.append('delkey', options.delkey || '');
  formData.append('replacekey', options.replacekey || '');
  
  if (options.maxDownloads) {
    formData.append('max_downloads', options.maxDownloads.toString());
  }
  if (options.expiresDays) {
    formData.append('expires_days', options.expiresDays.toString());
  }
  if (options.folderId) {
    formData.append('folder_id', options.folderId.toString());
  }
  
  return new Promise((resolve, reject) => {
    // アップロード開始時間を記録
    const startTime = Date.now();
    let lastTime = startTime;
    let lastBytes = 0;
    
    const xhr = new XMLHttpRequest();
    
    // プログレス監視
    if (xhr.upload) {
      xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          
          // 速度計算
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000;
          const bytesDiff = e.loaded - lastBytes;
          const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
          
          lastTime = currentTime;
          lastBytes = e.loaded;
          
          updateUploadProgress(file.name, percentage, e.loaded, e.total, 'fallback', speed);
        }
      });
    }
    
    // 完了ハンドラ
    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText) as UploadApiResponse;
        // フォールバックアップロード応答処理
        
        if (data.status === 'ok' || data.status === 'success') {
          // フォールバックアップロード完了
          onUploadComplete(file.name, 'fallback');
          resolve();
        } else {
          console.error('Fallback upload failed with response:', data);
          handleUploadError(data, file.name);
          uploadHadErrors = true;
          reject(new Error('Upload failed: ' + data.status));
        }
      } catch {
        console.error('Failed to parse response:', xhr.responseText);
        uploadHadErrors = true;
        reject(new Error('Invalid response format'));
      }
    });
    
    // エラーハンドラ
    xhr.addEventListener('error', () => {
      console.error('Fallback upload network error:', {
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText
      });
      
      const errorData: UploadApiResponse = {
        success: false,
        status: 'network_error',
        message: 'Network error: ' + xhr.statusText
      };
      handleUploadError(errorData, file.name);
      uploadHadErrors = true;
      reject(new Error('Network error: ' + xhr.statusText));
    });
    
    xhr.open('POST', '/api/upload.php');
    xhr.send(formData);
  });
}

/**
 * アップロード進行状況の更新
 */
function updateUploadProgress(filename: string, percentage: number, loaded: number, total: number, method: string, speed: number): void {
  // プログレスバーの更新
  const progressContainers = document.querySelectorAll('.file-item');
  let progressContainer: HTMLElement | null = null;
  
  for (const container of progressContainers) {
    if ((container as HTMLElement).dataset.filename === filename) {
      progressContainer = container as HTMLElement;
      break;
    }
  }
  
  if (progressContainer) {
    // ファイルアイテムの状態を更新
    addClass(progressContainer, 'uploading');
    
    const uploadProgress = progressContainer.querySelector('.upload-progress') as HTMLElement;
    const uploadStatus = progressContainer.querySelector('.upload-status') as HTMLElement;
    const detailedProgress = progressContainer.querySelector('.detailed-progress') as HTMLElement;
    
    if (uploadProgress) uploadProgress.style.display = 'block';
    if (uploadStatus) uploadStatus.style.display = 'block';
    if (detailedProgress) detailedProgress.style.display = 'block';
    
    // プログレスバーを更新
    const progressBar = progressContainer.querySelector('.upload-progress-bar') as HTMLElement;
    if (progressBar) {
      progressBar.style.width = percentage + '%';
    }
    
    // アップロード方式インジケーターを表示
    const methodIndicator = progressContainer.querySelector('.upload-method-indicator') as HTMLElement;
    if (methodIndicator) {
      removeClass(methodIndicator, 'resumable');
      removeClass(methodIndicator, 'fallback');
      removeClass(methodIndicator, 'failed');
      addClass(methodIndicator, method);
      methodIndicator.textContent = method === 'resumable' ? '再開可能' : '通常';
      methodIndicator.style.display = 'block';
    }
    
    // 制御ボタンを表示（再開可能アップロードの場合のみ）
    if (method === 'resumable') {
      const pauseBtn = progressContainer.querySelector('.upload-control-btn.pause') as HTMLElement;
      const cancelBtn = progressContainer.querySelector('.upload-control-btn.cancel') as HTMLElement;
      if (pauseBtn) pauseBtn.style.display = 'block';
      if (cancelBtn) cancelBtn.style.display = 'block';
    }
    
    // 詳細な進行状況を更新
    const sizeText = formatFileSize(loaded) + ' / ' + formatFileSize(total);
    const speedText = speed ? formatSpeed(speed) : '計算中...';
    
    if (uploadStatus) {
      uploadStatus.textContent = percentage + '% (' + sizeText + ')';
    }
    
    const progressPercentage = progressContainer.querySelector('.progress-percentage') as HTMLElement;
    const progressSize = progressContainer.querySelector('.progress-size') as HTMLElement;
    const speedInfo = progressContainer.querySelector('.speed-info') as HTMLElement;
    
    if (progressPercentage) progressPercentage.textContent = percentage + '%';
    if (progressSize) progressSize.textContent = sizeText;
    if (speedInfo) speedInfo.textContent = '速度: ' + speedText;
    
    // 残り時間の計算と表示
    if (speed && speed > 0 && speedInfo) {
      const remaining = (total - loaded) / speed;
      const remainingText = formatTime(remaining);
      speedInfo.textContent = '速度: ' + speedText + ' | 残り: ' + remainingText;
    }
  }
  
  // 全体のプログレスバーも更新
  updateGlobalProgress();
}

/**
 * アップロード完了処理
 */
function onUploadComplete(filename: string, _method: string): void {
  const progressContainers = document.querySelectorAll('.file-item');
  let progressContainer: HTMLElement | null = null;
  
  for (const container of progressContainers) {
    if ((container as HTMLElement).dataset.filename === filename) {
      progressContainer = container as HTMLElement;
      break;
    }
  }
  
  if (progressContainer) {
    removeClass(progressContainer, 'uploading');
    removeClass(progressContainer, 'paused');
    addClass(progressContainer, 'completed');
    
    const progressBar = progressContainer.querySelector('.upload-progress-bar') as HTMLElement;
    const uploadStatus = progressContainer.querySelector('.upload-status') as HTMLElement;
    const uploadControls = progressContainer.querySelectorAll('.upload-controls button');
    const detailedProgress = progressContainer.querySelector('.detailed-progress') as HTMLElement;
    
    if (progressBar) progressBar.style.width = '100%';
    if (uploadStatus) uploadStatus.textContent = '完了';
    uploadControls.forEach(btn => (btn as HTMLElement).style.display = 'none');
    if (detailedProgress) detailedProgress.style.display = 'none';
    
    // 成功アイコンを追加
    const fileInfo = progressContainer.querySelector('.file-info');
    if (fileInfo && !fileInfo.querySelector('.upload-success-icon')) {
      fileInfo.insertAdjacentHTML('beforeend', `
        <span class="upload-success-icon" style="color: #5cb85c; margin-left: 10px;">
          <span class="glyphicon glyphicon-ok-circle"></span>
        </span>
      `);
    }
  }
  
  // グローバルリストから削除
  delete resumableUploads[filename];
  
  // 全体の進行状況を更新
  updateGlobalProgress();
  
  // 全てのアップロードが完了したかチェック
  if (Object.keys(resumableUploads).length === 0) {
    // 失敗がなければモーダルを閉じる。失敗があれば閉じずにトースト通知を表示
    if (!uploadHadErrors) {
      hideModal('uploadModal');
    } else {
      // 失敗をユーザーに通知（トースト要素があれば表示）
      showToast('uploadErrorToast');
    }
    setTimeout(async () => {
      const globalStatus = $('.global-upload-status');
      if (globalStatus) {
        removeClass(globalStatus, 'active');
      }
      
      // アップロードコンテナをクリア
      const progressContainers = document.querySelectorAll('.file-item');
      progressContainers.forEach(container => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      });
      
      // 選択済みファイル配列と入力要素をクリア（ページリロードなしの再アップロード対策）
      try {
        const winAny = window as unknown as { selectedFiles?: unknown };
        if (Array.isArray(winAny.selectedFiles)) {
          (winAny.selectedFiles as unknown[]).length = 0;
        }
        const selectedFilesList = document.getElementById('selectedFilesList');
        if (selectedFilesList) {
          selectedFilesList.innerHTML = '';
        }
        const multipleFileInput = document.getElementById('multipleFileInput') as HTMLInputElement | null;
        const folderInput = document.getElementById('folderInput') as HTMLInputElement | null;
        if (multipleFileInput) multipleFileInput.value = '';
        if (folderInput) folderInput.value = '';
        const fileCountSpan = document.querySelector('#selectedFilesContainer .file-count') as HTMLElement | null;
        if (fileCountSpan) fileCountSpan.textContent = '0';
      } catch {}
      
      // 選択ファイルコンテナを非表示
      const selectedFilesContainer = document.getElementById('selectedFilesContainer');
      if (selectedFilesContainer) {
        selectedFilesContainer.style.transition = 'all 0.3s ease';
        selectedFilesContainer.style.opacity = '0';
        selectedFilesContainer.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          selectedFilesContainer.style.display = 'none';
        }, 300);
      }
      
      // アップロード完了後の確実な更新処理
      
      
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
        console.error('resumable-upload: 更新処理エラー:', error);
        // エラーが発生した場合はページをリロード
        window.location.reload();
      }

    }, 2000);
  }
}

/**
 * アップロードの中断
 */
export function pauseUpload(filename: string): boolean {
  const resumableUpload = resumableUploads[filename];
  if (resumableUpload?.upload) {
    resumableUpload.upload.abort();
    
    
    // UIを更新
    const progressContainers = document.querySelectorAll('.file-item');
    for (const container of progressContainers) {
      const element = container as HTMLElement;
      if (element.dataset.filename === filename) {
        removeClass(element, 'uploading');
        addClass(element, 'paused');
        
        const pauseBtn = element.querySelector('.upload-control-btn.pause') as HTMLElement;
        const resumeBtn = element.querySelector('.upload-control-btn.resume') as HTMLElement;
        const uploadStatus = element.querySelector('.upload-status') as HTMLElement;
        
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'block';
        if (uploadStatus) uploadStatus.textContent = '一時停止';
        break;
      }
    }
    
    return true;
  }
  return false;
}

/**
 * アップロードの再開
 */
export function resumeUpload(filename: string): boolean {
  const resumableUpload = resumableUploads[filename];
  if (resumableUpload?.upload) {
    resumableUpload.upload.start();
    
    
    // UIを更新
    const progressContainers = document.querySelectorAll('.file-item');
    for (const container of progressContainers) {
      const element = container as HTMLElement;
      if (element.dataset.filename === filename) {
        removeClass(element, 'paused');
        addClass(element, 'uploading');
        
        const resumeBtn = element.querySelector('.upload-control-btn.resume') as HTMLElement;
        const pauseBtn = element.querySelector('.upload-control-btn.pause') as HTMLElement;
        const uploadStatus = element.querySelector('.upload-status') as HTMLElement;
        
        if (resumeBtn) resumeBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'block';
        if (uploadStatus) uploadStatus.textContent = '再開中...';
        break;
      }
    }
    
    return true;
  }
  return false;
}

/**
 * アップロードのキャンセル
 */
export function cancelUpload(filename: string): boolean {
  const resumableUpload = resumableUploads[filename];
  if (resumableUpload?.upload) {
    resumableUpload.upload.abort();
    
    
    // UIを更新
    const progressContainers = document.querySelectorAll('.file-item');
    for (const container of progressContainers) {
      const element = container as HTMLElement;
      if (element.dataset.filename === filename) {
        removeClass(element, 'uploading');
        removeClass(element, 'paused');
        addClass(element, 'failed');
        
        const uploadControls = element.querySelectorAll('.upload-controls button');
        const uploadStatus = element.querySelector('.upload-status') as HTMLElement;
        const methodIndicator = element.querySelector('.upload-method-indicator') as HTMLElement;
        
        uploadControls.forEach(btn => (btn as HTMLElement).style.display = 'none');
        if (uploadStatus) uploadStatus.textContent = 'キャンセル済み';
        if (methodIndicator) {
          removeClass(methodIndicator, 'resumable');
          addClass(methodIndicator, 'failed');
        }
        break;
      }
    }
    
    delete resumableUploads[filename];
    updateGlobalProgress();
    
    return true;
  }
  return false;
}

/**
 * 既存のアップロード関数を拡張
 */
export async function enhancedFileUpload(): Promise<void> {
  
  
  // 差し替えキー必須チェック
  const replaceKeyInput = document.getElementById('replaceKeyInput') as HTMLInputElement;
  if (!replaceKeyInput) {
    await showAlert('差し替えキー入力フィールドが見つかりません。');
    return;
  }
  
  const replaceKey = replaceKeyInput.value;
  if (!replaceKey || replaceKey.trim() === '') {
    await showAlert('差し替えキーの入力は必須です。');
    return;
  }
  
  // デバッグ情報を出力
  const fileInput = document.getElementById('multipleFileInput') as HTMLInputElement;
  
  // ファイル選択状況確認
  
  // まず selectedFiles 配列をチェック（ドラッグ&ドロップやファイル選択で追加されたファイル）
  const selectedFiles = (window as unknown as { selectedFiles?: File[] }).selectedFiles;
  if (selectedFiles && selectedFiles.length > 0) {
    // 複数ファイルアップロード
    try {
      await enhancedMultipleUpload(selectedFiles);
    } catch (error) {
      if (error instanceof Error && error.message.includes('キーが弱すぎます')) {
        await showAlert(error.message);
      } else {
        throw error; // その他のエラーは上位に委ねる
      }
    }
    return;
  }
  
  // fileInput.files から複数ファイル取得（直接ファイル選択の場合）
  if (fileInput?.files && fileInput.files.length > 0) {
    const fileList = Array.from(fileInput.files);
    if (fileList.length === 1) {
      // 単一ファイル
      try {
        const options = getUploadOptions();
        uploadFileResumable(fileList[0], options);
      } catch (error) {
        if (error instanceof Error && error.message.includes('キーが弱すぎます')) {
          await showAlert(error.message);
        } else {
          throw error; // その他のエラーは上位に委ねる
        }
      }
    } else {
      // 複数ファイル - 全てのファイルを処理
      try {
        await enhancedMultipleUpload(fileList);
      } catch (error) {
        if (error instanceof Error && error.message.includes('キーが弱すぎます')) {
          await showAlert(error.message);
        } else {
          throw error; // その他のエラーは上位に委ねる
        }
      }
    }
    return;
  }
  
  console.warn('No files selected for upload');
  await showAlert('ファイルが選択されていません。ファイルを選択してからアップロードボタンを押してください。');
}

/**
 * 複数ファイルの拡張アップロード
 */
async function enhancedMultipleUpload(selectedFiles: File[]): Promise<void> {
  if (selectedFiles.length === 0) return;
  
  (window as unknown as { isUploading: boolean }).isUploading = true;
  
  const errorContainer = $('#errorContainer') as HTMLElement;
  const uploadContainer = $('#uploadContainer') as HTMLElement;
  
  if (errorContainer) errorContainer.style.display = 'none';
  if (uploadContainer) uploadContainer.style.display = 'block';
  
  const progressBars = document.querySelectorAll('.file-item .upload-progress');
  progressBars.forEach(bar => (bar as HTMLElement).style.display = 'block');
  
  let options;
  try {
    options = getUploadOptions();
  } catch (error) {
    if (error instanceof Error && error.message.includes('キーが弱すぎます')) {
      await showAlert(error.message);
      (window as unknown as { isUploading: boolean }).isUploading = false;
      if (uploadContainer) uploadContainer.style.display = 'none';
      return;
    } else {
      throw error;
    }
  }
  
  let completedCount = 0;
  const totalCount = selectedFiles.length;
  
  // 各ファイルを順次アップロード
  selectedFiles.forEach((file: File, index: number) => {
    setTimeout(() => {
      uploadFileResumable(file, options)
        .then(() => {
          completedCount++;
          if (completedCount === totalCount) {
            (window as unknown as { isUploading: boolean }).isUploading = false;
            if (uploadContainer) uploadContainer.style.display = 'none';
          }
        })
        .catch((error) => {
          console.error('Upload failed for', file.name, error);
          completedCount++;
          if (completedCount === totalCount) {
            (window as unknown as { isUploading: boolean }).isUploading = false;
            if (uploadContainer) uploadContainer.style.display = 'none';
          }
        });
    }, index * 100); // 100ms間隔でスタートして同時接続数を制限
  });
}

/**
 * アップロードオプションを取得
 */
function getUploadOptions(): UploadOptions {
  const commentInput = document.getElementById('commentInput') as HTMLInputElement;
  const dleyInput = document.getElementById('dleyInput') as HTMLInputElement;
  const delkeyInput = document.getElementById('delkeyInput') as HTMLInputElement;
  const replaceKeyInput = document.getElementById('replaceKeyInput') as HTMLInputElement;
  const maxDownloadsInput = document.getElementById('maxDownloadsUploadInput') as HTMLInputElement;
  const expiresDaysInput = document.getElementById('expiresDaysUploadInput') as HTMLInputElement;
  const folderSelect = document.getElementById('folder-select') as HTMLSelectElement;
  
  // パスワード値を取得
  const dlkey = dleyInput?.value || '';
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

/**
 * 全体のアップロード進行状況を更新
 */
function updateGlobalProgress(): void {
  const totalUploads = Object.keys(resumableUploads).length;

  // 右上の小窓は常に非表示にする
  const globalStatus = $('.global-upload-status') as HTMLElement;
  if (globalStatus) {
    removeClass(globalStatus, 'active');
    globalStatus.style.display = 'none';
  }

  // フォーム内プログレスバー要素
  const progressContainer = $('#progressContainer') as HTMLElement;
  const progressBar = $('#progressBar') as HTMLElement;
  const progressText = $('#progressText') as HTMLElement;
  const uploadStatus = $('#uploadStatus') as HTMLElement;

  if (totalUploads === 0) {
    // すべて完了、またはアップロード未開始
    if (progressContainer) progressContainer.style.display = 'none';
    return;
  }

  let totalProgress = 0;
  let completedCount = 0;

  Object.values(resumableUploads).forEach((uploadInfo) => {
    if (uploadInfo.progress !== undefined) {
      totalProgress += uploadInfo.progress;
    }
    if (uploadInfo.completed) {
      completedCount++;
    }
  });

  const averageProgress = Math.round(totalProgress / totalUploads);

  // プログレスバーを表示・更新
  if (progressContainer) progressContainer.style.display = 'block';
  if (progressBar) progressBar.style.width = averageProgress + '%';
  if (progressText) progressText.textContent = averageProgress + '%';
  if (uploadStatus) uploadStatus.textContent = '完了: ' + completedCount + '/' + totalUploads;
}

/**
 * ファイルサイズを読みやすい形式でフォーマット
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * ファイルサイズを読みやすい形式でフォーマット
 */
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(1) + ' B/s';
  if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
  if (bytesPerSecond < 1024 * 1024 * 1024) return (bytesPerSecond / (1024 * 1024)).toFixed(1) + ' MB/s';
  return (bytesPerSecond / (1024 * 1024 * 1024)).toFixed(1) + ' GB/s';
}

/**
 * 時間を読みやすい形式でフォーマット
 */
function formatTime(seconds: number): string {
  if (seconds < 60) return Math.round(seconds) + '秒';
  if (seconds < 3600) return Math.round(seconds / 60) + '分';
  return Math.round(seconds / 3600) + '時間';
}

/**
 * エラーハンドリング
 */
function handleUploadError(data: UploadApiResponse, filename: string): void {
  let errorMessage = '';
  
  const status = (data as any).error_code ? (data as any).error_code : data.status;
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
  
  showError(errorMessage);
}

// グローバル関数として公開（既存のJavaScriptとの互換性のため）

(window as unknown as UploadWindowGlobals).enhancedFileUpload = enhancedFileUpload;
(window as unknown as UploadWindowGlobals).pauseUpload = pauseUpload;
(window as unknown as UploadWindowGlobals).resumeUpload = resumeUpload;
(window as unknown as UploadWindowGlobals).cancelUpload = cancelUpload;
(window as unknown as UploadWindowGlobals).uploadFileResumable = uploadFileResumable;

export {};