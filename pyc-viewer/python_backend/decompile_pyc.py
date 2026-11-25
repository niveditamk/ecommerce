#!/usr/bin/env python3
"""
Backend script for the PYC Viewer VS Code extension.

Accepts a .pyc file path and outputs a JSON response containing
either reconstructed source code or a bytecode disassembly fallback.

Protocol (stdin/stdout JSON):
  Request:  {"file": "<absolute path to .pyc>", "beautification_level": "core"}
  Response: {"ok": true, "source": "...", "diagnostics": "...", "mode": "decompiled|disassembly|error", "python_version": "3.14", "metadata": {...}}

Security:
  - Never executes code from the .pyc file.
  - Only reads bytes; never modifies the .pyc.
  - No network access.
  - No eval/exec of untrusted content.
"""

from __future__ import annotations

import dis
import json
import marshal
import os
import struct
import sys
import time
import traceback
import types
from pathlib import Path

# ---------------------------------------------------------------------------
# Magic-number → Python version mapping (CPython public table)
# ---------------------------------------------------------------------------

_MAGIC_TO_VERSION: dict[int, str] = {}

def _build_magic_table() -> None:
    """Build the magic-number lookup from importlib if available."""
    try:
        from importlib.util import MAGIC_NUMBER as _
        # Use the internal _bootstrap_external table when available
        import importlib._bootstrap_external as _be
        if hasattr(_be, '_RAW_MAGIC_NUMBER'):
            pass  # 3.14+ changed internals; fall through
        # We'll rely on a minimal hand-maintained table for display
    except Exception:
        pass

    # Minimal map covering common versions we might encounter
    known = {
        3439: "3.8",  3413: "3.8",
        3425: "3.9",
        3439: "3.10", 3450: "3.10",
        3495: "3.11",
        3531: "3.12",
        3568: "3.13",
        3610: "3.14",
    }
    _MAGIC_TO_VERSION.update(known)

_build_magic_table()


def read_pyc_header(path: str) -> dict:
    """Read and validate the .pyc header without executing anything.

    Returns metadata dict with magic, python_version, timestamp, size.
    Raises ValueError on invalid files.
    """
    with open(path, "rb") as f:
        header = f.read(16)  # PEP 552: 16-byte header since 3.7

    if len(header) < 8:
        raise ValueError(f"File too short to be a valid .pyc: {len(header)} bytes")

    magic = struct.unpack("<H", header[0:2])[0]
    crlf = header[2:4]
    if crlf != b"\r\n":
        raise ValueError(f"Invalid .pyc magic CRLF bytes: {crlf!r}")

    # Determine Python version from magic
    version_str = _MAGIC_TO_VERSION.get(magic, None)

    # Try pycrefine's version lookup
    if version_str is None:
        try:
            from pycrefine import _get_python_version_from_magic
            ver = _get_python_version_from_magic(magic)
            if ver:
                version_str = f"{ver[0]}.{ver[1]}"
        except Exception:
            pass

    if version_str is None:
        # Try loader module
        try:
            from pycrefine.loader import version_for_magic
            ver = version_for_magic(magic)
            if ver:
                version_str = f"{ver[0]}.{ver[1]}"
        except Exception:
            pass

    if version_str is None:
        version_str = f"unknown (magic={magic})"

    # PEP 552 flags (bytes 4-7)
    flags = struct.unpack("<I", header[4:8])[0]

    metadata = {
        "magic": magic,
        "python_version": version_str,
        "flags": flags,
        "header_size": len(header),
    }

    # Traditional timestamp-based header (flags == 0)
    if flags == 0 and len(header) >= 16:
        timestamp = struct.unpack("<I", header[8:12])[0]
        source_size = struct.unpack("<I", header[12:16])[0]
        metadata["timestamp"] = timestamp
        metadata["source_size"] = source_size
        metadata["timestamp_human"] = time.strftime(
            "%Y-%m-%d %H:%M:%S", time.localtime(timestamp)
        )

    return metadata


def disassemble_pyc(path: str) -> str:
    """Produce a readable bytecode disassembly as a fallback.

    Uses Python's built-in dis module. For cross-version .pyc files,
    falls back to pycrefine's MarshalParser for raw field display.
    """
    lines: list[str] = []

    try:
        with open(path, "rb") as f:
            # Skip the 16-byte header
            f.read(16)
            code = marshal.loads(f.read())

        if isinstance(code, types.CodeType):
            import io
            buf = io.StringIO()
            dis.dis(code, file=buf)
            lines.append(f"# Bytecode disassembly of: {os.path.basename(path)}")
            lines.append(f"# Code object: {code.co_name}")
            lines.append(f"# Filename: {code.co_filename}")
            lines.append(f"# Argument count: {code.co_argcount}")
            lines.append(f"# Constants: {len(code.co_consts)}")
            lines.append(f"# Names: {list(code.co_names)}")
            lines.append("")
            lines.append(buf.getvalue())

            # Also disassemble nested code objects
            for i, const in enumerate(code.co_consts):
                if isinstance(const, types.CodeType):
                    lines.append("")
                    lines.append(f"# --- Nested code object: {const.co_name} ---")
                    buf2 = io.StringIO()
                    dis.dis(const, file=buf2)
                    lines.append(buf2.getvalue())
        else:
            lines.append(f"# Marshal produced {type(code).__name__}, not a code object")
            lines.append(repr(code)[:2000])

    except Exception as exc:
        # Try pycrefine's MarshalParser for cross-version .pyc
        lines.append(f"# Standard marshal/dis failed: {exc}")
        lines.append("")
        try:
            from pycrefine import MarshalParser, _get_python_version_from_magic
            with open(path, "rb") as f:
                magic = struct.unpack("<H", f.read(2))[0]
                f.seek(0)
                f.read(16)
                data = f.read()

            ver = _get_python_version_from_magic(magic)
            if ver is None:
                ver = (3, 14)
            parser = MarshalParser(data, target_version=ver)
            code_obj = parser.parse()
            lines.append(f"# Parsed via MarshalParser (target version {ver[0]}.{ver[1]})")
            lines.append(f"# co_name: {code_obj.co_name}")
            lines.append(f"# co_filename: {code_obj.co_filename}")

            if hasattr(code_obj, "co_consts"):
                lines.append(f"# co_consts count: {len(code_obj.co_consts)}")
            if hasattr(code_obj, "co_names"):
                lines.append(f"# co_names: {list(code_obj.co_names)}")

            # Display instructions if available
            if hasattr(code_obj, "co_code"):
                lines.append("")
                lines.append("# Raw bytecode (hex):")
                raw = code_obj.co_code if isinstance(code_obj.co_code, bytes) else b""
                for offset in range(0, len(raw), 16):
                    chunk = raw[offset : offset + 16]
                    hex_str = " ".join(f"{b:02x}" for b in chunk)
                    lines.append(f"#   {offset:6d}: {hex_str}")

        except Exception as exc2:
            lines.append(f"# MarshalParser also failed: {exc2}")
            lines.append("")
            lines.append("# Raw hex dump of first 512 bytes:")
            with open(path, "rb") as f:
                raw = f.read(512)
            for offset in range(0, len(raw), 16):
                chunk = raw[offset : offset + 16]
                hex_str = " ".join(f"{b:02x}" for b in chunk)
                ascii_str = "".join(chr(b) if 32 <= b < 127 else "." for b in chunk)
                lines.append(f"  {offset:6d}: {hex_str:<48s} {ascii_str}")

    return "\n".join(lines)


def decompile(path: str, beautification_level: str = "core") -> dict:
    """Decompile a .pyc file and return a structured result."""
    result = {
        "ok": False,
        "source": "",
        "diagnostics": "",
        "mode": "error",
        "python_version": "",
        "metadata": {},
        "error": "",
    }

    # --- Step 1: Validate file exists and read header ---
    if not os.path.isfile(path):
        result["error"] = f"File not found: {path}"
        return result

    try:
        meta = read_pyc_header(path)
        result["metadata"] = meta
        result["python_version"] = meta.get("python_version", "unknown")
    except ValueError as exc:
        result["error"] = f"Invalid .pyc header: {exc}"
        return result
    except Exception as exc:
        result["error"] = f"Header read error: {exc}"
        return result

    # --- Step 2: Attempt decompilation via pycrefine ---
    try:
        import pycrefine

        dec = pycrefine.get_decompiler(
            path, beautification_level=beautification_level
        )
        source = dec.decompile()

        # Gather diagnostics
        diags = getattr(dec, "diagnostics", [])
        diag_text = pycrefine.comment_block(diags) if diags else ""

        result["ok"] = True
        result["source"] = source
        result["diagnostics"] = diag_text
        result["mode"] = "decompiled"
        return result

    except Exception as exc:
        decompile_error = f"{type(exc).__name__}: {exc}"
        tb = traceback.format_exc()

    # --- Step 3: Fallback to bytecode disassembly ---
    try:
        disasm = disassemble_pyc(path)
        result["ok"] = True
        result["source"] = disasm
        result["diagnostics"] = (
            f"# Decompilation failed: {decompile_error}\n"
            f"# Showing bytecode disassembly as fallback.\n"
        )
        result["mode"] = "disassembly"
        return result
    except Exception as exc2:
        result["error"] = (
            f"Decompilation failed: {decompile_error}\n"
            f"Disassembly also failed: {exc2}"
        )
        return result


def main() -> None:
    """Read JSON request from stdin, process, write JSON response to stdout."""
    try:
        raw = sys.stdin.read()
        request = json.loads(raw)
    except json.JSONDecodeError as exc:
        # Also support simple file-path argument for direct CLI testing
        if len(sys.argv) > 1:
            request = {"file": sys.argv[1]}
        else:
            json.dump(
                {"ok": False, "error": f"Invalid JSON input: {exc}", "mode": "error"},
                sys.stdout,
            )
            return

    file_path = request.get("file", "")
    beautification = request.get("beautification_level", "core")

    result = decompile(file_path, beautification)
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
