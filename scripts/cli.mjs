import { pipeline, env } from '@huggingface/transformers';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL, parseDocument, comparePassages, makeReport, reportMarkdown } from '../src/core.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help') || args.length < 2) {
 console.log('Ghost in the README\n\nnode scripts/cli.mjs BEFORE.md AFTER.md [REPORT_DIRECTORY]\n\nRuns pinned MiniLM locally. No network inference.\nThe output is a review prompt, not proof that a promise is fulfilled.');
 process.exit(args.includes('--help') ? 0 : 2);
}
let extractor;
try {
 const beforeText = await readFile(args[0],'utf8'), afterText = await readFile(args[1],'utf8');
 const before = parseDocument(beforeText,'Before'), after = parseDocument(afterText,'After');
 env.allowRemoteModels = false; env.allowLocalModels = true; env.useBrowserCache = false;
 env.localModelPath = path.join(root,'public','models') + path.sep;
 console.log('GHOST IN THE README\nA local semantic seance for forgotten project promises.\n');
 console.log(`Model: ${MODEL} / q8\nRemote model loading: disabled\nPassages: ${before.length} then, ${after.length} now\n`);
 const start = performance.now();
 extractor = await pipeline('feature-extraction',MODEL,{dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
 const loaded=performance.now(), texts=[...before,...after].map(p=>p.text), vectors=[];
 for(let i=0;i<texts.length;i+=8) vectors.push(...(await extractor(texts.slice(i,i+8),{pooling:'mean',normalize:true,truncation:true,max_length:256})).tolist());
 const inference={backend:'ONNX Runtime Node / CPU',dtype:'q8',dimensions:vectors[0].length,passages:texts.length,modelLoadMs:Math.round(loaded-start),inferenceMs:Math.round(performance.now()-loaded),measuredAt:new Date().toISOString(),remoteModelsAllowed:false};
 const rows=comparePassages(before,after,vectors.slice(0,before.length),vectors.slice(before.length));
 for(const r of rows){ console.log(`[${r.status.toUpperCase()}] cosine ${r.best.score.toFixed(3)} | word overlap ${r.best.lexical.toFixed(3)}`); console.log(`  THEN L${r.source.line}: ${r.source.text}\n  NOW  L${r.best.passage.line}: ${r.best.passage.text}`); if(r.polarityWarning)console.log('  ! Negation vocabulary changed: inspect the meaning.'); console.log(''); }
 console.log(`Measured inference: ${inference.inferenceMs} ms. Model load: ${inference.modelLoadMs} ms.\nSimilarity is not agreement. A human must review these findings.`);
 const sha=text=>createHash('sha256').update(text).digest('hex');
 const report=makeReport({before:beforeText,after:afterText,rows,threshold:.68,inference,fingerprints:{before:sha(beforeText),after:sha(afterText)}});
 const output=path.resolve(args[2]||'review-output'); await mkdir(output,{recursive:true});
 await writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2)+'\n');
 await writeFile(path.join(output,'review.md'),reportMarkdown(report));
 console.log('\nSaved review.json and review.md. All decisions are initially unreviewed.');
}catch(error){console.error(`Cannot complete review: ${error.message}`);process.exitCode=1;}finally{if(extractor)await extractor.dispose();}
