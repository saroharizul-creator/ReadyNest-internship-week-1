import React from 'react';
import { Outlet, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAppSelector } from '../store';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { ArrowLeft, Home } from 'lucide-react';

const Layout: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentDataset } = useAppSelector((state) => state.datasets);
  const location = useLocation();
  const navigate = useNavigate();

  const showBackButton = location.pathname !== '/';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 transition-colors">
      <Navbar />
      <div className="flex">
        {!currentDataset && <Sidebar />}
        <main className={`${currentDataset ? 'w-full' : 'ml-64 w-[calc(100vw-16rem)]'} p-8 mt-16 min-h-[calc(100vh-4rem)]`}>
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl px-3.5 py-2 cursor-pointer shadow-sm animate-fade-in"
            >
              <ArrowLeft className="h-4 w-4 text-slate-450" />
              Back
            </button>
          )}
          <Outlet />
        </main>
      </div>

      {/* Permanent Home Button on the bottom-left corner */}
      <Link
        to="/"
        className="fixed bottom-6 left-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 cursor-pointer border border-blue-500/10"
        title="Go to Home"
      >
        <Home className="h-5 w-5" />
      </Link>
    </div>
  );
};

export default Layout;
