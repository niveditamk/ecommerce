import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { readToken } from '../lib/adminApi';

const AdminFilterContext = createContext(null);

export function AdminFilterProvider({ children }) {
  const [dateRange, setDateRange] = useState('30d');
  const [warehouse, setWarehouse] = useState('all');
  const [category, setCategory] = useState('all');
  /* Was a hardcoded 2 that never moved regardless of what actually
     alerted — the badge every admin page reads, so it needs a real
     count kept live, not a fixed guess from whenever this was built. */
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  useEffect(() => {
    const token = readToken();
    if (!token) return undefined;

    const loadCount = () => {
      fetch('/api/admin/ai/alerts', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => { if (res) setActiveAlertCount((res.alerts || []).length); })
        .catch(() => {});
    };

    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const value = useMemo(
    () => ({
      dateRange,
      setDateRange,
      warehouse,
      setWarehouse,
      category,
      setCategory,
      activeAlertCount,
      setActiveAlertCount
    }),
    [dateRange, warehouse, category, activeAlertCount]
  );

  return (
    <AdminFilterContext.Provider value={value}>
      {children}
    </AdminFilterContext.Provider>
  );
}

export function useAdminFilters() {
  const ctx = useContext(AdminFilterContext);
  if (!ctx) {
    return {
      dateRange: '30d',
      setDateRange: () => {},
      warehouse: 'all',
      setWarehouse: () => {},
      category: 'all',
      setCategory: () => {},
      activeAlertCount: 0,
      setActiveAlertCount: () => {}
    };
  }
  return ctx;
}

