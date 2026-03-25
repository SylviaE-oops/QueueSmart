import styles from './Toast.module.css';

export function Toast({ title, message, onDismiss }) {
  return (
    <div class={styles.toast}>
      <p class={styles.toastTitle}>{title}</p>
      <p class={styles.toastMsg}>{message}</p>
      <div class={styles.btnRow}>
        <button class={`${styles.btn} ${styles.secondary}`} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div class={styles.toasts}>
      {toasts.map((toast, i) => (
        <Toast
          key={i}
          title={toast.title}
          message={toast.message}
          onDismiss={() => onDismiss(i)}
        />
      ))}
    </div>
  );
}
