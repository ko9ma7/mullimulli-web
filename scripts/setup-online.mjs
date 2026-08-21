import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import process from 'node:process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const workerDir = join(root, 'worker');
const wranglerToml = join(workerDir, 'wrangler.toml');
const schemaFile = join(workerDir, 'schema.sql');
const configFile = join(root, 'docs', 'config.js');
const stateFile = join(root, '.setup-online-state.json');
const DB_NAME = 'mullimulli-db';
const WORKER_NAME = 'mullimulli-api';
const VERSION = '3.6.0';
const DEFAULT_GITHUB_REPO = 'ko9ma7/mullimulli-web';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function line(char = '─', n = 66) { console.log(char.repeat(n)); }
function step(n, text) { console.log(`\n[${n}] ${text}`); line(); }
function ok(text) { console.log(`✓ ${text}`); }
function info(text) { console.log(`  ${text}`); }
function warn(text) { console.log(`! ${text}`); }
function fail(text) { console.error(`\n✕ ${text}`); }

function commandExists(command) {
  const probe = process.platform === 'win32' ? ['where', [command]] : ['which', [command]];
  const r = spawnSync(probe[0], probe[1], { stdio: 'ignore', shell: false });
  return r.status === 0;
}

function run(command, args = [], opts = {}) {
  const r = spawnSync(command, args, {
    cwd: opts.cwd || root,
    encoding: 'utf8',
    shell: opts.shell ?? false,
    stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : (opts.input !== undefined ? ['pipe', 'inherit', 'inherit'] : 'inherit'),
    input: opts.input,
    env: { ...process.env, ...(opts.env || {}) },
  });
  if (r.error) throw r.error;
  if (r.status !== 0 && !opts.allowFailure) {
    const detail = opts.capture ? `${r.stderr || r.stdout || ''}`.trim() : '';
    throw new Error(`${command} 실행 실패 (exit ${r.status})${detail ? `\n${detail}` : ''}`);
  }
  return r;
}

function runCapture(command, args = [], opts = {}) {
  return run(command, args, { ...opts, capture: true });
}

const wranglerPs = join(root, 'scripts', 'run-wrangler.ps1');
let cloudflareCommandEnv = {};

function wranglerProcess(args) {
  if (process.platform === 'win32') {
    return {
      command: 'powershell.exe',
      args: ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', wranglerPs, ...args],
    };
  }
  return { command: 'npx', args: ['--yes', 'wrangler@latest', ...args] };
}

function wrangler(args, opts = {}) {
  const { useCloudflareEnv = true, env = {}, ...rest } = opts;
  const proc = wranglerProcess(args);
  return run(proc.command, proc.args, {
    cwd: workerDir,
    shell: false,
    ...rest,
    env: { ...(useCloudflareEnv ? cloudflareCommandEnv : {}), ...env },
  });
}
function wranglerCapture(args, opts = {}) {
  return wrangler(args, { ...opts, capture: true });
}

function extractAuthToken(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (typeof parsed.token === 'string' && parsed.token.trim()) return parsed.token.trim();
  if (typeof parsed.result?.token === 'string' && parsed.result.token.trim()) return parsed.result.token.trim();
  return null;
}

function prepareCloudflareCommandAuth() {
  // Wrangler 4.x intentionally requires CLOUDFLARE_API_TOKEN when stdout/stdin
  // are piped for machine-readable commands such as `d1 list --json`.
  // `wrangler auth token --json` safely retrieves the already-authorized local
  // OAuth session token, so we pass it only to this setup process' child commands.
  // It is never written to the project, GitHub, or a .env file.
  const auth = wranglerCapture(['auth', 'token', '--json'], {
    allowFailure: true,
    useCloudflareEnv: false,
  });
  if (auth.status !== 0) return false;
  const parsed = parseJsonLoose(auth.stdout);
  const token = extractAuthToken(parsed);
  if (!token) return false;
  cloudflareCommandEnv = { CLOUDFLARE_API_TOKEN: token };
  ok('Cloudflare OAuth 세션을 자동 설정 명령에 연결했습니다.');
  return true;
}

function parseJsonLoose(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  try { return JSON.parse(t); } catch {}
  const starts = [t.indexOf('['), t.indexOf('{')].filter(i => i >= 0).sort((a,b)=>a-b);
  for (const s of starts) {
    for (const endChar of [']', '}']) {
      const e = t.lastIndexOf(endChar);
      if (e > s) {
        try { return JSON.parse(t.slice(s, e + 1)); } catch {}
      }
    }
  }
  return null;
}

function dbItems(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.result)) return parsed.result;
  if (Array.isArray(parsed.databases)) return parsed.databases;
  return [];
}

function readState() {
  try { return JSON.parse(readFileSync(stateFile, 'utf8')); } catch { return {}; }
}
function saveState(next) {
  const prev = readState();
  writeFileSync(stateFile, JSON.stringify({ ...prev, ...next, updatedAt: new Date().toISOString() }, null, 2) + '\n');
}

function parseGitHubRepo(remote) {
  const s = String(remote || '').trim().replace(/\\/g, '/');
  const m = s.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  return m ? `${m[1]}/${m[2]}` : null;
}

function detectRepoFromGit() {
  if (!commandExists('git')) return null;
  const r = runCapture('git', ['remote', 'get-url', 'origin'], { cwd: root, allowFailure: true });
  return r.status === 0 ? parseGitHubRepo(r.stdout) : null;
}

async function getRepo() {
  const state = readState();
  const gitRepo = detectRepoFromGit();
  if (gitRepo) return gitRepo;
  if (state.githubRepo && /^[^/\s]+\/[^/\s]+$/.test(state.githubRepo)) return state.githubRepo;

  info(`Git 원격 저장소를 찾지 못해 기본 저장소 ${DEFAULT_GITHUB_REPO}를 사용합니다.`);
  return DEFAULT_GITHUB_REPO;
}

function patchWrangler(databaseId, owner) {
  let text = readFileSync(wranglerToml, 'utf8');
  text = text.replace(/^database_id\s*=\s*"[^"]*"/m, `database_id = "${databaseId}"`);
  const origins = `http://localhost:8080,http://127.0.0.1:8080,https://${owner}.github.io`;
  if (/^ALLOWED_ORIGINS\s*=/m.test(text)) {
    text = text.replace(/^ALLOWED_ORIGINS\s*=\s*"[^"]*"/m, `ALLOWED_ORIGINS = "${origins}"`);
  } else {
    text += `\n[vars]\nALLOWED_ORIGINS = "${origins}"\n`;
  }
  writeFileSync(wranglerToml, text);
}

function patchLocalConfig(workerUrl, repo) {
  if (!existsSync(configFile)) return;
  const [owner, name] = repo.split('/');
  let text = readFileSync(configFile, 'utf8');
  text = text.replace(/apiBaseUrl:\s*'[^']*'/, `apiBaseUrl: '${workerUrl}'`);
  text = text.replace(/demoTimeAcceleration:\s*\d+(?:\.\d+)?/, 'demoTimeAcceleration: 1');
  text = text.replace(/buildVersion:\s*'[^']*'/, `buildVersion: '${VERSION}'`);
  text = text.replace(/siteUrl:\s*'[^']*'/, `siteUrl: 'https://${owner}.github.io/${name}/'`);
  writeFileSync(configFile, text);
}

function extractColumnNames(parsed) {
  const names = new Set();
  function walk(v) {
    if (!v) return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object') {
      if (typeof v.name === 'string' && ('cid' in v || 'type' in v || 'notnull' in v)) names.add(v.name);
      Object.values(v).forEach(walk);
    }
  }
  walk(parsed);
  return names;
}

async function ensureDatabase() {
  let list = wranglerCapture(['d1', 'list', '--json']);
  let items = dbItems(parseJsonLoose(list.stdout));
  let db = items.find(x => x?.name === DB_NAME || x?.database_name === DB_NAME);
  if (!db) {
    info(`${DB_NAME}가 없어 자동 생성합니다.`);
    wrangler(['d1', 'create', DB_NAME, '--location', 'apac']);
    list = wranglerCapture(['d1', 'list', '--json']);
    items = dbItems(parseJsonLoose(list.stdout));
    db = items.find(x => x?.name === DB_NAME || x?.database_name === DB_NAME);
  }
  const id = db?.uuid || db?.id || db?.database_id;
  if (!id) throw new Error('D1 database_id를 자동으로 읽지 못했습니다.');
  ok(`D1 연결: ${DB_NAME} (${id})`);
  return id;
}

function ensureSchema() {
  let columns = new Set();
  const probe = wranglerCapture(['d1', 'execute', DB_NAME, '--remote', '--command', 'PRAGMA table_info(users);', '--json', '--yes'], { allowFailure: true });
  if (probe.status === 0) columns = extractColumnNames(parseJsonLoose(probe.stdout));

  if (columns.size === 0) {
    info('처음 사용하는 DB입니다. 전체 스키마를 생성합니다.');
    wrangler(['d1', 'execute', DB_NAME, '--remote', '--file', './schema.sql', '--yes']);
    return;
  }

  const additions = [
    ['bio', "ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';"],
    ['discoverable', 'ALTER TABLE users ADD COLUMN discoverable INTEGER NOT NULL DEFAULT 1;'],
    ['show_location_age', 'ALTER TABLE users ADD COLUMN show_location_age INTEGER NOT NULL DEFAULT 1;'],
    ['allow_friend_add', 'ALTER TABLE users ADD COLUMN allow_friend_add INTEGER NOT NULL DEFAULT 1;'],
  ];
  for (const [name, sql] of additions) {
    if (!columns.has(name)) {
      info(`기존 DB에 ${name} 필드를 추가합니다.`);
      wrangler(['d1', 'execute', DB_NAME, '--remote', '--command', sql, '--yes']);
    }
  }
  // 누락된 테이블/인덱스는 CREATE IF NOT EXISTS로 보완됩니다.
  wrangler(['d1', 'execute', DB_NAME, '--remote', '--file', './schema.sql', '--yes']);
  ok('D1 스키마 확인 완료');
}

function hasMessageSecret() {
  const r = wranglerCapture(['secret', 'list', '--format', 'json'], { allowFailure: true });
  if (r.status !== 0) return false;
  const parsed = parseJsonLoose(r.stdout);
  if (Array.isArray(parsed)) return parsed.some(x => x?.name === 'MESSAGE_KEY');
  if (Array.isArray(parsed?.result)) return parsed.result.some(x => x?.name === 'MESSAGE_KEY');
  return String(r.stdout).includes('MESSAGE_KEY');
}

function ensureSecret() {
  if (hasMessageSecret()) {
    ok('MESSAGE_KEY가 이미 있어 기존 암호화 키를 유지합니다.');
    return;
  }
  const key = randomBytes(32).toString('base64');
  info('메시지 암호화 키를 자동 생성해 Cloudflare Secret에 저장합니다.');
  try {
    wrangler(['secret', 'put', 'MESSAGE_KEY'], { input: key + '\n' });
  } catch {
    info('Worker가 아직 처음 생성되지 않아 1회 사전 배포 후 Secret을 저장합니다.');
    wrangler(['deploy']);
    wrangler(['secret', 'put', 'MESSAGE_KEY'], { input: key + '\n' });
  }
  ok('MESSAGE_KEY 저장 완료');
}

function deployWorker() {
  const r = wranglerCapture(['deploy']);
  process.stdout.write(r.stdout || '');
  if (r.stderr) process.stderr.write(r.stderr);
  const combined = `${r.stdout || ''}\n${r.stderr || ''}`;
  const urls = combined.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\/?/gi) || [];
  return urls.length ? urls[urls.length - 1].replace(/\/$/, '') : null;
}

async function askWorkerUrl(fallback) {
  if (fallback) return fallback;
  const state = readState();
  if (state.workerUrl) return state.workerUrl;
  warn('Worker 주소를 출력에서 자동으로 찾지 못했습니다.');
  info('Cloudflare에 표시된 *.workers.dev 주소를 한 번 붙여넣어 주세요.');
  while (true) {
    const v = (await rl.question('Worker URL: ')).trim().replace(/\/$/, '');
    if (/^https:\/\/.+\.workers\.dev$/i.test(v)) return v;
    warn('예: https://mullimulli-api.xxxxx.workers.dev');
  }
}

async function checkHealth(url) {
  for (let i = 0; i < 8; i++) {
    try {
      const res = await fetch(`${url}/api/health`, { cache: 'no-store' });
      const text = await res.text();
      if (res.ok) { ok(`Worker 응답 정상: ${text}`); return true; }
    } catch {}
    await new Promise(r => setTimeout(r, 1500));
  }
  warn('Worker 배포는 끝났지만 health 응답 확인이 늦어지고 있습니다. GitHub 연결은 계속 진행합니다.');
  return false;
}

function gh(args, opts = {}) {
  const cmd = process.platform === 'win32' ? 'gh.exe' : 'gh';
  return run(cmd, args, { cwd: root, ...opts });
}
function ghCapture(args, opts = {}) {
  const cmd = process.platform === 'win32' ? 'gh.exe' : 'gh';
  return runCapture(cmd, args, { cwd: root, ...opts });
}

function ensureGitHubAuth() {
  const status = ghCapture(['auth', 'status', '--hostname', 'github.com'], { allowFailure: true });
  if (status.status === 0) { ok('GitHub 로그인 상태 확인'); return; }
  info('GitHub 로그인이 필요합니다. 브라우저가 열리면 로그인만 완료해주세요.');
  gh(['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web']);
  const verify = ghCapture(['auth', 'status', '--hostname', 'github.com'], { allowFailure: true });
  if (verify.status !== 0) throw new Error('GitHub 로그인이 완료되지 않았습니다.');
}

function ensurePages(repo) {
  const existing = ghCapture(['api', `repos/${repo}/pages`, '--silent'], { allowFailure: true });
  if (existing.status !== 0) {
    info('GitHub Pages를 Workflow 방식으로 활성화합니다.');
    const create = ghCapture(['api', '--method', 'POST', `repos/${repo}/pages`, '-f', 'build_type=workflow'], { allowFailure: true });
    if (create.status !== 0) warn('Pages 자동 활성화는 건너뜁니다. Workflow 실행 시 GitHub가 자동 준비할 수도 있습니다.');
  } else {
    ghCapture(['api', '--method', 'PUT', `repos/${repo}/pages`, '-f', 'build_type=workflow'], { allowFailure: true });
  }
}

function repoInfo(repo) {
  const r = ghCapture(['repo', 'view', repo, '--json', 'nameWithOwner,defaultBranchRef,url'], { allowFailure: true });
  if (r.status !== 0) throw new Error(`GitHub 저장소 ${repo}를 열 수 없습니다. 저장소 이름/권한을 확인해주세요.`);
  const obj = parseJsonLoose(r.stdout) || {};
  return {
    repo: obj.nameWithOwner || repo,
    branch: obj.defaultBranchRef?.name || 'main',
    url: obj.url || `https://github.com/${repo}`,
  };
}

async function configureGitHub(repo, workerUrl) {
  ensureGitHubAuth();
  const ri = repoInfo(repo);
  ok(`GitHub 저장소: ${ri.repo} (${ri.branch})`);
  gh(['variable', 'set', 'MULLIMULLI_API_BASE_URL', '--body', workerUrl, '-R', ri.repo]);
  ok('GitHub Actions Variable 연결 완료');
  ensurePages(ri.repo);

  const trigger = ghCapture(['workflow', 'run', 'deploy.yml', '-R', ri.repo, '--ref', ri.branch], { allowFailure: true });
  if (trigger.status !== 0) {
    warn('원격 저장소에서 deploy.yml Workflow를 찾지 못했거나 아직 최신 프로젝트가 업로드되지 않았습니다.');
    info('Cloudflare/D1 계정 연결 자체는 완료되었습니다. 저장소에 최신 v3.6 파일을 올린 뒤 Actions를 한 번 실행하면 됩니다.');
    return { ...ri, runOk: false };
  }
  process.stdout.write(trigger.stdout || '');
  ok('GitHub Pages 재배포 요청 완료');

  // 방금 생성한 workflow_dispatch 실행을 찾아 잠깐 기다린다.
  await new Promise(r => setTimeout(r, 2500));
  const latest = ghCapture(['run', 'list', '-R', ri.repo, '--workflow', 'deploy.yml', '--event', 'workflow_dispatch', '--limit', '1', '--json', 'databaseId,status,conclusion,url'], { allowFailure: true });
  const arr = parseJsonLoose(latest.stdout);
  const runInfo = Array.isArray(arr) ? arr[0] : null;
  if (runInfo?.databaseId) {
    info(`Actions: ${runInfo.url || ''}`);
    const watch = ghCapture(['run', 'watch', String(runInfo.databaseId), '-R', ri.repo, '--exit-status'], { allowFailure: true });
    if (watch.status === 0) ok('GitHub Pages 배포 성공');
    else warn('GitHub Actions가 실패했거나 시간 초과되었습니다. 위 Actions 링크에서 로그를 확인해주세요.');
  }
  return { ...ri, runOk: true };
}

async function main() {
  console.log('');
  line('═');
  console.log('  멀리멀리 온라인 계정 자동 연결 v3.6');
  console.log('  이 창 하나로 Cloudflare D1 + Worker + GitHub Pages를 연결합니다.');
  line('═');
  info(`프로젝트: ${root}`);

  if (!existsSync(wranglerToml) || !existsSync(schemaFile)) throw new Error('worker 프로젝트 파일을 찾을 수 없습니다. ZIP을 먼저 압축 해제한 뒤 루트의 SETUP_ONLINE.cmd를 실행해주세요.');
  if (process.platform === 'win32' && !existsSync(wranglerPs)) throw new Error('scripts/run-wrangler.ps1 파일을 찾을 수 없습니다. ZIP을 새 폴더에 다시 압축 해제해주세요.');
  if (!commandExists('node')) throw new Error('Node.js가 없습니다. SETUP_ONLINE.cmd로 실행하면 자동 설치를 시도합니다.');
  if (!commandExists('npm')) throw new Error('npm을 찾을 수 없습니다. Node.js LTS 설치 상태를 확인해주세요.');

  step(0, 'Windows Wrangler 실행기 점검');
  const wranglerVersion = wranglerCapture(['--version'], { allowFailure: true, useCloudflareEnv: false });
  if (wranglerVersion.status !== 0) {
    const detail = `${wranglerVersion.stderr || wranglerVersion.stdout || ''}`.trim();
    throw new Error(`Wrangler 실행기 점검에 실패했습니다.${detail ? `\n${detail}` : ''}`);
  }
  ok(`Wrangler 실행 가능: ${(wranglerVersion.stdout || '').trim() || 'OK'}`);

  step(1, 'GitHub 저장소 확인');
  const repo = await getRepo();
  const [owner] = repo.split('/');
  saveState({ githubRepo: repo });
  ok(repo);

  step(2, 'Cloudflare 로그인');
  // First try to reuse an existing Wrangler OAuth login. `auth token --json` is
  // designed for scripts and avoids misclassifying our captured D1 commands as CI.
  let authReady = prepareCloudflareCommandAuth();
  if (!authReady) {
    info('Cloudflare 승인이 필요합니다. 브라우저가 열리면 승인만 완료해주세요.');
    // Device flow is more reliable on Windows than the localhost callback flow.
    // Wrangler 4.125+ can show an optional AI-skills prompt *after* OAuth succeeds.
    // That optional prompt may return a non-zero exit code even though authentication
    // has already completed. Do not abort on that wrapper exit code; verify the OAuth
    // token immediately afterwards and continue if the login actually succeeded.
    const loginResult = wrangler(['login', '--device'], {
      useCloudflareEnv: false,
      allowFailure: true,
    });
    authReady = prepareCloudflareCommandAuth();
    if (!authReady && loginResult.status !== 0) {
      throw new Error(`Cloudflare 로그인 명령이 종료 코드 ${loginResult.status}로 끝났고 OAuth 토큰도 확인되지 않았습니다.`);
    }
  }
  if (!authReady) {
    throw new Error('Cloudflare OAuth 인증 정보를 자동으로 가져오지 못했습니다. SETUP_ONLINE.cmd를 다시 실행해주세요.');
  }
  const verify = wranglerCapture(['whoami'], { allowFailure: true });
  if (verify.status !== 0) throw new Error('Cloudflare 로그인 확인에 실패했습니다.');
  ok('Cloudflare 로그인 완료');

  step(3, 'D1 데이터베이스 자동 준비');
  const databaseId = await ensureDatabase();
  patchWrangler(databaseId, owner);
  ok('wrangler.toml 자동 설정 완료');
  ensureSchema();

  step(4, '메시지 암호화 Secret 확인');
  ensureSecret();

  step(5, 'Cloudflare Worker 배포');
  let workerUrl = await askWorkerUrl(deployWorker());
  saveState({ workerUrl, databaseId });
  patchLocalConfig(workerUrl, repo);
  ok(`Worker URL: ${workerUrl}`);
  await checkHealth(workerUrl);

  step(6, 'GitHub Pages와 온라인 API 연결');
  if (!commandExists('gh')) throw new Error('GitHub CLI(gh)가 없습니다. SETUP_ONLINE.cmd로 실행하면 자동 설치를 시도합니다.');
  const ghInfo = await configureGitHub(repo, workerUrl);
  saveState({ githubRepo: ghInfo.repo, defaultBranch: ghInfo.branch });

  step(7, '완료');
  const [finalOwner, finalRepo] = ghInfo.repo.split('/');
  const pagesUrl = `https://${finalOwner}.github.io/${finalRepo}/`;
  console.log('온라인 계정 연결에 필요한 설정을 모두 처리했습니다.');
  console.log('');
  console.log(`사이트:  ${pagesUrl}`);
  console.log(`API:     ${workerUrl}`);
  console.log(`DB:      ${DB_NAME}`);
  console.log('');
  console.log('사이트의 친구 화면에서 "온라인 계정 연결됨"이 표시되면 성공입니다.');
  console.log('그 후 서로 다른 브라우저/휴대폰에서 새 계정을 각각 만든 뒤 검색하면 됩니다.');
  console.log('');
  if (process.platform === 'win32') {
    spawnSync('cmd.exe', ['/c', 'start', '', pagesUrl], { stdio: 'ignore', windowsHide: true });
  }
}

main().catch(err => {
  fail(err?.message || String(err));
  console.error('\n자동 설정은 중간 상태를 저장하므로, 문제를 고친 뒤 같은 SETUP_ONLINE.cmd를 다시 실행해도 됩니다.');
  process.exitCode = 1;
}).finally(async () => {
  await rl.close();
});
