import { Activity } from 'lucide-react';
import { formatDate } from '../format.js';

export default function Report({ report, type, readOnly = false }) {
  const title = { daily: 'Daily overview', mtd: 'Month to date', monthly: 'Previous month' }[type];
  return (
    <section className="report-summary" aria-labelledby="report-title">
      <div className="section-heading">
        <div>
          <h2 id="report-title">{title}</h2>
          <p className="muted">
            {formatDate(report.start, { year: 'numeric' })}
            {report.start !== report.end && ` – ${formatDate(report.end, { year: 'numeric' })}`}
          </p>
        </div>
      </div>
      {report.count ? (
        <dl className="stats">
          <div className="average-stat">
            <dt>Average glucose</dt>
            <dd>
              {report.average.toFixed(1)}
              <span>mg/dl</span>
            </dd>
          </div>
          <div>
            <dt>Highest</dt>
            <dd>
              {report.highest}
              <span>mg/dl</span>
            </dd>
          </div>
          <div>
            <dt>Lowest</dt>
            <dd>
              {report.lowest}
              <span>mg/dl</span>
            </dd>
          </div>
          <div>
            <dt>Readings</dt>
            <dd>
              {report.count}
              <span>recorded</span>
            </dd>
          </div>
        </dl>
      ) : (
        <div className="empty-report">
          <Activity size={26} />
          <h3>{readOnly ? 'Patient readings will appear here' : 'Add readings for this period'}</h3>
          <p>
            {readOnly
              ? "Choose another date to review this patient's recordings."
              : 'Choose another date or add a reading for the selected period.'}
          </p>
        </div>
      )}
    </section>
  );
}
