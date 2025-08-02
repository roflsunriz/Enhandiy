/**
 * ファイルマネージャー専用エントリーポイント
 * FileManagerコンポーネントのみを初期化
 */

import { ready } from './utils/dom';
import { FileManager } from './components/FileManager';
import { initializeErrorHandling } from './utils/errorHandling';

// スタイルの読み込み
import './styles/file-manager.css';

// 型定義のインポート
import './types/global';

// ファイルマネージャー専用初期化
ready(() => {
  console.log('FileManager v2.0 - TypeScript Edition');
  
  // エラーハンドリングの初期化
  initializeErrorHandling();
  
  // ファイルマネージャーの初期化
  const container = document.getElementById('fileManagerContainer');
  
  if (window.fileData && container) {
    console.log('Initializing FileManager v2.0');
    
    const fileManager = new FileManager(container, {
      itemsPerPage: 12,
      defaultSort: 'date_desc'
    });
    
    fileManager.setFiles(window.fileData);
    
    // グローバルに公開
    window.fileManagerInstance = fileManager;
    
    console.log('FileManager initialized successfully');
  } else {
    console.warn('FileManager initialization failed: missing container or data');
  }
});

export {};