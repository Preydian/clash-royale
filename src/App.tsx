import { Link, Routes, Route } from 'react-router-dom';
import { StatsPage, ComparePage } from './screens';

const App = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <nav className="p-4 bg-slate-800 flex gap-6 justify-center text-lg font-semibold">
        <Link to="/stats" className="hover:text-blue-400">
          Single Lookup
        </Link>
        <Link to="/compare" className="hover:text-blue-400 text-emerald-400">
          Multi-Compare
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<StatsPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/compare" element={<ComparePage />} />
      </Routes>
    </div>
  );
};

export { App };
