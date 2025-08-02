/**
 * DOM操作のユーティリティ関数
 * jQueryに替わるネイティブJavaScript実装
 */

// 要素の選択
export function $(selector: string): Element | null {
  return document.querySelector(selector);
}

export function $$(selector: string): NodeListOf<Element> {
  return document.querySelectorAll(selector);
}

// イベントリスナーの追加
export function on(
  element: Element | null,
  event: string,
  handler: EventListener
): void {
  if (element) {
    element.addEventListener(event, handler);
  }
}

// 複数要素にイベントリスナーを追加
export function onAll(
  elements: NodeListOf<Element> | Element[],
  event: string,
  handler: EventListener
): void {
  elements.forEach(element => on(element, event, handler));
}

// DOM準備完了
export function ready(callback: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

// クラス操作
export function addClass(element: Element | null, className: string): void {
  if (element) {
    element.classList.add(className);
  }
}

export function removeClass(element: Element | null, className: string): void {
  if (element) {
    element.classList.remove(className);
  }
}

export function toggleClass(element: Element | null, className: string): void {
  if (element) {
    element.classList.toggle(className);
  }
}

export function hasClass(element: Element | null, className: string): boolean {
  return element ? element.classList.contains(className) : false;
}

// 要素の表示/非表示
export function show(element: HTMLElement | null): void {
  if (element) {
    element.style.display = 'block';
  }
}

export function hide(element: HTMLElement | null): void {
  if (element) {
    element.style.display = 'none';
  }
}

export function toggle(element: HTMLElement | null): void {
  if (element) {
    element.style.display = element.style.display === 'none' ? 'block' : 'none';
  }
}

// フェードエフェクト
export function fadeOut(element: HTMLElement | null, duration: number = 300): Promise<void> {
  return new Promise((resolve) => {
    if (!element) {
      resolve();
      return;
    }

    element.style.transition = `opacity ${duration}ms`;
    element.style.opacity = '0';

    setTimeout(() => {
      element.style.display = 'none';
      element.style.transition = '';
      element.style.opacity = '';
      resolve();
    }, duration);
  });
}

export function fadeIn(element: HTMLElement | null, duration: number = 300): Promise<void> {
  return new Promise((resolve) => {
    if (!element) {
      resolve();
      return;
    }

    element.style.display = 'block';
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms`;

    setTimeout(() => {
      element.style.opacity = '1';
    }, 10);

    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, duration);
  });
}

// 属性操作
export function attr(element: Element | null, name: string, value?: string): string | null | void {
  if (!element) return null;
  
  if (value === undefined) {
    return element.getAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
}

// HTML内容の操作
export function html(element: Element | null, content?: string): string | null | void {
  if (!element) return null;
  
  if (content === undefined) {
    return element.innerHTML;
  } else {
    element.innerHTML = content;
  }
}

// テキスト内容の操作
export function text(element: Element | null, content?: string): string | null | void {
  if (!element) return null;
  
  if (content === undefined) {
    return element.textContent;
  } else {
    element.textContent = content;
  }
}

// 要素の作成
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes?: Record<string, string>,
  content?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  if (content !== undefined) {
    element.textContent = content;
  }
  
  return element;
}

export {};