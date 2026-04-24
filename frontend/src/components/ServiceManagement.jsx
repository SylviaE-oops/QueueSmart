import { useState, useEffect } from 'preact/hooks';
import { createService, updateService, deleteService, loadLocations, createLocation, updateLocation, deleteLocation } from '../api';
import styles from './ServiceManagement.module.css';

export function ServiceManagement({ services, onShowToast, onUpdateServices }) {
  const [formTitle, setFormTitle] = useState('Create Service');
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [dur, setDur] = useState('3');
  const [priority, setPriority] = useState('low');
  const [status, setStatus] = useState('open');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Location state
  const [locations, setLocations] = useState([]);
  const [locFormTitle, setLocFormTitle] = useState('Add Location');
  const [locEditingId, setLocEditingId] = useState('');
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locMaxQueues, setLocMaxQueues] = useState('1');
  const [locErrors, setLocErrors] = useState({});
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    loadLocations().then((r) => { if (r.success) setLocations(r.data); });
  }, []);

  const refreshLocations = () => loadLocations().then((r) => { if (r.success) setLocations(r.data); });

  const clearErrors = () => setErrors({});

  const validate = () => {
    clearErrors();
    const newErrors = {};

    const n = name.trim();
    const d = desc.trim();
    const du = Number(dur);
    const pr = priority;

    if (!n) {
      newErrors.name = 'Service Name is required.';
    } else if (n.length > 100) {
      newErrors.name = 'Service Name must be 100 characters or less.';
    }

    if (!d) {
      newErrors.desc = 'Description is required.';
    }

    if (!Number.isFinite(du) || du <= 0) {
      newErrors.dur = 'Expected Duration must be a positive number.';
    }

    if (!['low', 'medium', 'high'].includes(pr)) {
      newErrors.priority = 'Priority is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setEditingId('');
    setFormTitle('Create Service');
    setName('');
    setDesc('');
    setDur('3');
    setPriority('low');
    setStatus('open');
    clearErrors();
  };

  const handleSave = async () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      description: desc.trim(),
      expectedDurationMin: Number(dur),
      priority,
      status
    };

    setLoading(true);
    try {
      if (editingId) {
        const result = await updateService(editingId, payload);
        if (result && result.success) {
          onShowToast('Service updated', 'Changes saved to database.');
          onUpdateServices?.();
          resetForm();
        }
      } else {
        const result = await createService(payload);
        if (result && result.success) {
          onShowToast('Service created', 'Service added to database.');
          onUpdateServices?.();
          resetForm();
        }
      }
    } catch (err) {
      onShowToast('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setEditingId(service.id);
    setFormTitle('Edit Service');
    setName(service.name);
    setDesc(service.description);
    setDur(String(service.expectedDurationMin));
    setPriority(service.priority);
    setStatus(service.status);
    clearErrors();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;

    try {
      await deleteService(id);
      onShowToast('Service deleted', 'Service removed from database.');
      onUpdateServices?.();
    } catch (err) {
      onShowToast('Error', err.message);
    }
  };

  const validateLoc = () => {
    const errs = {};
    if (!locName.trim()) errs.name = 'Location name is required.';
    else if (locName.trim().length > 255) errs.name = 'Name must be 255 characters or less.';
    const mq = Number(locMaxQueues);
    if (!Number.isInteger(mq) || mq < 1) errs.maxQueues = 'Max queues must be a positive whole number.';
    setLocErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetLocForm = () => {
    setLocEditingId('');
    setLocFormTitle('Add Location');
    setLocName('');
    setLocAddress('');
    setLocMaxQueues('1');
    setLocErrors({});
  };

  const handleLocSave = async () => {
    if (!validateLoc()) return;
    const payload = { name: locName.trim(), address: locAddress.trim(), maxQueues: Number(locMaxQueues) };
    setLocLoading(true);
    try {
      if (locEditingId) {
        await updateLocation(locEditingId, payload);
        onShowToast('Location updated', 'Changes saved to database.');
      } else {
        await createLocation(payload);
        onShowToast('Location created', 'Location added to database.');
      }
      await refreshLocations();
      resetLocForm();
    } catch (err) {
      onShowToast('Error', err.message);
    } finally {
      setLocLoading(false);
    }
  };

  const handleLocEdit = (loc) => {
    setLocEditingId(loc.id);
    setLocFormTitle('Edit Location');
    setLocName(loc.name);
    setLocAddress(loc.address || '');
    setLocMaxQueues(String(loc.maxQueues));
    setLocErrors({});
  };

  const handleLocDelete = async (id) => {
    if (!confirm('Delete this location? Book requests assigned to it will lose their location.')) return;
    try {
      await deleteLocation(id);
      onShowToast('Location deleted', 'Location removed from database.');
      await refreshLocations();
    } catch (err) {
      onShowToast('Error', err.message);
    }
  };

  return (
    <div>
      <p class={styles.h1}>Service Management</p>
      <p class={styles.p}>Create or edit services. Changes are saved to the database.</p>

      <div class={styles.cards}>
        <div class={styles.card}>
          <strong>{formTitle}</strong>

          <label class={styles.label}>Service Name (required, max 100)</label>
          <input
            class={styles.input}
            value={name}
            onInput={(e) => setName(e.target.value)}
          />
          {errors.name && <div class={styles.err}>{errors.name}</div>}

          <label class={styles.label}>Description (required)</label>
          <textarea
            class={styles.input}
            value={desc}
            onInput={(e) => setDesc(e.target.value)}
          />
          {errors.desc && <div class={styles.err}>{errors.desc}</div>}

          <div class={styles.row}>
            <div>
              <label class={styles.label}>Expected Duration (minutes, required)</label>
              <input
                class={styles.input}
                type="number"
                min="1"
                value={dur}
                onInput={(e) => setDur(e.target.value)}
              />
              {errors.dur && <div class={styles.err}>{errors.dur}</div>}
            </div>
            <div>
              <label class={styles.label}>Priority Level</label>
              <select
                class={styles.input}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
              {errors.priority && <div class={styles.err}>{errors.priority}</div>}
            </div>
          </div>

          <label class={styles.label}>Queue Status</label>
          <select
            class={styles.input}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          <div class={styles.btnRow}>
            <button class={styles.btn} onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Save changes' : 'Create service'}
            </button>
            <button class={`${styles.btn} ${styles.secondary}`} onClick={resetForm}>
              Clear
            </button>
          </div>
        </div>

        <div class={styles.card}>
          <strong>Services</strong>
          <p class={styles.p} style="margin-top:8px;">Click "Edit" to load a service into the form.</p>
          <table class={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <span class={`${styles.tag} ${styles.muted}`}>{s.priority}</span>
                  </td>
                  <td>
                    {s.status === 'open' ? (
                      <span class={`${styles.tag} ${styles.ok}`}>Open</span>
                    ) : (
                      <span class={`${styles.tag} ${styles.warn}`}>Closed</span>
                    )}
                  </td>
                  <td>
                    <div class={styles.btnRow} style="margin:0;">
                      <button
                        class={`${styles.btn} ${styles.secondary}`}
                        onClick={() => handleEdit(s)}
                      >
                        Edit
                      </button>
                      <button
                        class={`${styles.btn} ${styles.danger}`}
                        onClick={() => handleDelete(s.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Location Management ──────────────────────────────────── */}
      <p class={styles.h1} style="margin-top:32px;">Location Management</p>
      <p class={styles.p}>Add and manage pickup locations. Each location can have multiple queues open at once.</p>

      <div class={styles.cards}>
        <div class={styles.card}>
          <strong>{locFormTitle}</strong>

          <label class={styles.label}>Location Name (required)</label>
          <input
            class={styles.input}
            value={locName}
            onInput={(e) => setLocName(e.target.value)}
            placeholder="e.g. Library Block A"
          />
          {locErrors.name && <div class={styles.err}>{locErrors.name}</div>}

          <label class={styles.label}>Address (optional)</label>
          <input
            class={styles.input}
            value={locAddress}
            onInput={(e) => setLocAddress(e.target.value)}
            placeholder="e.g. Ground Floor, Building 2"
          />

          <label class={styles.label}>Max Queues at this location</label>
          <input
            class={styles.input}
            type="number"
            min="1"
            value={locMaxQueues}
            onInput={(e) => setLocMaxQueues(e.target.value)}
          />
          {locErrors.maxQueues && <div class={styles.err}>{locErrors.maxQueues}</div>}

          <div class={styles.btnRow}>
            <button class={styles.btn} onClick={handleLocSave} disabled={locLoading}>
              {locLoading ? 'Saving...' : locEditingId ? 'Save changes' : 'Add location'}
            </button>
            <button class={`${styles.btn} ${styles.secondary}`} onClick={resetLocForm}>
              Clear
            </button>
          </div>
        </div>

        <div class={styles.card}>
          <strong>Locations</strong>
          <p class={styles.p} style="margin-top:8px;">Click "Edit" to modify a location.</p>
          {locations.length === 0 ? (
            <p class={styles.p}>No locations yet. Add one using the form.</p>
          ) : (
            <table class={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Max Queues</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td>{loc.name}</td>
                    <td>{loc.address || <span style="color:var(--text-light)">—</span>}</td>
                    <td style="text-align:center;">{loc.maxQueues}</td>
                    <td>
                      <div class={styles.btnRow} style="margin:0;">
                        <button
                          class={`${styles.btn} ${styles.secondary}`}
                          onClick={() => handleLocEdit(loc)}
                        >
                          Edit
                        </button>
                        <button
                          class={`${styles.btn} ${styles.danger}`}
                          onClick={() => handleLocDelete(loc.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
