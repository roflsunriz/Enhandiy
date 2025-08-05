/**
 * HTTP通信のユーティリティ関数
 * jQueryのAjaxに替わるfetch API実装
 */

import { ApiResponse } from '../types/global';

// HTTPメソッドの型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// リクエストオプション
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string | FormData;
  timeout?: number;
}

// デフォルトヘッダー
const defaultHeaders: Record<string, string> = {
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

// CSRFトークンを取得（複数の方法を試行）
export function getCsrfToken(): string {
  console.log('CSRF Debug - Starting token search...');
  
  // 方法1: windowオブジェクトから取得
  const windowConfig = (window as unknown as { config?: { csrf_token?: string } }).config;
  console.log('CSRF Debug - window.config exists:', !!windowConfig);  
  const windowToken = windowConfig?.csrf_token;
  if (windowToken) {
    console.log('CSRF Debug - Token from window.config:', windowToken.substring(0, 8) + '...', 'length:', windowToken.length);
    return windowToken;
  }
  
  // 方法2: HTML要素から取得
  const csrfElement = document.getElementById('csrfToken') as HTMLInputElement;
  console.log('CSRF Debug - csrfElement exists:', !!csrfElement);
  if (csrfElement && csrfElement.value) {
    console.log('CSRF Debug - Token from HTML element:', csrfElement.value.substring(0, 8) + '...', 'length:', csrfElement.value.length);
    return csrfElement.value;
  }
  
  // 方法3: メタタグから取得（フォールバック）
  const metaElement = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
  console.log('CSRF Debug - metaElement exists:', !!metaElement);
  if (metaElement && metaElement.content) {
    console.log('CSRF Debug - Token from meta tag:', metaElement.content.substring(0, 8) + '...', 'length:', metaElement.content.length);
    return metaElement.content;
  }
  
  console.error('CSRF Debug - No token found in any location!');
  console.error('CSRF Debug - Available elements:', {
    csrfInput: !!document.getElementById('csrfToken'),
    metaTag: !!document.querySelector('meta[name="csrf-token"]'),
    windowConfig: !!windowConfig
  });
  return '';
}

// タイムアウト付きfetch
function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);

    fetch(url, options)
      .then(response => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// リクエストボディの型定義（現在未使用だが将来の拡張のため保持）
export type RequestBody = string | FormData | URLSearchParams | Blob | ArrayBuffer | null;

// 基本的なHTTPリクエスト関数
export async function request<T = unknown>(
  url: string, 
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 10000
  } = options;

  const requestHeaders: Record<string, string> = {
    ...defaultHeaders,
    ...headers
  };

  // FormDataでない場合のみContent-Typeを設定
  if (body && typeof body === 'string') {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // CSRFトークンを追加
  const csrfToken = getCsrfToken();
  if (csrfToken && method !== 'GET') {
    requestHeaders['X-CSRF-Token'] = csrfToken;
  }

  try {
    const response = await fetchWithTimeout(url, {
      method,
      headers: requestHeaders,
      body,
    }, timeout);

    // レスポンスの Content-Type を確認
    const contentType = response.headers.get('Content-Type') || '';
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // JSONレスポンスの場合
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return data as ApiResponse<T>;
    }

    // テキストレスポンスの場合
    const text = await response.text();
    return {
      success: true,
      data: text as T
    };

  } catch (error) {
    console.error('Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// GET リクエスト
export function get<T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  return request<T>(url, { method: 'GET', headers });
}

// POST リクエスト
export function post<T = unknown>(
  url: string, 
  data?: Record<string, unknown> | FormData | string, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  const body = data instanceof FormData ? data : JSON.stringify(data);
  return request<T>(url, { method: 'POST', body, headers });
}

// PUT リクエスト
export function put<T = unknown>(
  url: string, 
  data?: Record<string, unknown> | FormData | string, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  const body = data instanceof FormData ? data : JSON.stringify(data);
  return request<T>(url, { method: 'PUT', body, headers });
}

// DELETE リクエスト
export function del<T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  return request<T>(url, { method: 'DELETE', headers });
}

// ファイルアップロード専用関数
export async function uploadFile(
  url: string,
  file: File,
  onProgress?: (_progress: number) => void
): Promise<ApiResponse> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    
    // アップロード進捗の監視
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }
    
    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        resolve(response);
      } catch {
        resolve({
          success: xhr.status >= 200 && xhr.status < 300,
          data: xhr.responseText
        });
      }
    };
    
    xhr.onerror = () => {
      resolve({
        success: false,
        error: 'Upload failed'
      });
    };
    
    // CSRFトークンを設定
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    }
    
    xhr.open('POST', url);
    xhr.send(formData);
  });
}

export {};