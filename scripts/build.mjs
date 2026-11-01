import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { version } from '../web/version.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('../dist/', import.meta.url);
const artifacts = new URL('../artifacts/', import.meta.url);
const reports = new URL('../reports/', import.meta.url);
const packageInfo = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version) || packageInfo.version !== version) {
  throw new Error('The package and sample screen versions must match.');
}
const assets = ['index.html', 'style.css', 'app.mjs', 'query.mjs', 'inquiries.mjs', 'version.mjs'];
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: fileURLToPath(root), encoding: 'utf8',
}).trim();

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await mkdir(artifacts, { recursive: true });
await mkdir(reports, { recursive: true });
const files = [];
for (const name of assets) {
  await copyFile(new URL(`../web/${name}`, import.meta.url), new URL(name, output));
  const content = await readFile(new URL(name, output));
  files.push({ path: name, sha256: createHash('sha256').update(content).digest('hex') });
}
const manifest = { version, source_commit: sourceCommit, built_at: new Date().toISOString(), files };
await writeFile(new URL('build-manifest.json', output), JSON.stringify(manifest, null, 2));
const archiveName = `inquiry-app-v${version}.tar.gz`;
const archivePath = fileURLToPath(new URL(archiveName, artifacts));
execFileSync('tar', ['-czf', archivePath, '-C', fileURLToPath(output), '.']);
const archive = await readFile(archivePath);
const evidence = {
  version, source_commit: sourceCommit, archive: archiveName,
  sha256: createHash('sha256').update(archive).digest('hex'),
  public_scope: 'Only the six static web assets and their build manifest.',
};
await writeFile(new URL('release-evidence.json', reports), JSON.stringify(evidence, null, 2));
console.log(`Built ${archiveName} from ${sourceCommit}; sha256=${evidence.sha256}`);
