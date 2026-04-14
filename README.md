# dumb-models

A desktop app for generating 3D objects from text prompts using a RAG-augmented LLM pipeline. Describe what you want, preview it live, refine iteratively, and export to Three.js or GLTF for Blender.

Built with [Tauri v2](https://tauri.app/), [React 19](https://react.dev/), [Vite 7](https://vite.dev/), and [Three.js](https://threejs.org/).

---

## How It Works

1. Type a text prompt (e.g. "a low-poly asteroid" or "a wooden table")
2. A TF-IDF RAG system retrieves similar shapes from a local dataset of ~35 examples
3. Claude generates a scene descriptor (JSON) using the retrieved examples as context
4. The 3D scene renders live in a Three.js canvas with orbit controls (rotate, zoom, pan)
5. Refine with more prompts — Claude modifies the existing scene in-place
6. Save designs to your personal library; the app learns your style over time
7. Export as GLTF (`.glb`) for Blender or copy as a Three.js code snippet

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app/) |
| Frontend | [React 19](https://react.dev/) + [Vite 7](https://vite.dev/) |
| 3D rendering | [Three.js](https://threejs.org/) (vanilla, no R3F) |
| LLM | [Anthropic Claude](https://www.anthropic.com/) via `@anthropic-ai/sdk` |
| RAG retrieval | TF-IDF cosine similarity (no external embedding API) |
| Backend | Rust (Tauri plugins: `dialog`, `fs`) |

---

## Project Structure

```
dumb-models/
├── src/
│   ├── data/
│   │   └── shapes-dataset.json     # RAG corpus: ~35 example shapes
│   ├── lib/
│   │   ├── ragRetrieval.js         # TF-IDF retrieval over base + user library
│   │   ├── claudeClient.js         # Anthropic API call + prompt builder
│   │   ├── userLibrary.js          # Persists approved designs + style brief
│   │   ├── sceneBuilder.js         # Populates a THREE.Scene from scene JSON
│   │   └── sceneExporter.js        # Export to Three.js code or GLTF binary
│   ├── hooks/
│   │   └── useSceneHistory.js      # Scene + conversation state management
│   ├── components/
│   │   ├── SceneViewer.jsx         # Three.js canvas with OrbitControls
│   │   ├── SidePanel.jsx           # Prompt input, history, settings, export
│   │   └── LibraryDrawer.jsx       # Saved designs browser
│   ├── main.jsx
│   ├── App.jsx
│   └── App.css
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── capabilities/default.json
│   ├── tauri.conf.json
│   └── Cargo.toml
├── index.html
├── vite.config.js
└── package.json
```

---

## Scene Format

The LLM outputs a JSON scene descriptor that the viewer interprets:

```json
{
  "version": "1.0",
  "prompt": "a crystal gem",
  "objects": [
    {
      "id": "gem_body",
      "geometry": { "type": "octahedron", "args": [1, 0] },
      "material": { "color": "#88ccff", "roughness": 0.1, "metalness": 0.8 },
      "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1.5, 1] }
    }
  ]
}
```

### Supported Geometry Types

| Type | Args | Good for |
|---|---|---|
| `box` | [w, h, d] | crates, walls, furniture |
| `sphere` | [r, wSeg, hSeg] | balls, planets, heads |
| `cylinder` | [rTop, rBot, h, rSeg] | pillars, trunks, poles |
| `cone` | [r, h, rSeg] | spires, hats, teeth |
| `torus` | [r, tube, rSeg, tSeg] | rings, donuts, wheels |
| `torusKnot` | [r, tube, tSeg, rSeg, p, q] | knots, fantasy shapes |
| `plane` | [w, h] | floors, walls, ground |
| `circle` | [r, seg] | flat discs |
| `ring` | [rIn, rOut, tSeg] | flat rings, halos |
| `icosahedron` | [r, detail] | low-poly spheres, gems, asteroids |
| `octahedron` | [r, detail] | crystals, diamonds |
| `tetrahedron` | [r, detail] | spikes, pyramids |
| `dodecahedron` | [r, detail] | ornaments, dice |
| `capsule` | [r, len, capSeg, rSeg] | pills, rounded cylinders |
| `lathe` | [[[x,y],...], seg] | vases, bottles, columns, chess pieces |

---

## UI Layout

```
+----------------------------------------------+
| SidePanel (380px)  | SceneViewer (flex-1)     |
|  [settings banner] |  [Three.js canvas]       |
|  [conversation]    |  [orbit controls, grid]  |
|  [textarea]        |                          |
|  [Submit][Undo]    |                          |
|  [Save][Export]    |                          |
|  [Library ▼]       |                          |
+----------------------------------------------+
| LibraryDrawer (toggleable)                   |
+----------------------------------------------+
```

---

## Preference Learning

When you click **Save to Library**, the design is stored locally and included in future RAG retrieval (weighted 2× over built-in examples). After every 3 saves, Claude generates a short style brief summarizing your preferences (e.g. "prefers medieval stone structures with rough grey materials") that gets prepended to subsequent generation prompts — no ML libraries required.

---

## Prerequisites

- [Node.js](https://nodejs.org/) LTS
- [Rust](https://www.rust-lang.org/tools/install) stable toolchain
- Tauri OS prerequisites — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)
- An [Anthropic API key](https://console.anthropic.com/)

---

## Getting Started

```bash
npm install
npm run tauri dev
```

On first launch, enter your Anthropic API key in the settings banner. The key is stored in the app's local storage — it never leaves your machine.

## Building

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/`

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server only |
| `npm run tauri dev` | Full Tauri app in dev mode |
| `npm run tauri build` | Production build |

---

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) with:
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
