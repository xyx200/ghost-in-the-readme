import { pipeline, env } from '@huggingface/transformers';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL, parseDocument, comparePassages, cosine, lexicalOverlap, makeReport, reportMarkdown } from '../src/core.mjs';
import { examples } from '../src/examples.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(root, 'evidence'); await mkdir(evidence, {recursive:true});
env.allowRemoteModels = false; env.allowLocalModels = true;
env.localModelPath = path.join(root,'public','models') + path.sep;
env.useBrowserCache = false;
// A failed network request aborts verification: local inference must stand alone.
globalThis.fetch = async () => { throw new Error('Network is disabled during inference verification.'); };
const started = performance.now();
const extractor = await pipeline('feature-extraction', MODEL, {dtype:'q8',device:'cpu', session_options:{ intraOpNumThreads:2, interOpNumThreads:1 }});
const loadMs = Math.round(performance.now() - started);
const outputs = [];
for (const example of examples) {
  const before = parseDocument(example.before,'Before'), after = parseDocument(example.after,'After');
  const texts = [...before, ...after].map(p=>p.text), start = performance.now();
  const vectors = [];
  for (let i=0;i<texts.length;i+=8) vectors.push(...(await extractor(texts.slice(i,i+8), {pooling:'mean',normalize:true,truncation:true,max_length:256})).tolist());
  const inferenceMs = Math.round(performance.now()-start);
  const rows = comparePassages(before,after,vectors.slice(0,before.length),vectors.slice(before.length));
  const inference = { backend:'ONNX Runtime Node / CPU', library:'@huggingface/transformers@3.8.1',dtype:'q8',dimensions:vectors[0].length,passages:texts.length,modelLoadMs:loadMs,inferenceMs,measuredAt:new Date().toISOString(), remoteModelsAllowed:false };
  const fingerprint = text=>createHash('sha256').update(text).digest('hex');
  const report = makeReport({before:example.before,after:example.after,rows,threshold:.68,inference,fingerprints:{before:fingerprint(example.before),after:fingerprint(example.after)}});
  await writeFile(path.join(evidence,`${example.id}-report.json`),JSON.stringify(report,null,2)+'\n');
  await writeFile(path.join(evidence,`${example.id}-report.md`),reportMarkdown(report));
  outputs.push({id:example.id,inference,summary:rows.map(r=>({source:r.source.text,current:r.best.passage.text,cosine:r.best.score,lexical:r.best.lexical,status:r.status,polarityWarning:r.polarityWarning}))});
  console.log(`\n${example.title}: ${texts.length} passages in ${inferenceMs} ms`);
  for(const row of rows) console.log(`${row.best.score.toFixed(3)} ${row.status.padEnd(9)} ${row.source.text}${row.polarityWarning?' [NEGATION REVIEW]':''}`);
}
const triples = [
  ['You can save a copy of your notes to your own computer.','Download your notes as a local backup.','The garden is full of purple flowers.'],
  ['The application supports navigation with a keyboard.','Navigate the interface using keyboard shortcuts.','Bake the bread for forty minutes.'],
  ['You can export every transcript as a plain text file.','Download your transcripts in TXT format whenever you like.','The train departs from platform nine.'],
  ['Your notes are private and only visible to you.','Only you can access your private notes.','A warm bowl of soup waits on the table.'],
  ['Search finds related memories without matching exact words.','Semantic retrieval locates similar stories from a description.','The camera battery is completely flat.'],
];
const checks=[];
for(const [query,positive,negative] of triples){
 const v=(await extractor([query,positive,negative],{pooling:'mean',normalize:true})).tolist();
 const relevant=cosine(v[0],v[1]),unrelated=cosine(v[0],v[2]); checks.push({query,positive,negative,relevant,unrelated,lexical:lexicalOverlap(query,positive),pass:relevant>unrelated+.15});
}
const result={createdAt:new Date().toISOString(),model:MODEL,modelRevision:JSON.parse(await readFile(path.join(root,'model-lock.json'),'utf8')).revision,backend:'ONNX Runtime Node / CPU',networkDuringInference:'Disabled: global fetch throws on any request.',browserVerification:'Separate browser evidence is stored in browser-validation.json and browser-export.json.',fixtureDisclosure:'All sample prose and retrieval triples are original synthetic fixtures, not real users or a benchmark.',retrievalChecks:checks,passed:checks.filter(x=>x.pass).length,total:checks.length,outputs};
await writeFile(path.join(evidence,'inference-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(`\nRetrieval sanity checks: ${result.passed}/${result.total} (synthetic, not a benchmark).`);
await extractor.dispose();
if(result.passed!==result.total) process.exitCode=1;
