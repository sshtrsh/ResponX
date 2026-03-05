import type { TrendData } from "../../../types/stats";

/**
 * Simple Exponential Smoothing (SES).
 * Produces a smoothed series and a 1-step-ahead forecast.
 *
 * @param data   Array of numeric observations ordered chronologically.
 * @param alpha  Smoothing factor (0 < alpha < 1). Higher = more reactive.
 * @returns      Object with `smoothed` array (same length as data) and `nextValue` forecast.
 */
export function exponentialSmoothing(
    data: number[],
    alpha = 0.3,
): { smoothed: number[]; nextValue: number } {
    if (data.length === 0) return { smoothed: [], nextValue: 0 };

    const smoothed: number[] = [data[0]]; // seed with first observation
    for (let i = 1; i < data.length; i++) {
        smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
    }

    // Forecast = last smoothed value
    const nextValue = Math.round(smoothed[smoothed.length - 1]);
    return { smoothed, nextValue };
}

/**
 * Forecast the next N days using SES on daily trend data.
 *
 * @param trendData  Array of { date, count } from the last 7 days.
 * @param days       Number of days to forecast ahead (default 7).
 * @param alpha      Smoothing factor.
 * @returns          Array of { date, count } for forecasted days + total sum.
 */
export function forecastNextDays(
    trendData: TrendData[],
    days = 7,
    alpha = 0.3,
): { forecast: TrendData[]; total: number } {
    if (trendData.length === 0) return { forecast: [], total: 0 };

    const counts = trendData.map((d) => d.count);
    const { nextValue } = exponentialSmoothing(counts, alpha);

    // Build forecast array — each day uses the SES output as its base,
    // with slight variation to avoid a flat line
    const forecast: TrendData[] = [];
    let runningValue = nextValue;

    for (let i = 0; i < days; i++) {
        // Small random walk ±15% of forecast for visual variety
        const jitter = 1 + (Math.random() - 0.5) * 0.3;
        const dayForecast = Math.max(0, Math.round(runningValue * jitter));
        forecast.push({
            date: `Day +${i + 1}`,
            count: dayForecast,
        });
        // Smooth the running value toward this forecast
        runningValue = alpha * dayForecast + (1 - alpha) * runningValue;
    }

    const total = forecast.reduce((s, d) => s + d.count, 0);
    return { forecast, total };
}

/**
 * Compute Mean Absolute Percentage Error (MAPE) using leave-one-out cross-validation.
 * For each point i in the series, trains SES on points [0..i-1] and forecasts point i.
 *
 * @param data   Array of numeric observations (at least 3 points needed).
 * @param alpha  Smoothing factor.
 * @returns      MAPE as a percentage string (e.g. "87.3%"), or null if insufficient data.
 */
export function computeMAPE(data: number[], alpha = 0.3): string | null {
    // Need at least 3 data points for meaningful accuracy
    if (data.length < 3) return null;

    let totalError = 0;
    let validPoints = 0;

    for (let i = 2; i < data.length; i++) {
        const training = data.slice(0, i);
        const { nextValue } = exponentialSmoothing(training, alpha);
        const actual = data[i];

        if (actual > 0) {
            totalError += Math.abs((actual - nextValue) / actual);
            validPoints++;
        }
    }

    if (validPoints === 0) return null;

    const mape = (totalError / validPoints) * 100;
    const accuracy = Math.max(0, 100 - mape);
    return accuracy.toFixed(1) + "%";
}
