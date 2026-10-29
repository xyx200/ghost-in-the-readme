# Third-party credits and licenses

The original app, CSS ghost illustration, examples, and writing are new for this submission and distributed under the MIT license in `LICENSE`. This license does not replace any dependency or model license.

| Component | Exact version / revision | License | Role and source |
| --- | --- | --- | --- |
| Sentence Transformers all-MiniLM-L6-v2 | Converted weights pinned below | Apache-2.0 | Pretrained English sentence encoder; [model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2). Not trained or fine-tuned by this project. |
| Xenova/all-MiniLM-L6-v2 | `751bff37182d3f1213fa05d7196b954e230abad9` | Apache-2.0 | [ONNX conversion](https://huggingface.co/Xenova/all-MiniLM-L6-v2); q8 `model_quantized.onnx`. Downloaded intact; SHA-256 hashes recorded. |
| Hugging Face Transformers.js | 3.8.1 | Apache-2.0 | Tokenization, pooling, pipeline and model execution; [source](https://github.com/huggingface/transformers.js). |
| Microsoft ONNX Runtime | 1.21.0 Node; web version locked in `package-lock.json` | MIT | CPU and WebAssembly execution; [source](https://github.com/microsoft/onnxruntime). |
| Vite | 6.1.0 | MIT | Development server and static build; [source](https://github.com/vitejs/vite). |
| Sharp | Version locked transitively by Transformers.js | Apache-2.0 | Rasterizes the evidence graphic and screenshot walkthrough; [source](https://github.com/lovell/sharp). |
| gifenc | 1.0.3 | MIT | Encodes the edited screenshot walkthrough; [source](https://github.com/mattdesl/gifenc). |

Complete dependency versions and registry integrity hashes are preserved in `package-lock.json`. Model weights, dependencies, and generated bundles are excluded from the source ZIP; the acquisition script retrieves the pinned artifacts from the official Hugging Face repository. If distributing a built app with bundled dependencies or weights, retain their upstream license notices; `licenses/` contains the primary license texts gathered for that purpose.

The interface uses installed system fonts. No stock images, third-party illustration, music, voice clone, personal data, or copied contest project is used. All sample project promises are original **fictional test fixtures**, not records of a real organization's conduct.

Public-source reference points consulted on October 29, 2026 UTC:

- [Model card and Transformers.js usage](https://huggingface.co/Xenova/all-MiniLM-L6-v2)
- [Original model and limitations](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Transformers.js local models and WASM configuration](https://huggingface.co/docs/transformers.js/custom_usage)
