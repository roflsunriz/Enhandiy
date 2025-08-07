/**
 * エラーハンドリングのユーティリティ
 */

import { showError } from './messages';

/**
 * グローバルエラーハンドリングの初期化
 */
export function initializeErrorHandling(): void {
  // 未処理のJavaScriptエラーをキャッチ
  window.addEventListener('error', (event) => {
    console.error('JavaScript Error:', event.error);
    
    // 開発環境でのみ詳細なエラーを表示
    if (import.meta.env.DEV) {
      showError(`JavaScript Error: ${event.error?.message || 'Unknown error'}`);
    } else {
      showError('アプリケーションエラーが発生しました。ページを再読み込みしてください。');
    }
  });
  
  // 未処理のPromise拒否をキャッチ
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // 開発環境でのみ詳細なエラーを表示
    if (import.meta.env.DEV) {
      showError(`Promise Error: ${event.reason}`);
    } else {
      showError('通信エラーが発生しました。しばらく後に再試行してください。');
    }
  });
}

/**
 * エラーオブジェクトから適切なメッセージを抽出
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  
  return '不明なエラーが発生しました';
}

/**
 * 非同期関数をエラーハンドリング付きで実行
 */
export async function handleAsync<T>(
  asyncFn: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> {
  try {
    return await asyncFn();
  } catch (error) {
    console.error('Async function error:', error);
    
    const message = errorMessage || getErrorMessage(error);
    showError(message);
    
    return null;
  }
}

/**
 * 安全な関数実行（同期）
 */
export function safeExecute<T>(
  fn: () => T,
  errorMessage?: string
): T | null {
  try {
    return fn();
  } catch (error) {
    console.error('Function execution error:', error);
    
    const message = errorMessage || getErrorMessage(error);
    showError(message);
    
    return null;
  }
}

export {};