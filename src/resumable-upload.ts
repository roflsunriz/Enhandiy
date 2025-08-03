/**
 * 再開可能アップロード機能 (TypeScript版)
 * Tus.ioプロトコルを使用し、失敗時は従来方式にフォールバック
 * jQuery依存を除去したモダン実装
 */

import { ready, $, addClass, removeClass } from './utils/dom';
import { showError } from './utils/messages';
import { initializeErrorHandling } from './utils/errorHandling';
import { ApiResponse } from './types/global';
import { showAlert } from './utils/modal';

// 外部ライブラリの型定義
declare global {
  interface Window {
    tus?: {
      Upload: new (file: File, options: TusUploadOptions) => TusUpload;
    };
  }
}

interface TusUploadOptions {
  endpoint: string;
  retryDelays: number[];
  metadata: Record<string, string>;
  chunkSize: number;
  removeFingerprintOnSuccess: boolean;
  resume: boolean;
  onError: (error: Error) => void;
  onProgress: (bytesUploaded: number, bytesTotal: number) => void;
  onSuccess: () => void;
}

interface TusUpload {
  start(): void;
  abort(): void;
}

interface UploadInfo {
  upload?: TusUpload;
  file: File;
  options: UploadOptions;
  progress: number;
  lastTime?: number;
  lastBytes?: number;
  completed?: boolean;
}

interface UploadOptions {
  comment?: string;
  dlkey?: string;
  delkey?: string;
  replacekey?: string;
  maxDownloads?: number;
  expiresDays?: number;
  folderId?: string;
}

interface UploadApiResponse extends ApiResponse {
  status: 'ok' | 'success' | 'filesize_over' | 'extension_error' | 'comment_error' | 'dlkey_required' | 'delkey_required' | 'sqlwrite_error' | 'network_error';
  ext?: string;
  message?: string;
}

// グローバル変数
const resumableUploads: Record<string, UploadInfo> = {};
let isResumableAvailable = false;

// Tus.ioの利用可能性をチェック
ready(() => {
  console.log('Resumable Upload functionality initialized (TypeScript)');
  
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
  
  console.log('Resumable upload module loaded');
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
    const response = await fetch('./app/api/tus-upload.php', {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(2000)
    });
    
    const tusResumable = response.headers.get('Tus-Resumable');
    if (tusResumable) {
      isResumableAvailable = true;
      console.log('Resumable upload available (Tus ' + tusResumable + ')');
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
      console.log('Using normal upload priority for:', file.name);
      fallbackUpload(file, options)
        .then(resolve)
        .catch((error) => {
          if (fallbackEnabled && isResumableAvailable) {
            console.log('Fallback to resumable upload after normal failed:', file.name);
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
        console.log('Tus.io unavailable, using fallback for:', file.name);
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
      
      if (comment) metadata.comment = comment;
      if (dlkey) metadata.dlkey = dlkey;
      if (delkey) metadata.delkey = delkey;
      if (maxDownloads) metadata.max_downloads = maxDownloads.toString();
      if (expiresDays) metadata.expires_days = expiresDays.toString();
      if (folderId) metadata.folder_id = folderId.toString();
      if (replacekey) metadata.replacekey = replacekey.toString();
      
      // Tus.ioアップロードを作成（Docker環境対応）
      const upload = new window.tus.Upload(file, {
        endpoint: './app/api/tus-upload.php',
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
          
          // Tus.ioが失敗した場合はフォールバック（設定で有効な場合）
          if (fallbackEnabled) {
            console.log('Falling back to traditional upload for:', file.name);
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
          console.log('Resumable upload completed:', file.name);
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
  console.log('Using fallback upload for:', file.name);
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('comment', options.comment || '');
  
  // CSRFトークンを追加
  const csrfTokenElement = $('#csrfToken') as HTMLInputElement;
  if (csrfTokenElement?.value) {
    formData.append('csrf_token', csrfTokenElement.value);
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
        console.log('Fallback upload response:', data);
        
        if (data.status === 'ok' || data.status === 'success') {
          console.log('Fallback upload completed:', file.name);
          onUploadComplete(file.name, 'fallback');
          resolve();
        } else {
          console.error('Fallback upload failed with response:', data);
          handleUploadError(data, file.name);
          reject(new Error('Upload failed: ' + data.status));
        }
      } catch {
        console.error('Failed to parse response:', xhr.responseText);
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
      reject(new Error('Network error: ' + xhr.statusText));
    });
    
    xhr.open('POST', './app/api/upload.php');
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
    setTimeout(() => {
      const globalStatus = $('.global-upload-status');
      if (globalStatus) {
        removeClass(globalStatus, 'active');
      }
      window.location.reload();
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
    console.log('Upload paused:', filename);
    
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
    console.log('Upload resumed:', filename);
    
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
    console.log('Upload cancelled:', filename);
    
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
  console.log('Enhanced file upload called');
  
  // 差し替えキー必須チェック
  const replaceKeyInput = $('#replaceKeyInput') as HTMLInputElement;
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
  const fileInput = $('#multipleFileInput') as HTMLInputElement;
  const fileInputExists = !!fileInput;
  const fileInputHasFiles = fileInput?.files?.length || 0;
  const selectedFilesLength = (window as unknown as { selectedFiles?: File[] }).selectedFiles?.length || 0;
  
  console.log('Debug info - fileInputExists:', fileInputExists, 'fileInputHasFiles:', fileInputHasFiles, 'selectedFilesLength:', selectedFilesLength);
  
  // 単一ファイルの場合（multipleFileInputから最初のファイルを取得）
  if (fileInput?.files && fileInput.files.length > 0) {
    const singleFile = fileInput.files[0];
    console.log('Single file upload:', singleFile.name);
    const options = getUploadOptions();
    uploadFileResumable(singleFile, options);
    return;
  }
  
  // 複数ファイルの場合（既存のselectedFiles配列を使用）
  const selectedFiles = (window as unknown as { selectedFiles?: File[] }).selectedFiles;
  if (selectedFiles && selectedFiles.length > 0) {
    console.log('Multiple files upload:', selectedFiles.length, 'files');
    enhancedMultipleUpload(selectedFiles);
    return;
  }
  
  console.warn('No files selected for upload');
  await showAlert('ファイルが選択されていません。ファイルを選択してからアップロードボタンを押してください。');
}

/**
 * 複数ファイルの拡張アップロード
 */
function enhancedMultipleUpload(selectedFiles: File[]): void {
  if (selectedFiles.length === 0) return;
  
  (window as unknown as { isUploading: boolean }).isUploading = true;
  
  const errorContainer = $('#errorContainer') as HTMLElement;
  const uploadContainer = $('#uploadContainer') as HTMLElement;
  
  if (errorContainer) errorContainer.style.display = 'none';
  if (uploadContainer) uploadContainer.style.display = 'block';
  
  const progressBars = document.querySelectorAll('.file-item .upload-progress');
  progressBars.forEach(bar => (bar as HTMLElement).style.display = 'block');
  
  const options = getUploadOptions();
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
  const commentInput = $('#commentInput') as HTMLInputElement;
  const dleyInput = $('#dleyInput') as HTMLInputElement;
  const deleyInput = $('#deleyInput') as HTMLInputElement;
  const replaceKeyInput = $('#replaceKeyInput') as HTMLInputElement;
  const maxDownloadsInput = $('#maxDownloadsUploadInput') as HTMLInputElement;
  const expiresDaysInput = $('#expiresDaysUploadInput') as HTMLInputElement;
  const folderSelect = $('#folder-select') as HTMLSelectElement;
  
  return {
    comment: commentInput?.value || '',
    dlkey: dleyInput?.value || '',
    delkey: deleyInput?.value || '',
    replacekey: replaceKeyInput?.value || '',
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
  
  switch (data.status) {
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
interface WindowWithGlobals {
  enhancedFileUpload: () => void;
  pauseUpload: (filename: string) => boolean;
  resumeUpload: (filename: string) => boolean;
  cancelUpload: (filename: string) => boolean;
  uploadFileResumable: (file: File, options?: UploadOptions) => Promise<void>;
}

(window as unknown as WindowWithGlobals).enhancedFileUpload = enhancedFileUpload;
(window as unknown as WindowWithGlobals).pauseUpload = pauseUpload;
(window as unknown as WindowWithGlobals).resumeUpload = resumeUpload;
(window as unknown as WindowWithGlobals).cancelUpload = cancelUpload;
(window as unknown as WindowWithGlobals).uploadFileResumable = uploadFileResumable;

export {};