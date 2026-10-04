import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const root = mkdtempSync(join(tmpdir(), 'enhandiy-comment-test-'));
for (const directory of ['backend/api', 'backend/config', 'backend/core', 'db', 'sessions', 'logs', 'data']) {
  mkdirSync(join(root, directory), { recursive: true });
}
writeFileSync(join(root, 'isolated-test'), 'fixture');
writeFileSync(join(root, 'backend/core/utils.php'), `<?php require_once ${JSON.stringify(join(source, 'backend/core/utils.php').replaceAll('\\', '/'))};`);
writeFileSync(join(root, 'backend/config/config.php'), '<?php class config { public function index() { return $GLOBALS["fixtureConfig"]; } }');
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const phpBinary = process.env.PHP_BINARY || execFileSync('php', ['-r', 'echo PHP_BINARY;'], { encoding: 'utf8', windowsHide: true }).trim();
const php = spawn(phpBinary, ['-S', `127.0.0.1:${port}`,
  join(source, 'infrastructure/scripts/fixtures/comment-api.php')], {
  cwd: join(root, 'backend/api'), windowsHide: true,
  env: { ...process.env, ENHANDIY_TEST_ROOT: root, ENHANDIY_TEST_SOURCE: source },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let log = '';
php.stderr.on('data', chunk => { log += chunk; });
const base = `http://127.0.0.1:${port}`;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;
try {
  let session;
  for (let i = 0; i < 80; i++) {
    try { session = await fetch(base + '/session'); break; } catch { await pause(50); }
  }
  assert.ok(session, 'isolated PHP server must start');
  const cookie = session.headers.get('set-cookie').split(';')[0];
  const { csrf } = await session.json();
  const ui = { Cookie: cookie, 'X-CSRF-Token': csrf };
  const api = permission => ({ Authorization: `Bearer fixture-${permission}` });
  const state = async () => (await fetch(base + '/state')).json();
  async function patch(body, headers = ui, suffix = '', id = 1, expected = 200, code) {
    const before = await state();
    const response = await fetch(`${base}/api/files/${id}${suffix}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    const json = await response.json();
    assert.equal(response.status, expected, JSON.stringify(json));
    if (code) assert.equal(json.error_code || json.error?.code, code);
    if (expected !== 200) assert.deepEqual(await state(), before, 'rejected request must not change files or history');
    checks++;
    return json;
  }
  await patch({ comment: 'blocked' }, {}, '', 1, 401, 'API_KEY_MISSING');
  await patch({ comment: 'blocked' }, { Cookie: cookie, 'X-CSRF-Token': 'invalid' }, '', 1, 401);
  await patch({ comment: 'blocked' }, api('read'), '', 1, 403, 'PERMISSION_DENIED');
  await patch({ comment: 'blocked' }, ui, '', 1, 400, 'REPLACE_KEY_REQUIRED');
  await patch({ comment: 'blocked', replace_key: 'wrong' }, ui, '', 1, 403, 'INVALID_REPLACE_KEY');
  await patch({ comment: 'blocked', master_key: 'wrong' }, ui, '', 1, 400, 'REPLACE_KEY_REQUIRED');
  await patch({ comment: 'blocked', replace_key: ['bad'] }, ui, '', 1, 400);
  await patch({ comment: 'blocked', master_key: ['bad'] }, ui, '', 1, 400);
  await patch({ comment: 'allowed-both', master_key: 'wrong', replace_key: 'fixture-replace-1' });
  await patch({ comment: 'allowed', replace_key: 'fixture-replace-1' });
  assert.equal((await state()).files[0].comment, 'allowed');
  assert.equal((await state()).files[1].comment, 'initial-2');
  await patch({ comment: 'legacy', replace_key: 'fixture-replace-2' }, ui, '', 2);
  await patch({ comment: 'master', master_key: 'fixture-master' });
  await patch({ comment: 'no-key', replace_key: 'wrong' }, ui, '', 3, 400, 'NO_REPLACE_KEY');
  await patch({ comment: 'master-no-key', master_key: 'fixture-master' }, ui, '', 3);
  await patch({ comment: 'api-write' }, api('write'));
  await patch({ comment: 'blocked', replace_key: 'fixture-replace-1' }, ui, '?admin_only=1', 1, 403, 'ADMIN_REQUIRED');
  await patch({ comment: 'admin-master', master_key: 'fixture-master' }, ui, '?admin_only=1');
  await patch({ comment: 'blocked' }, api('write'), '?admin_only=1', 1, 403, 'ADMIN_REQUIRED');
  await patch({ comment: 'api-admin' }, api('admin'), '?admin_only=1');
  await patch({ comment: 'blocked', master_key: 'fixture-master' }, ui, '?disabled=1', 1, 403, 'COMMENT_EDIT_DISABLED');
  for (const body of ['null', '[]', '{', JSON.stringify({ comment: null }), JSON.stringify({ comment: [] }), '{}']) {
    await patch(body, api('write'), '', 1, 400, 'BAD_REQUEST');
  }
  await patch({ comment: 'blocked' }, api('write'), '', 0, 400, 'FILE_ID_REQUIRED');
  await patch({ comment: 'blocked' }, api('write'), '', '99999999999999999999999999999', 400, 'FILE_ID_REQUIRED');
  await patch({ comment: 'blocked' }, api('write'), '', 999, 404, 'FILE_NOT_FOUND');
  await patch({ comment: 'a'.repeat(33) }, api('write'), '', 1, 400, 'COMMENT_TOO_LONG');
  await patch({ comment: '&'.repeat(32) }, api('write'));
  assert.equal((await state()).files[0].comment, '&amp;'.repeat(32));
  const unchanged = await state();
  await patch({ comment: '&'.repeat(32) }, api('write'));
  assert.equal((await state()).history.length, unchanged.history.length);
  await patch({ comment: '', replace_key: 'fixture-replace-1' });
  await patch({ folder_id: 1 }, ui);
  assert.equal((await state()).files[0].folder_id, 1);
  await patch({ folder_id: null, comment: 'blocked', replace_key: 'wrong' }, ui, '', 1, 403);
  for (const [headers, code] of [[{}, 'API_KEY_MISSING'], [ui, 'DELETE_KEY_VALIDATION_REQUIRED'],
    [api('write'), 'PERMISSION_DENIED']]) {
    const before = await state();
    const response = await fetch(base + '/api/files/1', { method: 'DELETE', headers });
    const json = await response.json();
    assert.equal(response.status, code === 'API_KEY_MISSING' ? 401 : 403);
    assert.equal(json.error_code || json.error?.code, code);
    assert.deepEqual(await state(), before, 'delete authorization remains unchanged');
    checks++;
  }
  const final = await state();
  assert.equal(final.files.length, 3);
  for (const [index, file] of final.files.entries()) {
    assert.equal(file.size, 3);
    assert.equal(file.origin_file_name, `file-${index + 1}.txt`);
    assert.equal(file.stored_file_name, `stored-${index + 1}.txt`);
  }
  async function legacy(fields, expected, code, suffix = '') {
    const before = await state();
    const response = await fetch(base + '/legacy' + suffix, {
      method: 'POST', headers: { Cookie: cookie },
      body: new URLSearchParams({ csrf_token: csrf, file_id: '1', comment: 'compatibility', ...fields }),
    });
    const json = await response.json();
    assert.equal(response.status, expected, JSON.stringify(json));
    if (code) assert.equal(json.error_code, code);
    if (expected !== 200) assert.deepEqual(await state(), before);
    checks++;
  }
  await legacy({ replace_key: 'fixture-replace-1' }, 200);
  await legacy({ master_key: 'fixture-master' }, 200);
  await legacy({ replace_key: 'wrong' }, 403, 'INVALID_REPLACE_KEY');
  await legacy({}, 400, 'REPLACE_KEY_REQUIRED');
  for (const id of ['', '0', '-1', '1abc']) {
    await legacy({ file_id: id, master_key: 'fixture-master' }, 400, 'FILE_ID_REQUIRED');
  }
  await legacy({ csrf_token: 'invalid', master_key: 'fixture-master' }, 403, 'CSRF_TOKEN_INVALID');
  await legacy({ replace_key: 'fixture-replace-1' }, 403, 'ADMIN_REQUIRED', '?admin_only=1');
  await legacy({ master_key: 'fixture-master' }, 200, undefined, '?admin_only=1');
  await legacy({ master_key: 'fixture-master' }, 403, 'COMMENT_EDIT_DISABLED', '?disabled=1');
  console.log(`PASS: ${checks} isolated REST requests; middleware, UI/API authorization, validation, history and folder/file preservation.`);
} catch (error) {
  console.error(error);
  console.error(log.replace(/127\.0\.0\.1:\d+/g, 'localhost'));
  process.exitCode = 1;
} finally {
  php.kill();
  await new Promise(resolve => php.once('close', resolve));
  assert.equal(dirname(resolve(root)), resolve(tmpdir()), 'cleanup stays inside the temporary directory');
  rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
