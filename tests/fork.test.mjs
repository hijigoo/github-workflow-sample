import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/linux/fork.sh', import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'pioneer-copy-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const target = join(root, 'target.git');
  const destination = join(root, 'copied');
  const sarifFile = join(root, 'provided results.sarif');
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    GIT_CONFIG_GLOBAL: join(root, 'gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
    GIT_AUTHOR_NAME: 'Test',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test',
    GIT_COMMITTER_EMAIL: 'test@example.com',
    MOCK_ACTIONS: 'false',
    MOCK_CODEQL: 'not-configured',
    MOCK_SECURITY: 'enabled',
    MOCK_API_LOG: join(root, 'api.jsonl'),
    MOCK_CREATED: join(root, 'created'),
    MOCK_ACTIONS_DISABLED: join(root, 'actions-disabled'),
    MOCK_CODEQL_DISABLED: join(root, 'codeql-disabled'),
    MOCK_SECURITY_ENABLED: join(root, 'security-enabled'),
    MOCK_UPLOAD_BODY: join(root, 'upload.json'),
    MOCK_POLLS: join(root, 'polls'),
  };
  function git(args) {
    const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
      cwd: root, env, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  git(['init', '--initial-branch=main', source]);
  git(['-C', source, 'commit', '--allow-empty', '-m', 'Analyzed fixture']);
  const sha = git(['-C', source, 'rev-parse', 'HEAD']);
  writeFileSync(sarifFile, JSON.stringify({
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'CodeQL' } },
      versionControlProvenance: [{
        repositoryUri: 'https://github.com/example/source', revisionId: sha,
      }],
      results: [],
    }],
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
  git(['config', '--global', `url.${source}.insteadOf`, 'https://github.com/example/source.git']);
  git(['config', '--global', `url.${target}.insteadOf`, 'https://github.com/example/target.git']);
  writeFileSync(join(bin, 'gh'), `#!${process.execPath}
const { appendFileSync, existsSync, readFileSync, writeFileSync } = require('node:fs');
const args = process.argv.slice(2);
if (process.env.MOCK_CHECK_PAGERS === 'true' &&
    ['GH_PAGER', 'GIT_PAGER', 'PAGER'].some(name => process.env[name] !== 'cat')) {
  console.error('Interactive pager is still enabled'); process.exit(1);
}
if (args[0] === 'auth') process.exit(0);
appendFileSync(process.env.MOCK_API_LOG, JSON.stringify(args) + '\\n');
const endpoint = args.find(arg => /^(repos|orgs)\\//.test(arg));
const query = args[args.indexOf('--jq') + 1];
const method = args.includes('--method') ? args[args.indexOf('--method') + 1] : 'GET';
if (endpoint === 'orgs/example') {
  if (process.env.MOCK_ORG_DENIED === 'true') {
    console.error('Organization not accessible'); process.exit(1);
  }
  console.log('Organization');
}
else if (endpoint === 'orgs/example/repos' && method === 'POST') {
  if (process.env.MOCK_CREATE_FAIL === 'true') {
    console.error('Repository creation denied'); process.exit(1);
  }
  writeFileSync(process.env.MOCK_CREATED, '');
  console.log('Organization\\tprivate\\tfalse');
}
else if (endpoint === 'repos/example/source') console.log('public');
else if (endpoint === 'repos/example/target/code-scanning/sarifs' && method === 'POST') {
  if (process.env.MOCK_UPLOAD_DENIED === 'true') {
    console.error('SARIF upload denied (HTTP 403)'); process.exit(1);
  }
  writeFileSync(process.env.MOCK_UPLOAD_BODY, readFileSync(args[args.indexOf('--input') + 1]));
  console.log('test-upload');
}
else if (endpoint === 'repos/example/target/code-scanning/sarifs/test-upload') {
  const count = existsSync(process.env.MOCK_POLLS)
    ? Number(readFileSync(process.env.MOCK_POLLS, 'utf8')) : 0;
  writeFileSync(process.env.MOCK_POLLS, String(count + 1));
  const state = process.env.MOCK_PENDING_ONCE === 'true' && count === 0
    ? 'pending' : process.env.MOCK_UPLOAD_STATE || 'complete';
  console.log(state + '\\t' + JSON.stringify(state === 'failed' ? ['Invalid SARIF'] : []));
}
else if (endpoint === 'repos/example/target/actions/permissions') {
  if (method === 'PUT') {
    if (process.env.MOCK_DISABLE_FAIL === 'true') {
      console.error('Actions update denied'); process.exit(1);
    }
    writeFileSync(process.env.MOCK_ACTIONS_DISABLED, '');
  } else console.log(existsSync(process.env.MOCK_ACTIONS_DISABLED) ? 'false' : process.env.MOCK_ACTIONS);
}
else if (endpoint === 'repos/example/target/code-scanning/default-setup') {
  if (process.env.MOCK_SECURITY !== 'enabled' && !existsSync(process.env.MOCK_SECURITY_ENABLED)) {
    console.error('Code Security must be enabled (HTTP 403)'); process.exit(1);
  }
  if (method === 'PATCH') writeFileSync(process.env.MOCK_CODEQL_DISABLED, '');
  else console.log(existsSync(process.env.MOCK_CODEQL_DISABLED) ? 'not-configured' : process.env.MOCK_CODEQL);
}
else if (endpoint === 'repos/example/target' && query === '.default_branch') console.log('main');
else if (endpoint === 'repos/example/target') {
  if (method === 'PATCH') {
    if (!args.includes('security_and_analysis[code_security][status]=enabled')) {
      console.error('Unexpected repository update'); process.exit(1);
    }
    if (process.env.MOCK_SECURITY_DENIED === 'true') {
      console.error('Code Security activation denied (HTTP 403)'); process.exit(1);
    }
    if (process.env.MOCK_SECURITY_UNCHANGED !== 'true')
      writeFileSync(process.env.MOCK_SECURITY_ENABLED, '');
    process.exit(0);
  }
  if (query.includes('.security_and_analysis')) {
    console.log(existsSync(process.env.MOCK_SECURITY_ENABLED) ? 'enabled' : process.env.MOCK_SECURITY);
    process.exit(0);
  }
  if (!existsSync(process.env.MOCK_CREATED) &&
      (process.env.MOCK_TARGET_MISSING === 'true' || process.env.MOCK_LOOKUP_FAIL === 'true')) {
    console.log('HTTP/2.0 ' + (process.env.MOCK_LOOKUP_FAIL === 'true' ? '403 Forbidden' : '404 Not Found'));
    console.error('Target lookup failed'); process.exit(1);
  }
  if (args.includes('--include')) console.log('HTTP/2.0 200 OK\\nContent-Type: application/json\\n');
  console.log('Organization\\tinternal\\tfalse');
}
else { console.error('Unexpected API request'); process.exit(1); }
`, { mode: 0o700 });
  writeFileSync(join(bin, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  function run(extra = [], overrides = {}, { branchCopy = false } = {}) {
    return spawnSync('bash', [
      script, '--source', 'example/source', '--target', 'example/target',
      ...(branchCopy ? [] : ['--commit', sha]), '--sarif', sarifFile,
      '--directory', destination, '--confirm-settings', ...extra,
    ], { cwd: root, env: { ...env, ...overrides }, encoding: 'utf8' });
  }
  function requests() {
    return readFileSync(env.MOCK_API_LOG, 'utf8').trim().split('\n').map(JSON.parse);
  }
  return { git, run, sha, reviewSha, handsonSha, target, destination, sarifFile, env, requests };
}

test('pioneer script uploads SARIF onto current main without analyzed commit history', t => {
  const f = fixture(t);
  const source = join(f.destination, '..', 'source');
  f.git(['-C', source, 'switch', '--orphan', 'fresh-main']);
  f.git(['-C', source, 'commit', '--allow-empty', '-m', 'New repository fixture']);
  const freshSha = f.git(['-C', source, 'rev-parse', 'HEAD']);
  f.git(['-C', source, 'push', f.target, 'fresh-main:refs/heads/main']);
  const original = readFileSync(f.sarifFile, 'utf8');
  const result = f.run(['--upload-only'], {}, { branchCopy: true });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(readFileSync(f.env.MOCK_UPLOAD_BODY, 'utf8'));
  assert.equal(payload.commit_sha, freshSha);
  assert.equal(payload.ref, 'refs/heads/main');
  assert.equal(gunzipSync(Buffer.from(payload.sarif, 'base64')).toString(), original);
  assert.equal(readFileSync(f.sarifFile, 'utf8'), original);
  assert.equal(existsSync(f.destination), false);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), freshSha);
  assert.ok(f.requests().every(args => args.some(arg => arg.startsWith('repos/example/target/'))));
});

test('pioneer script copies handson to main and uploads unchanged SARIF by default', t => {
  const f = fixture(t);
  const original = readFileSync(f.sarifFile, 'utf8');
  const result = f.run([], {}, { branchCopy: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.handsonSha);
  assert.equal(f.git(['--git-dir', f.target, 'show', 'main:handson-only.txt']), 'Hands-on branch content');
  assert.equal(f.git(['--git-dir', f.target, 'for-each-ref', '--format=%(refname)']), 'refs/heads/main');
  assert.match(result.stdout, /Source branch: handson/);
  assert.match(result.stdout, /SARIF processing complete:[\s\S]*Copy verified:/);
  const payload = JSON.parse(readFileSync(f.env.MOCK_UPLOAD_BODY, 'utf8'));
  assert.equal(payload.commit_sha, f.handsonSha);
  assert.equal(payload.ref, 'refs/heads/main');
  assert.equal(gunzipSync(Buffer.from(payload.sarif, 'base64')).toString(), original);
  assert.equal(readFileSync(f.sarifFile, 'utf8'), original);
});

test('pioneer script uploads SARIF after copying another source branch', t => {
  const f = fixture(t);
  const original = readFileSync(f.sarifFile, 'utf8');
  const result = f.run(['--source-branch', 'review/sort'], {}, { branchCopy: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.reviewSha);
  assert.equal(readFileSync(f.sarifFile, 'utf8'), original);
  assert.equal(JSON.parse(readFileSync(f.env.MOCK_UPLOAD_BODY, 'utf8')).commit_sha, f.reviewSha);
});

test('pioneer script rejects invalid or missing source branches without pushing', t => {
  for (const branch of ['bad..branch', 'missing']) {
    const f = fixture(t);
    const result = f.run(['--source-branch', branch], {}, { branchCopy: true });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /valid branch name|Source branch not found/);
    assert.equal(f.git(['ls-remote', f.target]), '');
    assert.equal(existsSync(f.env.MOCK_UPLOAD_BODY), false);
    if (branch === 'bad..branch') assert.equal(existsSync(f.env.MOCK_API_LOG), false);
  }
});

test('pioneer script overrides inherited interactive pagers for child commands', t => {
  const f = fixture(t);
  const result = f.run([], {
    GH_PAGER: 'less', GIT_PAGER: 'less', PAGER: 'less',
    MOCK_CHECK_PAGERS: 'true',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Copy verified:/);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.sha);
});

test('pioneer script preserves analyzed main and copies only the requested review branch', t => {
  const f = fixture(t);
  const result = f.run(['--review-branch', 'review/sort']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.sha);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'review/sort']), f.reviewSha);
  assert.equal(f.git(['-C', f.destination, 'rev-parse', 'HEAD']), f.sha);
  assert.equal(f.git(['-C', f.destination, 'remote', 'get-url', '--push', 'origin']), f.target);
});

test('pioneer script runs without arguments after editing its initial configuration', t => {
  const f = fixture(t);
  const configuredScript = join(f.destination, '..', 'configured-fork.sh');
  const settings = {
    SOURCE_REPO: 'example/source',
    SOURCE_BRANCH: 'main',
    TARGET_REPO: 'example/target',
    ANALYZED_SHA: f.sha,
    SARIF_FILE: f.sarifFile,
    LOCAL_DIRECTORY: f.destination,
    REVIEW_BRANCH: 'review/sort',
    SETTINGS_CONFIRMED: true,
  };
  let content = readFileSync(script, 'utf8');
  for (const [name, value] of Object.entries(settings)) {
    content = content.replace(
      new RegExp(`^${name}=.*$`, 'm'),
      `${name}=${typeof value === 'boolean' ? value : `'${value}'`}`,
    );
  }
  writeFileSync(configuredScript, content);
  const result = spawnSync('bash', [configuredScript], {
    env: f.env, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.sha);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'review/sort']), f.reviewSha);
  const sarif = JSON.parse(readFileSync(f.sarifFile, 'utf8'));
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].tool.driver.name, 'CodeQL');
});

test('pioneer script reuses local SARIF unchanged without source Code scanning access', t => {
  const f = fixture(t);
  const original = readFileSync(f.sarifFile, 'utf8');
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Using local SARIF:/);
  assert.equal(readFileSync(f.sarifFile, 'utf8'), original);
  assert.equal(existsSync(`${f.destination}.sarif`), false);
  assert.equal(f.requests().some(args => args.some(arg =>
    arg.startsWith('repos/example/source/'))), false);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.sha);
  const payload = JSON.parse(readFileSync(f.env.MOCK_UPLOAD_BODY, 'utf8'));
  assert.equal(payload.commit_sha, f.sha);
  assert.equal(payload.ref, 'refs/heads/main');
  assert.equal(payload.tool_name, 'CodeQL');
  assert.equal(gunzipSync(Buffer.from(payload.sarif, 'base64')).toString(), original);
  assert.match(result.stdout, /SARIF processing complete:/);
  const upload = f.requests().find(args => args.includes('repos/example/target/code-scanning/sarifs'));
  assert.equal(existsSync(upload[upload.indexOf('--input') + 1]), false);
});

test('pioneer script waits for asynchronous SARIF completion', t => {
  const f = fixture(t);
  const result = f.run([], { MOCK_PENDING_ONCE: 'true' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SARIF processing: pending[\s\S]*SARIF processing: complete/);
  assert.equal(readFileSync(f.env.MOCK_POLLS, 'utf8'), '2');
});

test('pioneer script reports SARIF upload and processing failures without claiming completion', t => {
  for (const overrides of [
    { MOCK_UPLOAD_DENIED: 'true' },
    { MOCK_UPLOAD_STATE: 'failed' },
    { MOCK_UPLOAD_STATE: 'pending' },
    { MOCK_UPLOAD_STATE: 'unexpected' },
  ]) {
    const f = fixture(t);
    const result = f.run([], overrides, { branchCopy: true });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ERROR: (SARIF|Unexpected SARIF)/);
    assert.doesNotMatch(result.stdout, /SARIF processing complete:|Copy verified:/);
    assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.handsonSha);
  }
});

test('pioneer script can upload SARIF to a previously copied main without recloning', t => {
  const f = fixture(t);
  f.git(['-C', join(f.destination, '..', 'source'), 'push', f.target, 'main']);
  mkdirSync(f.destination);
  const result = f.run(['--upload-only']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SARIF processing complete:/);
  assert.equal(f.requests().some(args => args.includes('orgs/example/repos')), false);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.sha);
});

test('pioneer script refuses upload-only mode when main is missing or automation is enabled', t => {
  const f = fixture(t);
  const missing = f.run(['--upload-only']);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Target main is missing/);
  f.git(['-C', join(f.destination, '..', 'source'), 'push', f.target, 'main']);
  const enabled = f.run(['--upload-only'], { MOCK_ACTIONS: 'true' });
  assert.notEqual(enabled.status, 0);
  assert.match(enabled.stderr, /Disable target Actions/);
  assert.equal(existsSync(f.env.MOCK_UPLOAD_BODY), false);
});

test('pioneer script rejects missing, empty, or directory SARIF paths before API calls', t => {
  const f = fixture(t);
  const empty = join(f.destination, '..', 'empty.sarif');
  writeFileSync(empty, '');
  for (const path of [`${empty}-missing`, empty, join(f.destination, '..')]) {
    const result = f.run(['--sarif', path], {}, { branchCopy: true });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Local SARIF must be/);
    assert.equal(existsSync(f.destination), false);
    assert.equal(existsSync(f.env.MOCK_API_LOG), false);
    assert.equal(f.git(['ls-remote', f.target]), '');
  }
});

test('pioneer script does not require an analyzed SHA in upload-only mode', t => {
  const f = fixture(t);
  const configuredScript = join(f.destination, '..', 'no-sha-fork.sh');
  writeFileSync(configuredScript, readFileSync(script, 'utf8')
    .replace(/^ANALYZED_SHA=.*$/m, "ANALYZED_SHA=''"));
  f.git(['-C', join(f.destination, '..', 'source'), 'push', f.target, 'main']);
  const result = spawnSync('bash', [
    configuredScript, '--upload-only', '--confirm-settings', '--sarif', f.sarifFile,
    '--source', 'example/source', '--target', 'example/target', '--directory', f.destination,
  ], { env: f.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(readFileSync(f.env.MOCK_UPLOAD_BODY, 'utf8')).commit_sha, f.sha);
});

test('pioneer script requires settings confirmation and supports copying main only', t => {
  const f = fixture(t);
  const unconfirmedScript = join(f.destination, '..', 'unconfirmed-fork.sh');
  writeFileSync(unconfirmedScript, readFileSync(script, 'utf8')
    .replace(/^SETTINGS_CONFIRMED=.*$/m, 'SETTINGS_CONFIRMED=false'));
  const unconfirmed = spawnSync('bash', [
    unconfirmedScript, '--source', 'example/source', '--target', 'example/target',
    '--commit', f.sha, '--directory', f.destination,
  ], { env: f.env, encoding: 'utf8' });
  assert.notEqual(unconfirmed.status, 0);
  assert.match(unconfirmed.stderr, /--confirm-settings/);
  assert.equal(existsSync(f.destination), false);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(['--git-dir', f.target, 'branch', '--format=%(refname:short)']), 'main');
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.sha);
});

test('pioneer script creates a missing private target and disables automation before copying', t => {
  const f = fixture(t);
  const result = f.run([], {
    MOCK_TARGET_MISSING: 'true', MOCK_ACTIONS: 'true', MOCK_CODEQL: 'configured',
    MOCK_SECURITY: 'disabled',
  }, { branchCopy: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.handsonSha);
  assert.equal(JSON.parse(readFileSync(f.env.MOCK_UPLOAD_BODY, 'utf8')).commit_sha, f.handsonSha);
  assert.match(result.stdout, /SARIF processing complete:[\s\S]*Copy verified:/);
  const requests = f.requests();
  const creation = requests.find(args => args.includes('orgs/example/repos'));
  assert.ok(creation.includes('name=target'));
  assert.ok(creation.includes('private=true'));
  assert.ok(creation.includes('auto_init=false'));
  const actionsIndex = requests.findIndex(args => args.includes('PUT'));
  const codeqlIndex = requests.findIndex(args => args.includes('PATCH') &&
    args.includes('repos/example/target/code-scanning/default-setup'));
  assert.ok(actionsIndex > requests.indexOf(creation));
  assert.ok(codeqlIndex > actionsIndex);
  assert.ok(requests[actionsIndex].includes('enabled=false'));
  assert.ok(requests[codeqlIndex].includes('state=not-configured'));
});

test('pioneer script does not change settings or recreate an existing target', t => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.requests().some(args => args.includes('--method') &&
    ['POST', 'PUT', 'PATCH'].includes(args[args.indexOf('--method') + 1]) &&
    !args.includes('repos/example/target/code-scanning/sarifs')), false);
});

test('pioneer script enables Code Security before querying CodeQL on an empty target', t => {
  const f = fixture(t);
  const result = f.run([], { MOCK_SECURITY: 'disabled' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.sha);
  const requests = f.requests();
  const activationIndex = requests.findIndex(args => args.includes('security_and_analysis[code_security][status]=enabled'));
  const codeqlIndex = requests.findIndex(args => args.includes('repos/example/target/code-scanning/default-setup'));
  assert.ok(activationIndex >= 0 && codeqlIndex > activationIndex);
  assert.ok(requests.slice(activationIndex + 1, codeqlIndex)
    .some(args => args.some(arg => arg.includes('.security_and_analysis'))));
});

test('pioneer script stops before cloning when Code Security activation or verification fails', t => {
  for (const overrides of [
    { MOCK_SECURITY: 'disabled', MOCK_SECURITY_DENIED: 'true' },
    { MOCK_SECURITY: 'disabled', MOCK_SECURITY_UNCHANGED: 'true' },
    { MOCK_SECURITY: 'unavailable' },
  ]) {
    const f = fixture(t);
    const result = f.run([], overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ERROR: Code Security/);
    assert.equal(existsSync(f.destination), false);
    assert.equal(f.git(['ls-remote', f.target]), '');
    assert.equal(f.requests().some(args => args.includes('repos/example/target/code-scanning/default-setup')), false);
  }
});

test('pioneer script does not enable Code Security on a nonempty target', t => {
  const f = fixture(t);
  f.git(['-C', join(f.destination, '..', 'source'), 'push', f.target, 'main']);
  const result = f.run([], { MOCK_SECURITY: 'disabled' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Target is not empty/);
  assert.equal(f.requests().some(args => args.includes('security_and_analysis[code_security][status]=enabled')), false);
});

test('pioneer script stops on organization, lookup, creation, and settings errors', t => {
  const f = fixture(t);
  for (const overrides of [
    { MOCK_ORG_DENIED: 'true' },
    { MOCK_LOOKUP_FAIL: 'true' },
    { MOCK_TARGET_MISSING: 'true', MOCK_CREATE_FAIL: 'true' },
    { MOCK_TARGET_MISSING: 'true', MOCK_DISABLE_FAIL: 'true' },
  ]) {
    const result = f.run([], overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ERROR:/);
    assert.equal(existsSync(f.destination), false);
    assert.equal(f.git(['ls-remote', f.target]), '');
  }
  const creations = f.requests().filter(args => args.includes('orgs/example/repos'));
  assert.equal(creations.length, 2);
});

test('pioneer script refuses enabled Actions and CodeQL before clone or push', t => {
  const f = fixture(t);
  for (const overrides of [{ MOCK_ACTIONS: 'true' }, { MOCK_CODEQL: 'configured' }]) {
    const result = f.run([], overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Disable target/);
    assert.equal(existsSync(f.destination), false);
    assert.equal(f.git(['ls-remote', f.target]), '');
  }
});

test('pioneer script does not overwrite existing remote refs or local directories', t => {
  const f = fixture(t);
  f.git(['-C', join(f.destination, '..', 'source'), 'push', f.target, 'main']);
  const nonempty = f.run();
  assert.notEqual(nonempty.status, 0);
  assert.match(nonempty.stderr, /Target is not empty/);
  assert.equal(existsSync(f.destination), false);
  mkdirSync(f.destination);
  const existing = f.run();
  assert.notEqual(existing.status, 0);
  assert.match(existing.stderr, /Local destination already exists/);
  assert.equal(f.git(['--git-dir', f.target, 'rev-parse', 'main']), f.sha);
});

test('pioneer script leaves target empty when analyzed commit or review branch is missing', t => {
  const f = fixture(t);
  const missingCommit = f.run(['--commit', '0'.repeat(40)]);
  assert.notEqual(missingCommit.status, 0);
  assert.equal(f.git(['ls-remote', f.target]), '');
  const missingBranch = f.run([
    '--directory', `${f.destination}-second`, '--review-branch', 'review/missing',
  ]);
  assert.notEqual(missingBranch.status, 0);
  assert.equal(f.git(['ls-remote', f.target]), '');
});

test('pioneer script refuses a review branch unrelated to the analyzed commit', t => {
  const f = fixture(t);
  const source = join(f.destination, '..', 'source');
  f.git(['-C', source, 'switch', '--orphan', 'review/unrelated']);
  f.git(['-C', source, 'commit', '--allow-empty', '-m', 'Unrelated fixture']);
  const result = f.run(['--review-branch', 'review/unrelated']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Review branch must descend/);
  assert.equal(f.git(['ls-remote', f.target]), '');
});
