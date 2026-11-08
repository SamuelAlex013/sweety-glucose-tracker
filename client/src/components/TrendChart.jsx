import { formatDate } from '../format.js';

export default function TrendChart({ readings, start, end }) {
  const dates = [...new Set(readings.map((reading) => reading.date))];
  const points = dates.map((date) => {
    const values = readings
      .filter((reading) => reading.date === date)
      .map((reading) => reading.value);
    return { date, value: values.reduce((sum, value) => sum + value, 0) / values.length };
  });
  const min = points.length
    ? Math.floor(Math.min(...points.map((point) => point.value)) / 20) * 20 - 20
    : 60;
  const max = points.length
    ? Math.ceil(Math.max(...points.map((point) => point.value)) / 20) * 20 + 20
    : 180;
  const width = 720,
    height = 210,
    left = 48,
    right = 24,
    top = 20,
    bottom = 40;
  const startTime = new Date(`${start}T00:00:00Z`).getTime();
  const total = Math.max(86400000, new Date(`${end}T00:00:00Z`).getTime() - startTime);
  const x = (date) =>
    left + ((new Date(`${date}T00:00:00Z`).getTime() - startTime) / total) * (width - left - right);
  const y = (value) => top + ((max - value) / (max - min)) * (height - top - bottom);
  // Do not connect across unrecorded days: gaps are missing data, not a measured trend.
  const segments = [];
  for (const point of points) {
    const segment = segments.at(-1);
    if (!segment || new Date(point.date) - new Date(segment.at(-1).date) > 86400000)
      segments.push([point]);
    else segment.push(point);
  }
  return (
    <section className="trend-section" aria-labelledby="trend-title">
      <div className="section-heading">
        <div>
          <h2 id="trend-title">The month, at a glance</h2>
          <p className="muted">
            Daily averages · {formatDate(start, { month: 'long', year: 'numeric', day: undefined })}
          </p>
        </div>
        <span className="chart-legend">
          <i />
          Glucose · mg/dl
        </span>
      </div>
      {!points.length ? (
        <p className="chart-empty">Your trend will appear here as you record readings.</p>
      ) : (
        <>
          <svg
            className="trend-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-labelledby="chart-title chart-desc"
          >
            <title id="chart-title">Daily average glucose in mg/dl</title>
            <desc id="chart-desc">
              {points
                .map((point) => `${formatDate(point.date)}: ${point.value.toFixed(1)}`)
                .join('; ')}
            </desc>
            {[min, (min + max) / 2, max].map((tick) => (
              <g key={tick}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y(tick)}
                  y2={y(tick)}
                  className="chart-grid"
                />
                <text x={left - 12} y={y(tick) + 4} textAnchor="end">
                  {tick}
                </text>
              </g>
            ))}
            {segments.map((segment) => (
              <polyline
                key={segment[0].date}
                points={segment.map((point) => `${x(point.date)},${y(point.value)}`).join(' ')}
                fill="none"
                className="chart-line"
              />
            ))}
            {points.map((point) => (
              <circle
                key={point.date}
                cx={x(point.date)}
                cy={y(point.value)}
                r="4"
                className="chart-dot"
              >
                <title>
                  {formatDate(point.date)}: {point.value.toFixed(1)} mg/dl
                </title>
              </circle>
            ))}
            {[start, end]
              .filter((date, index, all) => all.indexOf(date) === index)
              .map((date) => (
                <text
                  key={date}
                  x={x(date)}
                  y={height - 10}
                  textAnchor={date === start ? 'start' : 'end'}
                >
                  {formatDate(date)}
                </text>
              ))}
          </svg>
          <p className="chart-note">
            Each point is the average of readings recorded that day. Missing days are left open.
          </p>
        </>
      )}
    </section>
  );
}
