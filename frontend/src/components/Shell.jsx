import styles from './Shell.module.css';
import {
  MdDashboard,
  MdAddCircle,
  MdListAlt,
  MdHistory,
  MdSettings,
  MdGroups,
  MdMenuBook,
  MdAssessment,
  MdLogout
} from 'react-icons/md';

export function Shell({
  role,
  email,
  activePath,
  content,
  onLogout,
  onNavigate
}) {
  const linksUser = [
    ['#/app/dashboard', 'User Dashboard', MdDashboard],
    ['#/app/join', 'Join Queue', MdAddCircle],
    ['#/app/status', 'Queue Status', MdListAlt],
    ['#/app/history', 'History', MdHistory],
  ];

  const linksAdmin = [
    ['#/admin/dashboard', 'Admin Dashboard', MdDashboard],
    ['#/admin/services', 'Service Management', MdSettings],
    ['#/admin/queues', 'Queue Management', MdGroups],
    ['#/admin/book-requests', 'Book Requests', MdMenuBook],
    ['#/admin/reports', 'Stats Reporting', MdAssessment],
  ];

  const links = role === 'admin' ? linksAdmin : linksUser;

  return (
    <div class={styles.container}>
      <div class={styles.grid}>
        <aside class={styles.panel}>
          <div class={styles.panelHeader}>
            <div class={styles.brand}>
              <span>QueueSmart</span>
              <span class={styles.badge}>
                {role === 'admin' ? 'Administrator' : 'User'}
              </span>
            </div>
            <p class={styles.p} style="margin-top:8px;">
              {email ? (
                <>Signed in as <strong>{email}</strong></>
              ) : (
                'Not signed in'
              )}
            </p>
          </div>

          <nav class={styles.nav}>
            {links.map(([href, label, Icon]) => (
              <a
                key={href}
                href={href}
                class={activePath === href ? styles.active : ''}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(href);
                }}
              >
                <Icon class={styles.navIcon} />
                {label}
              </a>
            ))}

            <button class={`${styles.btn} ${styles.secondary}`} onClick={onLogout}>
              <MdLogout class={styles.navIcon} />
              Logout
            </button>
          </nav>
        </aside>

        <main class={styles.panel}>
          <div class={styles.content}>{content}</div>
        </main>
      </div>
    </div>
  );
}
