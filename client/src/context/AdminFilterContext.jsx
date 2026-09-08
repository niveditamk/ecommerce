import { createContext, useContext, useState, useMemo } from 'react';

const AdminFilterContext = createContext(null);

export function AdminFilterProvider({ children }) {
  const [dateRange, setDateRange] = useState('30d');
  const [warehouse, setWarehouse] = useState('all');
  const [category, setCategory] = useState('all');
  const [activeAlertCount, setActiveAlertCount] = useState(2);

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

