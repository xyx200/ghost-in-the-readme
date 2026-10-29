import { mkdir, writeFile, readFile, readdir, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const model = 'Xenova/all-MiniLM-L6-v2';
const modelRoot = path.join(root, 'public', 'models', model);
const manifestPath = path.join(root, 'evidence', 'model-manifest.json');
const pinnedPath = path.join(root, 'model-lock.json');
await mkdir(path.join(root, 'evidence'), { recursive: true });
let lock;
try { lock = JSON.parse(await readFile(pinnedPath, 'utf8')); } catch {}
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status} downloading ${url}`);
  return response;
}
if (!lock) {
  const metadata = await (await get(`https://huggingface.co/api/models/${model}`)).json();
  if (!/^[a-f0-9]{40}$/.test(metadata.sha)) throw new Error('Model revision could not be verified.');
  lock = { model, revision: metadata.sha, files: ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'vocab.txt', 'onnx/model_quantized.onnx'], source: `https://huggingface.co/${model}`, license: 'Apache-2.0' };
  await writeFile(pinnedPath, JSON.stringify(lock, null, 2) + '\n');
}
const oldManifest = await readFile(manifestPath, 'utf8').then(JSON.parse).catch(() => null);
const artifacts = [];
for (const name of lock.files) {
  const destination = path.join(modelRoot, name);
  await mkdir(path.dirname(destination), { recursive: true });
  let bytes = await readFile(destination).catch(() => null);
  const previous = oldManifest?.artifacts.find(x => x.name === name && oldManifest.revision === lock.revision);
  if (!bytes || !previous || createHash('sha256').update(bytes).digest('hex') !== previous.sha256) {
    console.log(`Downloading ${name} from pinned revision ${lock.revision.slice(0, 12)}…`);
    bytes = Buffer.from(await (await get(`https://huggingface.co/${model}/resolve/${lock.revision}/${name}`)).arrayBuffer());
    await writeFile(destination, bytes);
  }
  artifacts.push({ name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const runtimeDir = path.join(root, 'node_modules', 'onnxruntime-web', 'dist');
const vendorDir = path.join(root, 'public', 'vendor');
await mkdir(vendorDir, { recursive: true });
for (const name of await readdir(runtimeDir)) {
  if (/^ort-wasm.*\.(wasm|mjs)$/.test(name)) await copyFile(path.join(runtimeDir, name), path.join(vendorDir, name));
}
await writeFile(manifestPath, JSON.stringify({ model, revision: lock.revision, downloadedAt: new Date().toISOString(), artifacts }, null, 2) + '\n');
console.log(`Offline assets ready: ${(artifacts.reduce((n, x) => n + x.bytes, 0) / 1024 / 1024).toFixed(2)} MiB model files. Remote model loading is disabled in the app.`);
