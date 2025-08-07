/**
 * メッセージ表示のユーティリティ関数
 * Bootstrap ToastやAlert等のモダンな実装
 */

// メッセージタイプ
export type MessageType = 'success' | 'error' | 'warning' | 'info';

/**
 * ステータスメッセージを表示
 */
export function showStatusMessage(message: string, type: MessageType = 'info'): void {
  // 既存のメッセージを削除
  removeExistingMessages();
  
  // 新しいメッセージ要素を作成
  const messageElement = createMessageElement(message, type);
  
  // ページに追加
  document.body.appendChild(messageElement);
  
  // アニメーション付きで表示
  setTimeout(() => {
    messageElement.classList.add('show');
  }, 10);
  
  // 5秒後に自動削除
  setTimeout(() => {
    hideMessage(messageElement);
  }, 5000);
}

/**
 * 成功メッセージを表示
 */
export function showSuccess(message: string): void {
  showStatusMessage(message, 'success');
}

/**
 * エラーメッセージを表示
 */
export function showError(message: string): void {
  showStatusMessage(message, 'error');
}

/**
 * 警告メッセージを表示
 */
export function showWarning(message: string): void {
  showStatusMessage(message, 'warning');
}

/**
 * 情報メッセージを表示
 */
export function showInfo(message: string): void {
  showStatusMessage(message, 'info');
}

/**
 * メッセージ要素を作成
 */
function createMessageElement(message: string, type: MessageType): HTMLElement {
  const element = document.createElement('div');
  element.className = `status-message status-message--${type}`;
  element.innerHTML = `
    <div class="status-message__content">
      <span class="status-message__icon">${getMessageIcon(type)}</span>
      <span class="status-message__text">${escapeHtml(message)}</span>
      <button class="status-message__close" aria-label="閉じる">&times;</button>
    </div>
  `;
  
  // 閉じるボタンのイベントリスナー
  const closeButton = element.querySelector('.status-message__close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      hideMessage(element);
    });
  }
  
  return element;
}

/**
 * メッセージタイプに応じたアイコンを取得
 */
function getMessageIcon(type: MessageType): string {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✗';
    case 'warning':
      return '⚠';
    case 'info':
    default:
      return 'ℹ';
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
 * 既存のメッセージを削除
 */
function removeExistingMessages(): void {
  const existingMessages = document.querySelectorAll('.status-message');
  existingMessages.forEach(element => {
    element.remove();
  });
}

/**
 * メッセージを非表示にして削除
 */
function hideMessage(element: HTMLElement): void {
  element.classList.add('hide');
  setTimeout(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }, 300);
}

// グローバル関数として公開（後方互換性のため）
if (typeof window !== 'undefined') {
  window.showError = showError;
  window.showSuccess = showSuccess;
}

export {};