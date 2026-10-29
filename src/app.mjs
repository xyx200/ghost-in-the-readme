import './style.css';
import { parseDocument, comparePassages, makeReport, reportMarkdown, DEFAULT_THRESHOLD } from './core.mjs';
import { examples } from './examples.mjs';
const $ = id => document.getElementById(id);
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let worker, request = 0, state = null, decisions = {}, busy = false;
const labels = { ghost: 'NO CLOSE ECHO', uncertain: 'FAINT ECHO · REVIEW', echo: 'POSSIBLE ECHO · REVIEW', unchanged: 'UNCHANGED WORDS' };
const setBusy = value => { busy = value; $('summon').disabled = value; $('cancel').hidden = !value; $('before').disabled = value; $('after').disabled = value; document.querySelectorAll('#examples button').forEach(b => b.disabled = value); };
const clearResults = () => { state = null; decisions = {}; $('results').hidden = true; $('error').hidden = true; $('progress').textContent = 'Ready when you are. The model loads locally on your first run.'; };
for (const example of examples) {
  const button = document.createElement('button'); button.textContent = example.title; button.title = example.subtitle;
  button.addEventListener('click', () => { $('before').value = example.before; $('after').value = example.after; clearResults(); document.querySelectorAll('#examples button').forEach(b => b.classList.toggle('selected', b === button)); });
  $('examples').append(button);
}
$('before').value = examples[0].before; $('after').value = examples[0].after; $('examples').firstChild.classList.add('selected');
for (const field of ['before', 'after']) $(field).addEventListener('input', () => { clearResults(); document.querySelectorAll('#examples button').forEach(b => b.classList.remove('selected')); });

async function fingerprint(text) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(v => v.toString(16).padStart(2, '0')).join(''); }
function stopWorker() { worker?.terminate(); worker = null; request++; setBusy(false); }
$('cancel').addEventListener('click', () => { stopWorker(); $('progress').textContent = state ? 'Cancelled. Previous results and review notes are still available.' : 'Cancelled. No report was generated.'; });
$('summon').addEventListener('click', async () => {
  try {
    $('error').hidden = true;
    const beforeText = $('before').value, afterText = $('after').value;
    const before = parseDocument(beforeText, 'Before'), after = parseDocument(afterText, 'After');
    // Input changes already invalidate the report. Re-running unchanged inputs
    // must retain the human review, including if this inference is cancelled.
    setBusy(true); $('progress').textContent = 'Waking the local model…';
    const id = ++request;
    const fingerprints = { before: await fingerprint(beforeText), after: await fingerprint(afterText) };
    if (id !== request) return;
    worker ??= new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
    worker.onerror = event => { stopWorker(); $('error').hidden = false; $('error').textContent = `The model worker stopped: ${event.message}. Run npm run prepare:offline and retry.`; $('progress').textContent = 'No AI result produced.'; };
    worker.onmessage = ({ data }) => {
      if (data.id !== id || id !== request) return;
      if (data.type === 'progress') { $('progress').textContent = data.detail; return; }
      setBusy(false);
      if (data.type === 'error') { stopWorker(); $('error').hidden = false; $('error').textContent = `Local inference failed: ${data.error}. Check that the offline model files were prepared.`; $('progress').textContent = 'No AI result produced.'; return; }
      state = { before, after, beforeText, afterText, beforeVectors: data.vectors.slice(0, before.length), afterVectors: data.vectors.slice(before.length), inference: data.metadata, fingerprints };
      $('progress').textContent = 'The archive is open. Every score below comes from this inference run.';
      render(); $('results').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    };
    worker.postMessage({ id, texts: [...before, ...after].map(p => p.text) });
  } catch (error) { setBusy(false); $('error').hidden = false; $('error').textContent = error.message; }
});
function currentRows() { return comparePassages(state.before, state.after, state.beforeVectors, state.afterVectors, Number($('threshold').value)); }
function render() {
  if (!state) return;
  const rows = currentRows(); $('results').hidden = false;
  $('run-info').textContent = `${state.inference.passages} passages · ${state.inference.inferenceMs.toLocaleString()} ms inference\nMiniLM · q8 · 384 dimensions · on this device`;
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  $('summary').innerHTML = [['ghost','without a close echo'],['uncertain','faint echoes'],['echo','possible echoes'],['unchanged','unchanged']].map(([key,label]) => `<div><b>${counts[key] || 0}</b><span>${label}</span></div>`).join('');
  $('findings').innerHTML = rows.map((row, index) => {
    const id = row.source.id, review = decisions[id] || { decision: 'unreviewed', note: '' };
    const warnings = [row.polarityWarning && 'Negation vocabulary changed — inspect the meaning.', row.ambiguous && 'Several passages are similarly close.', row.sharedMatch && 'Other old passages point to this same current passage.'].filter(Boolean);
    return `<article class="finding ${row.status}"><div class="finding-head"><span class="finding-number">${String(index + 1).padStart(2, '0')}</span><span class="status">${labels[row.status]}</span><span class="score">${row.best.score.toFixed(3)} <small>cosine</small></span></div><div class="comparison"><div><span class="source-label">THEN · LINE ${row.source.line}</span><blockquote>${escape(row.source.text)}</blockquote></div><div><span class="source-label">NEAREST NOW · LINE ${row.best.passage.line}</span><blockquote>${escape(row.best.passage.text)}</blockquote></div></div>${warnings.length ? `<p class="warning">${escape(warnings.join(' '))}</p>` : ''}<details><summary>Inspect the evidence <span>word overlap ${row.best.lexical.toFixed(3)}</span></summary><p class="evidence-note">Cosine measures semantic proximity; word overlap is Jaccard similarity. Neither proves agreement. ${row.margin === null ? 'Only one current passage.' : `Gap to runner-up: ${row.margin.toFixed(3)}.`}</p>${row.alternatives.map(a => `<p class="alternative"><b>${a.score.toFixed(3)}</b><span>Line ${a.passage.line} · ${escape(a.passage.text)}</span></p>`).join('')}</details><div class="review"><label>Human decision<select data-decision="${id}" aria-label="Decision for old line ${row.source.line}">${[['unreviewed','Not reviewed'],['keep','Keep this promise'],['retire','Retire deliberately'],['investigate','Investigate']].map(([v,l]) => `<option value="${v}" ${review.decision === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="note-label">Leave a note<input data-note="${id}" maxlength="1200" placeholder="A reason, an issue number, or a next step…" value="${escape(review.note)}" aria-label="Review note for old line ${row.source.line}"></label></div></article>`;
  }).join('');
}
$('findings').addEventListener('change', e => { const id = e.target.dataset.decision; if (id) decisions[id] = { ...(decisions[id] || { note: '' }), decision: e.target.value }; });
$('findings').addEventListener('input', e => { const id = e.target.dataset.note; if (id) decisions[id] = { ...(decisions[id] || { decision: 'unreviewed' }), note: e.target.value }; });
$('threshold').addEventListener('input', () => { $('threshold-label').textContent = Number($('threshold').value).toFixed(2); render(); });
function download(format) {
  if (!state || busy) return;
  const report = makeReport({ before: state.beforeText, after: state.afterText, rows: currentRows(), threshold: Number($('threshold').value), decisions, inference: state.inference, fingerprints: state.fingerprints });
  const blob = new Blob([format === 'json' ? JSON.stringify(report, null, 2) : reportMarkdown(report)], { type: format === 'json' ? 'application/json' : 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `ghost-review-${new Date().toISOString().slice(0,10)}.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export-md').addEventListener('click', () => download('md')); $('export-json').addEventListener('click', () => download('json'));
window.addEventListener('pagehide', () => worker?.terminate());
