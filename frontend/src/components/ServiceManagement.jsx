import { useState, useEffect } from 'preact/hooks';
import { createService, updateService, deleteService } from '../api';
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
    </div>
  );
}
