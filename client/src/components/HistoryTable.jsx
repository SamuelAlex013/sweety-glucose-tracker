import { SLOTS } from '../../../shared/domain.js';
import { formatDate } from '../format.js';
import { Pencil } from 'lucide-react';

export default function HistoryTable({ readings, onEdit }) {
  return (
    <section className="history-section">
      <div className="section-heading">
        <h2>Readings in this report</h2>
        <span className="count-label">{readings.length} readings</span>
      </div>
      {!readings.length ? (
        <p className="muted">
          No readings to list for this period. Choose another date or add your first reading.
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Time slot</th>
                <th scope="col">Glucose (mg/dl)</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {readings
                .slice()
                .reverse()
                .map((reading) => (
                  <tr key={reading.id}>
                    <td>{formatDate(reading.date, { year: 'numeric' })}</td>
                    <td>{SLOTS.find((slot) => slot.id === reading.slot)?.label}</td>
                    <td className="table-value">{reading.value}</td>
                    <td>
                      <button
                        className="icon-button"
                        onClick={() => onEdit(reading)}
                        aria-label={`Edit ${reading.date} ${reading.slot}`}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
