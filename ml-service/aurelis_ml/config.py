"""Environment resolution for the Aurelis ML service.

Every path, URL and credential the service needs is resolved here, once.
No other module invents a fallback, so there is a single place to look
when the service turns out to be pointed somewhere unexpected.

The defaults are deliberately development-shaped — the local checkout and
localhost — and the one genuine secret has no default at all. A service
that is misconfigured should refuse to start on a laptop rather than
quietly half-work against a real deployment.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Final

__all__ = [
    "ConfigError",
    "SERVICE_NAME",
    "REPO_ROOT",
    "DEFAULT_DB_PATH",
    "DB_PATH",
    "API_BASE",
    "HTTP_TIMEOUT_SECONDS",
    "MIN_DAYS_FOR_TRAINING",
    "MIN_DAYS_FOR_TREND",
    "ON_HAND_TYPES",
    "db_uri",
    "require_db",
    "api_url",
    "require_token",
    "token_state",
    "describe",
]


class ConfigError(RuntimeError):
    """Raised when the environment cannot support the run being attempted.

    Kept distinct from the sqlite and HTTP errors underneath it so the CLI
    can tell "you have not configured me" apart from "the database or the
    API is genuinely broken", and print advice instead of a stack trace.
    """


SERVICE_NAME: Final[str] = "aurelis-ml"

# Variable names are written once so a typo cannot drift between the code
# that reads the environment and the diagnostics that report what it read.
ENV_DB: Final[str] = "AURELIS_DB"
ENV_API: Final[str] = "AURELIS_API"
ENV_TOKEN: Final[str] = "AURELIS_ML_TOKEN"
ENV_TIMEOUT: Final[str] = "AURELIS_ML_HTTP_TIMEOUT"

# .../ml-service/aurelis_ml/config.py -> .../ml-service -> repository root.
PACKAGE_ROOT: Final[Path] = Path(__file__).resolve().parent
SERVICE_ROOT: Final[Path] = PACKAGE_ROOT.parent
REPO_ROOT: Final[Path] = SERVICE_ROOT.parent

# The file Node's db/index.js opens. We only ever read it.
DEFAULT_DB_PATH: Final[Path] = REPO_ROOT / "server" / ".data" / "aurelis.db"


def _env(name: str) -> str | None:
    """Read a variable, treating blank as unset.

    An empty or whitespace-only value is a mistake in a shell script, not
    an instruction to use an empty path or an empty token.
    """
    raw = os.environ.get(name)
    if raw is None:
        return None
    trimmed = raw.strip()
    return trimmed or None


def _resolve_db() -> Path:
    override = _env(ENV_DB)
    return Path(override).expanduser().resolve() if override else DEFAULT_DB_PATH


def _resolve_api() -> str:
    # Trailing slashes are stripped here so api_url() can join by one rule
    # rather than guessing whether the operator supplied one.
    return (_env(ENV_API) or "http://localhost:4000").rstrip("/")


def _resolve_timeout() -> float:
    raw = _env(ENV_TIMEOUT)
    if raw is None:
        return 30.0
    try:
        value = float(raw)
    except ValueError as exc:
        raise ConfigError(f"{ENV_TIMEOUT} must be a number of seconds, not {raw!r}.") from exc
    if value <= 0:
        raise ConfigError(f"{ENV_TIMEOUT} must be greater than zero, not {value}.")
    return value


DB_PATH: Final[Path] = _resolve_db()
API_BASE: Final[str] = _resolve_api()
HTTP_TIMEOUT_SECONDS: Final[float] = _resolve_timeout()

# Read once at import so the value is fixed for the run, and held private:
# it is never returned by describe() and never logged. See token_state().
_TOKEN: Final[str | None] = _env(ENV_TOKEN)

# ---------------------------------------------------------------------
# Numeric contract, mirrored from server/src/ml/forecast.js.
# These are duplicated rather than imported because the two runtimes
# cannot share a module. They must change in both places together, or the
# leaderboard ranks versions that were judged by different rules and the
# comparison it presents is a lie.
# ---------------------------------------------------------------------
MIN_DAYS_FOR_TRAINING: Final[int] = 28   # below this we refuse to score at all
MIN_DAYS_FOR_TREND: Final[int] = 56      # a trend model needs more than a fortnight

# inventory_transactions.new_qty carries two different quantities:
# movements that change on-hand write the on-hand balance, while
# reservation movements write the RESERVED count. Reading the column blind
# conflates them — an expiring reservation drops reserved to 0 and looks
# exactly like an empty shelf. Only these types speak about on-hand.
ON_HAND_TYPES: Final[tuple[str, ...]] = (
    "ORDER_CONFIRMED",
    "ORDER_CANCELLED",
    "STOCK_ADJUSTED",
    "GOODS_RECEIVED",
    "RETURN_RESTORED",
)


def db_uri(path: Path | str | None = None) -> str:
    """SQLite URI through which this process physically cannot write.

    mode=ro is the whole architecture in one query parameter: two
    processes writing one SQLite file is the failure being avoided, so
    Python is denied the ability rather than merely asked not to.

    Built with Path.as_uri() because a Windows path ("c:/Users/...") is
    not a valid URI on its own, and hand-encoding a stray space in
    someone's home directory is how this breaks on another machine.

    Deliberately NOT immutable=1: Node writes to this file while we read,
    and immutable promises SQLite that nothing changes — a promise broken
    by every order placed during a training run.
    """
    target = Path(path).expanduser().resolve() if path is not None else DB_PATH
    return f"{target.as_uri()}?mode=ro"


def require_db(path: Path | str | None = None) -> Path:
    """Confirm the database exists before anything tries to open it.

    sqlite's own complaint about a missing file in mode=ro is "unable to
    open database file", which never says which file it looked for.
    """
    target = Path(path).expanduser().resolve() if path is not None else DB_PATH
    if not target.exists():
        raise ConfigError(
            f"No database at {target}. Start the Node server once to create it, "
            f"or set {ENV_DB} to the file you meant."
        )
    if not target.is_file():
        raise ConfigError(
            f"{target} is not a file. {ENV_DB} should point at aurelis.db itself."
        )
    return target


def api_url(path: str) -> str:
    """Absolute URL for a Node API path such as '/api/admin/ml/versions'."""
    return f"{API_BASE}/{path.lstrip('/')}"


def require_token() -> str:
    """The internal service token, or a refusal that explains how to set it.

    There is no default and there never will be. A token baked into the
    source is a published credential the moment the repository is shared,
    and an empty-string default would let an unauthenticated POST reach
    the registry — the one place Python is allowed to change the shop.
    """
    if not _TOKEN:
        raise ConfigError(
            f"{ENV_TOKEN} is not set. The trainer posts finished versions to the Node "
            "API, which will not accept them unauthenticated. Set the same value the "
            "server was started with and try again."
        )
    return _TOKEN


def token_state() -> str:
    """Whether a token is configured, in words that are safe to print.

    Diagnostics have to answer "is it set?" without ever answering "what
    is it?" — console output gets pasted into bug reports and tickets.
    """
    if not _TOKEN:
        return "not set"
    return f"set ({len(_TOKEN)} characters)"


def describe() -> dict[str, Any]:
    """Resolved configuration, for `--status` output and run notes.

    Reports the token's state, never its value.
    """
    return {
        "service": SERVICE_NAME,
        "database": str(DB_PATH),
        "databaseExists": DB_PATH.exists(),
        "readOnly": True,
        "api": API_BASE,
        "token": token_state(),
        "httpTimeoutSeconds": HTTP_TIMEOUT_SECONDS,
        "minDaysForTraining": MIN_DAYS_FOR_TRAINING,
        "minDaysForTrend": MIN_DAYS_FOR_TREND,
    }
