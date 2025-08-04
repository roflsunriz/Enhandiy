/**
 * API関連の型定義
 * APIクライアント、レスポンス形式関連の型
 */

// 内部レスポンス型（PHPからのraw response）
export interface RawApiResponse {
  status: string;
  data?: unknown;
  message?: string;
  error_code?: string;
}

// APIエンドポイント定義
export interface ApiEndpoints {
  files: string;
  folders: string;
  upload: string;
  delete: string;
  share: string;
  auth: string;
}

// HTTPメソッド
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// APIリクエストオプション
export interface ApiRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export {};