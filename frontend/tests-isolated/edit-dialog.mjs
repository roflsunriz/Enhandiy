import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

// 実際のPHPテンプレート、配布JS、Bootstrap、FileManagerをローカルだけで操作する。
const source = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const root = mkdtempSync(join(tmpdir(), 'enhandiy-dialog-test-'));
for (const dir of ['backend/api', 'db', 'sessions', 'logs', 'data', 'chrome']) {
  mkdirSync(join(root, dir), { recursive: true });
}
writeFileSync(join(root, 'isolated-test'), 'fixture');
async function port() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const result = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return result;
}
const httpPort = await port();
const debugPort = await port();
const base = `http://127.0.0.1:${httpPort}`;
const phpBinary = process.env.PHP_BINARY || execFileSync('php', ['-r', 'echo PHP_BINARY;'], { encoding: 'utf8', windowsHide: true }).trim();
const php = spawn(phpBinary, ['-S', `127.0.0.1:${httpPort}`,
  join(source, 'infrastructure/scripts/fixtures/comment-api.php')], {
  cwd: join(root, 'backend/api'), windowsHide: true,
  env: { ...process.env, ENHANDIY_TEST_ROOT: root, ENHANDIY_TEST_SOURCE: source },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let serverErrors = '';
php.stderr.on('data', chunk => { serverErrors += chunk; });
const executable = process.env.CHROME_BINARY || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome');
const chrome = spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--no-sandbox',
  `--user-data-dir=${join(root, 'chrome')}`, `--remote-debugging-port=${debugPort}`, 'about:blank'],
{ windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(base + '/session');
      target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(item => item.type === 'page');
      if (target) break;
    } catch { /* 起動待ち */ }
    await pause(50);
  }
  assert.ok(target, 'headless Chrome must start');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let nextId = 0;
  const pending = new Map();
  const requests = [];
  const browserErrors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const completion = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) completion.reject(new Error(message.error.message));
      else completion.resolve(message.result);
    } else if (message.method === 'Network.requestWillBeSent') {
      const request = message.params.request;
      if (['PATCH', 'POST'].includes(request.method)) requests.push({ method: request.method, url: request.url });
    } else if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
  });
  function cdp(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
    return result.result.value;
  }
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await pause(50);
    }
    throw new Error('Timed out: ' + expression);
  }
  await cdp('Network.enable');
  await cdp('Runtime.enable');
  await cdp('Page.navigate', { url: base + '/page' });
  try {
    await wait('typeof window.replaceFile === "function" && !!window.fileManagerInstance');
  } catch (error) {
    console.error(browserErrors);
    console.error(await evaluate('({url:location.pathname,ready:document.readyState,edit:typeof window.replaceFile,manager:!!window.fileManagerInstance,scripts:[...document.scripts].map(s=>s.src),text:document.body.textContent.slice(0,80)})'));
    throw error;
  }
  // 一覧の再取得だけ隔離する。保存・認証・差し替えは実サーバー処理を通す。
  await evaluate('window.fileManagerInstance.refreshFromServer = async () => {};');
  await evaluate('window.fixtureModalShown=false;document.querySelector("#editModal").addEventListener("shown.bs.modal",()=>window.fixtureModalShown=true);document.querySelector("#editModal").addEventListener("hidden.bs.modal",()=>window.fixtureModalShown=false);');
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const ids = () => evaluate('[document.querySelector("#editFileId").value,document.querySelector("#replaceFileId").value]');
  const fill = (selector, value) => evaluate(`document.querySelector(${JSON.stringify(selector)}).value=${JSON.stringify(value)}`);
  const shown = () => wait('window.fixtureModalShown === true');
  async function cancel() {
    await click('#editModal [data-bs-dismiss="modal"]');
    await wait('!document.querySelector("#editFileId").value && !document.querySelector("#replaceFileId").value');
  }
  async function save(id, comment) {
    await click('#comment-tab');
    await fill('#editComment', comment);
    await fill('#editReplaceKeyInput', `fixture-replace-${id}`);
    const count = requests.length;
    await click('#saveCommentBtn');
    try {
      await wait('!document.querySelector("#editFileId").value');
    } catch (error) {
      console.error(await evaluate('document.querySelector(".status-message__text")?.textContent'));
      console.error(requests.slice(count));
      throw error;
    }
    assert.equal(requests.length, count + 1);
    assert.equal(new URL(requests.at(-1).url).searchParams.get('path'), `/api/files/${id}`);
    const files = (await (await fetch(base + '/state')).json()).files;
    assert.equal(files[id - 1].comment, comment);
  }

  // 差し替え入口からコメントタブへ切り替える。初回のID欠落を防ぐ。
  await click('.file-action-btn--replace[data-file-id="1"]');
  await shown();
  assert.deepEqual(await ids(), ['1', '1']);
  assert.equal(await evaluate('document.querySelector("#editComment").value'), 'initial-1');
  await save(1, 'replacement-entry');

  // 編集後に別ファイルの差し替えへ移る。古いIDや認証値を再利用しない。
  await click('.file-action-btn--edit[data-file-id="1"]');
  await shown();
  await fill('#editReplaceKeyInput', 'fixture-replace-1');
  await cancel();
  await click('.file-action-btn--replace[data-file-id="2"]');
  await shown();
  assert.deepEqual(await ids(), ['2', '2']);
  assert.equal(await evaluate('document.querySelector("#editReplaceKeyInput").value'), '');
  await save(2, 'second-file');
  assert.equal((await (await fetch(base + '/state')).json()).files[0].comment, 'replacement-entry');

  // 通常編集・タブ往復・キャンセル・再表示。
  await click('.file-action-btn--edit[data-file-id="1"]');
  await shown();
  await click('#replace-tab');
  await click('#comment-tab');
  assert.deepEqual(await ids(), ['1', '1']);
  await cancel();
  await evaluate('window.editComment("2", "file-2.txt", "second-file")');
  await shown();
  assert.deepEqual(await ids(), ['2', '2']);
  await cancel();

  // 差し替えのPOSTも同じファイルIDを保持し、コメントと別ファイルを保全する。
  await click('.file-action-btn--replace[data-file-id="1"]');
  await shown();
  await fill('#modalReplaceKeyInput', 'fixture-replace-1');
  await evaluate('const transfer=new DataTransfer();transfer.items.add(new File(["replacement-bytes"],"replacement.txt",{type:"text/plain"}));document.querySelector("#replaceFileInput").files=transfer.files;');
  await click('#replaceFileBtn');
  try {
    await wait('!document.querySelector("#replaceFileId").value');
  } catch (error) {
    console.error(await evaluate('[...document.querySelectorAll(".status-message")].map(el=>el.textContent)'));
    throw error;
  }
  const files = (await (await fetch(base + '/state')).json()).files;
  assert.equal(files[0].origin_file_name, 'replacement.txt');
  assert.equal(files[0].comment, 'replacement-entry');
  assert.equal(files[1].comment, 'second-file');
  assert.equal(new URL(requests.at(-1).url).searchParams.get('path'), '/api/files/1/replace');

  // 無効IDの保存を拒否し、HTTPを発行しない。
  await click('.file-action-btn--edit[data-file-id="1"]');
  await shown();
  await fill('#editFileId', '1abc');
  const count = requests.length;
  await click('#saveCommentBtn');
  await pause(150);
  assert.equal(requests.length, count);
  console.log('PASS: real Chrome UI; replacement/edit entries, cross-file edits, tabs, cancel/reopen, validation and replacement POST.');
} catch (error) {
  console.error(error);
  console.error(serverErrors.split('\n').filter(line => /Fatal|Warning|Error|Stack|#\d/.test(line)).join('\n'));
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill();
  php.kill();
  await Promise.all([new Promise(resolve => chrome.once('close', resolve)), new Promise(resolve => php.once('close', resolve))]);
  assert.equal(dirname(resolve(root)), resolve(tmpdir()), 'cleanup stays inside the temporary directory');
  rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
