/**
 * Calculates the percentage delta between a forecast total and the current total.
 * Returns a signed percentage string, e.g. "+12%" or "-5%".
 */
export function calcForecastDelta(currentTotal: number, forecastTotal: number): string {
    if (currentTotal === 0) return forecastTotal > 0 ? "+100%" : "0%";
    const delta = Math.round(((forecastTotal - currentTotal) / currentTotal) * 100);
    return (delta >= 0 ? "+" : "") + delta + "%";
}
