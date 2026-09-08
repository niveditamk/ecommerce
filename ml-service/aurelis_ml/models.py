"""=============================================================
MODEL ZOO — the Python candidates

These are the models that justify running a second runtime at all.
Node already has naive, seasonal naive, moving average, SES and
Holt, and those are not bad; they are simply all the same shape of
idea — smooth the raw daily series and read off the level. On a
luxury catalogue where a piece sells in ones and twos with long
silences between, that shape of idea has a structural blind spot,
and no amount of hyperparameter searching fixes it.

Every model here earns its place by being a different shape:

  croston / sba / tsb    model the GAP between sales as a quantity
                         in its own right, which the Node baselines
                         cannot represent at all
  holt_winters_add       a real weekly seasonal state, carried and
                         updated, rather than a 7-day lookback
  gbdt                   a learned non-linear function of lags and
                         calendar — the only candidate that can say
                         "high on a Saturday in the Diwali run-up"
  seasonal_naive_weekly  the control, and the cross-runtime canary

They land on the SAME leaderboard as the Node baselines and are
judged by the SAME metrics (metrics.py, which is a port of
forecast.js and not a reimplementation). The honest outcome of this
whole exercise is allowed to be "the moving average won" — that is
what a leaderboard is FOR. Nothing here is weighted towards Python.

THE INTERFACE every model implements:

  key       str, unique across BOTH runtimes on the leaderboard
  label     str, shown in the console; British English
  min_days  the model's own STRUCTURAL requirement — Holt-Winters
            needs two seasons before a seasonal index means
            anything; the booster needs 28 days of warm-up before
            it can build its first feature row. The global 28-day
            training floor is NOT duplicated here. It lives with
            the backtest, which gates on
            max(model.min_days, MIN_DAYS_FOR_TRAINING), and one
            constant with two homes is a constant that will drift.
  grid      list of hyperparameter dicts to search. Never a bare
            default: leaving a window or an alpha at a guess is how
            a model ends up forecasting zero for a piece that
            plainly still sells.
  fit(y, hp, days=None) -> dict of fitted parameters
  predict(params, h)    -> float for horizon h, h starting at 1

fit() returns JSON and only JSON. The dict is serialised into
ml_versions.artifact, a TEXT column, so every value is cast with
float()/int()/tolist() on the way out. A stray np.float64 makes
json.dumps raise at the very end of a training run that has already
done all of the work.

`days` is an OPTIONAL keyword carrying the ISO calendar day of each
observation (data.Point.day). Only the booster uses it, and it has
a default so a caller written against the plain two-argument
contract still works. A caller that HAS the calendar should pass
it — see GradientBoostModel, which marks calendar features as
missing rather than inventing a calendar when it is absent.

REPRODUCIBILITY. A registry of versions nobody can reproduce is an
audit trail of nothing. Every model here is deterministic given
(y, hp): the smoothers are pure arithmetic, and the one model with
any stochastic machinery is pinned to RANDOM_STATE and records that
seed, along with the exact scikit-learn version, in its own
parameters. Note what is NOT done: no global np.random.seed() call.
A library that reaches out and mutates the caller's global RNG
state is a landmine, and it would make the CLI's results depend on
import order. Seeds are passed to the estimator that needs one.

What this module deliberately does NOT do: decide whether there is
enough history (the backtest's gate, which answers INSUFFICIENT),
compute any metric, touch the database, or make a recommendation.
It fits curves. Everything that turns a curve into advice for a
human happens elsewhere.
============================================================= """

from __future__ import annotations

import base64
import hashlib
import io
import math
from collections import OrderedDict
from datetime import date, timedelta
from typing import Any, Sequence

import numpy as np

__all__ = [
    "MODELS",
    "RANDOM_STATE",
    "SEASON_LENGTH",
    "PayloadError",
    "Model",
    "CrostonModel",
    "SBAModel",
    "TSBModel",
    "HoltWintersAdditive",
    "GradientBoostModel",
    "SeasonalNaiveWeekly",
    "list_models",
]

# The value itself is arbitrary; that it is FIXED and recorded in the
# artifact is the point. A version that cannot be reproduced cannot be
# audited, and a model nobody can audit has no business informing a
# purchase order.
RANDOM_STATE = 42

# Weekly. Retail demand has a weekday rhythm. An annual cycle would need
# two full years of history that this catalogue does not have, and
# fitting one on eighteen months would be fitting noise and calling it
# Christmas.
SEASON_LENGTH = 7


class PayloadError(RuntimeError):
    """A stored model could not be revived from its artifact.

    Raised rather than returning a number. A booster whose pickle will
    not load knows NOTHING about this SKU, and the one unacceptable
    response is a plausible-looking float. Callers catch this and report
    INSUFFICIENT, which is a true statement about what is known.
    """


# ---------------------------------------------------------------------
# Numeric plumbing
# ---------------------------------------------------------------------

def _f(value: Any, default: float = 0.0) -> float:
    """A plain, finite Python float — never a numpy scalar.

    Two jobs at once. json.dumps refuses np.float64 outright, and it
    writes NaN and Infinity as bare tokens which are not valid JSON and
    which Node's JSON.parse rejects. Both failures land at the very end,
    after the training run has done all its work, so they are headed off
    here at the point each parameter is built.
    """
    try:
        out = float(value)
    except (TypeError, ValueError):
        return float(default)
    return out if math.isfinite(out) else float(default)


def _nonneg(value: Any) -> float:
    """Clip a forecast at zero.

    Negative demand does not exist. The additive seasonal model and the
    squared-error booster can both produce one on a low-count series, and
    this is the last line of defence before a number reaches a buyer.
    Worth knowing that a clip firing often is itself a signal: it means
    that model is the wrong shape for that SKU, and the leaderboard will
    say so in the error figures without any help from here.
    """
    out = _f(value, 0.0)
    return out if out > 0.0 else 0.0


def _parse_day(value: Any) -> date | None:
    """ISO string to date, or None. Never raises."""
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _clean_series(
    y: Sequence[Any],
    days: Sequence[Any] | None = None,
) -> tuple[np.ndarray, list[date | None] | None]:
    """Coerce the input to a float array, dropping unusable observations.

    A NaN in the units column is a data bug, and the tempting fix — read
    it as zero — is the same mistake as reading a stock-out as zero
    demand. An unknown is dropped, never invented. The calendar is
    filtered through the same mask so the two cannot drift apart.

    Negative units cannot arise from demand_series() (it sums qty over
    non-cancelled orders) but would abort a Poisson fit if they ever did,
    so they are clamped. This is the only place a value is altered rather
    than dropped, and what it alters is an impossibility, not a fact.
    """
    arr = np.asarray(list(y), dtype=float).ravel()
    if arr.size == 0:
        return np.zeros(0, dtype=float), ([] if days is not None else None)

    keep = np.isfinite(arr)
    calendar: list[date | None] | None = None
    if days is not None:
        if len(days) != arr.size:
            raise ValueError(
                f"days has {len(days)} entries for a series of {arr.size}; they must "
                "line up one-to-one or every calendar feature is quietly wrong"
            )
        calendar = [_parse_day(d) for d, k in zip(days, keep) if k]

    return np.maximum(arr[keep], 0.0), calendar


def _clamp(value: float, low: float, high: float) -> float:
    """Keep a smoothing constant inside its legal range.

    A grid is a list of literals today and a config file tomorrow;
    alpha = 1.4 would run happily and produce a diverging, oscillating
    'forecast' with no error anywhere to explain it.
    """
    return low if value < low else (high if value > high else value)


def _remember(cache: "OrderedDict[str, Any]", key: str, value: Any, limit: int) -> Any:
    """Insert into a bounded LRU cache, evicting the oldest entry."""
    cache[key] = value
    cache.move_to_end(key)
    while len(cache) > limit:
        cache.popitem(last=False)
    return value


# ---------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------

class Model:
    """Common surface: key/label/min_days/grid plus fit and predict.

    Deliberately thin. There is no shared fitting logic worth hoisting,
    and a base class that quietly did half the fitting would make each
    model harder to read against the paper it came from — which is the
    only way anyone can check that it is the method it claims to be.
    """

    key: str = ""
    label: str = ""
    min_days: int = 28
    grid: list[dict] = [{}]

    @property
    def hyper(self) -> dict:
        """The default settings: the first grid entry.

        Mirrors `algo.hyper` in forecast.js, whose trainer does
        `algo.grid || [algo.hyper]`. Having both means a caller ported
        across from the Node side finds what it expects.
        """
        return dict(self.grid[0]) if self.grid else {}

    def fit(
        self,
        y: Sequence[Any],
        hp: dict | None = None,
        days: Sequence[Any] | None = None,
    ) -> dict:
        raise NotImplementedError

    def predict(self, params: dict, h: int) -> float:
        raise NotImplementedError

    def describe(self) -> dict:
        """Metadata for the console and for ml_versions.features."""
        return {
            "key": self.key,
            "label": self.label,
            "runtime": "python",
            "minDays": int(self.min_days),
            "grid": [dict(g) for g in self.grid],
        }

    def __repr__(self) -> str:  # pragma: no cover - debugging convenience
        return f"<{type(self).__name__} {self.key}>"


# ---------------------------------------------------------------------
# Intermittent demand: Croston and its descendants
# ---------------------------------------------------------------------

class CrostonModel(Model):
    """Croston (1972). Two smoothers: demand SIZE and the INTERVAL
    between demands. Forecast rate = size / interval.

    WHY IT BELONGS HERE — this is the single biggest modelling upgrade
    available on this data, and the argument is structural rather than
    empirical.

    Take a bracelet that sells 2 units roughly every 10 days. The series
    is 0,0,0,0,0,0,0,0,0,2,0,0,... Simple exponential smoothing sees a
    long run of zeros pulling its level down, then one spike pulling it
    back up, and settles somewhere near 0.2 by accident of arithmetic. It
    has no representation of "every ten days" anywhere in its state. Ask
    any Node baseline what the interval is and there is no attribute to
    read, because the concept does not exist in the model.

    Croston holds it explicitly. Size is smoothed over the sale days
    only, so the zeros cannot drag it down, and interval is smoothed over
    the observed gaps. That gives two numbers a buyer can actually use —
    "about 2 at a time, about every 10 days" — and their ratio is the
    daily rate. Same rate as SES might land on, arrived at in a way that
    is inspectable and that degrades sensibly.

    The forecast is FLAT in h, and that is not a limitation being
    apologised for: Croston estimates a rate, not a shape. Nobody can say
    which Tuesday the sale lands on, and a model that pretended to would
    be scored badly on day-level error for the privilege. What a reorder
    needs is the total over 30 days, and a rate multiplied by 30 is
    exactly that.

    KNOWN FLAW, addressed by the two subclasses below: the ratio of two
    independently smoothed quantities is a biased estimator of the ratio
    (Syntetos & Boylan 2001), and because Croston only updates on demand
    days it never notices a line going quiet — see TSBModel.
    """

    key = "croston"
    label = "Croston (intermittent demand)"
    # Two demand epochs is the structural minimum for a single observed
    # interval; the 28-day floor the backtest applies is far stricter and
    # is what actually binds.
    min_days = 28
    # Low alphas dominate the literature for intermittent series — the
    # evidence arrives a few days a month, so it should move the estimate
    # slowly. The upper end is carried anyway in case a piece genuinely
    # changed behaviour.
    grid = [{"alpha": a} for a in (0.05, 0.1, 0.15, 0.2, 0.3, 0.4)]

    def _bias_factor(self, alpha: float) -> float:
        """Croston as published applies no correction. SBA overrides."""
        return 1.0

    def fit(
        self,
        y: Sequence[Any],
        hp: dict | None = None,
        days: Sequence[Any] | None = None,
    ) -> dict:
        hp = hp or {}
        alpha = _clamp(_f(hp.get("alpha", 0.1), 0.1), 0.01, 0.99)
        obs, _ = _clean_series(y)
        n = int(obs.size)
        nz = np.flatnonzero(obs > 0)
        epochs = int(nz.size)

        if n == 0 or epochs == 0:
            # No sale in the whole clean window. The rate is 0 and that is
            # a measurement, not a refusal: these are days the piece was
            # ON the shelf and nobody bought it. Whether 0 is trustworthy
            # is the backtest's question, answered by day count.
            return self._params(alpha, size=0.0, interval=float(max(n, 1)), n=n, epochs=0)

        # INITIALISATION MATTERS MORE THAN THE RECURSION HERE. With
        # alpha = 0.05 and perhaps five demand epochs in a year, the
        # smoother barely moves off its starting value, so the starting
        # value is most of the answer. Textbook Croston seeds from the
        # FIRST non-zero observation and the FIRST gap — a sample of one
        # each, and on this data that single sale is as likely to be an
        # outlier as anything. Seeded instead from the whole clean
        # window: mean size across all demand days, and mean periods per
        # demand day. Both are unbiased summaries of everything observed,
        # and the recursion then tilts them towards recent behaviour.
        size = float(obs[nz].mean())
        interval = float(n) / float(epochs)

        gap = 0
        first_epoch_seen = False
        for t in range(n):
            gap += 1
            if obs[t] <= 0:
                continue
            if first_epoch_seen:
                # The gap is a genuine inter-arrival time only between two
                # observed sales. The stretch before the FIRST ever sale is
                # not an interval — it is how long we happened to have been
                # watching before anything happened — and folding it in
                # inflates the interval, which deflates the rate, which
                # under-buys. Used to reset the counter and nothing else.
                interval += alpha * (float(gap) - interval)
                size += alpha * (float(obs[t]) - size)
            else:
                size += alpha * (float(obs[t]) - size)
                first_epoch_seen = True
            gap = 0

        # An interval below one period is not a thing that can happen; the
        # smoother can nonetheless drift under 1.0 on a run of consecutive
        # sale days and would then forecast a rate above the largest order
        # ever placed.
        interval = max(interval, 1.0)
        return self._params(alpha, size=size, interval=interval, n=n, epochs=epochs)

    def _params(self, alpha: float, size: float, interval: float, n: int, epochs: int) -> dict:
        factor = self._bias_factor(alpha)
        rate = (size / interval) * factor if interval > 0 else 0.0
        return {
            "model": self.key,
            "alpha": _f(alpha),
            # Reported separately from the rate on purpose: "about 2 at a
            # time, about every 9 days" is a sentence a buyer can check
            # against their own sense of the piece, and 0.22 is not.
            "size": _f(size),
            "interval": _f(interval),
            "bias_factor": _f(factor, 1.0),
            "rate": _nonneg(rate),
            "demand_periods": int(epochs),
            "periods": int(n),
        }

    def predict(self, params: dict, h: int) -> float:
        """Flat. Croston gives a rate; the horizon does not change it."""
        return _nonneg(params.get("rate"))


class SBAModel(CrostonModel):
    """Syntetos-Boylan Approximation: Croston scaled by (1 - alpha/2).

    WHY IT BELONGS HERE — Croston's estimator is provably biased upward,
    and on this catalogue that bias costs money in the most boring
    possible way.

    The mechanism: the forecast is size/interval, a ratio of two
    independently smoothed quantities. The expectation of a ratio is not
    the ratio of the expectations, and the curvature of 1/x means the
    error does not cancel out over many periods — it accumulates on one
    side. Syntetos & Boylan (2001) derived the size of it and showed that
    multiplying by (1 - alpha/2) removes almost all of it. That is the
    whole modification: same fit, one constant applied at the end.

    Concretely, at alpha = 0.2 the correction is 10%. Over a 90-day
    horizon on a piece with a 0.3/day rate, that is nearly 3 units of
    systematic over-buy, every quarter, on every intermittent line in the
    catalogue at once. It never shows up as a dramatic error on any one
    SKU, which is exactly why it survives unnoticed until someone counts
    the ageing stock.

    Both are on the leaderboard rather than only the corrected one,
    because the point of a leaderboard is to show the correction earning
    its place on THIS data rather than to assert it from a paper. If SBA
    does not beat Croston here, that is a finding worth seeing.

    Where it is harmless: on a fast-moving line the interval sits near 1,
    the estimator is barely biased, and SBA is a Croston shaved by a few
    per cent. It cannot do damage on data it does not suit.
    """

    key = "sba"
    label = "Syntetos-Boylan (bias-corrected Croston)"
    min_days = 28
    grid = [{"alpha": a} for a in (0.05, 0.1, 0.15, 0.2, 0.3, 0.4)]

    def _bias_factor(self, alpha: float) -> float:
        # Applied ONCE, here, when the rate is assembled — never again at
        # predict time. Applying it in both places would square it, and a
        # silent extra 10% shave is precisely the class of error this
        # model exists to remove.
        return 1.0 - (alpha / 2.0)


class TSBModel(Model):
    """Teunter-Syntetos-Babai (2011). Smooths demand PROBABILITY every
    period and demand SIZE on demand periods. Forecast = probability x
    size.

    WHY IT BELONGS HERE — Croston has an obsolescence blind spot, and a
    luxury catalogue is full of exactly the lines that fall into it.

    Croston updates its state ONLY on days with a sale. A necklace that
    sold steadily until March and has sold nothing since leaves Croston
    frozen at its March estimate: the interval smoother is never touched
    again, because touching it requires a sale. Six months later it will
    still forecast the March rate with complete confidence. The reorder
    logic downstream then keeps proposing purchases for a piece the shop
    has quietly stopped selling, and every one of those proposals looks
    perfectly reasonable on the console.

    TSB replaces the interval with a probability that is updated EVERY
    period — upward on a sale, downward on a zero. Silence is evidence,
    and it is evidence that decays the forecast geometrically. On the
    necklace above, the probability halves and halves again until the
    forecast is honestly near zero. That is the difference between a
    model that notices a line dying and one that cannot.

    The cost of that sensitivity is that TSB will also fade a piece that
    is merely between sales, so it is not automatically better than SBA —
    it depends entirely on how much of this catalogue is genuinely going
    obsolete. Which is a question for the leaderboard, not for me.

    Separate alpha and beta because the two quantities move at different
    speeds: how much someone buys is fairly stable, whether anyone is
    still buying can change for good. Tying them to one rate would force
    a compromise that suits neither.
    """

    key = "tsb"
    label = "Teunter-Syntetos-Babai (obsolescence-aware)"
    min_days = 28
    # beta is kept at or below alpha throughout. A brisk beta on a piece
    # that sells fortnightly reads thirteen ordinary quiet days as a line
    # going obsolete and fades a healthy seller to nothing.
    grid = [
        {"alpha": a, "beta": b}
        for a in (0.05, 0.1, 0.2, 0.3)
        for b in (0.02, 0.05, 0.1)
    ]

    def fit(
        self,
        y: Sequence[Any],
        hp: dict | None = None,
        days: Sequence[Any] | None = None,
    ) -> dict:
        hp = hp or {}
        alpha = _clamp(_f(hp.get("alpha", 0.1), 0.1), 0.01, 0.99)
        beta = _clamp(_f(hp.get("beta", 0.05), 0.05), 0.01, 0.99)
        obs, _ = _clean_series(y)
        n = int(obs.size)
        nz = np.flatnonzero(obs > 0)
        epochs = int(nz.size)

        if n == 0 or epochs == 0:
            return self._params(alpha, beta, size=0.0, prob=0.0, n=n, epochs=0)

        # Same reasoning as Croston: with a small alpha the seed is most
        # of the answer, so both start from the whole clean window rather
        # than from the first observation.
        size = float(obs[nz].mean())
        prob = float(epochs) / float(n)

        for t in range(n):
            if obs[t] > 0:
                # Size is updated on demand days ONLY. Folding the zeros
                # into the size smoother would answer a different
                # question — average daily units — and destroy the one
                # thing this family is for, which is keeping "how many
                # when it sells" separate from "how often it sells".
                size += alpha * (float(obs[t]) - size)
                prob += beta * (1.0 - prob)
            else:
                # The decay. This line is the whole model.
                prob += beta * (0.0 - prob)

        # Floating point can put a probability a hair outside [0, 1] after
        # a few hundred updates.
        prob = _clamp(prob, 0.0, 1.0)
        return self._params(alpha, beta, size=size, prob=prob, n=n, epochs=epochs)

    def _params(self, alpha: float, beta: float, size: float, prob: float, n: int, epochs: int) -> dict:
        return {
            "model": self.key,
            "alpha": _f(alpha),
            "beta": _f(beta),
            "size": _f(size),
            # Readable on its own: "a 12% chance of selling on any given
            # day, about 2 units when it does".
            "probability": _f(prob),
            "rate": _nonneg(prob * size),
            "demand_periods": int(epochs),
            "periods": int(n),
        }

    def predict(self, params: dict, h: int) -> float:
        """Flat, like Croston.

        The probability decays with OBSERVED silence, not with forecast
        distance. Decaying it further across the horizon would be
        inventing evidence that has not arrived yet — it would say the
        piece is more obsolete in week six than in week one purely
        because week six is further away.
        """
        return _nonneg(params.get("rate"))


# ---------------------------------------------------------------------
# Seasonal
# ---------------------------------------------------------------------

class HoltWintersAdditive(Model):
    """Holt-Winters additive, weekly period, damped trend. Implemented
    directly in numpy — statsmodels is not installed and will not be.

    WHY IT BELONGS HERE — it is the only candidate that carries a weekly
    shape as STATE, and the Node side has nothing that does.

    forecast.js has `seasonal_naive`, which reads yesterweek's value
    straight off the tail. That is a lookup, not a model: it has no level
    to sit the pattern on, no trend, and it inherits every bit of noise
    from the one day it copies. If last Saturday happened to be a
    write-off, this Saturday is forecast as a write-off.

    Holt-Winters keeps three states and updates all three every day: a
    level, a damped trend, and seven seasonal offsets refreshed on a
    rolling basis. So a genuine weekend lift is estimated from every
    Saturday in the history rather than the most recent one, and it rides
    on top of a level that can drift and a trend that can bend.

    THE TREND IS DAMPED and phi is deliberately NOT in the grid. Left
    free, the search would reliably pick phi near 1 because undamped
    trends fit the training tail beautifully, and the model would then
    extrapolate a fortnight's upswing into an annual straight line —
    forecasting 40 units a day of a piece that sells 3. Damping is a
    safety constraint on an unbounded extrapolation, not a parameter to
    be optimised, so it is fixed at 0.90: after 30 days the trend has
    contributed roughly 9 days' worth and stopped, which is as far as a
    fortnight of evidence can honestly reach.

    Expected to LOSE on the intermittent lines, and that is fine. An
    additive seasonal fitted to 0,0,0,0,2,0,0 produces offsets that are
    mostly noise, and the clip at zero will fire constantly. It is here
    for the pieces that genuinely do have a weekday rhythm — a
    steady-selling line where Saturday really is triple Tuesday — and the
    per-SKU champion selection is what routes it to those and away from
    the rest.
    """

    key = "holt_winters_add"
    label = "Holt-Winters (weekly seasonal, damped)"
    # Two full periods is the structural floor for a seasonal index that
    # is estimated rather than assumed. MIN_DAYS_FOR_TREND in forecast.js
    # is the same 56 for the same reason.
    min_days = 56
    grid = [
        {"alpha": a, "beta": b, "gamma": g, "phi": 0.90}
        for a in (0.1, 0.3, 0.5)
        for b in (0.02, 0.1)
        for g in (0.05, 0.3)
    ]

    def fit(
        self,
        y: Sequence[Any],
        hp: dict | None = None,
        days: Sequence[Any] | None = None,
    ) -> dict:
        hp = hp or {}
        alpha = _clamp(_f(hp.get("alpha", 0.3), 0.3), 0.01, 0.99)
        beta = _clamp(_f(hp.get("beta", 0.1), 0.1), 0.0, 0.99)
        gamma = _clamp(_f(hp.get("gamma", 0.1), 0.1), 0.0, 0.99)
        phi = _clamp(_f(hp.get("phi", 0.90), 0.90), 0.0, 1.0)

        obs, _ = _clean_series(y)
        n = int(obs.size)
        m = SEASON_LENGTH

        if n == 0:
            return self._params(alpha, beta, gamma, phi, 0.0, 0.0, [0.0] * m, 0)

        full_periods = n // m

        if full_periods >= 2:
            first = float(obs[:m].mean())
            second = float(obs[m:2 * m].mean())
            level = first
            # Per-day trend: the whole-week difference spread across the
            # seven days it took to happen. Using the raw weekly
            # difference here would apply a week's growth every day.
            trend = (second - first) / float(m)
            # Each slot's average deviation from its own week's mean,
            # across every complete week. Averaging over all of them
            # rather than just the first is what makes the offsets an
            # estimate rather than a snapshot.
            offsets = np.zeros(m, dtype=float)
            for i in range(m):
                deviations = [
                    float(obs[j * m + i] - obs[j * m:(j + 1) * m].mean())
                    for j in range(full_periods)
                ]
                offsets[i] = float(np.mean(deviations))
            # Additive offsets must sum to zero or they carry a constant
            # that belongs to the level, which double-counts and leaves
            # the level chasing a bias it can never catch.
            offsets -= offsets.mean()
            season = [float(v) for v in offsets]
        else:
            # THE GUARD. Below two periods there is no second week to
            # compare the first against, so there is no evidence for
            # either a weekly shape or a trend.
            #
            # Setting the initial offsets flat is NOT enough on its own,
            # and this is the trap. The recursion below would happily
            # rebuild a seasonal pattern from that flat start — with 10
            # days of history, three slots get two observations each and
            # four get one, so every offset is an estimate from a single
            # day, and those offsets are then projected forward for as
            # long as anyone asks. It looks exactly like a weekly rhythm
            # and it is one day of noise per slot.
            #
            # So beta and gamma are forced to zero for the whole fit and
            # the model genuinely degrades to simple exponential
            # smoothing — a level and nothing else, which is all the
            # evidence supports. The EFFECTIVE values are what gets
            # recorded in the parameters, not the ones asked for, so the
            # artifact does not claim a gamma the fit never applied.
            #
            # In practice min_days = 56 keeps the backtest out of here;
            # a caller refitting a champion on a short clean series can
            # still arrive, and the answer must be defined.
            level = float(obs[:min(n, m)].mean())
            trend = 0.0
            season = [0.0] * m
            beta = 0.0
            gamma = 0.0

        for t in range(n):
            slot = t % m
            prev_level = level
            prev_trend = trend
            prev_season = season[slot]

            level = alpha * (float(obs[t]) - prev_season) + (1.0 - alpha) * (prev_level + phi * prev_trend)
            trend = beta * (level - prev_level) + (1.0 - beta) * phi * prev_trend
            # Deviation from the PRE-update level and trend. Using the
            # freshly updated level would let the seasonal term absorb
            # what the level has already explained, and the two states
            # would then fight each other for the same signal.
            season[slot] = gamma * (float(obs[t]) - prev_level - phi * prev_trend) + (1.0 - gamma) * prev_season

        # Rotated so index 0 is the offset for h = 1. The alternative is
        # storing n and recomputing (n + h - 1) % m at every predict call,
        # which is one fencepost error away from forecasting Tuesday's
        # pattern on a Saturday — a bug that produces entirely plausible
        # numbers and would never be spotted by eye.
        forward = [float(season[(n + k) % m]) for k in range(m)]
        return self._params(alpha, beta, gamma, phi, level, trend, forward, n, full_periods >= 2)

    def _params(
        self,
        alpha: float,
        beta: float,
        gamma: float,
        phi: float,
        level: float,
        trend: float,
        season: list[float],
        n: int,
        seasonal_evidence: bool = True,
    ) -> dict:
        return {
            "model": self.key,
            # EFFECTIVE, not requested. Below two periods beta and gamma
            # are forced to zero and these read 0.0 accordingly.
            "alpha": _f(alpha),
            "beta": _f(beta),
            "gamma": _f(gamma),
            # False means the fit ran as plain exponential smoothing
            # because there was not enough history for a weekly shape.
            "seasonal_evidence": bool(seasonal_evidence),
            "phi": _f(phi),
            "level": _f(level),
            "trend": _f(trend),
            # Ordered for forecasting: season[0] applies to h = 1.
            "season": [_f(v) for v in season],
            "period": int(SEASON_LENGTH),
            "periods": int(n),
        }

    def predict(self, params: dict, h: int) -> float:
        step = max(1, int(h))
        level = _f(params.get("level"))
        trend = _f(params.get("trend"))
        phi = _clamp(_f(params.get("phi", 0.90), 0.90), 0.0, 1.0)
        season = params.get("season") or [0.0]
        m = len(season)

        # The damping sum phi + phi^2 + ... + phi^h, in closed form. It
        # converges to phi/(1-phi), so at phi = 0.90 the trend can never
        # contribute more than nine days' worth however long the horizon.
        # That ceiling is the entire safety property; the geometric-series
        # identity is undefined at phi = 1, which is the undamped case, so
        # that branch is handled explicitly rather than by a near-zero
        # division producing an enormous number.
        if phi >= 1.0:
            damped = float(step)
        else:
            damped = phi * (1.0 - phi ** step) / (1.0 - phi)

        offset = _f(season[(step - 1) % m]) if m else 0.0
        return _nonneg(level + damped * trend + offset)


# ---------------------------------------------------------------------
# Gradient boosting
# ---------------------------------------------------------------------

# Lags and rolling windows. 1/2/3 catch the immediate run, 7/14/28 the
# same weekday one, two and four weeks back. The rolling means give the
# tree a smoothed level it would otherwise have to reconstruct by
# splitting on six lags at once, which it cannot do with 40-odd training
# rows.
GB_LAGS: tuple[int, ...] = (1, 2, 3, 7, 14, 28)
GB_ROLLS: tuple[int, ...] = (7, 28)

# The first day that can have a full feature row. Every lag and every
# rolling window must fit behind it.
GB_WARMUP: int = max(max(GB_LAGS), max(GB_ROLLS))

# Backstop for a caller that ignored min_days. Not a judgement about how
# much data is enough — that is the backtest's job, and its answer is
# INSUFFICIENT. This is the point below which fitting is meaningless
# rather than merely thin: the legitimate worst case is a backtest at the
# 90-day floor, which trains on 72 days and so yields 44 rows, comfortably
# above this. Anything under it means the gate upstream did not run.
GB_MIN_ROWS: int = 20

GB_FEATURES: list[str] = (
    [f"lag_{lag}" for lag in GB_LAGS]
    + [f"roll_mean_{w}" for w in GB_ROLLS]
    + ["day_of_week", "day_of_month", "month", "festive_window"]
)

# Diwali is lunar and moves by up to three weeks between years, so the
# "late October" shorthand in the brief is right about half the time and
# a fixed 20-31 October window would put the flag on the wrong fortnight
# in 2023 (12 November) and land it after the event in 2020 (14
# November). These are the observed dates. Outside the table the flag is
# NaN — UNKNOWN, not "no festival" — because a fabricated zero would
# teach the model that a genuine festive spike happened in an ordinary
# week, which is worse than not knowing. Extend the table; do not
# extrapolate it.
DIWALI: dict[int, tuple[int, int]] = {
    2019: (10, 27),
    2020: (11, 14),
    2021: (11, 4),
    2022: (10, 24),
    2023: (11, 12),
    2024: (11, 1),
    2025: (10, 20),
    2026: (11, 8),
    2027: (10, 29),
    2028: (10, 17),
}

# Jewellery sells in the RUN-UP, not on the day — the gifting is done by
# the time the lamps are lit, and the days after are flat. An asymmetric
# window says that; a symmetric one would dilute the signal with a week
# of ordinary trading.
FESTIVE_LEAD_DAYS = 21
FESTIVE_TAIL_DAYS = 3

# Bounded caches keyed by the fingerprint each fit stamps into its own
# parameters. See GradientBoostModel.predict for why these exist at all.
_ESTIMATOR_CACHE: "OrderedDict[str, Any]" = OrderedDict()
_ROLLOUT_CACHE: "OrderedDict[str, dict]" = OrderedDict()
_ESTIMATOR_CACHE_LIMIT = 8
_ROLLOUT_CACHE_LIMIT = 32

_SK: tuple[Any, str, Any] | None = None


def _sklearn() -> tuple[Any, str, Any]:
    """Import scikit-learn and joblib on first use.

    Importing sklearn costs the best part of a second. MODELS is built at
    module import, and a caller listing the model keys, or running only
    Croston, should not pay for a library it never touches.
    """
    global _SK
    if _SK is None:
        import joblib
        import sklearn
        from sklearn.ensemble import HistGradientBoostingRegressor

        _SK = (joblib, str(sklearn.__version__), HistGradientBoostingRegressor)
    return _SK


def _festive_flag(when: date) -> float:
    """1.0 inside the Diwali window, 0.0 outside it, NaN if unknown."""
    md = DIWALI.get(when.year)
    if md is None:
        return float("nan")
    diwali = date(when.year, md[0], md[1])
    delta = (when - diwali).days
    return 1.0 if -FESTIVE_LEAD_DAYS <= delta <= FESTIVE_TAIL_DAYS else 0.0


def _gb_row(history: np.ndarray, when: date | None) -> list[float]:
    """One feature row for the day that follows `history`.

    `history` must already hold at least GB_WARMUP observations; the
    caller guarantees it, because a short slice here would silently wrap
    around to the end of the array through negative indexing and produce
    a feature row built from the future.
    """
    size = int(history.size)
    row: list[float] = [float(history[size - lag]) for lag in GB_LAGS]
    row += [float(history[size - w:].mean()) for w in GB_ROLLS]

    if when is None:
        # NaN, not zero. HistGradientBoostingRegressor has native missing
        # value support — it learns which side of a split unknowns belong
        # on — so "we do not have a calendar" is expressible directly. A
        # zero here would be a claim that every day was a Monday the 1st
        # of January.
        row += [float("nan")] * 4
    else:
        # Monday = 0. Which day maps to which integer does not matter to a
        # tree; that the mapping is CONSISTENT between fit and predict is
        # everything.
        row += [
            float(when.weekday()),
            float(when.day),
            float(when.month),
            _festive_flag(when),
        ]
    return row


class GradientBoostModel(Model):
    """HistGradientBoostingRegressor over engineered lag and calendar
    features, predicted recursively.

    WHY IT BELONGS HERE — every other model in both runtimes is additive
    and separable. This is the only one that can learn an INTERACTION.

    A smoother says "the level is 3 and Saturdays are +40%". It cannot
    say "Saturdays are +40% except in the Diwali run-up when they are
    +200%, and none of that applies if the last three days were already
    elevated" — that is a conditional, and a tree ensemble is made of
    conditionals. On a festive-season catalogue in India that particular
    interaction is not a hypothetical; it is most of the year's revenue.

    It is also the only model here that can use a calendar at all. The
    smoothers see an undifferentiated sequence of numbers.

    THE HONEST CAVEATS, because this is the model most likely to be
    believed on the strength of its name alone:

    * It is fitted on roughly 40 rows at the 90-day floor (90 days, less
      an 18-day holdout, less 28 days of warm-up). That is a small number
      for a gradient booster and the grid is kept tiny and heavily
      regularised because of it. A deep model on 40 rows memorises them.
    * Recursive multi-step prediction compounds its own errors: day 30 is
      predicted from 29 previous predictions. The lag features degrade
      into the model's own opinion of itself. This is inherent to
      autoregressive forecasting, not a bug to be fixed, and it is
      exactly what the backtest measures.
    * The lags are POSITIONAL over the clean series. Censored days have
      already been removed upstream, so for a SKU with many stock-outs
      "lag_1" is the previous TRADING day, not literally yesterday. That
      is the right call — the alternative is training on the fabricated
      zeros of an empty shelf — but it does mean lag semantics vary by
      SKU, and it is another reason to distrust a suspiciously good score
      on a piece that was out of stock half the year.

    Poisson loss is in the grid alongside squared error. Daily unit sales
    are counts: non-negative integers, variance rising with the mean.
    Squared error assumes constant variance and symmetric costs, so it
    over-weights the one day that sold six and can predict a negative.
    Poisson is the matching likelihood and cannot go below zero. Both are
    carried rather than assuming, because on a near-continuous
    fast-selling line the difference is negligible.
    """

    key = "gbdt"
    label = "Gradient boosting (lags, calendar, festive window)"
    # 28 days of warm-up before the first feature row exists, plus enough
    # rows after it to be worth fitting. Below 90 the answer is a
    # memorised training set with an impressive-looking fit.
    min_days = 90
    # SMALL ON PURPOSE. Every entry is a full fit-and-backtest for every
    # SKU, and every fitted candidate carries a payload of hundreds of
    # kilobytes. A 20-point grid here would make the training run take
    # minutes and the artifact tens of megabytes, to search a space that
    # 40 training rows cannot distinguish between anyway.
    grid = [
        {
            "loss": "poisson",
            "learning_rate": 0.06,
            "max_iter": 150,
            "max_leaf_nodes": 8,
            "min_samples_leaf": 5,
            "l2_regularization": 1.0,
        },
        {
            "loss": "squared_error",
            "learning_rate": 0.06,
            "max_iter": 150,
            "max_leaf_nodes": 8,
            "min_samples_leaf": 5,
            "l2_regularization": 1.0,
        },
        {
            # The deliberately blunt one: shallow, few iterations, heavily
            # penalised. On a thin series this frequently wins, and when
            # it does that is worth knowing.
            "loss": "poisson",
            "learning_rate": 0.1,
            "max_iter": 80,
            "max_leaf_nodes": 4,
            "min_samples_leaf": 10,
            "l2_regularization": 5.0,
        },
    ]

    def fit(
        self,
        y: Sequence[Any],
        hp: dict | None = None,
        days: Sequence[Any] | None = None,
    ) -> dict:
        hp = hp or {}
        joblib, sklearn_version, HistGradientBoostingRegressor = _sklearn()

        obs, calendar = _clean_series(y, days)
        n = int(obs.size)
        rows_available = n - GB_WARMUP

        if rows_available < GB_MIN_ROWS:
            # A contract violation by the caller, not a data condition —
            # min_days is 90 and the backtest is supposed to gate on it.
            # Raised rather than fitted on a handful of rows, because a
            # model fitted on a handful of rows still returns confident
            # floats and nothing downstream would ever know.
            raise ValueError(
                f"gbdt needs {GB_WARMUP} days of warm-up before its first feature row and "
                f"{GB_MIN_ROWS} rows after it; {n} clean day(s) leaves {max(rows_available, 0)}. "
                f"The caller should have gated on min_days={self.min_days}."
            )

        matrix = np.asarray(
            [
                _gb_row(obs[:t], calendar[t] if calendar else None)
                for t in range(GB_WARMUP, n)
            ],
            dtype=float,
        )
        target = obs[GB_WARMUP:]

        # DROP COLUMNS THAT ARE ENTIRELY MISSING, and remember which
        # survived. Two reasons, one principled and one a landmine.
        #
        # Principled: a column with no observed value anywhere cannot
        # inform a split, so it is noise in the feature-importance report
        # and a lie in ml_versions.features.
        #
        # The landmine: scikit-learn 1.9.0 does not survive an all-NaN
        # column. Its binner takes the distinct non-missing values and
        # runs a 2-wide sliding window over them for the midpoints; with
        # zero distinct values that raises "window shape cannot be larger
        # than input array shape" from deep inside a joblib worker, with
        # nothing in the message connecting it to a feature. And this is
        # not a corner case here — it is the DEFAULT one. A caller using
        # the plain two-argument fit(y, hp) has no calendar, so all four
        # calendar columns are NaN and every fit would fail. It also
        # fires on a real SKU whose window falls in a year missing from
        # the DIWALI table, which makes festive_window all-NaN on its own.
        keeps = [j for j in range(matrix.shape[1]) if bool(np.isfinite(matrix[:, j]).any())]
        if not keeps:
            raise ValueError("gbdt found no usable feature column; the series carries no signal at all")
        dropped = [GB_FEATURES[j] for j in range(matrix.shape[1]) if j not in keeps]
        matrix = matrix[:, keeps]

        loss = str(hp.get("loss", "poisson"))
        last_day = calendar[-1] if calendar and calendar[-1] else None
        base = {
            "model": self.key,
            "hyper": {
                "loss": loss,
                "learning_rate": _f(hp.get("learning_rate", 0.06), 0.06),
                "max_iter": int(hp.get("max_iter", 150)),
                "max_leaf_nodes": int(hp.get("max_leaf_nodes", 8)),
                "min_samples_leaf": int(hp.get("min_samples_leaf", 5)),
                "l2_regularization": _f(hp.get("l2_regularization", 1.0), 1.0),
            },
            # The columns actually fitted on, in order, and the ones that
            # held nothing. predict() must slice the same way or every
            # feature after the first gap is read as a different feature —
            # a bug that produces entirely plausible numbers.
            "features": [GB_FEATURES[j] for j in keeps],
            "dropped_features": dropped,
            "columns": [int(j) for j in keeps],
            # False means the four calendar columns were fed as NaN and
            # this model is purely autoregressive. Recorded because it
            # changes what the model IS, and a leaderboard entry that
            # silently lost its calendar should be visible as such.
            "calendar": bool(calendar is not None and any(c is not None for c in calendar)),
            "last_day": last_day.isoformat() if last_day else None,
            # The seed for the recursion: the last GB_WARMUP observed
            # days, which is exactly what one feature row needs.
            "history": [_f(v) for v in obs[-GB_WARMUP:].tolist()],
            "train_rows": int(matrix.shape[0]),
            # A pickle is only loadable by a compatible scikit-learn.
            # Recording the version turns a future "cannot unpickle" into
            # a diagnosis instead of a mystery.
            "sklearn_version": sklearn_version,
            "random_state": int(RANDOM_STATE),
        }

        # A CONSTANT TARGET — in practice, a window in which the piece
        # was on the shelf every day and sold nothing at all. That is an
        # ordinary state for a luxury catalogue, not an error, and it
        # must not take the training run down with it.
        #
        # There is nothing for a booster to learn: every split scores
        # identically, so the ensemble can only ever return that one
        # number. Poisson loss refuses the all-zero case outright
        # (sklearn requires sum(y) > 0) and squared error would spend 150
        # iterations and a six-figure payload rediscovering it. Recorded
        # as the constant it is, in a few bytes.
        #
        # Returning 0 here is a MEASUREMENT, not a guess: these are days
        # the piece was available and nobody bought it. Whether that zero
        # is worth acting on is the backtest's question, answered by day
        # count, and the answer below the floor is INSUFFICIENT.
        if float(target.min()) == float(target.max()):
            constant = _nonneg(float(target.min()))
            return {
                **base,
                "degenerate": True,
                "constant": constant,
                "payload": None,
                "payload_bytes": 0,
                "fingerprint": None,
                "notes": (
                    f"Every day in the fitting window was {constant:g}; "
                    "stored as a constant because there is nothing else in it."
                ),
            }

        estimator = HistGradientBoostingRegressor(
            loss=loss,
            learning_rate=_f(hp.get("learning_rate", 0.06), 0.06),
            max_iter=int(hp.get("max_iter", 150)),
            max_leaf_nodes=int(hp.get("max_leaf_nodes", 8)),
            min_samples_leaf=int(hp.get("min_samples_leaf", 5)),
            l2_regularization=_f(hp.get("l2_regularization", 1.0), 1.0),
            # Explicitly off. The default 'auto' switches early stopping
            # on above 10,000 samples, so it happens to be off here — but
            # relying on a threshold in someone else's library to keep our
            # results reproducible is not a decision, it is a coincidence.
            # It would also carve a validation split out of 40 rows.
            early_stopping=False,
            random_state=RANDOM_STATE,
        )
        estimator.fit(matrix, target)

        # ARTIFACT SIZE. ml_versions.artifact is one TEXT column holding
        # every SKU's parameters, and base64 costs a further 4/3 on top of
        # the pickle. A 150-iteration, 8-leaf model compresses to roughly
        # 60-200 KB, so call it 80-270 KB of base64 per SKU: a 60-SKU
        # catalogue where gbdt wins everywhere is a 5-15 MB JSON document
        # being parsed on every serve. joblib's zlib compression is what
        # keeps that in the megabytes rather than the tens of megabytes,
        # and payload_bytes is reported so the console can show the cost
        # rather than discovering it as a slow page. If this becomes a
        # problem the fix is to store payloads outside the artifact and
        # keep a reference here — not to shrink the grid further.
        buffer = io.BytesIO()
        joblib.dump(estimator, buffer, compress=("zlib", 3))
        payload = base64.b64encode(buffer.getvalue()).decode("ascii")
        # Content hash of the fitted model, computed ONCE. It is the cache
        # key at predict time; hashing the payload on every call would
        # cost more than the prediction.
        fingerprint = hashlib.sha1(payload.encode("ascii")).hexdigest()

        return {
            **base,
            "degenerate": False,
            "payload": payload,
            "payload_bytes": int(len(payload)),
            "fingerprint": fingerprint,
        }

    def predict(self, params: dict, h: int) -> float:
        """Recursive multi-step: predict day 1, feed it back, repeat.

        The backtest calls this for h = 1, 2, ... H separately, so a naive
        implementation would roll out from scratch every time — O(H^2)
        estimator calls, each one preceded by unpickling a few hundred
        kilobytes. On a 90-day window that is thousands of predictions and
        several seconds per SKU per grid entry. The rollout is therefore
        cached by fingerprint and EXTENDED in place as the horizon grows,
        which brings it back to O(H). Both caches are bounded; a
        catalogue's worth of unpickled boosters would otherwise sit in
        memory for the life of the process.
        """
        # A window with nothing in it but one repeated value was stored as
        # that value; there is no ensemble to roll out.
        if params.get("degenerate"):
            return _nonneg(params.get("constant"))
        step = max(1, int(h))
        rollout = self._rollout(params, step)
        return _nonneg(rollout[step - 1])

    def _rollout(self, params: dict, horizon: int) -> list[float]:
        fingerprint = str(params.get("fingerprint") or "")
        if not fingerprint:
            raise PayloadError(
                "gbdt parameters carry no fingerprint; the artifact was not produced by this model"
            )

        entry = _ROLLOUT_CACHE.get(fingerprint)
        if entry is None:
            history = np.asarray([_f(v) for v in (params.get("history") or [])], dtype=float)
            if history.size < GB_WARMUP:
                raise PayloadError(
                    f"gbdt parameters carry {history.size} day(s) of history, {GB_WARMUP} needed "
                    "to build a feature row; the artifact is truncated"
                )
            entry = {"preds": [], "history": history}
            _remember(_ROLLOUT_CACHE, fingerprint, entry, _ROLLOUT_CACHE_LIMIT)

        preds: list[float] = entry["preds"]
        if len(preds) >= horizon:
            _ROLLOUT_CACHE.move_to_end(fingerprint)
            return preds

        estimator = self._estimator(params, fingerprint)
        last_day = _parse_day(params.get("last_day"))
        history = entry["history"]
        # Same columns the fit kept, in the same order. Absent on an
        # artifact from an older build, where nothing was dropped.
        columns = params.get("columns")

        while len(preds) < horizon:
            step = len(preds) + 1
            when = (last_day + timedelta(days=step)) if last_day else None
            built = _gb_row(history, when)
            if columns is not None:
                built = [built[int(j)] for j in columns]
            row = np.asarray([built], dtype=float)
            value = _nonneg(estimator.predict(row)[0])
            preds.append(value)
            # The prediction becomes tomorrow's lag_1. This is where the
            # error compounding lives, in one line.
            history = np.append(history, value)

        entry["history"] = history
        return preds

    def _estimator(self, params: dict, fingerprint: str) -> Any:
        cached = _ESTIMATOR_CACHE.get(fingerprint)
        if cached is not None:
            _ESTIMATOR_CACHE.move_to_end(fingerprint)
            return cached

        payload = params.get("payload")
        if not payload:
            raise PayloadError("gbdt parameters carry no model payload")

        joblib, sklearn_version, _ = _sklearn()
        trained_with = params.get("sklearn_version") or "unknown"
        try:
            estimator = joblib.load(io.BytesIO(base64.b64decode(payload)))
        except Exception as exc:  # noqa: BLE001 - the cause is reported, not swallowed
            # The version mismatch is named only when there IS one. The
            # earlier wording asserted it unconditionally and so reported
            # "trained with 1.9.0, this process has 1.9.0" for what was
            # actually a corrupt payload — an error message that sends
            # the reader to check the wrong thing is worse than a terse
            # one.
            drift = (
                f"It was trained with scikit-learn {trained_with} and this process has "
                f"{sklearn_version}; a pickle does not travel between versions. "
                if trained_with != sklearn_version
                else f"scikit-learn {sklearn_version} on both sides, so the payload itself is at fault. "
            )
            raise PayloadError(
                f"gbdt payload would not load. {drift}"
                f"Retrain rather than serve it. ({type(exc).__name__}: {exc})"
            ) from exc

        return _remember(_ESTIMATOR_CACHE, fingerprint, estimator, _ESTIMATOR_CACHE_LIMIT)


# ---------------------------------------------------------------------
# Control
# ---------------------------------------------------------------------

class SeasonalNaiveWeekly(Model):
    """Same weekday last week. Deliberately stupid.

    WHY IT BELONGS HERE — two jobs, and both matter more than its
    forecasts do.

    FIRST, it is the floor. Croston, TSB and a gradient booster all sound
    impressive, and any of them will produce a confident number on any
    series you hand it. The only way to know whether the cleverness is
    doing anything is to run the dumbest defensible method beside it on
    the same holdout and the same metrics. If the booster cannot beat
    "what happened last Tuesday", then the booster has learnt nothing and
    the honest report says so. A leaderboard without a control is a
    ranking of sophisticated things against each other, which tells you
    who won but not whether winning meant anything.

    SECOND, and less obviously, it is a cross-runtime canary. It is the
    same method as `seasonal_naive` in forecast.js. Given the same SKU
    and the same holdout, the two should score IDENTICALLY — not closely,
    identically, down to the fourth decimal place of MAE. If they do not,
    then something in the Python harness disagrees with the Node one
    about the censoring, the holdout boundary, or the metric definitions,
    and every other comparison on that leaderboard is invalid. A cheap
    model that costs nothing to run is the ideal place to put that
    tripwire. It keeps its own key rather than reusing `seasonal_naive`
    precisely so the two can be seen side by side.

    No hyperparameters. Adding some would be missing the point of it.
    """

    key = "seasonal_naive_weekly"
    label = "Seasonal naive, same weekday last week (control)"
    min_days = 14
    grid = [{}]

    def fit(
        self,
        y: Sequence[Any],
        hp: dict | None = None,
        days: Sequence[Any] | None = None,
    ) -> dict:
        obs, _ = _clean_series(y)
        tail = obs[-SEASON_LENGTH:] if obs.size else np.zeros(0, dtype=float)
        return {
            "model": self.key,
            "tail": [_f(v) for v in tail.tolist()],
            "period": int(SEASON_LENGTH),
            "periods": int(obs.size),
        }

    def predict(self, params: dict, h: int) -> float:
        tail = params.get("tail") or []
        if not tail:
            return 0.0
        # Cycles over whatever is available rather than over a hard 7. On
        # a full 7-day tail this is the plain weekly lookup and it agrees
        # with forecast.js exactly — verified against the Node expression
        # for every horizon, which is the canary doing its job.
        #
        # On a tail SHORTER than 7 the two diverge: Node evaluates
        # ((h-1) % 7) % len, this evaluates (h-1) % len, and at h = 9 with
        # 3 days of tail that is index 1 there and index 2 here. Left
        # divergent rather than bug-compatible, because a tail under 7
        # cannot occur through the backtest — the 28-day floor gives a
        # holdout of 7 and so at least 21 training days — and reproducing
        # a wrap-around quirk that no path reaches would be copying an
        # accident for its own sake. If a caller ever does fit on under a
        # week, this repeats the days it actually has rather than
        # double-wrapping them.
        return _nonneg(tail[(max(1, int(h)) - 1) % len(tail)])


# ---------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------

# Insertion order is the order the console will show them in: the
# intermittent family first because that is where this catalogue lives,
# then the seasonal and learned models, then the control last so it reads
# as the line everything else has to clear.
MODELS: dict[str, Model] = {
    model.key: model
    for model in (
        CrostonModel(),
        SBAModel(),
        TSBModel(),
        HoltWintersAdditive(),
        GradientBoostModel(),
        SeasonalNaiveWeekly(),
    )
}


def list_models() -> list[dict]:
    """Every model's metadata, for the CLI and the console."""
    return [model.describe() for model in MODELS.values()]
