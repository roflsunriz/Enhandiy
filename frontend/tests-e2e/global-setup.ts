import type { FullConfig } from '@playwright/test';
import { cleanupE2ETestData } from './helpers/cleanup-test-data';

export default async function globalSetup(config: FullConfig): Promise<() => Promise<void>> {
  await cleanupE2ETestData(config, '開始前');

  return async () => {
    await cleanupE2ETestData(config, '終了後');
  };
}
