"""Command line for the Aurelis ML service.

    .venv/Scripts/python.exe -m aurelis_ml.cli train

Everything the Flask app does is available here without running a
server, because that is how this service is meant to be operated: a
scheduled job that trains, hands the version to Node and exits. The web
app exists for the cases where something has to ask it a question live.

Nothing from this package is imported at module level. `--help` should
not pay for numpy and scikit-learn, and neither should a command that
turns out to be misspelt — on a small box that import is most of a
second and a couple of hundred megabytes.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Callable, Sequence

MODEL_KEY = "demand_forecast"
DEFAULT_HORIZONS = (7, 14, 30, 60, 90)


# ---------------------------------------------------------------------
# Component resolution
# ---------------------------------------------------------------------
# The service surface and the numerical modules are built as separate
# pieces. The surface asks for a callable by name and takes it from
# whichever module provides it, so neither half has to hard-code the
# other's file layout, and a piece that has not been built yet produces
# a sentence rather than an ImportError traceback.
_CANDIDATES: dict[str, tuple[str, ...]] = {
    "readiness": (
        "trainer:data_readiness", "trainer:readiness",
        "train:data_readiness", "readiness:data_readiness",
    ),
    "train": ("trainer:train_demand_forecast", "trainer:train", "train:train_demand_forecast"),
    "predict": (
        "trainer:predict", "trainer:predict_from_artifact", "trainer:forecast",
        "serving:predict", "train:predict",
    ),
    "anomalies": ("insights:detect_anomalies", "anomalies:detect_anomalies"),
    "segments": ("insights:segment_customers", "segments:segment_customers"),
}


class ComponentMissing(RuntimeError):
    """A numerical module this command needs has not been built."""


def resolve_component(name: str) -> Callable[..., Any]:
    import importlib

    tried = _CANDIDATES[name]
    for candidate in tried:
        module_name, _, symbol = candidate.partition(":")
        full = f"aurelis_ml.{module_name}"
        try:
            module = importlib.import_module(full)
        except ModuleNotFoundError as exc:
            # Only swallow the absence of the module being probed for. A
            # ModuleNotFoundError raised *inside* it — someone reaching
            # for pandas, which is deliberately not installed — is a real
            # bug and must not be disguised as "not built yet".
            if exc.name in (full, module_name):
                continue
            raise
        found = getattr(module, symbol, None)
        if callable(found):
            return found

    raise ComponentMissing(
        f"Nothing provides {name!r} yet — looked for "
        + ", ".join(f"aurelis_ml.{c.replace(':', '.')}" for c in tried)
        + "."
    )


def call_supported(fn: Callable[..., Any], /, **kwargs: Any) -> Any:
    """Call fn with only the keyword arguments it actually accepts.

    The surface offers everything it knows (horizons, a window, whether
    to activate) and lets the callee take what it wants. Without this,
    adding an option to a trainer would silently break every caller that
    had not been updated in the same commit.
    """
    import inspect

    try:
        signature = inspect.signature(fn)
    except (TypeError, ValueError):
        return fn(**kwargs)

    accepts_any = any(
        p.kind is inspect.Parameter.VAR_KEYWORD for p in signature.parameters.values()
    )
    if accepts_any:
        return fn(**kwargs)

    allowed = {k: v for k, v in kwargs.items() if k in signature.parameters}
    return fn(**allowed)


# ---------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------
def fmt(value: Any, digits: int = 2) -> str:
    """One number, or an em dash where there honestly is not one.

    A missing metric prints as a dash, never as 0. Zero is a
    measurement; absence is not, and a column of zeros invites somebody
    to average them.
    """
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, float):
        return f"{value:,.{digits}f}"
    if isinstance(value, int):
        return f"{value:,}"
    return str(value)


def table(headers: Sequence[str], rows: Sequence[Sequence[Any]], *, indent: str = "  ") -> str:
    """A plain fixed-width table. No dependency, no colour, no cleverness."""
    if not rows:
        return f"{indent}(nothing to show)"

    body = [[fmt(cell) for cell in row] for row in rows]
    widths = [
        max(len(str(headers[i])), *(len(r[i]) for r in body)) for i in range(len(headers))
    ]

    # Numbers right, words left — decided per column from the data so a
    # column of counts lines up on its units.
    def numeric(index: int) -> bool:
        return all(
            not r[index] or r[index] == "—" or r[index].lstrip("-").replace(",", "").replace(".", "").isdigit()
            for r in body
        )

    aligns = [numeric(i) for i in range(len(headers))]

    def line(cells: Sequence[str]) -> str:
        parts = [
            cells[i].rjust(widths[i]) if aligns[i] else cells[i].ljust(widths[i])
            for i in range(len(headers))
        ]
        return indent + "  ".join(parts).rstrip()

    out = [line([str(h) for h in headers]), indent + "  ".join("-" * w for w in widths)]
    out.extend(line(r) for r in body)
    return "\n".join(out)


def heading(text: str) -> str:
    return f"\n{text}\n{'=' * len(text)}"


def bullets(items: Sequence[Any], indent: str = "  ") -> str:
    return "\n".join(f"{indent}• {item}" for item in items if item)


def _metrics_row(metrics: dict[str, Any] | None) -> list[Any]:
    """The five figures every leaderboard row shows, in a fixed order."""
    m = metrics or {}
    return [
        m.get("mae"),
        m.get("rmse"),
        m.get("wape"),
        m.get("smape"),
        m.get("cumulativeError"),
    ]


METRIC_HEADERS = ["MAE", "RMSE", "WAPE %", "sMAPE %", "window err %"]


# ---------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------
def cmd_readiness(args: argparse.Namespace) -> int:
    from aurelis_ml import config
    from aurelis_ml.data import synthetic_stats

    result = call_supported(resolve_component("readiness"))
    if args.json:
        print(json.dumps(result, indent=2, default=str))
        return 0

    rows = result.get("rows", [])
    print(heading("Training readiness"))
    print(f"  Database   {config.DB_PATH}  (read-only)")
    print(
        f"  Threshold  {result.get('minDays', config.MIN_DAYS_FOR_TRAINING)} clean days "
        "before a SKU may be forecast at all"
    )
    print(
        f"  Catalogue  {result.get('skus', len(rows))} SKUs — "
        f"{result.get('ready', 0)} ready, {result.get('short', 0)} short of history"
    )
    print(
        f"  Longest    {result.get('longestHistory', 0)} clean days; "
        f"{result.get('censoredDays', 0)} out-of-stock day(s) excluded across the catalogue"
    )

    data = synthetic_stats()
    if data["present"]:
        print(
            f"\n  {data['syntheticShare']}% of order history is SYNTHETIC "
            f"({data['synthetic']['orders']} orders, {data['synthetic']['from']} to "
            f"{data['synthetic']['to']}). Development data — not a statement about real trade."
        )

    print()
    print(
        table(
            ["SKU", "Name", "clean days", "censored", "units", "ready"],
            [
                [r.get("sku"), r.get("name"), r.get("days"), r.get("censored"), r.get("units"), r.get("ready")]
                for r in rows
            ],
        )
    )

    if not result.get("ready"):
        print(
            "\n  Nothing can be trained yet. Below the threshold the answer is "
            "INSUFFICIENT, not a number."
        )
    return 0


def cmd_train(args: argparse.Namespace) -> int:
    from aurelis_ml import registry_client

    result = call_supported(
        resolve_component("train"),
        activate=not args.no_activate,
        notes=args.notes,
        horizons=list(DEFAULT_HORIZONS),
    )

    if args.json:
        print(json.dumps(result, indent=2, default=str))
        return 0 if result.get("ok") else 1

    if not result.get("ok"):
        print(heading("Training skipped"))
        print(f"  {result.get('reason') or 'The trainer declined to produce a version.'}")
        print(
            "\n  Nothing was registered. A model fitted on this would be guesswork, and a "
            "version nobody should trust is worse than no version at all."
        )
        return 1

    leaderboard = result.get("leaderboard", [])
    champion = result.get("metrics") or {}

    print(heading("Python leaderboard"))
    print(
        table(
            ["algorithm", "SKUs", *METRIC_HEADERS],
            [
                [c.get("label") or c.get("algorithm"), c.get("skus"), *_metrics_row(c.get("metrics"))]
                for c in leaderboard
            ],
        )
    )
    print(
        "\n  Ranked on the total over the window — the figure a purchase order actually "
        "depends on. Day-level WAPE is shown beside it and is expected to look poor on "
        "demand that arrives in ones and twos."
    )

    print(heading("Per-SKU champions"))
    mix = result.get("mix") or {}
    if mix:
        print(table(["algorithm", "SKUs"], sorted(mix.items(), key=lambda kv: -kv[1])))
    print(
        f"\n  Trained {result.get('trained', 0)} SKU(s), skipped {result.get('skipped', 0)} "
        f"for thin history. Window error {fmt(champion.get('cumulativeError'))}%, "
        f"day-level WAPE {fmt(champion.get('wape'))}%."
    )

    # The artifact is written before the handover is attempted, so a
    # rejected POST costs the registration and not the training run.
    saved = registry_client.save_artifact(MODEL_KEY, result)
    print(f"\n  Artifact saved to {saved}")

    if args.no_register:
        print("  Not registered — --no-register was given. Node has not been told about this.")
        return 0

    try:
        registered = registry_client.register_version(
            model_key=MODEL_KEY,
            algorithm=result.get("winner") or result.get("algorithm"),
            hyperparams=result.get("hyperparams"),
            features=result.get("features"),
            artifact=result.get("artifact"),
            train_rows=result.get("trainRows"),
            train_from=result.get("trainFrom"),
            train_to=result.get("trainTo"),
            metrics=champion,
            notes=result.get("notes") or args.notes,
            activate=not args.no_activate,
        )
    except Exception as exc:  # noqa: BLE001 — the message is the point
        print(f"\n  NOT REGISTERED: {exc}")
        print(
            "  The trained artifact is on disk, so re-running the handover is cheap once "
            "the API is reachable."
        )
        return 1

    version = registered.get("version")
    print(
        f"  Registered with Node as version {fmt(version)}"
        + (" and activated." if not args.no_activate else " (not activated).")
    )
    print(
        "  It now sits on the same leaderboard as the JavaScript baselines, judged by the "
        "same metrics. Run `compare` to see whether it actually won."
    )
    return 0


def cmd_forecast(args: argparse.Namespace) -> int:
    from aurelis_ml import registry_client

    horizons = [int(h) for h in str(args.horizons).split(",") if h.strip()]
    artifact = registry_client.load_artifact(MODEL_KEY)
    if artifact is None:
        print(
            "  No locally-trained artifact. Run `train` first — this command serves what "
            "this service last trained, and will not invent a number to fill the gap."
        )
        return 1

    result = call_supported(resolve_component("predict"), sku=args.sku, horizons=horizons, artifact=artifact)

    if args.json:
        print(json.dumps(result, indent=2, default=str))
        return 0

    confidence = result.get("confidence")
    print(heading(f"Forecast — {args.sku}"))
    print(f"  Confidence  {confidence}")

    if confidence == "INSUFFICIENT":
        print(f"  Days        {fmt(result.get('days'))} clean")
        print()
        print(bullets(result.get("explanation") or ["Not enough clean history to forecast."]))
        print(
            "\n  No figure is given, deliberately. Below the threshold the honest answer "
            "is that we do not know."
        )
        return 0

    print(f"  Algorithm   {result.get('algorithmLabel') or result.get('algorithm')}")
    print(f"  Daily rate  {fmt(result.get('dailyRate'), 3)} units/day")
    print(
        f"  Fitted on   {fmt(result.get('days'))} clean days"
        + (f", {fmt(result.get('censoredDays'))} out-of-stock day(s) excluded"
           if result.get("censoredDays") else "")
    )
    print()
    print(
        table(
            ["horizon", "units", "lower", "upper"],
            [
                [f"{h} days", v.get("units"), v.get("lower"), v.get("upper")]
                for h, v in sorted(
                    (result.get("horizons") or {}).items(), key=lambda kv: int(kv[0])
                )
            ],
        )
    )
    if result.get("explanation"):
        print("\n  Why:")
        print(bullets(result["explanation"], indent="    "))
    return 0


def cmd_anomalies(args: argparse.Namespace) -> int:
    result = call_supported(
        resolve_component("anomalies"),
        window=args.window,
        contamination=args.contamination,
    )
    if args.json:
        print(json.dumps(result, indent=2, default=str))
        return 0

    rows = result.get("rows", [])
    summary = result.get("summary", {})

    print(heading("Sales anomalies — Isolation Forest against the z-score baseline"))
    print(
        f"  {summary.get('scored', 0)} of {summary.get('skus', len(rows))} SKUs scored; "
        f"{summary.get('insufficient', 0)} had too little clean history."
    )
    if summary.get("agreementPct") is not None:
        print(
            f"  The two methods agreed on {summary['agreementPct']}% of the "
            f"{summary.get('comparable', 0)} SKUs where both could be computed "
            f"({summary.get('both', 0)} flagged by both, {summary.get('forestOnly', 0)} by the "
            f"forest alone, {summary.get('zOnly', 0)} by the z-score alone)."
        )
    print()

    def z_of(row: dict) -> Any:
        z = row.get("zScore") or {}
        return z.get("z") if z.get("available") else None

    def flags_of(row: dict) -> Any:
        forest = row.get("forest") or {}
        return forest.get("recentCount") if forest.get("available") else None

    print(
        table(
            ["SKU", "name", "status", "days", "verdict", "forest flags", "z"],
            [
                [
                    r.get("sku"), r.get("name"), r.get("status"), r.get("days"),
                    (r.get("agreement") or {}).get("verdict"), flags_of(r), z_of(r),
                ]
                for r in rows
            ],
        )
    )

    if result.get("caveats"):
        print("\n  Read this before acting on any of it:")
        print(bullets(result["caveats"], indent="    "))
    return 0


def cmd_segments(args: argparse.Namespace) -> int:
    result = call_supported(resolve_component("segments"))
    if args.json:
        print(json.dumps(result, indent=2, default=str))
        return 0

    rows = result.get("rows", [])
    clustered = result.get("clustered")

    print(heading("Customer segments — k-means over RFM"))
    print(
        f"  {result.get('customers', len(rows))} customer(s) with real purchase history; "
        f"{result.get('minCustomers')} needed before a fitted model is allowed to label them."
    )

    if not rows:
        print(f"\n  {result.get('note') or 'No customer has placed a real order yet.'}")
        if result.get("reasoning"):
            print(bullets(result["reasoning"], indent="    "))
        return 0

    headers = ["customer", "tier", "orders", "spend (INR)", "last order", "days since"]
    if clustered:
        headers.append("segment")

    def row_cells(r: dict) -> list[Any]:
        cells = [
            r.get("name"), r.get("tier"), r.get("frequency"), r.get("monetary"),
            (r.get("lastOrder") or "")[:10], r.get("recencyDays"),
        ]
        if clustered:
            cells.append(r.get("segment") or r.get("segmentLabel"))
        return cells

    print()
    print(table(headers, [row_cells(r) for r in rows]))

    if clustered:
        print(f"\n  k = {result.get('k')}, chosen by silhouette score.")
    if result.get("note"):
        print(f"\n  {result['note']}")
    if result.get("reasoning"):
        print(bullets(result["reasoning"], indent="    "))
    return 0


def cmd_compare(args: argparse.Namespace) -> int:
    from aurelis_ml import registry_client

    node = registry_client.node_leaderboard(MODEL_KEY)
    local = registry_client.load_artifact(MODEL_KEY)

    if args.json:
        print(json.dumps({"node": node, "python": local}, indent=2, default=str))
        return 0

    print(heading("Node baselines — last successful run"))
    if node["candidates"]:
        print(
            table(
                ["algorithm", "SKUs", *METRIC_HEADERS],
                [
                    [c.get("label") or c.get("algorithm"), c.get("skus"), *_metrics_row(c.get("metrics"))]
                    for c in node["candidates"]
                ],
            )
        )
        run = node["run"] or {}
        print(f"\n  Winner: {run.get('winner')} — {run.get('message') or ''}")
    else:
        print("  No successful Node training run recorded yet.")

    print(heading("Python candidates — last local run"))
    if local and local.get("leaderboard"):
        print(
            table(
                ["algorithm", "SKUs", *METRIC_HEADERS],
                [
                    [c.get("label") or c.get("algorithm"), c.get("skus"), *_metrics_row(c.get("metrics"))]
                    for c in local["leaderboard"]
                ],
            )
        )
        print(f"\n  Winner: {local.get('winner')} — trained {local.get('savedAt')}")
    else:
        print("  No local training run yet. Run `train`.")

    # The registry is the only place the two runtimes actually meet, so
    # the comparison that counts is the one made there — same table,
    # same metric definitions, same holdout protocol.
    print(heading("Registered versions — both runtimes, one table"))
    print(
        table(
            ["ver", "runtime", "algorithm", "MAE", "WAPE %", "window err %", "bias %", "active", "trained"],
            [
                [
                    v.get("version"), v.get("runtime"), v.get("algorithm"), v.get("mae"),
                    v.get("wape"), v.get("cumulative_error"), v.get("cumulative_bias"),
                    "yes" if v.get("is_active") else "", (v.get("created_at") or "")[:16],
                ]
                for v in node["versions"]
            ],
        )
    )

    runtimes = {v.get("runtime") for v in node["versions"]}
    if runtimes == {"node"}:
        print(
            "\n  Every registered version is JavaScript so far. Until a Python version is "
            "registered there is no comparison to draw, and claiming one would be a guess."
        )
    else:
        print(
            "\n  Ranked by window error, lowest first, across both runtimes. If the "
            "JavaScript baseline wins, it wins."
        )
    return 0


# ---------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m aurelis_ml.cli",
        description=(
            "Aurelis ML service — trains against a read-only copy of the platform "
            "database and hands finished versions to the Node API, which stays the "
            "single writer."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Environment:\n"
            "  AURELIS_DB         path to aurelis.db (default: ../server/.data/aurelis.db)\n"
            "  AURELIS_API        Node API base URL (default: http://localhost:4000)\n"
            "  AURELIS_ML_TOKEN   shared secret for POST /api/admin/ml/register\n"
        ),
    )
    parser.add_argument("--json", action="store_true", help="print the raw result instead of a table")
    parser.add_argument("--db", help="override AURELIS_DB for this run")
    parser.add_argument("--api", help="override AURELIS_API for this run")

    subs = parser.add_subparsers(dest="command", required=True)

    p = subs.add_parser("readiness", help="per-SKU clean-day counts and whether training is possible")
    p.set_defaults(handler=cmd_readiness)

    p = subs.add_parser("train", help="train, then register the version with Node")
    p.add_argument("--no-register", action="store_true", help="train and save locally, do not tell Node")
    p.add_argument("--no-activate", action="store_true", help="register the version without making it serve")
    p.add_argument("--notes", help="a line recorded against the version")
    p.set_defaults(handler=cmd_train)

    p = subs.add_parser("forecast", help="serve a forecast from the latest local artifact")
    p.add_argument("sku")
    p.add_argument("--horizons", default=",".join(str(h) for h in DEFAULT_HORIZONS))
    p.set_defaults(handler=cmd_forecast)

    p = subs.add_parser("anomalies", help="IsolationForest over recent demand")
    p.add_argument("--window", type=int, default=7, help="days in the recent window (default 7)")
    p.add_argument("--contamination", type=float, default=0.05,
                   help="expected share of outliers, 0-0.5 (default 0.05)")
    p.set_defaults(handler=cmd_anomalies)

    p = subs.add_parser("segments", help="RFM segments from real orders only")
    p.set_defaults(handler=cmd_segments)

    p = subs.add_parser("compare", help="the Python leaderboard beside the Node one")
    p.set_defaults(handler=cmd_compare)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    # Applied to the environment before anything from the package is
    # imported, because config.py resolves its values once at import and
    # then holds them for the run — which is what makes a misconfigured
    # service fail loudly instead of drifting halfway through.
    if args.db:
        os.environ["AURELIS_DB"] = args.db
    if args.api:
        os.environ["AURELIS_API"] = args.api

    try:
        return args.handler(args)
    except ComponentMissing as exc:
        print(f"\n  {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\n  Stopped.", file=sys.stderr)
        return 130
    except Exception as exc:  # noqa: BLE001
        from aurelis_ml.config import ConfigError
        from aurelis_ml.registry_client import RegistryError

        if isinstance(exc, (ConfigError, RegistryError)):
            # Configuration and handover problems are operator problems.
            # A stack trace here buries the one sentence that says what
            # to change.
            print(f"\n  {exc}", file=sys.stderr)
            return 2
        raise


if __name__ == "__main__":
    raise SystemExit(main())
