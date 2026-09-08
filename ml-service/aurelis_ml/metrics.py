"""=============================================================
METRICS — the numeric contract shared with the Node baselines

This is a line-for-line port of the scoring in
server/src/ml/forecast.js and the pooling in
server/src/ml/trainer.js. It is a port and not a reimplementation
on purpose: a Python version is only allowed onto the leaderboard
because it is judged by the identical yardstick. The moment the
definitions drift, the leaderboard stops comparing models and
starts comparing metric implementations, and every ranking it
shows is a lie told with a straight face.

So the awkward details are copied rather than tidied up:
the accumulation order, the tie-breaking of the rounding, sMAPE's
denominator, and which figures are deliberately left None.

Pure stdlib plus numpy. No I/O, no database, no HTTP — everything
here is a function of its arguments, which is what makes it
testable against the Node output.
============================================================= """

from __future__ import annotations

import math
from decimal import Decimal, ROUND_HALF_UP, localcontext
from typing import Any, Iterable, Mapping, Optional, Sequence

import numpy as np

__all__ = [
    "MIN_DAYS_FOR_TRAINING",
    "MIN_DAYS_FOR_TREND",
    "score",
    "add_cumulative",
    "pool",
    "confidence_of",
]

# Below this there is no forecast, only a guess with a decimal point
# on it. Mirrors MIN_DAYS_FOR_TRAINING in forecast.js.
MIN_DAYS_FOR_TRAINING = 28
MIN_DAYS_FOR_TREND = 56


# ---------- numeric plumbing ----------

_NUMBERS = (int, float, np.integer, np.floating)


def _is_finite_number(value: Any) -> bool:
    """Node's filter is Number.isFinite, which does NOT coerce: a bool,
    a None, a string or a NaN is simply not a pairable observation
    there. Python is looser and would happily fold True in as 1.0 or
    raise on None halfway through a sum, so both are rejected here —
    bool first, because in Python it is an int subclass and would
    otherwise sail through the isinstance check."""
    if isinstance(value, bool) or not isinstance(value, _NUMBERS):
        return False
    return math.isfinite(float(value))


def _plain(value: Any) -> Any:
    """Unwrap numpy scalars. A np.float64 survives json.dumps only by
    accident of its repr in some versions; unwrapping once here keeps
    the payload posted to Node made of ordinary JSON numbers."""
    return value.item() if isinstance(value, np.generic) else value


def _summand(value: Any) -> Any:
    """A missing or non-finite entry makes the TOTAL unknown, not smaller.

    Coercing it to 0 would quietly understate a window total and the
    buyer would under-order on the strength of it. NaN is allowed to
    propagate instead, and _round turns the result into None — which is
    both the honest answer and byte-for-byte what Node produces, since
    its NaN leaves JSON.stringify as null. Finite values are passed
    through unconverted so a series of integer units stays integral."""
    if not _is_finite_number(value):
        return float("nan")
    return _plain(value)


def _round(value: Any, digits: int) -> Optional[float]:
    """JS `+x.toFixed(d)` and Python's round() disagree on ties.

    toFixed strips the sign, then picks the LARGER candidate when two
    are equidistant — round-half-away-from-zero. Python's round() is
    round-half-to-even. They agree on nearly every value, because a
    tie needs the double to sit exactly on the halfway mark, which
    only dyadic fractions do; but those turn up in exactly this sort
    of arithmetic. 0.03125 (= 1/32, an entirely ordinary mae for a
    piece selling in ones) is 0.0313 in Node and 0.0312 under round(),
    and a 1-ulp gap is enough to swap two adjacent leaderboard places.

    Decimal is handed the float itself, not str(float), so the tie is
    judged on the same binary value V8 judges rather than on a decimal
    approximation of it."""
    if value is None:
        return None
    v = float(value)
    if not math.isfinite(v):
        # Node would carry NaN/Infinity through and JSON.stringify would
        # turn it into null anyway; refusing it here means the POST body
        # stays valid JSON instead of failing Node's parse.
        return None
    with localcontext() as ctx:
        # quantize raises when the result needs more digits than the
        # context allows, which a large cumulative total genuinely can.
        ctx.prec = 60
        return float(Decimal(v).quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP))


# ---------- per-series scoring ----------

def score(actual: Sequence[Any], predicted: Sequence[Any]) -> dict:
    """Error of one predicted series against one actual series.

    Pairs are taken positionally and dropped unless BOTH sides are
    finite, matching the JS `actual.map(...).filter(Number.isFinite)`;
    zip() truncates to the shorter sequence, which lands on the same
    set of pairs Node keeps, since an unpaired index there is
    `undefined` and fails the same filter."""
    pairs = [
        (float(a), float(p))
        for a, p in zip(actual, predicted)
        if _is_finite_number(a) and _is_finite_number(p)
    ]
    n = len(pairs)

    if not n:
        # THE ONE DELIBERATE DIVERGENCE FROM NODE, and it is confined to
        # this dead end. Node returns only the nulls here, omitting the raw
        # sums, so trainer.js pool() does `ae += undefined` and NaNs the
        # mae, rmse and wape of the ENTIRE portfolio because one SKU had
        # nothing to score. The keys are always present on this side and
        # carry the zero they honestly mean, so such a SKU contributes
        # nothing rather than poisoning the catalogue figure.
        # Unreachable from a real backtest either way — that guard needs
        # MIN_DAYS_FOR_TRAINING clean days, so n is at least the 7-day
        # holdout — which is why the safer behaviour costs no comparability.
        return {
            "n": 0,
            "sumAbsError": 0.0,
            "sumSqError": 0.0,
            "sumAbsActual": 0.0,
            "mae": None,
            "rmse": None,
            "mape": None,
            "smape": None,
            "wape": None,
        }

    # Accumulated in a plain sequential loop, NOT with np.sum. numpy sums
    # pairwise for accuracy, which reorders the additions; floating-point
    # addition is not associative, so the total drifts in the last bits
    # away from Node's left-to-right `ae += e`. Being marginally less
    # accurate than numpy but identical to Node is the whole point.
    abs_error = 0.0
    sq_error = 0.0
    abs_actual = 0.0
    abs_pct_error = 0.0
    sym_abs_pct_error = 0.0
    pct_n = 0

    for a, p in pairs:
        e = abs(a - p)
        d = a - p
        abs_error += e
        # d * d, not d ** 2: multiplication is the correctly rounded IEEE
        # operation, pow() is not required to be.
        sq_error += d * d
        abs_actual += abs(a)
        if a != 0:
            abs_pct_error += e / abs(a)
            pct_n += 1
        denom = (abs(a) + abs(p)) / 2
        if denom > 0:
            sym_abs_pct_error += e / denom

    return {
        "n": n,
        # The raw sums are kept so many SKUs can be pooled into one
        # portfolio figure without averaging averages.
        "sumAbsError": abs_error,
        "sumSqError": sq_error,
        "sumAbsActual": abs_actual,
        "mae": _round(abs_error / n, 4),
        "rmse": _round(math.sqrt(sq_error / n), 4),
        # MAPE is undefined on a zero-demand day and there are a great
        # many of those on a luxury catalogue; reported only over the
        # days where it means something, and None when there are none.
        "mape": _round((abs_pct_error / pct_n) * 100, 2) if pct_n else None,
        # Divided by n, not by the number of days with a non-zero
        # denominator. A day where actual and predicted are both zero has
        # |a-p| = 0 as well, so its term is a 0/0 that the standard
        # definition takes as 0 — the model got that day exactly right.
        # Dropping such days from the denominator instead would inflate
        # sMAPE for precisely the intermittent sellers this catalogue is
        # made of, and Python would look worse than Node on identical
        # numbers. Follows forecast.js.
        "smape": _round((sym_abs_pct_error / n) * 100, 2),
        # WAPE behaves on intermittent demand where MAPE does not.
        "wape": _round((abs_error / abs_actual) * 100, 2) if abs_actual > 0 else None,
    }


def add_cumulative(
    metrics: dict,
    actual: Sequence[Any],
    predicted: Sequence[Any],
    window: int,
) -> dict:
    """Add the total-over-the-window figures to a scored dict, in place.

    Day-level error on intermittent demand is always dreadful — nobody
    can say which Tuesday the single sale lands on. The figure that
    actually decides a purchase order is the total across the window,
    so it is measured separately rather than left out.

    Lives here rather than in the backtest so that the rounding of
    cumulativePredicted (2 dp, and 1 dp once pooled) is defined once.
    The backtest owns the protocol; this owns the arithmetic."""
    # Sequential, for the same reason as in score(). Note these sum the
    # WHOLE window, censored days and all — the caller has already
    # dropped those from the series; this is not the place to second-guess
    # which days count.
    total_predicted: Any = 0
    for value in predicted:
        total_predicted += _summand(value)

    # Started at int 0 and added raw, so a series of integer units stays
    # integral exactly as it does in Node. cumulativeActual is the one
    # figure in the contract that is never rounded.
    total_actual: Any = 0
    for value in actual:
        total_actual += _summand(value)

    # A NaN total fails this comparison and yields None, which is the
    # answer: with a day missing there is no honest percentage to give.
    divisible = _is_finite_number(total_actual) and total_actual > 0

    metrics["cumulativeError"] = (
        _round((abs(total_predicted - total_actual) / total_actual) * 100, 2)
        if divisible else None
    )
    metrics["cumulativePredicted"] = _round(total_predicted, 2)
    # None rather than NaN: json.dumps would emit a bare NaN, which is not
    # JSON and which Node's JSON.parse rejects outright, failing the POST.
    metrics["cumulativeActual"] = total_actual if _is_finite_number(total_actual) else None
    metrics["window"] = window
    return metrics


# ---------- portfolio pooling ----------

def pool(results: Iterable[Mapping[str, Any]]) -> Optional[dict]:
    """Fold many per-SKU metric dicts into one portfolio figure.

    Ports pool() from trainer.js. Averaging each SKU's WAPE would let a
    piece that sold three units in a year weigh as heavily as the
    bestseller, so the raw sums are pooled and the ratios recomputed
    from them."""
    abs_error = 0.0
    sq_error = 0.0
    abs_actual = 0.0
    n = 0
    cum_abs_error = 0.0
    cum_predicted = 0.0
    cum_actual: Any = 0
    smape_weighted = 0.0

    for r in results:
        # `or 0` is wrong for a legitimate 0.0, hence the explicit None
        # checks throughout. Node reads these keys bare and would produce
        # NaN if one were missing; an absent sum means the SKU scored no
        # pairs, so it contributes nothing.
        abs_error += _number(r.get("sumAbsError"))
        sq_error += _number(r.get("sumSqError"))
        abs_actual += _number(r.get("sumAbsActual"))
        n += int(_number(r.get("n")))

        # ABSOLUTE error per SKU, then summed. Summing the SIGNED errors
        # first would let an over-forecast on one piece hide an
        # under-forecast on another and flatter the model: buy 40 too
        # many of one bracelet and 40 too few of another and a signed
        # pool reports a perfect zero, while the shop has both a
        # write-down and a stock-out. The net figure is still worth
        # knowing, so it is kept separately as cumulativeBias below —
        # separately, never instead.
        cum_abs_error += abs(_number(r.get("cumulativePredicted")) - _number(r.get("cumulativeActual")))
        cum_predicted += _number(r.get("cumulativePredicted"))
        cum_actual += _plain(r.get("cumulativeActual")) if r.get("cumulativeActual") is not None else 0

        # sMAPE is a mean already, so it pools weighted by the number of
        # observations behind it rather than by SKU.
        smape_weighted += _number(r.get("smape")) * _number(r.get("n"))

    if not n:
        return None

    return {
        "n": n,
        "mae": _round(abs_error / n, 4),
        "rmse": _round(math.sqrt(sq_error / n), 4),
        # Undefined across a catalogue full of zero-demand days. Left
        # None rather than computed from the SKUs that happen to have one,
        # which would be a different quantity wearing the same label.
        "mape": None,
        "smape": _round(smape_weighted / n, 2),
        "wape": _round((abs_error / abs_actual) * 100, 2) if abs_actual > 0 else None,
        # The figure a buyer actually acts on.
        "cumulativeError": _round((cum_abs_error / cum_actual) * 100, 2) if cum_actual > 0 else None,
        # Net bias: tells you whether the catalogue as a whole is being
        # over- or under-bought. Signed on purpose.
        "cumulativeBias": _round(((cum_predicted - cum_actual) / cum_actual) * 100, 2) if cum_actual > 0 else None,
        # 1 dp here against 2 dp per SKU — matches trainer.js.
        "cumulativePredicted": _round(cum_predicted, 1),
        "cumulativeActual": cum_actual,
    }


def _number(value: Any) -> float:
    """A missing or null metric contributes zero, not NaN."""
    if value is None or not _is_finite_number(value):
        return 0.0
    return float(value)


# ---------- confidence ----------

def confidence_of(
    days: Optional[int],
    wape: Optional[float] = None,
    cumulative_error: Optional[float] = None,
) -> str:
    """Stated from the evidence, never assumed.

    INSUFFICIENT is a real answer and the honest one below the
    threshold — the caller must show it as such and never fall back to
    a number, because a figure labelled LOW still gets acted on while a
    refusal does not."""
    if days is None or days < MIN_DAYS_FOR_TRAINING:
        return "INSUFFICIENT"

    # Judged on the error that matters for a purchase decision — how far
    # the total over the window was out — falling back to day-level WAPE
    # only when the cumulative figure is unavailable. An error of exactly
    # 0 is a real measurement and must not be read as "missing", which is
    # why this is an is-None test and not a truthiness test.
    err = cumulative_error if cumulative_error is not None else wape
    if err is None:
        return "LOW"
    if days >= 180 and err <= 15:
        return "HIGH"
    if days >= 90 and err <= 30:
        return "MEDIUM"
    return "LOW"
