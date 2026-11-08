import { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { api } from '../api.js';
import Brand from './Brand.jsx';

export default function AuthPage({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { user } = await api(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        body,
      });
      onLogin(user);
    } catch (error) {
      setError(error.message);
      setFields(error.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-message">
          <h1>
            A little record.
            <br />A clearer picture.
          </h1>
          <p>Your daily readings, together in one place. Make room for a simple routine.</p>
          <div className="sample-log" aria-label="Illustrative daily log">
            <div className="sample-title">
              <span>A day in your journal</span>
              <span>Example</span>
            </div>
            {['Morning (fasting)', 'After breakfast', 'After lunch', 'After dinner'].map(
              (label, index) => (
                <div className="sample-row" key={label}>
                  <span className="sample-check">
                    <Check size={14} />
                  </span>
                  <span>{label}</span>
                  <strong>
                    {[98, 132, 125, 118][index]} <small>mg/dl</small>
                  </strong>
                </div>
              ),
            )}
          </div>
        </div>
        <p className="auth-footnote">A personal journal, one reading at a time.</p>
      </section>
      <section className="auth-form-area">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <h2>{register ? 'Start your journal' : 'Welcome back'}</h2>
          <p className="muted">
            {register
              ? 'Create your account to record your first reading.'
              : 'Log in to pick up where you left off.'}
          </p>
          <form onSubmit={submit} className="auth-form">
            {register && (
              <div className="form-field">
                <label htmlFor="auth-name">Your name</label>
                <input
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  aria-invalid={!!fields.name}
                  aria-describedby={fields.name ? 'name-error' : undefined}
                />
                {fields.name && (
                  <span className="field-error" id="name-error">
                    {fields.name}
                  </span>
                )}
              </div>
            )}
            <div className="form-field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@example.com"
                aria-invalid={!!fields.email}
                aria-describedby={fields.email ? 'email-error' : undefined}
              />
              {fields.email && (
                <span className="field-error" id="email-error">
                  {fields.email}
                </span>
              )}
            </div>
            <div className="form-field">
              <label htmlFor="auth-password">Password</label>
              <span className="password-input">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  required
                  minLength={register ? 8 : undefined}
                  aria-invalid={!!fields.password}
                  aria-describedby={
                    fields.password ? 'password-error' : register ? 'password-help' : undefined
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
              {register && (
                <span className="input-hint" id="password-help">
                  At least 8 characters; up to 72 UTF-8 bytes.
                </span>
              )}
              {fields.password && (
                <span className="field-error" id="password-error">
                  {fields.password}
                </span>
              )}
            </div>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? 'Please wait…' : register ? 'Create account' : 'Log in'}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to Sweety?'}{' '}
            <button
              className="text-button"
              onClick={() => {
                setRegister(!register);
                setError('');
                setFields({});
              }}
            >
              {register ? 'Log in' : 'Create an account'}
            </button>
          </p>
          <p className="privacy-note">
            <LockKeyhole size={15} /> Your journal is private to your account.
          </p>
        </div>
      </section>
    </main>
  );
}
