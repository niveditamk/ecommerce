// @ts-check

/**
 * PYC Viewer — VS Code Custom Editor Extension
 *
 * Registers a custom read-only editor for .pyc files that shows
 * reconstructed Python source code (via pycrefine) or a bytecode
 * disassembly fallback, all inside the same editor tab.
 *
 * The original .pyc file is never modified.
 */

const vscode = require("vscode");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

// -----------------------------------------------------------------------
// Python interpreter resolution
// -----------------------------------------------------------------------

/**
 * Find a usable Python interpreter that has pycrefine installed.
 * Priority: user setting > python3.14 on PATH > python on PATH.
 * @returns {Promise<string>}
 */
async function findPython() {
  // 1. User-configured path
  const config = vscode.workspace.getConfiguration("pycViewer");
  const userPath = config.get("pythonPath");
  if (userPath && typeof userPath === "string" && userPath.trim()) {
    return userPath.trim();
  }

  // 2. Well-known Windows locations
  const localAppData = process.env.LOCALAPPDATA || "";
  const candidates = [
    path.join(localAppData, "Programs", "Python", "Python314", "python.exe"),
    path.join(localAppData, "Programs", "Python", "Python313", "python.exe"),
    path.join(localAppData, "Programs", "Python", "Python312", "python.exe"),
    path.join(localAppData, "Programs", "Python", "Python311", "python.exe"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      // Verify pycrefine is available
      try {
        await runProcess(candidate, [
          "-c",
          "import pycrefine; print(pycrefine.__version__)",
        ]);
        return candidate;
      } catch {
        // pycrefine not installed in this interpreter
      }
    }
  }

  // 3. Try python / python3 on PATH
  for (const cmd of ["python", "python3"]) {
    try {
      const result = await runProcess(cmd, [
        "-c",
        "import pycrefine; print(pycrefine.__version__)",
      ]);
      if (result.exitCode === 0) {
        return cmd;
      }
    } catch {
      // not found
    }
  }

  throw new Error(
    "Could not find a Python interpreter with pycrefine installed.\n" +
      "Install pycrefine: pip install pycrefine\n" +
      'Or set "pycViewer.pythonPath" in VS Code settings.'
  );
}

// -----------------------------------------------------------------------
// Process helpers
// -----------------------------------------------------------------------

/**
 * @typedef {{ stdout: string, stderr: string, exitCode: number }} ProcessResult
 */

/**
 * Run a process and capture output.
 * @param {string} command
 * @param {string[]} args
 * @param {string} [stdin]
 * @param {number} [timeoutMs]
 * @returns {Promise<ProcessResult>}
 */
function runProcess(command, args, stdin, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    /** @type {import("child_process").ChildProcess} */
    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      reject(new Error(`Process timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (!killed) {
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      }
    });

    if (stdin) {
      proc.stdin?.write(stdin);
    }
    proc.stdin?.end();
  });
}

// -----------------------------------------------------------------------
// Custom Editor Provider
// -----------------------------------------------------------------------

class PycViewerProvider {
  static viewType = "pycViewer.decompile";

  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this._context = context;
    /** @type {string | null} */
    this._pythonPath = null;
  }

  /**
   * Required by CustomReadonlyEditorProvider.
   * Returns a lightweight CustomDocument for the given URI.
   * @param {vscode.Uri} uri
   * @param {{ backupId?: string }} _openContext
   * @param {vscode.CancellationToken} _token
   * @returns {Promise<vscode.CustomDocument>}
   */
  async openCustomDocument(uri, _openContext, _token) {
    return { uri, dispose: () => {} };
  }

  /**
   * @param {vscode.CustomDocument} document
   * @param {vscode.WebviewPanel} webviewPanel
   * @param {vscode.CancellationToken} _token
   */
  async resolveCustomEditor(document, webviewPanel, _token) {
    // Configure webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this._context.extensionPath, "media")),
      ],
    };

    // Show loading state
    webviewPanel.webview.html = this._getLoadingHtml(
      webviewPanel.webview,
      document.uri
    );

    // Decompile in background
    try {
      const result = await this._decompile(document.uri.fsPath);
      webviewPanel.webview.html = this._getResultHtml(
        webviewPanel.webview,
        document.uri,
        result
      );
    } catch (err) {
      webviewPanel.webview.html = this._getErrorHtml(
        webviewPanel.webview,
        document.uri,
        err instanceof Error ? err.message : String(err)
      );
    }

    // Handle messages from the webview (e.g., copy button)
    webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "copy":
            await vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage("Source copied to clipboard.");
            break;
          case "reload":
            try {
              webviewPanel.webview.html = this._getLoadingHtml(
                webviewPanel.webview,
                document.uri
              );
              const result = await this._decompile(document.uri.fsPath);
              webviewPanel.webview.html = this._getResultHtml(
                webviewPanel.webview,
                document.uri,
                result
              );
            } catch (err) {
              webviewPanel.webview.html = this._getErrorHtml(
                webviewPanel.webview,
                document.uri,
                err instanceof Error ? err.message : String(err)
              );
            }
            break;
        }
      },
      undefined,
      this._context.subscriptions
    );
  }

  /**
   * Decompile a .pyc file using the Python backend.
   * @param {string} filePath
   * @returns {Promise<object>}
   */
  async _decompile(filePath) {
    if (!this._pythonPath) {
      this._pythonPath = await findPython();
    }

    const scriptPath = path.join(
      this._context.extensionPath,
      "python_backend",
      "decompile_pyc.py"
    );

    const config = vscode.workspace.getConfiguration("pycViewer");
    const beautification = config.get("beautificationLevel") || "core";

    const request = JSON.stringify({
      file: filePath,
      beautification_level: beautification,
    });

    const result = await runProcess(
      this._pythonPath,
      [scriptPath],
      request,
      60000
    );

    if (result.exitCode !== 0 && !result.stdout.trim()) {
      throw new Error(
        `Python backend exited with code ${result.exitCode}:\n${result.stderr}`
      );
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      throw new Error(
        `Invalid JSON from backend:\n${result.stdout.substring(0, 500)}\n\nStderr: ${result.stderr}`
      );
    }
  }

  // -------------------------------------------------------------------
  // HTML generation
  // -------------------------------------------------------------------

  /**
   * @param {vscode.Webview} webview
   * @param {vscode.Uri} uri
   * @returns {string}
   */
  _getLoadingHtml(webview, uri) {
    const fileName = path.basename(uri.fsPath);
    const nonce = getNonce();
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>${escapeHtml(fileName)}</title>
  <style nonce="${nonce}">
    body {
      font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--vscode-editorWidget-border, #555);
      border-top-color: var(--vscode-progressBar-background, #0078d4);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <div>Decompiling <strong>${escapeHtml(fileName)}</strong>…</div>
  </div>
</body>
</html>`;
  }

  /**
   * @param {vscode.Webview} webview
   * @param {vscode.Uri} uri
   * @param {any} result
   * @returns {string}
   */
  _getResultHtml(webview, uri, result) {
    const fileName = path.basename(uri.fsPath);
    const nonce = getNonce();

    const mode = result.mode || "error";
    const source = result.source || "";
    const diagnostics = result.diagnostics || "";
    const error = result.error || "";
    const meta = result.metadata || {};
    const pyVersion = result.python_version || "unknown";

    // Build status badge
    let statusBadge = "";
    let statusClass = "";
    if (mode === "decompiled") {
      if (diagnostics) {
        statusBadge = "⚠ Decompiled with warnings";
        statusClass = "warning";
      } else {
        statusBadge = "✓ Decompiled successfully";
        statusClass = "success";
      }
    } else if (mode === "disassembly") {
      statusBadge = "⚡ Bytecode disassembly (decompilation failed)";
      statusClass = "fallback";
    } else {
      statusBadge = "✗ Error";
      statusClass = "error";
    }

    // Metadata display
    const metaItems = [];
    metaItems.push(`Python ${escapeHtml(pyVersion)}`);
    if (meta.magic) metaItems.push(`Magic: ${meta.magic}`);
    if (meta.timestamp_human) metaItems.push(`Compiled: ${escapeHtml(meta.timestamp_human)}`);
    if (meta.source_size) metaItems.push(`Source size: ${meta.source_size} bytes`);

    // Full source with diagnostics prepended
    let fullSource = "";
    if (diagnostics) {
      fullSource = diagnostics + "\n" + source;
    } else if (error && mode === "error") {
      fullSource = `# ERROR: ${error}`;
    } else {
      fullSource = source;
    }

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>${escapeHtml(fileName)}</title>
  <style nonce="${nonce}">
    :root {
      --header-height: 44px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ---- Header bar ---- */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 16px;
      background: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-editor-background));
      border-bottom: 1px solid var(--vscode-editorWidget-border, #333);
      flex-shrink: 0;
      min-height: var(--header-height);
      gap: 12px;
      flex-wrap: wrap;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .badge {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 3px;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge.success  { background: #1a7f37; color: #fff; }
    .badge.warning  { background: #9a6700; color: #fff; }
    .badge.fallback { background: #6e40c9; color: #fff; }
    .badge.error    { background: #cf222e; color: #fff; }
    .meta {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #999);
    }
    .meta span { margin-right: 12px; }
    .header-right {
      display: flex;
      gap: 6px;
    }
    .btn {
      font-size: 12px;
      padding: 4px 10px;
      border: 1px solid var(--vscode-button-border, var(--vscode-editorWidget-border, #555));
      background: var(--vscode-button-secondaryBackground, #333);
      color: var(--vscode-button-secondaryForeground, #ccc);
      border-radius: 3px;
      cursor: pointer;
    }
    .btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #444);
    }
    .btn-primary {
      background: var(--vscode-button-background, #0078d4);
      color: var(--vscode-button-foreground, #fff);
      border-color: var(--vscode-button-background, #0078d4);
    }
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #026ec1);
    }

    /* ---- Code area ---- */
    .code-container {
      flex: 1;
      overflow: auto;
      padding: 0;
    }
    pre {
      margin: 0;
      padding: 12px 16px;
      font-family: var(--vscode-editor-font-family, 'Cascadia Code', 'Consolas', 'Courier New', monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      line-height: var(--vscode-editor-line-height, 1.5);
      white-space: pre;
      tab-size: 4;
      counter-reset: line;
    }
    .line {
      display: block;
      padding-left: 60px;
      text-indent: -60px;
      min-height: 1.5em;
    }
    .line::before {
      counter-increment: line;
      content: counter(line);
      display: inline-block;
      width: 48px;
      text-align: right;
      padding-right: 12px;
      color: var(--vscode-editorLineNumber-foreground, #666);
      user-select: none;
      text-indent: 0;
    }

    /* ---- Syntax highlighting ---- */
    .kw   { color: var(--vscode-symbolIcon-keywordForeground, #c586c0); }
    .str  { color: var(--vscode-symbolIcon-stringForeground,  #ce9178); }
    .num  { color: var(--vscode-symbolIcon-numberForeground,  #b5cea8); }
    .cmt  { color: var(--vscode-symbolIcon-commentForeground, #6a9955); font-style: italic; }
    .fn   { color: var(--vscode-symbolIcon-functionForeground,#dcdcaa); }
    .cls  { color: var(--vscode-symbolIcon-classForeground,   #4ec9b0); }
    .dec  { color: var(--vscode-symbolIcon-decoratorForeground,#d7ba7d); }
    .op   { color: var(--vscode-foreground); }
    .bi   { color: var(--vscode-symbolIcon-variableForeground, #9cdcfe); }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <span class="badge ${statusClass}">${statusBadge}</span>
      <div class="meta">
        ${metaItems.map((m) => `<span>${m}</span>`).join("")}
      </div>
    </div>
    <div class="header-right">
      <button class="btn" id="btn-reload" title="Re-decompile">↻ Reload</button>
      <button class="btn btn-primary" id="btn-copy" title="Copy source to clipboard">📋 Copy</button>
    </div>
  </div>
  <div class="code-container">
    <pre id="source-code"></pre>
  </div>

  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();
      const rawSource = ${JSON.stringify(fullSource)};
      const pre = document.getElementById('source-code');

      // ---- Minimal Python syntax highlighter ----
      const KEYWORDS = new Set([
        'False','None','True','and','as','assert','async','await',
        'break','class','continue','def','del','elif','else','except',
        'finally','for','from','global','if','import','in','is',
        'lambda','nonlocal','not','or','pass','raise','return',
        'try','while','with','yield'
      ]);
      const BUILTINS = new Set([
        'print','len','range','int','str','float','list','dict','set',
        'tuple','bool','type','isinstance','hasattr','getattr','setattr',
        'super','property','staticmethod','classmethod','enumerate',
        'zip','map','filter','sorted','reversed','any','all','min','max',
        'sum','abs','round','open','input','format','repr','id','hash',
        'callable','iter','next','vars','dir','globals','locals',
        'Exception','ValueError','TypeError','KeyError','IndexError',
        'AttributeError','RuntimeError','StopIteration','OSError',
        'FileNotFoundError','ImportError','NotImplementedError',
        'ZeroDivisionError','OverflowError','MemoryError',
        'object','bytes','bytearray','memoryview','frozenset',
        'complex','slice','Ellipsis','NotImplemented'
      ]);

      function escHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      }

      function highlightLine(line) {
        // Comment lines
        const commentMatch = line.match(/^(\\s*)(#.*)$/);
        if (commentMatch) {
          return escHtml(commentMatch[1]) + '<span class="cmt">' + escHtml(commentMatch[2]) + '</span>';
        }

        let result = '';
        let i = 0;
        while (i < line.length) {
          // Strings: triple-quoted, single/double
          if (line.startsWith('"""', i) || line.startsWith("'''", i)) {
            const q = line.substring(i, i + 3);
            let end = line.indexOf(q, i + 3);
            if (end === -1) end = line.length - 3;
            const s = line.substring(i, end + 3);
            result += '<span class="str">' + escHtml(s) + '</span>';
            i = end + 3;
            continue;
          }
          if (line[i] === '"' || line[i] === "'") {
            const q = line[i];
            let j = i + 1;
            while (j < line.length && line[j] !== q) {
              if (line[j] === '\\\\') j++;
              j++;
            }
            const s = line.substring(i, j + 1);
            result += '<span class="str">' + escHtml(s) + '</span>';
            i = j + 1;
            continue;
          }
          // Inline comment
          if (line[i] === '#') {
            result += '<span class="cmt">' + escHtml(line.substring(i)) + '</span>';
            break;
          }
          // Decorator
          if (line[i] === '@' && (i === 0 || /\\s/.test(line[i-1]))) {
            const m = line.substring(i).match(/^@[\\w.]+/);
            if (m) {
              result += '<span class="dec">' + escHtml(m[0]) + '</span>';
              i += m[0].length;
              continue;
            }
          }
          // Numbers
          if (/[0-9]/.test(line[i]) && (i === 0 || /[^\\w]/.test(line[i-1]))) {
            const m = line.substring(i).match(/^(0[xXoObB])?[\\d_]+(\\.[\\d_]+)?([eE][+-]?\\d+)?j?/);
            if (m) {
              result += '<span class="num">' + escHtml(m[0]) + '</span>';
              i += m[0].length;
              continue;
            }
          }
          // Words (keywords, builtins, identifiers)
          if (/[a-zA-Z_]/.test(line[i])) {
            const m = line.substring(i).match(/^[a-zA-Z_]\\w*/);
            if (m) {
              const word = m[0];
              if (KEYWORDS.has(word)) {
                // Check for class/def — next word is name
                if (word === 'class') {
                  result += '<span class="kw">' + escHtml(word) + '</span>';
                  i += word.length;
                  const after = line.substring(i).match(/^(\\s+)([a-zA-Z_]\\w*)/);
                  if (after) {
                    result += escHtml(after[1]) + '<span class="cls">' + escHtml(after[2]) + '</span>';
                    i += after[0].length;
                  }
                } else if (word === 'def') {
                  result += '<span class="kw">' + escHtml(word) + '</span>';
                  i += word.length;
                  const after = line.substring(i).match(/^(\\s+)([a-zA-Z_]\\w*)/);
                  if (after) {
                    result += escHtml(after[1]) + '<span class="fn">' + escHtml(after[2]) + '</span>';
                    i += after[0].length;
                  }
                } else {
                  result += '<span class="kw">' + escHtml(word) + '</span>';
                  i += word.length;
                }
              } else if (BUILTINS.has(word)) {
                result += '<span class="bi">' + escHtml(word) + '</span>';
                i += word.length;
              } else {
                // Check if it's a function call
                const afterWord = line.substring(i + word.length);
                if (afterWord.match(/^\\s*\\(/)) {
                  result += '<span class="fn">' + escHtml(word) + '</span>';
                } else {
                  result += escHtml(word);
                }
                i += word.length;
              }
              continue;
            }
          }
          // Default
          result += escHtml(line[i]);
          i++;
        }
        return result;
      }

      // Render lines
      const lines = rawSource.split('\\n');
      const fragment = document.createDocumentFragment();
      for (const line of lines) {
        const span = document.createElement('span');
        span.className = 'line';
        span.innerHTML = highlightLine(line) || ' ';
        fragment.appendChild(span);
      }
      pre.appendChild(fragment);

      // ---- Button handlers ----
      document.getElementById('btn-copy').addEventListener('click', () => {
        vscode.postMessage({ command: 'copy', text: rawSource });
      });
      document.getElementById('btn-reload').addEventListener('click', () => {
        vscode.postMessage({ command: 'reload' });
      });
    })();
  </script>
</body>
</html>`;
  }

  /**
   * @param {vscode.Webview} webview
   * @param {vscode.Uri} uri
   * @param {string} errorMessage
   * @returns {string}
   */
  _getErrorHtml(webview, uri, errorMessage) {
    const fileName = path.basename(uri.fsPath);
    const nonce = getNonce();
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';">
  <title>${escapeHtml(fileName)}</title>
  <style nonce="${nonce}">
    body {
      font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 32px;
    }
    .error-box {
      border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      padding: 16px;
      border-radius: 4px;
      max-width: 800px;
    }
    h2 { margin: 0 0 12px; color: #f48771; }
    pre {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 13px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  </style>
</head>
<body>
  <div class="error-box">
    <h2>Failed to decompile ${escapeHtml(fileName)}</h2>
    <pre>${escapeHtml(errorMessage)}</pre>
  </div>
</body>
</html>`;
  }
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function getNonce() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

/** @param {string} text */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -----------------------------------------------------------------------
// Extension lifecycle
// -----------------------------------------------------------------------

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const provider = new PycViewerProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      PycViewerProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    )
  );

  // Status bar item
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusItem.text = "$(file-binary) PYC Viewer";
  statusItem.tooltip = "PYC Viewer extension is active";
  context.subscriptions.push(statusItem);

  // Show status item when a .pyc file is active
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.uri.fsPath.endsWith(".pyc")) {
        statusItem.show();
      } else {
        statusItem.hide();
      }
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
