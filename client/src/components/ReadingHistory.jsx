import { useEffect, useState } from 'react';
import { api } from '../api.js';
import HistoryTable from './HistoryTable.jsx';

export default function ReadingHistory({ onEdit, onSessionExpired }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(`/readings?page=${page}&limit=20`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) onSessionExpired();
        else setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, onSessionExpired]);
  if (loading)
    return (
      <p role="status" className="loading-panel">
        Loading readings…
      </p>
    );
  if (error)
    return (
      <p role="alert" className="error-message">
        {error}
      </p>
    );
  return (
    <>
      <HistoryTable
        readings={data.readings}
        onEdit={onEdit}
        title="Saved readings"
        total={data.pagination.total}
      />
      <nav className="pagination-controls" aria-label="Reading pages">
        <button
          className="button secondary"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous page
        </button>
        <span role="status">
          Page {page} of {Math.max(1, data.pagination.totalPages)} · {data.pagination.total}{' '}
          readings
        </span>
        <button
          className="button secondary"
          disabled={page >= data.pagination.totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next page
        </button>
      </nav>
    </>
  );
}
