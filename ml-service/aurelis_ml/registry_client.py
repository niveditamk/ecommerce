"""Handing finished versions back to Node.

This is the only seam through which Python changes anything. Training
happens here; persistence happens there. The trainer POSTs a completed
version to the Node API and Node writes it through the same
registerVersion() the JavaScript baselines use, so a Python version gets
a proper version number, lands in ml_versions beside the others, and
shows up in the existing console without a line of UI changing.

Writes go out over HTTP. Reads come back over the read-only database
connection, because the console's registry endpoints sit behind a staff
session and this service has no session — it has a service token, which
is deliberately a narrower thing.

urllib, not requests. A trainer that needs a third-party HTTP library to
post one JSON document has bought a dependency it does not need, and this
service is already heavy enough to be awkward to host.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import config
from .data import connect

__all__ = [
    "RegistryError",
    "REGISTER_PATH",
    "TOKEN_HEADER",
    "register_version",
    "ping",
    "artifact_dir",
    "save_artifact",
    "load_artifact",
    "node_leaderboard",
]

REGISTER_PATH = "/api/admin/ml/register"
TOKEN_HEADER = "X-ML-Service-Token"

# Where a trained version is kept on disk after it has been assembled.
# Under ml-service rather than beside the database: this directory is
# Python's own working state, and nothing in server/.data should be
# written by this process even when the file is not the database itself.
ARTIFACT_DIRNAME = ".artifacts"


class RegistryError(RuntimeError):
    """The registry refused the version, or could not be reached.

    Distinct from ConfigError: this means the API said no, or was not
    there. Kept apart so the CLI can tell "you have not configured me"
    from "the server rejected the work", which need different advice.
    """

    def __init__(self, message: str, *, status: int | None = None, detail: Any = None):
        super().__init__(message)
        self.status = status
        self.detail = detail


# ---------------------------------------------------------------------
# Transport
# ---------------------------------------------------------------------
def _post(path: str, body: dict[str, Any]) -> dict[str, Any]:
    """POST JSON to the Node API and return the decoded reply.

    The token goes in a header and only in a header. Never in the query
    string, where it would be written to every access log between here
    and the server, and never into an exception message, because
    exceptions get printed and pasted into bug reports.
    """
    url = config.api_url(path)
    payload = json.dumps(body).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            TOKEN_HEADER: config.require_token(),
            "User-Agent": config.SERVICE_NAME,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=config.HTTP_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8", "replace")
            return json.loads(raw) if raw.strip() else {}

    except urllib.error.HTTPError as exc:
        # Node answers with JSON on its error paths, and its message is
        # more specific than anything invented here, so it is surfaced
        # rather than flattened into "the request failed".
        raw = exc.read().decode("utf-8", "replace") if exc.fp else ""
        detail: Any = raw
        try:
            detail = json.loads(raw)
        except ValueError:
            pass
        message = detail.get("error") if isinstance(detail, dict) else None

        if exc.code in (401, 403):
            raise RegistryError(
                f"The API rejected the service token ({exc.code}). The value of "
                f"{config.ENV_TOKEN} here is not the one the server was started with. "
                "The trained version was not registered.",
                status=exc.code,
                detail=detail,
            ) from exc
        if exc.code == 404:
            raise RegistryError(
                f"{url} returned 404. The API is up but has no register route mounted, "
                "so the Node side of this seam is not deployed yet.",
                status=exc.code,
                detail=detail,
            ) from exc
        raise RegistryError(
            f"The API refused the version ({exc.code}): "
            f"{message or raw[:400] or 'no detail given'}",
            status=exc.code,
            detail=detail,
        ) from exc

    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", exc)
        if isinstance(reason, ConnectionRefusedError) or "refused" in str(reason).lower():
            raise RegistryError(
                f"Nothing is listening at {config.API_BASE} — connection refused. Start the "
                f"Node API, or set {config.ENV_API} to the right host. The training run "
                "itself was fine; only the handover failed, and the artifact has been kept."
            ) from exc
        raise RegistryError(
            f"Could not reach {config.API_BASE}: {reason}. The model was trained but not "
            "registered."
        ) from exc

    except TimeoutError as exc:
        raise RegistryError(
            f"{config.API_BASE} did not answer within {config.HTTP_TIMEOUT_SECONDS:.0f}s. "
            "The version may or may not have been recorded — check the console before "
            "registering the same run again, or a duplicate version will be created."
        ) from exc

    except json.JSONDecodeError as exc:
        raise RegistryError(
            f"{url} answered with something that is not JSON. That is usually a proxy or an "
            "HTML error page sitting in front of the API rather than the API itself."
        ) from exc


def ping() -> dict[str, Any]:
    """Is the API reachable? Answered without spending the token.

    /api/health is public, so reachability can be established without
    presenting a credential to a host that may not be ours — which
    matters the moment AURELIS_API points somewhere unexpected.
    """
    url = config.api_url("/api/health")
    try:
        request = urllib.request.Request(url, headers={"Accept": "application/json"})
        timeout = min(config.HTTP_TIMEOUT_SECONDS, 5.0)
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return {"reachable": True, "status": response.status, "api": config.API_BASE}
    except urllib.error.HTTPError as exc:
        # It answered. That is what "reachable" means here.
        return {"reachable": True, "status": exc.code, "api": config.API_BASE}
    except Exception as exc:  # noqa: BLE001 — a health probe must never raise
        return {
            "reachable": False,
            "api": config.API_BASE,
            "reason": str(getattr(exc, "reason", exc)),
        }


# ---------------------------------------------------------------------
# The handover
# ---------------------------------------------------------------------
def register_version(
    *,
    model_key: str,
    algorithm: str,
    hyperparams: dict[str, Any] | None = None,
    features: list[Any] | None = None,
    artifact: dict[str, Any] | None = None,
    train_rows: int | None = None,
    train_from: str | None = None,
    train_to: str | None = None,
    metrics: dict[str, Any] | None = None,
    notes: str | None = None,
    activate: bool = True,
) -> dict[str, Any]:
    """Register one trained version with Node.

    The version number is Node's to assign, not this service's. It is
    MAX(version)+1 over a table two runtimes write to, so choosing it here
    would be a race with every JavaScript training run — and the loser
    would not get an error, it would get a UNIQUE constraint failure
    halfway through a night's work.

    Keys are camelCase because the Node API is the consumer and this is
    its vocabulary, not because Python has changed its mind about naming.
    """
    body = {
        "modelKey": model_key,
        # ml_models.runtime is node|python. The registry was built
        # runtime-agnostic precisely so this line is the whole of what
        # makes a Python version different from a JavaScript one.
        "runtime": "python",
        "algorithm": algorithm,
        "hyperparams": hyperparams or {},
        "features": features or [],
        "artifact": artifact or {},
        "trainRows": train_rows,
        "trainFrom": train_from,
        "trainTo": train_to,
        "metrics": metrics or {},
        "notes": notes,
        "activate": bool(activate),
    }

    started = time.monotonic()
    result = _post(REGISTER_PATH, body)
    result.setdefault("elapsedMs", int((time.monotonic() - started) * 1000))
    return result


# ---------------------------------------------------------------------
# Local artifact store
# ---------------------------------------------------------------------
# What was sent is also kept here, for two reasons. /forecast can then
# serve from the trained parameters without a round trip to Node, and a
# failed handover becomes a recoverable training run rather than an
# hour of arithmetic thrown away.
def artifact_dir() -> Path:
    return config.SERVICE_ROOT / ARTIFACT_DIRNAME


def save_artifact(model_key: str, payload: dict[str, Any]) -> Path:
    """Write the payload to disk, atomically.

    Written under a temporary name and renamed into place because
    /forecast reads this file: a reader arriving mid-write must see the
    previous version whole rather than half of the new one.
    """
    directory = artifact_dir()
    directory.mkdir(parents=True, exist_ok=True)

    stamped = dict(payload)
    stamped.setdefault("modelKey", model_key)
    stamped.setdefault("savedAt", datetime.now(timezone.utc).isoformat(timespec="seconds"))
    body = json.dumps(stamped, indent=2, default=str)

    final = directory / f"{model_key}.latest.json"
    temporary = directory / f"{model_key}.latest.json.tmp"
    temporary.write_text(body, encoding="utf-8")
    temporary.replace(final)

    # A dated copy as well, so last week's model can be compared against
    # this one without asking the API for an artifact it stores as a
    # single long JSON string.
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    (directory / f"{model_key}.{stamp}.json").write_text(body, encoding="utf-8")
    return final


def load_artifact(model_key: str) -> dict[str, Any] | None:
    """The most recently saved local artifact, or None if there is none."""
    path = artifact_dir() / f"{model_key}.latest.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        # A truncated or unreadable artifact is the same situation as no
        # artifact: there is nothing here that can honestly be served.
        return None


# ---------------------------------------------------------------------
# Reading the registry back
# ---------------------------------------------------------------------
def node_leaderboard(model_key: str = "demand_forecast") -> dict[str, Any]:
    """What Node's own training runs recorded, read straight from the tables.

    Not fetched over HTTP: /api/admin/ml/* requires a staff session and
    this service holds a service token instead. The read-only connection
    is already the sanctioned way in, and this is exactly the kind of
    read it exists for.
    """
    with connect() as db:
        run = db.execute(
            """
            SELECT id, status, winner, candidates, rows_used, skus, message,
                   started_at, finished_at, duration_ms
              FROM ml_runs
             WHERE model_key = ? AND status = 'succeeded'
             ORDER BY id DESC LIMIT 1
            """,
            (model_key,),
        ).fetchone()

        active = db.execute(
            "SELECT * FROM ml_versions WHERE model_key = ? AND is_active = 1",
            (model_key,),
        ).fetchone()

        versions = db.execute(
            """
            SELECT v.id, v.version, v.algorithm, v.mae, v.rmse, v.smape, v.wape,
                   v.cumulative_error, v.cumulative_bias, v.is_active, v.train_rows,
                   v.train_from, v.train_to, v.created_at, m.runtime
              FROM ml_versions v JOIN ml_models m ON m.key = v.model_key
             WHERE v.model_key = ?
             ORDER BY v.version DESC LIMIT 25
            """,
            (model_key,),
        ).fetchall()

    candidates: list[dict[str, Any]] = []
    if run is not None and run["candidates"]:
        try:
            candidates = json.loads(run["candidates"])
        except ValueError:
            candidates = []

    return {
        "modelKey": model_key,
        "run": dict(run) if run is not None else None,
        "candidates": candidates,
        "active": dict(active) if active is not None else None,
        "versions": [dict(v) for v in versions],
    }


def registry_reachable() -> dict[str, Any]:
    """Combined view for /health: can we read, and can we write?

    Deliberately reports the two directions separately. Reading works
    from a file; writing needs a running API and a matching token, and a
    service that can read but not register is half-broken in a way worth
    seeing before a training run rather than after one.
    """
    out: dict[str, Any] = {"api": ping(), "token": config.token_state()}
    try:
        with connect() as db:
            row = db.execute("SELECT COUNT(*) AS n FROM ml_versions").fetchone()
        out["database"] = {"reachable": True, "path": str(config.DB_PATH), "versions": row["n"]}
    except Exception as exc:  # noqa: BLE001 — health must never raise
        out["database"] = {"reachable": False, "path": str(config.DB_PATH), "reason": str(exc)}
    return out
