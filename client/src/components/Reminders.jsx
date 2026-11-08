import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate } from '../format.js';

export default function Reminders({ onSessionExpired, timeZone }) {
  const [reminders, setReminders] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api('/reminders')
      .then((result) => {
        if (active) setReminders(result.reminders);
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) onSessionExpired();
        else setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [onSessionExpired]);
  if (error)
    return (
      <p role="alert" className="error-message">
        {error}
      </p>
    );
  if (!reminders)
    return (
      <p role="status" className="loading-panel">
        Loading check-ins…
      </p>
    );
  return (
    <section className="reminders-section">
      <h2>Recent check-ins</h2>
      <p className="muted">
        A check-in is logged when the daily reminder runs and fewer than four readings are recorded.
      </p>
      {reminders.length ? (
        <ul className="reminder-list">
          {reminders.map((reminder) => (
            <li key={reminder.id}>
              <div>
                <h3>{formatDate(reminder.date, { year: 'numeric' })}</h3>
                <p>{reminder.reading_count} of 4 readings recorded at check-in.</p>
              </div>
              <time dateTime={reminder.created_at}>
                {new Intl.DateTimeFormat('en', {
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone,
                }).format(new Date(reminder.created_at))}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h3>Your check-ins will appear here</h3>
          <p>The daily reminder records a check-in when your journal has an open slot.</p>
        </div>
      )}
    </section>
  );
}
