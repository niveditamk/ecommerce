"""HTTP surface for the Aurelis ML service.

    .venv/Scripts/python.exe app.py
    .venv/Scripts/python.exe -m flask --app app run --host 127.0.0.1 --port 5001

THIS SERVICE MUST NEVER BE EXPOSED TO A BROWSER. It has no session, no
CSRF protection, no rate limiting and no user model — it authenticates
one caller, the Node API, with one shared secret. It binds to 127.0.0.1
by default and should stay that way: the public surface of this platform
is the Node app at /api/admin/ml, which sits behind a proper staff
session and the existing permission guards.

The CLI does everything here without a server, and on a small host that
is the better way to run it: see the note on footprint in README.md.
Routes exist for the cases where something genuinely has to ask a
question live.

Nothing from the numerical modules is imported at module level. /health
has to answer while the rest of the service is broken, and a liveness
probe that first pulls numpy and scikit-learn into memory is how a
512MB instance dies during a deploy.
"""

from __future__ import annotations

import hmac
import platform
import sys
from functools import wraps
from typing import Any, Callable

from flask import Flask, jsonify, request

MODEL_KEY = "demand_forecast"
DEFAULT_HORIZONS = [7, 14, 30, 60, 90]
TOKEN_HEADER = "X-ML-Service-Token"

# Reported by /health so an operator can confirm the box is running the
# versions the models were trained against. Read from installed
# metadata rather than by importing the packages — a health check should
# not cost 200MB of resident memory.
TRACKED_PACKAGES = ("numpy", "scipy", "scikit-learn", "flask")


# ---------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------
def _token_configured() -> bool:
    """Whether a token exists at all — asked without ever reading its value."""
    from aurelis_ml import config

    try:
        config.require_token()
        return True
    except config.ConfigError:
        return False


def _token_ok() -> bool:
    """Constant-time comparison of the presented token against the configured one.

    compare_digest rather than ==, because a plain string comparison
    returns early on the first wrong byte and leaks the prefix to anyone
    patient enough to time it. Cheap to do correctly, so it is done
    correctly.
    """
    from aurelis_ml import config

    presented = request.headers.get(TOKEN_HEADER, "")
    if not presented:
        return False
    try:
        expected = config.require_token()
    except config.ConfigError:
        return False
    return hmac.compare_digest(presented, expected)


def guarded(*, mutating: bool) -> Callable:
    """Require the service token.

    Mutating routes always require it. Read routes require it whenever a
    token is configured at all — defence in depth, because the only other
    thing protecting them is the loopback bind, and a bind is one
    careless --host away from being wrong. A service with no token
    configured cannot register anything anyway, so leaving reads open in
    that case costs nothing and keeps a fresh checkout usable.
    """

    def decorate(view: Callable) -> Callable:
        @wraps(view)
        def wrapper(*args: Any, **kwargs: Any):
            if (mutating or _token_configured()) and not _token_ok():
                return (
                    jsonify(
                        {
                            "error": f"A valid {TOKEN_HEADER} header is required.",
                            "hint": (
                                "This service is internal. Set AURELIS_ML_TOKEN to the same "
                                "value the Node API was started with."
                            ),
                        }
                    ),
                    401,
                )
            return view(*args, **kwargs)

        return wrapper

    return decorate


# ---------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------
def create_app() -> Flask:
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False

    # No CORS headers anywhere, deliberately. There is no browser origin
    # that should be able to reach this, and adding a permissive header
    # "just for local development" is how an internal service ends up
    # callable from a shop page.
    @app.after_request
    def no_store(response):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    # -----------------------------------------------------------------
    # Errors
    # -----------------------------------------------------------------
    @app.errorhandler(Exception)
    def handle(exc: Exception):
        from aurelis_ml.cli import ComponentMissing
        from aurelis_ml.config import ConfigError
        from aurelis_ml.registry_client import RegistryError
        from werkzeug.exceptions import HTTPException

        if isinstance(exc, HTTPException):
            return jsonify({"error": exc.description, "code": exc.code}), exc.code
        if isinstance(exc, ComponentMissing):
            # Not built yet is a 503: the request was fine, the service
            # is incomplete. A 500 would send someone hunting for a bug
            # in their own call.
            return jsonify({"error": str(exc), "code": "NOT_BUILT"}), 503
        if isinstance(exc, ConfigError):
            return jsonify({"error": str(exc), "code": "MISCONFIGURED"}), 503
        if isinstance(exc, RegistryError):
            # The training itself may well have succeeded; it is the
            # handover to Node that failed, and 502 says so.
            return jsonify({"error": str(exc), "code": "REGISTRY_UNREACHABLE"}), 502

        app.logger.exception("unhandled error")
        return jsonify({"error": f"{type(exc).__name__}: {exc}"}), 500

    # -----------------------------------------------------------------
    # GET /health
    # -----------------------------------------------------------------
    @app.get("/health")
    def health():
        """Is the service up, and can it see what it needs?

        Unauthenticated on purpose: a health check that needs a secret
        is a health check the platform's process supervisor cannot run.
        It reports no data and no configuration values beyond paths —
        the token is reported as a state, never as a value.
        """
        from importlib.metadata import PackageNotFoundError, version

        from aurelis_ml import config
        from aurelis_ml.data import connect

        packages: dict[str, str | None] = {}
        for name in TRACKED_PACKAGES:
            try:
                packages[name] = version(name)
            except PackageNotFoundError:
                packages[name] = None

        database: dict[str, Any] = {"path": str(config.DB_PATH), "readOnly": True}
        try:
            with connect() as db:
                row = db.execute(
                    "SELECT (SELECT COUNT(*) FROM products) AS products, "
                    "(SELECT COUNT(*) FROM orders) AS orders, "
                    "(SELECT COUNT(*) FROM ml_versions) AS versions"
                ).fetchone()
            database.update(reachable=True, products=row["products"],
                            orders=row["orders"], registeredVersions=row["versions"])
        except Exception as exc:  # noqa: BLE001 — health never raises
            database.update(reachable=False, reason=str(exc))

        from aurelis_ml import registry_client

        artifact = registry_client.load_artifact(MODEL_KEY)

        payload = {
            "service": config.SERVICE_NAME,
            "status": "ok" if database.get("reachable") else "degraded",
            "python": platform.python_version(),
            "implementation": platform.python_implementation(),
            "packages": packages,
            "database": database,
            "api": {"base": config.API_BASE, "token": config.token_state()},
            "localArtifact": (
                {"present": True, "savedAt": artifact.get("savedAt"),
                 "winner": artifact.get("winner")}
                if artifact else {"present": False}
            ),
            "note": "Internal service. Never expose this to a browser.",
        }
        return jsonify(payload), 200 if database.get("reachable") else 503

    # -----------------------------------------------------------------
    # GET /readiness
    # -----------------------------------------------------------------
    @app.get("/readiness")
    @guarded(mutating=False)
    def readiness():
        """Per-SKU clean-day counts and whether training is possible at all.

        Asked before training rather than discovered during it, so the
        answer "there is not enough history" arrives as a sentence
        instead of as a model nobody should trust.
        """
        from aurelis_ml.cli import call_supported, resolve_component
        from aurelis_ml.data import synthetic_stats

        result = call_supported(resolve_component("readiness"))
        result["data"] = synthetic_stats()
        return jsonify(result)

    # -----------------------------------------------------------------
    # POST /train
    # -----------------------------------------------------------------
    @app.post("/train")
    @guarded(mutating=True)
    def train():
        """Train, save the artifact, hand the version to Node, return the leaderboard.

        The artifact is written to disk before the handover is attempted,
        so a rejected POST costs the registration rather than the whole
        run. Node assigns the version number, because ml_versions is a
        table two runtimes write to and choosing the number here would
        be a race with every JavaScript run.
        """
        from aurelis_ml import registry_client
        from aurelis_ml.cli import call_supported, resolve_component

        body = request.get_json(silent=True) or {}
        activate = bool(body.get("activate", True))
        register = bool(body.get("register", True))

        result = call_supported(
            resolve_component("train"),
            activate=activate,
            notes=body.get("notes"),
            horizons=DEFAULT_HORIZONS,
        )

        if not result.get("ok"):
            # A refusal is a legitimate outcome, not a server fault. 409
            # matches what the Node trainer returns when it skips a run
            # for thin history, so the console handles both identically.
            return jsonify(result), 409

        result["artifactPath"] = str(registry_client.save_artifact(MODEL_KEY, result))

        if not register:
            result["registered"] = False
            result["note"] = "Trained and saved locally. Node has not been told about this version."
            return jsonify(result)

        registered = registry_client.register_version(
            model_key=MODEL_KEY,
            algorithm=result.get("winner") or result.get("algorithm"),
            hyperparams=result.get("hyperparams"),
            features=result.get("features"),
            artifact=result.get("artifact"),
            train_rows=result.get("trainRows"),
            train_from=result.get("trainFrom"),
            train_to=result.get("trainTo"),
            metrics=result.get("metrics"),
            notes=result.get("notes") or body.get("notes"),
            activate=activate,
        )
        result["registered"] = True
        result["version"] = registered.get("version")
        result["versionId"] = registered.get("versionId")
        return jsonify(result)

    # -----------------------------------------------------------------
    # GET /forecast/<sku>
    # -----------------------------------------------------------------
    @app.get("/forecast/<sku>")
    @guarded(mutating=False)
    def forecast(sku: str):
        """Serve from the latest locally-trained artifact.

        From the stored parameters, never a fresh fit: what this returns
        has to be what the registered model actually says, or the
        console and the service disagree about a number a buyer is
        acting on.
        """
        from aurelis_ml import registry_client
        from aurelis_ml.cli import call_supported, resolve_component

        raw = request.args.get("horizons", "")
        try:
            horizons = [int(h) for h in raw.split(",") if h.strip()] or DEFAULT_HORIZONS
        except ValueError:
            return jsonify({"error": "horizons must be a comma-separated list of whole days."}), 400
        horizons = [h for h in horizons if 0 < h <= 365]

        artifact = registry_client.load_artifact(MODEL_KEY)
        if artifact is None:
            return (
                jsonify(
                    {
                        "sku": sku,
                        "confidence": "INSUFFICIENT",
                        "error": "No locally-trained artifact. Train first.",
                        "code": "NOT_TRAINED",
                    }
                ),
                409,
            )

        return jsonify(
            call_supported(
                resolve_component("predict"), sku=sku, horizons=horizons, artifact=artifact
            )
        )

    # -----------------------------------------------------------------
    # GET /anomalies
    # -----------------------------------------------------------------
    @app.get("/anomalies")
    @guarded(mutating=False)
    def anomalies():
        """IsolationForest over recent demand.

        An outlier is a flag for a human, never an action. A drop is as
        often a stock-out, a price change or a broken listing as it is
        lost interest, and this endpoint says which it cannot tell apart.
        """
        from aurelis_ml.cli import call_supported, resolve_component

        try:
            window = int(request.args.get("window", 7))
            contamination = float(request.args.get("contamination", 0.05))
        except ValueError:
            return jsonify({"error": "window must be a whole number and contamination a decimal."}), 400
        if not 0 < contamination <= 0.5:
            return jsonify({"error": "contamination must be greater than 0 and at most 0.5."}), 400

        result = call_supported(
            resolve_component("anomalies"),
            window=window,
            contamination=contamination,
            threshold=contamination,
        )
        if not isinstance(result, dict):
            result = {"rows": result}
        result.setdefault("window", window)
        result.setdefault("contamination", contamination)
        result.setdefault(
            "note",
            "Decision support. Every row here is something for a person to look at, "
            "not something the platform will act on by itself.",
        )
        return jsonify(result)

    # -----------------------------------------------------------------
    # GET /segments
    # -----------------------------------------------------------------
    @app.get("/segments")
    @guarded(mutating=False)
    def segments():
        """RFM segments, or the honest refusal.

        Synthetic orders carry no customer, deliberately. With too few
        real customers this returns the reason rather than five tidy
        segments describing people who do not exist.
        """
        from aurelis_ml.cli import call_supported, resolve_component

        return jsonify(call_supported(resolve_component("segments")))

    return app


app = create_app()


def main() -> int:
    import argparse
    import os

    parser = argparse.ArgumentParser(description="Run the Aurelis ML service (internal).")
    parser.add_argument(
        "--host",
        default=os.environ.get("ML_SERVICE_HOST", "127.0.0.1"),
        help="interface to bind (default 127.0.0.1 — keep it that way)",
    )
    parser.add_argument("--port", type=int, default=int(os.environ.get("ML_SERVICE_PORT", 5001)))
    parser.add_argument("--debug", action="store_true", help="Flask reloader and tracebacks")
    args = parser.parse_args()

    if args.host not in ("127.0.0.1", "localhost", "::1"):
        # Printed rather than refused: there are legitimate private
        # networks. But nobody should do it without having read this.
        print(
            f"  WARNING: binding to {args.host}. This service authenticates one caller with "
            "one shared secret and has no session, no CSRF protection and no rate limiting. "
            "It must not be reachable from a browser or the public internet.",
            file=sys.stderr,
        )

    app.run(host=args.host, port=args.port, debug=args.debug)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
