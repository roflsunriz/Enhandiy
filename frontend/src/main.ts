/**
 * メインエントリーポイント
 * 従来のcommon.jsに相当するTypeScript実装
 */

import { ready } from './utils/dom';
import { showStatusMessage } from './utils/messages';
import { FileManager } from './components/file-manager';
import { initializeErrorHandling } from './utils/error-handling';
import { initializeBootstrap } from './utils/bootstrap';
import './utils/modal'; // モーダル機能をグローバルに公開

// 型定義のインポート
import './types/global';

// APIクライアントをインポート（グローバルに公開されるため）
// ファイルマネージャーや他のコンポーネントから使用される
import './api/client';

// グローバル初期化
ready(() => {
  
  // エラーハンドリングの初期化
  initializeErrorHandling();
  
  // Bootstrap 5の初期化
  initializeBootstrap();
  
  // ファイルマネージャーの初期化
  initializeFileManager();
  
  // ステータスメッセージの自動非表示
  initializeStatusMessages();
  
  // URLパラメータからのエラーメッセージチェック
  checkUrlErrors();
});

/**
 * ファイルマネージャーの初期化
 */
function initializeFileManager(): void {
  const container = document.getElementById('fileManagerContainer');
  
  if (window.fileData && container) {
    
    
    // FileManagerインスタンス作成（初期化は setFiles() 内で実行される）
    const fileManager = new FileManager(container, {
      itemsPerPage: 12,
      defaultSort: 'date_desc'
    });
    
    // ファイルデータ設定と同時に初期化が実行される
    fileManager.setFiles(window.fileData);
    
    // グローバルに公開（デバッグ・外部操作用）
    window.fileManagerInstance = fileManager;
    
    
  } else {
    // FileManager初期化失敗
    handleFileManagerInitializationFailure();
  }
}

/**
 * ステータスメッセージの初期化
 */
function initializeStatusMessages(): void {
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    setTimeout(() => {
      statusMessage.style.opacity = '0';
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 300);
    }, 5000);
  }
}

/**
 * URLエラーパラメータのチェック
 */
function checkUrlErrors(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  
  if (error) {
    let errorMessage = '';
    let errorTitle = 'エラー';
    
    switch (error) {
      case 'expired':
        errorTitle = '共有リンクエラー';
        errorMessage = 'この共有リンクは有効期限が切れています。';
        break;
      case 'limit_exceeded':
        errorTitle = 'ダウンロード制限エラー';
        errorMessage = 'このファイルは最大ダウンロード数に達しているため、ダウンロードできません。';
        break;
      default:
        errorMessage = '不明なエラーが発生しました。';
        break;
    }
    
    // エラーメッセージを表示
    showStatusMessage(`${errorTitle}: ${errorMessage}`, 'error');
    
    // URLからエラーパラメータを削除
    cleanUpUrl();
  }
}

/**
 * URLのクリーンアップ
 */
function cleanUpUrl(): void {
  if (window.history && window.history.replaceState) {
    const cleanUrl = window.location.pathname + 
      window.location.search.replace(/[?&]error=[^&]*/, '').replace(/^&/, '?');
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

/**
 * FileManager初期化失敗時の処理
 */
function handleFileManagerInitializationFailure(): void {
  console.error('❌ FileManager initialization failed: missing container or data');
  
  // 開発環境でのみ詳細なエラーを表示
  if (import.meta.env.DEV) {
    showStatusMessage(
      '❌ FileManager初期化失敗: コンテナまたはデータが見つかりません。',
      'error'
    );
  } else {
    showStatusMessage(
      'ファイル一覧の表示に問題があります。ページを再読み込みしてください。',
      'error'
    );
  }
}

export {};