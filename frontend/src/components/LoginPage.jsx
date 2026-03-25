import { useState } from 'preact/hooks';
import { loginUser } from '../api';
import styles from './LoginPage.module.css';

export function LoginPage({ onLoginSuccess, onNavigate, onShowToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleLogin = async () => {
    const e = email.trim();
    const p = password;

    let msg = '';
    if (!e) msg = 'Email is required.';
    else if (!isEmail(e)) msg = 'Enter a valid email address.';
    else if (!p) msg = 'Password is required.';
    else if (p.length < 6) msg = 'Password must be at least 6 characters.';

    if (msg) {
      setError(msg);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await loginUser(e, p);
      if (result && result.success) {
        localStorage.setItem('qs_user_id', String(result.data.id));
        localStorage.setItem('qs_role', result.data.role);
        localStorage.setItem('qs_email', result.data.email);
        onLoginSuccess(result.data);
        onShowToast('Welcome', `Signed in as ${result.data.role}`);
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      onShowToast('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class={styles.container} style="max-width:560px;">
      <div class={styles.panel}>
        <div class={styles.content}>
          <p class={styles.h1}>Login</p>
          <p class={styles.p}>QueueSmart helps UH students join and track textbook pickup queues.</p>

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
            placeholder="••••••••"
            value={password}
            onInput={(e) => setPassword(e.target.value)}
          />

          {error && <div class={styles.err}>{error}</div>}

          <div class={styles.btnRow}>
            <button class={styles.btn} onClick={handleLogin} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button class={`${styles.btn} ${styles.secondary}`} onClick={() => onNavigate('#/register')}>
              Create account
            </button>
          </div>

          <p class={styles.p} style="margin-top:14px;">
            <span class={`${styles.tag} ${styles.muted}`}>Test: user1@cougarnet.uh.edu / password, admin@uh.edu / password</span>
          </p>
        </div>
      </div>
    </div>
  );
}
