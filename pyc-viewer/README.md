# PYC Viewer — Python Bytecode Decompiler for VS Code

**One-click readable `.pyc` viewing** directly inside VS Code. Click any `.pyc` file and see reconstructed Python source code — the filename stays unchanged, no separate `.py` file is created.

## Features

- **Custom Editor**: Opens `.pyc` files in a dedicated read-only viewer — no binary gibberish.
- **Source Reconstruction**: Uses [pycrefine](https://pypi.org/project/pycrefine/) to reconstruct readable Python source from bytecode.
- **Syntax Highlighting**: Python keywords, strings, numbers, comments, decorators, and function names are highlighted using your VS Code theme colors.
- **Diagnostic Warnings**: Clearly shows which parts of the code could not be fully reconstructed.
- **Bytecode Fallback**: If decompilation fails, displays a readable bytecode disassembly instead.
- **Copy to Clipboard**: One-click copy of the reconstructed source.
- **Metadata Header**: Shows Python version, magic number, and compilation timestamp.
- **Cross-Version**: Handles `.pyc` files from Python 3.8–3.14+.
- **Read-Only**: Never modifies, renames, or deletes the original `.pyc` file.
- **Offline**: No internet, no API keys, no cloud accounts needed.
- **Secure**: Never executes code from `.pyc` files.

## Requirements

1. **Python 3.11+** installed on your system.
2. **pycrefine** package installed:

   ```bash
   pip install pycrefine
   ```

3. **VS Code** 1.80 or later.

## Installation

### From the pre-built `.vsix` file

```powershell
# From this project's directory:
code --install-extension pyc-viewer-1.0.0.vsix
```

Then **reload VS Code** (Ctrl+Shift+P → "Developer: Reload Window").

### Build from source

```powershell
cd pyc-viewer
npm install
npx @vscode/vsce package --no-dependencies
code --install-extension pyc-viewer-1.0.0.vsix
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `pycViewer.pythonPath` | *(auto-detect)* | Absolute path to a Python interpreter with pycrefine. |
| `pycViewer.beautificationLevel` | `core` | Beautification level: `none`, `core`, or `aggressive`. |

### Setting the Python path

If auto-detection doesn't find your Python, add this to your VS Code `settings.json`:

```json
{
  "pycViewer.pythonPath": "C:\\Users\\nived\\AppData\\Local\\Programs\\Python\\Python314\\python.exe"
}
```

## Usage

1. Open any folder containing `.pyc` files in VS Code.
2. Click a `.pyc` file in the Explorer sidebar.
3. The file opens with reconstructed Python source code.
4. Use the **Copy** button to copy the source.
5. Use the **Reload** button to re-decompile.

## How It Works

```
┌─────────────┐    JSON stdin     ┌──────────────────┐
│  VS Code    │ ────────────────► │  Python Backend   │
│  Extension  │                   │  decompile_pyc.py │
│  (Node.js)  │ ◄──────────────── │  (pycrefine)      │
└─────────────┘    JSON stdout    └──────────────────┘
       │
       ▼
  Webview with syntax-highlighted source
```

1. The extension registers a Custom Editor for `*.pyc` files.
2. When you open a `.pyc`, it spawns a Python subprocess.
3. The Python backend reads the `.pyc` header, validates it, and decompiles via pycrefine.
4. The result (source + diagnostics) is returned as JSON.
5. The extension renders it in a webview with syntax highlighting.
6. If decompilation fails, a bytecode disassembly is shown instead.

## Troubleshooting

- **"Could not find a Python interpreter"**: Set `pycViewer.pythonPath` in settings.
- **Garbled output**: Ensure pycrefine is installed: `pip install pycrefine`.
- **Warnings about unsupported opcodes**: This is expected for cutting-edge Python 3.14 features. The decompiler will reconstruct what it can and show warnings for the rest.

## License

MIT
