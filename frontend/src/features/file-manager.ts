/**
 * ファイルマネージャー専用エントリーポイント
 * FileManagerコンポーネントのみを初期化
 */

import { ready } from '../utils/dom';
import { FileManager } from '../components/file-manager';
import { initializeErrorHandling } from '../utils/error-handling';

// 型定義のインポート
import './types/global';

// ファイルマネージャー専用初期化
ready(() => {
  
  
  // エラーハンドリングの初期化
  initializeErrorHandling();
  
  // ファイルマネージャーの初期化
  const container = document.getElementById('fileManagerContainer');
  
  // 既にFileManagerインスタンスが存在する場合は重複作成を防ぐ
  if (window.fileManagerInstance) {
    
    return;
  }
  
  if (window.fileData && container) {
    
    
    const fileManager = new FileManager(container, {
      itemsPerPage: 12,
      defaultSort: 'date_desc'
    });
    
    fileManager.setFiles(window.fileData);
    
    // グローバルに公開
    window.fileManagerInstance = fileManager;
    
    
  } else {
    console.warn('FileManager initialization failed: missing container or data');
  }
});

export {};