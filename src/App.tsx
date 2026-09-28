import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { ComparePage, LookupPage, PlayerPage } from './screens';

const navClass = (active: boolean) =>
  `font-display text-xl font-bold uppercase underline-offset-[7px] transition-colors ${
    active
      ? 'text-ink underline decoration-cobalt decoration-[3px]'
      : 'text-ink-soft hover:text-ink'
  }`;

const App = () => {
  const { pathname } = useLocation();
  const scouting = pathname === '/' || pathname.startsWith('/player/');

  return (
    <div className="min-h-screen">
      {/* Blue side, red side. */}
      <div aria-hidden className="flex h-1">
        <div className="flex-1 bg-cobalt" />
        <div className="flex-1 bg-vermilion" />
      </div>

      <header className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 border-b border-ink pb-3 pt-5">
          <Link
            to="/"
            className="font-display text-3xl font-black uppercase leading-none"
          >
            Crown Ledger
          </Link>
          <nav className="flex gap-6">
            <NavLink to="/" className={() => navClass(scouting)}>
              Scout
            </NavLink>
            <NavLink
              to="/compare"
              className={({ isActive }) => navClass(isActive)}
            >
              Compare
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <Routes>
          <Route path="/" element={<LookupPage />} />
          <Route path="/player/:slug" element={<PlayerPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export { App };
