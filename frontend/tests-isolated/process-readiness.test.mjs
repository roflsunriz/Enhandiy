import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { trackProcess, waitForReady, stopProcess } from './process-readiness.mjs';

function runningProcess(script = 'setInterval(() => {}, 1000)') {
  return trackProcess(spawn(process.execPath, ['-e', script], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }));
}

test('a healthy process can become ready after the old six-second limit', async () => {
  const state = runningProcess();
  const started = Date.now();
  try {
    const result = await waitForReady('delayed fixture', state,
      () => Date.now() - started >= 6500 && { ready: true }, { timeoutMs: 10000 });
    assert.deepEqual(result, { ready: true });
  } finally {
    await stopProcess(state);
  }
});

test('an early process exit includes its code and stderr and cleans up without hanging', async () => {
  const state = runningProcess('console.error("fixture launch failed");process.exit(7)');
  await assert.rejects(waitForReady('failed fixture', state, () => false),
    /process exited \(code=7.*fixture launch failed/s);
  await stopProcess(state);
});

test('a missing executable is a launch error instead of an unhandled event', async () => {
  const state = trackProcess(spawn('enhandiy-nonexistent-test-executable', [], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }));
  await assert.rejects(waitForReady('missing fixture', state, () => false), /ENOENT/);
  await stopProcess(state);
});

test('a readiness failure preserves the last probe error and process diagnostics', async () => {
  const state = runningProcess('console.error("fixture still running");setInterval(() => {}, 1000)');
  try {
    await assert.rejects(waitForReady('unhealthy fixture', state,
      () => { throw new Error('HTTP 500'); }, { timeoutMs: 300 }),
    /readiness timed out.*last probe: HTTP 500.*fixture still running/s);
  } finally {
    await stopProcess(state);
  }
});
