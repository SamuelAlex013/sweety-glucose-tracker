import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  LogOut,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { api } from './api.js';
import { formatDate, shiftDate } from './format.js';
import Brand from './components/Brand.jsx';
import AuthPage from './components/AuthPage.jsx';
import ReadingForm from './components/ReadingForm.jsx';
import DailyLog from './components/DailyLog.jsx';
import Report from './components/Report.jsx';
import TrendChart from './components/TrendChart.jsx';
import HistoryTable from './components/HistoryTable.jsx';

function Dashboard({ user, settings, onLogout }) {
  const [date, setDate] = useState(settings.today);
  const [type, setType] = useState('daily');
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [revision, setRevision] = useState(0);
  const editorRef = useRef(null);
  const sessionExpired = useCallback(
    () => onLogout('Your session has expired. Please log in again.'),
    [onLogout],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(`/reports?date=${date}`)
      .then(({ reports }) => {
        if (active) setReports(reports);
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) sessionExpired();
        else setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date, revision, sessionExpired]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  function openEditor(reading = {}) {
    setEditor({ ...reading, key: Date.now() });
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }

  function changeDate(next) {
    if (!next || next < '1900-01-01' || next > settings.today) return;
    setDate(next);
    setEditor(null);
  }

  function saved(reading) {
    setEditor(null);
    setDate(reading.date);
    setType('daily');
    setRevision((value) => value + 1);
    setNotice(editor?.id ? 'Reading updated.' : 'Reading saved.');
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST', body: {} });
      onLogout();
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to journal
      </a>
      <aside className="sidebar">
        <a className="brand-link" href="#main" aria-label="Sweety journal">
          <Brand />
        </a>
        <nav aria-label="Main navigation">
          <button
            className={type === 'daily' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              setType('daily');
              setEditor(null);
            }}
          >
            <BookOpen size={19} />
            My journal
            <ChevronRight size={16} />
          </button>
          <button
            className={type !== 'daily' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              setType('mtd');
              setEditor(null);
            }}
          >
            <ChartNoAxesCombined size={19} />
            Reports
            <ChevronRight size={16} />
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="note-line" />
          <p>
            Small moments.
            <br />A daily picture.
          </p>
          <span>Your readings, in your own time.</span>
        </div>
        <div className="account">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <span>Personal account</span>
          </div>
          <button className="icon-button" aria-label="Log out" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>Your glucose journal</span>
          <span className="topbar-date">
            <CalendarDays size={16} />
            {formatDate(settings.today, { weekday: 'short', year: 'numeric' })}
          </span>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <h1>
                {type === 'daily'
                  ? `A little check-in, ${user.name.split(' ')[0]}.`
                  : 'See the bigger picture.'}
              </h1>
              <p>
                {type === 'daily'
                  ? 'Keep track of your day, one reading at a time.'
                  : 'Your recorded readings, brought together.'}
              </p>
            </div>
            <button
              className="button primary"
              onClick={() =>
                openEditor({
                  slot:
                    reports?.daily.readings.length < 4
                      ? ['morning', 'breakfast', 'lunch', 'dinner'].find(
                          (slot) => !reports.daily.readings.some((item) => item.slot === slot),
                        )
                      : 'morning',
                })
              }
            >
              <Plus size={18} />
              Add reading
            </button>
          </div>
          <div className="report-toolbar">
            <div className="tabs" role="group" aria-label="Report period">
              {[
                ['daily', 'Daily'],
                ['mtd', 'Month to date'],
                ['monthly', 'Previous month'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={type === value}
                  className={type === value ? 'selected' : ''}
                  onClick={() => {
                    setType(value);
                    setEditor(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="date-picker">
              <button
                className="icon-button"
                aria-label="Previous day"
                disabled={date <= '1900-01-01'}
                onClick={() => changeDate(shiftDate(date, -1))}
              >
                <ArrowLeft size={17} />
              </button>
              <label>
                <span className="sr-only">Selected date</span>
                <input
                  type="date"
                  value={date}
                  min="1900-01-01"
                  max={settings.today}
                  onChange={(event) => changeDate(event.target.value)}
                />
              </label>
              <button
                className="icon-button"
                aria-label="Next day"
                disabled={date >= settings.today}
                onClick={() => changeDate(shiftDate(date, 1))}
              >
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
          <div aria-live="polite" className="notice-region">
            {notice && (
              <p className="success-notice">
                <Check size={16} />
                {notice}
              </p>
            )}
          </div>
          {editor && (
            <div ref={editorRef}>
              <ReadingForm
                key={editor.key}
                reading={editor}
                date={date}
                today={settings.today}
                onSaved={saved}
                onCancel={() => setEditor(null)}
                onSessionExpired={sessionExpired}
              />
            </div>
          )}
          {error && (
            <div role="alert" className="error-message request-error">
              {error}
              <button
                className="button secondary small"
                onClick={() => setRevision((value) => value + 1)}
              >
                <RotateCcw size={15} />
                Try again
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-panel" role="status">
              <span className="loading-dot" />
              Loading your journal…
            </div>
          ) : (
            !error &&
            reports && (
              <>
                <Report report={reports[type]} type={type} />
                {type === 'daily' ? (
                  <DailyLog
                    key={date}
                    readings={reports.daily.readings}
                    onAdd={(slot) => openEditor({ slot })}
                    onEdit={openEditor}
                    onDeleted={() => {
                      setRevision((value) => value + 1);
                      setNotice('Reading deleted.');
                    }}
                    onSessionExpired={sessionExpired}
                  />
                ) : (
                  <HistoryTable readings={reports[type].readings} onEdit={openEditor} />
                )}
                <TrendChart
                  readings={reports[type === 'monthly' ? 'monthly' : 'mtd'].readings}
                  start={reports[type === 'monthly' ? 'monthly' : 'mtd'].start}
                  end={reports[type === 'monthly' ? 'monthly' : 'mtd'].end}
                />
              </>
            )
          )}
          <footer className="page-footer">
            <span>Made for your everyday.</span>
            <span>
              Dates follow {settings.timeZone}. This journal does not provide medical advice.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const logout = useCallback((message = '') => {
    setUser(null);
    setError(message);
  }, []);

  async function initialize() {
    setLoading(true);
    setError('');
    try {
      const settings = await api('/config');
      setSettings(settings);
      try {
        const { user } = await api('/auth/me');
        setUser(user);
      } catch (error) {
        if (error.status !== 401) throw error;
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    initialize();
  }, []);
  if (loading)
    return (
      <div className="boot-screen">
        <Brand />
        <p role="status">Opening your journal…</p>
      </div>
    );
  if (!settings)
    return (
      <div className="boot-screen">
        <Brand />
        <p role="alert">{error}</p>
        <button className="button primary" onClick={initialize}>
          Try again
        </button>
      </div>
    );
  if (!user)
    return (
      <>
        {error && (
          <p role="status" className="session-notice">
            {error}
          </p>
        )}
        <AuthPage
          onLogin={(user) => {
            setUser(user);
            setError('');
          }}
        />
      </>
    );
  return <Dashboard user={user} settings={settings} onLogout={logout} />;
}
