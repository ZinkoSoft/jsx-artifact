<h1 align="center">⚛ JSX Artifact Preview</h1>

<p align="center">
  <strong>Preview single-file React artifacts (.jsx &amp; .tsx) directly in VSCode — no project scaffolding required.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-007acc?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/react-18-61dafb?style=for-the-badge&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/vscode-1.80+-purple?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="VSCode 1.80+" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge" alt="Platform" />
</p>

---

<p align="center">
  <em>Open a <code>.jsx</code> or <code>.tsx</code> file from Downloads. See it rendered. No Vite, no Next.js, no setup.</em>
</p>

<p align="center"><img src="https://github.com/ZinkoSoft/jsx-artifact/raw/main/docs/preview-demo.gif" alt="Demo — open a JSX file and see it rendered instantly" width="800" /></p>

---

## Why This Exists

AI coding tools like Claude Code, ChatGPT, Copilot, and others generate single-file React artifacts (`.jsx` or `.tsx`) — a landing page, a dashboard, a component mockup — and let you open them in VSCode. But VSCode has no built-in way to render that file. You'd need to:

1. Spin up a Vite/CRA project
2. Copy the file in
3. Rename the default export
4. Start a dev server

That's a **10-minute setup for a 30-second review**.

This extension closes that gap. Open the artifact, see it rendered, iterate — right inside VSCode.

## The Solution

JSX Artifact Preview renders single-file React artifacts (`.jsx` and `.tsx`) in a VSCode side panel. TypeScript annotations are automatically stripped at preview time — no `tsconfig` needed. Same output you'd see in a browser-based artifact viewer, without leaving the editor and without project scaffolding.

---

## Features

<table>
<tr>
<td width="50%">

### Auto-Preview Loose Files
Open a `.jsx` or `.tsx` file that's **outside your workspace** (e.g. from `~/Downloads`) and the preview appears automatically. No command, no shortcut — just open the file.

</td>
<td width="50%">

### Manual Preview Anywhere
For in-workspace files, use the keyboard shortcut or the editor title-bar button to open the preview on demand.

</td>
</tr>
<tr>
<td>

### Hot Reload on Save
Save the file and the preview updates in-place. Scroll position is preserved — no jumping back to the top.

</td>
<td>

### Friendly Error Overlay
Syntax errors, missing imports, and runtime crashes show as a clean overlay card with line numbers — not a blank screen.

</td>
</tr>
<tr>
<td>

### Zero Config Required
Works out of the box. React 18, Babel, and the Phase-2 libraries (lucide-react, recharts, d3, framer-motion) are loaded from CDN inside the webview. No `node_modules`, no bundler, no config files.

</td>
<td>

### Non-Blocking Architecture
All compilation runs inside the webview process. The editor stays responsive even if your file takes seconds to compile.

</td>
</tr>
</table>

---

## Quick Start

### Install

**From `.vsix` (pre-release):**

```bash
code --install-extension jsx-artifact-preview-0.2.0.vsix
```

**From Marketplace (when published):**

```
ext install zinkosoft.jsx-artifact-preview
```

### Use

| Action | How |
|--------|-----|
| **Auto-preview** | Open any `.jsx`/`.tsx` file outside your workspace |
| **Manual preview** | <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> (Mac) / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> (Win/Linux) |
| **Title-bar button** | Click the preview icon in the editor toolbar |
| **Hot reload** | Just save the file |

---

## Configuration

All settings are under `jsxArtifactPreview.*` in your VSCode settings.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `autoPreviewLooseFiles` | `boolean` | `true` | Auto-open preview for `.jsx`/`.tsx` files outside the workspace |
| `injectFonts` | `array` | `[]` | Pre-register `@font-face` declarations in the preview (see below) |

### Custom Font Injection

If your artifacts consistently use a specific font, you can pre-register it so it's available before user code runs:

```jsonc
// settings.json
{
  "jsxArtifactPreview.injectFonts": [
    {
      "family": "Inter",
      "weight": "100 900",
      "url": "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwY.woff2"
    }
  ]
}
```

Font URLs that 404 or have CORS issues silently fall back to the system font stack.

---

## How It Works

```
┌──────────────────┐       postMessage         ┌──────────────────────────┐
│  Extension Host  │ ──────(raw source)──────▶ │     Webview (Chromium)   │
│                  │                           │                          │
│  • Reads file    │                           │  0. Boot: load React +   │
│  • Watches saves │                           │     Phase-2 libs (esm.sh)│
│  • Opens panel   │                           │  1. Strip/rewrite imports│
│                  │ ◀────(log messages)────── │  2. Rewrite exports      │
│  • Output channel│                           │  3. Babel.transform(JSX) │
│                  │                           │  4. eval() compiled code │
│                  │                           │  5. createRoot().render()│
└──────────────────┘                           └──────────────────────────┘
```

**Key design constraint:** the extension host does **no compilation**. All Babel transforms, import rewriting, and React rendering happen inside the webview's Chromium process. This guarantees the editor stays responsive regardless of file size or complexity.

---

## Import Allowlist

The preview environment supports a curated set of imports. Unknown imports fail with a clear error naming the package.

| Phase | Imports | Status |
|-------|---------|--------|
| **1** | `react`, `react-dom` | Available |
| **2** | `lucide-react`, `recharts`, `d3`, `framer-motion` | Available |
| **3 (maybe)** | `shadcn/ui`, Tailwind runtime | Under consideration |

All runtime libraries — React, ReactDOM, and the Phase-2 packages — are fetched from [esm.sh](https://esm.sh) as ESM modules on first preview load, so the initial render after extension activation makes a network round-trip (subsequent renders use the browser cache). Every package's `react`/`react-dom` peer is pinned to the same `18.3.1` deps query, which guarantees a single shared React instance across the tree (avoids the dual-React class of bug where Phase-2 components silently unmount because their hooks see a different React than the host). Transitive dependencies (`prop-types`, `react-is`, etc.) are resolved automatically — you don't need to allowlist them.

If your file declares its own `<style>` or `@font-face` inline, those work naturally — no configuration needed.

---

## Debugging

Open the **Output** panel (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd>) and select **JSX Artifact Preview** from the dropdown. The log shows:

- Every import detected and how it was rewritten
- Export transformations applied
- Babel compile timing
- Render success/failure with elapsed time
- Full error messages with stack traces
- Async failures from animation hooks, ResizeObserver, and other post-render code paths (captured via `window.onerror` / `unhandledrejection` listeners and routed to the same Output channel)

Render-time errors thrown by the user's component are caught by an internal error boundary and shown in the overlay card instead of silently unmounting the tree.

---

## Roadmap

- [x] Single-file JSX preview with React 18
- [x] Auto-preview for loose (non-workspace) files
- [x] Hot reload on save with scroll preservation
- [x] Error overlay with line numbers
- [x] Configurable font injection
- [x] Output channel logging
- [x] Expanded import allowlist (Phase 2: lucide-react, recharts, d3, framer-motion)
- [ ] VSCode theme passthrough to preview
- [ ] TypeScript-first compilation (SWC-wasm)
- [ ] Claude Code extension integration

---

## Requirements

- **VSCode** 1.80 or later
- **Internet connection** for initial load (React, Babel, and Phase-2 packages are fetched from CDN — `unpkg.com` for Babel and `esm.sh` for everything else)

---

## Contributing

1. Clone the repo
2. `npm install`
3. `npm run compile`
4. Press <kbd>F5</kbd> in VSCode to launch the Extension Development Host

```bash
# Package for distribution
npx @vscode/vsce package
```

---

## License

MIT

---

<p align="center">
  <sub>Built for fast design review loops on AI-generated React artifacts.</sub>
</p>
