/* =============================================================
   ADMIN SIGN-IN
   The ridge field sits behind a single, quiet card. Everything
   the reference does with motion happens out here, in the
   background — the form itself stays completely still.
   ============================================================= */
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import RidgeField from '../../components/admin/RidgeField';
import { useAdmin } from '../../context/AdminContext';
import adminApi from '../../lib/adminApi';

export default function AdminLogin() {
  const { staff, ready, busy, login } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    adminApi.demoAccounts().then((d) => setAccounts(d.accounts || [])).catch(() => {});
  }, []);

  if (ready && staff) return <Navigate to={location.state?.from || '/admin'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password.');
      return;
    }
    const res = await login(form.email.trim(), form.password);
    if (res.ok) navigate(location.state?.from || '/admin', { replace: true });
    else setError(res.error);
  };

  const useAccount = (a) => { setForm({ email: a.email, password: a.password }); setError(null); };

  return (
    <div className="admin-auth">
      <RidgeField />

      <main className="admin-auth__panel" role="main">
        <div className="admin-auth__card">
          <header className="admin-auth__head">
            <span className="brand__mark">AURELIS</span>
            <span className="admin-auth__sub">Staff access</span>
          </header>

          <h1 className="h3" style={{ marginTop: 'var(--spacing-24)' }}>Sign in</h1>
          <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.02em', marginTop: 'var(--spacing-6)' }}>
            This area is restricted to staff. Actions here are recorded.
          </p>

          {error && (
            <div className="notice notice--error" style={{ marginTop: 'var(--spacing-18)' }} role="alert">
              {error}
            </div>
          )}

          <form onSubmit={submit} noValidate style={{ marginTop: 'var(--spacing-24)' }}>
            <label className="field" htmlFor="admin-email">
              <span className="field__label">Email</span>
              <input
                id="admin-email"
                className="input"
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@aurelis.test"
                required
              />
            </label>

            <label className="field" htmlFor="admin-password">
              <span className="field__label">Password</span>
              <input
                id="admin-password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </label>

            <button className="btn btn--gold btn--block" type="submit" disabled={busy} style={{ marginTop: 'var(--spacing-30)' }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {accounts.length > 0 && (
            <section className="admin-auth__demo">
              <h2 className="field__label" style={{ marginBottom: 'var(--spacing-12)' }}>Demo accounts</h2>
              <ul>
                {accounts.map((a) => (
                  <li key={a.email}>
                    <button type="button" onClick={() => useAccount(a)}>
                      <span className="admin-auth__role">{a.name}</span>
                      <span className="admin-auth__email">{a.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="field__hint" style={{ marginTop: 'var(--spacing-12)' }}>
                Selecting one fills the form. Each role sees a different panel.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
