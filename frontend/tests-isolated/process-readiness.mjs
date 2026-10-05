const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// 起動失敗をポーリングのタイムアウトと混同せず、終了前に待機を登録する。
export function trackProcess(child) {
  const state = { child, closed: false, error: null, stderr: '', code: null, signal: null };
  child.stderr?.on('data', chunk => { state.stderr = (state.stderr + chunk).slice(-4000); });
  child.on('error', error => { state.error = error; });
  state.completion = new Promise(resolve => child.once('close', (code, signal) => {
    Object.assign(state, { closed: true, code, signal });
    resolve();
  }));
  return state;
}

export async function waitForReady(name, state, probe, { timeoutMs = 30000, intervalMs = 50 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  do {
    if (state.error || state.closed) break;
    try {
      const result = await probe();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    if (Date.now() >= deadline) break;
    await pause(intervalMs);
  } while (Date.now() < deadline);
  const reason = state.error?.message || (state.closed
    ? `process exited (code=${state.code}, signal=${state.signal})`
    : `readiness timed out after ${timeoutMs}ms`);
  throw new Error(`${name}: ${reason}; last probe: ${lastError?.message || 'not ready'}\n${state.stderr}`);
}

export async function stopProcess(state) {
  if (!state.closed) state.child.kill();
  await state.completion;
}
