import { pipeline, env } from '@huggingface/transformers';
import { MODEL } from './core.mjs';
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = `${self.location.origin}/models/`;
env.backends.onnx.wasm.wasmPaths = `${self.location.origin}/vendor/`;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;
let extractor;
self.onmessage = async ({ data }) => {
  const { id, texts } = data;
  try {
    const start = performance.now();
    extractor ??= await pipeline('feature-extraction', MODEL, { dtype: 'q8', device: 'wasm', progress_callback: p => {
      if (p.status === 'progress') self.postMessage({ id, type: 'progress', detail: `Loading ${p.file}: ${Math.round(p.progress || 0)}%` });
    } });
    const loaded = performance.now();
    const vectors = [];
    for (let i = 0; i < texts.length; i += 8) {
      const output = await extractor(texts.slice(i, i + 8), { pooling: 'mean', normalize: true, truncation: true, max_length: 256 });
      vectors.push(...output.tolist());
      self.postMessage({ id, type: 'progress', detail: `Listening to passage ${Math.min(i + 8, texts.length)} of ${texts.length}…` });
    }
    self.postMessage({ id, type: 'result', vectors, metadata: { backend: 'ONNX Runtime Web / WASM', dtype: 'q8', dimensions: 384, passages: texts.length, modelLoadMs: Math.round(loaded - start), inferenceMs: Math.round(performance.now() - loaded), measuredAt: new Date().toISOString() } });
  } catch (error) { extractor = undefined; self.postMessage({ id, type: 'error', error: error.message || String(error) }); }
};
