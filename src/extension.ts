import * as vscode from 'vscode';
import { getWebviewContent } from './webview';

/** The single shared preview panel. */
let panel: vscode.WebviewPanel | null = null;

/** The URI of the file currently shown in the preview. */
let currentUri: string | null = null;

/** True once the webview has sent its 'ready' signal. */
let webviewReady = false;

/** Set to true when the user explicitly closes the preview panel. */
let dismissedByUser = false;

/** Debounce timer for save-triggered recompilation. */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE_MS = 150;

let log: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  log = vscode.window.createOutputChannel('JSX Artifact Preview');
  context.subscriptions.push(log);
  log.appendLine('[activate] Extension activated');

  // --- Manual command (always works, clears dismissal) ---
  context.subscriptions.push(
    vscode.commands.registerCommand('jsxArtifactPreview.showPreviewToSide', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }
      dismissedByUser = false;
      showPreview(editor.document, context);
    })
  );

  // --- Auto-preview for loose files ---
  // On fresh document open: clear dismissal (new intent) and auto-preview.
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (isJsxOrTsx(doc) && isLooseFile(doc.uri)) {
        dismissedByUser = false;
        maybeAutoPreview(doc, context);
      }
    })
  );

  // On tab switch: follow to the new file (but respect dismissal).
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor) { return; }
      const doc = editor.document;
      if (!isJsxOrTsx(doc)) { return; }

      // If panel is open, always follow to any JSX/TSX file (loose or not).
      if (panel && !dismissedByUser) {
        showPreview(doc, context);
        return;
      }

      // If panel is not open, only auto-open for loose files.
      if (isLooseFile(doc.uri)) {
        maybeAutoPreview(doc, context);
      }
    })
  );

  // --- Hot reload on save ---
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (!panel || !webviewReady) { return; }
      if (doc.uri.toString() !== currentUri) { return; }

      if (debounceTimer) { clearTimeout(debounceTimer); }
      debounceTimer = setTimeout(async () => {
        debounceTimer = null;
        log.appendLine(`[hot-reload] File saved: ${doc.uri.fsPath}`);
        await sendCodeToWebview(doc);
      }, DEBOUNCE_MS);
    })
  );

  // --- Catch the file that triggered activation ---
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    log.appendLine(`[activate] Active editor on startup: ${activeEditor.document.uri.fsPath}`);
    maybeAutoPreview(activeEditor.document, context);
  }
}

export function deactivate() {
  if (debounceTimer) { clearTimeout(debounceTimer); }
  panel = null;
  currentUri = null;
}

// ─── Helpers ───────────────────────────────────────────────

function isJsxOrTsx(doc: vscode.TextDocument): boolean {
  return doc.languageId === 'javascriptreact' || doc.languageId === 'typescriptreact';
}

function isLooseFile(uri: vscode.Uri): boolean {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) { return true; }
  const filePath = uri.fsPath.toLowerCase();
  return !folders.some(f => filePath.startsWith(f.uri.fsPath.toLowerCase()));
}

function maybeAutoPreview(doc: vscode.TextDocument, context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('jsxArtifactPreview');
  if (!config.get<boolean>('autoPreviewLooseFiles', true)) { return; }
  if (dismissedByUser) { return; }
  if (!isJsxOrTsx(doc)) { return; }
  if (!isLooseFile(doc.uri)) { return; }

  showPreview(doc, context);
}

async function sendCodeToWebview(doc: vscode.TextDocument) {
  if (!panel || !webviewReady) { return; }
  const bytes = await vscode.workspace.fs.readFile(doc.uri);
  const code = Buffer.from(bytes).toString('utf-8');
  log.appendLine(`[send] ${doc.uri.fsPath} (${code.length} chars, lang: ${doc.languageId})`);
  panel.webview.postMessage({ type: 'update', code, languageId: doc.languageId });
}

async function showPreview(doc: vscode.TextDocument, context: vscode.ExtensionContext) {
  const uri = doc.uri.toString();
  const fileName = doc.uri.path.split('/').pop() ?? 'Preview';

  // Panel already exists — just switch content if needed.
  if (panel) {
    panel.title = `Preview: ${fileName}`;

    if (uri !== currentUri) {
      log.appendLine(`[switch] Following to: ${fileName}`);
      currentUri = uri;
      await sendCodeToWebview(doc);
    }
    return;
  }

  // Create the panel.
  log.appendLine(`[open-preview] Creating panel for: ${fileName} (lang: ${doc.languageId})`);

  currentUri = uri;
  webviewReady = false;

  panel = vscode.window.createWebviewPanel(
    'jsxArtifactPreview',
    `Preview: ${fileName}`,
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.onDidDispose(() => {
    log.appendLine(`[dispose] Panel closed by user`);
    panel = null;
    currentUri = null;
    webviewReady = false;
    dismissedByUser = true;
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  }, null, context.subscriptions);

  panel.webview.onDidReceiveMessage(
    async (msg) => {
      if (msg.type === 'ready') {
        webviewReady = true;
        log.appendLine(`[webview] Ready`);
        // Send the current file now that the webview is ready.
        if (currentUri) {
          const openDoc = vscode.workspace.textDocuments.find(d => d.uri.toString() === currentUri);
          if (openDoc) { await sendCodeToWebview(openDoc); }
        }
      } else if (msg.type === 'log') {
        log.appendLine(`[webview:${msg.level}] ${msg.message}`);
      }
    },
    null,
    context.subscriptions
  );

  const config = vscode.workspace.getConfiguration('jsxArtifactPreview');
  const injectFonts = config.get<Array<{ family: string; weight?: string | number; url: string }>>('injectFonts', []);
  panel.webview.html = getWebviewContent(panel.webview, injectFonts);
}
