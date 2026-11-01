import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const builder = new URL('../scripts/build.mjs', import.meta.url);

function build() {
  assert.ok(existsSync(builder), 'Build 스크립트가 아직 구현되지 않았습니다.');
  execFileSync(process.execPath, [fileURLToPath(builder)], { cwd: fileURLToPath(root) });
}

test('Build는 프론트 파일을 게시하고 숨김 환경 파일은 제외한다', async () => {
  const fixture = new URL('../web/.env.training', import.meta.url);
  await writeFile(fixture, 'Non-secret test fixture. Never publish this file.', { flag: 'wx' });
  try {
    build();
    assert.ok(existsSync(new URL('../dist/index.html', import.meta.url)));
    assert.ok(existsSync(new URL('../dist/query.mjs', import.meta.url)));
    assert.equal(existsSync(new URL('../dist/.env.training', import.meta.url)), false);
    assert.equal(existsSync(new URL('../dist/src/inquiries/repository.ts', import.meta.url)), false);
  } finally {
    await unlink(fixture);
  }
});

test('Build 매니페스트의 해시는 실제 게시 파일과 일치한다', async () => {
  build();
  const manifest = JSON.parse(await readFile(new URL('../dist/build-manifest.json', import.meta.url), 'utf8'));
  assert.ok(manifest.files.length > 0);
  for (const entry of manifest.files) {
    const content = await readFile(new URL(`../dist/${entry.path}`, import.meta.url));
    assert.equal(entry.sha256, createHash('sha256').update(content).digest('hex'));
  }
});
