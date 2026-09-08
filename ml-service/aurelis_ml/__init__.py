"""Aurelis ML service — the Python side of the forecasting stack.

This package trains models, scores them against the SAME numeric contract as
the Node baselines in server/src/ml/forecast.js, and POSTs the finished
version to the Node API. It reads the SQLite database READ-ONLY through a
file: URI with mode=ro; Node stays the single writer.

Nothing heavy is imported here on purpose. `aurelis_ml.models` pulls in
scikit-learn, which costs the best part of a second, and a caller that only
wants to list the model keys or print help should not pay for it.
"""

__version__ = "0.1.0"

# The registry stores this against ml_models.runtime so a version trained
# here is distinguishable from a Node-trained one on the same leaderboard.
RUNTIME = "python"
