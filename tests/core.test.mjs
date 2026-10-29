import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument, cosine, lexicalOverlap, comparePassages, makeReport, reportMarkdown } from '../src/core.mjs';
test('Markdown parsing preserves source lines while excluding headings and fenced code', () => {
  const p = parseDocument('# Heading\n\n- [x] Export all your notes.\n```js\nthrow new Error();\n```\n[Keyboard](https://example.com) navigation works.');
  assert.deepEqual(p.map(x => [x.line, x.text]), [[3, 'Export all your notes.'], [7, 'Keyboard navigation works.']]);
});
test('Invalid, empty and oversized documents fail explicitly', () => {
  for (const value of ['', '  ', '# A heading\n```\nonly code\n```']) assert.throws(() => parseDocument(value));
  assert.throws(() => parseDocument('x'.repeat(24001)), /exceeds/);
  assert.throws(() => parseDocument('A'.repeat(401)), /split the passage/);
  assert.throws(() => parseDocument('A simple sentence.\n'.repeat(81)), /limit/);
});

test('Fenced code closes only with the same marker and sufficient length', () => {
  for (const [opening, nested] of [['````js', '```'], ['```js', '~~~'], ['~~~~', '~~~'], ['~~~js', '```']]) {
    const closing = opening.match(/^[`~]+/)[0];
    const text = ['Prose before the block.', opening, nested, 'This code must remain excluded.', closing + ' not a close', 'More code must remain excluded.', closing, 'Prose after the block.'].join('\n');
    assert.deepEqual(parseDocument(text).map(p => [p.line, p.text]), [[1,'Prose before the block.'],[8,'Prose after the block.']]);
  }
});
test('Sentence parsing retains URLs and decimal version numbers', () => {
  const text = 'Visit https://example.com/docs before upgrading to version 1.2.3.';
  assert.equal(parseDocument(text).map(p => p.text).join(' '), text);
});
test('Cosine uses normalized geometry and rejects corrupt tensors', () => {
  assert.equal(cosine([2,0], [4,0]), 1); assert.equal(cosine([1,0], [0,1]), 0); assert.equal(cosine([1,0], [-1,0]), -1);
  assert.throws(() => cosine([0,0], [1,0])); assert.throws(() => cosine([NaN,0], [1,0])); assert.throws(() => cosine([1], [1,0]));
});
test('Same words, opposite polarity remain a review prompt', () => {
  const old = parseDocument('We do not collect personal data.', 'Before');
  const current = parseDocument('We collect personal data.', 'After');
  const [row] = comparePassages(old, current, [[1,0]], [[0.99,0.01]]);
  assert.equal(row.status, 'echo'); assert.equal(row.polarityWarning, true); assert.equal(row.exact, false);
});
test('Unchanged prose is identified and ambiguous many-to-one matches are exposed', () => {
  const before = parseDocument('The archive is private.\nThe archive is secure.', 'Before');
  const after = parseDocument('The archive is private.\nYour notes stay private.', 'After');
  const rows = comparePassages(before, after, [[1,0],[1,0.1]], [[1,0],[0.99,0.1]]);
  assert.equal(rows.find(r => r.exact).status, 'unchanged');
  assert.ok(rows.every(r => r.ambiguous));
  const shared = comparePassages(before, after.slice(0,1), [[1,0],[1,0.1]], [[1,0]]);
  assert.ok(shared.every(r => r.sharedMatch));
});
test('Threshold changes are explicit and do not create fulfillment verdicts', () => {
  const before = parseDocument('Export all your notes.', 'Before'), after = parseDocument('Download a local backup.', 'After');
  assert.equal(comparePassages(before, after, [[1,0]], [[.6,.8]], .68)[0].status, 'uncertain');
  assert.equal(comparePassages(before, after, [[1,0]], [[.6,.8]], .55)[0].status, 'echo');
  assert.throws(() => comparePassages(before, after, [[1,0]], [[.6,.8]], 2));
});
test('Lexical baseline is independent of embedding scores', () => { assert.equal(lexicalOverlap('save notes', 'download backup'), 0); assert.equal(lexicalOverlap('save notes', 'save notes'), 1); });
test('Report preserves real evidence, human notes, metadata, and warnings', () => {
  const before = parseDocument('We do not collect personal data.', 'Before'), after = parseDocument('We collect personal data.', 'After');
  const rows = comparePassages(before, after, [[1,0]], [[1,0]]);
  const report = makeReport({ before:'original', after:'current', rows, threshold:.68, decisions:{ [before[0].id]:{decision:'investigate',note:'Review policy.'} }, inference:{backend:'test fixture only'}, fingerprints:{before:'a',after:'b'} });
  assert.equal(report.findings[0].humanReview.note, 'Review policy.'); assert.equal(report.before,'original');
  assert.match(reportMarkdown(report), /Negation vocabulary changed/); assert.match(reportMarkdown(report), /investigate/);
});
