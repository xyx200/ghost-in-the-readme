# Ghost in the README — review ledger

Generated: 2026-10-29T17:45:49.706Z

Model: Xenova/all-MiniLM-L6-v2

Quantized sentence embeddings; mean pooling; cosine similarity. Scores are not probabilities or proof of fulfillment.

Review threshold: 0.68

### 1. UNCERTAIN · old line 4

> The application supports navigation with a keyboard.

Nearest current passage (line 4):

> Navigate the interface using keyboard shortcuts.

Cosine: **0.582** · lexical overlap: 0.182

Human review: **unreviewed**

_No note supplied._

---

### 2. ECHO · old line 3

> You can save a copy of your notes to your own computer.

Nearest current passage (line 3):

> Download your notes as a local backup.

Cosine: **0.830** · lexical overlap: 0.200

Human review: **unreviewed**

_No note supplied._

---

### 3. ECHO · old line 5

> Your notes are private and only visible to you.

Nearest current passage (line 5):

> Only you can access your private notes.

Cosine: **0.836** · lexical overlap: 0.455

Human review: **unreviewed**

_No note supplied._

## Limits

- English short prose only; code blocks and headings are skipped.
- Similarity is not entailment. Negation and contradictory promises can look similar.
- Thresholds are editorial heuristics, not calibrated probabilities.
- One current passage can be the nearest neighbor of several old passages.
