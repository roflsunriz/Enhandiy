/**
 * モーダル操作ユーティリティ (Bootstrap 5 + TypeScript版)
 * jQuery依存を除去したmodal.jsの置き換え
 */

import { showModal, hideModal } from './bootstrap';

/**
 * モーダルを開く
 * @param type モーダルのタイプ ('ok' または 'okcansel')
 * @param title モーダルのタイトル
 * @param body モーダルの本文
 * @param action OK実行時のアクション（関数名またはコード）
 */
export function openModal(
  type: 'ok' | 'okcansel', 
  title: string, 
  body: string, 
  action?: string | (() => void)
): void {
  let modalId: string;
  
  switch (type) {
    case 'okcansel':
      modalId = 'OKCanselModal';
      updateModalContent(modalId, title, body);
      
      if (action) {
        setModalAction(modalId, action);
      }
      
      showModal(modalId);
      break;
      
    case 'ok':
      modalId = 'OKModal';
      updateModalContent(modalId, title, body);
      
      if (action) {
        setModalAction(modalId, action);
      }
      
      showModal(modalId);
      break;
      
    default:
      console.error('Unknown modal type:', type);
  }
}

/**
 * モーダルを閉じる
 */
export function closeModal(): void {
  hideModal('OKCanselModal');
  hideModal('OKModal');
}

/**
 * モーダルのコンテンツを更新
 */
function updateModalContent(modalId: string, title: string, body: string): void {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  // タイトルを更新
  const titleElement = modal.querySelector('.modal-title');
  if (titleElement) {
    titleElement.innerHTML = escapeHtml(title);
  }
  
  // 本文を更新
  const bodyElement = modal.querySelector('.modal-body p');
  if (bodyElement) {
    bodyElement.innerHTML = escapeHtml(body);
  }
}

/**
 * モーダルのアクションを設定
 */
function setModalAction(modalId: string, action: string | (() => void)): void {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const actionButton = modal.querySelector('.f-action') as HTMLButtonElement;
  if (!actionButton) return;
  
  // 既存のイベントリスナーをクリア
  const newButton = actionButton.cloneNode(true) as HTMLButtonElement;
  actionButton.parentNode?.replaceChild(newButton, actionButton);
  
  // 新しいアクションを設定
  if (typeof action === 'function') {
    newButton.addEventListener('click', action);
  } else if (typeof action === 'string') {
    // 関数名の文字列の場合はonclick属性として設定
    newButton.setAttribute('onclick', action);
  }
}

/**
 * 編集モーダルを開く
 */
export function openEditModal(fileId: string, fileName: string, comment: string = ''): void {
  const modal = document.getElementById('editModal');
  if (!modal) return;
  
  // ファイル情報を設定
  const fileIdInput = modal.querySelector('#editFileId') as HTMLInputElement;
  const fileNameElement = modal.querySelector('#editFileName');
  const commentInput = modal.querySelector('#editFileComment') as HTMLInputElement;
  
  if (fileIdInput) fileIdInput.value = fileId;
  if (fileNameElement) fileNameElement.textContent = fileName;
  if (commentInput) commentInput.value = comment;
  
  // コメントタブを有効化
  activateTab('comment-tab', 'commentTab');
  
  showModal('editModal');
}

/**
 * 共有リンクモーダルを開く
 */
export function openShareLinkModal(_fileId: string, fileName: string, comment: string = ''): void {
  const modal = document.getElementById('shareLinkModal');
  if (!modal) return;
  
  // ファイル情報を設定
  const fileNameInput = modal.querySelector('#shareFileName') as HTMLInputElement;
  const commentInput = modal.querySelector('#shareFileComment') as HTMLInputElement;
  
  if (fileNameInput) fileNameInput.value = fileName;
  if (commentInput) commentInput.value = comment;
  
  // 共有設定をリセット
  resetShareSettings();
  
  showModal('shareLinkModal');
}

/**
 * タブを有効化
 */
function activateTab(tabId: string, contentId: string): void {
  // 全てのタブを非アクティブ化
  document.querySelectorAll('.nav-link').forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
  
  document.querySelectorAll('.tab-pane').forEach(content => {
    content.classList.remove('active', 'show');
  });
  
  // 指定したタブを有効化
  const targetTab = document.getElementById(tabId);
  const targetContent = document.getElementById(contentId);
  
  if (targetTab) {
    targetTab.classList.add('active');
    targetTab.setAttribute('aria-selected', 'true');
  }
  
  if (targetContent) {
    targetContent.classList.add('active', 'show');
  }
}

/**
 * 共有設定をリセット
 */
function resetShareSettings(): void {
  const modal = document.getElementById('shareLinkModal');
  if (!modal) return;
  
  // フォーム要素をリセット
  const form = modal.querySelector('form');
  if (form) {
    form.reset();
  }
  
  // 生成されたリンクをクリア
  const linkContainer = modal.querySelector('#generatedLinkContainer');
  if (linkContainer) {
    linkContainer.innerHTML = '';
  }
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 確認ダイアログ（モーダル版）
 */
export function confirmModal(
  message: string, 
  onConfirm: () => void, 
  onCancel?: () => void,
  title: string = '確認'
): void {
  openModal('okcansel', title, message, onConfirm);
  
  // キャンセル時のアクションを設定
  if (onCancel) {
    const modal = document.getElementById('OKCanselModal');
    if (modal) {
      const cancelButton = modal.querySelector('[data-bs-dismiss="modal"]') as HTMLButtonElement;
      if (cancelButton) {
        cancelButton.addEventListener('click', onCancel, { once: true });
      }
    }
  }
}

/**
 * アラートダイアログ（モーダル版）
 */
export function alertModal(message: string, title: string = 'お知らせ'): void {
  openModal('ok', title, message);
}

// グローバル関数として公開（後方互換性）
if (typeof window !== 'undefined') {
  (window as typeof window & {
    openModal: typeof openModal;
    closeModal: typeof closeModal;
  }).openModal = openModal;
  (window as typeof window & {
    openModal: typeof openModal;
    closeModal: typeof closeModal;
  }).closeModal = closeModal;
}

export {};