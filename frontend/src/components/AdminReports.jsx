import { useEffect, useState } from 'preact/hooks';
import { loadAdminReports } from '../api';
import styles from './AdminReports.module.css';

function formatDateTime(value) {
  if (!value) return 'No activity';
  return new Date(value).toLocaleString();
}

function formatAverage(value) {
  if (value === null || value === undefined) return 'N/A';
  return `${Number(value).toFixed(1)} min`;
}

export function AdminReports({ onShowToast }) {
  const [report, setReport] = useState({
    overview: {},
    users: [],
    services: [],
    queueUsage: { statusBreakdown: [] },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);

  const refresh = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await loadAdminReports();
      if (result.success) {
        setReport(result.data);
        setGeneratedAt(new Date().toISOString());
      }
    } catch (error) {
      onShowToast('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading) {
    return (
      <div>
        <p class={styles.h1}>Stats Reporting</p>
        <p class={styles.p}>Generating report…</p>
      </div>
    );
  }

  const { overview, users, services, queueUsage } = report;

  return (
    <div>
      <div class={styles.headerRow}>
        <div>
          <p class={styles.h1}>Stats Reporting</p>
          <p class={styles.p}>
            Generate administrator reports for user participation, service activity, and queue usage.
          </p>
          <p class={styles.meta}>Last generated: {formatDateTime(generatedAt)}</p>
        </div>
        <button class={styles.btn} onClick={() => refresh({ silent: true })} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh report'}
        </button>
      </div>

      <div class={styles.kpiGrid}>
        <div class={styles.kpiCard}>
          <span>Total users</span>
          <strong>{overview.totalUsers || 0}</strong>
        </div>
        <div class={styles.kpiCard}>
          <span>Total services</span>
          <strong>{overview.totalServices || 0}</strong>
        </div>
        <div class={styles.kpiCard}>
          <span>Active queue entries</span>
          <strong>{overview.activeQueueEntries || 0}</strong>
        </div>
        <div class={styles.kpiCard}>
          <span>Users served</span>
          <strong>{overview.usersServed || 0}</strong>
        </div>
        <div class={styles.kpiCard}>
          <span>Average wait time</span>
          <strong>{formatAverage(overview.averageWaitMinutes)}</strong>
        </div>
      </div>

      <section class={styles.section}>
        <div class={styles.sectionHeading}>
          <div>
            <h2>Queue usage statistics</h2>
            <p class={styles.p}>Current queue mix and service-level throughput.</p>
          </div>
        </div>

        <div class={styles.statsGrid}>
          <div class={styles.card}>
            <strong>Status breakdown</strong>
            <div class={styles.tableWrap}>
              <table class={styles.table}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(queueUsage.statusBreakdown || []).map((item) => (
                    <tr key={item.status}>
                      <td>{item.status}</td>
                      <td>{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div class={styles.card}>
            <strong>Service performance</strong>
            <div class={styles.tableWrap}>
              <table class={styles.table}>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Served</th>
                    <th>Active</th>
                    <th>Avg wait</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td>{service.name}</td>
                      <td>{service.servedCount}</td>
                      <td>{service.activeQueueLength}</td>
                      <td>{formatAverage(service.averageWaitMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionHeading}>
          <div>
            <h2>Service details and queue activity</h2>
            <p class={styles.p}>Operational view of each service, assigned location, and recent queue actions.</p>
          </div>
        </div>

        <div class={styles.serviceGrid}>
          {services.map((service) => (
            <article key={service.id} class={styles.card}>
              <div class={styles.serviceHeader}>
                <div>
                  <strong>{service.name}</strong>
                  <p class={styles.p}>{service.description || 'No description provided.'}</p>
                </div>
                <span class={`${styles.tag} ${service.isOpen ? styles.open : styles.closed}`}>
                  {service.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>

              <div class={styles.metricGrid}>
                <div>
                  <span class={styles.metricLabel}>Location</span>
                  <div>{service.locationName || 'Unassigned'}</div>
                </div>
                <div>
                  <span class={styles.metricLabel}>Unique users</span>
                  <div>{service.uniqueUsers}</div>
                </div>
                <div>
                  <span class={styles.metricLabel}>Completed entries</span>
                  <div>{service.completedQueueEntries}</div>
                </div>
                <div>
                  <span class={styles.metricLabel}>Total queue entries</span>
                  <div>{service.totalQueueEntries}</div>
                </div>
              </div>

              <div>
                <span class={styles.metricLabel}>Recent activity</span>
                {service.recentActivity.length === 0 ? (
                  <p class={styles.empty}>No activity recorded yet.</p>
                ) : (
                  <ul class={styles.activityList}>
                    {service.recentActivity.map((item) => (
                      <li key={item.id}>
                        <strong>{item.userName}</strong> {item.action}
                        <span>{formatDateTime(item.actionTime)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionHeading}>
          <div>
            <h2>Users and queue participation history</h2>
            <p class={styles.p}>Customer-level participation totals with full recorded queue history.</p>
          </div>
        </div>

        <div class={styles.tableWrap}>
          <table class={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Participations</th>
                <th>Served</th>
                <th>Last activity</th>
                <th>History</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div class={styles.userName}>{user.fullName}</div>
                    <div class={styles.userEmail}>{user.email}</div>
                  </td>
                  <td>{user.role}</td>
                  <td>{user.participationCount}</td>
                  <td>{user.servedCount}</td>
                  <td>{formatDateTime(user.lastActivityAt)}</td>
                  <td>
                    {user.history.length === 0 ? (
                      <span class={styles.empty}>No participation recorded.</span>
                    ) : (
                      <details class={styles.historyDetails}>
                        <summary>View {user.history.length} events</summary>
                        <ul class={styles.historyList}>
                          {user.history.map((item) => (
                            <li key={item.id}>
                              <strong>{item.action}</strong>
                              <span>{item.serviceName || 'Unknown service'}</span>
                              <span>{formatDateTime(item.actionTime)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}