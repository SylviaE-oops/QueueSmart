import { useState } from 'preact/hooks';
import styles from './Shell.module.css';

export function Shell({
  role,
  email,
  activePath,
  content,
  onLogout,
  onNavigate
}) {
  const linksUser = [
    ['#/app/dashboard', 'User Dashboard'],
    ['#/app/join', 'Join Queue'],
    ['#/app/status', 'Queue Status'],
    ['#/app/history', 'History'],
  ];

  const linksAdmin = [
    ['#/admin/dashboard', 'Admin Dashboard'],
    ['#/admin/services', 'Service Management'],
    ['#/admin/queues', 'Queue Management'],
    ['#/admin/book-requests', 'Book Requests'],
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
            {links.map(([href, label]) => (
              <a
                key={href}
                href={href}
                class={activePath === href ? styles.active : ''}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(href);
                }}
              >
                {label}
              </a>
            ))}
            <button class={`${styles.btn} ${styles.secondary}`} onClick={onLogout}>
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
