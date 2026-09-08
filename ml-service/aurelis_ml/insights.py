"""
=============================================================
INTELLIGENCE LAYER — PYTHON
Two models the Node side only approximates:

  * detect_anomalies()   Isolation Forest per SKU, reported
                         side by side with the z-score Node uses
  * segment_customers()  k-means on log-scaled RFM, k chosen by
                         silhouette

Everything here is decision support for a human. Nothing in this
file writes to the database, raises an order or changes a price;
the connection is opened read-only and Node remains the single
writer.

The honesty rules the brief was written around apply in full:
below the data threshold the answer is INSUFFICIENT rather than a
number, a zero-sales day while the piece was out of stock is
censored rather than counted as zero demand, and every output
carries the reasoning that produced it so a human can disagree
with it.
=============================================================
"""

from __future__ import annotations

from contextlib import contextmanager
from datetime import date

import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from . import RUNTIME
from .data import active_products, connect, demand_series, rfm_rows

__all__ = ["detect_anomalies", "segment_customers"]


# ---------------------------------------------------------------
# Constants
# ---------------------------------------------------------------

# Fixed so the same history gives the same answer twice. An anomaly
# report that reshuffles itself between two runs over identical data
# is not a finding, it is noise with a seed.
RANDOM_SEED = 20260824

# The rolling context each day is judged against. Twenty-eight
# observations is a trading month, the shortest window in which
# "normal" has any shape at all. The shared MIN_DAYS_FOR_TRAINING of
# 28 is the floor for stating a daily *rate*; describing what normal
# looks like needs a good deal more, hence MIN_FOREST_ROWS below.
ANOMALY_FEATURE_WINDOW = 28

# Same-weekday history a day is compared against. Nine weeks gives
# roughly nine observations of that weekday — enough for a mean, not
# so long that last spring is still voting on this Tuesday.
DOW_LOOKBACK = 63

# A day flagged eight months ago is history, not an alert.
ANOMALY_RECENT_DAYS = 30

# Rows the forest needs before its notion of normal means anything.
# Below this it will still fit happily and still return exactly
# `contamination` of the rows as outliers — that is the trap. An
# isolation forest never says "not enough data", so the refusal has
# to be ours.
MIN_FOREST_ROWS = 60

# A stated prior on how often we expect an odd day, not a discovered
# fact. contamination="auto" would bury the same choice in a fixed
# offset; naming it lets a reader argue with it.
ANOMALY_CONTAMINATION = 0.03

# Mirror of the Node z-score defaults (server/src/ml/insights.js):
# same windows, same threshold, same sample standard deviation. The
# comparison below is then between two methods rather than between
# two sets of settings.
Z_WINDOW = 7
Z_BASELINE = 56
Z_THRESHOLD = 2.5

# Below this many customers with real orders, clustering is refused
# outright. See segment_customers() for why.
MIN_CUSTOMERS_FOR_CLUSTERING = 20

FEATURE_NAMES = (
    "units",
    "deviation_from_rolling_mean",
    "rolling_std",
    "deviation_from_same_weekday",
    "standardised_deviation",
)


# ---------------------------------------------------------------
# Connections
#
# The censoring rule is subtle enough that there must be exactly ONE
# definition of a censored day in this service, so nothing here
# rebuilds a series or re-queries the catalogue: data.py owns the
# read-only connection, demand_series() and rfm_rows(), and this file
# consumes them. A second copy of the censoring walk would drift from
# the first the day either was touched, and the drift would not look
# like a bug — it would look like Python winning.
# ---------------------------------------------------------------

@contextmanager
def _using(conn):
    """Reuse a caller's connection, or open one for the duration.

    Both reports walk every SKU or every customer in turn, so the
    connection is opened once and passed down rather than reopened
    per row.
    """
    if conn is not None:
        yield conn
        return
    with connect() as fresh:
        yield fresh


# ---------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------

def _rupees(value) -> str:
    """INR with Indian digit grouping: 23,67,490 rather than 2,367,490."""
    n = int(round(value or 0))
    sign = "-" if n < 0 else ""
    digits = str(abs(n))
    if len(digits) > 3:
        head, tail = digits[:-3], digits[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        digits = ",".join(groups + [tail])
    return f"{sign}₹{digits}"


def _sample_std(values) -> float:
    """ddof=1, matching the Node stdev() so the two z-scores agree."""
    values = np.asarray(values, dtype=float)
    if values.size < 2:
        return 0.0
    return float(values.std(ddof=1))


def _round(value, places=2):
    if value is None:
        return None
    value = float(value)
    if not np.isfinite(value):
        return None
    return round(value, places)


def _plural(count, word, suffix="s"):
    return f"{count} {word}{'' if count == 1 else suffix}"


# ---------------------------------------------------------------
# 1. ANOMALIES — Isolation Forest, scored against the z-score
# ---------------------------------------------------------------

def _feature_matrix(points, window, dow_lookback=DOW_LOOKBACK):
    """Build the per-day feature rows the forest is fitted on.

    Three ideas, one per feature family: where today sits against its
    own recent level (rolling mean), how noisy that level has been
    (rolling std), and whether today is odd *for a Tuesday* rather
    than odd in general (same-weekday deviation). A piece that only
    ever sells at weekends would otherwise have every weekday read as
    a collapse.

    Two traps avoided here:

      * the rolling statistics look at the days BEFORE today, never
        including today. A day included in its own baseline drags
        that baseline towards itself, which is precisely how a real
        spike hides from a detector built to find it.

      * `points` has already had censored days removed, so the window
        counts OBSERVED days, not calendar days. On a SKU that spent a
        fortnight out of stock the 28-day window reaches further back
        in the calendar than its name suggests. That is deliberate:
        the alternative is to pad the window with days when the shelf
        was empty and call them quiet trading.
    """
    units = np.asarray([p.units for p in points], dtype=float)
    days = [p.day for p in points]
    n = units.size
    if n <= window:
        return [], np.empty((0, len(FEATURE_NAMES)), dtype=float)

    weekdays = np.asarray([date.fromisoformat(d).weekday() for d in days])

    meta = []
    rows = []
    for i in range(window, n):
        prior = units[i - window:i]
        rolling_mean = float(prior.mean())
        rolling_std = _sample_std(prior)

        start = max(0, i - dow_lookback)
        same_weekday = units[start:i][weekdays[start:i] == weekdays[i]]
        # Fall back to the rolling mean rather than to zero: a SKU with
        # no history for this weekday yet should read as "nothing odd",
        # not as "sold nothing on every previous Tuesday".
        dow_mean = float(same_weekday.mean()) if same_weekday.size else rolling_mean

        deviation = float(units[i]) - rolling_mean
        # A constant stretch has zero spread; dividing by it would
        # produce an infinity that the forest would treat as the most
        # interesting day in the catalogue.
        standardised = deviation / rolling_std if rolling_std > 0 else 0.0

        rows.append(
            [
                float(units[i]),
                deviation,
                rolling_std,
                float(units[i]) - dow_mean,
                standardised,
            ]
        )
        meta.append(
            {
                "day": days[i],
                "units": int(round(units[i])),
                "rollingMean": _round(rolling_mean),
                "rollingStd": _round(rolling_std),
                "deviation": _round(deviation),
                "dowMean": _round(dow_mean),
                "dowDeviation": _round(float(units[i]) - dow_mean),
                "standardised": _round(standardised),
            }
        )

    return meta, np.asarray(rows, dtype=float)


def _z_signal(clean_units, window, baseline, threshold):
    """The Node z-score, reproduced exactly so it can be argued with.

    This is the incumbent: the mean of the last `window` days against
    a `baseline`-day mean, in units of the standard error of that
    mean. It says nothing about individual days — it is a statement
    about the last week taken as a block.
    """
    units = np.asarray(clean_units, dtype=float)
    need = baseline + window
    if units.size < need:
        return {
            "available": False,
            "reason": f"needs {need} clean days for a {baseline}-day baseline, has {units.size}",
        }

    recent = units[-window:]
    base = units[-(baseline + window):-window]
    recent_mean = float(recent.mean())
    base_mean = float(base.mean())
    base_sd = _sample_std(base)

    if base_sd == 0:
        # Node skips this SKU silently. Saying so is more use than a
        # gap in the table: a baseline with no variation at all is
        # usually a piece that sold nothing for two months.
        return {
            "available": False,
            "reason": "baseline has no variation, so a z-score would divide by zero",
            "recentMean": _round(recent_mean),
            "baselineMean": _round(base_mean),
        }

    z = (recent_mean - base_mean) / (base_sd / np.sqrt(window))
    return {
        "available": True,
        "z": _round(z),
        "recentMean": _round(recent_mean),
        "baselineMean": _round(base_mean),
        "baselineStd": _round(base_sd),
        "threshold": threshold,
        "flagged": bool(abs(z) >= threshold),
        "direction": "spike" if z > 0 else "drop",
        "changePct": round(((recent_mean - base_mean) / base_mean) * 100) if base_mean > 0 else None,
        "window": window,
        "baseline": baseline,
    }


def _forest_signal(points, window, contamination, recent_days):
    """Fit an Isolation Forest on one SKU and report the days it isolates."""
    meta, features = _feature_matrix(points, window)

    if len(meta) < MIN_FOREST_ROWS:
        return {
            "available": False,
            "reason": (
                f"needs {window + MIN_FOREST_ROWS} clean days "
                f"({window} for the rolling window plus {MIN_FOREST_ROWS} to fit on), "
                f"has {len(points)}"
            ),
        }

    # Every row identical means there is nothing to isolate, but the
    # forest would still hand back its contamination quota of
    # "anomalies" picked essentially at random.
    if float(features[:, 0].std()) == 0:
        return {
            "available": False,
            "reason": "no variation in daily units, so there is nothing for a forest to isolate",
        }

    # No scaler. The trees split on raw values, so standardising would
    # buy nothing and would cost the reader the ability to read a
    # feature back in units.
    forest = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_samples="auto",
        random_state=RANDOM_SEED,
    ).fit(features)

    scores = forest.decision_function(features)   # negative = isolated
    verdicts = forest.predict(features)           # -1 = outlier

    last_day = date.fromisoformat(meta[-1]["day"])
    flagged = []
    for row, score, verdict in zip(meta, scores, verdicts):
        if verdict != -1:
            continue
        row = dict(row)
        row["score"] = _round(float(score), 4)
        row["direction"] = "spike" if row["deviation"] >= 0 else "drop"
        row["ageDays"] = (last_day - date.fromisoformat(row["day"])).days
        row["reasoning"] = _day_reasoning(row)
        flagged.append(row)

    recent = [row for row in flagged if row["ageDays"] < recent_days]
    recent.sort(key=lambda r: r["day"], reverse=True)

    return {
        "available": True,
        "rows": len(meta),
        "features": list(FEATURE_NAMES),
        "contamination": contamination,
        "featureWindow": window,
        "flaggedCount": len(flagged),
        "recentCount": len(recent),
        "recentDays": recent_days,
        "recent": recent,
        "firstDay": meta[0]["day"],
        "lastDay": meta[-1]["day"],
    }


def _day_reasoning(row):
    direction = "above" if row["deviation"] >= 0 else "below"
    parts = [
        f"{row['day']}: {row['units']} unit(s) against a rolling mean of "
        f"{row['rollingMean']} over the previous days — {abs(row['deviation'])} {direction}."
    ]
    if row["rollingStd"]:
        parts.append(
            f"That is {abs(row['standardised']):.1f} rolling standard deviations "
            f"({row['rollingStd']}) from the recent level."
        )
    parts.append(
        f"Same weekday usually runs at {row['dowMean']}, so the weekday pattern does not explain it."
        if abs(row["dowDeviation"] or 0) >= abs(row["deviation"] or 0) * 0.5
        else f"Same weekday usually runs at {row['dowMean']}, which accounts for part of the gap."
    )
    return parts


def _agreement(forest, z_score, window):
    """Where the two methods agree, and where they do not.

    They are not asking the same question. The z-score judges the last
    week as a block; the forest judges individual days. To compare
    them at all, the forest is asked whether it flagged anything
    inside that same week — anything else would be a rigged contest.
    """
    if not forest.get("available") or not z_score.get("available"):
        return {
            "comparable": False,
            "verdict": "NOT_COMPARABLE",
            "note": "One of the two methods could not be computed for this SKU, so there is nothing to compare.",
        }

    forest_week = [row for row in forest["recent"] if row["ageDays"] < window]
    forest_flag = bool(forest_week)
    z_flag = bool(z_score["flagged"])

    if forest_flag and z_flag:
        verdict = "BOTH"
        note = (
            f"Both methods point at the last {window} days. The z-score sees the week as a block; "
            f"the forest names {_plural(len(forest_week), 'day')} inside it."
        )
    elif forest_flag:
        verdict = "FOREST_ONLY"
        note = (
            f"Only the forest flags anything: {_plural(len(forest_week), 'individual day')} "
            f"{'stands' if len(forest_week) == 1 else 'stand'} out, but the week as a whole is "
            "still within its baseline. This is the case the z-score cannot see — one "
            "extraordinary day inside an ordinary week."
        )
    elif z_flag:
        verdict = "Z_ONLY"
        note = (
            "Only the z-score flags: the week sits well off its baseline as a block, without any "
            "single day being unusual on its own. A sustained shift, which is the case the forest "
            "is weakest at — it has been taught that steady is normal."
        )
    else:
        verdict = "NEITHER"
        note = "Neither method flags this SKU."

    return {
        "comparable": True,
        "verdict": verdict,
        "forestFlaggedWeek": forest_flag,
        "zFlagged": z_flag,
        "note": note,
    }


def detect_anomalies(
    skus=None,
    *,
    conn=None,
    window=Z_WINDOW,
    baseline=Z_BASELINE,
    threshold=Z_THRESHOLD,
    feature_window=ANOMALY_FEATURE_WINDOW,
    recent_days=ANOMALY_RECENT_DAYS,
    contamination=ANOMALY_CONTAMINATION,
):
    """Unusual trading days per SKU, by Isolation Forest and by z-score.

    Both are reported for every SKU, side by side, because the honest
    question is not "what did the forest find" but "did the forest
    earn its place next to twenty lines of arithmetic". That question
    cannot be settled from these numbers alone — see `caveats` — but
    it can be put in front of a human properly.

    `window`, `baseline` and `threshold` are the z-score's, named as
    Node names them in server/src/ml/insights.js so the same flag on
    the CLI means the same thing on both sides. `feature_window` is
    the forest's rolling context and is a different quantity: the
    z-score's window is the stretch being judged, the forest's is the
    stretch it is judged against.

    A SKU with too little clean history is returned with status
    INSUFFICIENT and the shortfall stated. It is not silently dropped:
    a gap in a table reads as "nothing wrong here", which is the one
    thing it does not mean.
    """
    if not 0 < contamination <= 0.5:
        raise ValueError(
            f"contamination must be in (0, 0.5], got {contamination}. It is the share of days "
            "expected to be odd, not a sensitivity dial."
        )

    with _using(conn) as db:
        products = active_products(db)
        if skus:
            wanted = set(skus)
            products = [p for p in products if p["id"] in wanted]

        rows = []
        for product in products:
            sku = product["id"]
            series = demand_series(sku, conn=db)
            # `usable` is data.py's word for the days a model is allowed
            # to learn from: the censored ones are already gone.
            clean = series.usable
            censored = series.censored
            clean_units = [p.units for p in clean]

            z_score = _z_signal(clean_units, window, baseline, threshold)
            forest = _forest_signal(clean, feature_window, contamination, recent_days)

            scorable = forest.get("available") or z_score.get("available")
            reasoning = [
                f"{_plural(len(clean), 'clean day')} of history"
                + (
                    f"; {_plural(censored, 'out-of-stock day')} excluded so an empty shelf "
                    "is not read as a collapse in demand."
                    if censored
                    else "; no out-of-stock days to exclude."
                )
            ]

            if forest.get("available"):
                reasoning.append(
                    f"Isolation Forest fitted on {_plural(forest['rows'], 'day')} at a stated "
                    f"contamination of {contamination:.0%} flagged "
                    f"{_plural(forest['flaggedCount'], 'day')}, {forest['recentCount']} of them "
                    f"in the last {recent_days} days."
                )
            else:
                reasoning.append(f"Isolation Forest not run — {forest['reason']}.")

            if z_score.get("available"):
                reasoning.append(
                    f"Z-score: the last {window} days averaged {z_score['recentMean']} units a day "
                    f"against a {baseline}-day baseline of {z_score['baselineMean']}, "
                    f"{abs(z_score['z']):.1f} standard errors "
                    f"{'above' if z_score['z'] > 0 else 'below'} it "
                    f"({'flagged' if z_score['flagged'] else 'within'} the {threshold} threshold)."
                )
            else:
                reasoning.append(f"Z-score not computed — {z_score['reason']}.")

            agreement = _agreement(forest, z_score, window)
            reasoning.append(agreement["note"])

            if not scorable:
                reasoning.append(
                    "Neither method could be computed, so this SKU is unscored. That is not the "
                    "same as nothing being wrong with it."
                )

            rows.append(
                {
                    "sku": sku,
                    "name": product["name"],
                    "status": "SCORED" if scorable else "INSUFFICIENT",
                    "days": len(clean),
                    "censoredDays": censored,
                    "forest": forest,
                    "zScore": z_score,
                    "agreement": agreement,
                    "reasoning": reasoning,
                }
            )

    # Anything either method flagged, most recent evidence first, then
    # the quiet SKUs, then the ones we could not score at all.
    def sort_key(row):
        flagged = row["agreement"].get("verdict") in ("BOTH", "FOREST_ONLY", "Z_ONLY")
        recent = row["forest"].get("recentCount", 0) if row["forest"].get("available") else 0
        z = abs(row["zScore"].get("z") or 0) if row["zScore"].get("available") else 0
        return (0 if row["status"] == "SCORED" else 1, 0 if flagged else 1, -recent, -z)

    rows.sort(key=sort_key)

    verdicts = [r["agreement"]["verdict"] for r in rows]
    summary = {
        "skus": len(rows),
        "scored": sum(1 for r in rows if r["status"] == "SCORED"),
        "insufficient": sum(1 for r in rows if r["status"] == "INSUFFICIENT"),
        "both": verdicts.count("BOTH"),
        "forestOnly": verdicts.count("FOREST_ONLY"),
        "zOnly": verdicts.count("Z_ONLY"),
        "neither": verdicts.count("NEITHER"),
        "notComparable": verdicts.count("NOT_COMPARABLE"),
    }

    comparable = summary["both"] + summary["forestOnly"] + summary["zOnly"] + summary["neither"]
    agreed = summary["both"] + summary["neither"]
    summary["comparable"] = comparable
    summary["agreementPct"] = round(agreed / comparable * 100, 1) if comparable else None

    return {
        "model": "anomaly_detection",
        "runtime": RUNTIME,
        "algorithm": "isolation_forest",
        "baseline": "z_score (Node)",
        "params": {
            "featureWindow": feature_window,
            "contamination": contamination,
            "recentDays": recent_days,
            "dowLookback": DOW_LOOKBACK,
            "minForestRows": MIN_FOREST_ROWS,
            "zWindow": window,
            "zBaseline": baseline,
            "zThreshold": threshold,
            "randomState": RANDOM_SEED,
        },
        "summary": summary,
        "rows": rows,
        "caveats": [
            "There are no labelled incidents in this database. What is reported here is agreement "
            "and disagreement between two methods, NOT accuracy against a truth — neither can be "
            "called the winner from these numbers. Whether the forest earned its place is settled "
            "by a buyer checking the days it named and saying whether they were worth a look.",
            "The two methods answer different questions. The z-score asks whether the last week as "
            "a block sits off its baseline; the forest asks whether any single day is hard to "
            "explain. They are compared over the same week so the contest is fair, and they will "
            "properly disagree.",
            "Each forest is fitted on one SKU's own history, so a flagged day is unusual for that "
            "piece, not unusual for the shop. Contamination is a stated prior of "
            f"{contamination:.0%}, which means a long quiet history will still yield some flags: "
            "read the reasoning before acting on the count.",
            "Out-of-stock days are excluded from both methods. Windows are therefore counted in "
            "observed days and can reach further back in the calendar than their length suggests.",
            "Nothing here reorders, reprices or pauses a listing. It marks days worth a human "
            "looking at, and the most common innocent explanation for a drop is still a stock-out "
            "the ledger has not recorded.",
        ],
    }


# ---------------------------------------------------------------
# 2. CUSTOMER SEGMENTS — k-means on log-scaled RFM
# ---------------------------------------------------------------

def _tiers(conn):
    """Membership tier per customer, for display only.

    data.py owns the RFM query, and the definition of a real order
    belongs there rather than in two places. Tier is not a modelling
    input — clustering on a label the shop assigns would find the
    shop's own rules and report them back as a discovery — so it is
    fetched separately and carried through to the table.
    """
    return {row["id"]: row["tier"] for row in conn.execute("SELECT id, tier FROM customers")}


# How far a segment must sit from the catalogue median before the
# label says anything about it. Without a band, a segment averaging
# 1.06 orders against a median of 1.0 gets called "buys often" — true
# to three decimal places and misleading to a human.
SEGMENT_BAND = 0.25


def _band(value, median, high, mid, low, invert=False):
    if not median:
        return mid
    ratio = value / median
    if invert:
        # A recency of zero days is the most recent there is, not the
        # least. Inverting it naively divides by zero and then reports
        # a customer who ordered this morning as gone quiet.
        ratio = (1 / ratio) if ratio else float("inf")
    if ratio >= 1 + SEGMENT_BAND:
        return high
    if ratio <= 1 - SEGMENT_BAND:
        return low
    return mid


def _segment_label(recency, frequency, monetary, medians):
    """A description read off the centroid, not a name invented for it.

    "Champion" and "At risk" are the industry's words and they carry
    promises about future behaviour that this data cannot support.
    Every clause here is a comparison against the catalogue median,
    outside a stated band, that a reader can check against the table
    printed underneath it.
    """
    value = _band(monetary, medians["monetary"], "high value", "mid value", "lower value")
    often = _band(
        frequency, medians["frequency"], "buys often", "buys at the usual rate", "buys rarely"
    )
    # Recency is the one where smaller is better, so the comparison is
    # inverted rather than the labels swapped — swapping the labels is
    # how this reads backwards six months from now.
    recent = _band(
        recency,
        medians["recency"],
        "ordered recently",
        "recency in line with the rest",
        "gone quiet",
        invert=True,
    )
    label = f"{value}, {often}, {recent}"
    return label[0].upper() + label[1:]


def segment_customers(
    *,
    conn=None,
    k_min=2,
    k_max=6,
    min_customers=MIN_CUSTOMERS_FOR_CLUSTERING,
):
    """k-means segments over log-scaled RFM, k chosen by silhouette.

    THE REFUSAL IS THE POINT. This database holds a handful of real
    customers. k-means will cheerfully return five tidy segments from
    four people, each with a centroid, a size and a confident-looking
    name, and every one of them would be an artefact of the algorithm
    rather than a fact about the shop. Below `min_customers` this
    function returns the measured R, F and M — which are facts — and
    refuses to label them.
    """
    with _using(conn) as db:
        records = rfm_rows(db)
        tiers = _tiers(db)

    rows = [
        {
            "id": r["id"],
            # first_name || ' ' || last_name is NULL if either half is,
            # and a blank cell in a four-row table is not a name.
            "name": r["name"] or r["email"],
            "email": r["email"],
            "tier": tiers.get(r["id"]),
            "frequency": int(r["frequency"] or 0),
            "monetary": int(r["monetary"] or 0),
            "lastOrder": r["last_order"],
            "recencyDays": int(r["recency_days"] or 0),
        }
        for r in records
    ]

    base = {
        "model": "customer_segments",
        "runtime": RUNTIME,
        "algorithm": "kmeans_rfm",
        "customers": len(rows),
        "minCustomers": min_customers,
        "rows": rows,
    }

    if not rows:
        return {
            **base,
            "clustered": False,
            "k": None,
            "note": (
                "No customer has placed a real order yet. Segmentation needs real purchase "
                "history — synthetic orders carry no customer, deliberately, so there is nothing "
                "here to cluster."
            ),
            "reasoning": [
                "The RFM query found no customer with a non-synthetic, non-cancelled order.",
                "Returning empty is the finding. Fitting k-means on synthetic orders would "
                "produce segments of invented people.",
            ],
        }

    if len(rows) < min_customers:
        return {
            **base,
            "clustered": False,
            "k": None,
            "note": (
                f"Only {_plural(len(rows), 'customer')} with real purchase history. Segmentation is "
                f"refused below {min_customers}. Segmentation needs real purchase history: k-means "
                f"would return tidy segments from {len(rows)} people and every one of them would be "
                "an artefact of the algorithm rather than a fact about the shop."
            ),
            "reasoning": [
                f"{len(rows)} customer(s) found, {min_customers} needed before a fitted model says "
                "anything a human could not read straight off the table.",
                "Synthetic orders carry no customer by design, so they cannot make up the shortfall "
                "and were not counted.",
                "The recency, frequency and monetary figures in the table are measured facts and "
                "are reported as they stand. What is withheld is the segment label, not the data.",
                "The shortest route to real segments is real orders, not a smaller k.",
            ],
        }

    # ---- enough people to fit on ----
    recency = np.asarray([r["recencyDays"] for r in rows], dtype=float)
    frequency = np.asarray([r["frequency"] for r in rows], dtype=float)
    monetary = np.asarray([r["monetary"] for r in rows], dtype=float)

    # log1p first: spend on luxury pieces is heavily skewed, and one
    # customer buying a necklace would otherwise define an axis by
    # herself and hand back a cluster of one. Scaling afterwards stops
    # rupees (six figures) from drowning frequency (single digits) in
    # a distance measure that treats every axis alike.
    features = np.column_stack(
        [np.log1p(recency), np.log1p(frequency), np.log1p(monetary)]
    )
    features = StandardScaler().fit_transform(features)

    candidates = []
    best = None
    # Silhouette needs at least two clusters and at most n-1 of them.
    upper = min(k_max, len(rows) - 1)
    for k in range(max(2, k_min), max(2, upper) + 1):
        model = KMeans(n_clusters=k, n_init=10, random_state=RANDOM_SEED).fit(features)
        labels = model.labels_
        if len(set(labels)) < 2:
            candidates.append({"k": k, "silhouette": None, "note": "collapsed to one cluster"})
            continue
        sil = float(silhouette_score(features, labels))
        candidates.append(
            {"k": k, "silhouette": _round(sil, 3), "inertia": _round(float(model.inertia_), 3)}
        )
        if best is None or sil > best["silhouette"]:
            best = {"k": k, "silhouette": sil, "labels": labels}

    if best is None and not candidates:
        # k_min above what this many customers can support. Saying so
        # beats the collapse message below, which would blame the data
        # for a range that was never tried.
        return {
            **base,
            "clustered": False,
            "k": None,
            "candidates": candidates,
            "note": (
                f"No usable k between {k_min} and {k_max} for {_plural(len(rows), 'customer')}: "
                "a silhouette needs at least two clusters and at most one fewer than there are "
                "people to put in them."
            ),
            "reasoning": [
                f"The requested k range was {k_min}–{k_max}, which leaves nothing to try at this "
                "size. Widen the range downwards or wait for more customers.",
            ],
        }

    if best is None:
        return {
            **base,
            "clustered": False,
            "k": None,
            "candidates": candidates,
            "note": (
                "Every k collapsed to a single cluster: these customers are indistinguishable on "
                "recency, frequency and value. That is a finding about the data, not a model to run."
            ),
            "reasoning": [
                "k-means returned one populated cluster at every k tried, so no silhouette could "
                "be computed.",
            ],
        }

    labels = best["labels"]
    medians = {
        "recency": float(np.median(recency)),
        "frequency": float(np.median(frequency)),
        "monetary": float(np.median(monetary)),
    }

    segments = []
    for cluster in range(best["k"]):
        members = labels == cluster
        size = int(members.sum())
        if not size:
            continue
        seg_recency = float(np.median(recency[members]))
        seg_frequency = float(frequency[members].mean())
        seg_monetary = float(monetary[members].mean())
        # Labels compare medians with medians. Judging a segment's MEAN
        # spend against the catalogue MEDIAN is the comparison that
        # turns one large order into a whole segment of big spenders.
        seg_frequency_median = float(np.median(frequency[members]))
        seg_monetary_median = float(np.median(monetary[members]))
        label = _segment_label(
            seg_recency, seg_frequency_median, seg_monetary_median, medians
        )
        segments.append(
            {
                "cluster": cluster,
                "label": label,
                "size": size,
                "share": round(size / len(rows) * 100, 1),
                "recencyDays": _round(seg_recency, 1),
                "frequency": _round(seg_frequency),
                "frequencyMedian": _round(seg_frequency_median),
                "monetary": int(round(seg_monetary)),
                "monetaryMedian": int(round(seg_monetary_median)),
                "totalValue": int(round(monetary[members].sum())),
                "reasoning": [
                    f"{_plural(size, 'customer')} ({size / len(rows) * 100:.0f}% of those with real "
                    "purchase history).",
                    f"Median {seg_recency:.0f} days since the last order against a catalogue median "
                    f"of {medians['recency']:.0f}.",
                    f"Median {seg_frequency_median:.1f} orders and {_rupees(seg_monetary_median)} of "
                    f"lifetime spend, against {medians['frequency']:.1f} orders and "
                    f"{_rupees(medians['monetary'])} for the median customer.",
                    f"Mean spend in this segment is {_rupees(seg_monetary)} — well above the median "
                    "if one order is carrying it."
                    if seg_monetary > seg_monetary_median * 1.25
                    else f"Mean spend in this segment is {_rupees(seg_monetary)}, close to its "
                    "median, so no single order is carrying it.",
                    f"The label describes this centroid against the catalogue medians, outside a "
                    f"{SEGMENT_BAND:.0%} band. It is not a promise about how these customers will "
                    "behave next.",
                ],
            }
        )

    segments.sort(key=lambda s: s["monetary"], reverse=True)
    by_cluster = {s["cluster"]: s["label"] for s in segments}
    for row, cluster in zip(rows, labels):
        row["cluster"] = int(cluster)
        row["segment"] = by_cluster.get(int(cluster))

    silhouette = best["silhouette"]
    # Below roughly 0.25 the clusters overlap so heavily that the
    # partition is the algorithm's preference rather than a boundary
    # in the data. k-means always returns k clusters; it never returns
    # "there is only one kind of customer here".
    weak = silhouette < 0.25

    reasoning = [
        f"{_plural(len(rows), 'customer')} with real purchase history, above the {min_customers} "
        "needed before a fitted model is worth more than reading the table.",
        "Recency, frequency and value were log-scaled before standardising, so one large order "
        "cannot define an axis on its own.",
        "k chosen by silhouette over "
        + ", ".join(
            f"k={c['k']}: {c['silhouette'] if c['silhouette'] is not None else 'n/a'}"
            for c in candidates
        )
        + f" — k={best['k']} won at {silhouette:.3f}.",
        (
            f"A silhouette of {silhouette:.3f} is weak: the segments overlap enough that the "
            "boundary is the algorithm's preference more than the data's. Treat them as a "
            "conversation starter, not a mailing list."
            if weak
            else f"A silhouette of {silhouette:.3f} indicates the segments are reasonably separated."
        ),
        "Synthetic orders were excluded throughout — they carry no customer by design.",
    ]

    return {
        **base,
        "clustered": True,
        "k": best["k"],
        "silhouette": _round(silhouette, 3),
        "weakStructure": weak,
        "candidates": candidates,
        "medians": {
            "recencyDays": _round(medians["recency"], 1),
            "frequency": _round(medians["frequency"]),
            "monetary": int(round(medians["monetary"])),
        },
        "segments": segments,
        "note": None,
        "reasoning": reasoning,
    }
