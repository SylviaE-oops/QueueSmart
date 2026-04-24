import { useState, useEffect } from 'preact/hooks';
import { loadAdminBookRequests, updateBookRequestStatus, loadLocations } from '../api';
import styles from './AdminBookRequests.module.css';

const STATUS_ORDER = ['pending', 'preparing', 'ready', 'picked_up'];

const STATUS_LABELS = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  picked_up: 'Picked Up',
};

const NEXT_STATUS = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'picked_up',
};

export function AdminBookRequests({ onShowToast }) {
  const [requests, setRequests] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // id of request being updated
  const [filterStatus, setFilterStatus] = useState('all');

  // Location picker state: { requestId, selectedLocationId }
  const [locationPick, setLocationPick] = useState(null);

  const refresh = async () => {
    try {
      const [reqResult, locResult] = await Promise.all([
        loadAdminBookRequests(),
        loadLocations(),
      ]);
      if (reqResult.success) setRequests(reqResult.data);
      if (locResult.success) setLocations(locResult.data);
    } catch (err) {
      onShowToast('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleAdvance = async (req) => {
    const next = NEXT_STATUS[req.status];
    if (!next) return;

    // When moving to 'ready', require a location selection
    if (next === 'ready') {
      setLocationPick({ requestId: req.id, selectedLocationId: locations[0]?.id || '' });
      return;
    }

    setUpdating(req.id);
    try {
      await updateBookRequestStatus(req.id, next);
      onShowToast('Updated', `Request marked as "${STATUS_LABELS[next]}".`);
      await refresh();
    } catch (err) {
      onShowToast('Error', err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmReady = async () => {
    if (!locationPick) return;
    const { requestId, selectedLocationId } = locationPick;
    if (!selectedLocationId) {
      onShowToast('Required', 'Please select a pickup location.');
      return;
    }
    setUpdating(requestId);
    setLocationPick(null);
    try {
      await updateBookRequestStatus(requestId, 'ready', Number(selectedLocationId));
      onShowToast('Updated', 'Request marked as "Ready". Student has been notified.');
      await refresh();
    } catch (err) {
      onShowToast('Error', err.message);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filterStatus === 'all'
    ? requests
    : requests.filter((r) => r.status === filterStatus);

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = requests.filter((r) => r.status === s).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div>
        <p class={styles.h1}>Book Requests</p>
        <p class={styles.p}>Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <p class={styles.h1}>Book Requests</p>
      <p class={styles.p}>
        Review student requests, prepare bundles, assign a pickup location, and track collection.
      </p>

      {/* KPI row */}
      <div class={styles.kpiRow}>
        {STATUS_ORDER.map((s) => (
          <div key={s} class={styles.kpi}>
            <span class={`${styles.tag} ${styles[s]}`}>{STATUS_LABELS[s]}</span>
            <strong>{counts[s]}</strong>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div class={styles.tabs}>
        <button
          class={`${styles.tab} ${filterStatus === 'all' ? styles.tabActive : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All ({requests.length})
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            class={`${styles.tab} ${filterStatus === s ? styles.tabActive : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Location picker modal */}
      {locationPick && (
        <div class={styles.modalOverlay}>
          <div class={styles.modal}>
            <strong>Assign Pickup Location</strong>
            <p class={styles.p} style="margin-top:8px;">
              Select the location where the student will collect their books. They will be notified immediately.
            </p>
            {locations.length === 0 ? (
              <p class={styles.p} style="color:var(--danger);">
                No locations found. Add locations in Service Management first.
              </p>
            ) : (
              <select
                class={styles.select}
                value={locationPick.selectedLocationId}
                onChange={(e) =>
                  setLocationPick((p) => ({ ...p, selectedLocationId: e.target.value }))
                }
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}{loc.address ? ` — ${loc.address}` : ''}
                  </option>
                ))}
              </select>
            )}
            <div class={styles.btnRow}>
              <button class={styles.btn} onClick={handleConfirmReady} disabled={locations.length === 0}>
                Mark Ready & Notify Student
              </button>
              <button
                class={`${styles.btn} ${styles.secondary}`}
                onClick={() => setLocationPick(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests table */}
      {filtered.length === 0 ? (
        <div class={styles.empty}>No requests in this category.</div>
      ) : (
        <div class={styles.tableWrap}>
          <table class={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Book</th>
                <th>Course</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Location</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td>
                    <div class={styles.studentName}>{req.studentName}</div>
                    <div class={styles.studentEmail}>{req.studentEmail}</div>
                  </td>
                  <td>
                    <div class={styles.bookTitle}>{req.bookTitle}</div>
                    {req.author && <div class={styles.bookMeta}>{req.author}</div>}
                    {req.isbn && <div class={styles.bookMeta}>ISBN: {req.isbn}</div>}
                  </td>
                  <td>{req.courseCode || <span class={styles.muted}>—</span>}</td>
                  <td>{req.notes || <span class={styles.muted}>—</span>}</td>
                  <td>
                    <span class={`${styles.tag} ${styles[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </td>
                  <td>{req.locationName || <span class={styles.muted}>—</span>}</td>
                  <td class={styles.date}>
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {NEXT_STATUS[req.status] ? (
                      <button
                        class={`${styles.btn} ${styles.small}`}
                        disabled={updating === req.id}
                        onClick={() => handleAdvance(req)}
                      >
                        {updating === req.id
                          ? '…'
                          : `Mark ${STATUS_LABELS[NEXT_STATUS[req.status]]}`}
                      </button>
                    ) : (
                      <span class={styles.muted}>Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
