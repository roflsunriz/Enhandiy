/**
 * 共有機能 (TypeScript版)
 * share.jsのjQuery依存を除去したモダン実装
 */

import { ready, $, attr } from './utils/dom';
import { post } from './utils/http';
import { showSuccess, showError } from './utils/messages';
import { initializeErrorHandling } from './utils/errorHandling';
import { showConfirm } from './utils/modal';

// 型定義のインポート
import './types/global';

// 共有機能初期化
ready(() => {
  
  
  // エラーハンドリングの初期化
  initializeErrorHandling();
  
  // 共有関連のイベントリスナーを設定
  initializeShareEvents();
});

/**
 * 共有関連のイベント初期化
 */
function initializeShareEvents(): void {
  // share.ts専用ページでなければ処理しない
  const maxDownloadsInput = $('#shareMaxDownloads');
  const expiresInput = $('#shareExpiresDays');
  if (!maxDownloadsInput || !expiresInput) {
    return;
  }
  // 共有リンク生成ボタン
  const generateBtn = $('#generateShareLinkBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerateShareLink);
  }
  
  // 共有フォーマット切り替え
  const formatRadios = document.querySelectorAll('input[name="shareFormat"]');
  formatRadios.forEach(radio => {
    radio.addEventListener('change', handleShareFormatChange);
  });
  
  // 共有リンク再生成ボタン
  const regenerateBtn = $('#regenerateShareLinkBtn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', handleRegenerateShareLink);
  }
}

/**
 * 共有リンク生成処理
 */
async function handleGenerateShareLink(): Promise<void> {
  const fileId = attr($('#shareFileName'), 'data-file-id');
  if (!fileId) {
    showError('ファイルIDが見つかりません。');
    return;
  }
  
  const maxDownloadsInput = $('#shareMaxDownloads') as HTMLInputElement;
  const expiresInput = $('#shareExpiresDays') as HTMLInputElement;
  
  const maxDownloads = maxDownloadsInput?.value || '';
  const expires = expiresInput?.value || '';
  
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
      expires_days: expires
    });
    
    if (response.success && response.data) {
      // 共有リンク生成成功
      if (response.data && typeof response.data === 'object' && 'share_key' in response.data) {
        displayShareLink(response.data as Parameters<typeof displayShareLink>[0]);
      }
      showSuccess('共有リンクを生成しました。');
    } else {
      throw new Error(response.error || '共有リンクの生成に失敗しました。');
    }
    
  } catch (error) {
    console.error('共有リンク生成エラー:', error);
    showError('共有リンクの生成に失敗しました。');
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
function displayShareLink(data: { 
  share_key: string; 
  comment?: string; 
  share_url?: string; 
  share_url_with_comment?: string; 
  max_downloads?: number; 
  expires_days?: number; 
}): void {
  const shareUrlInput = $('#shareUrlInput') as HTMLInputElement;
  const shareUrlWithCommentInput = $('#shareUrlWithCommentInput') as HTMLInputElement;
  
  if (shareUrlInput) {
    shareUrlInput.value = data.share_url || '';
  }
  
  if (shareUrlWithCommentInput) {
    shareUrlWithCommentInput.value = data.share_url_with_comment || '';
  }
  
  // 現在の設定を表示
  const currentMaxDownloads = $('#currentMaxDownloads');
  const currentExpiresDays = $('#currentExpiresDays');
  
  if (currentMaxDownloads) {
    const maxDownloadsText = data.max_downloads || '無制限';
    currentMaxDownloads.innerHTML = `<strong>最大ダウンロード数:</strong> ${maxDownloadsText}`;
  }
  
  if (currentExpiresDays) {
    const expiresDaysText = data.expires_days || '無期限';
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
    handleShareFormatChange();
  }
}

/**
 * 共有フォーマット変更処理
 */
function handleShareFormatChange(): void {
  const selectedFormat = document.querySelector('input[name="shareFormat"]:checked') as HTMLInputElement;
  const shareUrlInput = $('#shareUrl') as HTMLInputElement;
  const shareUrlOutput = $('#shareUrlInput') as HTMLInputElement;
  const shareUrlWithCommentOutput = $('#shareUrlWithCommentInput') as HTMLInputElement;
  
  if (!selectedFormat || !shareUrlInput) return;
  
  const format = selectedFormat.value;
  
  if (format === 'url_only' && shareUrlOutput) {
    shareUrlInput.value = shareUrlOutput.value;
  } else if (format === 'url_with_comment' && shareUrlWithCommentOutput) {
    shareUrlInput.value = shareUrlWithCommentOutput.value;
  }
}

/**
 * 共有リンク再生成処理
 */
async function handleRegenerateShareLink(): Promise<void> {
  if (await showConfirm('既存の共有リンクは無効になります。新しい共有リンクを生成しますか？')) {
    await handleGenerateShareLink();
  }
}

/**
 * 共有機能のリセット
 */
export function resetShareModal(): void {
  // フォームをリセット
  const shareForm = $('#shareLinkForm') as HTMLFormElement;
  if (shareForm) {
    shareForm.reset();
  }
  
  // 結果パネルを隠す
  const shareResultPanel = $('#shareResultPanel') as HTMLElement;
  if (shareResultPanel) {
    shareResultPanel.style.display = 'none';
  }
  
  // ボタンの表示を元に戻す
  const regenerateBtn = $('#regenerateShareLinkBtn') as HTMLElement;
  const generateBtn = $('#generateShareLinkBtn') as HTMLElement;
  
  if (regenerateBtn) regenerateBtn.style.display = 'none';
  if (generateBtn) generateBtn.style.display = 'inline-block';
}

/**
 * 共有URL をクリップボードにコピー
 */
export async function copyShareUrl(): Promise<void> {
  const shareUrlInput = $('#shareUrl') as HTMLInputElement;
  
  if (!shareUrlInput || !shareUrlInput.value) {
    showError('コピーする共有URLがありません。');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(shareUrlInput.value);
    showSuccess('共有URLをクリップボードにコピーしました。');
  } catch {
    // フォールバック: 古いブラウザ対応
    shareUrlInput.select();
    document.execCommand('copy');
    showSuccess('共有URLをクリップボードにコピーしました。');
  }
}

// グローバル関数として公開（後方互換性）
if (typeof window !== 'undefined') {
  (window as typeof window & {
    copyShareUrl: typeof copyShareUrl;
    resetShareModal: typeof resetShareModal;
  }).copyShareUrl = copyShareUrl;
  (window as typeof window & {
    copyShareUrl: typeof copyShareUrl;
    resetShareModal: typeof resetShareModal;
  }).resetShareModal = resetShareModal;
}

export {};