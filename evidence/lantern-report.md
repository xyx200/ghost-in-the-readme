# Ghost in the README — review ledger

Generated: 2026-10-29T17:45:49.692Z

Model: Xenova/all-MiniLM-L6-v2

Quantized sentence embeddings; mean pooling; cosine similarity. Scores are not probabilities or proof of fulfillment.

Review threshold: 0.68

### 1. GHOST · old line 6

> Every control can be reached using only a keyboard.

Nearest current passage (line 5):

> Semantic search retrieves related memories from a short description.

Cosine: **0.100** · lexical overlap: 0.059 · Close alternatives exist. · Current passage is shared by other matches.

Human review: **unreviewed**

_No note supplied._

---

### 2. GHOST · old line 9

> There are no advertisements in the archive.

Nearest current passage (line 4):

> Download your transcripts in TXT format whenever you like.

Cosine: **0.193** · lexical overlap: 0.067 · **Negation vocabulary changed — inspect meaning.** · Close alternatives exist. · Current passage is shared by other matches.

Human review: **unreviewed**

_No note supplied._

---

### 3. GHOST · old line 4

> Recordings stay on your device and never leave your computer.

Nearest current passage (line 6):

> Audio is uploaded to our cloud for processing.

Cosine: **0.418** · lexical overlap: 0.000 · **Negation vocabulary changed — inspect meaning.**

Human review: **unreviewed**

_No note supplied._

---

### 4. UNCERTAIN · old line 7

> The archive remembers the name of each person who told a story.

Nearest current passage (line 5):

> Semantic search retrieves related memories from a short description.

Cosine: **0.473** · lexical overlap: 0.053 · Close alternatives exist. · Current passage is shared by other matches.

Human review: **unreviewed**

_No note supplied._

---

### 5. ECHO · old line 8

> Search finds a memory even when you cannot remember its exact words.

Nearest current passage (line 5):

> Semantic search retrieves related memories from a short description.

Cosine: **0.705** · lexical overlap: 0.105 · **Negation vocabulary changed — inspect meaning.** · Current passage is shared by other matches.

Human review: **unreviewed**

_No note supplied._

---

### 6. ECHO · old line 5

> You can export every transcript as a plain text file.

Nearest current passage (line 4):

> Download your transcripts in TXT format whenever you like.

Cosine: **0.711** · lexical overlap: 0.056 · Current passage is shared by other matches.

Human review: **unreviewed**

_No note supplied._

---

### 7. UNCHANGED · old line 3

> Lantern preserves the stories people tell around the kitchen table.

Nearest current passage (line 3):

> Lantern preserves the stories people tell around the kitchen table.

Cosine: **1.000** · lexical overlap: 1.000

Human review: **unreviewed**

_No note supplied._

## Limits

- English short prose only; code blocks and headings are skipped.
- Similarity is not entailment. Negation and contradictory promises can look similar.
- Thresholds are editorial heuristics, not calibrated probabilities.
- One current passage can be the nearest neighbor of several old passages.
