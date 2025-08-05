/**
 * ファイル編集機能 (TypeScript版)
 * file-edit.jsのjQuery依存を除去したモダン実装
 */

import { ready, $, attr, addClass, removeClass } from './utils/dom';
import { get, post, getCsrfToken } from './utils/http';
import { showSuccess, showError } from './utils/messages';
import { initializeErrorHandling } from './utils/errorHandling';
import { showModal, hideModal } from './utils/bootstrap';

// 型定義のインポート
import './types/global';
// モーダル切り替え用に最後の共有データを保持
let lastShareData: { share_key: string; share_url?: string; share_url_with_comment?: string; max_downloads?: number; expires_days?: number } | null = null;

// ファイル編集機能初期化
ready(() => {
  console.log('File Edit functionality initialized (TypeScript)');
  
  // エラーハンドリングの初期化
  initializeErrorHandling();
  
  // ファイル編集関連のイベントリスナーを設定
  initializeFileEditEvents();
});



/**
 * ファイル編集関連のイベント初期化
 */
function initializeFileEditEvents(): void {
  // コメント保存ボタン
  const saveCommentBtn = $('#saveCommentBtn');
  if (saveCommentBtn) {
    saveCommentBtn.addEventListener('click', handleSaveComment);
  }
  
  // ファイル差し替えボタン
  const replaceFileBtn = $('#replaceFileBtn');
  if (replaceFileBtn) {
    replaceFileBtn.addEventListener('click', handleReplaceFile);
  }
  
  // タブ切り替え時の処理
  const tabButtons = document.querySelectorAll('button[data-bs-toggle="tab"]');
  tabButtons.forEach(button => {
    button.addEventListener('shown.bs.tab', handleTabChange);
  });
  
  // 共有リンク生成ボタン
  const generateShareBtn = $('#generateShareLinkBtn');
  if (generateShareBtn) {
    generateShareBtn.addEventListener('click', handleGenerateShareLink);
  }
  // 設定保存ボタン
  const saveSettingsBtn = $('#saveShareSettingsBtn') as HTMLButtonElement;
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', handleSaveShareSettings);
  }
  // 共有フォーマット切り替え
  const formatRadios = document.querySelectorAll('input[name="shareFormat"]');
  formatRadios.forEach(radio => {
    radio.addEventListener('change', handleShareFormatChange);
  });
  // コピーボタン
  const copyBtn = $('#copyShareUrlBtn') as HTMLButtonElement;
  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopyShareUrl);
  }
  
  // 共有設定の動的反映
  const shareMaxDownloadsInput = $('#shareMaxDownloads') as HTMLInputElement;
  const shareExpiresDaysInput = $('#shareExpiresDays') as HTMLInputElement;
  if (shareMaxDownloadsInput) {
    shareMaxDownloadsInput.addEventListener('input', updateCurrentShareSettings);
  }
  if (shareExpiresDaysInput) {
    shareExpiresDaysInput.addEventListener('input', updateCurrentShareSettings);
  }
}

/**
 * ファイル編集モーダルを開く
 */
export function openEditDialog(fileId: string, fileName: string, comment: string = ''): void {
  // フォームに値を設定
  const editFileIdInput = $('#editFileId') as HTMLInputElement;
  const replaceFileIdInput = $('#replaceFileId') as HTMLInputElement;
  const editFileNameElement = $('#editFileName');
  const replaceFileNameElement = $('#replaceFileName');
  const editCommentInput = $('#editComment') as HTMLInputElement;
  
  if (editFileIdInput) editFileIdInput.value = fileId;
  if (replaceFileIdInput) replaceFileIdInput.value = fileId;
  if (editFileNameElement) (editFileNameElement as HTMLInputElement).value = fileName;
  if (replaceFileNameElement) (replaceFileNameElement as HTMLInputElement).value = fileName;
  if (editCommentInput) editCommentInput.value = comment;
  
  // コメントタブを表示
  activateTab('comment-tab', 'commentTab');
  
  // モーダルを表示
  showModal('editModal');
}

/**
 * コメント編集開始
 */
export function editComment(fileId: string, fileName: string, currentComment: string = ''): void {
  // フォームに値を設定
  const editFileIdInput = $('#editFileId') as HTMLInputElement;
  const replaceFileIdInput = $('#replaceFileId') as HTMLInputElement;
  const editFileNameElement = $('#editFileName');
  const replaceFileNameElement = $('#replaceFileName');
  const editCommentInput = $('#editComment') as HTMLInputElement;
  
  if (editFileIdInput) editFileIdInput.value = fileId;
  if (replaceFileIdInput) replaceFileIdInput.value = fileId;
  if (editFileNameElement) (editFileNameElement as HTMLInputElement).value = fileName;
  if (replaceFileNameElement) (replaceFileNameElement as HTMLInputElement).value = fileName;
  if (editCommentInput) editCommentInput.value = currentComment;
  
  // 差し替えキーフィールドをクリア（新しい編集セッション用）
  const editReplaceKeyInput = $('#editReplaceKeyInput') as HTMLInputElement;
  if (editReplaceKeyInput) editReplaceKeyInput.value = '';
  
  // コメントタブを表示
  activateTab('comment-tab', 'commentTab');
  
  // ボタンの表示切り替え
  const saveCommentBtn = $('#saveCommentBtn') as HTMLElement;
  const replaceFileBtn = $('#replaceFileBtn') as HTMLElement;
  
  if (saveCommentBtn) saveCommentBtn.style.display = 'inline-block';
  if (replaceFileBtn) replaceFileBtn.style.display = 'none';
  
  // モーダルを表示
  showModal('editModal');
}

/**
 * ファイル差し替え開始
 */
export function replaceFile(fileId: string, currentFilename: string = ''): void {
  // フォームに値を設定
  const replaceFileIdInput = $('#replaceFileId') as HTMLInputElement;
  const editFileNameElement = $('#editFileName');
  const replaceFileNameElement = $('#replaceFileName');
  
  if (replaceFileIdInput) replaceFileIdInput.value = fileId;
  if (editFileNameElement) (editFileNameElement as HTMLInputElement).value = currentFilename;
  if (replaceFileNameElement) (replaceFileNameElement as HTMLInputElement).value = currentFilename;
  
  // 差し替えタブを表示
  activateTab('replace-tab', 'replaceTab');
  
  // ボタンの表示切り替え
  const saveCommentBtn = $('#saveCommentBtn') as HTMLElement;
  const replaceFileBtn = $('#replaceFileBtn') as HTMLElement;
  
  if (replaceFileBtn) replaceFileBtn.style.display = 'inline-block';
  if (saveCommentBtn) saveCommentBtn.style.display = 'none';
  
  // モーダルを表示
  showModal('editModal');
}

/**
 * 共有リンクモーダルを開く
 */
export function openShareModal(fileId: string, filename: string, comment: string = ''): void {
  // フォームに値を設定
  const shareFileNameInput = $('#shareFileName') as HTMLInputElement;
  const shareFileCommentInput = $('#shareFileComment') as HTMLInputElement;
  if (shareFileNameInput) {
    shareFileNameInput.value = filename;
    shareFileNameInput.setAttribute('data-file-id', fileId);
  }
  if (shareFileCommentInput) shareFileCommentInput.value = comment;
  // 現在の設定を取得して入力に反映
  fetchShareSettings(fileId);
  
  // 初期表示時も現在の設定を反映
  setTimeout(() => {
    updateCurrentShareSettings();
  }, 100);
  
  // 結果パネルを隠す
  const shareResultPanel = $('#shareResultPanel') as HTMLElement;
  const regenerateBtn = $('#regenerateShareLinkBtn') as HTMLElement;
  const generateBtn = $('#generateShareLinkBtn') as HTMLElement;
  if (shareResultPanel) shareResultPanel.style.display = 'none';
  if (regenerateBtn) regenerateBtn.style.display = 'none';
  if (generateBtn) generateBtn.style.display = 'inline-block';
  
  // モーダルを表示
  showModal('shareLinkModal');
}

/**
 * コメント保存処理
 */
async function handleSaveComment(): Promise<void> {
  const editFileIdInput = $('#editFileId') as HTMLInputElement;
  const editCommentInput = $('#editComment') as HTMLInputElement;
  const editReplaceKeyInput = $('#editReplaceKeyInput') as HTMLInputElement;
  
  if (!editFileIdInput || !editCommentInput) {
    showError('必要な入力項目が見つかりません。');
    return;
  }
  
  const fileId = editFileIdInput.value;
  const comment = editCommentInput.value;
  const replaceKey = editReplaceKeyInput?.value || '';
  
  if (!fileId) {
    showError('ファイルIDが指定されていません。');
    return;
  }
  
  // 差し替えキーのバリデーション（全ファイル必須）
  if (!replaceKey.trim()) {
    showError('差し替えキーが必要です。');
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('comment', comment);
    formData.append('replace_key', replaceKey);
    formData.append('csrf_token', getCsrfToken());
    
    const response = await post('./app/api/edit-comment.php', formData);
    
    if (response.success) {
      showSuccess('コメントを保存しました。');
      hideModal('editModal');
      
      // FileManagerの動的更新
      if (window.fileManagerInstance) {
        await window.fileManagerInstance.refreshFromServer();
      } else {
        // フォールバック: FileManagerが無い場合のみリロード
        window.location.reload();
      }
    } else {
      throw new Error(response.error || 'コメントの保存に失敗しました。');
    }
    
  } catch (error) {
    console.error('コメント保存エラー:', error);
    showError('コメントの保存に失敗しました。');
  }
}

/**
 * ファイル差し替え処理
 */
async function handleReplaceFile(): Promise<void> {
  const replaceFileIdInput = $('#replaceFileId') as HTMLInputElement;
  const replaceFileInput = $('#replaceFileInput') as HTMLInputElement;
  
  if (!replaceFileIdInput || !replaceFileInput) {
    showError('必要な入力項目が見つかりません。');
    return;
  }
  
  const fileId = replaceFileIdInput.value;
  const files = replaceFileInput.files;
  
  if (!fileId) {
    showError('ファイルIDが指定されていません。');
    return;
  }
  
  if (!files || files.length === 0) {
    showError('差し替えるファイルを選択してください。');
    return;
  }
  
  const file = files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('replacekey', (document.getElementById('modalReplaceKeyInput') as HTMLInputElement)?.value || '');
  formData.append('csrf_token', (window as unknown as { config?: { csrf_token?: string } }).config?.csrf_token || '');
  
  try {
    const response = await post(`./app/api/replace-file.php?id=${encodeURIComponent(fileId)}`, formData);
    
    if (response.success) {
      showSuccess('ファイルを差し替えました。');
      hideModal('editModal');
      
      // FileManagerの動的更新
      if (window.fileManagerInstance) {
        await window.fileManagerInstance.refreshFromServer();
      } else {
        // フォールバック: FileManagerが無い場合のみリロード
        window.location.reload();
      }
    } else {
      throw new Error(response.error || 'ファイルの差し替えに失敗しました。');
    }
    
  } catch (error) {
    console.error('ファイル差し替えエラー:', error);
    showError('ファイルの差し替えに失敗しました。');
  }
}

/**
 * タブ変更処理
 */
function handleTabChange(event: Event): void {
  const target = event.target as HTMLElement;
  const targetHref = attr(target, 'data-bs-target');
  
  const saveCommentBtn = $('#saveCommentBtn') as HTMLElement;
  const replaceFileBtn = $('#replaceFileBtn') as HTMLElement;
  
  if (targetHref === '#commentTab') {
    if (saveCommentBtn) saveCommentBtn.style.display = 'inline-block';
    if (replaceFileBtn) replaceFileBtn.style.display = 'none';
  } else if (targetHref === '#replaceTab') {
    if (saveCommentBtn) saveCommentBtn.style.display = 'none';
    if (replaceFileBtn) replaceFileBtn.style.display = 'inline-block';
  }
}

/**
 * 共有リンク生成処理
 */
async function handleGenerateShareLink(): Promise<void> {
  const shareFileNameInput = $('#shareFileName') as HTMLInputElement;
  const shareMaxDownloadsInput = $('#shareMaxDownloads') as HTMLInputElement;
  const shareExpiresDaysInput = $('#shareExpiresDays') as HTMLInputElement;
  
  if (!shareFileNameInput) {
    showError('ファイル情報が見つかりません。');
    return;
  }
  
  const fileId = attr(shareFileNameInput, 'data-file-id');
  const maxDownloads = shareMaxDownloadsInput?.value || null;
  const expiresDays = shareExpiresDaysInput?.value || null;
  
  if (!fileId) {
    showError('ファイルIDが見つかりません。');
    return;
  }
  
  // ボタンを無効化して処理中表示
  const generateBtn = $('#generateShareLinkBtn') as HTMLButtonElement;
  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> 生成中...';
  }
  
  try {
    const response = await post('./app/api/generatesharelink.php', {
      id: fileId,
      max_downloads: maxDownloads,
      expires_days: expiresDays
    });
    
    if (response.success && response.data) {
      // 生成結果を保持
      lastShareData = response.data as typeof lastShareData;
      displayShareLink(response.data as Parameters<typeof displayShareLink>[0]);
      // 自動コピー
      await handleCopyShareUrl();
      showSuccess('共有リンクを生成しました。');
    } else {
      // エラーメッセージがある場合はそれを使用、なければデフォルトメッセージ
      const errorMessage = (response as any).message || response.error || '共有リンクの生成に失敗しました。';
      throw new Error(errorMessage);
    }
    
  } catch (error) {
    console.error('共有リンク生成エラー:', error);
    // エラーオブジェクトからメッセージを取得
    const errorMessage = error instanceof Error ? error.message : '共有リンクの生成に失敗しました。';
    showError(errorMessage);
  } finally {
    // ボタンを元に戻す
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-link"></i> 共有リンクを生成';
    }
  }
}

/**
 * 共有リンク表示
 */
function displayShareLink(shareData: { 
  share_key: string; 
  share_expires?: string; 
  share_download_limit?: number; 
  share_downloads?: number;
  max_downloads?: number;
  expires_days?: number;
}): void {
  // 設定フィールドに反映
  const shareMaxDownloadsInput = $('#shareMaxDownloads') as HTMLInputElement;
  if (shareMaxDownloadsInput) {
    shareMaxDownloadsInput.value = shareData.max_downloads?.toString() || '';
  }
  const shareExpiresDaysInput = $('#shareExpiresDays') as HTMLInputElement;
  if (shareExpiresDaysInput) {
    shareExpiresDaysInput.value = shareData.expires_days?.toString() || '';
  }
  // 現在の設定を表示
  const currentMaxDownloads = $('#currentMaxDownloads');
  const currentExpiresDays = $('#currentExpiresDays');
  
  if (currentMaxDownloads) {
    const maxDownloadsText = shareData.max_downloads || '無制限';
    currentMaxDownloads.innerHTML = `<strong>最大ダウンロード数:</strong> ${maxDownloadsText}`;
  }
  
  if (currentExpiresDays) {
    const expiresDaysText = shareData.expires_days || '無期限';
    currentExpiresDays.innerHTML = `<strong>有効期限:</strong> ${expiresDaysText}`;
  }
  
  // 結果パネルを表示
  const shareResultPanel = $('#shareResultPanel') as HTMLElement;
  if (shareResultPanel) {
    shareResultPanel.style.display = 'block';
  }
  
  // ボタンの表示切り替え
  const regenerateBtn = $('#regenerateShareLinkBtn') as HTMLElement;
  const generateBtn = $('#generateShareLinkBtn') as HTMLElement;
  
  if (regenerateBtn) regenerateBtn.style.display = 'inline-block';
  if (generateBtn) generateBtn.style.display = 'none';
  
  // デフォルトでURL のみを選択
  const urlOnlyRadio = document.querySelector('input[name="shareFormat"][value="url_only"]') as HTMLInputElement;
  if (urlOnlyRadio) {
    urlOnlyRadio.checked = true;
    updateShareUrl(shareData);
  }
}

/**
 * 共有フォーマット変更処理
 */
function handleShareFormatChange(): void {
  if (lastShareData) {
    updateShareUrl(lastShareData);
  }
}

/**
 * 共有URL更新
 */
function updateShareUrl(shareData: { 
  share_key: string; 
  urlOnly?: string; 
  share_url?: string; 
  urlWithComment?: string; 
  share_url_with_comment?: string; 
}): void {
  const selectedFormat = document.querySelector('input[name="shareFormat"]:checked') as HTMLInputElement;
  const shareUrlInput = $('#shareUrl') as HTMLInputElement;
  
  if (!selectedFormat || !shareUrlInput) return;
  
  const format = selectedFormat.value;
  
  if (format === 'url_only') {
    shareUrlInput.value = shareData.urlOnly || shareData.share_url || '';
  } else if (format === 'url_with_comment') {
    shareUrlInput.value = shareData.urlWithComment || shareData.share_url_with_comment || '';
  }
}

/**
 * タブを有効化
 */
function activateTab(tabId: string, contentId: string): void {
  // 全てのタブを非アクティブ化
  document.querySelectorAll('.nav-link').forEach(tab => {
    removeClass(tab, 'active');
    attr(tab, 'aria-selected', 'false');
  });
  
  document.querySelectorAll('.tab-pane').forEach(content => {
    removeClass(content, 'active');
    removeClass(content, 'show');
  });
  
  // 指定したタブを有効化
  const targetTab = $('#' + tabId);
  const targetContent = $('#' + contentId);
  
  if (targetTab) {
    addClass(targetTab, 'active');
    attr(targetTab, 'aria-selected', 'true');
  }
  
  if (targetContent) {
    addClass(targetContent, 'active');
    addClass(targetContent, 'show');
  }
}

// editFile関数（openEditDialogのエイリアス）
export function editFile(fileId: string, fileName: string = '', comment: string = ''): void {
  openEditDialog(fileId, fileName, comment);
}

// グローバル関数として公開（後方互換性）
if (typeof window !== 'undefined') {
  const globalWindow = window as typeof window & {
    openEditDialog: typeof openEditDialog;
    editFile: typeof editFile;
    editComment: typeof editComment;
    replaceFile: typeof replaceFile;
    openShareModal: typeof openShareModal;
  };
  
  globalWindow.openEditDialog = openEditDialog;
  globalWindow.editFile = editFile;
  globalWindow.editComment = editComment;
  globalWindow.replaceFile = replaceFile;
  globalWindow.openShareModal = openShareModal;
}

// 共有設定取得
async function fetchShareSettings(fileId: string): Promise<void> {
  try {
    const res = await get(`./app/api/generatesharelink.php?id=${encodeURIComponent(fileId)}`);
    if (res.success && res.data) {
      const data = res.data as { max_downloads?: number; expires_days?: number };
      const maxInput = $('#shareMaxDownloads') as HTMLInputElement;
      const expInput = $('#shareExpiresDays') as HTMLInputElement;
      if (maxInput) maxInput.value = data.max_downloads?.toString() || '';
      if (expInput) expInput.value = data.expires_days?.toString() || '';
      // lastShareDataに反映
      lastShareData = { ...lastShareData, max_downloads: data.max_downloads, expires_days: data.expires_days } as typeof lastShareData;
    }
  } catch (e) {
    console.error('設定取得エラー:', e);
  }
}
// 設定保存処理
async function handleSaveShareSettings(): Promise<void> {
  const shareFileNameInput = $('#shareFileName') as HTMLInputElement;
  const maxInput = $('#shareMaxDownloads') as HTMLInputElement;
  const expInput = $('#shareExpiresDays') as HTMLInputElement;
  if (!shareFileNameInput) { showError('ファイル情報が見つかりません。'); return; }
  const fileId = shareFileNameInput.getAttribute('data-file-id') || '';
  const maxVal = maxInput?.value || null;
  const expVal = expInput?.value || null;
  const saveBtn = $('#saveShareSettingsBtn') as HTMLButtonElement;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = '保存中...'; }
  try {
    const res = await post('./app/api/generatesharelink.php', { action: 'updateSettings', id: fileId, max_downloads: maxVal, expires_days: expVal });
    if (res.success) {
      showSuccess('設定を保存しました。');
      lastShareData = { ...lastShareData, max_downloads: maxVal ? parseInt(maxVal) : undefined, expires_days: expVal ? parseInt(expVal) : undefined } as typeof lastShareData;
    } else {
      throw new Error(res.error || '設定保存に失敗しました。');
    }
  } catch (e) {
    console.error('設定保存エラー:', e);
    showError('設定の保存に失敗しました。');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = '設定を保存'; }
  }
}

// 共有内容をクリップボードにコピー
async function handleCopyShareUrl(): Promise<void> {
  const shareUrlInput = $('#shareUrl') as HTMLInputElement;
  if (!shareUrlInput || !shareUrlInput.value) {
    showError('コピーする共有内容がありません。');
    return;
  }
  try {
    await navigator.clipboard.writeText(shareUrlInput.value);
    showSuccess('共有内容をクリップボードにコピーしました。');
  } catch {
    // フォールバック
    shareUrlInput.select();
    document.execCommand('copy');
    showSuccess('共有内容をクリップボードにコピーしました。');
  }
}

/**
 * 共有設定の現在値を動的に更新
 */
function updateCurrentShareSettings(): void {
  const shareMaxDownloadsInput = $('#shareMaxDownloads') as HTMLInputElement;
  const shareExpiresDaysInput = $('#shareExpiresDays') as HTMLInputElement;
  const currentMaxDownloads = $('#currentMaxDownloads');
  const currentExpiresDays = $('#currentExpiresDays');
  
  if (currentMaxDownloads && shareMaxDownloadsInput) {
    const maxDownloadsText = shareMaxDownloadsInput.value.trim() || '無制限';
    currentMaxDownloads.innerHTML = `<strong>最大ダウンロード数:</strong> ${maxDownloadsText}`;
  }
  
  if (currentExpiresDays && shareExpiresDaysInput) {
    const expiresDaysText = shareExpiresDaysInput.value.trim() || '無期限';
    currentExpiresDays.innerHTML = `<strong>有効期限:</strong> ${expiresDaysText} ${expiresDaysText !== '無期限' ? '日' : ''}`;
  }
}

// グローバル公開: シェアモーダルを開く関数
(window as unknown as { openShareModal?: typeof openShareModal }).openShareModal = openShareModal;

export {};