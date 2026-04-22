import * as vscode from 'vscode';

/**
 * Build font-face CSS from user-configured injectFonts entries.
 */
function buildFontFaceCSS(fonts: Array<{ family: string; weight?: string | number; url: string }>): string {
  return fonts.map(f => {
    const weight = f.weight ?? 400;
    return `@font-face {
  font-family: '${f.family}';
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;
  src: url('${f.url}') format('woff2');
}`;
  }).join('\n');
}

/**
 * Return the full HTML for the preview webview.
 *
 * All compilation and rendering happens in-browser via Babel Standalone.
 * The extension host never runs Babel — it only posts raw source code.
 */
export function getWebviewContent(
  _webview: vscode.Webview,
  injectFonts: Array<{ family: string; weight?: string | number; url: string }>
): string {
  const fontFaceCSS = buildFontFaceCSS(injectFonts);

  return /*html*/`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    /* ── Baseline reset ── */
    *, *::before, *::after { box-sizing: border-box; }
    html, body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    body {
      background: #ffffff;
      color: #1a1a1a;
    }
    body.vscode-dark {
      background: #1e1e1e;
      color: #d4d4d4;
    }
    body.vscode-high-contrast {
      background: #000000;
      color: #ffffff;
    }

    ${fontFaceCSS}

    /* ── Status indicators ── */
    #status-overlay {
      display: none;
      position: fixed;
      top: 12px;
      right: 12px;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-family: system-ui, sans-serif;
      z-index: 100000;
      pointer-events: none;
      background: rgba(0,0,0,0.7);
      color: #fff;
    }
    body.vscode-dark #status-overlay {
      background: rgba(255,255,255,0.15);
    }

    /* ── Error card ── */
    #error-card {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 99999;
      background: rgba(0,0,0,0.5);
      justify-content: center;
      align-items: center;
    }
    #error-card.visible {
      display: flex;
    }
    #error-card-inner {
      background: #1e1e1e;
      color: #d4d4d4;
      border: 1px solid #f44336;
      border-radius: 8px;
      padding: 20px 28px;
      max-width: 600px;
      width: 90%;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 13px;
      line-height: 1.6;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    #error-card-inner h3 {
      margin: 0 0 8px 0;
      color: #f44336;
      font-size: 14px;
      font-family: system-ui, sans-serif;
    }
    #error-card-inner pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    #error-card-inner button {
      margin-top: 14px;
      padding: 6px 16px;
      border: 1px solid #555;
      border-radius: 4px;
      background: #2d2d2d;
      color: #d4d4d4;
      cursor: pointer;
      font-size: 12px;
    }
    #error-card-inner button:hover {
      background: #3d3d3d;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="status-overlay">Compiling...</div>
  <div id="error-card">
    <div id="error-card-inner">
      <h3 id="error-type">Error</h3>
      <pre id="error-message"></pre>
      <button id="error-dismiss">Dismiss</button>
    </div>
  </div>

  <!-- React 18 (UMD builds — exposes window.React, window.ReactDOM) -->
  <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js" crossorigin></script>

  <!-- Babel Standalone for in-browser JSX compilation -->
  <script src="https://unpkg.com/@babel/standalone@7.26.10/babel.min.js" crossorigin></script>

  <script>
    // ─── Globals ────────────────────────────────────────
    const vscodeApi = acquireVsCodeApi();
    const rootEl = document.getElementById('root');
    const statusOverlay = document.getElementById('status-overlay');
    const errorCard = document.getElementById('error-card');
    const errorType = document.getElementById('error-type');
    const errorMessage = document.getElementById('error-message');
    const errorDismiss = document.getElementById('error-dismiss');

    let reactRoot = null;
    let lastGoodRender = null;

    // ─── Logging ────────────────────────────────────────
    // Sends log messages to the extension host Output Channel.
    function log(level, msg) {
      vscodeApi.postMessage({ type: 'log', level: level, message: msg });
    }

    // ─── Phase 1 import allowlist ───────────────────────
    const ALLOWED_IMPORTS = {
      'react': 'React',
      'react-dom': 'ReactDOM',
      'react-dom/client': 'ReactDOM',
      'react/jsx-runtime': 'React',
    };

    // ─── Error display ──────────────────────────────────
    function showError(type, message) {
      errorType.textContent = type;
      errorMessage.textContent = message;
      errorCard.classList.add('visible');
      log('error', type + ': ' + message);
    }

    function hideError() {
      errorCard.classList.remove('visible');
    }

    errorDismiss.addEventListener('click', hideError);

    function showStatus(text) {
      statusOverlay.textContent = text;
      statusOverlay.style.display = 'block';
    }

    function hideStatus() {
      statusOverlay.style.display = 'none';
    }

    // ─── Import processing ──────────────────────────────

    /**
     * Process import statements:
     * - Strip or rewrite allowed imports to global references
     * - Reject disallowed imports with a clear error
     * Returns { processedCode, error }
     */
    function processImports(code) {
      const lines = code.split('\\n');
      const processed = [];
      // Track named imports so we can declare them from globals
      const declarations = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match: import X from 'pkg'  |  import { X, Y } from 'pkg'  |  import 'pkg'
        const importMatch = line.match(
          /^\\s*import\\s+(?:([\\s\\S]*?)\\s+from\\s+)?['\"]([^'\"]+)['\"]\\s*;?\\s*$/
        );

        if (!importMatch) {
          processed.push(line);
          continue;
        }

        const importClause = importMatch[1] || '';
        const packageName = importMatch[2];

        log('info', 'Import found (line ' + (i + 1) + '): ' + packageName + (importClause ? ' [' + importClause.trim() + ']' : ' [side-effect]'));

        // Check if this is an allowlisted import
        const globalName = ALLOWED_IMPORTS[packageName];
        if (globalName === undefined) {
          // Check for relative imports
          if (packageName.startsWith('.') || packageName.startsWith('/')) {
            return {
              processedCode: null,
              error: 'Import not found: Relative imports (' + packageName + ') are not supported in single-file preview mode.'
            };
          }
          return {
            processedCode: null,
            error: 'Import not found: "' + packageName + '" is not in the allowed import list.\\n\\nAllowed imports (Phase 1): react, react-dom\\n\\nPhase 2 will add: lucide-react, recharts, d3, framer-motion'
          };
        }

        // If it's a bare side-effect import (import 'react'), just skip it
        if (!importClause) { continue; }

        // Parse the import clause to generate variable declarations
        // Handle: default import, named imports, or both
        const defaultAndNamed = importClause.match(
          /^([\\w$]+)?\\s*,?\\s*(?:\\{\\s*([^}]*)\\s*\\})?\\s*(?:\\*\\s+as\\s+([\\w$]+))?$/
        );

        if (defaultAndNamed) {
          const [, defaultImport, namedImports, namespaceImport] = defaultAndNamed;

          if (namespaceImport) {
            declarations.push('const ' + namespaceImport + ' = ' + globalName + ';');
          }
          if (defaultImport && defaultImport !== globalName) {
            declarations.push('const ' + defaultImport + ' = ' + globalName + ';');
          }
          if (namedImports) {
            const names = namedImports.split(',').map(n => n.trim()).filter(Boolean);
            for (const name of names) {
              const parts = name.split(/\\s+as\\s+/);
              const original = parts[0].trim();
              const alias = (parts[1] || original).trim();
              declarations.push('const ' + alias + ' = ' + globalName + '.' + original + ';');
            }
          }
        }
        // Line is consumed — don't add to processed
      }

      // Prepend declarations after import stripping
      const finalCode = [...declarations, ...processed].join('\\n');
      log('info', 'Import processing complete: ' + declarations.length + ' declarations generated');
      return { processedCode: finalCode, error: null };
    }

    // ─── Strip TypeScript type annotations (lightweight) ─
    function stripTypeAnnotations(code) {
      log('info', 'Stripping TypeScript annotations (TSX mode)');
      // Remove: interface X { ... }, type X = ..., enum X { ... }
      code = code.replace(/^\\s*(?:export\\s+)?(?:interface|type|enum)\\s+[\\s\\S]*?(?:;|\\})/gm, '');
      // Remove type imports
      code = code.replace(/^\\s*import\\s+type\\s+.*$/gm, '');
      // Remove inline type annotations: (x: string) -> (x), : React.FC<...> -> empty
      // This is a rough pass — handles the common cases in Claude artifacts
      // NOTE: object literal patterns {[^}]*} intentionally excluded — too dangerous
      code = code.replace(/:\\s*(?:React\\.\\w+(?:<[^>]*>)?|string|number|boolean|any|void|null|undefined|object|never|unknown|Array<[^>]*>|Record<[^>]*>|[A-Z]\\w*(?:<[^>]*>)?)(\\s*[,)=;{])/g, '$1');
      // Remove generic type params from function declarations: <T extends X>
      code = code.replace(/<(?:[A-Z]\\w*(?:\\s+extends\\s+[^>]*)?,?\\s*)+>(?=\\s*\\()/g, '');
      // Remove 'as Type' casts
      code = code.replace(/\\s+as\\s+[A-Z]\\w*(?:<[^>]*>)?/g, '');
      return code;
    }

    // ─── Rewrite export statements for eval() ───────────
    // Babel with react preset does NOT transform ES module syntax.
    // We rewrite exports manually before Babel, so eval() can execute
    // the result.
    function rewriteExports(code) {
      // export default function Name(...) → function Name(...) ... ; var __defaultExport = Name;
      // export default function(...) → var __defaultExport = function(...)
      // export default class Name → class Name ... ; var __defaultExport = Name;
      // export default expr → var __defaultExport = expr;
      // export { X as default } → (handled below)
      // export const/let/var X = ... → const/let/var X = ...;

      const lines = code.split('\\n');
      const output = [];
      let defaultExportName = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // export default function Name(
        const namedFnMatch = line.match(/^(\\s*)export\\s+default\\s+function\\s+([\\w$]+)/);
        if (namedFnMatch) {
          defaultExportName = namedFnMatch[2];
          output.push(line.replace(/export\\s+default\\s+/, ''));
          log('info', 'Export rewrite (line ' + (i + 1) + '): export default function ' + defaultExportName + ' → function ' + defaultExportName);
          continue;
        }

        // export default class Name
        const namedClassMatch = line.match(/^(\\s*)export\\s+default\\s+class\\s+([\\w$]+)/);
        if (namedClassMatch) {
          defaultExportName = namedClassMatch[2];
          output.push(line.replace(/export\\s+default\\s+/, ''));
          log('info', 'Export rewrite (line ' + (i + 1) + '): export default class ' + defaultExportName);
          continue;
        }

        // export default anonymous function/arrow/expression
        const defaultExprMatch = line.match(/^(\\s*)export\\s+default\\s+/);
        if (defaultExprMatch) {
          defaultExportName = '__defaultExport';
          output.push(line.replace(/export\\s+default\\s+/, 'var __defaultExport = '));
          log('info', 'Export rewrite (line ' + (i + 1) + '): export default <expr> → var __defaultExport = <expr>');
          continue;
        }

        // export const/let/var → strip 'export'
        const namedExportMatch = line.match(/^(\\s*)export\\s+(const|let|var|function|class)\\s/);
        if (namedExportMatch) {
          output.push(line.replace(/export\\s+/, ''));
          log('info', 'Export rewrite (line ' + (i + 1) + '): stripped export keyword');
          continue;
        }

        output.push(line);
      }

      return { code: output.join('\\n'), defaultExportName: defaultExportName };
    }

    // ─── Compile and render ─────────────────────────────
    let currentLanguageId = 'javascriptreact';

    function compileAndRender(code) {
      // Empty or whitespace-only file — show a placeholder, not an error.
      if (!code || !code.trim()) {
        hideError();
        hideStatus();
        if (reactRoot) { reactRoot.unmount(); reactRoot = null; }
        rootEl.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:center;height:100vh;opacity:0.4;font-family:system-ui,sans-serif;font-size:15px;text-align:center;padding:24px;">' +
          'Waiting for JSX...<br>Save the file to see a preview.' +
          '</div>';
        log('info', 'Empty file — showing placeholder');
        return;
      }

      showStatus('Compiling...');
      const t0 = performance.now();

      try {
        log('info', '── Compile started (' + code.length + ' chars, lang: ' + currentLanguageId + ') ──');

        // Only strip TS annotations for .tsx files — the regex is too
        // aggressive for plain JSX (it mangles object literals).
        if (currentLanguageId === 'typescriptreact') {
          code = stripTypeAnnotations(code);
        }

        // Process imports (strip/rewrite to globals)
        const { processedCode, error: importError } = processImports(code);
        if (importError) {
          showError('Import not found', importError);
          hideStatus();
          return;
        }

        // Rewrite export statements so eval() can handle them
        const { code: exportRewritten, defaultExportName } = rewriteExports(processedCode);

        if (!defaultExportName) {
          showError('Missing export', 'No default export found. The file must export a React component as the default export.\\n\\nExample: export default function App() { ... }');
          hideStatus();
          return;
        }

        log('info', 'Default export identifier: ' + defaultExportName);

        // Compile JSX with Babel
        log('info', 'Running Babel transform...');
        const compiled = Babel.transform(exportRewritten, {
          presets: ['react'],
          filename: 'artifact.jsx',
        });

        log('info', 'Babel transform complete (' + compiled.code.length + ' chars output)');

        // Wrap in a function scope to execute safely.
        // The rewriteExports step has already converted:
        //   export default function App → function App
        //   export default <expr>      → var __defaultExport = <expr>
        // So we just eval and pull out the named binding.
        const wrappedCode =
          '(function(React, ReactDOM) {\\n' +
          compiled.code + '\\n' +
          'return ' + defaultExportName + ';\\n' +
          '})(React, ReactDOM)';

        log('info', 'Evaluating compiled code...');
        const Component = eval(wrappedCode);

        if (typeof Component !== 'function') {
          showError('Invalid export', 'The default export is not a React component (got ' + typeof Component + ').\\n\\nThe default export must be a function or class component.');
          hideStatus();
          return;
        }

        // Mount the component
        hideError();

        // Preserve scroll position
        const scrollY = window.scrollY;

        if (!reactRoot) {
          reactRoot = ReactDOM.createRoot(rootEl);
        }

        reactRoot.render(React.createElement(Component));
        lastGoodRender = Component;

        // Restore scroll after render
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });

        const elapsed = (performance.now() - t0).toFixed(1);
        log('info', '── Render complete (' + elapsed + 'ms) ──');
        hideStatus();

      } catch (err) {
        // Determine error type
        let type = 'Runtime error';
        let message = err.message || String(err);

        if (message.includes('SyntaxError') || (err instanceof SyntaxError)) {
          type = 'Syntax error';
        }

        // Try to extract line number from Babel errors
        const lineMatch = message.match(/\\((\\d+):(\\d+)\\)/);
        if (lineMatch) {
          message = 'Line ' + lineMatch[1] + ', Column ' + lineMatch[2] + ':\\n' + message;
        }

        log('error', type + ': ' + message);
        showError(type, message);
        hideStatus();
      }
    }

    // ─── Message listener ───────────────────────────────
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'update') {
        if (msg.languageId) { currentLanguageId = msg.languageId; }
        compileAndRender(msg.code);
      }
    });

    // ─── Signal readiness to the extension host ─────────
    log('info', 'Webview loaded, signalling ready');
    vscodeApi.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}
