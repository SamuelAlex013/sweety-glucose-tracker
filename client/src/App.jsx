import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  LogOut,
  Plus,
  RotateCcw,
  List,
  Bell,
} from 'lucide-react';
import { api } from './api.js';
import { SLOTS } from '../../shared/domain.js';
import { formatDate, shiftDate } from './format.js';
import Brand from './components/Brand.jsx';
import AuthPage from './components/AuthPage.jsx';
import ReadingForm from './components/ReadingForm.jsx';
import DailyLog from './components/DailyLog.jsx';
import Report from './components/Report.jsx';
import TrendChart from './components/TrendChart.jsx';
import HistoryTable from './components/HistoryTable.jsx';
import ReadingHistory from './components/ReadingHistory.jsx';
import Reminders from './components/Reminders.jsx';

function Dashboard({ user, settings, onLogout }) {
  const isDoctor = user.role === 'doctor';
  const [page, setPage] = useState('journal');
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState(settings.today);
  const [type, setType] = useState(isDoctor ? 'mtd' : 'daily');
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [revision, setRevision] = useState(0);
  const editorRef = useRef(null);
  const dailyReadings = reports?.daily.readings || [];
  const sessionExpired = useCallback(
    () => onLogout('Your session has expired. Please log in again.'),
    [onLogout],
  );

  useEffect(() => {
    if (!isDoctor) return;
    let active = true;
    api('/patients')
      .then(({ patients }) => {
        if (!active) return;
        setPatients(patients);
        setPatientId((current) =>
          patients.some((patient) => patient.id === current) ? current : patients[0]?.id || '',
        );
        if (!patients.length) setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) sessionExpired();
        else {
          setError(error.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [isDoctor, revision, sessionExpired]);

  useEffect(() => {
    if (page !== 'journal' || (isDoctor && !patientId)) return;
    let active = true;
    setLoading(true);
    setError('');
    api(`/reports?date=${date}${isDoctor ? `&patientId=${patientId}` : ''}`)
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
  }, [date, revision, sessionExpired, isDoctor, patientId, page]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  function openEditor(reading = {}) {
    setNotice('');
    setEditor({ ...reading, key: Date.now() });
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }

  function changeDate(next) {
    if (!next || next < '1900-01-01' || next > settings.today) return;
    setDate(next);
    setEditor(null);
  }

  function saved(reading) {
    setPage('journal');
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
        <div className="sidebar-content">
          <a className="brand-link" href="#main" aria-label="Sweety journal">
            <Brand />
          </a>
          <nav aria-label="Main navigation">
            {!isDoctor && (
              <button
                className={page === 'journal' && type === 'daily' ? 'nav-item active' : 'nav-item'}
                onClick={() => {
                  setType('daily');
                  setPage('journal');
                  setEditor(null);
                }}
              >
                <BookOpen size={19} />
                My journal
              </button>
            )}
            <button
              className={
                page === 'journal' && (type !== 'daily' || isDoctor)
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() => {
                setType('mtd');
                setPage('journal');
                setEditor(null);
              }}
            >
              <ChartNoAxesCombined size={19} />
              {isDoctor ? 'Patient reports' : 'Reports'}
            </button>
            {!isDoctor && (
              <>
                <button
                  className={page === 'history' ? 'nav-item active' : 'nav-item'}
                  onClick={() => {
                    setPage('history');
                    setEditor(null);
                  }}
                >
                  <List size={19} />
                  History
                </button>
                <button
                  className={page === 'reminders' ? 'nav-item active' : 'nav-item'}
                  onClick={() => {
                    setPage('reminders');
                    setEditor(null);
                  }}
                >
                  <Bell size={19} />
                  Reminders
                </button>
              </>
            )}
          </nav>
          <div className="account">
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{isDoctor ? 'Doctor account' : 'Personal account'}</span>
            </div>
            <button className="icon-button" aria-label="Log out" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
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
                {isDoctor
                  ? 'Patient reports'
                  : page === 'history'
                    ? 'Reading history'
                    : page === 'reminders'
                      ? 'Daily check-ins'
                      : type === 'daily'
                        ? `${user.name.split(' ')[0]}'s journal`
                        : 'Glucose reports'}
              </h1>
              <p>
                {isDoctor
                  ? 'Review readings for your assigned patients.'
                  : page === 'history'
                    ? 'Browse your readings, 20 at a time.'
                    : page === 'reminders'
                      ? 'Check-ins from your daily recording routine.'
                      : type === 'daily'
                        ? 'Record up to four readings for the selected date.'
                        : 'Review daily values and monthly summaries.'}
              </p>
            </div>
            {!isDoctor && page === 'journal' && (
              <button
                className="button primary"
                onClick={() =>
                  openEditor({
                    slot:
                      SLOTS.find(
                        (slot) => !dailyReadings.some((reading) => reading.slot === slot.id),
                      )?.id || SLOTS[0].id,
                  })
                }
              >
                <Plus size={18} />
                Add reading
              </button>
            )}
          </div>
          {isDoctor && patients.length > 0 && (
            <label className="patient-picker">
              Assigned patient
              <select
                value={patientId}
                onChange={(event) => {
                  setPatientId(event.target.value);
                  setEditor(null);
                }}
              >
                {patients.map((patient) => (
                  <option value={patient.id} key={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {page === 'journal' && (
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
          )}
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
          {page === 'history' ? (
            <ReadingHistory onEdit={openEditor} onSessionExpired={sessionExpired} />
          ) : page === 'reminders' ? (
            <Reminders onSessionExpired={sessionExpired} timeZone={settings.timeZone} />
          ) : isDoctor && !patients.length && !loading ? (
            <div className="empty-state">
              <h2>Patient assignments will appear here</h2>
              <p>Your care team can assign patient accounts to your doctor account.</p>
            </div>
          ) : loading ? (
            <div className="loading-panel" role="status">
              <span className="loading-dot" />
              Loading your journal…
            </div>
          ) : (
            !error &&
            reports && (
              <>
                <Report report={reports[type]} type={type} readOnly={isDoctor} />
                {type === 'daily' && !isDoctor ? (
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
                  <HistoryTable
                    readings={reports[type].readings}
                    onEdit={isDoctor ? undefined : openEditor}
                  />
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
            <span>Dates follow {settings.timeZone}. Values are shown in mg/dl.</span>
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
