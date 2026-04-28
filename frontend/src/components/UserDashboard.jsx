import { useState, useEffect } from 'preact/hooks';
import { loadServices } from '../api';
import styles from './UserDashboard.module.css';
import { MdDashboard, MdGroups, MdBarChart } from "react-icons/md";

export function UserDashboard({ services, onShowToast }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const result = await loadServices();
        if (result && result.success) {
          // Services would be updated in parent
        }
      } catch (err) {
        onShowToast('Error', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const active = services.filter(s => s.status === 'open').length;
  const closed = services.filter(s => s.status === 'closed').length;

  return (
    <div>
      <p class={styles.h1}>
        <MdDashboard class={styles.titleIcon} />
        User Dashboard
      </p>

      <p class={styles.p}>Overview of queue status, services, and notifications.</p>

      <div class={styles.cards}>
        <div class={`${styles.card} ${styles.kpi}`}>
          <div>
            <div class={`${styles.tag} ${styles.muted}`}>
              <MdDashboard class={styles.cardIcon} />
              Services Open
            </div>
            <strong>{active}</strong>
          </div>
          <span class={`${styles.tag} ${styles.ok}`}>Available</span>
        </div>

        <div class={`${styles.card} ${styles.kpi}`}>
          <div>
            <div class={`${styles.tag} ${styles.muted}`}>
              <MdBarChart class={styles.cardIcon} />
              Services Closed
            </div>
            <strong>{closed}</strong>
          </div>
          <span class={`${styles.tag} ${styles.warn}`}>Check later</span>
        </div>
      </div>

      <div class={styles.cards} style="margin-top:12px;">
        <div class={styles.card}>
          <strong class={styles.cardTitle}>
            <MdGroups class={styles.cardIcon} />
            Active Services
          </strong>

          <p class={styles.p} style="margin-top:8px;">
            {services.length === 0
              ? 'No services available'
              : `${services.length} services found`}
          </p>

          <table class={styles.table}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Priority</th>
                <th>Status</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
