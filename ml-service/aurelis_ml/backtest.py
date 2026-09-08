"""Walk-forward backtesting, to the same protocol as the Node trainer.

A Python version and a Node version end up on one leaderboard in the admin
console, so they are only comparable if they were judged identically: same
split, same guards, same rounding. Every constant here is therefore a
mirror of server/src/ml/forecast.js rather than a fresh opinion. Where the
two languages disagree about arithmetic — JavaScript's toFixed against
Python's round, Math.round against banker's rounding — the JavaScript
behaviour wins, because the Node baselines are already registered and
re-judging them is not on the table.

Nothing in here fits a model or picks a winner. It scores one candidate on
days it was never shown, and reports honestly when it cannot.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from importlib import import_module
from typing import Any

from .config import MIN_DAYS_FOR_TRAINING

__all__ = [
    "BacktestResult",
    "backtest",
    "from_contract",
    "pick",
    "round_half_up",
    "to_fixed",
]


# ---------------------------------------------------------------------
# Binding to the rest of the contract
# ---------------------------------------------------------------------
def from_contract(symbols: str | Sequence[str], modules: Sequence[str], *, what: str | None = None) -> Any:
    """Find one contract symbol wherever in the package it happens to live.

    The numeric contract fixes the names of the four functions the two
    runtimes must agree on — score, confidence_of, demand_series and the
    model registry — but not the file each sits in. Resolving by symbol
    keeps a reshuffle on the other side of the package from breaking this
    module, and turns a missing piece into a sentence that names what was
    wanted and everywhere it was looked for, instead of a bare
    ModuleNotFoundError three frames deep.
    """
    wanted = (symbols,) if isinstance(symbols, str) else tuple(symbols)

    for module_name in modules:
        try:
            module = import_module(f".{module_name}", __package__)
        except ModuleNotFoundError as exc:
            # Skip only a sibling that genuinely is not there. A module
            # that exists but cannot import something of its own must be
            # allowed to raise, or a real bug elsewhere in the package
            # reads here as "not written yet" and is silently routed past.
            if exc.name in (module_name, f"{__package__}.{module_name}"):
                continue
            raise
        for symbol in wanted:
            found = getattr(module, symbol, None)
            if found is not None:
                return found

    raise ImportError(
        f"{what or ' / '.join(wanted)} is part of the numeric contract, but no module in "
        f"{__package__} provides it. Looked for {', '.join(wanted)} in: {', '.join(modules)}."
    )


_MISSING = object()


def pick(source: Any, *names: str, default: Any = _MISSING) -> Any:
    """Read a field from a mapping or an object, trying each spelling given.

    Series points and model candidates arrive from sibling modules, and the
    contract describes them by their fields — day / units / censored,
    min_days / hyper / grid / fit / predict — not by whether they were
    built as dataclasses or as the plain dicts the contract writes them
    as. Reading through one accessor means either shape works and the
    calling code below stays flat.
    """
    for name in names:
        if isinstance(source, Mapping) and name in source:
            return source[name]
        found = getattr(source, name, _MISSING)
        if found is not _MISSING:
            return found
    if default is _MISSING:
        raise AttributeError(
            f"{type(source).__name__} has no {' or '.join(names)}; the contract requires it."
        )
    return default


# ---------------------------------------------------------------------
# Arithmetic that matches JavaScript
# ---------------------------------------------------------------------
def to_fixed(value: Any, digits: int) -> float | None:
    """JavaScript's +x.toFixed(digits), which is not Python's round().

    round() is half-to-even: round(0.125, 2) is 0.12 while JavaScript gives
    0.13. On a single metric the gap is invisible; across a leaderboard it
    is a Python version losing a tie it actually drew, so the rounding is
    done the way the already-registered Node versions were rounded.

    Decimal is fed the float directly — Decimal(0.125) is the exact binary
    value, which is what toFixed inspects too. Decimal(str(x)) would round
    twice and reintroduce the drift this exists to remove.
    """
    if value is None:
        return None
    x = float(value)
    if not math.isfinite(x):
        return None
    # toFixed peels the sign off first, so ties go away from zero rather
    # than towards positive infinity. Bias figures are the negative ones.
    sign = -1.0 if x < 0 else 1.0
    quantum = Decimal(1).scaleb(-digits)
    return sign * float(Decimal(abs(x)).quantize(quantum, rounding=ROUND_HALF_UP))


def round_half_up(value: float) -> int:
    """JavaScript's Math.round: halves go up, never to the nearest even.

    Python's round(0.5) is 0 and round(2.5) is 2. Unit counts shown to a
    buyer are rounded in Node with Math.round, and a forecast of 2.5 units
    that displays as 2 here and 3 in the existing console is a bug report
    nobody can reproduce.
    """
    return math.floor(float(value) + 0.5)


# score() lives with the other metrics; this module only extends what it
# returns. Both runtimes must compute it to the same definition or the
# leaderboard is comparing two different questions.
score = from_contract(
    "score",
    ("metrics", "scoring", "contract", "stats", "evaluation", "forecast"),
    what="score()",
)


# ---------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------
@dataclass(frozen=True)
class BacktestResult:
    """One candidate, scored on days it was never fitted to.

    A refusal is a first-class result rather than an exception: a thin SKU
    is ordinary, and the caller needs the reason to put in front of a
    human, not a traceback.
    """

    ok: bool
    metrics: dict[str, Any] | None = None
    params: Any = None
    holdout: int = 0
    train_rows: int = 0
    reason: str | None = None

    @property
    def ranking(self) -> tuple[float, float]:
        """Sort key: window error first, day-level WAPE as the tiebreak.

        Ordered so that plain tuple comparison reproduces the Node
        selection exactly, ties included — the first candidate seen keeps
        the place. Missing figures sort last rather than sorting best,
        which is what a None would do if it were read as zero error.
        """
        if not self.ok or not self.metrics:
            return (math.inf, math.inf)
        cumulative = self.metrics.get("cumulativeError")
        wape = self.metrics.get("wape")
        return (
            math.inf if cumulative is None else float(cumulative),
            math.inf if wape is None else float(wape),
        )

    def as_dict(self) -> dict[str, Any]:
        """Flat form for the CLI, the run record and the API payload."""
        return {
            "ok": self.ok,
            "metrics": self.metrics,
            "params": self.params,
            "holdout": self.holdout,
            "trainRows": self.train_rows,
            "reason": self.reason,
        }


# ---------------------------------------------------------------------
# The protocol
# ---------------------------------------------------------------------
def backtest(points: Sequence[Any], model: Any, hp: Any = None) -> BacktestResult:
    """Fit on everything before the holdout, predict the holdout, score it.

    Censored days — the piece was out of stock, so nobody could have
    bought it — are dropped before the split rather than scored as zero
    demand. Leaving them in teaches every candidate that the shelf being
    empty is a preference of the customer, and then rewards whichever
    model forecasts the lowest.
    """
    usable = [p for p in points if not pick(p, "censored", default=False)]

    # Each model states its own minimum, but none of them may go below the
    # platform floor: a trend fitted to a fortnight is arithmetic, not
    # evidence, and it would still be handed a confidence label.
    required = max(int(pick(model, "min_days", "minDays", default=1)), MIN_DAYS_FOR_TRAINING)
    if len(usable) < required:
        return BacktestResult(
            ok=False,
            reason=f"needs {required} clean days, has {len(usable)}",
        )

    # Twenty per cent held out, never fewer than a week. Written as the
    # Node line is written — float multiply, then truncate — because both
    # runtimes use IEEE doubles and 35 * 0.2 is not exactly 7 in either;
    # an integer-arithmetic "improvement" here would split a series one
    # day differently from the version it is being compared against.
    holdout = max(7, int(len(usable) * 0.2))
    train = usable[:-holdout]
    test = usable[-holdout:]

    # JavaScript treats {} as truthy, so Node's `hyper || algo.hyper`
    # passes an explicitly empty setting straight through. `hp or default`
    # would not: in Python {} is falsy and the default would quietly
    # override a deliberate choice. The test is on None only.
    settings = hp if hp is not None else pick(model, "hyper", "hyperparams", default={})

    fit = pick(model, "fit")
    predict_one = pick(model, "predict")

    params = fit([pick(p, "units") for p in train], settings)
    # float() rather than the raw return: scikit-learn hands back numpy
    # scalars, which are fine to arithmetic on and not fine to JSON.
    predicted = [float(predict_one(params, h)) for h in range(1, len(test) + 1)]
    actual = [pick(p, "units") for p in test]

    metrics = dict(score(actual, predicted))

    # Day-level error on intermittent demand is always dreadful — nobody
    # can say which Tuesday the single sale lands on. The figure a
    # purchase order actually rests on is the total across the window, so
    # it is measured separately instead of being left out and then
    # complained about.
    total_predicted = sum(predicted)
    total_actual = sum(actual)
    metrics["cumulativeError"] = (
        to_fixed(abs(total_predicted - total_actual) / total_actual * 100, 2)
        if total_actual > 0
        else None
    )
    metrics["cumulativePredicted"] = to_fixed(total_predicted, 2)
    metrics["cumulativeActual"] = total_actual
    metrics["window"] = holdout

    return BacktestResult(
        ok=True,
        metrics=metrics,
        params=params,
        holdout=holdout,
        train_rows=len(train),
    )
