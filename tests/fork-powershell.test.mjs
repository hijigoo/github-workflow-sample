import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';

const script = fileURLToPath(new URL('../scripts/win/fork.ps1', import.meta.url));
const testsDirectory = fileURLToPath(new URL('.', import.meta.url));
const pwsh = [process.env.PWSH, 'pwsh', '/opt/homebrew/bin/pwsh', '/usr/local/bin/pwsh']
  .filter(Boolean).find(program => spawnSync(program, [
    '-NoLogo', '-NoProfile', '-Command',
    'if ($PSVersionTable.PSVersion -lt [version]"7.4") { exit 1 }; exit 0',
  ], { encoding: 'utf8' }).status === 0);
const runtimeTest = (name, fn) => test(name, { skip: !pwsh && 'PowerShell 7.4+ is unavailable' }, fn);

function fixture(t) {
  // Keep every generated file inside the workspace, including .NET temp files.
  const root = mkdtempSync(join(testsDirectory, '.fork-powershell-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const target = join(root, 'target.git');
  const destination = join(root, 'copied repository');
  const sarifFile = join(root, 'provided results.sarif');
  const bin = join(root, 'bin');
  const temp = join(root, 'temp');
  mkdirSync(bin);
  mkdirSync(temp);
  const env = {
    ...process.env,
    PATH: `${bin}${delimiter}${process.env.PATH}`,
    TEMP: temp, TMP: temp, TMPDIR: temp,
    GIT_CONFIG_GLOBAL: join(root, 'gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com',
    GH_PAGER: 'invalid-interactive-pager', GIT_PAGER: 'invalid-interactive-pager',
    PAGER: 'invalid-interactive-pager',
    MOCK_LOG: join(root, 'api.jsonl'),
    MOCK_CREATED: join(root, 'created'),
    MOCK_ACTIONS_DISABLED: join(root, 'actions-disabled'),
    MOCK_CODEQL_DISABLED: join(root, 'codeql-disabled'),
    MOCK_SECURITY_ENABLED: join(root, 'security-enabled'),
    MOCK_UPLOAD: join(root, 'upload.json'),
    MOCK_POLLS: join(root, 'polls'),
    MOCK_SLEEPS: join(root, 'sleeps'),
  };
  function git(args) {
    const result = spawnSync('git', ['-c', `core.hooksPath=${temp}`, ...args], {
      cwd: root, env, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  git(['init', '--initial-branch=main', source]);
  git(['-C', source, 'commit', '--allow-empty', '-m', 'Analyzed fixture']);
  const sha = git(['-C', source, 'rev-parse', 'HEAD']);
  writeFileSync(sarifFile, JSON.stringify({
    version: '2.1.0', runs: [{ tool: { driver: { name: 'CodeQL' } }, results: [] }],
  }));
  git(['-C', source, 'switch', '-c', 'review/sort']);
  git(['-C', source, 'commit', '--allow-empty', '-m', 'Review fixture']);
  const reviewSha = git(['-C', source, 'rev-parse', 'HEAD']);
  git(['-C', source, 'switch', 'main']);
  git(['-C', source, 'switch', '-c', 'handson']);
  writeFileSync(join(source, 'handson-only.txt'), 'Hands-on branch content\n');
  git(['-C', source, 'add', 'handson-only.txt']);
  git(['-C', source, 'commit', '-m', 'Hands-on fixture']);
  const handsonSha = git(['-C', source, 'rev-parse', 'HEAD']);
  git(['-C', source, 'switch', 'main']);
  git(['init', '--bare', '--initial-branch=main', target]);
  git(['config', '--global', `url.${source.replaceAll('\\', '/')}.insteadOf`, 'https://github.com/example/source.git']);
  git(['config', '--global', `url.${target.replaceAll('\\', '/')}.insteadOf`, 'https://github.com/example/target.git']);

  const mockFile = join(bin, 'mock-gh.cjs');
  writeFileSync(join(bin, 'package.json'), '{"type":"commonjs"}');
  writeFileSync(mockFile, `
const { appendFileSync, existsSync, readFileSync, writeFileSync } = require('node:fs');
const a = process.argv.slice(2), e = process.env;
const fail = message => { console.error(message); process.exit(23); };
if (['GH_PAGER', 'GIT_PAGER', 'PAGER'].some(k => e[k])) fail('Interactive pager not disabled');
appendFileSync(e.MOCK_LOG, JSON.stringify(a) + '\\n');
if (a[0] === 'auth') {
  if (e.MOCK_AUTH_FAIL) fail('Authentication denied');
  console.log('Authenticated mock account'); process.exit(0);
}
const endpoint = a.find(v => /^(repos|orgs)\\//.test(v));
const query = a[a.indexOf('--jq') + 1];
const method = a.includes('--method') ? a[a.indexOf('--method') + 1] : 'GET';
const typed = field => a.some((v, i) => v === '-F' && a[i + 1] === field);
if (endpoint === 'repos/example/source') console.log(e.MOCK_SOURCE || 'public');
else if (endpoint === 'orgs/example') console.log('Organization');
else if (endpoint === 'orgs/example/repos' && method === 'POST') {
  if (!typed('private=true') || !typed('auto_init=false')) fail('Expected typed JSON booleans');
  if (e.MOCK_CREATE_FAIL) fail('Creation denied');
  writeFileSync(e.MOCK_CREATED, ''); console.log('Organization\\tprivate\\tfalse');
}
else if (endpoint === 'repos/example/target/actions/permissions') {
  if (method === 'PUT') {
    if (!typed('enabled=false')) fail('Expected typed disabled boolean');
    if (e.MOCK_DISABLE_FAIL) fail('Actions disable denied');
    writeFileSync(e.MOCK_ACTIONS_DISABLED, '');
  } else console.log(existsSync(e.MOCK_ACTIONS_DISABLED) ? 'false' : e.MOCK_ACTIONS || 'false');
}
else if (endpoint === 'repos/example/target/code-scanning/default-setup') {
  if (method === 'PATCH') writeFileSync(e.MOCK_CODEQL_DISABLED, '');
  else console.log(existsSync(e.MOCK_CODEQL_DISABLED) ? 'not-configured' : e.MOCK_CODEQL || 'not-configured');
}
else if (endpoint === 'repos/example/target/code-scanning/sarifs' && method === 'POST') {
  if (e.MOCK_UPLOAD_DENIED) fail('SARIF upload denied (HTTP 403)');
  writeFileSync(e.MOCK_UPLOAD, readFileSync(a[a.indexOf('--input') + 1]));
  console.log(e.MOCK_UPLOAD_ID || 'test-upload');
}
else if (endpoint === 'repos/example/target/code-scanning/sarifs/test-upload') {
  if (e.MOCK_POLL_FAIL) fail('Poll denied');
  const count = existsSync(e.MOCK_POLLS) ? Number(readFileSync(e.MOCK_POLLS, 'utf8')) : 0;
  writeFileSync(e.MOCK_POLLS, String(count + 1));
  const state = e.MOCK_PENDING_ONCE && count === 0 ? 'pending' : e.MOCK_STATE || 'complete';
  console.log(state + '\\t' + JSON.stringify(state === 'failed' ? ['Invalid SARIF'] : []));
}
else if (endpoint === 'repos/example/target') {
  if (method === 'PATCH') {
    if (!a.includes('security_and_analysis[code_security][status]=enabled')) fail('Unexpected mutation');
    if (e.MOCK_SECURITY_DENIED) fail('Code Security activation denied');
    if (!e.MOCK_SECURITY_UNCHANGED) writeFileSync(e.MOCK_SECURITY_ENABLED, '');
  }
  else if (query === '.default_branch') console.log(e.MOCK_DEFAULT_BRANCH || 'main');
  else if (query.includes('.security_and_analysis')) {
    console.log(existsSync(e.MOCK_SECURITY_ENABLED) ? 'enabled' : e.MOCK_SECURITY || 'enabled');
  }
  else if (!existsSync(e.MOCK_CREATED) && (e.MOCK_MISSING || e.MOCK_LOOKUP_FAIL)) {
    console.log('HTTP/2.0 ' + (e.MOCK_LOOKUP_FAIL ? '403 Forbidden' : '404 Not Found'));
    fail('Target lookup denied');
  } else {
    if (a.includes('--include')) console.log('HTTP/2.0 200 OK\\nContent-Type: application/json\\n');
    console.log(e.MOCK_METADATA || 'Organization\\tinternal\\tfalse');
  }
}
else fail('Unexpected API request: ' + JSON.stringify(a));
`);
  if (process.platform === 'win32') {
    writeFileSync(join(bin, 'gh.cmd'), `@"${process.execPath}" "${mockFile}" %*\r\n`);
  } else {
    writeFileSync(join(bin, 'gh'), `#!${process.execPath}\nrequire(${JSON.stringify(mockFile)});\n`, { mode: 0o700 });
  }

  function run(extra = [], overrides = {}, { native = false, fastPoll = false, scriptPath = script, branchCopy = false } = {}) {
    const args = native ? [
      '-SourceRepo', 'example/source', '-TargetRepo', 'example/target',
      ...(branchCopy ? [] : ['-AnalyzedSha', sha]), '-SarifFile', sarifFile, '-LocalDirectory', destination,
    ] : [
      '--source', 'example/source', '--target', 'example/target',
      ...(branchCopy ? [] : ['--commit', sha]), '--sarif', sarifFile, '--directory', destination,
    ];
    for (const option of extra.filter(value => value.startsWith('--'))) {
      const index = args.indexOf(option);
      if (index >= 0) args.splice(index, 2);
    }
    const invocation = fastPoll ? ['-Command', `
function Start-Sleep { param([int]$Seconds) Add-Content -LiteralPath $env:MOCK_SLEEPS -Value $Seconds }
& $env:MOCK_SCRIPT -Arguments @(ConvertFrom-Json $env:MOCK_ARGUMENTS)
exit $LASTEXITCODE
`] : ['-File', scriptPath, ...args, ...extra];
    return spawnSync(pwsh, ['-NoLogo', '-NoProfile', ...invocation], {
      cwd: root, encoding: 'utf8', timeout: 30000,
      env: {
        ...env, ...overrides, MOCK_SCRIPT: scriptPath,
        MOCK_ARGUMENTS: JSON.stringify([...args, ...extra]),
      },
    });
  }
  function requests() {
    return existsSync(env.MOCK_LOG)
      ? readFileSync(env.MOCK_LOG, 'utf8').trim().split('\n').map(JSON.parse) : [];
  }
  function seedTarget(commit = sha) {
    git(['-C', source, 'push', target, `${commit}:refs/heads/main`]);
  }
  function assertCleanTemp() {
    assert.deepEqual(readdirSync(temp), [], 'Native payloads and hooks directories must be cleaned');
  }
  return { root, run, git, sha, reviewSha, handsonSha, source, target, destination, sarifFile, env, requests, seedTarget, assertCleanTemp };
}

runtimeTest('PowerShell uploads SARIF onto current main without analyzed commit history', t => {
  for (const native of [false, true]) {
    const f = fixture(t);
    f.git(['-C', f.source, 'switch', '--orphan', 'fresh-main']);
    f.git(['-C', f.source, 'commit', '--allow-empty', '-m', 'New repository fixture']);
    const freshSha = f.git(['-C', f.source, 'rev-parse', 'HEAD']);
    f.seedTarget(freshSha);
    const original = readFileSync(f.sarifFile);
    const result = f.run(native ? ['-UploadOnly'] : ['--upload-only'],
      {}, { native, branchCopy: true });
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(readFileSync(f.env.MOCK_UPLOAD, 'utf8'));
    assert.equal(payload.commit_sha, freshSha);
    assert.equal(payload.ref, 'refs/heads/main');
    assert.deepEqual(gunzipSync(Buffer.from(payload.sarif, 'base64')), original);
    assert.deepEqual(readFileSync(f.sarifFile), original);
    assert.equal(existsSync(f.destination), false);
    assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), freshSha);
    assert.ok(f.requests().every(a => a[0] === 'auth' || a.some(v => v.startsWith('repos/example/target/'))));
    f.assertCleanTemp();
  }
});

runtimeTest('PowerShell copies handson to main and uploads unchanged SARIF by default', t => {
  for (const native of [false, true]) {
    const f = fixture(t);
    const original = readFileSync(f.sarifFile);
    const result = f.run([], {}, { native, branchCopy: true });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.handsonSha);
    assert.equal(f.git(['--git-dir', f.target, 'show', 'main:handson-only.txt']), 'Hands-on branch content');
    assert.equal(f.git(['--git-dir', f.target, 'for-each-ref', '--format=%(refname)']), 'refs/heads/main');
    assert.match(result.stdout, /Source branch: handson/);
    assert.match(result.stdout, /SARIF processing complete:[\s\S]*Copy verified:/);
    const payload = JSON.parse(readFileSync(f.env.MOCK_UPLOAD, 'utf8'));
    assert.equal(payload.commit_sha, f.handsonSha);
    assert.equal(payload.ref, 'refs/heads/main');
    assert.deepEqual(gunzipSync(Buffer.from(payload.sarif, 'base64')), original);
    assert.deepEqual(readFileSync(f.sarifFile), original);
    f.assertCleanTemp();
  }
});

runtimeTest('PowerShell uploads SARIF after copying another source branch', t => {
  for (const native of [false, true]) {
    const f = fixture(t);
    const original = readFileSync(f.sarifFile);
    const result = f.run(native ? ['-SourceBranch', 'review/sort'] : ['--source-branch', 'review/sort'],
      {}, { native, branchCopy: true });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.reviewSha);
    assert.deepEqual(readFileSync(f.sarifFile), original);
    assert.equal(JSON.parse(readFileSync(f.env.MOCK_UPLOAD, 'utf8')).commit_sha, f.reviewSha);
    f.assertCleanTemp();
  }
});

runtimeTest('PowerShell rejects invalid or missing source branches without pushing', t => {
  for (const branch of ['bad..branch', 'missing']) {
    const f = fixture(t);
    const result = f.run(['--source-branch', branch], {}, { branchCopy: true });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /git exited|Source branch not found/);
    assert.equal(f.git(['ls-remote', f.target]), '');
    assert.equal(existsSync(f.env.MOCK_UPLOAD), false);
    if (branch === 'bad..branch') assert.equal(f.requests().length, 0);
    f.assertCleanTemp();
  }
});

runtimeTest('PowerShell parser accepts the script and help needs no GitHub access', t => {
  const f = fixture(t);
  const result = spawnSync(pwsh, ['-NoLogo', '-NoProfile', '-Command', `
$Tokens = $null; $Errors = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile($env:MOCK_SCRIPT, [ref]$Tokens, [ref]$Errors)
if ($Errors.Count) { $Errors | Out-String | Write-Error; exit 1 }
& $env:MOCK_SCRIPT -Help
`], { cwd: f.root, env: { ...f.env, MOCK_SCRIPT: script }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PowerShell 7.4\+/);
  assert.equal(f.requests().length, 0);
  f.assertCleanTemp();
});

runtimeTest('PowerShell copies only analyzed main and requested review branch, uploading unchanged SARIF', t => {
  const f = fixture(t);
  const original = readFileSync(f.sarifFile);
  const result = f.run(['-ReviewBranch', 'review/sort'], {}, { native: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Copy verified:/);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.sha);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'review/sort']), f.reviewSha);
  assert.equal(f.git(['--git-dir', f.target, 'for-each-ref', '--format=%(refname)']).split('\n').length, 2);
  assert.equal(f.git(['-C', f.destination, 'rev-parse', 'HEAD']), f.sha);
  assert.deepEqual(readFileSync(f.sarifFile), original);
  const payload = JSON.parse(readFileSync(f.env.MOCK_UPLOAD, 'utf8'));
  assert.equal(payload.commit_sha, f.sha);
  assert.equal(payload.ref, 'refs/heads/main');
  assert.equal(payload.tool_name, 'CodeQL');
  assert.deepEqual(gunzipSync(Buffer.from(payload.sarif, 'base64')), original);
  assert.equal(f.requests().some(a => a.some(v => v.startsWith('repos/example/source/'))), false);
  const upload = f.requests().find(a => a.includes('repos/example/target/code-scanning/sarifs'));
  assert.equal(existsSync(upload[upload.indexOf('--input') + 1]), false);
  f.assertCleanTemp();
});

runtimeTest('PowerShell creates a private empty target with typed booleans and disables new automation', t => {
  const f = fixture(t);
  const result = f.run([], {
    MOCK_MISSING: '1', MOCK_ACTIONS: 'true', MOCK_CODEQL: 'configured', MOCK_SECURITY: 'disabled',
  }, { branchCopy: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(readFileSync(f.env.MOCK_UPLOAD, 'utf8')).commit_sha, f.handsonSha);
  assert.match(result.stdout, /SARIF processing complete:[\s\S]*Copy verified:/);
  assert.match(result.stderr, /Target lookup denied/);
  assert.match(result.stdout, /Enabling Code Security/);
  for (const marker of ['MOCK_CREATED', 'MOCK_ACTIONS_DISABLED', 'MOCK_CODEQL_DISABLED', 'MOCK_SECURITY_ENABLED']) {
    assert.ok(existsSync(f.env[marker]), marker);
  }
  f.assertCleanTemp();
});

runtimeTest('PowerShell upload-only reuses an existing path and never creates, clones, or configures repositories', t => {
  const f = fixture(t);
  f.seedTarget();
  mkdirSync(f.destination);
  const result = f.run(['-UploadOnly'], {}, { native: true });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /Copy verified:/);
  assert.deepEqual(readdirSync(f.destination), []);
  assert.equal(f.requests().filter(a => a.includes('--method')).length, 1);
  assert.ok(f.requests().every(a => a[0] === 'auth' || a.some(v => v.startsWith('repos/example/target/'))));
  f.assertCleanTemp();
});

runtimeTest('PowerShell edited defaults work without arguments and explicit confirmation overrides a false default', t => {
  for (const confirmExplicitly of [false, true]) {
    const f = fixture(t);
    const settings = {
      SourceRepo: 'example/source',
      SourceBranch: 'main',
      TargetRepo: 'example/target',
      AnalyzedSha: f.sha,
      SarifFile: f.sarifFile,
      LocalDirectory: f.destination,
      ReviewBranch: 'review/sort',
    };
    let content = readFileSync(script, 'utf8');
    for (const [name, value] of Object.entries(settings)) {
      content = content.replace(
        new RegExp(`\\[string\\]\\$${name} = '[^']*'`),
        `[string]$${name} = '${value.replaceAll("'", "''")}'`,
      );
    }
    if (confirmExplicitly) content = content.replace(
      '[bool]$SettingsConfirmed = $true', '[bool]$SettingsConfirmed = $false',
    );
    const configured = join(f.root, 'configured-fork.ps1');
    writeFileSync(configured, content);
    const result = spawnSync(pwsh, [
      '-NoLogo', '-NoProfile', '-File', configured, ...(confirmExplicitly ? ['-ConfirmSettings'] : []),
    ], { cwd: f.root, env: f.env, encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.sha);
    assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'review/sort']), f.reviewSha);
    f.assertCleanTemp();
  }
});

runtimeTest('PowerShell validates arguments, settings confirmation, and existing paths before authentication', t => {
  const cases = [
    { args: ['--commit', 'A'.repeat(40)], error: /40-character lowercase/ },
    { args: ['--source', 'https://github.com/example/source'], error: /OWNER\/REPO/ },
    { args: ['--target', 'example/source'], error: /Source and target must differ/ },
    { args: ['--directory', '--upload-only'], error: /requires a value/ },
    { args: ['--unknown'], error: /Unknown argument/ },
    { args: ['--review-branch', 'main'], error: /must differ from main/ },
    { args: ['--review-branch', 'bad..branch'], error: /git exited/ },
    { args: ['--sarif', 'missing.sarif'], error: /existing readable, nonempty/ },
    { existing: true, error: /already exists/ },
    { confirmed: false, error: /SettingsConfirmed/ },
  ];
  for (const c of cases) {
    const f = fixture(t);
    if (c.existing) mkdirSync(f.destination);
    const configured = join(f.root, 'configured-fork.ps1');
    writeFileSync(configured, readFileSync(script, 'utf8').replace(
      '[bool]$SettingsConfirmed = $true', `[bool]$SettingsConfirmed = $${c.confirmed === false ? 'false' : 'true'}`,
    ));
    const result = f.run(c.args || [], {}, { scriptPath: configured, branchCopy: true });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, c.error);
    assert.equal(f.requests().length, 0);
    f.assertCleanTemp();
  }
});

runtimeTest('PowerShell refuses unsafe targets and visible native/API failures before pushing', t => {
  const cases = [
    { env: { MOCK_AUTH_FAIL: '1' }, error: /Authentication denied/ },
    { env: { MOCK_LOOKUP_FAIL: '1' }, error: /no repository was created/ },
    { env: { MOCK_ACTIONS: 'true' }, error: /Disable target Actions/ },
    { env: { MOCK_CODEQL: 'configured' }, error: /Disable target CodeQL/ },
    { env: { MOCK_METADATA: 'User\tprivate\tfalse' }, error: /owned by an organization/ },
    { env: { MOCK_METADATA: 'Organization\tpublic\tfalse' }, error: /private or internal/ },
    { env: { MOCK_METADATA: 'Organization\tprivate\ttrue' }, error: /not be archived/ },
    { env: { MOCK_SECURITY: 'unavailable' }, error: /not enabled or status is unavailable/ },
    { env: { MOCK_SECURITY: 'disabled', MOCK_SECURITY_DENIED: '1' }, error: /activation failed/ },
    { env: { MOCK_SECURITY: 'disabled', MOCK_SECURITY_UNCHANGED: '1' }, error: /not enabled/ },
    { env: { MOCK_MISSING: '1', MOCK_DISABLE_FAIL: '1' }, error: /Could not disable Actions/ },
    { env: { MOCK_MISSING: '1', MOCK_CREATE_FAIL: '1' }, error: /Target creation failed/ },
    { seed: true, error: /Target is not empty/ },
    { args: ['--commit', '0'.repeat(40)], error: /git exited/ },
    { args: ['--review-branch', 'main-same'], sameBranch: true, error: /no commits beyond/ },
  ];
  for (const c of cases) {
    const f = fixture(t);
    if (c.seed) f.seedTarget();
    if (c.sameBranch) f.git(['-C', f.source, 'branch', 'main-same', f.sha]);
    const result = f.run(c.args || [], c.env || {});
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, c.error);
    assert.doesNotMatch(result.stdout, /Copy verified:|SARIF processing complete/);
    assert.equal(existsSync(f.env.MOCK_UPLOAD), false);
    assert.equal(f.git(['--git-dir', f.target, 'for-each-ref', '--format=%(refname)']), c.seed ? 'refs/heads/main' : '');
    f.assertCleanTemp();
  }
});

runtimeTest('PowerShell upload-only refuses missing main and enabled automation without posting', t => {
  for (const c of [
    { seed: false, env: {}, error: /Target main is missing/ },
    { seed: true, env: { MOCK_ACTIONS: 'true' }, error: /Disable target Actions and CodeQL/ },
    { seed: true, env: { MOCK_CODEQL: 'configured' }, error: /Disable target Actions and CodeQL/ },
  ]) {
    const f = fixture(t);
    if (c.seed) f.seedTarget();
    const result = f.run(['--upload-only'], c.env);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, c.error);
    assert.equal(f.requests().some(a => a.includes('POST')), false);
    f.assertCleanTemp();
  }
});

runtimeTest('PowerShell polls pending uploads at five-second intervals and bounds polling to twelve attempts', t => {
  for (const pendingForever of [false, true]) {
    const f = fixture(t);
    f.seedTarget();
    const result = f.run(['--upload-only'], pendingForever
      ? { MOCK_STATE: 'pending' } : { MOCK_PENDING_ONCE: '1' }, { fastPoll: true });
    assert.equal(result.status, pendingForever ? 1 : 0, result.stderr);
    assert.equal(readFileSync(f.env.MOCK_POLLS, 'utf8'), pendingForever ? '12' : '2');
    assert.deepEqual(readFileSync(f.env.MOCK_SLEEPS, 'utf8').trim().split(/\r?\n/),
      Array(pendingForever ? 11 : 1).fill('5'));
    if (pendingForever) assert.match(result.stderr, /still pending.*not rolled back/);
    else assert.match(result.stdout, /pending[\s\S]*complete/);
    f.assertCleanTemp();
  }
});

runtimeTest('PowerShell reports failed uploads, invalid IDs, failed polling, and processing errors without false success', t => {
  for (const c of [
    { env: { MOCK_UPLOAD_DENIED: '1' }, error: /SARIF upload denied[\s\S]*SARIF upload failed/ },
    { env: { MOCK_UPLOAD_ID: '../bad' }, error: /Invalid SARIF upload ID/ },
    { env: { MOCK_POLL_FAIL: '1' }, error: /Could not check SARIF upload/ },
    { env: { MOCK_STATE: 'failed' }, error: /SARIF processing failed.*Invalid SARIF/ },
    { env: { MOCK_STATE: 'unexpected' }, error: /Unexpected SARIF processing status/ },
  ]) {
    const f = fixture(t);
    const result = f.run([], c.env, { branchCopy: true });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, c.error);
    assert.doesNotMatch(result.stdout, /Copy verified:|SARIF processing complete/);
    assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.handsonSha, 'Copied code is not rolled back');
    f.assertCleanTemp();
  }
});
