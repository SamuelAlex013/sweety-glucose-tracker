import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { SLOTS, validateReading } from '../../../shared/domain.js';
import { api } from '../api.js';

export default function ReadingForm({ reading, date, today, onSaved, onCancel, onSessionExpired }) {
  const [values, setValues] = useState({
    date: reading?.date || date,
    slot: reading?.slot || 'morning',
    value: reading?.value ?? '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  useEffect(() => {
    formRef.current?.querySelector('input[name="value"]')?.focus();
  }, []);

  function change(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    const fields = validateReading(values, today);
    setErrors(fields);
    setError('');
    if (Object.keys(fields).length) {
      formRef.current?.elements[Object.keys(fields)[0]]?.focus();
      return;
    }
    setBusy(true);
    try {
      const result = await api(`/readings${reading?.id ? `/${reading.id}` : ''}`, {
        method: reading?.id ? 'PUT' : 'POST',
        body: values,
      });
      onSaved(result.reading);
    } catch (error) {
      if (error.status === 401) onSessionExpired();
      else {
        setError(error.message);
        setErrors(error.fields || {});
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reading-editor" aria-labelledby="form-title">
      <div className="section-heading">
        <div>
          <h2 id="form-title">{reading?.id ? 'Edit reading' : 'Add a reading'}</h2>
          <p className="muted">Record the value from your glucose meter.</p>
        </div>
        <button
          className="icon-button"
          onClick={onCancel}
          aria-label="Close reading form"
          disabled={busy}
        >
          <X size={21} />
        </button>
      </div>
      <form ref={formRef} onSubmit={submit} noValidate>
        <div className="editor-fields">
          <div className="form-field">
            <label htmlFor="reading-date">Date</label>
            <input
              id="reading-date"
              type="date"
              name="date"
              min="1900-01-01"
              max={today}
              value={values.date}
              onChange={change}
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? 'date-error' : undefined}
            />
            {errors.date && (
              <span className="field-error" id="date-error">
                {errors.date}
              </span>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="reading-slot">Time slot</label>
            <select
              id="reading-slot"
              name="slot"
              value={values.slot}
              onChange={change}
              aria-invalid={!!errors.slot}
              aria-describedby={errors.slot ? 'slot-error' : undefined}
            >
              {SLOTS.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.label}
                </option>
              ))}
            </select>
            {errors.slot && (
              <span className="field-error" id="slot-error">
                {errors.slot}
              </span>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="reading-value">Glucose value</label>
            <span className="value-input">
              <input
                id="reading-value"
                name="value"
                type="number"
                inputMode="numeric"
                min="40"
                max="600"
                step="1"
                value={values.value}
                onChange={change}
                placeholder="e.g. 110"
                aria-invalid={!!errors.value}
                aria-describedby={errors.value ? 'value-error' : 'value-help'}
              />
              <span>mg/dl</span>
            </span>
            {errors.value ? (
              <span className="field-error" id="value-error">
                {errors.value}
              </span>
            ) : (
              <span className="input-hint" id="value-help">
                Whole number, 40–600 mg/dl
              </span>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <div className="editor-actions">
          <button className="button secondary" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save reading'}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}
