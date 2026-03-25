import { useState } from 'preact/hooks';
import { registerUser } from '../api';
import styles from './RegisterPage.module.css';

export function RegisterPage({ onNavigate, onShowToast }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleRegister = async () => {
    const n = name.trim();
    const e = email.trim();
    const p = password;
    const c = confirm;

    let msg = '';
    if (!n) msg = 'Name is required.';
    else if (n.length > 80) msg = 'Name must be 80 characters or less.';
    else if (!e) msg = 'Email is required.';
    else if (!isEmail(e)) msg = 'Enter a valid email address.';
    else if (!p) msg = 'Password is required.';
    else if (p.length < 6) msg = 'Password must be at least 6 characters.';
    else if (c !== p) msg = 'Passwords do not match.';

    if (msg) {
      setError(msg);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await registerUser(e, p);
      if (result && result.success) {
        onShowToast('Account created', 'Registration complete. Please login.');
        onNavigate('#/login');
      } else {
        setError(result?.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
      onShowToast('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class={styles.container} style="max-width:560px;">
      <div class={styles.panel}>
        <div class={styles.content}>
          <p class={styles.h1}>Registration</p>
          <p class={styles.p}>Create a QueueSmart account.</p>

          <label class={styles.label}>Full Name</label>
          <input
            class={styles.input}
            placeholder="First Last"
            value={name}
            onInput={(e) => setName(e.target.value)}
          />

          <label class={styles.label}>Email</label>
          <input
            class={styles.input}
            type="email"
            placeholder="name@cougarnet.uh.edu"
            value={email}
            onInput={(e) => setEmail(e.target.value)}
          />

          <label class={styles.label}>Password</label>
          <input
            class={styles.input}
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onInput={(e) => setPassword(e.target.value)}
          />

          <label class={styles.label}>Confirm Password</label>
          <input
            class={styles.input}
            type="password"
            value={confirm}
            onInput={(e) => setConfirm(e.target.value)}
          />

          {error && <div class={styles.err}>{error}</div>}

          <div class={styles.btnRow}>
            <button class={styles.btn} onClick={handleRegister} disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
            <button class={`${styles.btn} ${styles.secondary}`} onClick={() => onNavigate('#/login')}>
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
