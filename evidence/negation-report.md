# Ghost in the README — review ledger

Generated: 2026-10-29T17:45:49.698Z

Model: Xenova/all-MiniLM-L6-v2

Quantized sentence embeddings; mean pooling; cosine similarity. Scores are not probabilities or proof of fulfillment.

Review threshold: 0.68

### 1. GHOST · old line 5

> Users can delete their account and all stored records.

Nearest current passage (line 3):

> The application collects personal data.

Cosine: **0.329** · lexical overlap: 0.000 · Close alternatives exist. · Current passage is shared by other matches.

Human review: **unreviewed**

_No note supplied._

---

### 2. UNCERTAIN · old line 3

> The application does not collect personal data.

Nearest current passage (line 3):

> The application collects personal data.

Cosine: **0.635** · lexical overlap: 0.500 · **Negation vocabulary changed — inspect meaning.** · Current passage is shared by other matches.

Human review: **unreviewed**

_No note supplied._

---

### 3. ECHO · old line 4

> All features work without an internet connection.

Nearest current passage (line 4):

> An internet connection is required to use all features.

Cosine: **0.764** · lexical overlap: 0.455 · **Negation vocabulary changed — inspect meaning.**

Human review: **unreviewed**

_No note supplied._

## Limits

- English short prose only; code blocks and headings are skipped.
- Similarity is not entailment. Negation and contradictory promises can look similar.
- Thresholds are editorial heuristics, not calibrated probabilities.
- One current passage can be the nearest neighbor of several old passages.
