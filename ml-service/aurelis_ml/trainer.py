"""Train the demand forecaster and assemble a registrable version.

Mirrors server/src/ml/trainer.js deliberately: same per-SKU champion
selection, same tie-break, same artifact shape. The point of this service
is not to be a second opinion in a different dialect — it is to put a
richer family of models (Croston, SBA, TSB, Holt-Winters, gradient
boosting) on the SAME leaderboard as the JavaScript baselines, judged by
the same yardstick, so the console can show honestly whether Python
actually wins on this catalogue.

Nothing here writes to the database. A finished version is handed to
registry_client, which POSTs it to Node — Node stays the single writer.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Optional, Sequence

from . import data as _data
from .backtest import backtest
from .metrics import MIN_DAYS_FOR_TRAINING, confidence_of, pool
from .models import MODELS

MODEL_KEY = "demand_forecast"
DEFAULT_HORIZONS = (7, 14, 30, 60, 90)

# Below this the interval is narrower than the evidence supports. A band
# that tight reads as precision the backtest never demonstrated.
MIN_INTERVAL_SPREAD = 0.10


@dataclass
class SkuChampion:
    """The candidate that won one SKU, refitted on its whole history."""

    sku: str
    algorithm: str
    hyper: dict[str, Any]
    params: Any
    metrics: dict[str, Any]
    days: int
    censored: int

    def as_dict(self) -> dict[str, Any]:
        return {
            "algorithm": self.algorithm,
            "hyper": self.hyper,
            "params": self.params,
            "metrics": self.metrics,
            "days": self.days,
            "censored": self.censored,
        }


@dataclass
class TrainingResult:
    ok: bool
    reason: Optional[str] = None
    skipped: list[dict[str, Any]] = field(default_factory=list)
    leaderboard: list[dict[str, Any]] = field(default_factory=list)
    per_sku: dict[str, dict[str, Any]] = field(default_factory=dict)
    mix: dict[str, int] = field(default_factory=dict)
    winner: Optional[str] = None
    metrics: Optional[dict[str, Any]] = None
    train_rows: int = 0
    train_from: Optional[str] = None
    train_to: Optional[str] = None
    duration_ms: int = 0

    # ---- the payload Node's registerVersion() expects ----
    def as_payload(self, *, activate: bool = True) -> dict[str, Any]:
        return {
            "modelKey": MODEL_KEY,
            "runtime": "python",
            "algorithm": self.winner,
            "hyperparams": (
                MODELS[self.winner].hyper
                if self.winner in MODELS and hasattr(MODELS[self.winner], "hyper")
                else {}
            ),
            "features": [
                "daily units",
                "inter-demand interval",
                "weekly seasonality",
                "lags 1/2/3/7/14/28",
                "festive window",
                "stock-out censoring",
            ],
            "artifact": {
                "perSku": self.per_sku,
                "global": self.winner,
                "mix": self.mix,
                "runtime": "python",
            },
            "trainRows": self.train_rows,
            "trainFrom": self.train_from,
            "trainTo": self.train_to,
            "metrics": self.metrics or {},
            "notes": self.notes(),
            "activate": activate,
        }

    def notes(self) -> str:
        mix = ", ".join(f"{k} x{v}" for k, v in sorted(self.mix.items(), key=lambda kv: -kv[1]))
        best = self.leaderboard[0] if self.leaderboard else None
        line = (
            f"Python service. {len(self.per_sku)} SKU(s) trained, "
            f"{len(self.skipped)} skipped for thin history. "
            f"Each SKU keeps its own champion — {mix}."
        )
        if best and self.metrics:
            line += (
                f" {best['label']} was the strongest single model across the catalogue "
                f"({best['metrics']['cumulativeError']}% window error against "
                f"{self.metrics.get('cumulativeError')}% for the mix)."
            )
        return line


def _fit(model: Any, units: Sequence[int], hp: dict[str, Any], days: Sequence[str]) -> Any:
    """Fit, passing the calendar when the model can use it.

    Only the gradient booster reads `days`; the rest ignore it. Passing it
    positionally would break the plain two-argument models, so it goes in
    as a keyword and we fall back if the signature does not take it.
    """
    try:
        return model.fit(list(units), hp, days=list(days))
    except TypeError:
        return model.fit(list(units), hp)


def _backtest_with_days(points: Sequence[Any], model: Any, hp: dict[str, Any]):
    """backtest() with the calendar threaded through to fit().

    backtest.py owns the split protocol and must stay bit-identical to
    Node's, so rather than fork it we hand it a shim whose fit() closes
    over the training days. The shim carries the real model's min_days so
    the guard inside backtest is unchanged.
    """
    usable = [p for p in points if not p.censored]
    if len(usable) < max(int(getattr(model, "min_days", 1)), MIN_DAYS_FOR_TRAINING):
        return backtest(points, model, hp)  # let it produce the standard refusal

    holdout = max(7, int(len(usable) * 0.2))
    train_days = [p.day for p in usable[:-holdout]]

    class _Shim:
        key = model.key
        label = model.label
        min_days = model.min_days

        @staticmethod
        def fit(units, settings):
            return _fit(model, units, settings, train_days)

        @staticmethod
        def predict(params, h):
            return model.predict(params, h)

    return backtest(points, _Shim, hp)


def train_demand_forecast(*, conn=None) -> TrainingResult:
    """Score every model at every setting on every SKU, keep the winners."""
    started = time.time()

    with _data._using(conn) as cx:
        products = _data.active_products(conn=cx)

        per_algo: dict[str, list[dict[str, Any]]] = {k: [] for k in MODELS}
        per_sku: dict[str, dict[str, Any]] = {}
        skipped: list[dict[str, Any]] = []
        rows_used = 0
        first_day: Optional[str] = None
        last_day: Optional[str] = None

        for product in products:
            sku = product["id"]
            series = _data.demand_series(sku, conn=cx)
            clean = series.usable

            if len(clean) < MIN_DAYS_FOR_TRAINING:
                skipped.append({"sku": sku, "name": product["name"], "days": len(clean)})
                continue

            rows_used += len(clean)
            if series.first_day and (first_day is None or series.first_day < first_day):
                first_day = series.first_day
            if series.last_day and (last_day is None or series.last_day > last_day):
                last_day = series.last_day

            best: Optional[SkuChampion] = None
            best_rank = (float("inf"), float("inf"))

            for key, model in MODELS.items():
                best_for_model = None
                best_for_model_rank = (float("inf"), float("inf"))

                # Search the settings too. Leaving a hyperparameter at its
                # default is how a smoother ends up forecasting zero for a
                # piece that plainly still sells.
                for hp in model.grid:
                    result = _backtest_with_days(series.points, model, hp)
                    if not result.ok:
                        continue
                    if result.ranking < best_for_model_rank:
                        best_for_model_rank = result.ranking
                        best_for_model = (hp, result)

                if best_for_model is None:
                    continue

                hp, result = best_for_model
                # The leaderboard compares each model at ITS own best
                # settings, not at an arbitrary default.
                per_algo[key].append(result.metrics)

                if best_for_model_rank < best_rank:
                    best_rank = best_for_model_rank
                    best = SkuChampion(
                        sku=sku,
                        algorithm=key,
                        hyper=hp,
                        params=None,          # refitted below
                        metrics=result.metrics,
                        days=len(clean),
                        censored=series.censored,
                    )

            if best is not None:
                # Refit the champion on the FULL clean series — the
                # backtest deliberately withheld the most recent days, and
                # those are the ones a forecast leans on hardest.
                model = MODELS[best.algorithm]
                best.params = _fit(
                    model,
                    [p.units for p in clean],
                    best.hyper,
                    [p.day for p in clean],
                )
                per_sku[sku] = best.as_dict()

    duration = int((time.time() - started) * 1000)

    if not per_sku:
        worst = max((s["days"] for s in skipped), default=0)
        reason = (
            f"No SKU has {MIN_DAYS_FOR_TRAINING} days of clean sales history. "
            f"{len(products)} SKUs checked; the best had {worst} day(s). "
            "Nothing was trained — a model fitted on this would be guesswork."
        )
        return TrainingResult(ok=False, reason=reason, skipped=skipped, duration_ms=duration)

    leaderboard = []
    for key, results in per_algo.items():
        pooled = pool(results)
        if not pooled:
            continue
        leaderboard.append(
            {
                "algorithm": key,
                "label": MODELS[key].label,
                "skus": len(results),
                "metrics": pooled,
            }
        )
    leaderboard.sort(
        key=lambda c: (
            float("inf")
            if c["metrics"].get("cumulativeError") is None
            else c["metrics"]["cumulativeError"]
        )
    )

    champion_metrics = pool([entry["metrics"] for entry in per_sku.values()])

    mix: dict[str, int] = {}
    for entry in per_sku.values():
        mix[entry["algorithm"]] = mix.get(entry["algorithm"], 0) + 1

    return TrainingResult(
        ok=True,
        skipped=skipped,
        leaderboard=leaderboard,
        per_sku=per_sku,
        mix=mix,
        winner=leaderboard[0]["algorithm"] if leaderboard else None,
        metrics=champion_metrics,
        train_rows=rows_used,
        train_from=first_day,
        train_to=last_day,
        duration_ms=duration,
    )


# ---------------------------------------------------------------------
# Readiness — answer "can this be trained at all?" before anyone presses
# the button, rather than after.
# ---------------------------------------------------------------------
def readiness(*, conn=None) -> dict[str, Any]:
    with _data._using(conn) as cx:
        rows = []
        for product in _data.active_products(conn=cx):
            series = _data.demand_series(product["id"], conn=cx)
            clean = series.usable
            rows.append(
                {
                    "sku": product["id"],
                    "name": product["name"],
                    "days": len(clean),
                    "censored": series.censored,
                    "units": sum(p.units for p in clean),
                    "ready": len(clean) >= MIN_DAYS_FOR_TRAINING,
                }
            )

    ready = [r for r in rows if r["ready"]]
    rows.sort(key=lambda r: -r["days"])
    return {
        "minDays": MIN_DAYS_FOR_TRAINING,
        "skus": len(rows),
        "ready": len(ready),
        "short": len(rows) - len(ready),
        "longestHistory": max((r["days"] for r in rows), default=0),
        "totalUnits": sum(r["units"] for r in rows),
        "censoredDays": sum(r["censored"] for r in rows),
        "rows": rows,
    }


# ---------------------------------------------------------------------
# Serving
# ---------------------------------------------------------------------
def predict(
    sku: str,
    horizons: Sequence[int] = DEFAULT_HORIZONS,
    *,
    artifact: dict[str, Any],
) -> dict[str, Any]:
    """Serve a forecast from a stored artifact.

    Predictions come from the registered parameters, never from a fresh
    fit, so what the console shows is what the registered version actually
    says.
    """
    entry = (artifact or {}).get("perSku", {}).get(sku)
    if not entry:
        return {
            "sku": sku,
            "confidence": "INSUFFICIENT",
            "horizons": {},
            "explanation": [
                f"{sku} was not in the training set.",
                f"It needs {MIN_DAYS_FOR_TRAINING} days of clean history before it is modelled.",
            ],
        }

    model = MODELS[entry["algorithm"]]
    metrics = entry.get("metrics") or {}
    wape = metrics.get("wape")
    cumulative = metrics.get("cumulativeError")

    # The band is on the TOTAL over the horizon, so it comes from the
    # cumulative backtest error. Day-level WAPE would put a +-140% band
    # around a monthly figure the model actually gets within a few per
    # cent, which reads as a broken model rather than an honest one.
    spread = max(MIN_INTERVAL_SPREAD, (cumulative if cumulative is not None else wape or 50) / 100)

    out: dict[int, dict[str, int]] = {}
    for h in horizons:
        total = sum(float(model.predict(entry["params"], i)) for i in range(1, h + 1))
        out[h] = {
            "units": round(total),
            "lower": max(0, round(total * (1 - spread))),
            "upper": round(total * (1 + spread)),
        }

    daily = float(model.predict(entry["params"], 1))
    censored = entry.get("censored") or 0

    return {
        "sku": sku,
        "runtime": "python",
        "algorithm": entry["algorithm"],
        "algorithmLabel": model.label,
        "hyper": entry.get("hyper"),
        "dailyRate": round(daily, 3),
        "days": entry.get("days"),
        "censoredDays": censored,
        "metrics": metrics,
        "confidence": confidence_of(entry.get("days"), wape, cumulative),
        "horizons": out,
        "explanation": [
            f"{model.label} was the best of {len(MODELS)} candidates for this SKU on held-out days.",
            f"Fitted on {entry.get('days')} clean days"
            + (f", {censored} out-of-stock day(s) excluded" if censored else "")
            + ".",
            (
                f"On held-out days the total was out by {cumulative}% — that is what sets the range shown."
                if cumulative is not None
                else "Window error could not be computed for this SKU."
            ),
            (
                f"Day-level error is {wape}%, which is normal for a piece that sells in ones and twos: "
                "the total over a month is dependable, the specific day is not."
                if wape is not None
                else None
            ),
        ],
    }
