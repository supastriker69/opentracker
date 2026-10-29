"""Rain over time for a scenario: a total amount over a number of hours, shaped like a real storm.

A symmetric triangular hyetograph peaking in the middle of the storm is used: simple, transparent, and
close to the "peak in the middle third" pattern of tropical convective storms. Values are mm per hour,
every 10 minutes, as SFINCS expects."""
from __future__ import annotations

import numpy as np
import pandas as pd


def hyetograph(total_mm: float, hours: float, start: pd.Timestamp, step_min: int = 10, after_hours: float = 12) -> pd.Series:
    """Rain intensity (mm/h) from `start` for `hours`, then dry for `after_hours` so the water can drain."""
    if total_mm <= 0 or hours <= 0:
        raise ValueError("rain total and duration must be positive")
    n = int(round(hours * 60 / step_min))
    x = (np.arange(n) + 0.5) / n                  # position in the storm, 0..1
    shape = 1 - np.abs(2 * x - 1)                 # triangle, peak at the middle
    depth = shape / shape.sum() * total_mm        # mm in each step, sums to total
    intensity = depth * 60 / step_min             # mm per hour
    dry = int(round(after_hours * 60 / step_min))
    values = np.concatenate([intensity, np.zeros(dry + 1)])
    index = pd.date_range(start, periods=len(values), freq=f"{step_min}min")
    return pd.Series(values, index=index, name="precip")
