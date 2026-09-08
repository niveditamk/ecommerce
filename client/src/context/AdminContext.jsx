/* =============================================================
   ADMIN SESSION
   Holds the signed-in staff member and exposes `can(permission)`
   so the sidebar and every screen read access from one place.
   ============================================================= */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import adminApi, { readToken, writeToken, AdminError } from '../lib/adminApi';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [staff, setStaff] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  /* Any 401 anywhere ends the session here, so the route guard in
     AdminLayout can redirect instead of leaving the operator clicking
     through an admin where every request fails. */
  useEffect(() => {
    const expire = () => setStaff(null);
    window.addEventListener('aurelis:session-expired', expire);
    return () => window.removeEventListener('aurelis:session-expired', expire);
  }, []);

  /* Restore a session on load if the token is still valid. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!readToken()) { setReady(true); return; }
      try {
        const { staff: me } = await adminApi.me();
        if (!cancelled) setStaff(me);
      } catch {
        writeToken('');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    setBusy(true);
    try {
      const { token, staff: me } = await adminApi.login(email, password);
      writeToken(token);
      setStaff(me);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof AdminError ? err.message : 'Sign in failed.' };
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await adminApi.logout(); } catch { /* token may already be gone */ }
    writeToken('');
    setStaff(null);
  }, []);

  const can = useCallback(
    (permission) => !!staff?.permissions?.includes(permission),
    [staff]
  );

  const value = useMemo(
    () => ({ staff, ready, busy, login, logout, can }),
    [staff, ready, busy, login, logout, can]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}

export default AdminContext;
