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
  signal?: AbortSignal;
}

// デフォルトヘッダー
const defaultHeaders: Record<string, string> = {
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

// CSRFトークンを取得（複数の方法を試行）
export function getCsrfToken(): string {
  // 方法1: windowオブジェクトから取得
  const windowConfig = (window as unknown as { config?: { csrf_token?: string } }).config;
  const windowToken = windowConfig?.csrf_token;
  if (windowToken) {
    return windowToken;
  }
  
  // 方法2: HTML要素から取得
  const csrfElement = document.getElementById('csrfToken') as HTMLInputElement;
  if (csrfElement && csrfElement.value) {
    return csrfElement.value;
  }
  
  // 方法3: メタタグから取得（フォールバック）
  const metaElement = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
  if (metaElement && metaElement.content) {
    return metaElement.content;
  }
  
  return '';
}

// タイムアウト付きfetch。時間切れ後もサーバー処理だけ継続する不整合を防ぐため通信も中止する。
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abortFromExternalSignal = (): void => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) {
    abortFromExternalSignal();
  } else {
    externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true });
  }

  const timer = window.setTimeout(() => {
    controller.abort(new DOMException('Request timeout', 'TimeoutError'));
  }, timeout);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abortFromExternalSignal);
  }
}

interface RawApiResponse<T> {
  status?: string;
  success?: boolean;
  message?: string;
  data?: T;
  error_code?: string;
  hint?: string;
  error_id?: string;
  error?: string | { code?: string; message?: string };
}

function normalizeJsonResponse<T>(data: unknown, httpStatus: number): ApiResponse<T> {
  if (typeof data !== 'object' || data === null) {
    return { success: httpStatus >= 200 && httpStatus < 300, data: data as T };
  }

  const raw = data as RawApiResponse<T>;
  const isEnvelope = 'status' in raw
    || 'success' in raw
    || 'error' in raw
    || 'error_code' in raw
    || 'message' in raw;
  if (!isEnvelope) {
    if (httpStatus >= 200 && httpStatus < 300) {
      // 標準レスポンス導入前のAPIとの互換性を維持する。
      return raw as ApiResponse<T>;
    }
    return { success: false, error: `HTTP_${httpStatus}`, message: `HTTP ${httpStatus}` };
  }

  const succeeded = raw.status === 'success' || raw.success === true;
  if (succeeded) {
    return { success: true, data: raw.data as T, message: raw.message };
  }

  const nestedError = typeof raw.error === 'object' && raw.error !== null ? raw.error : undefined;
  const errorCode = raw.error_code
    || nestedError?.code
    || (typeof raw.error === 'string' ? raw.error : undefined)
    || `HTTP_${httpStatus}`;
  const message = raw.message || nestedError?.message || (typeof raw.error === 'string' ? raw.error : undefined);
  const composedMessage = [message, raw.hint, raw.error_id ? `(ID: ${raw.error_id})` : undefined]
    .filter(Boolean)
    .join(' ');

  return {
    success: false,
    error: errorCode,
    message: composedMessage || `HTTP ${httpStatus}`
  };
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
    timeout = body instanceof FormData ? 300000 : 30000,
    signal
  } = options;

  const requestHeaders: Record<string, string> = {
    ...defaultHeaders,
    ...headers
  };

  // FormDataでない場合のみContent-Typeを設定
  if (body && typeof body === 'string') {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // CSRFトークンを常時追加（UIリクエスト識別のためGETでも付与）
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    requestHeaders['X-CSRF-Token'] = csrfToken;
  }

  try {
    const response = await fetchWithTimeout(url, {
      method,
      headers: requestHeaders,
      body,
      signal,
    }, timeout);

    // レスポンスの Content-Type を確認
    const contentType = response.headers.get('Content-Type') || '';
    
    // JSONレスポンスの場合
    if (contentType.includes('application/json')) {
      const data: unknown = await response.json();
      return normalizeJsonResponse<T>(data, response.status);
    }

    // テキストレスポンスの場合
    const text = await response.text();
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP_${response.status}`,
        message: text || `HTTP ${response.status}: ${response.statusText}`
      };
    }
    return {
      success: true,
      data: text as T
    };

  } catch (error) {
    console.error('Request failed:', error);
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
    const isAborted = error instanceof DOMException && error.name === 'AbortError';
    return {
      success: false,
      error: isTimeout ? 'REQUEST_TIMEOUT' : (isAborted ? 'REQUEST_ABORTED' : 'NETWORK_ERROR'),
      message: isTimeout
        ? '通信がタイムアウトしました。サーバーの状態を確認してから再試行してください。'
        : (isAborted ? '通信が中止されました。' : (error instanceof Error ? error.message : 'ネットワークエラーが発生しました。'))
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
