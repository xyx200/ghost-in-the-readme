export const LIMITS = Object.freeze({ characters: 24000, passages: 80, passageCharacters: 400 });
export const MODEL = 'Xenova/all-MiniLM-L6-v2';
export const DEFAULT_THRESHOLD = 0.68;

export function parseDocument(text, label = 'Document') {
  if (typeof text !== 'string' || !text.trim()) throw new Error(`${label} is empty. Add a few sentences first.`);
  if (text.length > LIMITS.characters) throw new Error(`${label} exceeds ${LIMITS.characters.toLocaleString()} characters. Use a smaller excerpt.`);
  const passages = [];
  let fence = false;
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    if (/^\s*(```|~~~)/.test(raw)) { fence = !fence; continue; }
    if (fence || /^\s*(#{1,6}\s|<!--|\|?\s*:?-{3,})/.test(raw)) continue;
    const cleaned = raw.replace(/^\s*(?:[-*+]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+|>\s*)/, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[`*_]/g, '').trim();
    if (!cleaned || cleaned.length < 8) continue;
    const sentences = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(cleaned)].map(part => part.segment);
    for (const sentence of sentences) {
      const value = sentence.trim();
      if (value.length < 8) continue;
      if (value.length > LIMITS.passageCharacters) throw new Error(`${label}, line ${index + 1}: split the passage into sentences shorter than ${LIMITS.passageCharacters} characters.`);
      passages.push({ id: `${label.toLowerCase()}-${passages.length + 1}`, line: index + 1, text: value });
    }
  }
  if (!passages.length) throw new Error(`${label} has no prose to compare. Headings and fenced code are skipped.`);
  if (passages.length > LIMITS.passages) throw new Error(`${label} has ${passages.length} passages; the limit is ${LIMITS.passages}. Use a smaller excerpt.`);
  return passages;
}

export function cosine(a, b) {
  if (a.length !== b.length || !a.length) throw new Error('Embedding dimensions do not match.');
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) throw new Error('Model returned an invalid embedding.');
    dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2;
  }
  if (!aa || !bb) throw new Error('Model returned an empty embedding.');
  return Math.max(-1, Math.min(1, dot / Math.sqrt(aa * bb)));
}

export function words(text) { return new Set(text.toLowerCase().match(/[a-z0-9]+/g) || []); }
export function lexicalOverlap(a, b) {
  const aa = words(a), bb = words(b);
  const union = new Set([...aa, ...bb]);
  return union.size ? [...aa].filter(w => bb.has(w)).length / union.size : 0;
}
const normalized = text => text.toLowerCase().replace(/\s+/g, ' ').trim();
const hasNegation = text => /\b(no|not|never|without|cannot|can't|won't|don't|doesn't|removed|discontinued)\b/i.test(text);

export function comparePassages(before, after, beforeVectors, afterVectors, threshold = DEFAULT_THRESHOLD) {
  if (!Number.isFinite(threshold) || threshold < 0.35 || threshold > 0.95) throw new Error('Threshold must be between 0.35 and 0.95.');
  if (before.length !== beforeVectors.length || after.length !== afterVectors.length || !after.length) throw new Error('Passages and embeddings are misaligned.');
  const rows = before.map((old, i) => {
    const candidates = after.map((current, j) => ({ passage: current, score: cosine(beforeVectors[i], afterVectors[j]), lexical: lexicalOverlap(old.text, current.text) }))
      .sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const exact = normalized(old.text) === normalized(best.passage.text);
    const polarityWarning = !exact && hasNegation(old.text) !== hasNegation(best.passage.text);
    const margin = candidates.length > 1 ? best.score - candidates[1].score : null;
    return { source: old, best, alternatives: candidates.slice(1, 3), margin, exact, polarityWarning,
      status: exact ? 'unchanged' : best.score >= threshold ? 'echo' : best.score >= Math.min(0.42, threshold) ? 'uncertain' : 'ghost',
      ambiguous: margin !== null && margin < 0.08, sharedMatch: false };
  });
  const uses = new Map();
  for (const row of rows) uses.set(row.best.passage.id, (uses.get(row.best.passage.id) || 0) + 1);
  for (const row of rows) row.sharedMatch = uses.get(row.best.passage.id) > 1;
  return rows.sort((a, b) => Number(a.exact) - Number(b.exact) || a.best.score - b.best.score);
}

export function makeReport({ before, after, rows, threshold, decisions = {}, inference, fingerprints }) {
  return { schemaVersion: 1, title: 'Ghost in the README — review ledger', createdAt: new Date().toISOString(),
    model: MODEL, method: 'Quantized sentence embeddings; mean pooling; cosine similarity. Scores are not probabilities or proof of fulfillment.',
    threshold, inputFingerprints: fingerprints, inference,
    limitations: ['English short prose only; code blocks and headings are skipped.', 'Similarity is not entailment. Negation and contradictory promises can look similar.', 'Thresholds are editorial heuristics, not calibrated probabilities.', 'One current passage can be the nearest neighbor of several old passages.'],
    before, after, findings: rows.map(row => ({ ...row, humanReview: decisions[row.source.id] || { decision: 'unreviewed', note: '' } })) };
}

export function reportMarkdown(report) {
  const quote = s => String(s).replace(/\r?\n/g, '\n> ');
  const sections = report.findings.map((r, index) => `### ${index + 1}. ${r.status.toUpperCase()} · old line ${r.source.line}\n\n> ${quote(r.source.text)}\n\nNearest current passage (line ${r.best.passage.line}):\n\n> ${quote(r.best.passage.text)}\n\nCosine: **${r.best.score.toFixed(3)}** · lexical overlap: ${r.best.lexical.toFixed(3)}${r.polarityWarning ? ' · **Negation vocabulary changed — inspect meaning.**' : ''}${r.ambiguous ? ' · Close alternatives exist.' : ''}${r.sharedMatch ? ' · Current passage is shared by other matches.' : ''}\n\nHuman review: **${r.humanReview.decision}**\n\n${r.humanReview.note || '_No note supplied._'}`);
  return `# ${report.title}\n\nGenerated: ${report.createdAt}\n\nModel: ${report.model}\n\n${report.method}\n\nReview threshold: ${report.threshold}\n\n${sections.join('\n\n---\n\n')}\n\n## Limits\n\n${report.limitations.map(x => `- ${x}`).join('\n')}\n`;
}
