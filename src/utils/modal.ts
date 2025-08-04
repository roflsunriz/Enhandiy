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

// openShareLinkModal関数は削除しました
// 代わりにsrc/file-edit.tsのopenShareModal関数を使用してください

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

/**
 * 新しいアラートモーダル（Promise版）
 */
export function showAlert(message: string, title: string = 'お知らせ'): Promise<void> {
  return new Promise((resolve) => {
    const modal = document.getElementById('alertModal');
    if (!modal) {
      resolve();
      return;
    }

    // モーダルの内容を設定
    const titleElement = modal.querySelector('#alertModalLabel');
    const messageElement = modal.querySelector('#alertModalMessage');
    
    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;

    // OKボタンのイベントリスナー設定
    const okButton = modal.querySelector('[data-bs-dismiss="modal"]');
    const handleOk = () => {
      okButton?.removeEventListener('click', handleOk);
      resolve();
    };
    okButton?.addEventListener('click', handleOk);

    // モーダルを表示
    showModal('alertModal');
  });
}

/**
 * 新しい確認モーダル（Promise版）
 */
export function showConfirm(message: string, title: string = '確認'): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    if (!modal) {
      resolve(false);
      return;
    }

    // モーダルの内容を設定
    const titleElement = modal.querySelector('#confirmModalLabel');
    const messageElement = modal.querySelector('#confirmModalMessage');
    const okButton = modal.querySelector('#confirmModalOk');
    const cancelButton = modal.querySelector('#confirmModalCancel');
    
    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;

    // イベントリスナー設定
    const handleOk = () => {
      cleanup();
      hideModal('confirmModal');
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      hideModal('confirmModal');
      resolve(false);
    };

    const cleanup = () => {
      okButton?.removeEventListener('click', handleOk);
      cancelButton?.removeEventListener('click', handleCancel);
      modal.removeEventListener('hidden.bs.modal', handleCancel);
    };

    okButton?.addEventListener('click', handleOk);
    cancelButton?.addEventListener('click', handleCancel);
    modal.addEventListener('hidden.bs.modal', handleCancel, { once: true });

    // モーダルを表示
    showModal('confirmModal');
  });
}

/**
 * 新しい入力モーダル（Promise版）
 */
export function showPrompt(message: string, defaultValue: string = '', title: string = '入力'): Promise<string | null> {
  return new Promise((resolve) => {
    const modal = document.getElementById('promptModal');
    if (!modal) {
      resolve(null);
      return;
    }

    // モーダルの内容を設定
    const titleElement = modal.querySelector('#promptModalLabel');
    const messageElement = modal.querySelector('#promptModalMessage');
    const inputElement = modal.querySelector('#promptModalInput') as HTMLInputElement;
    const okButton = modal.querySelector('#promptModalOk');
    const cancelButton = modal.querySelector('#promptModalCancel');
    
    if (titleElement) titleElement.textContent = title;
    if (messageElement) {
      messageElement.textContent = message;
      // 改行を有効にするためのCSS設定
      (messageElement as HTMLElement).style.whiteSpace = 'pre-line';
    }
    if (inputElement) {
      inputElement.value = defaultValue;
      // モーダルが表示されたらフォーカスを設定
      modal.addEventListener('shown.bs.modal', () => {
        inputElement.focus();
        inputElement.select();
      }, { once: true });
    }

    // イベントリスナー設定
    const handleOk = () => {
      const value = inputElement?.value?.trim() || '';
      cleanup();
      hideModal('promptModal');
      resolve(value || null);
    };

    const handleCancel = () => {
      cleanup();
      hideModal('promptModal');
      resolve(null);
    };

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleOk();
      }
    };

    const cleanup = () => {
      okButton?.removeEventListener('click', handleOk);
      cancelButton?.removeEventListener('click', handleCancel);
      inputElement?.removeEventListener('keypress', handleEnter);
      modal.removeEventListener('hidden.bs.modal', handleCancel);
    };

    okButton?.addEventListener('click', handleOk);
    cancelButton?.addEventListener('click', handleCancel);
    inputElement?.addEventListener('keypress', handleEnter);
    modal.addEventListener('hidden.bs.modal', handleCancel, { once: true });

    // モーダルを表示
    showModal('promptModal');
  });
}

/**
 * パスワード入力モーダル（Promise版）
 */
export function showPasswordPrompt(message: string, title: string = 'パスワード入力'): Promise<string | null> {
  return new Promise((resolve) => {
    const modal = document.getElementById('passwordModal');
    if (!modal) {
      resolve(null);
      return;
    }

    // モーダルの内容を設定
    const titleElement = modal.querySelector('#passwordModalLabel');
    const messageElement = modal.querySelector('#passwordModalMessage');
    const inputElement = modal.querySelector('#passwordModalInput') as HTMLInputElement;
    const okButton = modal.querySelector('#passwordModalOk');
    const cancelButton = modal.querySelector('#passwordModalCancel');
    
    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
    if (inputElement) {
      inputElement.value = '';
      // モーダルが表示されたらフォーカスを設定
      modal.addEventListener('shown.bs.modal', () => {
        inputElement.focus();
      }, { once: true });
    }

    // イベントリスナー設定
    const handleOk = () => {
      const value = inputElement?.value || '';
      cleanup();
      hideModal('passwordModal');
      resolve(value || null);
    };

    const handleCancel = () => {
      cleanup();
      hideModal('passwordModal');
      resolve(null);
    };

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleOk();
      }
    };

    const cleanup = () => {
      okButton?.removeEventListener('click', handleOk);
      cancelButton?.removeEventListener('click', handleCancel);
      inputElement?.removeEventListener('keypress', handleEnter);
      modal.removeEventListener('hidden.bs.modal', handleCancel);
    };

    okButton?.addEventListener('click', handleOk);
    cancelButton?.addEventListener('click', handleCancel);
    inputElement?.addEventListener('keypress', handleEnter);
    modal.addEventListener('hidden.bs.modal', handleCancel, { once: true });

    // モーダルを表示
    showModal('passwordModal');
  });
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