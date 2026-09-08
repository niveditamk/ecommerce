"""Convenience entry point:  python cli.py train

The command line itself lives in aurelis_ml/cli.py, because the
documented way to run it is as a module:

    .venv/Scripts/python.exe -m aurelis_ml.cli train

Both forms reach the same code. This file exists so that running the
obvious thing from inside ml-service/ works rather than producing a
confusing "No module named aurelis_ml" for someone who has not read the
README yet.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Running `python cli.py` puts ml-service/ on sys.path already; running
# it by absolute path from elsewhere does not. Adding it explicitly
# makes both work, and inserting at 0 keeps a stray aurelis_ml on the
# wider path from shadowing the checkout being worked on.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from aurelis_ml.cli import main  # noqa: E402 — must follow the sys.path fix above

if __name__ == "__main__":
    raise SystemExit(main())
