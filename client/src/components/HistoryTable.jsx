import { SLOTS } from '../../../shared/domain.js';
import { formatDate } from '../format.js';
import { Pencil } from 'lucide-react';

export default function HistoryTable({
  readings,
  onEdit,
  title = 'Readings in this report',
  total = readings.length,
}) {
  return (
    <section className="history-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="count-label">{total} readings</span>
      </div>
      {!readings.length ? (
        <p className="muted">
          {onEdit
            ? 'Add a reading or choose another date to start this list.'
            : "Choose another date to review this patient's readings."}
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Time slot</th>
                <th scope="col">Glucose (mg/dl)</th>
                {onEdit && (
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {readings
                .slice()
                .sort(
                  (a, b) =>
                    b.date.localeCompare(a.date) ||
                    SLOTS.findIndex((slot) => slot.id === a.slot) -
                      SLOTS.findIndex((slot) => slot.id === b.slot),
                )
                .map((reading) => (
                  <tr key={reading.id}>
                    <td>{formatDate(reading.date, { year: 'numeric' })}</td>
                    <td>{SLOTS.find((slot) => slot.id === reading.slot)?.label}</td>
                    <td className="table-value">{reading.value}</td>
                    {onEdit && (
                      <td>
                        <button
                          className="icon-button"
                          onClick={() => onEdit(reading)}
                          aria-label={`Edit ${reading.date} ${reading.slot}`}
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
