// 共通ディレイヘルパ。環境変数で一括調整可能。
// 基本ディレイ(BASE_DELAY_MS)に対して、操作の複雑度で倍率を掛ける。

const BASE = Number(process.env.E2E_BASE_DELAY_MS ?? 200);

export type Complexity = 'low' | 'medium' | 'high' | number;

function factor(complexity: Complexity): number {
  if (typeof complexity === 'number') return complexity;
  switch (complexity) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3.5;
    default:
      return 1;
  }
}

export async function delay(complexity: Complexity = 'low') {
  const ms = Math.max(0, Math.round(BASE * factor(complexity)));
  await new Promise((r) => setTimeout(r, ms));
}

export function setBaseDelayForDebug(ms: number) {
  // テストから動的に変更したい場合に使用
  (process as any).env.E2E_BASE_DELAY_MS = String(ms);
}

export const baseDelayMs = BASE;

