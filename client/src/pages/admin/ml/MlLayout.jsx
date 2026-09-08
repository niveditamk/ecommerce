/* =============================================================
   ML OPERATIONS — CONSOLE SHELL
   The console shares the admin's session and permissions but
   keeps its own navigation, because operating models is a
   different job from running the shop and the two should not be
   interleaved in one sidebar.
   ============================================================= */
import { NavLink, Outlet } from 'react-router-dom';
import { useAdmin } from '../../../context/AdminContext';

const SECTIONS = [
  { to: '/admin/ml', label: 'Overview', end: true, need: 'ai.view' },
  { to: '/admin/ml/models', label: 'Models', need: 'ai.view' },
  { to: '/admin/ml/forecast', label: 'Forecasts', need: 'ai.view' },
  { to: '/admin/ml/recommendations', label: 'Recommendations', need: 'ai.view' },
  { to: '/admin/ml/data', label: 'Training data', need: 'ai.view' }
];

export default function MlLayout() {
  const { can } = useAdmin();

  if (!can('ai.view')) {
    return <div className="notice notice--warning">Your role cannot open the ML console.</div>;
  }

  return (
    <div className="ml">
      <div className="ml__masthead">
        <div>
          <span className="ml__eyebrow">Aurelis</span>
          <span className="ml__title">ML Operations</span>
        </div>
        <p className="ml__creed">
          Decision support. Every figure carries its evidence; nothing here changes stock on its own.
        </p>
      </div>

      <nav className="ml__nav" aria-label="ML console">
        {SECTIONS.filter((s) => can(s.need)).map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.end}
            className={({ isActive }) => `ml__navlink${isActive ? ' is-on' : ''}`}
          >
            {s.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
