/**
 * UI関連の型定義
 * Bootstrap、モーダル、アラートなどのUIコンポーネント関連の型
 */

// Bootstrap 5 コンポーネントのインスタンス
export interface BootstrapModal {
  show(): void;
  hide(): void;
  dispose(): void;
}

export interface BootstrapToast {
  show(): void;
  hide(): void;
  dispose(): void;
}

export interface BootstrapTooltip {
  show(): void;
  hide(): void;
  dispose(): void;
}

export interface BootstrapPopover {
  show(): void;
  hide(): void;
  dispose(): void;
}

export interface BootstrapOffcanvas {
  show(): void;
  hide(): void;
  dispose(): void;
}

// Bootstrap アラートの種類
export type AlertType = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

// Bootstrap グローバル宣言の拡張
declare global {
  interface Window {
    bootstrap: {
      Modal: {
        new (_element: Element, _options?: Record<string, unknown>): BootstrapModal;
        getInstance(_element: Element): BootstrapModal | null;
      };
      Toast: {
        new (_element: Element, _options?: Record<string, unknown>): BootstrapToast;
        getInstance(_element: Element): BootstrapToast | null;
      };
      Tooltip: {
        new (_element: Element, _options?: Record<string, unknown>): BootstrapTooltip;
        getInstance(_element: Element): BootstrapTooltip | null;
      };
      Popover: {
        new (_element: Element, _options?: Record<string, unknown>): BootstrapPopover;
        getInstance(_element: Element): BootstrapPopover | null;
      };
      Offcanvas: {
        new (_element: Element, _options?: Record<string, unknown>): BootstrapOffcanvas;
        getInstance(_element: Element): BootstrapOffcanvas | null;
      };
    };
  }
}

export {};