/**
 * Bootstrap 5 JavaScript ユーティリティ
 * jQueryに依存しないBootstrapコンポーネントの操作
 */

import { AlertType } from '../types/ui';

/**
 * モーダルの表示
 */
export function showModal(modalId: string): void {
  const modalElement = document.getElementById(modalId);
  if (modalElement && window.bootstrap) {
    const modal = new window.bootstrap.Modal(modalElement);
    modal.show();
  }
}

/**
 * モーダルの非表示
 */
export function hideModal(modalId: string): void {
  const modalElement = document.getElementById(modalId);
  if (modalElement && window.bootstrap) {
    const modal = window.bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
  }
}

/**
 * トーストの表示
 */
export function showToast(toastId: string): void {
  const toastElement = document.getElementById(toastId);
  if (toastElement && window.bootstrap) {
    const toast = new window.bootstrap.Toast(toastElement);
    toast.show();
  }
}

/**
 * ツールチップの初期化
 */
export function initializeTooltips(): void {
  if (window.bootstrap) {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new window.bootstrap.Tooltip(tooltipTriggerEl));
  }
}

/**
 * ポップオーバーの初期化
 */
export function initializePopovers(): void {
  if (window.bootstrap) {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    [...popoverTriggerList].map(popoverTriggerEl => new window.bootstrap.Popover(popoverTriggerEl));
  }
}

/**
 * アラートの作成と表示
 */
export function createAlert(message: string, type: AlertType = 'info', dismissible: boolean = true): HTMLElement {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}${dismissible ? ' alert-dismissible fade show' : ''}`;
  alertDiv.setAttribute('role', 'alert');
  
  alertDiv.innerHTML = `
    ${message}
    ${dismissible ? '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' : ''}
  `;
  
  return alertDiv;
}

/**
 * オフキャンバスの表示
 */
export function showOffcanvas(offcanvasId: string): void {
  const offcanvasElement = document.getElementById(offcanvasId);
  if (offcanvasElement && window.bootstrap) {
    const offcanvas = new window.bootstrap.Offcanvas(offcanvasElement);
    offcanvas.show();
  }
}

/**
 * オフキャンバスの非表示
 */
export function hideOffcanvas(offcanvasId: string): void {
  const offcanvasElement = document.getElementById(offcanvasId);
  if (offcanvasElement && window.bootstrap) {
    const offcanvas = window.bootstrap.Offcanvas.getInstance(offcanvasElement);
    if (offcanvas) {
      offcanvas.hide();
    }
  }
}

/**
 * Bootstrap初期化関数
 */
export function initializeBootstrap(): void {
  // すべてのBootstrapコンポーネントを初期化
  initializeTooltips();
  initializePopovers();
}

export {};