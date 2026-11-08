import { useState } from 'react';
import { Check, Coffee, Moon, Pencil, Plus, Sun, Sunrise, Trash2 } from 'lucide-react';
import { SLOTS } from '../../../shared/domain.js';
import { api } from '../api.js';

export const slotIcons = [Sunrise, Coffee, Sun, Moon];

export default function DailyLog({ readings, onAdd, onEdit, onDeleted, onSessionExpired }) {
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove(id) {
    setBusy(true);
    setError('');
    try {
      await api(`/readings/${id}`, { method: 'DELETE' });
      setDeleting(null);
      onDeleted();
    } catch (error) {
      if (error.status === 401) onSessionExpired();
      else setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="daily-log" aria-labelledby="daily-log-title">
      <div className="section-heading">
        <div>
          <h2 id="daily-log-title">Daily readings</h2>
          <p className="muted">A place for each part of your day.</p>
        </div>
        <span className="count-label">{readings.length} of 4 recorded</span>
      </div>
      <div className="slot-list">
        {SLOTS.map((slot, index) => {
          const reading = readings.find((item) => item.slot === slot.id);
          const Icon = slotIcons[index];
          return (
            <div className={`slot-row ${reading ? 'recorded' : ''}`} key={slot.id}>
              <span className="slot-icon">
                <Icon size={23} strokeWidth={1.6} />
              </span>
              <div className="slot-name">
                <h3>{slot.label}</h3>
                <p>{slot.context}</p>
              </div>
              {reading ? (
                <>
                  <span className="reading-number">
                    {reading.value}
                    <small>mg/dl</small>
                  </span>
                  <span className="recorded-badge">
                    <Check size={13} />
                    <span>Recorded</span>
                  </span>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Edit ${slot.label}`}
                      onClick={() => onEdit(reading)}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button delete-button"
                      aria-label={`Delete ${slot.label}`}
                      onClick={() => {
                        setDeleting(reading.id);
                        setError('');
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  {deleting === reading.id && (
                    <div className="delete-confirm">
                      <p>Delete this {slot.label.toLowerCase()} reading?</p>
                      <div>
                        <button
                          className="button secondary small"
                          disabled={busy}
                          onClick={() => setDeleting(null)}
                        >
                          Keep reading
                        </button>
                        <button
                          className="button danger small"
                          disabled={busy}
                          onClick={() => remove(reading.id)}
                        >
                          {busy ? 'Deleting…' : 'Delete reading'}
                        </button>
                      </div>
                      {error && (
                        <p role="alert" className="field-error">
                          {error}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span className="empty-slot">Not recorded</span>
                  <button className="button add-slot" onClick={() => onAdd(slot.id)}>
                    <Plus size={16} />
                    Add<span className="sr-only"> {slot.label}</span>
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
